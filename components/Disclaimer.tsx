import Link from "next/link";

import { dataCorte } from "@/lib/data";

export default function Disclaimer() {
  return (
    <footer className="mt-12 border-t border-rule bg-surface-2">
      <div className="mx-auto grid max-w-[1440px] gap-x-12 gap-y-6 px-4 py-10 sm:px-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <div>
          <p className="wordmark">
            Open<b>Master</b>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-3">
            Acompanhamento independente do caso Banco Master.
          </p>
        </div>

        <div>
          <p className="kicker mb-3">Aviso</p>
          <p className="max-w-[70ch] text-sm leading-relaxed text-ink-2">
            Este é um <strong className="font-semibold text-ink">projeto de acompanhamento independente</strong>,
            sem qualquer vínculo oficial com o Supremo Tribunal Federal, o Conselho Nacional de
            Justiça, a Polícia Federal, o Banco Master ou qualquer outra parte dos processos aqui
            registrados. Não somos fonte oficial e não publicamos conteúdo de peças sob sigilo:
            quando há controvérsia sobre o sigilo de um documento, registramos apenas que a
            controvérsia existe. Toda afirmação sobre pessoa nomeada traz o link da fonte de onde
            foi extraída — confira a fonte antes de citar. Onde a própria fonte trata o fato como
            apuração em curso, o painel o marca como tal.
          </p>
          <p className="numero mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-rule pt-4 text-xs text-ink-3">
            <span>Dados com corte em {dataCorte.split("-").reverse().join("/")}</span>
            <span>Código e dados sob licença MIT</span>
            <Link href="/metodologia" className="underline hover:text-accent">
              Metodologia e correções
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
