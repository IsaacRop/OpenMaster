/**
 * Client da API Pública do DataJud (CNJ).
 *
 * Por que só o DataJud: é uma API oficial, pública e feita para consumo
 * automatizado. O portal do STF está fora de questão — o robots.txt proíbe
 * acesso automatizado e as peças eletrônicas exigem certificado ICP-Brasil.
 *
 * Limite conhecido e tratado explicitamente: o DataJud expõe um índice por
 * tribunal (`api_publica_tjsp`, `api_publica_stj`, `api_publica_trf1`, ...).
 * A cobertura do STF não é garantida — o STF não está sob a gestão de dados
 * do CNJ nos mesmos termos dos demais tribunais. Quando o índice não existe,
 * este client devolve `tribunal_indisponivel` em vez de fingir que a consulta
 * funcionou; o painel mostra esse estado ao leitor.
 *
 * Segundo limite: o DataJud indexa pelo número CNJ de 20 dígitos. A numeração
 * de classe do STF ("Pet 16.662") não é número CNJ, então só processos com
 * `numero_cnj` preenchido entram no sync.
 */

const BASE = "https://api-publica.datajud.cnj.jus.br";

export type DataJudMovimento = {
  codigo: number;
  nome: string;
  dataHora: string;
};

export type DataJudProcesso = {
  numeroProcesso: string;
  tribunal?: string;
  classe?: { codigo: number; nome: string };
  orgaoJulgador?: { codigo: number; nome: string };
  dataAjuizamento?: string;
  dataHoraUltimaAtualizacao?: string;
  movimentos: DataJudMovimento[];
};

export type ConsultaResultado =
  | { status: "ok"; processos: DataJudProcesso[] }
  | { status: "nao_encontrado" }
  | { status: "tribunal_indisponivel"; detalhe: string }
  | { status: "erro"; detalhe: string };

export type DataJudClientOptions = {
  apiKey?: string;
  /** Sufixo do índice: "stf", "stj", "trf1"... */
  alias?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export class DataJudClient {
  private readonly apiKey: string;
  private readonly alias: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(opts: DataJudClientOptions = {}) {
    const apiKey = opts.apiKey ?? process.env.DATAJUD_API_KEY ?? "";
    if (!apiKey) {
      throw new Error(
        "DATAJUD_API_KEY não definida. Veja .env.example e a seção " +
          '"Configurando o DataJud" do README.',
      );
    }
    this.apiKey = apiKey;
    this.alias = opts.alias ?? process.env.DATAJUD_ALIAS ?? "stf";
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 20_000;
  }

  get endpoint(): string {
    return `${BASE}/api_publica_${this.alias}/_search`;
  }

  /** Normaliza "0000000-00.0000.0.00.0000" para os 20 dígitos que o índice usa. */
  static apenasDigitos(numeroCnj: string): string {
    return numeroCnj.replace(/\D/g, "");
  }

  private async post(body: unknown): Promise<Response> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `APIKey ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }
  }

  /**
   * Consulta um processo pelo número CNJ. Nunca lança por resposta HTTP: cada
   * falha vira um estado nomeado, porque o painel precisa exibir a diferença
   * entre "não movimentou" e "não consegui consultar".
   */
  async consultarPorNumero(numeroCnj: string): Promise<ConsultaResultado> {
    const numero = DataJudClient.apenasDigitos(numeroCnj);
    if (numero.length !== 20) {
      return { status: "erro", detalhe: `número CNJ inválido: ${numeroCnj}` };
    }

    let res: Response;
    try {
      res = await this.post({
        size: 10,
        query: { match: { numeroProcesso: numero } },
        sort: [{ "@timestamp": { order: "desc" } }],
      });
    } catch (e) {
      return { status: "erro", detalhe: `falha de rede: ${(e as Error).message}` };
    }

    // 404 no índice = o alias não existe (o caso provável do STF).
    if (res.status === 404 || res.status === 403) {
      return {
        status: "tribunal_indisponivel",
        detalhe: `HTTP ${res.status} em ${this.endpoint} — índice "api_publica_${this.alias}" indisponível ou sem permissão.`,
      };
    }
    if (!res.ok) {
      return { status: "erro", detalhe: `HTTP ${res.status}: ${await res.text()}` };
    }

    let json: any;
    try {
      json = await res.json();
    } catch (e) {
      return { status: "erro", detalhe: `resposta não-JSON: ${(e as Error).message}` };
    }

    const hits = json?.hits?.hits ?? [];
    if (hits.length === 0) return { status: "nao_encontrado" };

    const processos: DataJudProcesso[] = hits.map((h: any) => {
      const s = h._source ?? {};
      return {
        numeroProcesso: s.numeroProcesso ?? numero,
        tribunal: s.tribunal,
        classe: s.classe,
        orgaoJulgador: s.orgaoJulgador,
        dataAjuizamento: s.dataAjuizamento,
        dataHoraUltimaAtualizacao: s.dataHoraUltimaAtualizacao,
        movimentos: Array.isArray(s.movimentos)
          ? s.movimentos.map((m: any) => ({
              codigo: m.codigo,
              nome: m.nome,
              dataHora: m.dataHora,
            }))
          : [],
      };
    });

    return { status: "ok", processos };
  }

  /** Testa se o índice configurado responde, sem depender de um processo específico. */
  async verificarAlias(): Promise<{ disponivel: boolean; detalhe: string }> {
    try {
      const res = await this.post({ size: 0, query: { match_all: {} } });
      if (res.ok) return { disponivel: true, detalhe: `HTTP ${res.status}` };
      return {
        disponivel: false,
        detalhe: `HTTP ${res.status} em ${this.endpoint}`,
      };
    } catch (e) {
      return { disponivel: false, detalhe: `falha de rede: ${(e as Error).message}` };
    }
  }
}

/** Converte movimentos do DataJud para o formato de `Movimentacao` do schema. */
export function paraMovimentacoes(movs: DataJudMovimento[]) {
  return movs
    .filter((m) => typeof m.dataHora === "string" && m.dataHora.length >= 10)
    .map((m) => ({
      data: m.dataHora.slice(0, 10),
      descricao: m.nome,
      origem: "datajud" as const,
      codigo: m.codigo,
    }))
    .sort((a, b) => b.data.localeCompare(a.data));
}
