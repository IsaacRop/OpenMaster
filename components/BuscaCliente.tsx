"use client";

import Link from "next/link";
import MiniSearch, { type SearchResult } from "minisearch";
import { useEffect, useMemo, useRef, useState } from "react";

import type { DocBusca } from "@/lib/busca";
import type { TipoEntidade } from "@/lib/backlinks";
import { TipoBadge } from "./Entidade";

/**
 * Busca inteira no navegador, sobre o índice gerado em build time. Nenhuma
 * consulta sai da máquina de quem pesquisa — num painel sobre investigação
 * criminal isso não é detalhe de arquitetura, é parte do que o painel promete.
 */

const ORDEM_TIPO: TipoEntidade[] = ["processo", "documento", "evento", "pessoa"];

const TITULO_GRUPO: Record<TipoEntidade, string> = {
  processo: "Processos",
  documento: "Documentos",
  evento: "Eventos da linha do tempo",
  pessoa: "Pessoas e instituições",
};

type Resultado = DocBusca & SearchResult;

/** Recorta o texto ao redor do primeiro termo encontrado, para dar contexto. */
function trecho(texto: string, termos: string[], limite = 190): string {
  if (!texto) return "";
  const alvo = termos
    .map((t) => texto.toLowerCase().indexOf(t.toLowerCase()))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];

  if (alvo === undefined || alvo < limite) {
    return texto.length > limite ? texto.slice(0, limite).trimEnd() + "…" : texto;
  }
  const inicio = Math.max(0, alvo - 60);
  return "…" + texto.slice(inicio, inicio + limite).trimEnd() + "…";
}

/** Marca as ocorrências dos termos sem usar dangerouslySetInnerHTML. */
function Realce({ texto, termos }: { texto: string; termos: string[] }) {
  const validos = termos.filter((t) => t.length > 1);
  if (validos.length === 0) return <>{texto}</>;

  const escapado = validos.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const partes = texto.split(new RegExp(`(${escapado})`, "gi"));
  const alvos = new Set(validos.map((t) => t.toLowerCase()));

  return (
    <>
      {partes.map((parte, i) =>
        alvos.has(parte.toLowerCase()) ? (
          <mark key={i} className="bg-accent-soft text-ink">
            {parte}
          </mark>
        ) : (
          <span key={i}>{parte}</span>
        ),
      )}
    </>
  );
}

export default function BuscaCliente({ indice }: { indice: DocBusca[] }) {
  const [consulta, setConsulta] = useState("");
  const [tiposOcultos, setTiposOcultos] = useState<Set<TipoEntidade>>(new Set());
  const input = useRef<HTMLInputElement>(null);

  const mini = useMemo(() => {
    const ms = new MiniSearch<DocBusca>({
      fields: ["titulo", "subtitulo", "texto"],
      storeFields: ["tipo", "titulo", "subtitulo", "texto", "href", "data", "grau"],
      // Acentuação: quem digita "oficio" tem que achar "Ofício".
      processTerm: (termo) =>
        termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
      searchOptions: {
        prefix: true,
        fuzzy: 0.2,
        boost: { titulo: 3, subtitulo: 2 },
      },
    });
    ms.addAll(indice);
    return ms;
  }, [indice]);

  // O campo de busca do cabeçalho chega aqui como `/busca?q=`.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setConsulta(q);
    input.current?.focus();
  }, []);

  const termos = consulta.trim().split(/\s+/).filter(Boolean);

  const resultados = useMemo(() => {
    if (consulta.trim().length < 2) return [];
    return mini.search(consulta) as Resultado[];
  }, [consulta, mini]);

  const visiveis = resultados.filter((r) => !tiposOcultos.has(r.tipo));

  const contagem = (tipo: TipoEntidade) => resultados.filter((r) => r.tipo === tipo).length;

  function alternarTipo(tipo: TipoEntidade) {
    setTiposOcultos((atual) => {
      const novo = new Set(atual);
      if (novo.has(tipo)) novo.delete(tipo);
      else novo.add(tipo);
      return novo;
    });
  }

  return (
    <div>
      <div className="border-y-2 border-ink py-3">
        <label htmlFor="busca" className="kicker">
          Buscar em {indice.length} registros
        </label>
        <input
          id="busca"
          ref={input}
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="relatoria, sigilo, delegados, Ofício GMAM…"
          autoComplete="off"
          className="headline mt-1 w-full border-0 bg-transparent p-0 text-3xl text-ink outline-none placeholder:text-ink-3/60 focus:ring-0"
        />
      </div>

      {consulta.trim().length >= 2 && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="kicker" aria-live="polite" aria-atomic="true">
              {visiveis.length} {visiveis.length === 1 ? "resultado" : "resultados"}
            </span>
            {ORDEM_TIPO.filter((t) => contagem(t) > 0).map((t) => {
              const oculto = tiposOcultos.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => alternarTipo(t)}
                  aria-pressed={!oculto}
                  className={`numero border px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.12em] transition-colors ${
                    oculto
                      ? "border-rule text-ink-3 line-through"
                      : "border-ink bg-ink text-surface"
                  }`}
                >
                  {TITULO_GRUPO[t]} {contagem(t)}
                </button>
              );
            })}
          </div>

          {visiveis.length === 0 ? (
            <p className="mt-8 text-base text-ink-2">
              Nada encontrado para <span className="headline text-ink">{consulta}</span>. O índice
              cobre só o cluster de processos já mapeado — se o termo é de fora dele, a ausência
              aqui não significa ausência no mundo.
            </p>
          ) : (
            <div className="mt-6 space-y-8">
              {ORDEM_TIPO.map((tipo) => {
                const doTipo = visiveis.filter((r) => r.tipo === tipo);
                if (doTipo.length === 0) return null;
                return (
                  <section key={tipo}>
                    <h3 className="kicker border-b border-ink pb-1">
                      {TITULO_GRUPO[tipo]} · {doTipo.length}
                    </h3>
                    <ul className="divide-y divide-rule">
                      {doTipo.map((r) => (
                        <li key={r.id} className="py-3">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <TipoBadge tipo={r.tipo} />
                            <Link
                              href={r.href}
                              className="headline text-lg text-ink no-underline hover:text-accent"
                            >
                              <Realce texto={r.titulo} termos={termos} />
                            </Link>
                            <span className="kicker normal-case tracking-normal">
                              {r.subtitulo}
                            </span>
                          </div>
                          {r.texto && (
                            <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-ink-2">
                              <Realce texto={trecho(r.texto, termos)} termos={termos} />
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
