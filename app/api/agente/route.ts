import { NextRequest, NextResponse } from "next/server";

import { gravarCache, lerCache } from "@/lib/agente/cache";
import { chamarOpenAI } from "@/lib/agente/openai";
import { montarMensagens } from "@/lib/agente/prompt";
import { extrairIp, checarLimite, hashIp } from "@/lib/agente/rate-limit";
import { recuperar } from "@/lib/agente/recuperacao";

/**
 * Único ponto de fetch em runtime do painel — ver a ressalva em
 * next.config.ts e lib/busca.ts sobre o painel ser, do contrário,
 * integralmente estático. Esta rota é a exceção deliberada: sem ela não há
 * como consultar um LLM sobre a base em linguagem natural.
 */

const PERGUNTA_MAX = 500;

export async function POST(req: NextRequest) {
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const pergunta = typeof (corpo as any)?.pergunta === "string" ? (corpo as any).pergunta.trim() : "";
  if (!pergunta) {
    return NextResponse.json({ erro: "Envie uma pergunta em `pergunta`." }, { status: 400 });
  }
  if (pergunta.length > PERGUNTA_MAX) {
    return NextResponse.json({ erro: `Pergunta muito longa (máximo ${PERGUNTA_MAX} caracteres).` }, { status: 400 });
  }

  const ipHash = hashIp(extrairIp(req.headers));

  // Cache primeiro, rate limit depois: uma pergunta já cacheada não custa
  // token nenhum, então não deve consumir a cota do IP — a cota existe para
  // proteger o crédito da OpenAI, e uma resposta cacheada não o toca.
  const doCache = lerCache(pergunta);
  if (doCache) {
    console.log(`[agente] cache hit — ip=${ipHash}`);
    return NextResponse.json({ ...doCache, cache: true });
  }

  const limite = checarLimite(ipHash);
  if (!limite.permitido) {
    console.log(`[agente] rate limit atingido — ip=${ipHash}`);
    return NextResponse.json(
      { erro: "Muitas perguntas em pouco tempo. Tente novamente em alguns minutos." },
      { status: 429 },
    );
  }

  const cartoes = recuperar(pergunta);
  const mensagens = montarMensagens(pergunta, cartoes);

  try {
    const { texto, tokens } = await chamarOpenAI(mensagens);

    const fontes = cartoes.map((c) => ({
      titulo: c.titulo,
      source_url: c.source_url,
      source_name: c.source_name,
    }));

    const resultado = { resposta: texto, fontes, totalCartoes: cartoes.length };
    gravarCache(pergunta, resultado);

    console.log(
      `[agente] ip=${ipHash} cartoes=${cartoes.length} tokens_entrada=${tokens.entrada} tokens_saida=${tokens.saida}`,
    );

    return NextResponse.json({ ...resultado, cache: false, tokens });
  } catch (e) {
    console.error("[agente] erro ao consultar OpenAI:", e);
    return NextResponse.json({ erro: "Não foi possível gerar uma resposta agora. Tente novamente em instantes." }, { status: 502 });
  }
}
