import type { Metadata } from "next";
import Link from "next/link";

import { SourceTag } from "@/components/SourceTag";
import { ConfiancaBadge } from "@/components/SourceTag";
import { NivelBadge } from "@/components/NivelBadge";
import { grau } from "@/lib/backlinks";
import { pessoasPorPresenca } from "@/lib/data";
import { NIVEL_PRESENCA_LABEL, type NivelPresenca } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Envolvidos — OpenMaster",
  description:
    "Quem aparece no caso Banco Master / Vorcaro no STF, com o papel de cada um, o nível de presença nos fatos e o resumo da participação.",
};

const ORDEM: NivelPresenca[] = ["central", "recorrente", "periferico"];

const NOTA: Record<NivelPresenca, string> = {
  central: "Pratica ou sofre os atos que movem o caso.",
  recorrente: "Reaparece em vários momentos, sem ser o eixo deles.",
  periferico: "Entra em um ponto específico e não volta.",
};

export default function PessoasPage() {
  return (
    <div className="space-y-10">
      <header>
        <p className="eyebrow">Guia de nomes</p>
        <h1 className="headline mt-2 text-4xl text-ink">Quem é quem</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
          Conheça as {pessoasPorPresenca.length} pessoas e instituições que aparecem na base e
          entenda, em poucas linhas, qual é o papel de cada uma.
        </p>
        <p className="plain-note mt-4 max-w-3xl text-sm leading-relaxed">
          O nível de presença mostra quanto alguém participa dos acontecimentos centrais. Não é
          uma acusação, medida de culpa ou simples contagem de vezes em que o nome aparece.
        </p>
        <div className="rule-thick mt-4" />
      </header>

      {ORDEM.map((nivel) => {
        const grupo = pessoasPorPresenca.filter((p) => p.nivel_presenca === nivel);
        if (grupo.length === 0) return null;
        return (
          <section key={nivel}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="headline text-2xl text-ink">{NIVEL_PRESENCA_LABEL[nivel]}</h2>
                <span className="kicker">{NOTA[nivel]}</span>
              </div>
              <span className="numero text-sm text-ink-3">{grupo.length}</span>
            </div>

            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {grupo.map((p) => (
                <li key={p.id} className="render-deferred-item panel flex h-full flex-col p-4 transition-colors hover:border-accent/60">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Link href={`/pessoas/${p.id}`} className="no-underline">
                      <h3 className="headline text-xl text-ink hover:text-accent">{p.nome}</h3>
                    </Link>
                    <NivelBadge nivel={p.nivel_presenca} />
                    <ConfiancaBadge confianca={p.confianca} />
                  </div>
                  <p className="kicker mt-1">{p.papel}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">
                    {p.resumo_participacao}
                  </p>
                  <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2 pt-3">
                    <SourceTag fonte={p} />
                    <span className="numero text-[0.6875rem] text-ink-3">
                      {grau(p.id)} referências
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
