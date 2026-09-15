import processosRaw from "../data/processos.json";
import timelineRaw from "../data/timeline.json";
import pessoasRaw from "../data/pessoas.json";
import documentosRaw from "../data/documentos.json";
import relacoesRaw from "../data/relacoes.json";

import {
  DocumentoArray,
  EventoTimelineArray,
  PessoaArray,
  ProcessoArray,
  RelacaoArray,
  type Documento,
  type EventoTimeline,
  type Pessoa,
  type Processo,
  type Relacao,
} from "./schema";

/**
 * Carga e validação dos dados. Isto roda em build time (Server Components e
 * scripts), nunca no navegador — é aqui que o guardrail "sem fonte, não entra"
 * deixa de ser convenção e vira erro de build.
 */

function parse<T>(schema: { safeParse: (v: unknown) => any }, raw: unknown, arquivo: string): T {
  const r = schema.safeParse(raw);
  if (!r.success) {
    const issues = r.error.issues
      .map((i: { path: (string | number)[]; message: string }) => `  data/${arquivo} → ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Dados inválidos em data/${arquivo}:\n${issues}`);
  }
  return r.data as T;
}

export const processos = parse<Processo[]>(ProcessoArray, processosRaw, "processos.json");
export const timeline = parse<EventoTimeline[]>(EventoTimelineArray, timelineRaw, "timeline.json");
export const pessoas = parse<Pessoa[]>(PessoaArray, pessoasRaw, "pessoas.json");
export const relacoes = parse<Relacao[]>(RelacaoArray, relacoesRaw, "relacoes.json");
export const documentos = parse<Documento[]>(DocumentoArray, documentosRaw, "documentos.json");

// --- Acessores ------------------------------------------------------------

export const processoPorId = (id: string) => processos.find((p) => p.id === id);
export const pessoaPorId = (id: string) => pessoas.find((p) => p.id === id);
export const documentoPorId = (id: string) => documentos.find((d) => d.id === id);
export const eventoPorId = (id: string) => timeline.find((e) => e.id === id);

/** Ordem cronológica decrescente — o mais recente primeiro. */
export const timelineDesc = [...timeline].sort((a, b) => b.data.localeCompare(a.data));
export const timelineAsc = [...timeline].sort((a, b) => a.data.localeCompare(b.data));

export const eventosDoProcesso = (id: string) =>
  timelineAsc.filter((e) => e.processos.includes(id));

export const relacoesDoNo = (id: string) =>
  relacoes.filter((r) => r.from === id || r.to === id);

/** Peças de um processo, da mais antiga para a mais recente. */
export const documentosDoProcesso = (id: string) =>
  documentos.filter((d) => d.processo_id === id).sort((a, b) => a.data.localeCompare(b.data));

export const documentosDoAutor = (id: string) =>
  documentos.filter((d) => d.autor_id === id).sort((a, b) => a.data.localeCompare(b.data));

export const eventosDaPessoa = (id: string) => timelineAsc.filter((e) => e.pessoas.includes(id));

export const documentosDesc = [...documentos].sort((a, b) => b.data.localeCompare(a.data));

/** Ordena pessoas pelo protagonismo declarado, depois pelo nome. */
const ORDEM_PRESENCA: Record<Pessoa["nivel_presenca"], number> = {
  central: 0,
  recorrente: 1,
  periferico: 2,
};
export const pessoasPorPresenca = [...pessoas].sort(
  (a, b) =>
    ORDEM_PRESENCA[a.nivel_presenca] - ORDEM_PRESENCA[b.nivel_presenca] ||
    a.nome.localeCompare(b.nome, "pt-BR"),
);

/** Data de corte do painel: a movimentação mais recente registrada. */
export const dataCorte = [...processos]
  .map((p) => p.updated_at)
  .sort()
  .at(-1)!;

export const stats = {
  processos: processos.length,
  pautados: processos.filter((p) => p.status === "pautado").length,
  emAberto: processos.filter((p) => p.status === "em_aberto").length,
  decididos: processos.filter((p) => p.status === "decidido").length,
  marcos: timeline.filter((e) => e.milestone).length,
  envolvidos: pessoas.length,
  documentos: documentos.length,
};

/**
 * Nós do mapa: pessoas e processos têm `pos` opcional. Só entra no grafo quem
 * tem posição definida no dado — o layout é editorial, não gerado.
 */
export type NoMapa = {
  id: string;
  rotulo: string;
  papel: string;
  grupo: Pessoa["grupo"] | "processo";
  pos: { x: number; y: number };
  href?: string;
};

export const nosDoMapa: NoMapa[] = [
  ...pessoas
    .filter((p) => p.pos)
    .map((p) => ({
      id: p.id,
      rotulo: p.nome,
      papel: p.papel,
      grupo: p.grupo,
      pos: p.pos!,
    })),
  ...processos
    .filter((p) => p.pos)
    .map((p) => ({
      id: p.id,
      rotulo: p.numero.replace("/DF", ""),
      papel: p.apelido,
      grupo: "processo" as const,
      pos: p.pos!,
      href: `/processos/${p.id}`,
    })),
];

const idsDoMapa = new Set(nosDoMapa.map((n) => n.id));

/** Arestas desenháveis: ambas as pontas precisam existir no grafo. */
export const arestasDoMapa = relacoes.filter(
  (r) => idsDoMapa.has(r.from) && idsDoMapa.has(r.to),
);
