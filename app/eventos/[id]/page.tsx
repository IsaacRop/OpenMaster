import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Backlinks from "@/components/Backlinks";
import FichaDados from "@/components/FichaDados";
import { EntidadeLink } from "@/components/Entidade";
import { ConfiancaBadge, SourceTag } from "@/components/SourceTag";
import { backlinks, dataBR, ref } from "@/lib/backlinks";
import { eventoPorId, timeline, timelineAsc } from "@/lib/data";
import { TIPO_LABEL } from "@/lib/schema";

export function generateStaticParams() {
  return timeline.map((e) => ({ id: e.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const e = eventoPorId(id);
  if (!e) return { title: "Evento não encontrado — OpenMaster" };
  return { title: `${e.titulo} — OpenMaster`, description: e.descricao.slice(0, 160) };
}

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = eventoPorId(id);
  if (!e) notFound();

  const i = timelineAsc.findIndex((x) => x.id === e.id);
  const anterior = i > 0 ? timelineAsc[i - 1] : null;
  const seguinte = i < timelineAsc.length - 1 ? timelineAsc[i + 1] : null;

  return (
    <article>
      <header>
        <Link href="/timeline" className="kicker no-underline hover:text-accent">
          ← Voltar para o que aconteceu
        </Link>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="kicker text-accent">{TIPO_LABEL[e.tipo]}</span>
          {e.milestone && <span className="selo">Marco</span>}
        </p>
        <h1 className="headline mt-1 max-w-4xl text-4xl text-ink">{e.titulo}</h1>
        <div className="rule-thick mt-4" />
        <FichaDados
          itens={[
            ["Data", <time dateTime={e.data} className="numero">{dataBR(e.data)}</time>],
            ["Tipo", TIPO_LABEL[e.tipo]],
            ["Confiança", <ConfiancaBadge confianca={e.confianca} />],
          ]}
        />
      </header>

      <div className="detalhe-grade">
        <div className="detalhe-corpo">
          <section>
            <p className="max-w-3xl text-lg leading-relaxed text-ink">{e.descricao}</p>
            <div className="mt-3">
              <SourceTag fonte={e} />
            </div>
            {e.sigilo_ack && (
              <p className="mt-4 max-w-3xl border-l-2 border-accent bg-surface-2/60 px-4 py-3 text-sm leading-relaxed text-ink-2">
                Este evento toca processo sob sigilo. O registro afirma que a peça existe e que há
                controvérsia pública sobre ela — nunca seu conteúdo.
              </p>
            )}
          </section>

          {(e.processos.length > 0 || e.pessoas.length > 0) && (
            <section className="grid gap-8 sm:grid-cols-2">
              {e.processos.length > 0 && (
                <div>
                  <h2 className="kicker border-b border-rule pb-1">Processos citados</h2>
                  <ul className="mt-2 space-y-2">
                    {e.processos.map((pid) => (
                      <li key={pid}>
                        <EntidadeLink entidade={ref(pid)} comTipo={false} comSublinha />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {e.pessoas.length > 0 && (
                <div>
                  <h2 className="kicker border-b border-rule pb-1">Envolvidos citados</h2>
                  <ul className="mt-2 space-y-2">
                    {e.pessoas.map((pid) => (
                      <li key={pid}>
                        <EntidadeLink entidade={ref(pid)} comTipo={false} comSublinha />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="detalhe-lateral" aria-label="Referências">
          <Backlinks backlinks={backlinks(e.id)} lateral />
        </aside>
      </div>

      <nav aria-label="Evento anterior e seguinte" className="mt-10 flex flex-wrap justify-between gap-4 border-t border-rule pt-4">
        {anterior ? (
          <Link href={`/eventos/${anterior.id}`} className="max-w-[45%] no-underline group">
            <span className="kicker group-hover:text-accent">← {dataBR(anterior.data)}</span>
            <p className="headline text-sm text-ink-2 group-hover:text-accent">{anterior.titulo}</p>
          </Link>
        ) : (
          <span />
        )}
        {seguinte && (
          <Link href={`/eventos/${seguinte.id}`} className="max-w-[45%] text-right no-underline group">
            <span className="kicker group-hover:text-accent">{dataBR(seguinte.data)} →</span>
            <p className="headline text-sm text-ink-2 group-hover:text-accent">{seguinte.titulo}</p>
          </Link>
        )}
      </nav>
    </article>
  );
}
