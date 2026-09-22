import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Backlinks from "@/components/Backlinks";
import FichaDados from "@/components/FichaDados";
import { NivelBadge } from "@/components/NivelBadge";
import { CONFIANCA_EXPLICACAO, ConfiancaBadge, SourceTag } from "@/components/SourceTag";
import { backlinks, grau } from "@/lib/backlinks";
import { pessoaPorId, pessoas } from "@/lib/data";
import { CONFIANCA_LABEL } from "@/lib/schema";

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
    <article>
      <header>
        <Link href="/pessoas" className="kicker no-underline hover:text-accent">
          ← Voltar para quem é quem
        </Link>
        <p className="kicker mt-4">{p.tipo === "instituicao" ? "Instituição" : "Pessoa"}</p>
        <h1 className="headline mt-1 text-4xl text-ink">{p.nome}</h1>
        <p className="headline mt-2 max-w-3xl text-2xl text-ink-2">{p.papel}</p>
        <div className="rule-thick mt-4" />
        <FichaDados
          itens={[
            ["Presença no caso", <NivelBadge nivel={p.nivel_presenca} />],
            ["Confiança", <ConfiancaBadge confianca={p.confianca} />],
            ["Referências na base", <span className="numero">{grau(p.id)}</span>],
          ]}
        />
      </header>

      <div className="detalhe-grade">
        <div className="detalhe-corpo">
          <section>
            <h2 className="kicker">Como aparece no caso</h2>
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
              não quantas vezes o nome aparece; a contagem na seção de referências é que mede volume.
              {" "}O selo <strong>{CONFIANCA_LABEL[p.confianca] ?? "Confirmado"}</strong> ao lado do
              nome: {CONFIANCA_EXPLICACAO[p.confianca]}
            </p>
          </section>
        </div>

        <aside className="detalhe-lateral" aria-label="Referências">
          <Backlinks backlinks={backlinks(p.id)} lateral />
        </aside>
      </div>
    </article>
  );
}
