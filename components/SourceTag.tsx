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
      className="numero text-[0.6875rem] text-ink-3 underline decoration-rule underline-offset-2 hover:text-seal hover:decoration-seal"
    >
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
  const label = CONFIANCA_LABEL[confianca];
  if (!label) return null;

  const estilo =
    confianca === "apuracao"
      ? "border-gold text-gold"
      : "border-seal text-seal";

  return (
    <span
      className={`numero inline-block border ${estilo} px-1.5 py-px text-[0.625rem] uppercase tracking-[0.12em]`}
      title={
        confianca === "apuracao"
          ? "A fonte trata como apuração em curso ou evento ainda por ocorrer."
          : "Há disputa pública sobre este ponto."
      }
    >
      {label}
    </span>
  );
}
