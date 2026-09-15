import { documentos, pessoas, processos, timeline } from "./data";
import { grau, type TipoEntidade } from "./backlinks";
import { SIGILO_LABEL, STATUS_LABEL, TIPO_DOCUMENTO_LABEL, TIPO_LABEL } from "./schema";

/**
 * Índice de busca, montado em build time.
 *
 * Não há servidor de busca e não deve haver: o painel inteiro é estático, e um
 * endpoint de busca seria a primeira peça de infraestrutura capaz de registrar
 * quem procurou o quê. O índice é um array de objetos gerado aqui, entregue
 * junto com a página /busca e indexado pelo MiniSearch dentro do navegador.
 *
 * São ~45 documentos curtos. Medir antes de otimizar: se um dia o índice pesar,
 * o caminho é cortá-lo por tipo, não subir um serviço.
 */

export type DocBusca = {
  id: string;
  tipo: TipoEntidade;
  titulo: string;
  subtitulo: string;
  /** Todo o resto do texto pesquisável, concatenado. */
  texto: string;
  /** ISO, quando a entidade tem data própria. Ordena empates de relevância. */
  data: string | null;
  href: string;
  /** Grau de conexão, usado como desempate: entidade mais central sobe. */
  grau: number;
};

export const indiceBusca: DocBusca[] = [
  ...processos.map(
    (p): DocBusca => ({
      id: p.id,
      tipo: "processo",
      titulo: p.numero,
      subtitulo: p.apelido,
      texto: [
        p.objeto,
        p.relator_atual,
        p.relator_originario ?? "",
        p.tribunal,
        STATUS_LABEL[p.status],
        SIGILO_LABEL[p.sigilo],
        p.ultima_movimentacao?.descricao ?? "",
        p.proximo_evento?.descricao ?? "",
        ...p.historico_relatoria.map((h) => `${h.relator} ${h.motivo ?? ""}`),
        ...p.movimentacoes.map((m) => m.descricao),
      ]
        .filter(Boolean)
        .join(" · "),
      data: p.updated_at,
      href: `/processos/${p.id}`,
      grau: grau(p.id),
    }),
  ),

  ...timeline.map(
    (e): DocBusca => ({
      id: e.id,
      tipo: "evento",
      titulo: e.titulo,
      subtitulo: `${TIPO_LABEL[e.tipo]} · ${e.data.split("-").reverse().join("/")}`,
      texto: e.descricao,
      data: e.data,
      href: `/eventos/${e.id}`,
      grau: grau(e.id),
    }),
  ),

  ...pessoas.map(
    (p): DocBusca => ({
      id: p.id,
      tipo: "pessoa",
      titulo: p.nome,
      subtitulo: p.papel,
      texto: [p.resumo_participacao, p.descricao].filter(Boolean).join(" · "),
      data: null,
      href: `/pessoas/${p.id}`,
      grau: grau(p.id),
    }),
  ),

  ...documentos.map(
    (d): DocBusca => ({
      id: d.id,
      tipo: "documento",
      titulo: d.numero_referencia,
      subtitulo: `${TIPO_DOCUMENTO_LABEL[d.tipo]} · ${d.data.split("-").reverse().join("/")}`,
      texto: d.resumo,
      data: d.data,
      href: `/documentos/${d.id}`,
      grau: grau(d.id),
    }),
  ),
];

export const totalIndexado = indiceBusca.length;
