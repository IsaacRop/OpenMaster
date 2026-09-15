"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Visão geral" },
  { href: "/timeline", label: "O que aconteceu" },
  { href: "/pessoas", label: "Quem é quem" },
  { href: "/processos", label: "Processos" },
  { href: "/documentos", label: "Documentos" },
  { href: "/busca", label: "Buscar" },
];

export default function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="overflow-x-auto">
      <ul className="flex min-w-max items-center gap-1">
        {NAV.map((item) => {
          const ativo =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

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
