import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Inter, Newsreader } from "next/font/google";

import ConditionalDisclaimer from "@/components/ConditionalDisclaimer";
import LogoMark from "@/components/LogoMark";
import MainNav from "@/components/MainNav";
import ThemeToggle from "@/components/ThemeToggle";
import { COR_TEMA, SCRIPT_TEMA } from "@/components/tema";
import { dataCorte } from "@/lib/data";
import "./globals.css";

/*
 * Três vozes: Newsreader para o que é manchete (tem eixo de tamanho óptico,
 * então o mesmo arquivo serve ao título de 52px e ao de 17px), Inter para a
 * interface e o corpo, IBM Plex Mono para datas, números e metadados.
 */
const serif = Newsreader({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://openmaster.vercel.app"),
  title: "OpenMaster — o caso Banco Master, com fonte em cada linha",
  description:
    "Acompanhamento independente do caso Banco Master: processos, documentos, linha do tempo, mapa de envolvidos e um agente de IA, com a fonte de cada afirmação.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: COR_TEMA.light },
    { media: "(prefers-color-scheme: dark)", color: COR_TEMA.dark },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `data-theme` é escrito pelo script abaixo antes da hidratação.
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-screen antialiased">
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>

        <header className="site-header">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
            <Link href="/" className="inline-flex shrink-0 items-center gap-2.5 no-underline" aria-label="OpenMaster - início">
              <LogoMark size={30} />
              <span className="wordmark">
                Open<b>Master</b>
              </span>
            </Link>

            <div className="order-3 w-full border-t border-rule pt-1 lg:order-none lg:w-auto lg:border-0 lg:pt-0">
              <MainNav />
            </div>

            <Link href="/agente" className="search-affordance ml-auto lg:min-w-64 lg:flex-1">
              <span className="text-accent" aria-hidden="true">⌁</span>
              <span className="hidden sm:inline">Perguntar ao agente…</span>
              <span className="sm:hidden">Agente IA</span>
            </Link>

            <Link href="/metodologia" className="status-line hidden xl:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              Dados até {dataCorte.split("-").reverse().join("/")}
            </Link>

            <ThemeToggle />
          </div>
        </header>

        <main id="conteudo" className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </main>

        <ConditionalDisclaimer />
      </body>
    </html>
  );
}
