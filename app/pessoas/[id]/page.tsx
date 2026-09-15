import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Backlinks from "@/components/Backlinks";
import { NivelBadge } from "@/components/NivelBadge";
import { ConfiancaBadge, SourceTag } from "@/components/SourceTag";
import { backlinks } from "@/lib/backlinks";
import { pessoaPorId, pessoas } from "@/lib/data";

export function generateStaticParams() {
  return pessoas.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = pessoaPorId(id);
  if (!p) return { title: "Envolvido não encontrado — OpenMaster" };
  return { title: `${p.nome} — OpenMaster`, description: p.papel };
}

export default async function PessoaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = pessoaPorId(id);
  if (!p) notFound();

  return (
    <article className="space-y-10">
      <header>
        <Link href="/pessoas" className="kicker no-underline hover:text-seal">
          ← Envolvidos
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="headline text-4xl text-ink">{p.nome}</h2>
          <NivelBadge nivel={p.nivel_presenca} />
          <span className="numero border border-rule px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.12em] text-ink-3">
            {p.tipo === "instituicao" ? "Instituição" : "Pessoa"}
          </span>
          <ConfiancaBadge confianca={p.confianca} />
        </div>
        <p className="headline mt-2 text-2xl text-ink-2">{p.papel}</p>
        <div className="rule-thick mt-4" />
      </header>

      <section>
        <h3 className="kicker">Participação no caso</h3>
        <p className="mt-2 max-w-3xl text-lg leading-relaxed text-ink">{p.resumo_participacao}</p>
        {p.descricao && (
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">{p.descricao}</p>
        )}
        <div className="mt-3">
          <SourceTag fonte={p} />
        </div>
        <p className="mt-3 max-w-3xl border-l-2 border-rule pl-3 text-xs leading-relaxed text-ink-3">
          Este resumo é redação editorial apoiada na fonte acima, não citação literal dela. O
          nível de presença — <strong>{p.nivel_presenca}</strong> — mede protagonismo nos fatos,
          não quantas vezes o nome aparece; a contagem de referências, abaixo, é que mede volume.
        </p>
      </section>

      <Backlinks backlinks={backlinks(p.id)} />
    </article>
  );
}
