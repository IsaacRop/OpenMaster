import MiniSearch from "minisearch";

import { indiceBusca, type DocBusca } from "@/lib/busca";
import { documentoPorId, eventoPorId, pessoaPorId, processoPorId, relacoes } from "@/lib/data";
import { CONFIANCA_LABEL, STATUS_LABEL, TIPO_DOCUMENTO_LABEL, TIPO_LABEL, type Confianca } from "@/lib/schema";

/**
 * Recuperação server-side para o agente. Roda inteira em dados já validados
 * em build time (lib/data.ts) — nenhuma chamada externa aqui, custo zero de
 * API. É o que mantém o contexto injetado na OpenAI pequeno e estável mesmo
 * que o dataset cresça: nunca o catálogo inteiro, sempre um recorte.
 */

const TOP_BUSCA = 8;
const TETO_ENTIDADES = 20;

let mini: MiniSearch<DocBusca> | null = null;

/** Instância única por lambda quente — reconstruir a cada chamada custaria o índice inteiro. */
function indice(): MiniSearch<DocBusca> {
  if (mini) return mini;
  const ms = new MiniSearch<DocBusca>({
    fields: ["titulo", "subtitulo", "texto"],
    storeFields: ["tipo"],
    processTerm: (termo) => termo.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase(),
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { titulo: 3, subtitulo: 2 },
    },
  });
  ms.addAll(indiceBusca);
  mini = ms;
  return ms;
}

export type Cartao = {
  tipo: "processo" | "pessoa" | "documento" | "evento";
  id: string;
  titulo: string;
  linhas: string[];
  confianca: Confianca;
  source_url: string;
  source_name: string;
};

/** Vizinhos diretos de um id em relacoes.json, dos dois lados da aresta. */
function vizinhos(id: string): string[] {
  const ids: string[] = [];
  for (const r of relacoes) {
    if (r.from === id) ids.push(r.to);
    else if (r.to === id) ids.push(r.from);
  }
  return ids;
}

/** Cartão-resumo: só campos curtos, nunca movimentacoes[]/historico_relatoria[]. */
function cartao(id: string): Cartao | null {
  const proc = processoPorId(id);
  if (proc) {
    return {
      tipo: "processo",
      id,
      titulo: proc.numero,
      linhas: [proc.apelido, proc.objeto, `Status: ${STATUS_LABEL[proc.status]}`, `Relator: ${proc.relator_atual}`],
      confianca: proc.confianca,
      source_url: proc.source_url,
      source_name: proc.source_name,
    };
  }
  const pessoa = pessoaPorId(id);
  if (pessoa) {
    return {
      tipo: "pessoa",
      id,
      titulo: pessoa.nome,
      linhas: [pessoa.papel, pessoa.resumo_participacao],
      confianca: pessoa.confianca,
      source_url: pessoa.source_url,
      source_name: pessoa.source_name,
    };
  }
  const doc = documentoPorId(id);
  if (doc) {
    return {
      tipo: "documento",
      id,
      titulo: doc.numero_referencia,
      linhas: [TIPO_DOCUMENTO_LABEL[doc.tipo], doc.resumo],
      confianca: doc.confianca,
      source_url: doc.source_url,
      source_name: doc.source_name,
    };
  }
  const evento = eventoPorId(id);
  if (evento) {
    return {
      tipo: "evento",
      id,
      titulo: evento.titulo,
      linhas: [TIPO_LABEL[evento.tipo], evento.data.split("-").reverse().join("/"), evento.descricao],
      confianca: evento.confianca,
      source_url: evento.source_url,
      source_name: evento.source_name,
    };
  }
  return null;
}

/**
 * Pipeline de recuperação: busca full-text (top ~8) → expansão de um salto
 * via relacoes.json → cartão-resumo por entidade, até um teto de ~20.
 * Nada aqui chama a OpenAI; é puro cálculo sobre os JSONs já em memória.
 */
export function recuperar(pergunta: string): Cartao[] {
  const resultados = pergunta.trim().length >= 2 ? indice().search(pergunta) : [];
  const base = resultados.slice(0, TOP_BUSCA).map((r) => String(r.id));

  const selecionados = new Set<string>(base);
  for (const id of base) {
    if (selecionados.size >= TETO_ENTIDADES) break;
    for (const vizinho of vizinhos(id)) {
      if (selecionados.size >= TETO_ENTIDADES) break;
      selecionados.add(vizinho);
    }
  }

  return [...selecionados]
    .map(cartao)
    .filter((c): c is Cartao => c !== null);
}

/** Prefixo de hedge por cartão, para o modelo não precisar decidir sozinho. */
export function hedge(confianca: Confianca): string | null {
  return CONFIANCA_LABEL[confianca];
}
