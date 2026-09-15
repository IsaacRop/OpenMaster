import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Inter, Source_Serif_4 } from "next/font/google";

import Disclaimer from "@/components/Disclaimer";
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

const NAV = [
  { href: "/", label: "Capa" },
  { href: "/processos", label: "Processos" },
  { href: "/timeline", label: "Linha do tempo" },
  { href: "/documentos", label: "Documentos" },
  { href: "/pessoas", label: "Envolvidos" },
  { href: "/busca", label: "Busca" },
  { href: "/metodologia", label: "Metodologia" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${mono.variable} ${sans.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="border-b border-rule">
          <div className="mx-auto max-w-6xl px-5 pt-6 pb-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <Link href="/" className="no-underline">
                <h1 className="headline text-3xl sm:text-4xl text-ink">
                  OpenMaster
                </h1>
              </Link>
              <p className="kicker">
                Banco Master · Vorcaro · STF · Operação Compliance Zero
              </p>
            </div>
          </div>

          <div className="rule-thick mx-auto max-w-6xl" />

          <nav className="mx-auto max-w-6xl px-5 py-2">
            <ul className="flex flex-wrap gap-x-6 gap-y-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="kicker no-underline hover:text-seal transition-colors"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="rule-thin mx-auto max-w-6xl" />
        </header>

        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>

        <Disclaimer />
      </body>
    </html>
  );
}
