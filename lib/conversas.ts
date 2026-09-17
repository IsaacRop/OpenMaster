import { z } from "zod";

import { fetchComLimite, HostNaoPermitidoError } from "@/lib/net";

/**
 * Leitura ao vivo das conversas transcritas do celular de Daniel Vorcaro,
 * publicadas no projeto de terceiros MasterWhats (github.com/rafaelbressan/masterzap).
 *
 * Não vendorizamos esses dados: o repositório de origem não tem licença aberta
 * declarada, então buscamos os JSONs em runtime direto do GitHub dele (com
 * cache/revalidate manual) em vez de copiá-los para este repositório. Se o
 * repositório de origem sair do ar, esta seção fica indisponível — é a
 * contrapartida de não duplicar o trabalho de transcrição de outra pessoa.
 *
 * Duas fontes primárias, herdadas do MasterWhats:
 *  - Conversa com Martha Graeff: export de WhatsApp vazado à imprensa (mar/2026).
 *  - Outras 23 conversas: trechos transcritos manualmente da IPJ-A nº 3298613/2026
 *    (relatório da PF sobre o iPhone de Vorcaro, sigilo levantado em set/2026).
 *
 * Endurecimento desta ingestão (não muda o que a UI mostra, só como buscamos):
 *  - `HOST_PERMITIDO` + `garantirHostPermitido` (via lib/net.ts): só
 *    raw.githubusercontent.com, só https, só os caminhos deste repositório —
 *    sem isso um `MASTERZAP_REF` ou id mal validado poderia virar um SSRF.
 *  - `fetchComLimite`: timeout e teto de download reais, não só um
 *    `Content-Length` que o servidor remoto poderia nunca honrar.
 *  - Todo JSON remoto passa por Zod antes de qualquer uso — ver os schemas
 *    abaixo. Estruturas, contagens e tamanhos fora do esperado são rejeitados.
 *  - `MASTERZAP_REF` fixa um commit (não a branch `main`), para que o
 *    conteúdo servido não mude por fora do nosso controle entre duas
 *    requisições. Ver `.env.example` para o padrão documentado.
 *  - Se a busca falhar (rede, timeout, schema), mantemos a última versão que
 *    validou com sucesso nesta instância — a seção degrada para "dado velho",
 *    não para "fora do ar", quando isso é possível.
 */

const HOST_PERMITIDO = "raw.githubusercontent.com";
const REPO = "rafaelbressan/masterzap";

// Commit fixo na branch main do MasterWhats em 2026-09-17, o dia deste
// endurecimento. Trocar via MASTERZAP_REF quando quiser atualizar o conteúdo
// servido — nunca aponte para "main" em produção, que muda sem aviso e sem
// nenhuma das garantias de schema abaixo terem sido checadas contra o novo
// conteúdo antes de ir ao ar.
const REF_PADRAO = "f3303765a225de432b0004179fd256a933784ac5";

const REVALIDATE_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 20_000;
// Folga generosa sobre o maior arquivo de conversa real observado (~17KB).
const MAX_BYTES_CONVERSA = 2 * 1024 * 1024;
// Folga sobre os ~15MB reais de data/messages.json (a conversa da Martha).
const MAX_BYTES_MARTHA = 25 * 1024 * 1024;

export const MARTHA_ID = "martha-graeff";

/** Lista estática dos arquivos em data/conversations/ no repositório de origem — a allowlist de ids. */
const IDS_RELATORIO_PF = [
  "alberto-felix",
  "alexandre-de-moraes",
  "ana-claudia-financeiro",
  "ana-matos-mkt",
  "angelo-silva",
  "ciro-soares",
  "diretor-paulo-sergio-bacen",
  "dv-self",
  "fabiano-zettel",
  "fabio-faria",
  "geraldo-brazil-journal",
  "gustavo-motorista",
  "leo-palhares",
  "leo-serrano",
  "luiz-renno",
  "marcio-conjur",
  "marcos-prime",
  "michael",
  "motorista-brasilia-sidney",
  "romy-banco-master",
  "stella-vorcaro",
  "thatiane-prime",
  "vivi-moraes",
] as const;

