import { z } from "zod";

/**
 * Client mínimo da API da OpenAI via fetch — sem SDK, é uma única chamada.
 * A chave nunca sai deste arquivo: só é lida de `process.env` e só roda
 * server-side (route.ts do App Router é server-only por padrão).
 */

const MODELO_PADRAO = "gpt-5-nano";
const TIMEOUT_MS_PADRAO = 20_000;
// gpt-5-nano é um modelo de raciocínio: os tokens de reasoning saem do mesmo
// orçamento de max_completion_tokens, antes de qualquer token de resposta
// visível. Com esforço padrão (medium), o modelo pode gastar o orçamento
// inteiro raciocinando e devolver conteúdo vazio (finish_reason "length").
// REASONING_EFFORT_PADRAO em "low" mantém síntese razoável sem consumir o
// orçamento inteiro; o teto foi alargado para sobrar espaço de resposta real.
const MAX_OUTPUT_TOKENS_PADRAO = 1600;
const REASONING_EFFORT_PADRAO = "low";

export type MensagemChat = { role: "system" | "user"; content: string };

export type RespostaOpenAI = {
  texto: string;
  tokens: { entrada: number; saida: number; total: number };
};

export type TipoErroOpenAI = "timeout" | "rate_limit" | "erro";

/** Diferencia timeout / rate limit do provedor / erro genérico sem carregar detalhe interno na mensagem pública. */
export class OpenAIError extends Error {
  readonly tipo: TipoErroOpenAI;
  readonly status: number;
  readonly retryAfterSegundos?: number;

  constructor(message: string, tipo: TipoErroOpenAI, status: number, retryAfterSegundos?: number) {
    super(message);
    this.name = "OpenAIError";
    this.tipo = tipo;
    this.status = status;
    this.retryAfterSegundos = retryAfterSegundos;
  }
}

/** Só valida a forma que este client realmente lê — o resto da resposta da OpenAI é ignorado. */
const RespostaOpenAISchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1, "resposta sem choices"),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
});

export async function chamarOpenAI(mensagens: MensagemChat[]): Promise<RespostaOpenAI> {
  const chave = process.env.OPENAI_API_KEY;
  if (!chave) {
    throw new OpenAIError("OPENAI_API_KEY não configurada no ambiente do servidor.", "erro", 500);
  }

  const modelo = process.env.AGENTE_MODEL || MODELO_PADRAO;
  const timeoutMs = Number(process.env.AGENTE_TIMEOUT_MS) || TIMEOUT_MS_PADRAO;
  const maxOutputTokens = Number(process.env.AGENTE_MAX_OUTPUT_TOKENS) || MAX_OUTPUT_TOKENS_PADRAO;
  const reasoningEffort = process.env.AGENTE_REASONING_EFFORT || REASONING_EFFORT_PADRAO;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs);

  let resposta: Response;
  try {
    resposta = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${chave}`,
      },
      body: JSON.stringify({
        model: modelo,
        messages: mensagens,
        max_completion_tokens: maxOutputTokens,
        reasoning_effort: reasoningEffort,
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new OpenAIError("Tempo esgotado ao consultar o modelo.", "timeout", 504);
    }
    console.error("[agente] falha de rede ao consultar a OpenAI:", e);
    throw new OpenAIError("Falha de rede ao consultar o modelo.", "erro", 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!resposta.ok) {
    // Nunca repassar o corpo do erro da OpenAI ao cliente: pode ecoar detalhe
    // de configuração da conta. Detalhe completo só no log do servidor.
    const corpo = await resposta.text().catch(() => "");
    console.error(`OpenAI respondeu ${resposta.status}: ${corpo}`);

    if (resposta.status === 429) {
      const retryHeader = Number(resposta.headers.get("retry-after"));
      const retryAfterSegundos = Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : 30;
      throw new OpenAIError("Limite do provedor atingido.", "rate_limit", 429, retryAfterSegundos);
    }
    throw new OpenAIError("Falha ao consultar o modelo.", "erro", 502);
  }

  let dadosBrutos: unknown;
  try {
    dadosBrutos = await resposta.json();
  } catch (e) {
    console.error("[agente] resposta da OpenAI não é JSON válido:", e);
    throw new OpenAIError("Resposta inválida do modelo.", "erro", 502);
  }

  const parsed = RespostaOpenAISchema.safeParse(dadosBrutos);
  if (!parsed.success) {
    console.error("[agente] resposta da OpenAI em formato inesperado:", parsed.error.message);
    throw new OpenAIError("Resposta inválida do modelo.", "erro", 502);
  }

  const texto = parsed.data.choices[0]?.message.content ?? "";
  const uso = parsed.data.usage;

  if (!texto.trim()) {
    // Modelo de raciocínio pode consumir o orçamento inteiro de
    // max_completion_tokens em tokens de reasoning e devolver conteúdo vazio
    // (finish_reason "length"). Isso não é uma resposta válida — melhor
    // sinalizar erro do que devolver uma caixa de resposta em branco.
    console.error(`[agente] resposta vazia da OpenAI — tokens_saida=${uso?.completion_tokens ?? "?"}`);
    throw new OpenAIError("O modelo não gerou uma resposta. Tente novamente.", "erro", 502);
  }

  return {
    texto,
    tokens: {
      entrada: uso?.prompt_tokens ?? 0,
      saida: uso?.completion_tokens ?? 0,
      total: uso?.total_tokens ?? 0,
    },
  };
}
