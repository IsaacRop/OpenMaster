import { stats } from "@/lib/data";

const CELULAS = [
  { valor: stats.processos, label: "processos no cluster" },
  { valor: stats.pautados, label: "pautados", destaque: true },
  { valor: stats.emAberto, label: "em aberto" },
  { valor: stats.decididos, label: "decididos" },
  { valor: stats.marcos, label: "marcos na linha do tempo" },
  { valor: stats.envolvidos, label: "envolvidos mapeados" },
];

export default function StatBar() {
  return (
    <section className="border-y border-rule">
      <dl className="grid grid-cols-2 divide-rule sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
        {CELULAS.map((c) => (
          <div key={c.label} className="border-b border-rule px-4 py-4 lg:border-b-0">
            <dd
              className={`numero text-3xl font-medium ${
                c.destaque ? "text-seal" : "text-ink"
              }`}
            >
              {String(c.valor).padStart(2, "0")}
            </dd>
            <dt className="kicker mt-1 leading-snug">{c.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
