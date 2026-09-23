import { CONFIANCA_LABEL, type Confianca, type Fonte } from "@/lib/schema";

import Icone from "./Icone";

/**
 * Todo dado exibido passa por aqui. Se um componente renderiza uma afirmação
 * sem um SourceTag ao lado, é bug editorial, não escolha de layout.
 *
 * `papel`: dentro de um documento (o dossiê), a tinta é grafite, não o cinza
 * claro da mesa.
 */
export function SourceTag({ fonte, papel = false }: { fonte: Fonte; papel?: boolean }) {
  return (
    <a
      href={fonte.source_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir fonte: ${fonte.source_name}`}
      className={`numero inline-flex min-h-7 items-center gap-1.5 text-xs no-underline hover:underline ${
        papel ? "text-grafite-2 hover:text-azul-tinta" : "text-ink-3 hover:text-accent"
      }`}
    >
      <Icone nome="externo" tamanho={13} className={papel ? "text-azul-tinta" : "text-accent"} />
      Fonte: {fonte.source_name}
      {fonte.source_date ? ` (${fonte.source_date.split("-").reverse().join("/")})` : ""}
    </a>
  );
}

/**
 * Hedging vindo do dado, não da redação: `apuracao` e `controverso` ganham
 * marca visível para que nada em apuração seja lido como fato assentado.
 *
 * Exportado (não só usado via `title`) porque `title` é tooltip de hover e
 * não existe em toque — em qualquer tela pensada para celular, o texto
 * precisa também aparecer escrito, não só ao passar o mouse.
 */
export const CONFIANCA_EXPLICACAO: Record<Confianca, string> = {
  confirmado: "Informação sustentada pela fonte indicada.",
  apuracao: "A fonte trata como apuração em curso ou evento ainda por ocorrer.",
  controverso: "Há disputa pública sobre este ponto.",
};

/*
 * Os status do guia: confirmado no azul de "decidido"; em apuração com o
 * contorno tracejado do lápis (anotação, não fato); controverso no vermelho
 * claro, só em contorno — o vermelho cheio é reservado ao "novo".
 */
const ESTILO: Record<Confianca, string> = {
  confirmado: "border-[rgb(120_160_230_/_0.45)] bg-[rgb(120_160_230_/_0.1)] text-confirmado",
  apuracao: "border-dashed border-[rgb(228_222_210_/_0.45)] text-apuracao",
  controverso: "border-[rgb(227_106_85_/_0.55)] bg-[rgb(227_106_85_/_0.08)] text-controverso",
};

export function ConfiancaBadge({ confianca }: { confianca: Confianca }) {
  const label = CONFIANCA_LABEL[confianca] ?? "Confirmado";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[0.72rem] font-bold ${ESTILO[confianca]}`}
      title={CONFIANCA_EXPLICACAO[confianca]}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
