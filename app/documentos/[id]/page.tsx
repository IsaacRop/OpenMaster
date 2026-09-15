import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Backlinks from "@/components/Backlinks";
import { EntidadeLink } from "@/components/Entidade";
import { ConfiancaBadge, SourceTag } from "@/components/SourceTag";
import { backlinks, dataBR, ref } from "@/lib/backlinks";
import { documentoPorId, documentos, documentosDoProcesso, processoPorId } from "@/lib/data";
import { SIGILO_LABEL, TIPO_DOCUMENTO_LABEL } from "@/lib/schema";

export function generateStaticParams() {
  return documentos.map((d) => ({ id: d.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const d = documentoPorId(id);
  if (!d) return { title: "Documento não encontrado — OpenMaster" };
  return {
    title: `${d.numero_referencia} — OpenMaster`,
    description: d.resumo.slice(0, 160),
  };
}

export default async function DocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = documentoPorId(id);
  if (!d) notFound();

  const processo = processoPorId(d.processo_id)!;
  const irmas = documentosDoProcesso(d.processo_id).filter((x) => x.id !== d.id);

  return (
    <article className="space-y-10">
      <header>
        <Link href="/documentos" className="kicker no-underline hover:text-seal">
          ← Documentos
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="numero border border-gold px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.12em] text-gold">
            {TIPO_DOCUMENTO_LABEL[d.tipo]}
          </span>
          <span className="numero text-lg text-ink-3">{dataBR(d.data)}</span>
          <ConfiancaBadge confianca={d.confianca} />
        </div>
        <h2 className="numero mt-2 text-3xl font-medium text-ink">{d.numero_referencia}</h2>
        <div className="rule-thick mt-4" />
      </header>

      <section>
        <h3 className="kicker">O que a peça faz</h3>
        <p className="mt-2 max-w-3xl text-lg leading-relaxed text-ink">{d.resumo}</p>
        <div className="mt-3">
          <SourceTag fonte={d} />
        </div>
      </section>

      <section className="grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="kicker">Autoria</h3>
          <div className="mt-2">
            <EntidadeLink entidade={ref(d.autor_id)} comTipo={false} comSublinha />
          </div>
        </div>

        <div>
          <h3 className="kicker">Processo</h3>
          <div className="mt-2">
            <EntidadeLink entidade={ref(d.processo_id)} comTipo={false} />
          </div>
          <p className="mt-1 text-xs text-ink-3">
            {processo.apelido} · {SIGILO_LABEL[processo.sigilo]}
          </p>
        </div>
      </section>

      <section>
        <h3 className="kicker">Inteiro teor</h3>
        {d.pdf_url ? (
          <a
            href={d.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="numero mt-2 inline-block border border-ink px-3 py-1.5 text-sm text-ink no-underline hover:border-seal hover:text-seal"
          >
            Abrir documento público ↗
          </a>
        ) : (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">
            Não há link público registrado para esta peça. O painel descreve o que fontes
            jornalísticas noticiaram sobre ela — o que decidiu, de quem partiu, em que processo
            caiu —, e deixa o campo vazio em vez de apontar para um documento que não pode
            conferir. Campo vazio é informação; link quebrado é ruído.
          </p>
        )}
      </section>

      {irmas.length > 0 && (
        <section>
          <h3 className="kicker border-b border-ink pb-1.5">
            Outras peças no mesmo processo · {irmas.length}
          </h3>
          <ul className="mt-3 divide-y divide-rule">
            {irmas.map((o) => (
              <li key={o.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
                <span className="numero w-20 shrink-0 text-sm text-ink-3">{dataBR(o.data)}</span>
                <Link
                  href={`/documentos/${o.id}`}
                  className="numero text-sm text-ink no-underline hover:text-seal"
                >
                  {o.numero_referencia}
                </Link>
                <span className="text-xs text-ink-3">{TIPO_DOCUMENTO_LABEL[o.tipo]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Backlinks backlinks={backlinks(d.id)} />
    </article>
  );
}
