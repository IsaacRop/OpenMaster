import type { Metadata } from "next";

import BuscaCliente from "@/components/BuscaCliente";
import { indiceBusca } from "@/lib/busca";

export const metadata: Metadata = {
  title: "Busca — OpenMaster",
  description:
    "Busca em texto completo sobre processos, eventos, pessoas e documentos do caso Banco Master / Vorcaro no STF.",
};

export default function BuscaPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Pesquisa</p>
        <h2 className="headline mt-1 text-4xl text-ink">Busca</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
          Procura em todo o texto do painel — número e objeto de processo, título e descrição de
          evento, papel e resumo de cada envolvido, ementa de cada peça. O índice é gerado no
          build e roda inteiro no seu navegador: nenhuma consulta é enviada a lugar nenhum.
        </p>
      </header>

      <BuscaCliente indice={indiceBusca} />
    </div>
  );
}
