import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Inter, Source_Serif_4 } from "next/font/google";

import Disclaimer from "@/components/Disclaimer";
import MainNav from "@/components/MainNav";
import { dataCorte } from "@/lib/data";
import "./globals.css";

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif-stack",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono-stack",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
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
    <html lang="pt-BR" className={`${serif.variable} ${mono.variable} ${sans.variable}`}>
      <body className="min-h-screen antialiased">
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>

        <header className="site-header">
          <div className="mx-auto max-w-6xl px-5">
            <div className="flex min-h-7 items-center justify-between gap-4 border-b border-rule/70 py-1.5">
              <p className="status-line">
                <span className="status-dot" aria-hidden="true" />
                Base pública verificada até {dataCorte.split("-").reverse().join("/")}
              </p>
              <Link href="/metodologia" className="meta-link hidden sm:inline-flex">
                Como verificamos
              </Link>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 py-5">
              <Link href="/" className="group inline-flex items-center gap-3 no-underline">
                <span className="brand-mark" aria-hidden="true">OM</span>
                <span>
                  <span className="block text-[1.55rem] font-semibold leading-none tracking-[-0.04em] text-ink sm:text-[1.8rem]">
                    OpenMaster
                  </span>
                  <span className="mt-1 block font-mono text-[0.7rem] uppercase tracking-[0.16em] text-ink-3">
                    inteligência pública acessível
                  </span>
                </span>
              </Link>

              <p className="hidden max-w-sm text-right text-sm leading-relaxed text-ink-2 lg:block">
                Processos, decisões e pessoas conectados a partir de fontes públicas.
              </p>
            </div>

            <MainNav />
          </div>
        </header>

        <main id="conteudo" className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
          {children}
        </main>

        <Disclaimer />
      </body>
    </html>
  );
}
