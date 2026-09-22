import Link from "next/link";

import { dataBR } from "@/lib/backlinks";
import { SIGILO_LABEL, STATUS_LABEL, type Processo } from "@/lib/schema";
import { SourceTag } from "./SourceTag";

const STATUS_ESTILO: Record<Processo["status"], string> = {
  pautado: "bg-accent text-on-accent",
  em_aberto: "border border-ink-2 text-ink-2",
  decidido: "border border-rule text-ink-3",
};

const SYNC_NOTA: Record<Processo["sync"], string | null> = {
  ativo: null,
  sem_numero_cnj: "sem sincronização automática (sem número CNJ)",
  tribunal_indisponivel: "sincronização indisponível (índice do tribunal fora do DataJud)",
  erro: "falha na última sincronização",
};

export function DataBR({ iso }: { iso: string }) {
  return <span className="numero">{dataBR(iso)}</span>;
}

export default function ProcessCard({ processo: p }: { processo: Processo }) {
  const syncNota = SYNC_NOTA[p.sync];

  return (
    <article className="panel group flex h-full flex-col p-4 transition-colors hover:border-accent/60">
      <header className="flex items-start justify-between gap-3">
        <Link href={`/processos/${p.id}`} className="-my-2 inline-flex min-h-11 items-center no-underline">
          <h2 className="numero text-lg font-medium text-ink hover:text-accent">{p.numero}</h2>
        </Link>
        <span
          className={`numero shrink-0 px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.12em] ${STATUS_ESTILO[p.status]}`}
        >
          {STATUS_LABEL[p.status]}
        </span>
      </header>

      <p className="mt-1 text-base font-semibold text-ink-2">{p.apelido}</p>

      <p className="mt-3 text-sm leading-relaxed text-ink-2 line-clamp-3">{p.objeto}</p>

      <dl className="mt-4 space-y-1 text-xs text-ink-2">
        <div className="flex gap-2">
          <dt className="kicker shrink-0 w-20">Relator</dt>
          <dd>{p.relator_atual}</dd>
        </div>
        {p.ultima_movimentacao && (
          <div className="flex gap-2">
            <dt className="kicker shrink-0 w-20">Última mov.</dt>
            <dd>
              <DataBR iso={p.ultima_movimentacao.data} />
            </dd>
          </div>
        )}
        {p.proximo_evento && (
          <div className="flex gap-2">
            <dt className="kicker shrink-0 w-20 text-accent">A seguir</dt>
            <dd className="text-accent">
              <DataBR iso={p.proximo_evento.data} /> — {p.proximo_evento.descricao}
            </dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="kicker shrink-0 w-20">Sigilo</dt>
          <dd>{SIGILO_LABEL[p.sigilo]}</dd>
        </div>
      </dl>

      <div className="mt-auto pt-4">
        {syncNota && <p className="kicker mb-1 normal-case tracking-normal">{syncNota}</p>}
        <SourceTag fonte={p} />
      </div>
    </article>
  );
}
