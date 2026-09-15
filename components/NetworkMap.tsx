import Link from "next/link";

import { arestasDoMapa, nosDoMapa, type NoMapa } from "@/lib/data";
import { ConfiancaBadge, SourceTag } from "./SourceTag";

/**
 * Grafo SVG de posições fixas. Sem biblioteca de física: o layout é decisão
 * editorial gravada em `pos` nos dados, então dois deploys iguais desenham o
 * mesmo mapa e ninguém precisa reaprender a leitura a cada visita.
 *
 * O SVG é o panorama; a lista abaixo dele é a versão citável — é lá que cada
 * relação aparece com rótulo e fonte clicável, que `<title>` de SVG não
 * comporta.
 */

const R_PESSOA = 9;
const R_PROCESSO = 26; // meia-largura do retângulo, para recortar a aresta

const ESTILO_NO: Record<NoMapa["grupo"], { fill: string; stroke: string; texto: string }> = {
  central: { fill: "var(--color-seal)", stroke: "var(--color-seal)", texto: "var(--color-seal)" },
  stf: { fill: "var(--color-paper)", stroke: "var(--color-ink)", texto: "var(--color-ink)" },
  instituicao: { fill: "var(--color-paper)", stroke: "var(--color-gold)", texto: "var(--color-ink-2)" },
  outros: { fill: "var(--color-paper)", stroke: "var(--color-ink-3)", texto: "var(--color-ink-2)" },
  processo: { fill: "var(--color-paper-2)", stroke: "var(--color-ink-2)", texto: "var(--color-ink)" },
};

const LEGENDA: { grupo: NoMapa["grupo"]; label: string }[] = [
  { grupo: "central", label: "núcleo do caso" },
  { grupo: "stf", label: "ministros do STF" },
  { grupo: "instituicao", label: "instituições" },
  { grupo: "outros", label: "demais envolvidos" },
  { grupo: "processo", label: "processos" },
];

const porId = new Map(nosDoMapa.map((n) => [n.id, n]));

/** Encurta a aresta para não invadir o nó — a seta precisa tocar a borda, não o centro. */
function recortar(a: NoMapa, b: NoMapa) {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ra = (a.grupo === "processo" ? R_PROCESSO : R_PESSOA) + 3;
  const rb = (b.grupo === "processo" ? R_PROCESSO : R_PESSOA) + 8;
  return {
    x1: a.pos.x + (dx / dist) * ra,
    y1: a.pos.y + (dy / dist) * ra,
    x2: b.pos.x - (dx / dist) * rb,
    y2: b.pos.y - (dy / dist) * rb,
  };
}

export default function NetworkMap() {
  return (
    <div>
      <div className="overflow-x-auto border border-rule bg-paper-3/50">
        <svg
          viewBox="20 10 1220 760"
          role="img"
          aria-label="Mapa de relações entre envolvidos e processos do caso"
          className="h-auto w-full min-w-[720px]"
        >
          <defs>
            <marker
              id="seta"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-ink-3)" />
            </marker>
          </defs>

          {/* arestas */}
          <g>
            {arestasDoMapa.map((r) => {
              const a = porId.get(r.from)!;
              const b = porId.get(r.to)!;
              const { x1, y1, x2, y2 } = recortar(a, b);
              const apuracao = r.confianca !== "confirmado";
              return (
                <line
                  key={r.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={apuracao ? "var(--color-gold)" : "var(--color-ink-3)"}
                  strokeWidth={r.peso === "forte" ? 1.9 : 1}
                  strokeDasharray={apuracao ? "5 4" : undefined}
                  markerEnd={r.direcionada ? "url(#seta)" : undefined}
                  opacity={0.85}
                >
                  <title>
                    {a.rotulo} → {b.rotulo}: {r.rotulo}
                    {apuracao ? " (em apuração)" : ""}
                  </title>
                </line>
              );
            })}
          </g>

          {/* nós */}
          <g>
            {nosDoMapa.map((n) => {
              const s = ESTILO_NO[n.grupo];
              return (
                <g key={n.id} className="[&:hover_text]:fill-[var(--color-seal)]">
                  <title>
                    {n.rotulo} — {n.papel}
                  </title>

                  {n.grupo === "processo" ? (
                    <rect
                      x={n.pos.x - R_PROCESSO}
                      y={n.pos.y - 13}
                      width={R_PROCESSO * 2}
                      height={26}
                      fill={s.fill}
                      stroke={s.stroke}
                      strokeWidth={1.2}
                      strokeDasharray="3 2"
                    />
                  ) : (
                    <circle
                      cx={n.pos.x}
                      cy={n.pos.y}
                      r={n.grupo === "central" ? R_PESSOA + 3 : R_PESSOA}
                      fill={s.fill}
                      stroke={s.stroke}
                      strokeWidth={1.8}
                    />
                  )}

                  <text
                    x={n.pos.x}
                    y={n.pos.y + (n.grupo === "processo" ? 30 : 26)}
                    textAnchor="middle"
                    fill={s.texto}
                    style={{
                      fontFamily:
                        n.grupo === "processo" ? "var(--font-mono)" : "var(--font-sans)",
                      fontSize: n.grupo === "processo" ? 12 : 13,
                      fontWeight: n.grupo === "central" ? 600 : 500,
                    }}
                  >
                    {n.rotulo}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {LEGENDA.map((l) => (
          <span key={l.grupo} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 border-2"
              style={{
                borderColor: ESTILO_NO[l.grupo].stroke,
                backgroundColor: ESTILO_NO[l.grupo].fill,
                borderRadius: l.grupo === "processo" ? 0 : "9999px",
              }}
            />
            <span className="kicker">{l.label}</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <svg width="26" height="8" aria-hidden="true">
            <line
              x1="0"
              y1="4"
              x2="26"
              y2="4"
              stroke="var(--color-gold)"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          </svg>
          <span className="kicker">relação em apuração</span>
        </span>
      </div>

      <h3 className="headline mt-8 text-lg text-ink">Relações, uma a uma</h3>
      <p className="mt-1 text-sm text-ink-2">
        O mapa dá o panorama; esta lista é a versão citável — cada ligação com seu rótulo e a
        fonte de onde foi extraída.
      </p>
      <ul className="mt-4 divide-y divide-rule border-y border-rule">
        {arestasDoMapa.map((r) => {
          const a = porId.get(r.from)!;
          const b = porId.get(r.to)!;
          return (
            <li key={r.id} className="py-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <NoLabel no={a} />
                <span className="text-ink-3">→</span>
                <NoLabel no={b} />
                <ConfiancaBadge confianca={r.confianca} />
              </div>
              <p className="mt-1 text-sm text-ink-2">{r.rotulo}</p>
              <div className="mt-1">
                <SourceTag fonte={r} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NoLabel({ no }: { no: NoMapa }) {
  const classe = "headline text-base text-ink";
  return no.href ? (
    <Link href={no.href} className={`${classe} no-underline hover:text-seal`}>
      {no.rotulo}
    </Link>
  ) : (
    <span className={classe}>{no.rotulo}</span>
  );
}
