import type { Metadata } from "next";
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
        <p className="eyebrow">O caso passo a passo</p>
        <h2 className="headline mt-2 text-4xl text-ink">O que aconteceu</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
          Reunimos {timelineDesc.length} acontecimentos em ordem, do mais recente para o mais
          antigo. Os {marcos} pontos que mudaram o rumo do caso recebem a indicação “marco”.
        </p>
        <p className="plain-note mt-4 max-w-3xl text-sm leading-relaxed">
          <strong className="text-ink">Em apuração</strong> significa que algo ainda está sendo
          verificado ou ainda pode acontecer. Não deve ser lido como resultado ou fato encerrado.
        </p>
      </header>

      <ListaFiltravel
        itens={itens}
        cartoes={cartoes}
        opcoes={OPCOES}
        layout="linha"
        rotuloVazio="Nenhum acontecimento registrado corresponde a esses filtros. A ausência aqui vale apenas para o que já foi mapeado."
      />
    </div>
  );
}
