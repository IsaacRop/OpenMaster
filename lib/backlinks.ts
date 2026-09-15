import {
  documentos,
  pessoaPorId,
  processoPorId,
  documentoPorId,
  eventoPorId,
  pessoas,
  processos,
  relacoes,
  timeline,
} from "./data";
import { TIPO_DOCUMENTO_LABEL, type Fonte } from "./schema";

/**
 * Backlinks: quem aponta para quem, derivado em build time.
 *
 * A regra editorial aqui é a mesma de `source_url`, só que pelo avesso. Um
 * campo "aparece_em" curado à mão num JSON é verdadeiro no dia em que é escrito
 * e mentira no dia seguinte, quando alguém adiciona um evento e esquece de
 * atualizá-lo — e ninguém percebe, porque o dado errado tem exatamente a mesma
 * aparência do certo. Então backlink não é dado: é função dos dados.
 *
 * As três arestas de referência do painel, todas curadas na ponta que aponta:
 *   - `EventoTimeline.processos[]` / `.pessoas[]`
 *   - `Documento.processo_id` / `.autor_id`
 *   - `Relacao.from` / `.to`
 *
 * `scripts/validate.ts` recusa qualquer campo de backlink escrito nos JSONs,
 * justamente para que este arquivo continue sendo a única resposta possível.
 */

export type TipoEntidade = "processo" | "pessoa" | "documento" | "evento";

export type RefEntidade = {
  tipo: TipoEntidade;
  id: string;
  rotulo: string;
  /** Linha de apoio: o papel da pessoa, o apelido do processo, a data da peça. */
  sublinha: string;
  href: string;
};

export type Backlink = {
  origem: RefEntidade;
  /** Em que qualidade a origem referencia o alvo. */
  via: string;
  /** Discriminante estável para contagem — `via` é texto de tela, muda. */
  chave: "evento" | "autoria" | "peca" | "relacao";
  fonte: Fonte;
};

export type Backlinks = {
  eventos: Backlink[];
  documentos: Backlink[];
  relacoes: Backlink[];
  total: number;
};

export const TIPO_ENTIDADE_LABEL: Record<TipoEntidade, string> = {
  processo: "Processo",
  pessoa: "Pessoa ou instituição",
  documento: "Documento",
  evento: "Evento",
};

export const TIPO_ENTIDADE_PLURAL: Record<TipoEntidade, string> = {
  processo: "Processos",
  pessoa: "Pessoas e instituições",
  documento: "Documentos",
  evento: "Eventos",
};

export const dataBR = (iso: string) => iso.split("-").reverse().join("/");

// --- Resolução de id -> entidade -------------------------------------------

/**
 * Ids vivem num espaço único (validate.ts garante que não colidem entre
 * coleções), então um id basta para achar a entidade e sua página.
 */
export function refPorId(id: string): RefEntidade | null {
  const proc = processoPorId(id);
  if (proc) {
    return {
      tipo: "processo",
      id,
      rotulo: proc.numero,
      sublinha: proc.apelido,
      href: `/processos/${id}`,
    };
  }
  const p = pessoaPorId(id);
  if (p) {
    return { tipo: "pessoa", id, rotulo: p.nome, sublinha: p.papel, href: `/pessoas/${id}` };
  }
  const d = documentoPorId(id);
  if (d) {
    return {
      tipo: "documento",
      id,
      rotulo: d.numero_referencia,
      sublinha: `${TIPO_DOCUMENTO_LABEL[d.tipo]} · ${dataBR(d.data)}`,
      href: `/documentos/${id}`,
    };
  }
  const e = eventoPorId(id);
  if (e) {
    return { tipo: "evento", id, rotulo: e.titulo, sublinha: dataBR(e.data), href: `/eventos/${id}` };
  }
  return null;
}

/** Como `refPorId`, mas nunca nulo: o validate já garantiu que o id resolve. */
export function ref(id: string): RefEntidade {
  const r = refPorId(id);
  if (!r) throw new Error(`id sem entidade correspondente: "${id}" (validate.ts deveria ter pego)`);
  return r;
}

