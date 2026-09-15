/**
 * Publica atualizações no X/Twitter.
 *
 * Duas filas, com regras diferentes de propósito:
 *
 *  1. Movimentações do DataJud (data/_pending.json) — metadado oficial, texto
 *     gerado por template, sem interpretação. Publicável automaticamente.
 *  2. Eventos curados (data/timeline.json) — só entram na fila quando alguém
 *     marcou `"tweet": true` no PR, e o texto herda o hedging de `confianca`.
 *     Um evento `apuracao` nunca é postado como fato.
 *
 * Credenciais vêm só de variável de ambiente. Sem elas, o script cai em
 * dry-run em vez de falhar — nunca há caminho em que uma credencial ausente
 * vire postagem acidental.
 *
 * Uso:
 *   npm run tweet -- --dry-run     imprime o que postaria e sai
 *   npm run tweet                  posta de verdade (exige as 4 variáveis)
 *   npm run tweet -- --limit 3     no máximo 3 posts nesta execução
 */

import { createHmac, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { EventoTimelineArray } from "../lib/schema";
import {
  textoDaMovimentacao,
  textoDoEvento,
  type Pendente,
} from "../lib/tweet-template";

const RAIZ = process.cwd();
const ARQ_TIMELINE = join(RAIZ, "data", "timeline.json");
const ARQ_PENDENTES = join(RAIZ, "data", "_pending.json");

const args = process.argv.slice(2);
const limite = (() => {
  const i = args.indexOf("--limit");
  return i >= 0 ? Number(args[i + 1]) : Infinity;
})();

const creds = {
  apiKey: process.env.X_API_KEY ?? "",
  apiSecret: process.env.X_API_SECRET ?? "",
  accessToken: process.env.X_ACCESS_TOKEN ?? "",
  accessSecret: process.env.X_ACCESS_TOKEN_SECRET ?? "",
};
const temCreds = Object.values(creds).every(Boolean);
const dryRun = args.includes("--dry-run") || !temCreds;

// --- OAuth 1.0a (user context) -------------------------------------------

const enc = (s: string) =>
  encodeURIComponent(s).replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

function assinar(method: string, url: string): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };

  // O corpo é JSON, então só os parâmetros oauth_* entram na base da assinatura.
  const paramString = Object.keys(oauth)
    .sort()
    .map((k) => `${enc(k)}=${enc(oauth[k])}`)
    .join("&");

  const base = [method.toUpperCase(), enc(url), enc(paramString)].join("&");
  const chave = `${enc(creds.apiSecret)}&${enc(creds.accessSecret)}`;
  oauth.oauth_signature = createHmac("sha1", chave).update(base).digest("base64");

  return (
    "OAuth " +
    Object.keys(oauth)
      .sort()
      .map((k) => `${enc(k)}="${enc(oauth[k])}"`)
      .join(", ")
  );
}

async function postar(texto: string): Promise<{ ok: boolean; detalhe: string }> {
  const url = "https://api.x.com/2/tweets";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: assinar("POST", url),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: texto }),
  });
  const corpo = await res.text();
  return { ok: res.ok, detalhe: `HTTP ${res.status} ${corpo.slice(0, 300)}` };
}

// --- execução -------------------------------------------------------------

async function main() {
  console.log(`painel-caso-master — post-twitter${dryRun ? " (dry-run)" : ""}`);
  if (!temCreds) {
    console.log(
      "Credenciais ausentes (X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / " +
        "X_ACCESS_TOKEN_SECRET) — forçando dry-run.",
    );
  }
  console.log("");

  const timelineRaw = JSON.parse(readFileSync(ARQ_TIMELINE, "utf8"));
  const parsed = EventoTimelineArray.safeParse(timelineRaw);
  if (!parsed.success) {
    console.error("data/timeline.json inválido — rode `npm run validate`.");
    process.exit(1);
  }
  const timeline = parsed.data;

  const pendentes: Pendente[] = existsSync(ARQ_PENDENTES)
    ? JSON.parse(readFileSync(ARQ_PENDENTES, "utf8"))
    : [];

  const filaEventos = timeline.filter((e) => e.tweet && !e.tweeted_at);
  const filaMovs = pendentes.filter((p) => !p.tweeted_at);

  console.log(`fila: ${filaEventos.length} evento(s) curado(s), ${filaMovs.length} movimentação(ões)\n`);

  let enviados = 0;
  const agora = new Date().toISOString();

  for (const e of filaEventos) {
    if (enviados >= limite) break;
    const texto = textoDoEvento(e);
    console.log(`--- evento ${e.id} (${texto.length} chars)`);
    console.log(texto);
    console.log("");
    if (!dryRun) {
      const r = await postar(texto);
      if (!r.ok) {
        console.error(`  falhou: ${r.detalhe}`);
        continue;
      }
      e.tweeted_at = agora;
    }
    enviados++;
  }

  for (const p of filaMovs) {
    if (enviados >= limite) break;
    const texto = textoDaMovimentacao(p);
    console.log(`--- movimentação ${p.processo_id} ${p.movimentacao.data} (${texto.length} chars)`);
    console.log(texto);
    console.log("");
    if (!dryRun) {
      const r = await postar(texto);
      if (!r.ok) {
        console.error(`  falhou: ${r.detalhe}`);
        continue;
      }
      p.tweeted_at = agora;
    }
    enviados++;
  }

  if (dryRun) {
    console.log(`--dry-run: ${enviados} post(s) seriam enviados. Nenhum arquivo escrito.`);
    return;
  }

  writeFileSync(ARQ_TIMELINE, JSON.stringify(timeline, null, 2) + "\n", "utf8");
  if (pendentes.length) {
    writeFileSync(ARQ_PENDENTES, JSON.stringify(pendentes, null, 2) + "\n", "utf8");
  }
  console.log(`${enviados} post(s) enviados; tweeted_at gravado.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