export type ConversaMensagem = {
  id: number;
  timestamp: string;
  date: string;
  time: string;
  sender: string;
  content: string;
  type: string;
  is_edited: boolean;
  attachment: string | null;
  urls: string[];
  source_page?: number;
  source_figure?: number;
};

export type ConversaMeta = {
  id: string;
  participants: string[];
  phone?: string | null;
  date_range: { start: string; end: string };
  total_messages: number;
  source: string;
  note?: string;
};

// --- validação do JSON remoto -----------------------------------------------
//
// Só o suficiente para o que este módulo lê. Limites de tamanho existem para
// que um arquivo remoto corrompido ou hostil não vire consumo ilimitado de
// memória/CPU rio abaixo — não para impor forma exata ao repositório de
// terceiros, que tem campos (ex. "index") que não usamos e não precisamos
// validar.

const ConversaMensagemRemota = z.object({
  id: z.number(),
  timestamp: z.string().max(60),
  date: z.string().max(20),
  time: z.string().max(20),
  sender: z.string().max(200),
  content: z.string().max(20_000),
  type: z.string().max(50),
  is_edited: z.boolean(),
  attachment: z.string().max(500).nullable(),
  urls: z.array(z.string().max(2000)).max(50),
  source_page: z.number().optional(),
  source_figure: z.number().optional(),
});

const ConversaArquivoRemota = z.object({
  metadata: z.object({
    participants: z.array(z.string().max(200)).min(1).max(50),
    phone: z.string().max(60).nullable().optional(),
    date_range: z.object({ start: z.string().max(20), end: z.string().max(20) }),
    total_messages: z.number().int().nonnegative(),
    source: z.string().max(500).optional(),
    source_file: z.string().max(300).optional(),
    note: z.string().max(2000).optional(),
  }),
  messages: z.array(ConversaMensagemRemota).max(200_000),
});
type ConversaArquivoRemota = z.infer<typeof ConversaArquivoRemota>;

// --- ref + caminho, com allowlist -------------------------------------------

function ref(): string {
  const valor = process.env.MASTERZAP_REF?.trim();
  if (!valor) return REF_PADRAO;
  if (!/^[0-9a-f]{40}$/i.test(valor) && valor !== "main") {
    console.warn(
      `[conversas] MASTERZAP_REF="${valor}" não é um commit SHA (40 hex) nem "main" — usando o padrão fixo.`,
    );
    return REF_PADRAO;
  }
  if (valor === "main") {
    console.warn(
      '[conversas] MASTERZAP_REF="main" aponta para uma branch que muda sem aviso — prefira um commit fixo.',
    );
  }
  return valor;
}

/** Caminho remoto para um id de conversa, restrito à mesma allowlist que os dados já usam. */
function caminhoArquivo(id: string): string {
  return id === MARTHA_ID ? "data/messages.json" : `data/conversations/${id}.json`;
}

function urlPara(caminho: string): string {
  // Redundante com `caminhoArquivo` só produzir esses dois formatos, mas é a
  // última linha de defesa contra um id fora da allowlist chegar aqui algum
  // dia por um caminho de código novo.
  if (!/^data\/(messages\.json|conversations\/[a-z0-9-]+\.json)$/.test(caminho)) {
    throw new Error(`caminho remoto fora do allowlist: ${caminho}`);
  }
  return `https://${HOST_PERMITIDO}/${REPO}/${ref()}/${caminho}`;
}

// --- cache com TTL real + última versão válida ------------------------------

type Fresco<T> = { data: T; expiraEm: number };

const cacheFresco = new Map<string, Fresco<unknown>>();
const ultimaValida = new Map<string, unknown>();

