import { grau } from "./backlinks";
import { arestasDoMapa, pessoas, processos } from "./data";
import type { ArestaGrafo, NoGrafo } from "@/components/GrafoEnvolvidos";

/**
 * Preparo dos dados do grafo para o componente cliente.
 *
 * Vive fora de `lib/data.ts` por uma razão de dependência: `lib/backlinks.ts`
 * importa `data`, então `data` não pode importar `backlinks` de volta. O grau
 * entra no nó aqui, no andar de cima, e é o mesmo número que a seção de
 * backlinks mostra na página da entidade — uma conta só, dois usos.
 */

export const nosGrafo: NoGrafo[] = [
  ...pessoas
    .filter((p) => p.pos)
    .map(
      (p): NoGrafo => ({
        id: p.id,
        rotulo: p.nome,
        papel: p.papel,
        grupo: p.grupo,
        nivel_presenca: p.nivel_presenca,
        grau: grau(p.id),
        pos: p.pos!,
        href: `/pessoas/${p.id}`,
      }),
    ),
  ...processos
    .filter((p) => p.pos)
    .map(
      (p): NoGrafo => ({
        id: p.id,
        rotulo: p.numero.replace("/DF", ""),
        papel: p.apelido,
        grupo: "processo",
        // Processo não tem nível de presença: o campo é da Pessoa. `null` diz
        // ao filtro para nunca escondê-lo por esse critério.
        nivel_presenca: null,
        grau: grau(p.id),
        pos: p.pos!,
        href: `/processos/${p.id}`,
      }),
    ),
];

export const arestasGrafo: ArestaGrafo[] = arestasDoMapa.map(
  (r): ArestaGrafo => ({
    id: r.id,
    from: r.from,
    to: r.to,
    rotulo: r.rotulo,
    peso: r.peso,
    direcionada: r.direcionada,
    apuracao: r.confianca !== "confirmado",
  }),
);
