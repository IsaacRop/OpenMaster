import { beforeEach, describe, expect, it, vi } from "vitest";

import { __resetCacheParaTestes, gravarCache, lerCache, type RespostaCache } from "@/lib/agente/cache";

const resposta = (sufixo: string): RespostaCache => ({
  resposta: `resposta-${sufixo}`,
  fontes: [],
  totalCartoes: 0,
});

describe("cache de perguntas", () => {
  beforeEach(() => {
    __resetCacheParaTestes();
    vi.useRealTimers();
  });

  it("normaliza a pergunta: variações equivalentes caem na mesma entrada", () => {
    gravarCache("Qual é o status do processo?", resposta("a"));
    expect(lerCache("qual e o status do processo")).toEqual(resposta("a"));
  });

  it("expira entradas depois do TTL", () => {
    vi.useFakeTimers();
    gravarCache("pergunta com ttl", resposta("b"));
    expect(lerCache("pergunta com ttl")).toEqual(resposta("b"));

    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
    expect(lerCache("pergunta com ttl")).toBeNull();
    vi.useRealTimers();
  });

  it("não cresce sem limite: evita a entrada mais antiga ao estourar o teto", () => {
    for (let i = 0; i < 501; i++) {
      gravarCache(`pergunta numero ${i}`, resposta(String(i)));
    }
    expect(lerCache("pergunta numero 0")).toBeNull();
    expect(lerCache("pergunta numero 500")).toEqual(resposta("500"));
  });
});
