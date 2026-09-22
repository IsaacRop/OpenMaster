/**
 * Arquitetura da navegação, num lugar só: o cabeçalho do desktop, a gaveta
 * e a barra de abas do celular leem daqui, para que uma seção nova não
 * apareça num menu e falte no outro.
 */

import type { NomeIcone } from "./Icone";

export type ItemNav = { href: string; label: string; icone: NomeIcone; curto?: string; descricao?: string };

/** O que o leitor procura primeiro: ficam sempre à vista. */
export const PRIMARIOS: ItemNav[] = [
  { href: "/", label: "Início", icone: "inicio" },
  { href: "/mapa", label: "Mapa", icone: "mapa" },
  { href: "/conversas", label: "Conversas", icone: "conversas" },
  { href: "/agente", label: "Agente IA", icone: "faisca", curto: "Agente" },
];

/** A base de consulta: agrupada em "Explorar". */
export const SECUNDARIOS: ItemNav[] = [
  { href: "/timeline", icone: "relogio", label: "Linha do tempo", descricao: "Os acontecimentos em ordem, com fonte" },
  { href: "/processos", icone: "balanca", label: "Processos", descricao: "As frentes do caso e seu estado" },
  { href: "/pessoas", icone: "pessoas", label: "Pessoas e instituições", descricao: "Quem é quem e qual o papel de cada um" },
  { href: "/documentos", icone: "documento", label: "Documentos", descricao: "Decisões, liminares e ofícios citados" },
  { href: "/busca", icone: "busca", label: "Busca", descricao: "Texto completo, no seu navegador" },
  { href: "/metodologia", icone: "livro", label: "Metodologia", descricao: "De onde vêm os dados e como corrigir" },
];

export function ativo(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href === "/timeline" && pathname.startsWith("/eventos/")) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const explorarAtivo = (pathname: string) => SECUNDARIOS.some((item) => ativo(item.href, pathname));
