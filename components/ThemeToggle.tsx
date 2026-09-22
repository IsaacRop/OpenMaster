"use client";

import { useEffect, useState } from "react";

import { CHAVE_TEMA, COR_TEMA, type Tema } from "./tema";

function temaEfetivo(): Tema {
  const forcado = document.documentElement.dataset.theme;
  if (forcado === "light" || forcado === "dark") return forcado;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Alterna entre claro e escuro e grava a escolha. O ícone é decidido pelo
 * CSS (que já sabe o tema antes da hidratação); aqui só o rótulo acessível,
 * que depende de ler o estado no cliente.
 */
export default function ThemeToggle() {
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => {
    setTema(temaEfetivo());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const aoMudar = () => setTema(temaEfetivo());
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, []);

  function alternar() {
    const proximo: Tema = temaEfetivo() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = proximo;
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute("content", COR_TEMA[proximo]));
    try {
      localStorage.setItem(CHAVE_TEMA, proximo);
    } catch {
      // Navegação privada ou armazenamento bloqueado: vale só para esta página.
    }
    setTema(proximo);
  }

  const rotulo = tema === "dark" ? "Ativar tema claro" : tema === "light" ? "Ativar tema escuro" : "Alternar tema";

  return (
    <button type="button" onClick={alternar} className="theme-toggle" aria-label={rotulo} title={rotulo}>
      <svg className="icone-lua" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" strokeLinejoin="round" />
      </svg>
      <svg className="icone-sol" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
      </svg>
    </button>
  );
}
