/**
 * Leitura ao vivo das conversas transcritas do celular de Daniel Vorcaro,
 * publicadas no projeto de terceiros MasterWhats (github.com/rafaelbressan/masterzap).
 *
 * Não vendorizamos esses dados: o repositório de origem não tem licença aberta
 * declarada, então buscamos os JSONs em runtime direto do GitHub dele (com
 * cache/revalidate do Next) em vez de copiá-los para este repositório. Se o
 * repositório de origem sair do ar, esta seção fica indisponível — é a
 * contrapartida de não duplicar o trabalho de transcrição de outra pessoa.
 *
 * Duas fontes primárias, herdadas do MasterWhats:
 *  - Conversa com Martha Graeff: export de WhatsApp vazado à imprensa (mar/2026).
 *  - Outras 23 conversas: trechos transcritos manualmente da IPJ-A nº 3298613/2026
 *    (relatório da PF sobre o iPhone de Vorcaro, sigilo levantado em set/2026).
 */

const REPO_RAW = "https://raw.githubusercontent.com/rafaelbressan/masterzap/main";
const REVALIDATE_SECONDS = 3600;

export const MARTHA_ID = "martha-graeff";

/** Lista estática dos arquivos em data/conversations/ no repositório de origem. */
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

type ConversaArquivo = {
  metadata: {
    participants: string[];
    phone?: string | null;
    date_range: { start: string; end: string };
    total_messages: number;
    source?: string;
    source_file?: string;
    note?: string;
  };
  messages: ConversaMensagem[];
};

// O data cache do Next recusa itens acima de 2MB — e o arquivo da Martha Graeff
// tem ~20MB. Para ele, mantemos um cache manual em memória do processo em vez
// do `next: { revalidate }`, senão toda requisição refaz o fetch inteiro.
const cacheManual = new Map<string, { data: unknown; expira: number }>();

async function buscarJSON<T>(caminho: string, opts: { cacheManual?: boolean } = {}): Promise<T> {
  const url = `${REPO_RAW}/${caminho}`;

  if (opts.cacheManual) {
    const cached = cacheManual.get(url);
    if (cached && cached.expira > Date.now()) return cached.data as T;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao buscar ${caminho} do masterzap: HTTP ${res.status}`);
    const data = (await res.json()) as T;
    cacheManual.set(url, { data, expira: Date.now() + REVALIDATE_SECONDS * 1000 });
    return data;
  }

  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) {
    throw new Error(`Falha ao buscar ${caminho} do masterzap: HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function caminhoArquivo(id: string): string {
  return id === MARTHA_ID ? "data/messages.json" : `data/conversations/${id}.json`;
}

function fonteLegivel(id: string, source?: string): string {
  if (id === MARTHA_ID) {
    return "Conversa vazada à imprensa (mar/2026), via MasterWhats";
  }
  return source ?? "IPJ-A nº 3298613/2026 (relatório PF), via MasterWhats";
}

// Metadados fixos (fato histórico, não muda) para não baixar os ~20MB de
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
      const arq = await buscarJSON<ConversaArquivo>(caminhoArquivo(id));
      const meta: ConversaMeta = {
        id,
        participants: arq.metadata.participants,
        phone: arq.metadata.phone ?? null,
        date_range: arq.metadata.date_range,
        total_messages: arq.metadata.total_messages,
        source: fonteLegivel(id, arq.metadata.source),
        note: arq.metadata.note,
      };
      return meta;
    })
  );

  const conversasPF = resultados
    .filter((r): r is PromiseFulfilledResult<ConversaMeta> => r.status === "fulfilled")
    .map((r) => r.value);

  return [MARTHA_META, ...conversasPF].sort((a, b) =>
    b.date_range.start.localeCompare(a.date_range.start)
  );
}

export async function obterConversa(
  id: string
): Promise<{ meta: ConversaMeta; messages: ConversaMensagem[] } | null> {
  if (id !== MARTHA_ID && !IDS_RELATORIO_PF.includes(id as (typeof IDS_RELATORIO_PF)[number])) {
    return null;
  }
  try {
    const arq = await buscarJSON<ConversaArquivo>(caminhoArquivo(id), {
      cacheManual: id === MARTHA_ID,
    });
    return {
      meta: {
        id,
        participants: arq.metadata.participants,
        phone: arq.metadata.phone ?? null,
        date_range: arq.metadata.date_range,
        total_messages: arq.metadata.total_messages,
        source: fonteLegivel(id, arq.metadata.source),
        note: arq.metadata.note,
      },
      messages: arq.messages,
    };
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
