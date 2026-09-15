import type { Metadata } from "next";

import ProcessCard from "@/components/ProcessCard";
import { processos } from "@/lib/data";
import { STATUS_LABEL, type Processo } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Processos — Painel do Caso Master",
  description:
    "Estado de cada processo do cluster do caso Banco Master / Vorcaro no STF, com relator, objeto e última movimentação.",
};

const ORDEM: Processo["status"][] = ["pautado", "em_aberto", "decidido"];

export default function ProcessosPage() {
  return (
    <div className="space-y-10">
      <header>
        <p className="kicker">Cluster</p>
        <h2 className="headline mt-1 text-4xl text-ink">Processos</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
          Os {processos.length} feitos que compõem o cluster, agrupados pelo estado em que se
          encontram. O objeto de cada processo é transcrito da fonte, não resumido por nós.
        </p>
      </header>

      {ORDEM.map((status) => {
        const grupo = processos.filter((p) => p.status === status);
        if (grupo.length === 0) return null;
        return (
          <section key={status}>
            <div className="flex items-baseline justify-between border-b border-ink pb-1.5">
              <h3 className="headline text-2xl text-ink">{STATUS_LABEL[status]}</h3>
              <span className="numero text-sm text-ink-3">{grupo.length}</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {grupo.map((p) => (
                <ProcessCard key={p.id} processo={p} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
