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
        <p className="kicker">Quem é quem</p>
        <h2 className="headline mt-1 text-4xl text-ink">Envolvidos</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
          As {pessoasPorPresenca.length} pessoas e instituições mapeadas, agrupadas por{" "}
          <strong className="font-semibold">nível de presença</strong> — protagonismo nos fatos,
          não frequência de menção. Quem é citado dez vezes de passagem continua periférico; quem
          assina o ato que muda o caso é central ainda que apareça uma vez.
        </p>
        <div className="rule-thick mt-4" />
      </header>

      {ORDEM.map((nivel) => {
        const grupo = pessoasPorPresenca.filter((p) => p.nivel_presenca === nivel);
        if (grupo.length === 0) return null;
        return (
          <section key={nivel}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-1.5">
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="headline text-2xl text-ink">{NIVEL_PRESENCA_LABEL[nivel]}</h3>
                <span className="kicker normal-case tracking-normal">{NOTA[nivel]}</span>
              </div>
              <span className="numero text-sm text-ink-3">{grupo.length}</span>
            </div>

            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {grupo.map((p) => (
                <li key={p.id} className="flex h-full flex-col border border-rule bg-paper-3/60 p-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Link href={`/pessoas/${p.id}`} className="no-underline">
                      <h4 className="headline text-xl text-ink hover:text-seal">{p.nome}</h4>
                    </Link>
                    <NivelBadge nivel={p.nivel_presenca} />
                    <ConfiancaBadge confianca={p.confianca} />
                  </div>
                  <p className="kicker mt-1 normal-case tracking-normal">{p.papel}</p>
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
