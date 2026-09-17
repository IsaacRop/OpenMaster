import { createHash, createHmac } from "node:crypto";

/**
 * Rate limit de /api/agente, com um store plugável.
 *
 * Em produção numa lambda serverless (Vercel), cada instância fria tem sua
 * própria memória — um Map local não é um limite compartilhado entre
 * instâncias. Se `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` estão
 * definidas (a dupla padrão da integração Vercel KV / Upstash), o limite passa
 * a ser contado num Redis compartilhado via REST — sem SDK, só fetch, no
 * mesmo espírito de lib/agente/openai.ts e lib/datajud-client.ts. Sem essas
 * variáveis, cai no fallback em memória: correto para dev, e mesmo em prod é
 * melhor que nada caso o Redis também falhe.
 *
 * Dois limites, propositalmente separados:
 *  - por IP (chave = ip): trava o abuso de uma origem só;
 *  - global (chave fixa "global"): trava o crédito da OpenAI mesmo contra um
 *    ataque distribuído por muitos IPs diferentes, que o limite por IP sozinho
 *    não vê.
 */

// ---------------------------------------------------------------------------
// Extração de IP — nunca confiar cegamente em cabeçalho enviado pelo cliente
// ---------------------------------------------------------------------------

/** Aceita IPv4 e IPv6 em forma solta o suficiente para cobrir os formatos reais, sem validar rigor de RFC. */
const IP_FORMATO = /^[0-9a-fA-F.:]{2,45}$/;

/**
 * `x-forwarded-for`/`x-real-ip` só são confiáveis quando um proxy de confiança
 * os define — na Vercel, a própria plataforma injeta esse cabeçalho na borda
 * antes da requisição chegar à função, então não é algo que o cliente possa
 * forjar livremente. Fora da Vercel, só confiamos se o operador afirmar
 * explicitamente via TRUST_PROXY_HEADERS=true (ex.: atrás de nginx/Cloudflare
 * configurado para sobrescrever o cabeçalho). Sem nenhum dos dois, todo mundo
 * cai no mesmo balde — pior granularidade, mas não abre brecha de spoofing.
 */
function proxyConfiavel(): boolean {
  return process.env.VERCEL === "1" || process.env.TRUST_PROXY_HEADERS === "true";
}

export function extrairIp(headers: Headers): string {
  if (!proxyConfiavel()) return "sem-proxy-confiavel";

  const encaminhado = headers.get("x-forwarded-for");
  if (encaminhado) {
    const primeiro = encaminhado.split(",")[0]?.trim();
    if (primeiro && IP_FORMATO.test(primeiro)) return primeiro;
  }

  const real = headers.get("x-real-ip")?.trim();
  if (real && IP_FORMATO.test(real)) return real;

  return "desconhecido";
}

// ---------------------------------------------------------------------------
// Hash — chave interna do rate limit (estável) vs. hash de log (HMAC rotativo)
// ---------------------------------------------------------------------------

