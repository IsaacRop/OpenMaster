import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O painel é integralmente estático: os dados vivem em /data e são
  // validados em build time. Nada é buscado em runtime.
  reactStrictMode: true,
  // Ancora o rastreamento neste repo - ha outros lockfiles acima na arvore.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
