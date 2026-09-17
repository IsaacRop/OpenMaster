import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `checarLimite`/`extrairIp`/`hashParaLog` leem variáveis de ambiente em
 * tempo de import (topo do módulo) — por isso cada teste que varia
 * configuração faz `vi.resetModules()` + `import()` dinâmico, para reavaliar
 * essas constantes com o ambiente daquele teste.
 */
async function importarFresco() {
  vi.resetModules();
  return import("@/lib/agente/rate-limit");
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("checarLimite", () => {
  it("permite até o limite por IP e bloqueia depois, com retry-after", async () => {
    vi.stubEnv("AGENTE_RATE_LIMIT_MAX", "2");
    vi.stubEnv("AGENTE_RATE_LIMIT_GLOBAL_MAX", "1000");
    vi.stubEnv("AGENTE_RATE_LIMIT_WINDOW_MS", "60000");
    const { checarLimite } = await importarFresco();

    expect((await checarLimite("1.2.3.4")).permitido).toBe(true);
    expect((await checarLimite("1.2.3.4")).permitido).toBe(true);
    const terceiro = await checarLimite("1.2.3.4");
    expect(terceiro.permitido).toBe(false);
    expect(terceiro.retryAfterSegundos).toBeGreaterThan(0);
  });

  it("não deixa um IP diferente ser penalizado pelo limite de outro", async () => {
    vi.stubEnv("AGENTE_RATE_LIMIT_MAX", "1");
    vi.stubEnv("AGENTE_RATE_LIMIT_GLOBAL_MAX", "1000");
    vi.stubEnv("AGENTE_RATE_LIMIT_WINDOW_MS", "60000");
    const { checarLimite } = await importarFresco();

    expect((await checarLimite("1.1.1.1")).permitido).toBe(true);
    expect((await checarLimite("1.1.1.1")).permitido).toBe(false);
    expect((await checarLimite("2.2.2.2")).permitido).toBe(true);
  });

  it("aplica o limite global mesmo vindo de IPs distintos (defesa contra abuso distribuído)", async () => {
    vi.stubEnv("AGENTE_RATE_LIMIT_MAX", "1000");
    vi.stubEnv("AGENTE_RATE_LIMIT_GLOBAL_MAX", "2");
    vi.stubEnv("AGENTE_RATE_LIMIT_WINDOW_MS", "60000");
    const { checarLimite } = await importarFresco();

    expect((await checarLimite("1.1.1.1")).permitido).toBe(true);
    expect((await checarLimite("2.2.2.2")).permitido).toBe(true);
    expect((await checarLimite("3.3.3.3")).permitido).toBe(false);
  });
});

describe("extrairIp", () => {
  it("não confia em x-forwarded-for sem um proxy configurado como confiável", async () => {
    const { extrairIp } = await importarFresco();
    const headers = new Headers({ "x-forwarded-for": "9.9.9.9" });
    expect(extrairIp(headers)).toBe("sem-proxy-confiavel");
  });

  it("confia no cabeçalho quando TRUST_PROXY_HEADERS=true e o valor parece um IP", async () => {
    vi.stubEnv("TRUST_PROXY_HEADERS", "true");
    const { extrairIp } = await importarFresco();
    const headers = new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" });
    expect(extrairIp(headers)).toBe("9.9.9.9");
  });

  it("ignora um cabeçalho com formato inválido mesmo confiando no proxy", async () => {
    vi.stubEnv("TRUST_PROXY_HEADERS", "true");
    const { extrairIp } = await importarFresco();
    const headers = new Headers({ "x-forwarded-for": "<script>evil</script>" });
    expect(extrairIp(headers)).toBe("desconhecido");
  });
});

describe("hashParaLog", () => {
  it("nunca inclui o IP em texto puro na saída", async () => {
    vi.stubEnv("LOG_IP_HMAC_SECRET", "segredo-de-teste");
    const { hashParaLog } = await importarFresco();
    const hash = hashParaLog("203.0.113.7");
    expect(hash).not.toContain("203.0.113.7");
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("o mesmo IP produz hashes diferentes com segredos diferentes", async () => {
    vi.stubEnv("LOG_IP_HMAC_SECRET", "segredo-a");
    const { hashParaLog: hashA } = await importarFresco();
    const resultadoA = hashA("203.0.113.7");

    vi.stubEnv("LOG_IP_HMAC_SECRET", "segredo-b");
    const { hashParaLog: hashB } = await importarFresco();
    const resultadoB = hashB("203.0.113.7");

    expect(resultadoA).not.toBe(resultadoB);
  });
});
