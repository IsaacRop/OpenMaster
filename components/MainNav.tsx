"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Visão geral" },
  { href: "/agente", label: "Agente IA" },
  { href: "/timeline", label: "Linha do tempo" },
  { href: "/processos", label: "Processos" },
  { href: "/pessoas", label: "Pessoas e instituições" },
  { href: "/documentos", label: "Documentos" },
  { href: "/busca", label: "Busca literal" },
];

export default function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="min-w-0 overflow-x-auto">
      <ul className="flex min-w-max items-center gap-1">
        {NAV.map((item) => {
          const ativo = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href) ||
              (item.href === "/timeline" && pathname.startsWith("/eventos/"));

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`nav-link ${ativo ? "nav-link-active" : ""}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
