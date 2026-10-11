import { afterEach, describe, expect, it, vi } from "vitest";

import { registrarAcesso, totalAcessos } from "@/lib/visitas";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("visitas", () => {
  it("sem store configurado não inventa número", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    expect(await totalAcessos()).toBeNull();
    expect(await registrarAcesso()).toBeNull();
  });

  it("registra com INCR e devolve o total", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ result: 1235 }) }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await registrarAcesso()).toBe(5000 + 1235);
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toContain("/INCR/");
  });

  it("chave ainda inexistente soma só a base anterior", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ result: null }) })));
    expect(await totalAcessos()).toBe(5000);
  });

  it("se o Redis falha, devolve null em vez de lançar", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 })));
    expect(await totalAcessos()).toBeNull();
  });
});
