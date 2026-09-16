import type { Metadata } from "next";
import { Suspense } from "react";

import NetworkMap from "@/components/NetworkMap";
import { nosGrafo } from "@/lib/grafo";

export const metadata: Metadata = {
  title: "Mapa de envolvidos — OpenMaster",
  description:
    "Mapa interativo das pessoas, instituições e processos do caso Banco Master / Vorcaro: arraste, aproxime e clique para navegar. Cada ligação mostra a fonte de onde foi extraída.",
};

export default function MapaPage() {
  return (
    <div>
      {/*
        Sem cabeçalho visível: o palco abre colado na barra e ocupa a tela, e
        qualquer linha aqui o empurraria para baixo da dobra. O título continua
        existindo para leitor de tela e para a hierarquia do documento — sumir
        da vista não é sumir da árvore.
      */}
      <h2 className="sr-only">
        Mapa de envolvidos — {nosGrafo.length} nós entre pessoas, instituições, processos e
        documentos, conectados por relações extraídas das fontes públicas do caso.
      </h2>

      <Suspense fallback={<div className="mapa-palco mapa-tela mapa-bleed" aria-label="Carregando mapa" />}>
        <NetworkMap mostrarLista={false} />
      </Suspense>
    </div>
  );
}
