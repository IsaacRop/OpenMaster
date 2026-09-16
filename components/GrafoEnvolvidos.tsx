"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Confianca, NivelPresenca, Pessoa } from "@/lib/schema";
import { CONFIANCA_LABEL } from "@/lib/schema";

export type TipoNo = "pessoa" | "instituicao" | "processo" | "documento";
export type EventoNo = { id: string; data: string; titulo: string; confianca: Confianca };

export type NoGrafo = {
  id: string;
  rotulo: string;
  papel: string;
  tipo: TipoNo;
  grupo: Pessoa["grupo"] | "processo" | "documento";
  nivel_presenca: NivelPresenca | null;
  grau: number;
  pos: { x: number; y: number };
  href: string;
  resumo: string;
  confianca: Confianca;
  source_url: string;
  source_name: string;
  source_date?: string;
  revisado_em?: string;
  eventos: EventoNo[];
};

export type ArestaGrafo = {
  id: string;
  from: string;
  to: string;
  rotulo: string;
  peso: "forte" | "normal";
  direcionada: boolean;
  confianca: Confianca;
  apuracao: boolean;
  source_url: string;
  source_name: string;
  source_date?: string;
  /** Prosa que acrescenta algo ao `rotulo`. Ausente quando não haveria. */
  contexto?: string;
};

