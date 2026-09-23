import { NIVEL_PRESENCA_LABEL, type NivelPresenca } from "@/lib/schema";

const ESTILO: Record<NivelPresenca, string> = {
  central: "bg-accent-soft text-accent",
  recorrente: "bg-surface-2 text-ink-2",
  periferico: "bg-surface-2 text-ink-3",
};

const TITULO: Record<NivelPresenca, string> = {
  central: "Protagonismo nos fatos: pratica ou sofre os atos que movem o caso.",
  recorrente: "Reaparece em vários momentos do caso, sem ser o eixo deles.",
  periferico: "Entra em um ponto específico do caso e não volta.",
};

/**
 * Nível de presença é julgamento editorial declarado, não contagem. Fica ao
 * lado do nome justamente para não ser confundido com o número de backlinks,
 * que aparece logo abaixo e mede outra coisa.
 */
export function NivelBadge({ nivel }: { nivel: NivelPresenca }) {
  return (
    <span
      title={TITULO[nivel]}
      className={`inline-block rounded-full ${ESTILO[nivel]} px-2 py-0.5 text-[0.72rem] font-medium`}
    >
      {NIVEL_PRESENCA_LABEL[nivel]}
    </span>
  );
}
