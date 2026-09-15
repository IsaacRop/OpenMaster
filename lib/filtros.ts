import type { MetaItem, Opcoes } from "@/components/ListaFiltravel";
import {
  documentosDoProcesso,
  eventosDoProcesso,
  pessoas,
  processoPorId,
  relacoesDoNo,
  timeline,
  processos,
} from "./data";
import { SIGILO_LABEL, TIPO_LABEL, type Sigilo } from "./schema";

/**
 * Metadados de filtro, calculados no build.
 *
 * O ponto dos filtros ser *cruzados* é que as dimensões não vivem todas na
 * mesma entidade: "eventos que envolvem Fachin" é campo do evento, mas
 * "processos que envolvem Fachin" tem que atravessar relações, eventos e
 * autoria de peças para chegar ao mesmo nome. É esse atravessamento que este
 * arquivo materializa, uma vez, para os dois lados.
 */

const RIGOR: Record<Sigilo, number> = { publico: 0, parcial: 1, sigiloso: 2 };
const POR_RIGOR = (["publico", "parcial", "sigiloso"] as const).slice();

export const OPCOES: Opcoes = {
  pessoas: [...pessoas]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((p) => ({ valor: p.id, rotulo: p.nome })),
  tipos: (Object.keys(TIPO_LABEL) as (keyof typeof TIPO_LABEL)[]).map((t) => ({
    valor: t,
    rotulo: TIPO_LABEL[t],
  })),
  confiancas: [
    { valor: "confirmado", rotulo: "Confirmado" },
    { valor: "apuracao", rotulo: "Em apuração" },
    { valor: "controverso", rotulo: "Controverso" },
  ],
  sigilos: POR_RIGOR.map((s) => ({ valor: s, rotulo: SIGILO_LABEL[s] })),
};

/** A grade perdeu os subtítulos por status ao virar filtrável; a ordem preserva a leitura. */
const ORDEM_STATUS: Record<(typeof processos)[number]["status"], number> = {
  pautado: 0,
  em_aberto: 1,
  decidido: 2,
};

/**
 * Um processo "envolve" uma pessoa por três caminhos distintos, e nenhum deles
 * sozinho dá a resposta que o leitor espera: a relação direta no grafo, a
 * citação num evento da tramitação e a assinatura de uma peça. O filtro
 * responde pela união dos três.
 */
export const metaProcessos: MetaItem[] = [...processos]
  .sort((a, b) => ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] || a.numero.localeCompare(b.numero))
  .map((p) => {
    const eventos = eventosDoProcesso(p.id);
    const envolvidos = new Set<string>();

    for (const r of relacoesDoNo(p.id)) {
      for (const ponta of [r.from, r.to]) {
        if (ponta !== p.id) envolvidos.add(ponta);
      }
    }
    for (const e of eventos) for (const id of e.pessoas) envolvidos.add(id);
    for (const d of documentosDoProcesso(p.id)) envolvidos.add(d.autor_id);

    return {
      id: p.id,
      pessoas: [...envolvidos],
      tipos: [...new Set(eventos.map((e) => e.tipo))],
      confianca: p.confianca,
      sigilo: p.sigilo,
      data: p.ultima_movimentacao?.data ?? p.updated_at,
    };
  });

/**
 * O sigilo de um evento é o do processo mais restrito que ele toca: um evento
 * que fala de peça sigilosa não vira público por também citar um feito aberto.
 * Evento que não referencia processo nenhum é público — não há peça atrás dele.
 */
export const metaTimeline: MetaItem[] = timeline.map((e) => {
  const sigilo = e.processos
    .map((id) => processoPorId(id)?.sigilo ?? "publico")
    .reduce<Sigilo>((pior, s) => (RIGOR[s] > RIGOR[pior] ? s : pior), "publico");

  return {
    id: e.id,
    pessoas: e.pessoas,
    tipos: [e.tipo],
    confianca: e.confianca,
    sigilo,
    data: e.data,
  };
});
