import Link from "next/link";

import type { RefEntidade, TipoEntidade } from "@/lib/backlinks";

/**
 * Vocabulário visual comum das quatro entidades. Como toda página do painel
 * agora é a página de alguma entidade e todas se citam entre si, o leitor
 * precisa reconhecer *o tipo* do que vai abrir antes de clicar — daí a marca
 * fixa por tipo, igual em qualquer lugar onde um link apareça.
 */

export const MARCA_TIPO: Record<TipoEntidade, { sigla: string; classe: string }> = {
  processo: { sigla: "Processo", classe: "bg-accent-soft text-accent" },
  pessoa: { sigla: "Pessoa", classe: "bg-surface-2 text-ink-2" },
  documento: { sigla: "Documento", classe: "bg-surface-2 text-ink-2" },
  evento: { sigla: "Evento", classe: "bg-surface-2 text-ink-3" },
};

export function TipoBadge({ tipo }: { tipo: TipoEntidade }) {
  const m = MARCA_TIPO[tipo];
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${m.classe} px-2 py-px text-[0.7rem] font-medium`}
    >
      {m.sigla}
    </span>
  );
}

/** Link canônico para qualquer entidade — a unidade de navegação do painel. */
export function EntidadeLink({
  entidade,
  comTipo = true,
  comSublinha = false,
}: {
  entidade: RefEntidade;
  comTipo?: boolean;
  comSublinha?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1.5">
      {comTipo && <TipoBadge tipo={entidade.tipo} />}
      <Link
        href={entidade.href}
        className={`${entidade.tipo === "processo" || entidade.tipo === "documento" ? "numero" : "headline"} text-base font-semibold text-ink no-underline decoration-rule hover:text-accent hover:underline`}
      >
        {entidade.rotulo}
      </Link>
      {comSublinha && <span className="text-xs text-ink-3">{entidade.sublinha}</span>}
    </span>
  );
}
