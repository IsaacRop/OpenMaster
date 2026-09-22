import type { Metadata } from "next";
import Link from "next/link";

import { TipoBadge } from "@/components/Entidade";
import { ConfiancaBadge, SourceTag } from "@/components/SourceTag";
import { dataBR, ref } from "@/lib/backlinks";
import { documentosDesc } from "@/lib/data";
import { TIPO_DOCUMENTO_LABEL } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Documentos — OpenMaster",
  description:
    "Peças processuais identificáveis nas fontes públicas do caso Banco Master / Vorcaro no STF: decisões, liminares e ofícios, com autor, processo e data.",
};

export default function DocumentosPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Base documental</p>
        <h1 className="headline mt-2 text-4xl text-ink">Documentos identificados</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
          Decisões, ordens e ofícios mencionados pelas fontes públicas. Para cada um dos{" "}
          {documentosDesc.length} documentos, mostramos quem assinou, a qual processo pertence e o
          que ele fez.
        </p>
        <p className="plain-note mt-4 max-w-3xl text-sm leading-relaxed">
          No vocabulário jurídico, esses documentos também são chamados de “peças”. Quando o
          arquivo original não está disponível publicamente, mostramos apenas o que a fonte relata.
        </p>
        <div className="rule-thick mt-4" />
      </header>

      <ul className="divide-y divide-rule border-y border-rule">
        {documentosDesc.map((d) => {
          const processo = ref(d.processo_id);
          const autor = ref(d.autor_id);
          return (
            <li key={d.id} className="render-deferred-item grid gap-x-5 gap-y-2 py-4 sm:grid-cols-[6rem_1fr]">
              <div className="numero text-sm text-ink-3">
                <div className="text-lg text-ink">{dataBR(d.data)}</div>
                <div className="kicker mt-0.5">{TIPO_DOCUMENTO_LABEL[d.tipo]}</div>
              </div>

              <div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <TipoBadge tipo="documento" />
                  <Link href={`/documentos/${d.id}`} className="no-underline">
                    <h3 className="numero text-lg text-ink hover:text-accent">
                      {d.numero_referencia}
                    </h3>
                  </Link>
                  <ConfiancaBadge confianca={d.confianca} />
                </div>

                <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-2">{d.resumo}</p>

                <p className="mt-2 text-xs text-ink-3">
                  <Link href={autor.href} className="text-ink-2 underline hover:text-accent">
                    {autor.rotulo}
                  </Link>{" "}
                  ·{" "}
                  <Link href={processo.href} className="numero text-ink-2 underline hover:text-accent">
                    {processo.rotulo}
                  </Link>
                </p>

                <div className="mt-1.5">
                  <SourceTag fonte={d} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