// --- Cálculo ---------------------------------------------------------------

function backlinksDe(id: string): Backlinks {
  const eventos: Backlink[] = [];
  const docs: Backlink[] = [];
  const rels: Backlink[] = [];

  for (const e of timeline) {
    const citaProcesso = e.processos.includes(id);
    const citaPessoa = e.pessoas.includes(id);
    if (!citaProcesso && !citaPessoa) continue;
    eventos.push({
      origem: ref(e.id),
      via: citaProcesso ? "registra ato neste processo" : "cita como envolvido",
      chave: "evento",
      fonte: e,
    });
  }

  for (const d of documentos) {
    if (d.autor_id === id) {
      docs.push({ origem: ref(d.id), via: "assinada por esta pessoa", chave: "autoria", fonte: d });
    } else if (d.processo_id === id) {
      docs.push({ origem: ref(d.id), via: "peça juntada neste processo", chave: "peca", fonte: d });
    }
  }

  for (const r of relacoes) {
    if (r.from !== id && r.to !== id) continue;
    const outro = r.from === id ? r.to : r.from;
    const entrada = r.to === id;
    rels.push({
      origem: ref(outro),
      via: entrada || !r.direcionada ? r.rotulo : `→ ${r.rotulo}`,
      chave: "relacao",
      fonte: r,
    });
  }

  const ordem = (a: Backlink, b: Backlink) => a.origem.rotulo.localeCompare(b.origem.rotulo, "pt-BR");
  eventos.sort(ordem);
  docs.sort(ordem);
  rels.sort(ordem);

  return { eventos, documentos: docs, relacoes: rels, total: eventos.length + docs.length + rels.length };
}

/**
 * Pré-calculado para todas as entidades: são dezenas de ids, e as páginas de
 * grafo e de busca pedem o grau de várias de uma vez.
 */
const INDICE: Map<string, Backlinks> = new Map(
  [
    ...processos.map((p) => p.id),
    ...pessoas.map((p) => p.id),
    ...documentos.map((d) => d.id),
    ...timeline.map((e) => e.id),
  ].map((id) => [id, backlinksDe(id)]),
);

const VAZIO: Backlinks = { eventos: [], documentos: [], relacoes: [], total: 0 };

export const backlinks = (id: string): Backlinks => INDICE.get(id) ?? VAZIO;

/** Quantas referências chegam a este id. É o que dimensiona o nó no grafo. */
export const grau = (id: string): number => backlinks(id).total;

export const grausPorId: Record<string, number> = Object.fromEntries(
  [...INDICE].map(([id, b]) => [id, b.total]),
);

/**
 * "aparece em 3 eventos, é autor de 2 documentos, tem 4 relações diretas" —
 * a frase que a página abre, montada do mesmo cálculo que alimenta a lista.
 */
export function resumoBacklinks(b: Backlinks): string {
  const partes: string[] = [];
  if (b.eventos.length) {
    partes.push(`aparece em ${b.eventos.length} ${b.eventos.length === 1 ? "evento" : "eventos"}`);
  }
  const autoria = b.documentos.filter((d) => d.chave === "autoria").length;
  const pecas = b.documentos.length - autoria;
  if (autoria) {
    partes.push(`é autor de ${autoria} ${autoria === 1 ? "documento" : "documentos"}`);
  }
  if (pecas) {
    partes.push(`reúne ${pecas} ${pecas === 1 ? "peça" : "peças"}`);
  }
  if (b.relacoes.length) {
    partes.push(
      `tem ${b.relacoes.length} ${b.relacoes.length === 1 ? "relação direta" : "relações diretas"}`,
    );
  }
  if (partes.length === 0) return "Nada no painel referencia esta entidade ainda.";
  const frase =
    partes.length === 1
      ? partes[0]
      : `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
  return frase.charAt(0).toUpperCase() + frase.slice(1) + ".";
}
