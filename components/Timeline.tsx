import Link from "next/link";

import { processoPorId } from "@/lib/data";
import { TIPO_LABEL, type EventoTimeline } from "@/lib/schema";
import { ConfiancaBadge, SourceTag } from "./SourceTag";

function DataColuna({ iso }: { iso: string }) {
  const [ano, mes, dia] = iso.split("-");
  return (
    <time dateTime={iso} className="numero block shrink-0 text-right leading-none">
      <div className="text-2xl font-medium text-ink">{dia}</div>
      <div className="text-[0.625rem] uppercase tracking-[0.14em] text-ink-3">
        {mes}/{ano}
      </div>
    </time>
  );
}

/**
 * Um evento da linha do tempo, isolado do `<ol>` que o contém.
 *
 * A separação existe porque a lista filtrável (`ListaFiltravel`) monta o `<ol>`
 * no cliente e precisa inserir só os itens que passaram no filtro — o fio
 * vertical é do contêiner, o nó é do item.
 */
export function EventoItem({
  evento: e,
  compacta = false,
}: {
  evento: EventoTimeline;
  compacta?: boolean;
}) {
  return (
    <li id={e.id} className="grid grid-cols-[3.25rem_1px_1fr] gap-x-4 scroll-mt-40">
      <div className="pt-5">
        <DataColuna iso={e.data} />
      </div>

      {/* Fio da linha do tempo, com o nó do marco em vermelho de selo. */}
      <div className="relative bg-rule">
        <span
          className={`absolute left-1/2 top-6 h-2.5 w-2.5 -translate-x-1/2 rotate-45 ${
            e.milestone ? "bg-seal shadow-[0_0_12px_rgba(67,216,230,0.65)]" : "bg-paper border border-ink-3"
          }`}
        />
      </div>

      <div className="py-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="kicker">{TIPO_LABEL[e.tipo]}</span>
          {e.milestone && <span className="selo">Marco</span>}
          <ConfiancaBadge confianca={e.confianca} />
        </div>

        <h3 className="mt-1.5 text-lg font-semibold text-ink sm:text-xl">
          <Link href={`/eventos/${e.id}`} className="text-ink no-underline hover:text-seal">
            {e.titulo}
          </Link>
        </h3>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-2">{e.descricao}</p>

        {!compacta && e.processos.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {e.processos.map((id) => {
              const p = processoPorId(id);
              if (!p) return null;
              return (
                <li key={id}>
                  <Link
                    href={`/processos/${id}`}
                    className="numero border border-rule px-1.5 py-0.5 text-[0.6875rem] text-ink-2 no-underline hover:border-seal hover:text-seal"
                  >
                    {p.numero.replace("/DF", "")}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-2.5">
          <SourceTag fonte={e} />
        </div>
      </div>
    </li>
  );
}

export default function Timeline({
  eventos,
  compacta = false,
}: {
  eventos: EventoTimeline[];
  compacta?: boolean;
}) {
  return (
    <ol className="relative">
      {eventos.map((e) => (
        <EventoItem key={e.id} evento={e} compacta={compacta} />
      ))}
    </ol>
  );
}
