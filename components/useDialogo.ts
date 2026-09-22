"use client";

import { useEffect, type RefObject } from "react";

/**
 * Comportamento de diálogo modal, compartilhado pela gaveta e pela folha de
 * filtros: foco preso dentro de `painel`, Esc fecha, o resto da página fica
 * `inert` e sem rolagem, e o foco volta para quem abriu.
 *
 * `painel` precisa ser (ou estar dentro de) um filho direto do `<body>` —
 * os irmãos dele é que viram `inert`.
 */
export function useDialogo(aberto: boolean, painel: RefObject<HTMLElement | null>, fechar: () => void) {
  useEffect(() => {
    if (!aberto || !painel.current) return;
    const origem = document.activeElement as HTMLElement | null;
    const irmaos = [...document.body.children].filter(
      (el) => !el.contains(painel.current) && el.tagName !== "SCRIPT",
    ) as HTMLElement[];
    irmaos.forEach((el) => (el.inert = true));
    document.documentElement.classList.add("sem-rolagem");
    (painel.current.querySelector<HTMLElement>("[data-foco-inicial]") ?? painel.current).focus();

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        fechar();
        return;
      }
      if (e.key !== "Tab" || !painel.current) return;
      const focaveis = [
        ...painel.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled])",
        ),
      ];
      const primeiro = focaveis[0];
      const ultimo = focaveis.at(-1);
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo?.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro?.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      irmaos.forEach((el) => (el.inert = false));
      document.documentElement.classList.remove("sem-rolagem");
      origem?.focus();
    };
  }, [aberto, painel, fechar]);
}
