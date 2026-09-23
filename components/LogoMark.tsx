/**
 * Um M em planta baixa, com a porta aberta: as pernas e o vértice são
 * paredes; na base, a abertura com o arco tracejado de uma porta. O traço
 * usa o gradiente metálico `omgold` (ver DefsMarca).
 *
 * `simples`: em tamanhos pequenos a porta e as bases somem, fica só o M.
 */
export default function LogoMark({ size = 30, simples = false }: { size?: number; simples?: boolean }) {
  if (simples) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
        <path d="M11 37V11L24 25.5L37 11V37" fill="none" stroke="var(--color-accent)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="46" height="46" rx="12" fill="var(--color-bg)" stroke="url(#omgold)" strokeWidth="1.5" />
      <path
        d="M11 37V11L24 25.5L37 11V37M11 37H18M30 37H37"
        fill="none"
        stroke="url(#omgold)"
        strokeWidth="3.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M18 37A12 12 0 0 1 30 25.5" fill="none" stroke="var(--color-accent)" strokeWidth="1.2" strokeDasharray="2 2.4" />
      <path d="M30 37V25.5" stroke="var(--color-accent)" strokeWidth="1.6" />
    </svg>
  );
}