async function buscarValidado<T>(caminho: string, schema: z.ZodType<T>, maxBytes: number): Promise<T> {
  const url = urlPara(caminho);

  const fresco = cacheFresco.get(url) as Fresco<T> | undefined;
  if (fresco && Date.now() < fresco.expiraEm) return fresco.data;

  try {
    const texto = await fetchComLimite(url, {
      timeoutMs: TIMEOUT_MS,
      maxBytes,
      hostsPermitidos: [HOST_PERMITIDO],
      init: { cache: "no-store" },
    });
    const json: unknown = JSON.parse(texto);
    const validado = schema.parse(json);

    cacheFresco.set(url, { data: validado, expiraEm: Date.now() + REVALIDATE_MS });
    ultimaValida.set(url, validado);
    return validado;
  } catch (e) {
    const mensagem = e instanceof HostNaoPermitidoError ? e.message : (e as Error).message;
    const anterior = ultimaValida.get(url) as T | undefined;
    if (anterior !== undefined) {
      console.warn(`[conversas] falha ao atualizar ${caminho} (${mensagem}) — mantendo última versão válida.`);
      return anterior;
    }
    console.error(`[conversas] falha ao buscar ${caminho} e nenhuma versão anterior em cache: ${mensagem}`);
    throw e instanceof Error ? e : new Error(mensagem);
  }
}

function fonteLegivel(id: string, source?: string): string {
  if (id === MARTHA_ID) {
    return "Conversa vazada à imprensa (mar/2026), via MasterWhats";
  }
  return source ?? "IPJ-A nº 3298613/2026 (relatório PF), via MasterWhats";
}

function metaDoArquivo(id: string, arq: ConversaArquivoRemota): ConversaMeta {
  return {
    id,
    participants: arq.metadata.participants,
    phone: arq.metadata.phone ?? null,
    date_range: arq.metadata.date_range,
    total_messages: arq.metadata.total_messages,
    source: fonteLegivel(id, arq.metadata.source),
    note: arq.metadata.note,
  };
}

// Metadados fixos (fato histórico, não muda) para não baixar os ~15-20MB de
// data/messages.json só para popular a lista de conversas.
const MARTHA_META: ConversaMeta = {
  id: MARTHA_ID,
  participants: ["DV", "Martha Graeff"],
  phone: null,
  date_range: { start: "2024-02-10", end: "2025-08-13" },
  total_messages: 65772,
  source: fonteLegivel(MARTHA_ID),
};

export async function listarConversas(): Promise<ConversaMeta[]> {
  const resultados = await Promise.allSettled(
    IDS_RELATORIO_PF.map(async (id) => {
      const arq = await buscarValidado(caminhoArquivo(id), ConversaArquivoRemota, MAX_BYTES_CONVERSA);
      return metaDoArquivo(id, arq);
    }),
  );

  const conversasPF = resultados
    .filter((r): r is PromiseFulfilledResult<ConversaMeta> => r.status === "fulfilled")
    .map((r) => r.value);

  return [MARTHA_META, ...conversasPF].sort((a, b) => b.date_range.start.localeCompare(a.date_range.start));
}

export async function obterConversa(
  id: string,
): Promise<{ meta: ConversaMeta; messages: ConversaMensagem[] } | null> {
  if (id !== MARTHA_ID && !IDS_RELATORIO_PF.includes(id as (typeof IDS_RELATORIO_PF)[number])) {
    return null;
  }
  try {
    const maxBytes = id === MARTHA_ID ? MAX_BYTES_MARTHA : MAX_BYTES_CONVERSA;
    const arq = await buscarValidado(caminhoArquivo(id), ConversaArquivoRemota, maxBytes);
    return { meta: metaDoArquivo(id, arq), messages: arq.messages };
  } catch {
    return null;
  }
}

/** Datas com contagem de mensagens, para navegação em conversas longas. */
export function agruparPorData(messages: ConversaMensagem[]) {
  const porData = new Map<string, number>();
  for (const m of messages) {
    porData.set(m.date, (porData.get(m.date) ?? 0) + 1);
  }
  return [...porData.entries()].map(([date, count]) => ({ date, count }));
}
