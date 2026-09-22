/**
 * Arquitetura da navegação, num lugar só: o cabeçalho do desktop, a gaveta
 * e a barra de abas do celular leem daqui, para que uma seção nova não
 * apareça num menu e falte no outro.
 */

export type ItemNav = { href: string; label: string; curto?: string; descricao?: string };

/** O que o leitor procura primeiro: ficam sempre à vista. */
export const PRIMARIOS: ItemNav[] = [
  { href: "/", label: "Início" },
  { href: "/mapa", label: "Mapa" },
  { href: "/conversas", label: "Conversas" },
  { href: "/agente", label: "Agente IA", curto: "Agente" },
];

/** A base de consulta: agrupada em "Explorar". */
export const SECUNDARIOS: ItemNav[] = [
  { href: "/timeline", label: "Linha do tempo", descricao: "Os acontecimentos em ordem, com fonte" },
  { href: "/processos", label: "Processos", descricao: "As frentes do caso e seu estado" },
  { href: "/pessoas", label: "Pessoas e instituições", descricao: "Quem é quem e qual o papel de cada um" },
  { href: "/documentos", label: "Documentos", descricao: "Decisões, liminares e ofícios citados" },
  { href: "/busca", label: "Busca", descricao: "Texto completo, no seu navegador" },
  { href: "/metodologia", label: "Metodologia", descricao: "De onde vêm os dados e como corrigir" },
];

export function ativo(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href === "/timeline" && pathname.startsWith("/eventos/")) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const explorarAtivo = (pathname: string) => SECUNDARIOS.some((item) => ativo(item.href, pathname));
