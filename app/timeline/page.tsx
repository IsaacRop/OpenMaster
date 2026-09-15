import type { Metadata } from "next";
import { Suspense } from "react";

import ListaFiltravel from "@/components/ListaFiltravel";
import { EventoItem } from "@/components/Timeline";
import { timelineDesc } from "@/lib/data";
import { OPCOES, metaTimeline } from "@/lib/filtros";

export const metadata: Metadata = {
  title: "Linha do tempo — OpenMaster",
  description:
    "Cronologia do caso Banco Master / Vorcaro, da liquidação extrajudicial às sessões pautadas no STF, com fonte em cada evento. Filtrável por envolvido, tipo, confiança, sigilo e data.",
};

export default function TimelinePage() {
  const marcos = timelineDesc.filter((e) => e.milestone).length;

  const itens = timelineDesc.map((e) => metaTimeline.find((m) => m.id === e.id)!);
  const cartoes = Object.fromEntries(
    timelineDesc.map((e) => [e.id, <EventoItem key={e.id} evento={e} />]),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Cronologia</p>
        <h2 className="headline mt-1 text-4xl text-ink">Linha do tempo</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
          {timelineDesc.length} eventos registrados, {marcos} deles marcados como marco. Os
          eventos aparecem do mais recente para o mais antigo. Itens marcados{" "}
          <span className="numero text-gold">em apuração</span> são apurações em curso ou atos
          ainda por ocorrer — não resultados. O sigilo de um evento é o do processo mais restrito
          que ele toca.
        </p>
      </header>

      <Suspense fallback={<div className="h-24" />}>
        <ListaFiltravel
          itens={itens}
          cartoes={cartoes}
          opcoes={OPCOES}
          layout="linha"
          rotuloVazio="Nenhum evento registrado satisfaz esse recorte. A ausência aqui é ausência no que foi mapeado, não no que aconteceu."
        />
      </Suspense>
    </div>
  );
}