/** Chave interna do store: não precisa de segredo, nunca é exposta a log nem ao cliente. */
function chaveInterna(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

/**
 * Hash do IP para uso em log. HMAC com segredo do servidor em vez de sha256
 * puro — sha256(ip) é reversível por força bruta sobre o espaço de IPv4
 * (~4 bilhões de tentativas, trivial hoje). O segredo fecha essa brecha.
 *
 * `LOG_IP_HASH_SALT_DIAS=true` (padrão) mistura um "balde" de tempo (dia UTC)
 * no HMAC: o mesmo IP produz hashes diferentes em dias diferentes, o que
 * permite agrupar abuso dentro do mesmo dia sem manter um identificador
 * estável de longo prazo por pessoa. Desligar isso é uma troca explícita.
 */
function bucketTemporal(): string {
  if (process.env.LOG_IP_HASH_SALT_DIAS === "false") return "fixo";
  return new Date().toISOString().slice(0, 10); // AAAA-MM-DD (UTC)
}

export function hashParaLog(ip: string): string {
  const segredo = process.env.LOG_IP_HMAC_SECRET;
  if (!segredo) {
    // Sem segredo configurado: ainda assim não logamos o IP em texto puro.
    // Um hash sem segredo é reversível por força bruta, então isto é um
    // aviso operacional, não uma proteção — ver .env.example.
    return createHash("sha256").update(`sem-segredo:${ip}`).digest("hex").slice(0, 12);
  }
  return createHmac("sha256", segredo).update(`${bucketTemporal()}:${ip}`).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Store — interface comum a Upstash Redis e ao fallback em memória
// ---------------------------------------------------------------------------

type Incremento = { contagem: number; ttlMs: number };

interface ArmazenamentoLimite {
  /** Incrementa `chave`; na primeira vez, arma uma expiração de `janelaMs`. Devolve a contagem atual e o TTL restante. */
  incrementar(chave: string, janelaMs: number): Promise<Incremento>;
}

// --- fallback local, limitado em tamanho ----------------------------------

const MAX_CHAVES_LOCAL = 5000;
const golpesLocais = new Map<string, { contagem: number; expiraEm: number }>();

function limparExpiradosLocais(agora: number) {
  for (const [chave, entrada] of golpesLocais) {
    if (agora > entrada.expiraEm) golpesLocais.delete(chave);
  }
}

class ArmazenamentoLocal implements ArmazenamentoLimite {
  async incrementar(chave: string, janelaMs: number): Promise<Incremento> {
    const agora = Date.now();
    limparExpiradosLocais(agora);

    const existente = golpesLocais.get(chave);
    if (existente && agora < existente.expiraEm) {
      existente.contagem += 1;
      return { contagem: existente.contagem, ttlMs: existente.expiraEm - agora };
    }

    if (!golpesLocais.has(chave) && golpesLocais.size >= MAX_CHAVES_LOCAL) {
      const maisAntiga = golpesLocais.keys().next().value;
      if (maisAntiga !== undefined) golpesLocais.delete(maisAntiga);
    }

    golpesLocais.set(chave, { contagem: 1, expiraEm: agora + janelaMs });
    return { contagem: 1, ttlMs: janelaMs };
  }
}

// --- Upstash Redis REST, sem SDK -------------------------------------------

class ArmazenamentoUpstash implements ArmazenamentoLimite {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly timeoutMs = 3000,
  ) {}

  private async comando(...args: (string | number)[]): Promise<unknown> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.url}/${args.map((a) => encodeURIComponent(String(a))).join("/")}`, {
        headers: { Authorization: `Bearer ${this.token}` },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Upstash respondeu HTTP ${res.status}`);
      const dados = (await res.json()) as { result: unknown };
      return dados.result;
    } finally {
      clearTimeout(t);
    }
  }

  async incrementar(chave: string, janelaMs: number): Promise<Incremento> {
    const contagem = Number(await this.comando("INCR", chave));
    let ttlMs = Number(await this.comando("PTTL", chave));
    if (!Number.isFinite(ttlMs) || ttlMs < 0) {
      await this.comando("PEXPIRE", chave, janelaMs);
      ttlMs = janelaMs;
    }
    return { contagem, ttlMs };
  }
}

let storeCache: ArmazenamentoLimite | null = null;
let avisouFallback = false;

function store(): ArmazenamentoLimite {
  if (storeCache) return storeCache;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  storeCache = url && token ? new ArmazenamentoUpstash(url, token) : new ArmazenamentoLocal();
  return storeCache;
}

const local = new ArmazenamentoLocal();

/** Incrementa no store configurado; se ele falhar (ex.: Redis fora do ar), degrada para o fallback local em vez de derrubar a rota. */
async function incrementarComFallback(chave: string, janelaMs: number): Promise<Incremento> {
  try {
    return await store().incrementar(chave, janelaMs);
  } catch (e) {
    if (!avisouFallback) {
      console.warn(`[agente] store de rate limit indisponível, usando fallback local: ${(e as Error).message}`);
      avisouFallback = true;
    }
    return local.incrementar(chave, janelaMs);
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

const JANELA_MS = Number(process.env.AGENTE_RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000;
const LIMITE_POR_IP = Number(process.env.AGENTE_RATE_LIMIT_MAX) || 10;
/** Teto agregado, independente de quantos IPs distintos — a defesa contra abuso distribuído que o limite por IP não cobre sozinho. */
const LIMITE_GLOBAL = Number(process.env.AGENTE_RATE_LIMIT_GLOBAL_MAX) || 300;

export type ResultadoLimite = {
  permitido: boolean;
  restantes: number;
  retryAfterSegundos?: number;
};

export async function checarLimite(ip: string): Promise<ResultadoLimite> {
  const [porIp, global] = await Promise.all([
    incrementarComFallback(chaveInterna(ip), JANELA_MS),
    incrementarComFallback("global", JANELA_MS),
  ]);

  if (global.contagem > LIMITE_GLOBAL) {
    return { permitido: false, restantes: 0, retryAfterSegundos: Math.ceil(global.ttlMs / 1000) };
  }
  if (porIp.contagem > LIMITE_POR_IP) {
    return { permitido: false, restantes: 0, retryAfterSegundos: Math.ceil(porIp.ttlMs / 1000) };
  }

  return { permitido: true, restantes: Math.max(0, LIMITE_POR_IP - porIp.contagem) };
}

/** Exposto só para testes: limpa o fallback local entre casos. */
export function __resetFallbackLocalParaTestes(): void {
  golpesLocais.clear();
  storeCache = null;
  avisouFallback = false;
}
