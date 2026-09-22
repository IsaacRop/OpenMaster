import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import ConditionalDisclaimer from "@/components/ConditionalDisclaimer";
import SiteHeader from "@/components/SiteHeader";
import TabBar from "@/components/TabBar";
import { COR_TEMA, SCRIPT_TEMA } from "@/components/tema";
import { dataCorte } from "@/lib/data";
import "./globals.css";

/*
 * Duas vozes, ambas sem serifa: Plus Jakarta Sans nos títulos (formas
 * abertas e amigáveis) e Inter na interface, no corpo e nos números (os
 * algarismos tabulares dela dispensam uma fonte mono).
 */
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-jakarta",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://openmaster.vercel.app"),
  title: "OpenMaster — o caso Banco Master, com fonte em cada linha",
  description:
    "Acompanhamento independente do caso Banco Master: processos, documentos, linha do tempo, mapa de envolvidos e um agente de IA, com a fonte de cada afirmação.",
};

export const viewport: Viewport = {
  // Sem `cover`, `env(safe-area-inset-bottom)` vale zero no iOS e a barra de
  // abas fica sob o indicador de início.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: COR_TEMA.light },
    { media: "(prefers-color-scheme: dark)", color: COR_TEMA.dark },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `data-theme` é escrito pelo script abaixo antes da hidratação.
    <html lang="pt-BR" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-screen antialiased">
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>

        <SiteHeader dataCorteBR={dataCorte.split("-").reverse().join("/")} />

        <main id="conteudo" className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </main>

        <ConditionalDisclaimer />
        <TabBar />
      </body>
    </html>
  );
}
