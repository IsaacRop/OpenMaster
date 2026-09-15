import { NIVEL_PRESENCA_LABEL, type NivelPresenca } from "@/lib/schema";

const ESTILO: Record<NivelPresenca, string> = {
  central: "border-seal bg-seal text-paper-3",
  recorrente: "border-ink-2 text-ink-2",
  periferico: "border-rule text-ink-3",
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
      className={`numero inline-block border ${ESTILO[nivel]} px-1.5 py-px text-[0.625rem] uppercase tracking-[0.12em]`}
    >
      {NIVEL_PRESENCA_LABEL[nivel]}
    </span>
  );
}
