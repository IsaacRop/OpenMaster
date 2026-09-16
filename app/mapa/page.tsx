import type { Metadata } from "next";

import NetworkMap from "@/components/NetworkMap";
import { nosGrafo } from "@/lib/grafo";

export const metadata: Metadata = {
  title: "Mapa de envolvidos — OpenMaster",
  description:
    "Mapa interativo das pessoas, instituições e processos do caso Banco Master / Vorcaro: arraste, aproxime e clique para navegar. Cada ligação mostra a fonte de onde foi extraída.",
};

export default function MapaPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Panorama</p>
        <h2 className="headline mt-2 text-4xl text-ink">Mapa de envolvidos</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
          {nosGrafo.length} nós — pessoas, instituições e processos — conectados por{" "}
          {"relações extraídas das fontes públicas do caso"}. Arraste o fundo para mover, role para
          aproximar, arraste um nó para puxá-lo; clique abre a página da entidade.
        </p>
        <p className="plain-note mt-4 max-w-3xl text-sm leading-relaxed">
          O tamanho do nó é o número de referências que chegam até ele, não seu grau de culpa. Linhas
          tracejadas em dourado marcam ligações ainda em apuração.
        </p>
      </header>

      <NetworkMap />
    </div>
  );
}
