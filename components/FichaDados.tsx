import type { ReactNode } from "react";

/**
 * Metadados de uma página de entidade como lista de definição: rótulo e
 * valor em pares. No celular cada par é uma linha (rótulo à esquerda); do
 * tablet em diante, colunas com o rótulo em cima. Antes eram selos soltos
 * ao lado do título, que no celular quebravam em três linhas sem ordem.
 */
export default function FichaDados({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <dl className="ficha-dados">
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo}>
          <dt>{rotulo}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
