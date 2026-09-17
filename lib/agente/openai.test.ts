import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { chamarOpenAI, OpenAIError } from "@/lib/agente/openai";

const mensagens = [{ role: "user" as const, content: "oi" }];

function respostaOk(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({
      choices: [{ message: { content: "resposta gerada" } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      ...overrides,
    }),
    text: async () => "",
  } as unknown as Response;
}

describe("chamarOpenAI", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-teste";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalKey;
    vi.unstubAllEnvs();
  });

  it("retorna texto e contagem de tokens numa resposta bem formada", async () => {
    global.fetch = vi.fn().mockResolvedValue(respostaOk()) as unknown as typeof fetch;
    const r = await chamarOpenAI(mensagens);
    expect(r.texto).toBe("resposta gerada");
    expect(r.tokens).toEqual({ entrada: 10, saida: 5, total: 15 });
  });

  it("lança OpenAIError tipo timeout quando o AbortSignal dispara", async () => {
    vi.stubEnv("AGENTE_TIMEOUT_MS", "5");
    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const e = new Error("aborted");
          e.name = "AbortError";
          reject(e);
        });
      });
    }) as unknown as typeof fetch;

    const erro: OpenAIError = await chamarOpenAI(mensagens).catch((e) => e);
    expect(erro).toBeInstanceOf(OpenAIError);
    expect(erro.tipo).toBe("timeout");
    expect(erro.status).toBe(504);
  });

  it("diferencia rate limit do provedor (429) de erro genérico, repassando Retry-After", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "12" }),
      text: async () => "rate limited pela OpenAI",
    }) as unknown as typeof fetch;

    const erro: OpenAIError = await chamarOpenAI(mensagens).catch((e) => e);
    expect(erro).toBeInstanceOf(OpenAIError);
    expect(erro.tipo).toBe("rate_limit");
    expect(erro.status).toBe(429);
    expect(erro.retryAfterSegundos).toBe(12);
  });

  it("erro genérico do provedor não repassa o corpo interno na mensagem pública", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      text: async () => "detalhe interno sensível de configuração da conta",
    }) as unknown as typeof fetch;

    const erro: OpenAIError = await chamarOpenAI(mensagens).catch((e) => e);
    expect(erro.tipo).toBe("erro");
    expect(erro.status).toBe(502);
    expect(erro.message).not.toContain("sensível");
  });

  it("rejeita resposta em formato inesperado (sem choices) em vez de repassar lixo ao cliente", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ nada_a_ver: true }),
    }) as unknown as typeof fetch;

    const erro: OpenAIError = await chamarOpenAI(mensagens).catch((e) => e);
    expect(erro).toBeInstanceOf(OpenAIError);
    expect(erro.tipo).toBe("erro");
  });

  it("usa max_completion_tokens configurável no corpo da requisição", async () => {
    vi.stubEnv("AGENTE_MAX_OUTPUT_TOKENS", "123");
    const fetchMock = vi.fn().mockResolvedValue(respostaOk());
    global.fetch = fetchMock as unknown as typeof fetch;

    await chamarOpenAI(mensagens);

    const corpo = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(corpo.max_completion_tokens).toBe(123);
  });
});
