"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Filtros cruzados, com o estado inteiro na query string.
 *
 * O estado mora na URL e não no componente por um motivo editorial, não
 * técnico: "os eventos em apuração que tocam a Pet 16.662 entre 08 e 12/09" é
 * uma afirmação que alguém vai querer citar, e citação precisa de endereço.
 * Um filtro que só existe na memória do navegador não é citável.
 *
 * Os cartões já vêm renderizados do servidor em `cartoes`; aqui só se decide
 * quais aparecem. Assim o filtro não arrasta os dados nem o Zod para o
 * navegador — o cliente recebe metadados curtos e um mapa de nós prontos.
 */

export type MetaItem = {
  id: string;
  /** Ids de pessoas ligadas ao item, por qualquer caminho. */
  pessoas: string[];
  /** Tipos de evento associados (o próprio tipo, ou os dos eventos do processo). */
  tipos: string[];
  confianca: string;
  sigilo: string;
  /** ISO. Usada no filtro por intervalo. */
  data: string;
};

export type Opcao = { valor: string; rotulo: string };

export type Opcoes = {
  pessoas: Opcao[];
  tipos: Opcao[];
  confiancas: Opcao[];
  sigilos: Opcao[];
};

const CHAVES = ["pessoa", "tipo", "confianca", "sigilo", "de", "ate"] as const;
type Chave = (typeof CHAVES)[number];
type Valores = Record<Chave, string>;

const SEM_FILTROS: Valores = {
  pessoa: "",
  tipo: "",
  confianca: "",
  sigilo: "",
  de: "",
  ate: "",
};

function valoresDaUrl(): Valores {
  if (typeof window === "undefined") return SEM_FILTROS;
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(CHAVES.map((chave) => [chave, params.get(chave) ?? ""])) as Valores;
}

const ROTULO_CHAVE: Record<Chave, string> = {
  pessoa: "Envolvido",
  tipo: "Tipo de evento",
  confianca: "Confiança",
  sigilo: "Sigilo",
  de: "A partir de",
  ate: "Até",
};

function Campo({
  chave,
  valor,
  opcoes,
  aoMudar,
}: {
  chave: Chave;
  valor: string;
  opcoes: Opcao[];
  aoMudar: (chave: Chave, valor: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="kicker">{ROTULO_CHAVE[chave]}</span>
      <select
        value={valor}
        onChange={(e) => aoMudar(chave, e.target.value)}
        className="numero max-w-[15rem] border border-rule bg-surface px-2 py-1 text-sm text-ink outline-none focus:border-ink"
      >
        <option value="">todos</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}

function CampoData({
  chave,
  valor,
  aoMudar,
}: {
  chave: "de" | "ate";
  valor: string;
  aoMudar: (chave: Chave, valor: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="kicker">{ROTULO_CHAVE[chave]}</span>
      <input
        type="date"
        value={valor}
        onChange={(e) => aoMudar(chave, e.target.value)}
        className="numero border border-rule bg-surface px-2 py-1 text-sm text-ink outline-none focus:border-ink"
      />
    </label>
  );
}

export default function ListaFiltravel({
  itens,
  cartoes,
  opcoes,
  layout,
  rotuloVazio,
}: {
  itens: MetaItem[];
  cartoes: Record<string, ReactNode>;
  opcoes: Opcoes;
  /** `grade` para os cartões de processo, `linha` para a linha do tempo. */
  layout: "grade" | "linha";
  rotuloVazio: string;
}) {
  // Comecar sem filtros permite que o servidor entregue a lista completa no
  // primeiro HTML. `useSearchParams` suspendia toda a lista ate a hidratacao,
  // causando um grande salto de layout; a URL continua sendo a fonte citavel.
  const [atual, setAtual] = useState<Valores>(SEM_FILTROS);

  useEffect(() => {
    const sincronizar = () => setAtual(valoresDaUrl());
    sincronizar();
    window.addEventListener("popstate", sincronizar);
    return () => window.removeEventListener("popstate", sincronizar);
  }, []);

  function aplicar(chave: Chave, valor: string) {
    const novo = new URLSearchParams(window.location.search);
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    const query = novo.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    );
    setAtual(valoresDaUrl());
  }

  function limpar() {
    window.history.replaceState(null, "", window.location.pathname);
    setAtual(SEM_FILTROS);
  }

  const visiveis = useMemo(
    () =>
      itens.filter((i) => {
        if (atual.pessoa && !i.pessoas.includes(atual.pessoa)) return false;
        if (atual.tipo && !i.tipos.includes(atual.tipo)) return false;
        if (atual.confianca && i.confianca !== atual.confianca) return false;
        if (atual.sigilo && i.sigilo !== atual.sigilo) return false;
        if (atual.de && i.data < atual.de) return false;
        if (atual.ate && i.data > atual.ate) return false;
        return true;
      }),
    [itens, atual.pessoa, atual.tipo, atual.confianca, atual.sigilo, atual.de, atual.ate],
  );

  const ativos = CHAVES.filter((k) => atual[k]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-y border-rule py-3">
        <Campo chave="pessoa" valor={atual.pessoa} opcoes={opcoes.pessoas} aoMudar={aplicar} />
        <Campo chave="tipo" valor={atual.tipo} opcoes={opcoes.tipos} aoMudar={aplicar} />
        <Campo
          chave="confianca"
          valor={atual.confianca}
          opcoes={opcoes.confiancas}
          aoMudar={aplicar}
        />
        <Campo chave="sigilo" valor={atual.sigilo} opcoes={opcoes.sigilos} aoMudar={aplicar} />
        <CampoData chave="de" valor={atual.de} aoMudar={aplicar} />
        <CampoData chave="ate" valor={atual.ate} aoMudar={aplicar} />

        {ativos.length > 0 && (
          <button
            type="button"
            onClick={limpar}
            className="kicker border border-rule px-2 py-1.5 hover:border-accent hover:text-accent"
          >
            Limpar {ativos.length}
          </button>
        )}
      </div>

      <p className="kicker mt-2 normal-case tracking-normal">
        {visiveis.length} de {itens.length} · os filtros ficam na barra de endereços, então este
        recorte pode ser copiado e citado como link.
      </p>

      {visiveis.length === 0 ? (
        <p className="mt-8 max-w-3xl text-base text-ink-2">{rotuloVazio}</p>
      ) : layout === "grade" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((i) => (
            <div key={i.id} className="render-deferred-item">{cartoes[i.id]}</div>
          ))}
        </div>
      ) : (
        <ol className="relative mt-2">{visiveis.map((i) => cartoes[i.id])}</ol>
      )}
    </div>
  );
}
