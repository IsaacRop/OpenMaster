import type { Metadata } from "next";
import ListaFiltravel from "@/components/ListaFiltravel";
import ProcessCard from "@/components/ProcessCard";
import { processos } from "@/lib/data";
import { OPCOES, metaProcessos } from "@/lib/filtros";

export const metadata: Metadata = {
  title: "Processos — OpenMaster",
  description:
    "Estado de cada processo do cluster do caso Banco Master / Vorcaro no STF, com relator, objeto e última movimentação. Filtrável por envolvido, tipo de evento, confiança, sigilo e data.",
};

export default function ProcessosPage() {
  // Os cartões são renderizados aqui, no servidor; o cliente só escolhe quais
  // exibir. Assim o filtro não leva os dados nem o Zod para o navegador.
  const cartoes = Object.fromEntries(
    processos.map((p) => [p.id, <ProcessCard key={p.id} processo={p} />]),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Frentes do caso</p>
        <h2 className="headline mt-2 text-4xl text-ink">Processos do caso</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
          O caso não acontece em um único processo. Aqui estão as {processos.length} frentes que
          acompanhamos, com o assunto, quem conduz e a movimentação mais recente de cada uma.
        </p>
        <p className="plain-note mt-4 max-w-3xl text-sm leading-relaxed">
          Pense em cada processo como uma pasta diferente do mesmo caso. Use os filtros para
          encontrar as pastas ligadas a uma pessoa, tipo de acontecimento, sigilo ou período.
        </p>
      </header>

      <ListaFiltravel
        itens={metaProcessos}
        cartoes={cartoes}
        opcoes={OPCOES}
        layout="grade"
        rotuloVazio="Nenhum dos processos acompanhados corresponde a esses filtros. Isso não representa todo o acervo do tribunal."
      />
    </div>
  );
}
