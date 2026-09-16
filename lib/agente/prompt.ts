import type { Cartao } from "./recuperacao";

/**
 * Prompt fixo, byte a byte igual em toda chamada — é o que permite o prompt
 * caching automático da OpenAI pegar depois da primeira requisição. Qualquer
 * edição aqui reseta o cache até a próxima chamada idêntica se repetir.
 *
 * Não editar para incluir dado variável (data, nome de pergunta etc.) — isso
 * vai na parte variável, montada por `formatarCartoes`.
 */
export const SYSTEM_PROMPT = `Você é o agente de consulta do OpenMaster, um painel público e independente de acompanhamento do caso Banco Master / Daniel Vorcaro no STF.

Regras, sem exceção:
1. Responda só com base nos cartões fornecidos abaixo. Nunca complete com conhecimento geral do modelo, mesmo que pareça óbvio ou de conhecimento público.
2. Toda afirmação precisa vir acompanhada da fonte do cartão de onde veio, no formato "Fonte: {source_name}".
3. Cartões marcados "[Em apuração]" ou "[Ponto controverso]" precisam ser citados como tal na frase — nunca apresente esse conteúdo como fato assentado. Exemplo: "segundo apuração da PF, ainda não confirmada, ...".
4. Se os cartões fornecidos não cobrirem a pergunta, diga claramente "não encontrei informação suficiente na base do OpenMaster sobre isso" em vez de completar com o que você sabe de fora.
5. Nunca faça juízo de culpa ou inocência sobre pessoa nomeada. Reporte apenas o que os documentos e fontes citados registram.
6. Responda em português, de forma direta e objetiva.`;

/**
 * Formata os cartões recuperados nesta pergunta. Estrutura sempre igual
 * (mesma ordem de campos, mesmos rótulos) para maximizar reuso de cache em
 * perguntas parecidas, mesmo que o conjunto de cartões não seja idêntico.
 */
export function formatarCartoes(cartoes: Cartao[]): string {
  if (cartoes.length === 0) {
    return "Nenhum cartão recuperado da base para esta pergunta.";
  }

  const blocos = cartoes.map((c) => {
    const marca = c.confianca === "apuracao" ? "[Em apuração] " : c.confianca === "controverso" ? "[Ponto controverso] " : "";
    const linhas = c.linhas.filter(Boolean).join(" · ");
    return `- (${c.tipo}) ${marca}${c.titulo}\n  ${linhas}\n  Fonte: ${c.source_name} (${c.source_url})`;
  });

  return `Cartões recuperados da base (${cartoes.length}):\n\n${blocos.join("\n\n")}`;
}

export function montarMensagens(pergunta: string, cartoes: Cartao[]) {
  return [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: `${formatarCartoes(cartoes)}\n\nPergunta: ${pergunta}` },
  ];
}
