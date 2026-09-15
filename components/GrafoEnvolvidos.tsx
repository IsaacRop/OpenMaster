"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";

import type { NivelPresenca, Pessoa } from "@/lib/schema";
import { NIVEL_PRESENCA_LABEL } from "@/lib/schema";

/**
 * Mapa de envolvidos com física. O layout curado em `pos` deixou de ser a
 * palavra final e virou a *posição inicial* da simulação: o desenho continua
 * abrindo reconhecível, mas agora o leitor pode puxar um nó para ver de que
 * mais ele está pendurado.
 *
 * Filtrar esconde o nó, nunca o remove do grafo — um nó removido reorganizaria
 * o resto e daria a impressão de um caso com outra forma. Aqui, esconder é só
 * parar de desenhar: as forças seguem valendo, e o que sobra na tela continua
 * onde estava.
 */

export type NoGrafo = {
  id: string;
  rotulo: string;
  papel: string;
  grupo: Pessoa["grupo"] | "processo";
  nivel_presenca: NivelPresenca | null;
  /** Total de backlinks — mesma conta de lib/backlinks.ts. Dimensiona o nó. */
  grau: number;
  pos: { x: number; y: number };
  href: string;
};

export type ArestaGrafo = {
  id: string;
  from: string;
  to: string;
  rotulo: string;
  peso: "forte" | "normal";
  direcionada: boolean;
  apuracao: boolean;
};

type NoSim = NoGrafo & SimulationNodeDatum;
type ArestaSim = SimulationLinkDatum<NoSim> & ArestaGrafo;

const ESTILO_NO: Record<NoGrafo["grupo"], { fill: string; stroke: string; texto: string }> = {
  central: { fill: "var(--color-seal)", stroke: "var(--color-seal)", texto: "var(--color-seal)" },
  stf: { fill: "var(--color-paper)", stroke: "var(--color-ink)", texto: "var(--color-ink)" },
  instituicao: { fill: "var(--color-paper)", stroke: "var(--color-gold)", texto: "var(--color-ink-2)" },
  outros: { fill: "var(--color-paper)", stroke: "var(--color-ink-3)", texto: "var(--color-ink-2)" },
  processo: { fill: "var(--color-paper-2)", stroke: "var(--color-ink-2)", texto: "var(--color-ink)" },
};

const LEGENDA: { grupo: NoGrafo["grupo"]; label: string }[] = [
  { grupo: "central", label: "núcleo do caso" },
  { grupo: "stf", label: "ministros do STF" },
  { grupo: "instituicao", label: "instituições" },
  { grupo: "outros", label: "demais envolvidos" },
  { grupo: "processo", label: "processos" },
];

const NIVEIS: NivelPresenca[] = ["central", "recorrente", "periferico"];

const VB = { x: 0, y: 0, largura: 1260, altura: 800 };

/** Raio em função do grau. Raiz quadrada: área ∝ grau, não raio ∝ grau. */
const raio = (n: NoGrafo) => {
  if (n.grupo === "processo") return 20 + Math.sqrt(n.grau) * 3.2;
  return 7 + Math.sqrt(n.grau) * 2.6;
};

