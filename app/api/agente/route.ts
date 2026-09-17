import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { gravarCache, lerCache } from "@/lib/agente/cache";
import { chamarOpenAI, OpenAIError } from "@/lib/agente/openai";
import { montarMensagens } from "@/lib/agente/prompt";
import { extrairIp, checarLimite, hashParaLog } from "@/lib/agente/rate-limit";
import { recuperar } from "@/lib/agente/recuperacao";
import { lerCorpoComLimite, LimiteExcedidoError } from "@/lib/net";

/**
 * Único ponto de fetch em runtime do painel — ver a ressalva em
 * next.config.ts e lib/busca.ts sobre o painel ser, do contrário,
 * integralmente estático. Esta rota é a exceção deliberada: sem ela não há
 * como consultar um LLM sobre a base em linguagem natural.
 */

const PERGUNTA_MAX = 500;
// Generoso sobre { "pergunta": "<=500 chars UTF-8> }: cobre até multibyte pesado
// sem abrir margem para um corpo desproporcional ao que a rota aceita.
const MAX_BODY_BYTES = 4 * 1024;

const CorpoRequisicao = z
  .object({
    pergunta: z
      .string()
      .trim()
      .min(1, "Envie uma pergunta em `pergunta`.")
      .max(PERGUNTA_MAX, `Pergunta muito longa (máximo ${PERGUNTA_MAX} caracteres).`),
  })
  .strict();

function erroJson(mensagem: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ erro: mensagem }, { status, headers });
}

export async function POST(req: NextRequest) {
  // Rejeita pelo cabeçalho primeiro — mais barato que ler o corpo quando o
  // cliente já declara um tamanho fora do aceitável.
  const declarado = req.headers.get("content-length");
  if (declarado && Number(declarado) > MAX_BODY_BYTES) {
    return erroJson("Corpo da requisição excede o tamanho máximo permitido.", 413);
  }

  let corpoBruto: string;
  try {
    // Content-Length pode faltar ou mentir (chunked, cliente malicioso) — o
    // teto real está na leitura limitada do stream, não no cabeçalho.
    corpoBruto = await lerCorpoComLimite(req, MAX_BODY_BYTES);
  } catch (e) {
    if (e instanceof LimiteExcedidoError) {
      return erroJson("Corpo da requisição excede o tamanho máximo permitido.", 413);
    }
    return erroJson("Corpo da requisição inválido.", 400);
  }

  let corpo: unknown;
  try {
    corpo = JSON.parse(corpoBruto);
  } catch {
    return erroJson("Corpo da requisição inválido.", 400);
  }

  const validado = CorpoRequisicao.safeParse(corpo);
  if (!validado.success) {
    const primeiraMensagem = validado.error.issues[0]?.message ?? "Corpo da requisição inválido.";
    return erroJson(primeiraMensagem, 400);
  }
  const pergunta = validado.data.pergunta;

  const ip = extrairIp(req.headers);
  const ipLog = hashParaLog(ip);

  // Cache primeiro, rate limit depois: uma pergunta já cacheada não custa
  // token nenhum, então não deve consumir a cota do IP — a cota existe para
  // proteger o crédito da OpenAI, e uma resposta cacheada não o toca.
  const doCache = lerCache(pergunta);
  if (doCache) {
    console.log(`[agente] cache hit — ip=${ipLog}`);
    return NextResponse.json({ ...doCache, cache: true });
  }

  const limite = await checarLimite(ip);
  if (!limite.permitido) {
    console.log(`[agente] rate limit atingido — ip=${ipLog}`);
    const retryAfter = limite.retryAfterSegundos ?? 60;
    return erroJson(
      "Muitas perguntas em pouco tempo. Tente novamente em alguns minutos.",
      429,
      { "Retry-After": String(retryAfter) },
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
      `[agente] ip=${ipLog} cartoes=${cartoes.length} tokens_entrada=${tokens.entrada} tokens_saida=${tokens.saida}`,
    );

    return NextResponse.json({ ...resultado, cache: false, tokens });
  } catch (e) {
    const erro = e instanceof OpenAIError ? e : new OpenAIError("erro inesperado", "erro", 502);
    console.error(`[agente] falha ao consultar OpenAI (${erro.tipo}) ip=${ipLog}:`, erro.message);

    // Mensagem pública genérica por tipo — nunca o detalhe interno do erro.
    const mensagemPublica =
      erro.tipo === "timeout"
        ? "O modelo demorou demais para responder. Tente novamente em instantes."
        : erro.tipo === "rate_limit"
          ? "O serviço está sobrecarregado no momento. Tente novamente em instantes."
          : "Não foi possível gerar uma resposta agora. Tente novamente em instantes.";

    const headers = erro.retryAfterSegundos ? { "Retry-After": String(erro.retryAfterSegundos) } : undefined;
    return erroJson(mensagemPublica, erro.status, headers);
  }
}
