"use client";

import { useState, type ReactNode } from "react";

/**
 * Filtro do extrato da capa. As linhas são renderizadas no servidor; aqui só
 * se escolhe o tipo, e o CSS esconde o resto (`[data-filtro]` em
 * globals.css). Assim a lista chega inteira no HTML e o cliente não carrega
 * o schema nem os componentes de fonte.
 */
export default function FiltroExtrato({
  tipos,
  cabeca,
  children,
}: {
  tipos: { valor: string; rotulo: string }[];
  cabeca: ReactNode;
  children: ReactNode;
}) {
  const [filtro, setFiltro] = useState("todas");
  const opcoes = [{ valor: "todas", rotulo: "Todas" }, ...tipos];

  return (
    <div data-filtro={filtro}>
      <div className="extrato-cabeca">
        {cabeca}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo">
          {opcoes.map((o) => (
            <button
              key={o.valor}
              type="button"
              className="pilula"
              aria-pressed={filtro === o.valor}
              onClick={() => setFiltro(o.valor)}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
