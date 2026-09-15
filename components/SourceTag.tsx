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
      className="numero inline-flex min-h-7 items-center gap-1.5 text-xs text-ink-3 underline decoration-rule underline-offset-2 hover:text-seal hover:decoration-seal"
    >
      <span className="text-seal" aria-hidden="true">↗</span>
      Fonte: {fonte.source_name}
      {fonte.source_date ? ` (${fonte.source_date.split("-").reverse().join("/")})` : ""}
    </a>
  );
}

/**
 * Hedging vindo do dado, não da redação: `apuracao` e `controverso` ganham
 * marca visível para que nada em apuração seja lido como fato assentado.
 */
export function ConfiancaBadge({ confianca }: { confianca: Confianca }) {
  const label = CONFIANCA_LABEL[confianca] ?? "Confirmado";
  const estilo = {
    confirmado: "border-ok/60 text-ok",
    apuracao: "border-seal/60 text-seal",
    controverso: "border-disputed/60 text-disputed",
  }[confianca];

  const titulo = {
    confirmado: "Informação sustentada pela fonte indicada.",
    apuracao: "A fonte trata como apuração em curso ou evento ainda por ocorrer.",
    controverso: "Há disputa pública sobre este ponto.",
  }[confianca];

  return (
    <span
      className={`numero inline-flex items-center gap-1.5 border ${estilo} px-1.5 py-px text-[0.625rem] uppercase tracking-[0.12em]`}
      title={titulo}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
