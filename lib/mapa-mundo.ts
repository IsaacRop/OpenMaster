import type { TipoNo } from "@/components/GrafoEnvolvidos";

/**
 * Constantes geométricas do mapa, compartilhadas entre o preparo dos dados
 * (`lib/grafo.ts`, servidor) e o desenho (`components/GrafoEnvolvidos.tsx`,
 * cliente).
 *
 * Mora num módulo próprio por causa do bundle: `lib/grafo` importa todos os
 * JSONs de `lib/data`, então um `import` dele a partir do componente cliente
 * arrastaria a base inteira para o navegador. Aqui não há dado, só números.
 */

/**
 * Mundo do mapa. Cresceu de 1260×800 para dar respiro. As marcas dos nós têm
 * tamanho fixo em unidades de mundo, então ampliar o mundo e mantê-las reduz a
 * fração da tela que cada uma ocupa — o enquadramento inicial continua cabendo
 * inteiro, só que com mais espaço entre as coisas. O ganho vertical é maior
 * que o horizontal de propósito.
 */
export const MUNDO = { largura: 1760, altura: 1160 };

/** Espaço em que as posições de `pos` foram desenhadas à mão, nos dados. */
export const CURADO = { largura: 1260, altura: 800 };

/**
 * Meia-extensão da marca de cada tipo, espelhando o que `MarcaNo` desenha.
 * É a caixa que não pode encostar na do vizinho.
 */
export function meiaExtensao(tipo: TipoNo) {
  if (tipo === "processo") return { x: 39, y: 23 };
  if (tipo === "documento") return { x: 19, y: 24 };
  // Quadrado de 42 girado 45°: a diagonal é que define a extensão.
  if (tipo === "instituicao") return { x: 30, y: 30 };
  return { x: 24, y: 24 };
}
