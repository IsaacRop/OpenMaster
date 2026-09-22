import Icone from "./Icone";
import { CONFIANCA_LABEL, type Confianca, type Fonte } from "@/lib/schema";

/**
 * Todo dado exibido passa por aqui. Se um componente renderiza uma afirmação
 * sem um SourceTag ao lado, é bug editorial, não escolha de layout.
 */
export function SourceTag({ fonte }: { fonte: Fonte }) {
  return (
    <a
      href={fonte.source_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir fonte: ${fonte.source_name}`}
      className="numero inline-flex min-h-7 items-center gap-1.5 text-xs text-ink-3 no-underline hover:text-accent hover:underline"
    >
      <Icone nome="externo" tamanho={13} className="text-accent" />
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

export function ConfiancaBadge({ confianca }: { confianca: Confianca }) {
  const label = CONFIANCA_LABEL[confianca] ?? "Confirmado";
  const estilo = {
    confirmado: "bg-confirmado/10 text-confirmado",
    apuracao: "bg-apuracao/10 text-apuracao",
    controverso: "bg-controverso/10 text-controverso",
  }[confianca];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${estilo} px-2 py-0.5 text-[0.72rem] font-medium`}
      title={CONFIANCA_EXPLICACAO[confianca]}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
