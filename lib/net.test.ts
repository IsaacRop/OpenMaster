import { describe, expect, it } from "vitest";

import { fetchComLimite, garantirHostPermitido, HostNaoPermitidoError, lerComLimite, LimiteExcedidoError } from "@/lib/net";

function streamDe(pedacos: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < pedacos.length) {
        controller.enqueue(enc.encode(pedacos[i++]));
      } else {
        controller.close();
      }
    },
  });
}

describe("lerComLimite", () => {
  it("lê um stream inteiro quando está dentro do limite", async () => {
    const bytes = await lerComLimite(streamDe(["ab", "cd", "ef"]), 100);
    expect(new TextDecoder().decode(bytes)).toBe("abcdef");
  });

  it("lança LimiteExcedidoError ao estourar o teto de bytes", async () => {
    const grande = "x".repeat(1000);
    await expect(lerComLimite(streamDe([grande]), 10)).rejects.toBeInstanceOf(LimiteExcedidoError);
  });

  it("stream nulo devolve vazio em vez de lançar", async () => {
    const bytes = await lerComLimite(null, 10);
    expect(bytes.byteLength).toBe(0);
  });
});

describe("garantirHostPermitido", () => {
  it("aceita host https presente na allowlist", () => {
    expect(() =>
      garantirHostPermitido("https://raw.githubusercontent.com/a/b", ["raw.githubusercontent.com"]),
    ).not.toThrow();
  });

  it("rejeita host fora da allowlist", () => {
    expect(() =>
      garantirHostPermitido("https://evil.example.com/a", ["raw.githubusercontent.com"]),
    ).toThrow(HostNaoPermitidoError);
  });

  it("rejeita esquema não-https mesmo com host permitido", () => {
    expect(() =>
      garantirHostPermitido("http://raw.githubusercontent.com/a", ["raw.githubusercontent.com"]),
    ).toThrow(HostNaoPermitidoError);
  });
});

describe("fetchComLimite", () => {
  it("rejeita antes de qualquer fetch quando o host não está na allowlist", async () => {
    await expect(
      fetchComLimite("https://internal.example.com/secret", {
        timeoutMs: 1000,
        maxBytes: 100,
        hostsPermitidos: ["raw.githubusercontent.com"],
      }),
    ).rejects.toBeInstanceOf(HostNaoPermitidoError);
  });
});
