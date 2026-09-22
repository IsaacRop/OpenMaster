import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Kalam, Plus_Jakarta_Sans } from "next/font/google";

import ConditionalDisclaimer from "@/components/ConditionalDisclaimer";
import DefsMarca from "@/components/DefsMarca";
import SiteHeader from "@/components/SiteHeader";
import TabBar from "@/components/TabBar";
import { dataCorte } from "@/lib/data";
import "./globals.css";

/*
 * Três vozes, três funções: Bodoni Moda nas manchetes (eixo de tamanho óptico,
 * então o mesmo arquivo serve ao título de 68px e ao de 17px), Plus Jakarta
 * Sans na interface e nos dados, Kalam só nas notas a lápis.
 */
// Só o estilo normal: o itálico não é usado e dobrava o peso da pré-carga.
const display = Bodoni_Moda({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  variable: "--font-bodoni",
  display: "swap",
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-jakarta",
  display: "swap",
});

// Uma nota a lápis nunca é o maior texto da tela: sem pré-carga, chega depois.
const lapis = Kalam({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-kalam",
  display: "swap",
  preload: false,
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
  // O preto mesa de `--color-bg`: o site é escuro sempre.
  themeColor: "#0C0B0A",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable} ${lapis.variable}`}>
      <body className="min-h-screen antialiased">
        <DefsMarca />
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>

        <SiteHeader dataCorteBR={dataCorte.split("-").reverse().join("/")} />

        <main id="conteudo" className="mx-auto max-w-[1304px] px-4 py-4 sm:px-8 sm:py-6">
          {children}
        </main>

        <ConditionalDisclaimer />
        <TabBar />
      </body>
    </html>
  );
}
