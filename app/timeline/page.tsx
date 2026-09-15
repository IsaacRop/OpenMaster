import type { Metadata } from "next";

import Timeline from "@/components/Timeline";
import { timelineDesc } from "@/lib/data";

export const metadata: Metadata = {
  title: "Linha do tempo — Painel do Caso Master",
  description:
    "Cronologia do caso Banco Master / Vorcaro, da liquidação extrajudicial às sessões pautadas no STF, com fonte em cada evento.",
};

export default function TimelinePage() {
  const marcos = timelineDesc.filter((e) => e.milestone).length;

  return (
    <div className="space-y-8">
      <header>
        <p className="kicker">Cronologia</p>
        <h2 className="headline mt-1 text-4xl text-ink">Linha do tempo</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
          {timelineDesc.length} eventos registrados, {marcos} deles marcados como marco. Os
          eventos aparecem do mais recente para o mais antigo. Itens marcados{" "}
          <span className="numero text-gold">em apuração</span> são apurações em curso ou atos
          ainda por ocorrer — não resultados.
        </p>
        <div className="rule-thick mt-4" />
      </header>

      <Timeline eventos={timelineDesc} />
    </div>
  );
}
