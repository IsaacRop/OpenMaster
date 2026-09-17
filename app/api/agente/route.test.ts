import { beforeEach, describe, expect, it, vi } from "vitest";

const lerCacheMock = vi.fn();
const gravarCacheMock = vi.fn();
vi.mock("@/lib/agente/cache", () => ({
  lerCache: (...a: unknown[]) => lerCacheMock(...a),
  gravarCache: (...a: unknown[]) => gravarCacheMock(...a),
}));

const extrairIpMock = vi.fn((..._args: unknown[]) => "ip-de-teste");
const checarLimiteMock = vi.fn();
const hashParaLogMock = vi.fn((..._args: unknown[]) => "hash-de-teste");
vi.mock("@/lib/agente/rate-limit", () => ({
  extrairIp: (...a: unknown[]) => extrairIpMock(...a),
  checarLimite: (...a: unknown[]) => checarLimiteMock(...a),
  hashParaLog: (...a: unknown[]) => hashParaLogMock(...a),
}));

const chamarOpenAIMock = vi.fn();
vi.mock("@/lib/agente/openai", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/agente/openai")>();
  return { ...real, chamarOpenAI: (...a: unknown[]) => chamarOpenAIMock(...a) };
});

vi.mock("@/lib/agente/recuperacao", () => ({ recuperar: () => [] }));
vi.mock("@/lib/agente/prompt", () => ({ montarMensagens: () => [] }));

const { POST } = await import("./route");
type ReqLike = Parameters<typeof POST>[0];

function fakeReq(corpo: unknown, headersExtra: Record<string, string> = {}): ReqLike {
  const texto = typeof corpo === "string" ? corpo : JSON.stringify(corpo);
  const bytes = new TextEncoder().encode(texto);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const headers = new Headers({
    "content-type": "application/json",
    "content-length": String(bytes.byteLength),
    ...headersExtra,
  });
  return { headers, body } as unknown as ReqLike;
}

describe("POST /api/agente — validação de entrada", () => {
  beforeEach(() => {
    lerCacheMock.mockReset().mockReturnValue(null);
    checarLimiteMock.mockReset().mockResolvedValue({ permitido: true, restantes: 9 });
    chamarOpenAIMock.mockReset();
    gravarCacheMock.mockReset();
  });

  it("rejeita corpo sem o campo pergunta", async () => {
    const res = await POST(fakeReq({}));
    expect(res.status).toBe(400);
  });

  it("rejeita pergunta vazia", async () => {
    const res = await POST(fakeReq({ pergunta: "" }));
    expect(res.status).toBe(400);
  });

  it("rejeita pergunta acima de 500 caracteres", async () => {
    const res = await POST(fakeReq({ pergunta: "a".repeat(501) }));
    expect(res.status).toBe(400);
  });

  it("rejeita campos inesperados (schema strict)", async () => {
    const res = await POST(fakeReq({ pergunta: "oi", admin: true }));
    expect(res.status).toBe(400);
  });

  it("rejeita JSON malformado", async () => {
    const res = await POST(fakeReq("{ isto nao é json"));
    expect(res.status).toBe(400);
  });

  it("rejeita corpo maior que o limite declarado via Content-Length, sem ler o corpo inteiro", async () => {
    const res = await POST(fakeReq({ pergunta: "oi" }, { "content-length": "999999" }));
    expect(res.status).toBe(413);
  });

  it("aceita uma pergunta válida e devolve 200", async () => {
    chamarOpenAIMock.mockResolvedValue({ texto: "resposta", tokens: { entrada: 1, saida: 1, total: 2 } });
    const res = await POST(fakeReq({ pergunta: "Quem é o relator?" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.resposta).toBe("resposta");
  });
});

describe("POST /api/agente — rate limit", () => {
  beforeEach(() => {
    lerCacheMock.mockReset().mockReturnValue(null);
    chamarOpenAIMock.mockReset();
    gravarCacheMock.mockReset();
  });

  it("responde 429 com Retry-After quando o limite é atingido", async () => {
    checarLimiteMock.mockReset().mockResolvedValue({ permitido: false, restantes: 0, retryAfterSegundos: 42 });
    const res = await POST(fakeReq({ pergunta: "oi" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });

  it("não consulta o rate limit quando a resposta já está em cache", async () => {
    checarLimiteMock.mockReset().mockResolvedValue({ permitido: true, restantes: 9 });
    lerCacheMock.mockReset().mockReturnValue({ resposta: "do cache", fontes: [], totalCartoes: 0 });
    const res = await POST(fakeReq({ pergunta: "oi" }));
    expect(res.status).toBe(200);
    expect(checarLimiteMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/agente — não vaza detalhe interno em erro da OpenAI", () => {
  beforeEach(() => {
    lerCacheMock.mockReset().mockReturnValue(null);
    checarLimiteMock.mockReset().mockResolvedValue({ permitido: true, restantes: 9 });
    gravarCacheMock.mockReset();
  });

  it("erro genérico vira 502 com mensagem genérica", async () => {
    const { OpenAIError } = await import("@/lib/agente/openai");
    chamarOpenAIMock.mockRejectedValue(new OpenAIError("detalhe interno sensível", "erro", 502));
    const res = await POST(fakeReq({ pergunta: "oi" }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.erro).not.toContain("sensível");
  });
});
