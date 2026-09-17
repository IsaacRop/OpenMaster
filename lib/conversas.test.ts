import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchComLimiteMock = vi.fn();
vi.mock("@/lib/net", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/net")>();
  return { ...real, fetchComLimite: (...args: unknown[]) => fetchComLimiteMock(...args) };
});

const { obterConversa } = await import("@/lib/conversas");

function arquivoValido() {
  return JSON.stringify({
    metadata: {
      participants: ["DV", "Fulano"],
      date_range: { start: "2025-01-01", end: "2025-01-02" },
      total_messages: 1,
    },
    messages: [
      {
        id: 1,
        timestamp: "2025-01-01T00:00:00",
        date: "2025-01-01",
        time: "00:00:00",
        sender: "DV",
        content: "oi",
        type: "text",
        is_edited: false,
        attachment: null,
        urls: [],
      },
    ],
    // campo extra que a origem real também manda (ex.: "index") — não deve derrubar a validação.
    index: { dates: [] },
  });
}

describe("obterConversa — validação do JSON remoto", () => {
  beforeEach(() => {
    fetchComLimiteMock.mockReset();
  });

  it("aceita um JSON remoto que bate com o schema esperado, ignorando campos extras", async () => {
    fetchComLimiteMock.mockResolvedValue(arquivoValido());
    const r = await obterConversa("dv-self");
    expect(r).not.toBeNull();
    expect(r?.messages).toHaveLength(1);
    expect(r?.meta.participants).toEqual(["DV", "Fulano"]);
  });

  it("rejeita id fora da allowlist sem sequer tentar buscar (sem SSRF via id arbitrário)", async () => {
    const r = await obterConversa("id-inventado-pelo-atacante");
    expect(r).toBeNull();
    expect(fetchComLimiteMock).not.toHaveBeenCalled();
  });

  it("rejeita JSON remoto cuja estrutura foge do schema (messages não é array)", async () => {
    fetchComLimiteMock.mockResolvedValue(JSON.stringify({ metadata: {}, messages: "não é array" }));
    const r = await obterConversa("michael");
    expect(r).toBeNull();
  });

  it("rejeita mensagem sem os campos obrigatórios", async () => {
    fetchComLimiteMock.mockResolvedValue(
      JSON.stringify({
        metadata: {
          participants: ["DV"],
          date_range: { start: "2025-01-01", end: "2025-01-01" },
          total_messages: 1,
        },
        messages: [{ id: 1, content: "sem os outros campos obrigatórios" }],
      }),
    );
    const r = await obterConversa("ciro-soares");
    expect(r).toBeNull();
  });

  it("passa a URL montada com o commit fixo (não a branch main) para fetchComLimite", async () => {
    fetchComLimiteMock.mockResolvedValue(arquivoValido());
    await obterConversa("angelo-silva");
    const [url] = fetchComLimiteMock.mock.calls[0];
    expect(url).toMatch(/^https:\/\/raw\.githubusercontent\.com\/rafaelbressan\/masterzap\/[0-9a-f]{40}\/data\/conversations\/angelo-silva\.json$/);
  });

  it("mantém a última versão válida quando uma atualização subsequente falha", async () => {
    vi.useFakeTimers();
    try {
      fetchComLimiteMock.mockResolvedValueOnce(arquivoValido());
      const primeira = await obterConversa("leo-palhares");
      expect(primeira).not.toBeNull();

      // avança além da janela de revalidação (1h) para forçar nova busca
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000 + 1000);

      fetchComLimiteMock.mockRejectedValueOnce(new Error("falha de rede simulada"));
      const segunda = await obterConversa("leo-palhares");

      expect(fetchComLimiteMock).toHaveBeenCalledTimes(2);
      expect(segunda).toEqual(primeira);
    } finally {
      vi.useRealTimers();
    }
  });
});
