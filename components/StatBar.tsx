import { stats } from "@/lib/data";

const CELULAS = [
  { valor: stats.processos, label: "processos no cluster" },
  { valor: stats.pautados, label: "pautados", destaque: true },
  { valor: stats.emAberto, label: "em aberto" },
  { valor: stats.decididos, label: "decididos" },
  { valor: stats.marcos, label: "marcos na linha do tempo" },
  { valor: stats.envolvidos, label: "envolvidos mapeados" },
  { valor: stats.documentos, label: "peças identificadas" },
];

export default function StatBar() {
  return (
    <section className="panel overflow-hidden">
      <dl className="grid grid-cols-2 gap-px bg-rule sm:grid-cols-3 lg:grid-cols-7">
        {CELULAS.map((c) => (
          <div key={c.label} className="bg-paper-2 px-4 py-4">
            <dd
              className={`numero text-2xl font-medium ${
                c.destaque ? "text-seal" : "text-ink"
              }`}
            >
              {String(c.valor).padStart(2, "0")}
            </dd>
            <dt className="mt-1 text-xs leading-snug text-ink-3">{c.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
