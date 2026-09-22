"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Icone, { type NomeIcone } from "./Icone";
import { EVENTO_ABRIR_MENU } from "./SiteHeader";
import { PRIMARIOS, ativo, explorarAtivo } from "./navegacao";

const ICONE: Record<string, NomeIcone> = {
  "/": "inicio",
  "/mapa": "mapa",
  "/conversas": "conversas",
  "/agente": "agente",
};

/**
 * Abas fixas do celular. Some na tela de uma conversa, que quer a altura
 * inteira para o chat e já tem o próprio "voltar". "Explorar" não é uma
 * rota: abre a mesma gaveta do botão de menu, com as seções secundárias.
 */
export default function TabBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/conversas/")) return null;

  return (
    <nav className="tab-bar lg:hidden" aria-label="Atalhos">
      <ul>
        {PRIMARIOS.map((item) => {
          const atual = ativo(item.href, pathname);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={atual ? "page" : undefined}>
                <Icone nome={ICONE[item.href]} />
                <span>{item.curto ?? item.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            aria-current={explorarAtivo(pathname) ? "page" : undefined}
            onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_MENU))}
          >
            <Icone nome="explorar" />
            <span>Explorar</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
