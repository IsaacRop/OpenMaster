import type { Metadata } from "next";
import { Suspense } from "react";

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
        <p className="kicker">Cluster</p>
        <h2 className="headline mt-1 text-4xl text-ink">Processos</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
          Os {processos.length} feitos que compõem o cluster. O objeto de cada processo é
          transcrito da fonte, não resumido por nós. Um processo entra no filtro de um envolvido
          quando há relação direta, citação em evento da tramitação{" "}
          <em>ou</em> peça assinada por ele.
        </p>
      </header>

      <Suspense fallback={<div className="h-24" />}>
        <ListaFiltravel
          itens={metaProcessos}
          cartoes={cartoes}
          opcoes={OPCOES}
          layout="grade"
          rotuloVazio="Nenhum processo do cluster satisfaz esse recorte. Isso diz respeito ao que está mapeado aqui, não ao acervo do tribunal."
        />
      </Suspense>
    </div>
  );
}