type Vista = { k: number; x: number; y: number };
type ModoMapa = "essencial" | "completo";
const MUNDO = { largura: 1260, altura: 800 };
const K_MIN = 0.48;
const K_MAX = 3.2;
const TODOS_TIPOS: TipoNo[] = ["pessoa", "instituicao", "processo", "documento"];
const TIPO_LABEL: Record<TipoNo, string> = { pessoa: "Pessoas", instituicao: "Instituições", processo: "Processos", documento: "Documentos" };
const TIPO_SINGULAR: Record<TipoNo, string> = { pessoa: "Pessoa", instituicao: "Instituição", processo: "Processo", documento: "Documento" };
const limitar = (valor: number, min: number, max: number) => Math.min(max, Math.max(min, valor));
const dataBR = (data?: string) => (data ? data.split("-").reverse().join("/") : null);
const iniciais = (texto: string) => texto.replace(/^(Min\.?|Banco|Polícia|Pet|Rcl|Inq)\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();
const raioNo = (no: NoGrafo) => no.tipo === "processo" ? 31 : no.tipo === "instituicao" ? 28 : 24;

function pontoAresta(no: NoGrafo, outro: NoGrafo, margem = 5) {
  const dx = outro.pos.x - no.pos.x;
  const dy = outro.pos.y - no.pos.y;
  const d = Math.hypot(dx, dy) || 1;
  const r = raioNo(no) + margem;
  return { x: no.pos.x + (dx / d) * r, y: no.pos.y + (dy / d) * r };
}

function Status({ confianca }: { confianca: Confianca }) {
  return <span className={`mapa-status mapa-status-${confianca}`}><span aria-hidden="true" />{CONFIANCA_LABEL[confianca] ?? "Confirmado"}</span>;
}

function MarcaNo({ no, selecionado }: { no: NoGrafo; selecionado: boolean }) {
  const classe = `mapa-no-marca mapa-no-${no.tipo}${selecionado ? " is-selected" : ""}`;
  if (no.tipo === "processo") return <g className={classe}><rect x={-39} y={-23} width={78} height={46} rx={2} /><text y={4} textAnchor="middle">{no.rotulo.replace(/\s/g, "\u00a0")}</text></g>;
  if (no.tipo === "documento") return <g className={classe}><path d="M-18-24H10L19-15V24H-18Z" /><path className="mapa-no-dobra" d="M10-24V-15H19" /><line x1={-10} y1={-5} x2={10} y2={-5} /><line x1={-10} y1={3} x2={8} y2={3} /><line x1={-10} y1={11} x2={4} y2={11} /></g>;
  if (no.tipo === "instituicao") return <g className={classe}><rect x={-21} y={-21} width={42} height={42} transform="rotate(45)" /><text y={5} textAnchor="middle">{iniciais(no.rotulo)}</text></g>;
  return <g className={classe}><circle r={24} /><circle className="mapa-no-anel" r={19} /><text y={5} textAnchor="middle">{iniciais(no.rotulo)}</text></g>;
}

export default function GrafoEnvolvidos({ nos, arestas }: { nos: NoGrafo[]; arestas: ArestaGrafo[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const palcoRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [vb, setVb] = useState({ x: 0, y: 0, largura: MUNDO.largura, altura: MUNDO.altura });
  const [vista, setVista] = useState<Vista>({ k: 1, x: 0, y: 0 });
  const vistaRef = useRef(vista);
  const [hover, setHover] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [tiposAtivos, setTiposAtivos] = useState<Set<TipoNo>>(() => {
    const tipos = params.get("tipos")?.split(",").filter((t): t is TipoNo => TODOS_TIPOS.includes(t as TipoNo));
    return new Set(tipos?.length ? tipos : TODOS_TIPOS);
  });
  const arrasto = useRef<{ x: number; y: number; vx: number; vy: number; moveu: boolean } | null>(null);
  const suprirCliqueAposPan = useRef(false);
  const quadroPan = useRef<number | null>(null);
  const vistaPendente = useRef<Vista | null>(null);
  /**
   * A camada transformada. Animacao de camera escreve o `transform` aqui
   * direto, sem passar pelo React: um `setState` por quadro re-renderizaria
   * todos os nos e arestas sessenta vezes por segundo.
   */
  const camadaRef = useRef<SVGGElement>(null);
  const animacaoRef = useRef<number | null>(null);
  /** Para onde a roda esta empurrando o zoom, e em torno de que ponto. */
  const alvoZoom = useRef<{ k: number; px: number; py: number } | null>(null);
  const entidadeId = params.get("entidade");
  const relacaoId = params.get("relacao");
  const tiposParam = params.get("tipos");
  const modo: ModoMapa = params.get("modo") === "completo" ? "completo" : "essencial";
  const selecionado = entidadeId ? nos.find((n) => n.id === entidadeId) ?? null : null;
  const relacaoSelecionada = relacaoId ? arestas.find((a) => a.id === relacaoId) ?? null : null;
  const porId = useMemo(() => new Map(nos.map((no) => [no.id, no])), [nos]);

  useEffect(() => { vistaRef.current = vista; }, [vista]);
  useEffect(() => {
    const tipos = tiposParam?.split(",").filter((tipo): tipo is TipoNo => TODOS_TIPOS.includes(tipo as TipoNo));
    setTiposAtivos(new Set(tipos?.length ? tipos : TODOS_TIPOS));
  }, [tiposParam]);
  useEffect(() => {
    const palco = palcoRef.current;
    if (!palco) return;
    const medir = () => {
      const { width, height } = palco.getBoundingClientRect();
      if (!width || !height) return;
      const escala = Math.max(MUNDO.largura / width, MUNDO.altura / height);
      const largura = width * escala;
      const altura = height * escala;
      setVb({ x: (MUNDO.largura - largura) / 2, y: (MUNDO.altura - altura) / 2, largura, altura });
      palco.style.setProperty("--mapa-vw", `${document.documentElement.clientWidth}px`);
      palco.style.setProperty("--mapa-cabecalho", `${document.querySelector(".site-header")?.getBoundingClientRect().height ?? 72}px`);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(palco);
    window.addEventListener("resize", medir);
    return () => { ro.disconnect(); window.removeEventListener("resize", medir); };
  }, []);

  const navegar = (mudanca: { entidade?: string | null; relacao?: string | null; tipos?: Set<TipoNo>; modo?: ModoMapa }, historico: "push" | "replace" = "push") => {
    const proximos = new URLSearchParams(params.toString());
    if (mudanca.entidade === null) proximos.delete("entidade"); else if (mudanca.entidade) proximos.set("entidade", mudanca.entidade);
    if (mudanca.relacao === null) proximos.delete("relacao"); else if (mudanca.relacao) proximos.set("relacao", mudanca.relacao);
    if (mudanca.tipos) {
      if (mudanca.tipos.size === TODOS_TIPOS.length) proximos.delete("tipos");
      else proximos.set("tipos", TODOS_TIPOS.filter((tipo) => mudanca.tipos!.has(tipo)).join(","));
    }
    if (mudanca.modo === "essencial") proximos.delete("modo");
    else if (mudanca.modo === "completo") proximos.set("modo", "completo");
    const url = `${pathname}${proximos.size ? `?${proximos}` : ""}`;
    router[historico](url, { scroll: false });
  };

  const escreverVista = (v: Vista) => {
    vistaRef.current = v;
    camadaRef.current?.setAttribute("transform", `translate(${v.x} ${v.y}) scale(${v.k})`);
  };

  const pararAnimacao = () => {
    if (animacaoRef.current !== null) cancelAnimationFrame(animacaoRef.current);
    animacaoRef.current = null;
    alvoZoom.current = null;
  };

  useEffect(() => pararAnimacao, []);

  const animarVista = (destino: Vista, duracao = 520) => {
    pararAnimacao();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setVista(destino); return; }
    const inicio = vistaRef.current;
    const t0 = performance.now();
    const passo = () => {
      const t = limitar((performance.now() - t0) / duracao, 0, 1);
      const e = 1 - Math.pow(1 - t, 3);
      const atual = { k: inicio.k + (destino.k - inicio.k) * e, x: inicio.x + (destino.x - inicio.x) * e, y: inicio.y + (destino.y - inicio.y) * e };
      if (t < 1) { escreverVista(atual); animacaoRef.current = requestAnimationFrame(passo); }
      // Ultimo quadro volta ao React: e dele que o resto do componente le a
      // vista, e ele nao pode ficar defasado depois que a animacao termina.
      else { animacaoRef.current = null; setVista(destino); }
    };
    animacaoRef.current = requestAnimationFrame(passo);
  };

  /**
   * Perseguicao do alvo: a cada quadro a camera anda uma fracao do que falta.
   * E isto que tira a dureza da roda — o entalhe nao e aplicado de uma vez, ele
   * *move o destino*. Entalhes seguidos empilham no mesmo alvo em vez de
   * produzirem uma escada de saltos.
   */
  const seguirAlvo = () => {
    const alvo = alvoZoom.current;
    if (!alvo) { animacaoRef.current = null; return; }
    const v = vistaRef.current;
    const k = v.k + (alvo.k - v.k) * 0.22;
    const chegou = Math.abs(alvo.k - k) < 0.0015;
    const kFinal = chegou ? alvo.k : k;
    // Reancoragem por quadro: o ponto sob o cursor continua sob o cursor
    // durante toda a interpolacao, nao so no destino.
    const nova: Vista = { k: kFinal, x: alvo.px - ((alvo.px - v.x) / v.k) * kFinal, y: alvo.py - ((alvo.py - v.y) / v.k) * kFinal };
    if (chegou) { escreverVista(nova); animacaoRef.current = null; alvoZoom.current = null; setVista(nova); }
    else { escreverVista(nova); animacaoRef.current = requestAnimationFrame(seguirAlvo); }
  };
  const enquadrarNo = (no: NoGrafo, k = window.innerWidth < 768 ? 1.15 : 1.35) => animarVista({ k, x: vb.x + vb.largura * (window.innerWidth < 768 ? 0.5 : 0.32) - no.pos.x * k, y: vb.y + vb.altura * (window.innerWidth < 768 ? 0.35 : 0.5) - no.pos.y * k });
  const selecionarNo = (no: NoGrafo) => { navegar({ entidade: no.id, relacao: null }); enquadrarNo(no); setBuscaAberta(false); setBusca(""); };
  const selecionarRelacao = (aresta: ArestaGrafo) => {
    navegar({ entidade: null, relacao: aresta.id });
    const a = porId.get(aresta.from); const b = porId.get(aresta.to);
    if (!a || !b) return;
    const k = 1.45;
    animarVista({ k, x: vb.x + vb.largura * (window.innerWidth < 768 ? 0.5 : 0.32) - ((a.pos.x + b.pos.x) / 2) * k, y: vb.y + vb.altura * 0.48 - ((a.pos.y + b.pos.y) / 2) * k });
  };

  useEffect(() => { if (selecionado) enquadrarNo(selecionado); /* URL restaurada */ /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [entidadeId]);
  useEffect(() => {
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (selecionado || relacaoSelecionada)) navegar({ entidade: null, relacao: null });
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) { event.preventDefault(); setBuscaAberta(true); }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
    // Sem lista, este efeito reassinava o listener a cada render — inclusive a
    // cada quadro de animacao, quando ainda havia `setState` no laco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entidadeId, relacaoId, pathname, params]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const zoom = (event: WheelEvent) => {
      // Base e o alvo corrente, nao a vista: senao entalhes disparados durante
      // a interpolacao anterior se perdem e a roda parece engasgar.
      const base = alvoZoom.current?.k ?? vistaRef.current.k;
      if (event.deltaY > 0 && base <= K_MIN + 1e-6) return;
      event.preventDefault();
      const caixa = svg.getBoundingClientRect();
      const escala = vb.largura / caixa.width;
      const px = vb.x + (event.clientX - caixa.left) * escala;
      const py = vb.y + (event.clientY - caixa.top) * escala;
      // `deltaMode` 1 vem em linhas, 0 em pixels. Sem normalizar, o mesmo gesto
      // da saltos de tamanhos diferentes conforme o dispositivo.
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      // 0.0012 e a sensibilidade (~11% por entalhe); a suavidade quem da e o
      // amortecimento de `seguirAlvo`. Sao botoes independentes.
      const k = limitar(base * Math.exp(-delta * 0.0012), K_MIN, K_MAX);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const atual = vistaRef.current;
        setVista({ k, x: px - ((px - atual.x) / atual.k) * k, y: py - ((py - atual.y) / atual.k) * k });
        return;
      }
      alvoZoom.current = { k, px, py };
      if (animacaoRef.current === null) animacaoRef.current = requestAnimationFrame(seguirAlvo);
    };
    svg.addEventListener("wheel", zoom, { passive: false });
    return () => svg.removeEventListener("wheel", zoom);
  }, [vb]);

  const conexoes = selecionado ? arestas.filter((a) => a.from === selecionado.id || a.to === selecionado.id) : [];
  const conexoesVisuais = selecionado
    ? [...conexoes]
        .sort((a, b) => {
          const prioridadePeso = Number(b.peso === "forte") - Number(a.peso === "forte");
          if (prioridadePeso) return prioridadePeso;
          const outroA = porId.get(a.from === selecionado.id ? a.to : a.from);
          const outroB = porId.get(b.from === selecionado.id ? b.to : b.from);
          return (outroB?.grau ?? 0) - (outroA?.grau ?? 0);
        })
        .slice(0, 12)
    : [];
  const idsFoco = selecionado
    ? new Set([selecionado.id, ...conexoesVisuais.flatMap((aresta) => [aresta.from, aresta.to])])
    : relacaoSelecionada
      ? new Set([relacaoSelecionada.from, relacaoSelecionada.to])
      : null;
  const noEssencial = (no: NoGrafo) => no.grau >= 5 || (no.tipo === "processo" && no.grau >= 3);
  const oculto = (no: NoGrafo) => !tiposAtivos.has(no.tipo) || (idsFoco ? !idsFoco.has(no.id) : modo === "essencial" && !noEssencial(no));
  const nosVisiveis = nos.filter((no) => !oculto(no));
  const idsArestasFoco = selecionado ? new Set(conexoesVisuais.map((aresta) => aresta.id)) : relacaoSelecionada ? new Set([relacaoSelecionada.id]) : null;
  const arestasVisiveis = arestas.filter((aresta) => {
    if (idsArestasFoco && !idsArestasFoco.has(aresta.id)) return false;
    const origem = porId.get(aresta.from); const destino = porId.get(aresta.to);
    return origem && destino && !oculto(origem) && !oculto(destino);
  });
  const vizinhos = new Set<string>([...(selecionado ? [selecionado.id] : []), ...conexoesVisuais.flatMap((a) => [a.from, a.to])]);
  const posicoesFoco = new Map<string, { x: number; y: number }>();
  if (selecionado) {
    posicoesFoco.set(selecionado.id, selecionado.pos);
    conexoesVisuais.forEach((aresta, index) => {
      const idVizinho = aresta.from === selecionado.id ? aresta.to : aresta.from;
      const segundoAnel = index >= 6;
      const indiceAnel = segundoAnel ? index - 6 : index;
      const totalAnel = segundoAnel ? Math.max(1, conexoesVisuais.length - 6) : Math.min(6, conexoesVisuais.length);
      const angulo = -Math.PI / 2 + (indiceAnel * Math.PI * 2) / totalAnel + (segundoAnel ? Math.PI / 6 : 0);
      const distancia = segundoAnel ? 245 : 145;
      posicoesFoco.set(idVizinho, {
        x: selecionado.pos.x + Math.cos(angulo) * distancia,
        y: selecionado.pos.y + Math.sin(angulo) * distancia,
      });
    });
  }
  const posicaoRender = (no: NoGrafo) => posicoesFoco.get(no.id) ?? no.pos;
  const realceId = selecionado?.id ?? hover;
  const resultados = busca.trim() ? nos.filter((no) => `${no.rotulo} ${no.papel}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))).slice(0, 7) : [];
  const alternarTipo = (tipo: TipoNo) => { const novos = new Set(tiposAtivos); if (novos.has(tipo)) { if (novos.size === 1) return; novos.delete(tipo); } else novos.add(tipo); setTiposAtivos(novos); navegar({ tipos: novos }, "replace"); };
  const mudarZoom = (fator: number) => { const atual = vistaRef.current; const px = vb.x + vb.largura / 2; const py = vb.y + vb.altura / 2; const k = limitar(atual.k * fator, K_MIN, K_MAX); animarVista({ k, x: px - ((px - atual.x) / atual.k) * k, y: py - ((py - atual.y) / atual.k) * k }); };
  // Arrastar durante uma interpolacao: a mao manda, a animacao para.
  const iniciarPan = (event: React.PointerEvent<SVGSVGElement>) => { if (event.button !== 0) return; pararAnimacao(); suprirCliqueAposPan.current = false; event.currentTarget.setPointerCapture(event.pointerId); arrasto.current = { x: event.clientX, y: event.clientY, vx: vistaRef.current.x, vy: vistaRef.current.y, moveu: false }; };
  const moverPan = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!arrasto.current || !svgRef.current) return;
    const escala = vb.largura / svgRef.current.getBoundingClientRect().width;
    const dx = event.clientX - arrasto.current.x; const dy = event.clientY - arrasto.current.y;
    if (Math.hypot(dx, dy) > 3) { arrasto.current.moveu = true; suprirCliqueAposPan.current = true; }
    vistaPendente.current = { ...vistaRef.current, x: arrasto.current.vx + dx * escala, y: arrasto.current.vy + dy * escala };
    if (quadroPan.current !== null) return;
    quadroPan.current = requestAnimationFrame(() => {
      quadroPan.current = null;
      if (vistaPendente.current) escreverVista(vistaPendente.current);
    });
  };
  /**
   * O arrasto tambem escreve direto no DOM e so devolve ao React ao soltar.
   * Era o laco mais quente do componente: um `setState` por quadro de pan
   * re-renderizava o grafo inteiro enquanto o dedo estivesse na tela.
   */
  const encerrarPan = () => {
    if (!arrasto.current) return;
    arrasto.current = null;
    if (quadroPan.current !== null) { cancelAnimationFrame(quadroPan.current); quadroPan.current = null; }
    if (vistaPendente.current) { escreverVista(vistaPendente.current); vistaPendente.current = null; }
    setVista(vistaRef.current);
  };
  const origemRelacao = relacaoSelecionada ? porId.get(relacaoSelecionada.from) : null;
  const destinoRelacao = relacaoSelecionada ? porId.get(relacaoSelecionada.to) : null;

  return (
    <div className="mapa-experiencia">
      <div ref={palcoRef} className="mapa-bleed mapa-palco mapa-tela">
        <div className="mapa-topbar">
          <div className="mapa-titulo"><span className="mapa-capitulo">Rede documentada</span><strong>Mapa de envolvidos</strong></div>
          <div className="mapa-acoes">
            <div className="mapa-modo" aria-label="Densidade do mapa">
              <button type="button" aria-pressed={modo === "essencial"} onClick={() => { navegar({ modo: "essencial" }, "replace"); animarVista({ k: 1, x: 0, y: 0 }); }}>Essencial</button>
              <button type="button" aria-pressed={modo === "completo"} onClick={() => { navegar({ modo: "completo" }, "replace"); animarVista({ k: 1, x: 0, y: 0 }); }}>Completo</button>
            </div>
            <button type="button" className="mapa-controle mapa-busca-gatilho" onClick={() => setBuscaAberta((aberta) => !aberta)} aria-expanded={buscaAberta}><span aria-hidden="true">⌕</span> Buscar <kbd>/</kbd></button>
            <button type="button" className="mapa-controle" onClick={() => setFiltrosAbertos((aberto) => !aberto)} aria-expanded={filtrosAbertos}>Filtros <span className="mapa-contagem">{tiposAtivos.size}/{TODOS_TIPOS.length}</span></button>
          </div>
        </div>

        {buscaAberta && <div className="mapa-popover mapa-popover-busca">
          <label htmlFor="busca-mapa">Localizar uma entidade</label>
          <div className="mapa-input-wrap"><span aria-hidden="true">⌕</span><input id="busca-mapa" autoFocus value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Nome, instituição, processo…" autoComplete="off" /><button type="button" onClick={() => { setBusca(""); setBuscaAberta(false); }} aria-label="Fechar busca">×</button></div>
          {busca.trim() && <ul className="mapa-resultados" aria-label="Resultados da busca">
            {resultados.map((no) => <li key={no.id}><button type="button" onClick={() => selecionarNo(no)}><span className={`mapa-mini-tipo mapa-mini-${no.tipo}`}>{TIPO_SINGULAR[no.tipo]}</span><span><strong>{no.rotulo}</strong><small>{no.papel}</small></span></button></li>)}
            {!resultados.length && <li className="mapa-sem-resultado">Nenhuma entidade encontrada.</li>}
          </ul>}
        </div>}

        {filtrosAbertos && <div className="mapa-popover mapa-popover-filtros">
          <div className="mapa-popover-cabecalho"><strong>Exibir no mapa</strong><button type="button" onClick={() => setFiltrosAbertos(false)} aria-label="Fechar filtros">×</button></div>
          {TODOS_TIPOS.map((tipo) => <label key={tipo}><input type="checkbox" checked={tiposAtivos.has(tipo)} onChange={() => alternarTipo(tipo)} /><span className={`mapa-legenda-sinal mapa-mini-${tipo}`} />{TIPO_LABEL[tipo]}<small>{nos.filter((no) => no.tipo === tipo).length}</small></label>)}
          <p>Filtrar oculta entidades; não altera as relações nem as posições.</p>
        </div>}

        <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.largura} ${vb.altura}`} className="mapa-canvas" role="group" aria-label={`Mapa interativo com ${nosVisiveis.length} de ${nos.length} entidades visíveis`} onPointerDown={iniciarPan} onPointerMove={moverPan} onPointerUp={encerrarPan} onPointerCancel={encerrarPan}>
          <defs><marker id="mapa-seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" /></marker><filter id="mapa-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <rect x={vb.x} y={vb.y} width={vb.largura} height={vb.altura} fill="transparent" onClick={() => { if (suprirCliqueAposPan.current) { suprirCliqueAposPan.current = false; return; } if (selecionado || relacaoSelecionada) navegar({ entidade: null, relacao: null }); }} />
          <g ref={camadaRef} transform={`translate(${vista.x} ${vista.y}) scale(${vista.k})`}>
            <g className="mapa-arestas">{arestasVisiveis.map((aresta) => {
              const a = porId.get(aresta.from)!; const b = porId.get(aresta.to)!;
              const aRender = { ...a, pos: posicaoRender(a) }; const bRender = { ...b, pos: posicaoRender(b) };
              const inicio = pontoAresta(aRender, bRender); const fim = pontoAresta(bRender, aRender, aresta.direcionada ? 9 : 5);
              const adjacente = !realceId || aresta.from === realceId || aresta.to === realceId;
              const ativa = relacaoSelecionada?.id === aresta.id;
              const mostrarRotulo = ativa;
              const mx = (inicio.x + fim.x) / 2; const my = (inicio.y + fim.y) / 2;
              const larguraRotulo = Math.min(220, aresta.rotulo.length * 6.4 + 24);
              return <g key={aresta.id} className={`${adjacente ? "" : "is-dimmed"}${ativa ? " is-selected" : ""}`}>
                <line className={`mapa-aresta mapa-aresta-${aresta.confianca}`} x1={inicio.x} y1={inicio.y} x2={fim.x} y2={fim.y} markerEnd={aresta.direcionada ? "url(#mapa-seta)" : undefined} />
                <line className="mapa-aresta-hit" x1={inicio.x} y1={inicio.y} x2={fim.x} y2={fim.y} tabIndex={0} role="button" aria-label={`${a.rotulo} para ${b.rotulo}: ${aresta.rotulo}`} onClick={(event) => { event.stopPropagation(); selecionarRelacao(aresta); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selecionarRelacao(aresta); } }} />
                {mostrarRotulo && <g className="mapa-aresta-rotulo" transform={`translate(${mx} ${my})`} onClick={(event) => { event.stopPropagation(); selecionarRelacao(aresta); }}><rect x={-larguraRotulo / 2} y={-10} width={larguraRotulo} height={20} rx={2} /><text textAnchor="middle" y={4}>{aresta.rotulo.length > 34 ? `${aresta.rotulo.slice(0, 32)}…` : aresta.rotulo}</text></g>}
              </g>;
            })}</g>
            <g className="mapa-nos">{nosVisiveis.map((no) => {
              const ativo = selecionado?.id === no.id; const apagado = !!selecionado && !vizinhos.has(no.id);
              const mostrarNome = selecionado || relacaoSelecionada ? true : no.grau >= (modo === "essencial" ? 7 : 8);
              const posicao = posicaoRender(no);
              return <g key={no.id} transform={`translate(${posicao.x} ${posicao.y})`} className={`mapa-no${apagado ? " is-dimmed" : ""}${ativo ? " is-selected" : ""}`} tabIndex={0} role="button" aria-label={`${TIPO_SINGULAR[no.tipo]}: ${no.rotulo}. ${no.papel}`} onPointerDown={(event) => event.stopPropagation()} onMouseEnter={() => setHover(no.id)} onMouseLeave={() => setHover(null)} onClick={(event) => { event.stopPropagation(); selecionarNo(no); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selecionarNo(no); } }}>
                <MarcaNo no={no} selecionado={ativo} />{(mostrarNome || hover === no.id) && <text className="mapa-no-nome" y={no.tipo === "processo" ? 39 : 41} textAnchor="middle">{no.rotulo.length > 24 ? `${no.rotulo.slice(0, 22)}…` : no.rotulo}</text>}{(ativo || hover === no.id) && <text className="mapa-no-papel" y={no.tipo === "processo" ? 54 : 56} textAnchor="middle">{no.papel.length > 42 ? `${no.papel.slice(0, 40)}…` : no.papel}</text>}
              </g>;
            })}</g>
          </g>
        </svg>

        <div className="mapa-rodape"><div className="mapa-indice"><span>{String(nosVisiveis.length).padStart(2, "0")}</span> de {nos.length} entidades</div><p>{selecionado ? `Foco nas ${conexoesVisuais.length} relações mais relevantes; a ficha mantém a lista completa.` : "Proximidade visual organiza a leitura; não cria vínculo. Conexão não significa culpa."}</p></div>
        <div className="mapa-zoom" aria-label="Controles de zoom"><button type="button" onClick={() => mudarZoom(1 / 1.28)} aria-label="Afastar">−</button><span aria-live="polite">{Math.round(vista.k * 100)}%</span><button type="button" onClick={() => mudarZoom(1.28)} aria-label="Aproximar">+</button><button type="button" className="mapa-reenquadrar" onClick={() => animarVista({ k: 1, x: 0, y: 0 })}>Visão geral</button></div>

        {(selecionado || relacaoSelecionada) && <aside className="mapa-ficha" aria-label={selecionado ? `Detalhes de ${selecionado.rotulo}` : "Detalhes da relação"}>
          <div className="mapa-ficha-acoes"><button type="button" onClick={() => router.back()} aria-label="Voltar à seleção anterior">←</button><button type="button" onClick={() => navegar({ entidade: null, relacao: null })} aria-label="Fechar ficha">×</button></div>
          {selecionado && <>
            <div className="mapa-ficha-tipo"><span className={`mapa-legenda-sinal mapa-mini-${selecionado.tipo}`} />{TIPO_SINGULAR[selecionado.tipo]}</div><h3>{selecionado.rotulo}</h3><p className="mapa-ficha-papel">{selecionado.papel}</p><Status confianca={selecionado.confianca} /><p className="mapa-ficha-resumo">{selecionado.resumo}</p>
            {!!conexoes.length && <section><h4>Todas as relações <span>{conexoes.length}</span></h4>{conexoes.length > conexoesVisuais.length && <p className="mapa-ficha-nota">O mapa mostra as {conexoesVisuais.length} conexões mais relevantes para preservar a leitura.</p>}<ul className="mapa-ficha-relacoes">{conexoes.map((aresta) => { const outro = porId.get(aresta.from === selecionado.id ? aresta.to : aresta.from); if (!outro) return null; return <li key={aresta.id}><button type="button" onClick={() => selecionarRelacao(aresta)}><span>{aresta.from === selecionado.id ? "→" : "←"}</span><span><strong>{aresta.rotulo}</strong><small>{outro.rotulo}</small></span></button></li>; })}</ul></section>}
            {!!selecionado.eventos.length && <section><h4>Acontecimentos relacionados <span>{selecionado.eventos.length}</span></h4><ul className="mapa-ficha-eventos">{selecionado.eventos.slice(-4).reverse().map((evento) => <li key={evento.id}><time>{dataBR(evento.data)}</time><Link href={`/eventos/${evento.id}`}>{evento.titulo}</Link></li>)}</ul></section>}
            <div className="mapa-ficha-fontes">{selecionado.revisado_em && <small>Revisado em {dataBR(selecionado.revisado_em)}</small>}<a href={selecionado.source_url} target="_blank" rel="noopener noreferrer">Abrir fonte <span aria-hidden="true">↗</span><small>{selecionado.source_name}{selecionado.source_date ? ` · ${dataBR(selecionado.source_date)}` : ""}</small></a></div>
            <Link className="mapa-ficha-pagina" href={selecionado.href}>Ver página completa <span aria-hidden="true">→</span></Link>
          </>}
          {relacaoSelecionada && origemRelacao && destinoRelacao && <>
            <div className="mapa-ficha-tipo"><span className="mapa-linha-amostra" />Relação documentada</div><h3>{relacaoSelecionada.rotulo}</h3><Status confianca={relacaoSelecionada.confianca} />
            <div className="mapa-relacao-pontas"><button type="button" onClick={() => selecionarNo(origemRelacao)}><small>Origem</small><strong>{origemRelacao.rotulo}</strong></button><span aria-label={relacaoSelecionada.direcionada ? "Relação direcionada" : "Relação sem direção"}>{relacaoSelecionada.direcionada ? "→" : "—"}</span><button type="button" onClick={() => selecionarNo(destinoRelacao)}><small>Destino</small><strong>{destinoRelacao.rotulo}</strong></button></div>
            {relacaoSelecionada.contexto && <section><h4>Contexto</h4><p className="mapa-ficha-resumo">{relacaoSelecionada.contexto}</p></section>}<div className="mapa-ficha-fontes"><a href={relacaoSelecionada.source_url} target="_blank" rel="noopener noreferrer">Abrir fonte da relação <span aria-hidden="true">↗</span><small>{relacaoSelecionada.source_name}{relacaoSelecionada.source_date ? ` · ${dataBR(relacaoSelecionada.source_date)}` : ""}</small></a></div>
          </>}
        </aside>}
      </div>
      <div className="mapa-instrucoes" aria-label="Como usar o mapa"><p>Arraste para mover · role ou use os botões para aproximar · selecione nós e linhas para consultar detalhes e fontes.</p><p>Documentos aparecem quando o processo relacionado já integra o mapa. A ficha da entidade mantém a leitura integral das relações.</p></div>
    </div>
  );
}
