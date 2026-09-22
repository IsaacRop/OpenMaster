import { dataCorte } from "@/lib/data";

export default function Disclaimer() {
  return (
    <footer className="mt-8 border-t border-rule">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
        <div className="rule-thick mb-4" />
        <p className="kicker mb-3">Aviso</p>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-2">
          Este é um <strong className="font-semibold">projeto de acompanhamento independente</strong>,
          sem qualquer vínculo oficial com o Supremo Tribunal Federal, o Conselho Nacional de
          Justiça, a Polícia Federal, o Banco Master ou qualquer outra parte dos processos aqui
          registrados. Não somos fonte oficial e não publicamos conteúdo de peças sob sigilo:
          quando há controvérsia sobre o sigilo de um documento, registramos apenas que a
          controvérsia existe. Toda afirmação sobre pessoa nomeada traz o link da fonte de onde
          foi extraída — confira a fonte antes de citar. Onde a própria fonte trata o fato como
          apuração em curso, o painel o marca como tal.
        </p>
        <p className="mt-4 numero text-xs text-ink-3">
          Dados com corte em {dataCorte.split("-").reverse().join("/")} · Código e dados sob licença
          MIT ·{" "}
          <a href="/metodologia" className="underline hover:text-accent">
            metodologia e correções
          </a>
        </p>
      </div>
    </footer>
  );
}
