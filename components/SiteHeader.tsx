"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import Icone from "./Icone";
import LogoMark from "./LogoMark";
import ThemeToggle from "./ThemeToggle";
import { useDialogo } from "./useDialogo";
import { PRIMARIOS, SECUNDARIOS, ativo, explorarAtivo } from "./navegacao";

/** A barra de abas pede a gaveta por evento: os dois ficam em pontas opostas do `<body>`. */
export const EVENTO_ABRIR_MENU = "om:abrir-menu";

function SeloDados({ dataCorteBR }: { dataCorteBR: string }) {
  return (
    <Link href="/metodologia" className="selo-dados" title="Corte temporal da base — ver metodologia">
      <span aria-hidden="true" />
      Dados até {dataCorteBR}
    </Link>
  );
}

/**
 * "Explorar" no desktop. Padrão de *disclosure* (botão + lista de links), não
 * `role="menu"`: é navegação, e leitor de tela lê links como links. Fecha com
 * Esc (devolvendo o foco ao botão), clique fora, saída do foco e troca de rota.
 */
function MenuExplorar() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => setAberto(false), [pathname]);

  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener("pointerdown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("pointerdown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  return (
    <div
      ref={raiz}
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAberto(false);
      }}
    >
      <button
        ref={botao}
        type="button"
        className={`nav-link inline-flex items-center gap-1 ${explorarAtivo(pathname) ? "nav-link-active" : ""}`}
        aria-expanded={aberto}
        aria-controls="menu-explorar"
        onClick={() => setAberto((a) => !a)}
      >
        Explorar
        <span className={`transition-transform ${aberto ? "rotate-180" : ""}`}>
          <Icone nome="seta" tamanho={16} />
        </span>
      </button>
      <div id="menu-explorar" className="menu-explorar" hidden={!aberto}>
        <ul>
          {SECUNDARIOS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ativo(item.href, pathname) ? "page" : undefined}
                onClick={() => setAberto(false)}
              >
                <strong>{item.label}</strong>
                <span>{item.descricao}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Gaveta do celular. Diálogo modal de verdade: foco preso, Esc fecha, o
 * resto da página sai da árvore de acessibilidade (`inert`) e da rolagem.
 * O foco volta para quem abriu — o botão do cabeçalho ou a aba "Explorar".
 */
function Gaveta({ aberta, fechar, dataCorteBR }: { aberta: boolean; fechar: () => void; dataCorteBR: string }) {
  const pathname = usePathname();
  const painel = useRef<HTMLDivElement>(null);
  useDialogo(aberta, painel, fechar);

  if (!aberta) return null;

  const link = (href: string, label: string) => (
    <li key={href}>
      <Link href={href} aria-current={ativo(href, pathname) ? "page" : undefined} onClick={fechar}>
        {label}
      </Link>
    </li>
  );

  // Portal: o `backdrop-filter` do cabeçalho vira bloco de contenção de
  // `position: fixed`, e a gaveta ficaria presa à altura da barra.
  return createPortal(
    <div className="gaveta" ref={painel}>
      <div className="gaveta-fundo" onClick={fechar} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="gaveta-titulo" className="gaveta-painel">
        <div className="gaveta-topo">
          <p id="gaveta-titulo" className="kicker">Navegação</p>
          <button type="button" className="icone-botao" onClick={fechar} aria-label="Fechar menu" data-foco-inicial>
            <Icone nome="fechar" />
          </button>
        </div>
        <nav aria-label="Principal">
          <ul className="gaveta-primarios">{PRIMARIOS.map((i) => link(i.href, i.label))}</ul>
        </nav>
        <nav aria-label="Explorar a base">
          <p className="kicker mt-6">Explorar</p>
          <ul className="gaveta-secundarios">{SECUNDARIOS.map((i) => link(i.href, i.label))}</ul>
        </nav>
        <div className="mt-auto pt-6">
          <SeloDados dataCorteBR={dataCorteBR} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function SiteHeader({ dataCorteBR }: { dataCorteBR: string }) {
  const pathname = usePathname();
  const [gaveta, setGaveta] = useState(false);
  const fechar = useRef(() => setGaveta(false)).current;

  useEffect(() => setGaveta(false), [pathname]);
  useEffect(() => {
    const abrir = () => setGaveta(true);
    window.addEventListener(EVENTO_ABRIR_MENU, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_MENU, abrir);
  }, []);

  return (
    <header className="site-header">
      <div className="site-header-linha">
        <Link href="/" className="inline-flex shrink-0 items-center gap-2 no-underline" aria-label="OpenMaster — início">
          <LogoMark size={28} />
          <span className="wordmark">
            Open<b>Master</b>
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center">
            {PRIMARIOS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={ativo(item.href, pathname) ? "page" : undefined}
                  className={`nav-link ${ativo(item.href, pathname) ? "nav-link-active" : ""}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <MenuExplorar />
            </li>
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:gap-3">
          <form action="/busca" role="search" className="busca-compacta hidden lg:flex">
            <Icone nome="busca" tamanho={16} />
            <label htmlFor="busca-cabecalho" className="sr-only">
              Buscar na base
            </label>
            <input id="busca-cabecalho" name="q" type="search" placeholder="Buscar" autoComplete="off" />
          </form>
          <span className="hidden lg:inline-flex">
            <SeloDados dataCorteBR={dataCorteBR} />
          </span>
          <Link href="/busca" className="icone-botao lg:hidden" aria-label="Buscar na base">
            <Icone nome="busca" />
          </Link>
          <ThemeToggle />
          <button
            type="button"
            className="icone-botao lg:hidden"
            aria-label="Abrir menu"
            aria-expanded={gaveta}
            onClick={() => setGaveta(true)}
          >
            <Icone nome="menu" />
          </button>
        </div>
      </div>

      <Gaveta aberta={gaveta} fechar={fechar} dataCorteBR={dataCorteBR} />
    </header>
  );
}
