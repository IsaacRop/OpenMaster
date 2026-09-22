"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

const EXEMPLOS = [
  "O que aconteceu por último?",
  "Quem são os envolvidos centrais?",
  "Quais versões estão em disputa?",
] as const;

type Fonte = { titulo: string; source_url: string; source_name: string };

type Resposta = {
  resposta: string;
  fontes: Fonte[];
  totalCartoes: number;
};

type Estado =
  | { tipo: "ocioso" }
  | { tipo: "carregando" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "limite"; mensagem: string }
  | { tipo: "ok"; dados: Resposta };

export default function AgentPanel({ amplo = false }: { amplo?: boolean }) {
  const [pergunta, setPergunta] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "ocioso" });

  async function perguntar(texto: string) {
    if (!texto.trim() || estado.tipo === "carregando") return;
    setEstado({ tipo: "carregando" });
    try {
      const resp = await fetch("/api/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: texto }),
      });
      const dados = await resp.json();

      if (resp.status === 429) {
        setEstado({ tipo: "limite", mensagem: dados.erro ?? "Muitas perguntas em pouco tempo." });
        return;
      }
      if (!resp.ok) {
        setEstado({ tipo: "erro", mensagem: dados.erro ?? "Não foi possível responder agora." });
        return;
      }
      setEstado({ tipo: "ok", dados });
    } catch {
      setEstado({ tipo: "erro", mensagem: "Falha de conexão. Tente novamente." });
    }
  }

  // A pergunta digitada na capa chega como `/agente?q=`. Lida uma vez, na
  // montagem: com `useSearchParams` a página inteira esperaria a hidratação.
  const perguntaDaUrl = useRef(false);
  useEffect(() => {
    if (perguntaDaUrl.current) return;
    perguntaDaUrl.current = true;
    const q = new URLSearchParams(window.location.search).get("q")?.trim().slice(0, 500);
    if (!q) return;
    setPergunta(q);
    perguntar(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    perguntar(pergunta);
  }

  const carregando = estado.tipo === "carregando";

  return (
    <section className={`agent-panel ${amplo ? "min-h-[520px]" : ""}`} aria-labelledby="agente-titulo">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="agent-symbol" aria-hidden="true">
            <span />
          </span>
          <div>
            <p className="kicker text-accent">OpenMaster IA</p>
            <h2 id="agente-titulo" className="mt-0.5 text-base font-semibold text-ink">Consultar o agente do caso</h2>
          </div>
        </div>
      </div>

      <div className={`grid gap-px bg-rule ${amplo ? "lg:grid-cols-[minmax(0,1fr)_280px]" : ""}`}>
        <div className="bg-surface p-4 sm:p-5">
          <p className="max-w-2xl text-sm leading-relaxed text-ink-2">
            Faça perguntas em linguagem simples. As respostas são limitadas aos dados do OpenMaster e mostram as fontes usadas.
          </p>

          <form onSubmit={aoEnviar} className="mt-4 border border-rule-strong bg-surface-2 p-2">
            <label htmlFor="pergunta-agente" className="sr-only">Pergunta para o agente OpenMaster</label>
            <textarea
              id="pergunta-agente"
              rows={amplo ? 5 : 2}
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Ex.: Por que a Pet 16.662 é importante para o caso?"
              maxLength={500}
              className="block w-full resize-none bg-transparent px-2 py-2 text-base leading-relaxed text-ink placeholder:text-ink-3 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={carregando}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-2 pt-2">
              <p className="numero text-xs text-ink-3">
                {carregando ? "Consultando a base…" : "Respostas com fonte citada"}
              </p>
              <button type="submit" disabled={carregando || !pergunta.trim()} className="agent-submit">
                Perguntar <span aria-hidden="true">↗</span>
              </button>
            </div>
          </form>

          <div className="mt-3 flex flex-wrap gap-2" aria-label="Exemplos de perguntas">
            {EXEMPLOS.map((exemplo) => (
              <button
                key={exemplo}
                type="button"
                onClick={() => {
                  setPergunta(exemplo);
                  perguntar(exemplo);
                }}
                disabled={carregando}
                className="border border-rule px-2.5 py-1.5 text-xs text-ink-3 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exemplo}
              </button>
            ))}
          </div>

          <div className="mt-4" aria-live="polite">
            {estado.tipo === "limite" && (
              <p className="border border-rule-strong bg-surface-2 px-3 py-2 text-sm text-ink">{estado.mensagem}</p>
            )}
            {estado.tipo === "erro" && (
              <p className="border border-l-2 border-rule-strong border-l-ink bg-surface-2 px-3 py-2 text-sm text-ink">{estado.mensagem}</p>
            )}
            {estado.tipo === "ok" && (
              <div className="border border-rule-strong bg-surface-2 p-4">
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{estado.dados.resposta}</p>
                {estado.dados.fontes.length > 0 && (
                  <div className="mt-3 border-t border-rule pt-3">
                    <p className="kicker text-ink-3">Fontes citadas</p>
                    <ul className="mt-2 space-y-1.5">
                      {estado.dados.fontes.map((f, i) => (
                        <li key={i}>
                          <a
                            href={f.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="numero inline-flex items-center gap-1.5 text-xs text-ink-3 underline decoration-rule underline-offset-2 hover:text-accent hover:decoration-accent"
                          >
                            <span className="text-accent" aria-hidden="true">↗</span>
                            {f.titulo} — {f.source_name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {amplo && (
          <aside className="bg-surface-2 p-5">
            <p className="kicker">Compromissos do agente</p>
            <ul className="mt-3 space-y-4 text-sm leading-relaxed text-ink-2">
              <li><strong className="block font-medium text-ink">Responder com evidências</strong>Aponta documentos e registros usados.</li>
              <li><strong className="block font-medium text-ink">Separar fato de apuração</strong>Preserva os estados editoriais da base.</li>
              <li><strong className="block font-medium text-ink">Nunca julgar</strong>Reporta o que as fontes registram, sem juízo de culpa.</li>
            </ul>
            <Link href="/busca" className="meta-link mt-6 text-accent hover:text-accent-hover">Usar busca literal →</Link>
          </aside>
        )}
      </div>
    </section>
  );
}
