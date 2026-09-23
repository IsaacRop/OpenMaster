/**
 * Ícones de traço, desenhados à mão em 24×24. São poucos e fixos: uma
 * biblioteca inteira de ícones pesaria mais que o resto do cabeçalho.
 */
const TRACOS = {
  inicio: <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5h-5v5H4Z" strokeLinejoin="round" />,
  mapa: (
    <>
      <circle cx="6" cy="7" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="12" cy="17" r="2.2" />
      <path d="M8 8.2 10.8 15M16.6 7.8 13.1 15M8.2 7h7.6" />
    </>
  ),
  conversas: <path d="M6.5 5h11A2.5 2.5 0 0 1 20 7.5v6a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5V16a2.5 2.5 0 0 1-2.5-2.5v-6A2.5 2.5 0 0 1 6.5 5Z" strokeLinejoin="round" />,
  agente: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  explorar: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.8" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" />
    </>
  ),
  busca: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  relogio: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinejoin="round" />
    </>
  ),
  balanca: (
    <>
      <path d="M12 4v16M8 20h8M5 7h14" />
      <path d="m5 7-2.5 6a2.5 2.5 0 0 0 5 0Zm14 0-2.5 6a2.5 2.5 0 0 0 5 0Z" strokeLinejoin="round" />
    </>
  ),
  pessoas: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14a5.5 5.5 0 0 1 3 5" />
    </>
  ),
  documento: (
    <>
      <path d="M6 3.5h8l4 4V20.5H6Z" strokeLinejoin="round" />
      <path d="M14 3.5v4h4M9 12h6M9 15.5h6" />
    </>
  ),
  livro: (
    <>
      <path d="M4 5.5c3-1 5.5-1 8 .8 2.5-1.8 5-1.8 8-.8V19c-3-1-5.5-1-8 .8-2.5-1.8-5-1.8-8-.8Z" strokeLinejoin="round" />
      <path d="M12 6.3v13.5" />
    </>
  ),
  calendario: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  atividade: <path d="M3 12h4l2.5-6 5 12 2.5-6h4" strokeLinejoin="round" />,
  estrela: <path d="M12 3.5 14.4 9l5.6.5-4.3 3.7 1.3 5.6L12 15.9l-5 2.9 1.3-5.6L4 9.5 9.6 9Z" strokeLinejoin="round" />,
  faisca: <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7ZM18.5 15.5c.25 1.6.9 2.25 2.5 2.5-1.6.25-2.25.9-2.5 2.5-.25-1.6-.9-2.25-2.5-2.5 1.6-.25 2.25-.9 2.5-2.5Z" strokeLinejoin="round" />,
  direita: <path d="M5 12h14m-5-5 5 5-5 5" strokeLinejoin="round" />,
  externo: <path d="M14 4.5h5.5V10M19.5 4.5 11 13M17 13.5v5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7H10" strokeLinejoin="round" />,
  filtro: <path d="M4 6h16M7 12h10M10 18h4" />,
  fechar: <path d="M6 6l12 12M18 6 6 18" />,
  seta: <path d="m7 10 5 5 5-5" />,
} as const;

export type NomeIcone = keyof typeof TRACOS;

export default function Icone({
  nome,
  tamanho = 20,
  className = "",
}: {
  nome: NomeIcone;
  tamanho?: number;
  className?: string;
}) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {TRACOS[nome]}
    </svg>
  );
}
