import type { NextConfig } from "next";

/**
 * CSP montada por ambiente porque dev e produção precisam de coisas
 * diferentes: o HMR/Fast Refresh do webpack em `next dev` usa `eval` para
 * fonte-map dos módulos trocados a quente, então `script-src` só pode negar
 * `unsafe-eval` em produção sem quebrar o dev server. `unsafe-inline` em
 * `script-src` fica nos dois: o App Router injeta um script inline
 * (`self.__next_f.push(...)`) para transportar o payload de Server
 * Components, e sem infraestrutura de nonce por requisição (middleware) não
 * há como declará-lo de outro jeito sem quebrar a hidratação.
 */
function csp(producao: boolean): string {
  const scriptSrc = producao ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline' 'unsafe-eval'";
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Equivalente a X-Frame-Options: DENY, mas o padrão atual — controla
    // quem pode enquadrar este site em <iframe>, não o inverso.
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const nextConfig: NextConfig = {
  // O painel é integralmente estático: os dados vivem em /data e são
  // validados em build time. Nada é buscado em runtime.
  reactStrictMode: true,
  // Ancora o rastreamento neste repo - ha outros lockfiles acima na arvore.
  outputFileTracingRoot: process.cwd(),
  // Permite que previews e verificações concorrentes usem caches separados.
  // Sem isso, dois processos do Next podem apagar os artefatos um do outro.
  distDir: process.env.OPENMASTER_DIST_DIR ?? ".next",
  async headers() {
    const producao = process.env.NODE_ENV === "production";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp(producao) },
          // Só tem efeito servido sobre https (é o caso na Vercel); inofensivo em http local.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          // Redundante com frame-ancestors da CSP para navegadores que ainda não a leem.
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
