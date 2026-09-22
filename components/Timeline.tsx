import Link from "next/link";

import { processoPorId } from "@/lib/data";
import { TIPO_LABEL, type EventoTimeline } from "@/lib/schema";
import { ConfiancaBadge, SourceTag } from "./SourceTag";

function DataColuna({ iso }: { iso: string }) {
  const [ano, mes, dia] = iso.split("-");
  return (
    <time dateTime={iso} className="numero block shrink-0 text-right leading-none">
      <div className="font-display text-2xl font-bold text-ink">{dia}</div>
      <div className="mt-0.5 text-[0.7rem] text-ink-3">
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
  // Na linha do tempo o evento é o nível logo abaixo do título da página; na
  // versão compacta ele mora dentro de uma seção de outra página.
  const Titulo = compacta ? "h3" : "h2";
  return (
    <li id={e.id} className="render-deferred-item grid grid-cols-[3.25rem_1px_1fr] gap-x-4 scroll-mt-40">
      <div className="pt-5">
        <DataColuna iso={e.data} />
      </div>

      {/* Fio da linha do tempo, com o nó do marco em vermelho de selo. */}
      <div className="relative bg-rule">
        <span
          className={`absolute left-1/2 top-6 h-3 w-3 -translate-x-1/2 rounded-full ${
            e.milestone ? "bg-accent ring-4 ring-accent-soft" : "bg-bg border-2 border-rule-strong"
          }`}
        />
      </div>

      <div className="py-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="kicker">{TIPO_LABEL[e.tipo]}</span>
          {e.milestone && <span className="selo">Marco</span>}
          <ConfiancaBadge confianca={e.confianca} />
        </div>

        <Titulo className="mt-1.5 text-lg font-semibold text-ink sm:text-xl">
          <Link href={`/eventos/${e.id}`} className="text-ink no-underline hover:text-accent">
            {e.titulo}
          </Link>
        </Titulo>
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
                    className="numero rounded-full bg-surface-2 px-2.5 py-1 text-[0.72rem] font-medium text-ink-2 no-underline hover:bg-accent-soft hover:text-accent"
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