export default function GrafoEnvolvidos({
  nos,
  arestas,
}: {
  nos: NoGrafo[];
  arestas: ArestaGrafo[];
}) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);

  const [gruposOcultos, setGruposOcultos] = useState<Set<string>>(new Set());
  const [niveisOcultos, setNiveisOcultos] = useState<Set<NivelPresenca>>(new Set());
  const [vista, setVista] = useState({ k: 1, x: 0, y: 0 });
  const [focado, setFocado] = useState<string | null>(null);
  // Força o redesenho a cada tick — as posições vivem nos objetos da simulação.
  const [, setTick] = useState(0);

  const dados = useMemo(() => {
    const noSim: NoSim[] = nos.map((n) => ({ ...n, x: n.pos.x, y: n.pos.y }));
    const porId = new Map(noSim.map((n) => [n.id, n]));
    const arestaSim: ArestaSim[] = arestas
      .filter((a) => porId.has(a.from) && porId.has(a.to))
      .map((a) => ({ ...a, source: porId.get(a.from)!, target: porId.get(a.to)! }));
    return { noSim, arestaSim, porId };
  }, [nos, arestas]);

  const simRef = useRef<Simulation<NoSim, ArestaSim> | null>(null);

  useEffect(() => {
    const sim = forceSimulation<NoSim, ArestaSim>(dados.noSim)
      .force(
        "link",
        forceLink<NoSim, ArestaSim>(dados.arestaSim)
          .id((d) => d.id)
          .distance((d) => (d.peso === "forte" ? 110 : 165))
          .strength(0.35),
      )
      .force("carga", forceManyBody<NoSim>().strength((d) => -420 - raio(d) * 14))
      .force("colisao", forceCollide<NoSim>().radius((d) => raio(d) + 26))
      .force("centro", forceCenter(VB.largura / 2, VB.altura / 2).strength(0.04))
      // Âncora fraca na posição curada: a física reorganiza, mas o mapa não
      // deriva para longe do desenho que o leitor já conhece.
      .force("ancoraX", forceX<NoSim>((d) => d.pos.x).strength(0.055))
      .force("ancoraY", forceY<NoSim>((d) => d.pos.y).strength(0.055))
      .alphaDecay(0.035);

    sim.on("tick", () => setTick((t) => t + 1));
    simRef.current = sim;
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [dados]);

  const oculto = (n: NoGrafo) =>
    gruposOcultos.has(n.grupo) || (n.nivel_presenca !== null && niveisOcultos.has(n.nivel_presenca));

  // --- zoom / pan ----------------------------------------------------------

  /** Um arrasto que termina sobre o nó não deve navegar: só clique navega. */
  const moveu = useRef(false);

  const arrasto = useRef<
    | { tipo: "vista"; x0: number; y0: number; vx: number; vy: number }
    | { tipo: "no"; no: NoSim }
    | null
  >(null);

  /** Converte coordenada de tela para coordenada do viewBox, já descontada a vista. */
  function paraGrafo(ev: { clientX: number; clientY: number }) {
    const caixa = svgRef.current!.getBoundingClientRect();
    const escala = VB.largura / caixa.width;
    const x = (ev.clientX - caixa.left) * escala;
    const y = (ev.clientY - caixa.top) * escala;
    return { x: (x - vista.x) / vista.k, y: (y - vista.y) / vista.k };
  }

  function aoRolar(ev: React.WheelEvent) {
    ev.preventDefault();
    const caixa = svgRef.current!.getBoundingClientRect();
    const escala = VB.largura / caixa.width;
    const px = (ev.clientX - caixa.left) * escala;
    const py = (ev.clientY - caixa.top) * escala;

    setVista((v) => {
      const k = Math.min(4, Math.max(0.4, v.k * (ev.deltaY < 0 ? 1.12 : 1 / 1.12)));
      // Mantém sob o cursor o ponto que estava sob o cursor.
      return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k };
    });
  }

  function aoPressionarFundo(ev: React.PointerEvent) {
    if (ev.button !== 0) return;
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    moveu.current = false;
    arrasto.current = { tipo: "vista", x0: ev.clientX, y0: ev.clientY, vx: vista.x, vy: vista.y };
  }

  function aoPressionarNo(ev: React.PointerEvent, no: NoSim) {
    ev.stopPropagation();
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    moveu.current = false;
    arrasto.current = { tipo: "no", no };
    simRef.current?.alphaTarget(0.25).restart();
    const p = paraGrafo(ev);
    no.fx = p.x;
    no.fy = p.y;
  }

  function aoMover(ev: React.PointerEvent) {
    const a = arrasto.current;
    if (!a) return;
    moveu.current = true;
    if (a.tipo === "vista") {
      const caixa = svgRef.current!.getBoundingClientRect();
      const escala = VB.largura / caixa.width;
      setVista((v) => ({
        ...v,
        x: a.vx + (ev.clientX - a.x0) * escala,
        y: a.vy + (ev.clientY - a.y0) * escala,
      }));
    } else {
      const p = paraGrafo(ev);
      a.no.fx = p.x;
      a.no.fy = p.y;
    }
  }

  function aoSoltar() {
    const a = arrasto.current;
    if (a?.tipo === "no") {
      simRef.current?.alphaTarget(0);
      a.no.fx = null;
      a.no.fy = null;
    }
    arrasto.current = null;
  }

  function alternar<T>(set: Set<T>, valor: T, aplicar: (s: Set<T>) => void) {
    const novo = new Set(set);
    if (novo.has(valor)) novo.delete(valor);
    else novo.add(valor);
    aplicar(novo);
  }

  const visiveis = dados.noSim.filter((n) => !oculto(n));
  const vizinhos = useMemo(() => {
    if (!focado) return new Set<string>();
    const s = new Set<string>([focado]);
    for (const a of dados.arestaSim) {
      if (a.from === focado) s.add(a.to);
      if (a.to === focado) s.add(a.from);
    }
    return s;
  }, [focado, dados.arestaSim]);

  return (
    <div>
      {/* Filtros ------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-rule py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="kicker">Grupo</span>
          {LEGENDA.map((l) => {
            const off = gruposOcultos.has(l.grupo);
            return (
              <button
                key={l.grupo}
                type="button"
                aria-pressed={!off}
                onClick={() => alternar(gruposOcultos, l.grupo, setGruposOcultos)}
                className={`numero flex items-center gap-1.5 border px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.12em] transition-colors ${
                  off ? "border-rule text-ink-3 line-through" : "border-ink text-ink"
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 border-2"
                  style={{
                    borderColor: ESTILO_NO[l.grupo].stroke,
                    backgroundColor: off ? "transparent" : ESTILO_NO[l.grupo].fill,
                    borderRadius: l.grupo === "processo" ? 0 : "9999px",
                    opacity: off ? 0.4 : 1,
                  }}
                />
                {l.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="kicker" title="Protagonismo nos fatos, não frequência de menção.">
            Presença
          </span>
          {NIVEIS.map((n) => {
            const off = niveisOcultos.has(n);
            return (
              <button
                key={n}
                type="button"
                aria-pressed={!off}
                onClick={() => alternar(niveisOcultos, n, setNiveisOcultos)}
                className={`numero border px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.12em] transition-colors ${
                  off ? "border-rule text-ink-3 line-through" : "border-ink text-ink"
                }`}
              >
                {NIVEL_PRESENCA_LABEL[n]}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setVista({ k: 1, x: 0, y: 0 })}
          className="kicker ml-auto border border-rule px-2 py-1 hover:border-seal hover:text-seal"
        >
          Reenquadrar
        </button>
      </div>

      <p className="kicker mt-2 normal-case tracking-normal">
        Arraste o fundo para mover, role para aproximar, arraste um nó para puxá-lo. Clique abre a
        página da entidade. O tamanho do nó é o número de referências que chegam até ele.
      </p>

      {/* Grafo ---------------------------------------------------------- */}
      <div className="mt-3 overflow-hidden border border-rule bg-paper-3/50">
        <svg
          ref={svgRef}
          viewBox={`${VB.x} ${VB.y} ${VB.largura} ${VB.altura}`}
          role="img"
          aria-label="Mapa interativo de relações entre envolvidos e processos do caso"
          className="h-auto w-full touch-none select-none"
          style={{ cursor: "grab" }}
          onWheel={aoRolar}
          onPointerDown={aoPressionarFundo}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerLeave={aoSoltar}
        >
          <defs>
            <marker
              id="seta-grafo"
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

          {/* Fundo capturador de arrasto: precisa existir para o pan pegar. */}
          <rect
            x={VB.x}
            y={VB.y}
            width={VB.largura}
            height={VB.altura}
            fill="transparent"
            onPointerDown={() => setFocado(null)}
          />

          <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.k})`}>
            <g>
              {dados.arestaSim.map((a) => {
                const s = a.source as NoSim;
                const t = a.target as NoSim;
                if (oculto(s) || oculto(t)) return null;
                const apagada = focado !== null && !(vizinhos.has(s.id) && vizinhos.has(t.id));

                const dx = (t.x ?? 0) - (s.x ?? 0);
                const dy = (t.y ?? 0) - (s.y ?? 0);
                const dist = Math.hypot(dx, dy) || 1;
                const ra = raio(s) + 3;
                const rb = raio(t) + 9;

                return (
                  <line
                    key={a.id}
                    x1={(s.x ?? 0) + (dx / dist) * ra}
                    y1={(s.y ?? 0) + (dy / dist) * ra}
                    x2={(t.x ?? 0) - (dx / dist) * rb}
                    y2={(t.y ?? 0) - (dy / dist) * rb}
                    stroke={a.apuracao ? "var(--color-gold)" : "var(--color-ink-3)"}
                    strokeWidth={a.peso === "forte" ? 1.9 : 1}
                    strokeDasharray={a.apuracao ? "5 4" : undefined}
                    markerEnd={a.direcionada ? "url(#seta-grafo)" : undefined}
                    opacity={apagada ? 0.12 : 0.85}
                  >
                    <title>
                      {s.rotulo} → {t.rotulo}: {a.rotulo}
                      {a.apuracao ? " (em apuração)" : ""}
                    </title>
                  </line>
                );
              })}
            </g>

            <g>
              {dados.noSim.map((n) => {
                if (oculto(n)) return null;
                const s = ESTILO_NO[n.grupo];
                const r = raio(n);
                const apagado = focado !== null && !vizinhos.has(n.id);

                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x ?? 0} ${n.y ?? 0})`}
                    opacity={apagado ? 0.2 : 1}
                    style={{ cursor: "pointer" }}
                    tabIndex={0}
                    role="link"
                    aria-label={`${n.rotulo} — ${n.papel}. ${n.grau} referências.`}
                    onPointerDown={(ev) => aoPressionarNo(ev, n)}
                    onPointerMove={aoMover}
                    onPointerUp={aoSoltar}
                    onMouseEnter={() => setFocado(n.id)}
                    onMouseLeave={() => setFocado(null)}
                    onClick={() => {
                      if (!moveu.current) router.push(n.href);
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        router.push(n.href);
                      }
                    }}
                  >
                    <title>
                      {n.rotulo} — {n.papel} · {n.grau}{" "}
                      {n.grau === 1 ? "referência" : "referências"}
                    </title>

                    {n.grupo === "processo" ? (
                      <rect
                        x={-r}
                        y={-14}
                        width={r * 2}
                        height={28}
                        fill={s.fill}
                        stroke={s.stroke}
                        strokeWidth={1.2}
                        strokeDasharray="3 2"
                      />
                    ) : (
                      <circle r={r} fill={s.fill} stroke={s.stroke} strokeWidth={1.8} />
                    )}

                    <text
                      y={r + (n.grupo === "processo" ? 18 : 16)}
                      textAnchor="middle"
                      fill={s.texto}
                      style={{
                        fontFamily:
                          n.grupo === "processo" ? "var(--font-mono)" : "var(--font-sans)",
                        fontSize: n.grupo === "processo" ? 12 : 13,
                        fontWeight: n.grupo === "central" ? 600 : 500,
                        pointerEvents: "none",
                      }}
                    >
                      {n.rotulo}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <span className="kicker normal-case tracking-normal">
          {visiveis.length} de {dados.noSim.length} nós visíveis — filtrar esconde, não remove: as
          ligações dos nós ocultos continuam valendo no arranjo.
        </span>
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
    </div>
  );
}
