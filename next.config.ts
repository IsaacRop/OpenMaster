import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O painel é integralmente estático: os dados vivem em /data e são
  // validados em build time. Nada é buscado em runtime.
  reactStrictMode: true,
  // Ancora o rastreamento neste repo - ha outros lockfiles acima na arvore.
  outputFileTracingRoot: process.cwd(),
  // Permite que previews e verificações concorrentes usem caches separados.
  // Sem isso, dois processos do Next podem apagar os artefatos um do outro.
  distDir: process.env.OPENMASTER_DIST_DIR ?? ".next",
};

export default nextConfig;
