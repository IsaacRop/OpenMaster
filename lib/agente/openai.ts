/**
 * Client mínimo da API da OpenAI via fetch — sem SDK, é uma única chamada.
 * A chave nunca sai deste arquivo: só é lida de `process.env` e só roda
 * server-side (route.ts do App Router é server-only por padrão).
 */

const MODELO_PADRAO = "gpt-5-nano";

export type MensagemChat = { role: "system" | "user"; content: string };

export type RespostaOpenAI = {
  texto: string;
  tokens: { entrada: number; saida: number; total: number };
};

export async function chamarOpenAI(mensagens: MensagemChat[]): Promise<RespostaOpenAI> {
  const chave = process.env.OPENAI_API_KEY;
  if (!chave) {
    throw new Error("OPENAI_API_KEY não configurada no ambiente do servidor.");
  }

  const modelo = process.env.AGENTE_MODEL || MODELO_PADRAO;

  const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${chave}`,
    },
    body: JSON.stringify({
      model: modelo,
      messages: mensagens,
    }),
  });

  if (!resposta.ok) {
    // Nunca repassar o corpo do erro da OpenAI ao cliente: pode ecoar detalhe
    // de configuração da conta. Detalhe completo só no log do servidor.
    const corpo = await resposta.text();
    console.error(`OpenAI respondeu ${resposta.status}: ${corpo}`);
    throw new Error("Falha ao consultar o modelo.");
  }

  const dados = await resposta.json();
  const texto = dados.choices?.[0]?.message?.content ?? "";
  const uso = dados.usage ?? {};

  return {
    texto,
    tokens: {
      entrada: uso.prompt_tokens ?? 0,
      saida: uso.completion_tokens ?? 0,
      total: uso.total_tokens ?? 0,
    },
  };
}
