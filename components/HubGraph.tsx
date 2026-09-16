import { arestasGrafo, nosGrafo } from "@/lib/grafo";

const COR_GRUPO = {
  central: "var(--color-seal)",
  stf: "var(--color-ok)",
  instituicao: "var(--color-ink-3)",
  outros: "var(--color-disputed)",
  processo: "var(--color-ink-2)",
  documento: "var(--color-ink-3)",
} as const;

export default function HubGraph() {
  const nos = nosGrafo.filter((no) => no.tipo !== "documento").sort((a, b) => b.grau - a.grau).slice(0, 9);
  const ids = new Set(nos.map((n) => n.id));
  const arestas = arestasGrafo.filter((a) => ids.has(a.from) && ids.has(a.to));
  const porId = new Map(nos.map((n) => [n.id, n]));

  const ponto = (id: string) => {
    const no = porId.get(id)!;
    return { x: 28 + no.pos.x * 0.245, y: 18 + no.pos.y * 0.265 };
  };

  return (
    <svg
      viewBox="0 0 360 250"
      className="block h-auto w-full"
      role="img"
      aria-label="Resumo do mapa de relações entre pessoas, instituições e processos"
    >
      <g fill="none" stroke="var(--color-rule-strong)" strokeWidth="1">
        {arestas.map((a) => {
          const inicio = ponto(a.from);
          const fim = ponto(a.to);
          return (
            <line
              key={a.id}
              x1={inicio.x}
              y1={inicio.y}
              x2={fim.x}
              y2={fim.y}
              stroke={a.apuracao ? "var(--color-seal)" : undefined}
              strokeDasharray={a.apuracao ? "4 4" : undefined}
              opacity={a.apuracao ? 0.8 : 1}
            />
          );
        })}
      </g>

      {nos.map((no) => {
        const p = ponto(no.id);
        const raio = Math.min(11, 4.5 + Math.sqrt(no.grau) * 1.6);
        return (
          <a key={no.id} href={no.href} aria-label={`${no.rotulo}: ${no.papel}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={raio + 6}
              fill="transparent"
              stroke={no.grupo === "central" ? "var(--color-rule-strong)" : "transparent"}
            />
            <circle cx={p.x} cy={p.y} r={raio} fill={COR_GRUPO[no.grupo]} />
            <text
              x={p.x}
              y={p.y + raio + 13}
              textAnchor="middle"
              fill="var(--color-ink-3)"
              fontFamily="var(--font-mono)"
              fontSize="8"
            >
              {no.rotulo.length > 18 ? `${no.rotulo.slice(0, 16)}…` : no.rotulo}
            </text>
          </a>
        );
      })}
    </svg>
  );
}
