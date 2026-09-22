import { resumoBacklinks, type Backlinks as TBacklinks, type Backlink } from "@/lib/backlinks";
import { EntidadeLink } from "./Entidade";
import { SourceTag } from "./SourceTag";

/**
 * O que aponta para esta entidade. Nada aqui é curado: tudo sai de
 * `lib/backlinks.ts`, que lê `relacoes.json`, `processo_id` e `autor_id`.
 *
 * Isso faz do painel um objeto navegável nos dois sentidos — a página de uma
 * peça mostra o processo em que caiu, e a do processo mostra a peça de volta,
 * sem que ninguém precise lembrar de escrever a segunda metade.
 */

function Grupo({ titulo, itens }: { titulo: string; itens: Backlink[] }) {
  if (itens.length === 0) return null;
  return (
    <div>
      <h3 className="kicker flex items-baseline justify-between border-b border-rule pb-1">
        <span>{titulo}</span>
        <span className="numero text-ink-3">{String(itens.length).padStart(2, "0")}</span>
      </h3>
      <ul className="divide-y divide-rule">
        {itens.map((b, i) => (
          <li key={`${b.origem.id}-${i}`} className="py-2.5">
            <EntidadeLink entidade={b.origem} />
            <p className="mt-0.5 text-xs text-ink-2">
              <span className="text-ink-3">{b.via}</span>
              {b.origem.sublinha && <> — {b.origem.sublinha}</>}
            </p>
            <div className="mt-1">
              <SourceTag fonte={b.fonte} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * `lateral`: a lista ocupa a coluna estreita das páginas de entidade no
 * desktop, então os grupos empilham em vez de dividir três colunas.
 */
export default function Backlinks({ backlinks, lateral = false }: { backlinks: TBacklinks; lateral?: boolean }) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-1.5">
        <div>
          <p className="kicker">Referências</p>
          <h2 className="headline text-2xl text-ink">O que aponta para aqui</h2>
        </div>
        <span className="numero text-sm text-ink-3">
          {backlinks.total} {backlinks.total === 1 ? "referência" : "referências"}
        </span>
      </div>

      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">
        {resumoBacklinks(backlinks)}{" "}
        <span className="text-ink-3">
          Esta lista é calculada a partir dos dados a cada build — não é um campo preenchido à
          mão, e por isso não envelhece separada do resto.
        </span>
      </p>

      {backlinks.total > 0 && (
        <div className={`mt-5 grid gap-x-8 gap-y-6 ${lateral ? "md:grid-cols-2 lg:grid-cols-1" : "md:grid-cols-2 lg:grid-cols-3"}`}>
          <Grupo titulo="Eventos" itens={backlinks.eventos} />
          <Grupo titulo="Documentos" itens={backlinks.documentos} />
          <Grupo titulo="Relações diretas" itens={backlinks.relacoes} />
        </div>
      )}
    </section>
  );
}
