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
        <p className="eyebrow">Pesquisa na base</p>
        <h2 className="headline mt-2 text-4xl text-ink">O que você procura?</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
          Digite um nome, número de processo, decisão ou assunto. A busca percorre processos,
          acontecimentos, pessoas e documentos ao mesmo tempo — e acontece somente no seu
          navegador.
        </p>
      </header>

      <BuscaCliente indice={indiceBusca} />
    </div>
  );
}
