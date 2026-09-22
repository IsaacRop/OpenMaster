/**
 * Ícones de traço, desenhados à mão em 24×24. São poucos e fixos: uma
 * biblioteca inteira de ícones pesaria mais que o resto do cabeçalho.
 */
const TRACOS = {
  inicio: <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5h-5v5H4Z" />,
  mapa: (
    <>
      <circle cx="6" cy="7" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="12" cy="17" r="2.2" />
      <path d="M8 8.2 10.8 15M16.6 7.8 13.1 15M8.2 7h7.6" />
    </>
  ),
  conversas: <path d="M5 5h14v10H10l-4 3.5V15H5Z" strokeLinejoin="round" />,
  agente: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  explorar: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" />
    </>
  ),
  busca: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  fechar: <path d="M6 6l12 12M18 6 6 18" />,
  seta: <path d="m7 10 5 5 5-5" />,
} as const;

export type NomeIcone = keyof typeof TRACOS;

export default function Icone({ nome, tamanho = 20 }: { nome: NomeIcone; tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {TRACOS[nome]}
    </svg>
  );
}
