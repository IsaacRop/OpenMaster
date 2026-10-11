/**
 * Contador de acessos: um número que sobe 1 a cada visita que ficou na página
 * o tempo mínimo (a regra dos 10 segundos está em components/RegistrarVisita).
 * Sem cookie, sem IP, sem identificador de pessoa: só um `INCR`.
 *
 * Usa o mesmo Upstash (REST, sem SDK) do rate limit. Sem as variáveis de
 * ambiente não há como contar de verdade, e o painel não inventa número:
 * as funções devolvem `null` e a interface esconde o contador.
 */

const CHAVE = "om:acessos";

/**
 * Acessos anteriores ao contador, vindos da estimativa do próprio projeto
 * (~5 mil pessoas até o dia em que ele entrou no ar). É somada ao que o Redis
 * conta; para corrigir o valor sem mexer no código, defina ACESSOS_ANTERIORES.
 */
const ACESSOS_ANTERIORES = Number(process.env.ACESSOS_ANTERIORES) || 5000;
const TIMEOUT_MS = 3000;

async function comando(...args: (string | number)[]): Promise<unknown> {
  // A integração da Vercel com o Upstash nomeia as chaves KV_REST_API_*.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("sem-store");

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/${args.map((a) => encodeURIComponent(String(a))).join("/")}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash respondeu HTTP ${res.status}`);
    return ((await res.json()) as { result: unknown }).result;
  } finally {
    clearTimeout(t);
  }
}

/** Total de acessos contados; `null` se não há como saber. */
export async function totalAcessos(): Promise<number | null> {
  try {
    const bruto = await comando("GET", CHAVE);
    return Number.isFinite(Number(bruto ?? 0)) ? ACESSOS_ANTERIORES + Number(bruto ?? 0) : null;
  } catch {
    return null;
  }
}

/** Soma um acesso e devolve o total atualizado. */
export async function registrarAcesso(): Promise<number | null> {
  try {
    const n = Number(await comando("INCR", CHAVE));
    return Number.isFinite(n) ? ACESSOS_ANTERIORES + n : null;
  } catch {
    return null;
  }
}
