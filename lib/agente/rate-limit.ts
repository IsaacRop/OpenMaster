import { createHash } from "node:crypto";

/**
 * Rate limit em memória do processo, por IP.
 *
 * Mesma limitação do cache (lib/agente/cache.ts): por instância, não
 * compartilhado entre instâncias frias da Vercel. É a trava mínima contra um
 * script batendo na rota em loop e estourando o crédito da OpenAI — não é
 * proteção contra um ataque distribuído de propósito. Se isto virar um
 * problema real, trocar por Vercel KV (mesma interface).
 */

const JANELA_MS = 10 * 60 * 1000;
const LIMITE = 10;

const golpes = new Map<string, number[]>();

/** Hash truncado do IP — nunca logamos ou guardamos o IP em texto puro. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 12);
}

export function extrairIp(headers: Headers): string {
  const encaminhado = headers.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "desconhecido";
}

export function checarLimite(ipHash: string): { permitido: boolean; restantes: number } {
  const agora = Date.now();
  const historico = (golpes.get(ipHash) ?? []).filter((t) => agora - t < JANELA_MS);

  if (historico.length >= LIMITE) {
    golpes.set(ipHash, historico);
    return { permitido: false, restantes: 0 };
  }

  historico.push(agora);
  golpes.set(ipHash, historico);
  return { permitido: true, restantes: LIMITE - historico.length };
}
