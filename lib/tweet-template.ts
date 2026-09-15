import { CONFIANCA_LABEL, type EventoTimeline } from "./schema";

/**
 * Geração do texto dos posts. Vive em lib/ e não dentro do script de
 * publicação para que possa ser lido sem executar nada — `scripts/post-sessao.ts`
 * confere o texto de um evento sem risco de disparar uma postagem.
 */

export const LIMITE_CHARS = 280;

export const siteUrl = () =>
  process.env.SITE_URL ?? "https://painel-caso-master.vercel.app";

export function formatarData(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function truncar(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

/**
 * O prefixo vem de `confianca`, não da redação do evento. É o que garante que
 * uma sessão apenas pautada não vire "STF decidiu" no timeline do X.
 *
 * `confirmado` não ganha prefixo: o texto sem marca é a afirmação direta, e a
 * marca existe só para ressalvar. Ausência de `[Em apuração]` é o sinal de que
 * o registro é de um fato consumado — é isso que o passo 4 de
 * `scripts/post-sessao.ts` confere.
 */
export function textoDoEvento(e: EventoTimeline): string {
  const prefixo = CONFIANCA_LABEL[e.confianca];
  const cabecalho = prefixo
    ? `[${prefixo}] ${formatarData(e.data)}`
    : `${formatarData(e.data)}`;
  const titulo = `${cabecalho} — ${e.titulo}`;
  // O X conta qualquer URL como 23 caracteres (t.co), então medir a URL
  // inteira deixa a conta conservadora de propósito.
  const rodape = `\n\nFonte: ${e.source_name}\n${siteUrl()}/timeline#${e.id}`;

  const espaco = LIMITE_CHARS - titulo.length - rodape.length - 2;
  const corpo = espaco > 40 ? truncar(e.descricao, espaco) : "";

  return corpo ? `${titulo}\n\n${corpo}${rodape}` : `${titulo}${rodape}`;
}

export type Pendente = {
  processo_id: string;
  numero: string;
  movimentacao: { data: string; descricao: string; origem: string; codigo?: number };
  detectado_em: string;
  tweeted_at?: string | null;
};

/** Template puramente factual: número, data, nome oficial do movimento, link. */
export function textoDaMovimentacao(p: Pendente): string {
  const cabecalho = `${p.numero} — nova movimentação em ${formatarData(p.movimentacao.data)}`;
  const rodape = `\n\nFonte: DataJud/CNJ (metadado oficial)\n${siteUrl()}/processos/${p.processo_id}`;

  const espaco = LIMITE_CHARS - cabecalho.length - rodape.length - 2;
  const corpo = espaco > 20 ? truncar(p.movimentacao.descricao, espaco) : "";

  return corpo ? `${cabecalho}\n\n${corpo}${rodape}` : `${cabecalho}${rodape}`;
}
