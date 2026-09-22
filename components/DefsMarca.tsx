/**
 * Definições SVG compartilhadas pela identidade, montadas uma vez no layout.
 * SVGs de uma mesma página enxergam os `id`s uns dos outros, então o logo, os
 * traços a lápis, os carimbos e os nós do mapa só apontam para cá.
 *
 * - `omp`: o traço a lápis. Uma leve distorção da linha e falhas de grafite.
 * - `omstamp`: tinta de carimbo, com falhas onde o papel não pegou.
 * - `omgold`: o reflexo metálico azul do símbolo.
 * - `om-listras`: as listras diagonais do retrato ausente (pessoa sem foto).
 */
export default function DefsMarca() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        <filter id="omp" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={2} seed={3} result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale={3} result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves={1} seed={9} result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.7 1.3" result="ga" />
          <feComposite in="d" in2="ga" operator="in" />
        </filter>
        <filter id="omstamp" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={4} result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.6" result="ga" />
          <feComposite in="SourceGraphic" in2="ga" operator="in" />
        </filter>
        <linearGradient id="omgold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3C5E9E" />
          <stop offset=".4" stopColor="#A9C1E8" />
          <stop offset=".52" stopColor="#FFFFFF" />
          <stop offset=".66" stopColor="#7A98CF" />
          <stop offset="1" stopColor="#2B4A85" />
        </linearGradient>
        <pattern id="om-listras" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="#2A2723" />
          <rect width="5" height="10" fill="#34302B" />
        </pattern>
      </defs>
    </svg>
  );
}
