import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, IBM_Plex_Mono } from "next/font/google";

import Disclaimer from "@/components/Disclaimer";
import LogoMark from "@/components/LogoMark";
import MainNav from "@/components/MainNav";
import { dataCorte } from "@/lib/data";
import "./globals.css";

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono-stack",
  display: "swap",
});

const sans = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-stack",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OpenMaster — acompanhamento independente",
  description:
    "Acompanhamento público do cluster de processos do caso Banco Master / Daniel Vorcaro no STF: linha do tempo, estado de cada processo, peças identificadas e mapa navegável dos envolvidos, com fonte em cada afirmação.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${mono.variable} ${sans.variable}`}>
      <body className="min-h-screen antialiased">
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>

        <header className="site-header">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
            <Link href="/" className="inline-flex shrink-0 items-center gap-2.5 no-underline" aria-label="OpenMaster - início">
              <LogoMark size={30} />
              <span className="text-[1.08rem] tracking-[-0.025em]">
                <span className="font-normal text-ink">Open</span><span className="font-bold text-white">Master</span>
              </span>
            </Link>

            <div className="order-3 w-full border-t border-rule pt-1 lg:order-none lg:w-auto lg:border-0 lg:pt-0">
              <MainNav />
            </div>

            <Link href="/busca" className="search-affordance ml-auto lg:min-w-64 lg:flex-1">
              <span className="numero text-ink-3" aria-hidden="true">/</span>
              <span className="hidden sm:inline">Buscar processo, pessoa, documento…</span>
              <span className="sm:hidden">Buscar</span>
            </Link>

            <Link href="/metodologia" className="status-line hidden xl:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
              Dados até {dataCorte.split("-").reverse().join("/")}
            </Link>
          </div>
        </header>

        <main id="conteudo" className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </main>

        <Disclaimer />
      </body>
    </html>
  );
}
