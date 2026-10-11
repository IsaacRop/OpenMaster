"use client";

import { useEffect } from "react";

const SEGUNDOS_MINIMOS = 10;
const CHAVE_SESSAO = "om:acesso-contado";

/**
 * Conta um acesso quando a pessoa passa 10 segundos com a aba à vista. Só o
 * tempo visível vale (aba em segundo plano pausa o relógio), e é uma vez por
 * sessão do navegador: navegar entre páginas ou recarregar não soma de novo.
 */
export default function RegistrarVisita() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(CHAVE_SESSAO)) return;
    } catch {
      // Sem sessionStorage: conta mesmo assim, uma vez por carregamento.
    }

    let restanteMs = SEGUNDOS_MINIMOS * 1000;
    let inicio = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const contar = () => {
      try {
        sessionStorage.setItem(CHAVE_SESSAO, "1");
      } catch {}
      fetch("/api/visitas", { method: "POST" }).catch(() => {});
    };
    const iniciar = () => {
      inicio = Date.now();
      timer = setTimeout(contar, restanteMs);
    };
    const pausar = () => {
      clearTimeout(timer);
      restanteMs -= Date.now() - inicio;
    };
    const aoMudarVisibilidade = () => (document.hidden ? pausar() : iniciar());

    if (!document.hidden) iniciar();
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    };
  }, []);

  return null;
}
