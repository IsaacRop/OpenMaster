"use client";

import { useEffect, useRef, useState } from "react";

import Icone from "./Icone";

type Props = {
  /** URL absoluta da página a compartilhar. */
  url: string;
  /** Texto que acompanha o link na mensagem. */
  texto: string;
  /** `cartao`: botões grandes, com rótulo. `barra`: linha discreta no pé de uma ficha. */
  variante?: "cartao" | "barra";
};

const REDES = [
  { id: "whatsapp", rotulo: "WhatsApp", href: (u: string, t: string) => `https://wa.me/?text=${encodeURIComponent(`${t}\n${u}`)}` },
  { id: "telegram", rotulo: "Telegram", href: (u: string, t: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { id: "x", rotulo: "X", href: (u: string, t: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}` },
  { id: "facebook", rotulo: "Facebook", href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
] as const;

export default function Compartilhar({ url, texto, variante = "barra" }: Props) {
  const [copiado, setCopiado] = useState(false);
  const [nativo, setNativo] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // O menu nativo do celular lista os apps que a pessoa realmente usa.
  useEffect(() => setNativo(typeof navigator.share === "function"), []);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Contexto sem clipboard: seleciona um campo temporário.
      const campo = document.createElement("textarea");
      campo.value = url;
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      campo.remove();
    }
    setCopiado(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopiado(false), 2500);
  }

  async function abrirNativo() {
    try {
      await navigator.share({ title: texto, text: texto, url });
    } catch {
      // Cancelar o menu é um clique legítimo, não erro.
    }
  }

  return (
    <div className={`compartilhar compartilhar-${variante}`} role="group" aria-label="Compartilhar">
      {variante === "barra" && <span className="compartilhar-rotulo">Compartilhar</span>}
      {nativo && (
        <button type="button" className="compartilhar-botao compartilhar-destaque" onClick={abrirNativo}>
          <Icone nome="compartilhar" tamanho={16} />
          Enviar
        </button>
      )}
      {REDES.map((r) => (
        <a
          key={r.id}
          className="compartilhar-botao"
          href={r.href(url, texto)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Compartilhar no ${r.rotulo}`}
        >
          {r.rotulo}
        </a>
      ))}
      <button type="button" className="compartilhar-botao" onClick={copiar}>
        <Icone nome={copiado ? "check" : "link"} tamanho={16} />
        {copiado ? "Link copiado" : "Copiar link"}
      </button>
      <span className="sr-only" role="status">
        {copiado ? "Link copiado para a área de transferência" : ""}
      </span>
    </div>
  );
}
