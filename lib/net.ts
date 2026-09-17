/**
 * Utilitários de rede compartilhados para os dois pontos do painel que lidam
 * com bytes que não controlamos: o corpo de POST /api/agente (lib/agente) e
 * o download ao vivo das conversas de terceiros (lib/conversas.ts).
 *
 * Dois problemas, uma solução: nenhum dos dois pode confiar em
 * `Content-Length` sozinho (pode faltar ou mentir) nem em o servidor remoto
 * se comportar (pode nunca fechar a conexão). `lerComLimite` lê um stream
 * byte a byte contando o total e aborta assim que estoura o teto — o cap real
 * está na leitura, não no cabeçalho.
 */

export class LimiteExcedidoError extends Error {
  constructor(maxBytes: number) {
    super(`corpo excede o limite de ${maxBytes} bytes`);
    this.name = "LimiteExcedidoError";
  }
}

export class HostNaoPermitidoError extends Error {
  constructor(host: string) {
    super(`host não está na allowlist: ${host}`);
    this.name = "HostNaoPermitidoError";
  }
}

/** Lê um ReadableStream até `maxBytes`; lança LimiteExcedidoError e cancela o stream se estourar. */
export async function lerComLimite(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<Uint8Array> {
  if (!stream) return new Uint8Array(0);

  const reader = stream.getReader();
  const pedacos: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        throw new LimiteExcedidoError(maxBytes);
      }
      pedacos.push(value);
    }
  } catch (e) {
    await reader.cancel().catch(() => {});
    throw e;
  } finally {
    reader.releaseLock();
  }

  const resultado = new Uint8Array(total);
  let offset = 0;
  for (const pedaco of pedacos) {
    resultado.set(pedaco, offset);
    offset += pedaco.byteLength;
  }
  return resultado;
}

/** Decodifica o corpo de uma Request/Response como UTF-8, respeitando o teto de bytes. */
export async function lerCorpoComLimite(
  origem: { body: ReadableStream<Uint8Array> | null },
  maxBytes: number,
): Promise<string> {
  const bytes = await lerComLimite(origem.body, maxBytes);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/** Lança HostNaoPermitidoError se a URL não for https e o host não estiver na allowlist. */
export function garantirHostPermitido(url: string, hostsPermitidos: readonly string[]): URL {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !hostsPermitidos.includes(parsed.hostname)) {
    throw new HostNaoPermitidoError(parsed.hostname);
  }
  return parsed;
}

export type FetchComLimiteOpts = {
  timeoutMs: number;
  maxBytes: number;
  hostsPermitidos: readonly string[];
  init?: RequestInit;
};

/**
 * fetch com timeout via AbortSignal, allowlist de host e teto de download real
 * (via `lerComLimite`, não via `Content-Length`, que é só um atalho quando presente).
 */
export async function fetchComLimite(url: string, opts: FetchComLimiteOpts): Promise<string> {
  garantirHostPermitido(url, opts.hostsPermitidos);

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs);

  try {
    const res = await fetch(url, { ...opts.init, signal: ctrl.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ao buscar ${url}`);
    }

    const declarado = res.headers.get("content-length");
    if (declarado && Number(declarado) > opts.maxBytes) {
      throw new LimiteExcedidoError(opts.maxBytes);
    }

    return await lerCorpoComLimite(res, opts.maxBytes);
  } finally {
    clearTimeout(timeout);
  }
}
