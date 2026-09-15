import { z } from "zod";

/**
 * Schema das quatro entidades do painel.
 *
 * Regra editorial central, aplicada aqui e não na revisão humana: toda
 * entidade estende `Fonte`, então um dado sem `source_url` não passa na
 * validação — e, como `lib/data.ts` valida em build time, não vai ao ar.
 */

export const Fonte = z.object({
  source_url: z.string().url(),
  source_name: z.string().min(2),
  source_date: z.string().date().optional(),
});
export type Fonte = z.infer<typeof Fonte>;

/**
 * Espelha o grau de certeza da própria fonte. A UI usa isto para hedgear o
 * texto automaticamente, em vez de depender de quem escreveu a descrição.
 *  - confirmado:  a fonte trata como fato estabelecido (decisão publicada, ato oficial)
 *  - apuracao:    a fonte trata como apuração em curso ou evento ainda por ocorrer
 *  - controverso: há disputa pública sobre o próprio fato
 */
export const Confianca = z.enum(["confirmado", "apuracao", "controverso"]);
export type Confianca = z.infer<typeof Confianca>;

export const Sigilo = z.enum(["publico", "parcial", "sigiloso"]);
export type Sigilo = z.infer<typeof Sigilo>;

const Id = z.string().regex(/^[a-z0-9-]+$/, "id deve ser kebab-case");

/** Posição fixa no grafo SVG. Sem física, sem force-directed: é dado editável. */
export const Pos = z.object({ x: z.number(), y: z.number() });
export type Pos = z.infer<typeof Pos>;

// ---------------------------------------------------------------------------
// 1. Processo
// ---------------------------------------------------------------------------

export const Movimentacao = z.object({
  data: z.string().date(),
  descricao: z.string(),
  origem: z.enum(["datajud", "manual"]),
  /** Código CNJ da tabela de movimentos, quando vindo do DataJud. */
  codigo: z.number().int().optional(),
});
export type Movimentacao = z.infer<typeof Movimentacao>;

export const Processo = Fonte.extend({
  /** Convenção: <classe>-<número sem pontuação>. "Pet 16.662/DF" -> "pet-16662". */
  id: Id,
  /** Número de exibição, no formato do tribunal. */
  numero: z.string().min(3),
  /**
   * Número CNJ de 20 dígitos. A numeração de classe do STF ("Pet 16.662") não
   * é número CNJ, então este campo fica vazio na maioria dos casos — e é
   * exatamente isso que decide se o processo entra no sync do DataJud.
   */
  numero_cnj: z.string().regex(/^\d{20}$/).optional(),
  tribunal: z.string().default("STF"),
  apelido: z.string().min(3),
  objeto: z.string().min(10),
  status: z.enum(["pautado", "em_aberto", "decidido"]),
  sigilo: Sigilo.default("publico"),
  confianca: Confianca.default("confirmado"),
  relator_atual: z.string(),
  relator_originario: z.string().optional(),
  historico_relatoria: z
    .array(
      z.object({
        relator: z.string(),
        /** null quando a data de início não consta das fontes públicas. */
        de: z.string().date().nullable(),
        ate: z.string().date().nullable(),
        motivo: z.string().optional(),
        source_url: z.string().url(),
      }),
    )
    .default([]),
  ultima_movimentacao: Movimentacao.nullable().default(null),
  /** Preenchido pelo sync do DataJud; vazio enquanto não houver numero_cnj. */
  movimentacoes: z.array(Movimentacao).default([]),
  proximo_evento: z
    .object({ data: z.string().date(), descricao: z.string() })
    .nullable()
    .default(null),
  /** Estado da sincronização automática. Degradação é explícita, nunca silenciosa. */
  sync: z
    .enum(["ativo", "sem_numero_cnj", "tribunal_indisponivel", "erro"])
    .default("sem_numero_cnj"),
  sync_checked_at: z.string().datetime().nullable().default(null),
  /** Posição no mapa de envolvidos. Ausente = não aparece no grafo. */
  pos: Pos.optional(),
  updated_at: z.string().date(),
});
export type Processo = z.infer<typeof Processo>;

// ---------------------------------------------------------------------------
// 2. Evento de timeline
// ---------------------------------------------------------------------------

export const EventoTimeline = Fonte.extend({
  id: Id,
  data: z.string().date(),
  titulo: z.string().min(3).max(140),
  descricao: z.string().min(10),
  milestone: z.boolean().default(false),
  tipo: z.enum(["decisao", "operacao", "movimentacao", "institucional", "imprensa"]),
  confianca: Confianca,
  processos: z.array(Id).default([]),
  pessoas: z.array(Id).default([]),
  /**
   * Afirmação explícita de quem editou: este evento cita apenas a existência
   * de peça sob sigilo e a controvérsia em torno dela, nunca seu conteúdo.
   * Obrigatório quando o evento referencia um processo `sigiloso` — ver
   * scripts/validate.ts.
   */
  sigilo_ack: z.boolean().default(false),
  /** Libera o evento para scripts/post-twitter.ts. */
  tweet: z.boolean().default(false),
  tweeted_at: z.string().datetime().nullable().default(null),
});
export type EventoTimeline = z.infer<typeof EventoTimeline>;

// ---------------------------------------------------------------------------
// 3. Pessoa / instituição (nó do mapa)
// ---------------------------------------------------------------------------

export const Pessoa = Fonte.extend({
  id: Id,
  nome: z.string().min(2),
  tipo: z.enum(["pessoa", "instituicao"]),
  papel: z.string().min(3),
  grupo: z.enum(["central", "stf", "instituicao", "outros"]),
  descricao: z.string().max(400).default(""),
  confianca: Confianca.default("confirmado"),
  pos: Pos.optional(),
});
export type Pessoa = z.infer<typeof Pessoa>;

// ---------------------------------------------------------------------------
// 4. Relação (aresta do mapa)
// ---------------------------------------------------------------------------

export const Relacao = Fonte.extend({
  id: Id,
  /** Aceita id de Pessoa OU de Processo — validado em scripts/validate.ts. */
  from: Id,
  to: Id,
  rotulo: z.string().min(2),
  peso: z.enum(["forte", "normal"]),
  direcionada: z.boolean().default(true),
  confianca: Confianca.default("confirmado"),
});
export type Relacao = z.infer<typeof Relacao>;

// ---------------------------------------------------------------------------

export const ProcessoArray = z.array(Processo);
export const EventoTimelineArray = z.array(EventoTimeline);
export const PessoaArray = z.array(Pessoa);
export const RelacaoArray = z.array(Relacao);

export const STATUS_LABEL: Record<Processo["status"], string> = {
  pautado: "Pautado",
  em_aberto: "Em aberto",
  decidido: "Decidido",
};

export const SIGILO_LABEL: Record<Sigilo, string> = {
  publico: "Público",
  parcial: "Sigilo parcial",
  sigiloso: "Sob sigilo",
};

/** Prefixo que a UI antepõe ao texto quando a fonte não é conclusiva. */
export const CONFIANCA_LABEL: Record<Confianca, string | null> = {
  confirmado: null,
  apuracao: "Em apuração",
  controverso: "Ponto controverso",
};

export const TIPO_LABEL: Record<EventoTimeline["tipo"], string> = {
  decisao: "Decisão",
  operacao: "Operação",
  movimentacao: "Movimentação",
  institucional: "Institucional",
  imprensa: "Imprensa",
};
