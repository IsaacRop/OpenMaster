"use client";

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
  | { tipo: "carregando" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "limite"; mensagem: string }
  | { tipo: "ok"; dados: Resposta };

type Turno = { pergunta: string; estado: Estado };

/** O M da marca, no ladrilho que assina as respostas do agente. */
function MarcaAgente({ pensando = false }: { pensando?: boolean }) {
  return (
    <span className="agente-marca" aria-hidden="true">
      {pensando ? (
        <span className="text-accent">…</span>
      ) : (
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path d="M11 37V11L24 25.5L37 11V37" fill="none" stroke="var(--color-accent)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

/**
 * A conversa com o agente. Cada pergunta vira um turno: o balão de quem
 * perguntou, a resposta assinada pelo M da marca e as fontes como fichas de
 * papel — o documento de onde a frase saiu. A barra de pergunta é o vidro
 * do guia; no celular ela fica presa ao pé, acima das abas ou do teclado.
 */
export default function AgentPanel({ registros }: { registros: number }) {
  const [pergunta, setPergunta] = useState("");
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const carregando = turnos.at(-1)?.estado.tipo === "carregando";

  function atualizarUltimo(estado: Estado) {
    setTurnos((ts) => ts.map((t, i) => (i === ts.length - 1 ? { ...t, estado } : t)));
  }

  async function perguntar(texto: string) {
    const q = texto.trim();
    if (!q || carregando) return;
    setTurnos((ts) => [...ts, { pergunta: q, estado: { tipo: "carregando" } }]);
    setPergunta("");
    try {
      const resp = await fetch("/api/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: q }),
      });
      const dados = await resp.json();

      if (resp.status === 429) {
        atualizarUltimo({ tipo: "limite", mensagem: dados.erro ?? "Muitas perguntas em pouco tempo." });
        return;
      }
      if (!resp.ok) {
        atualizarUltimo({ tipo: "erro", mensagem: dados.erro ?? "Não foi possível responder agora." });
        return;
      }
      atualizarUltimo({ tipo: "ok", dados });
    } catch {
      atualizarUltimo({ tipo: "erro", mensagem: "Falha de conexão. Tente novamente." });
    }
  }

  // A pergunta digitada na capa chega como `/agente?q=`. Lida uma vez, na
  // montagem: com `useSearchParams` a página inteira esperaria a hidratação.
  const perguntaDaUrl = useRef(false);
  useEffect(() => {
    if (perguntaDaUrl.current) return;
    perguntaDaUrl.current = true;
    const q = new URLSearchParams(window.location.search).get("q")?.trim().slice(0, 500);
    if (q) perguntar(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * No celular o campo fica preso ao pé da tela. O teclado virtual cobre a
   * viewport de layout sem redimensioná-la (Safari e Chrome atuais), então
   * `bottom: 0` ficaria atrás dele; o `visualViewport` diz quanto ele ocupa.
   */
  const [teclado, setTeclado] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const medir = () => setTeclado(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => {
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
    };
  }, []);

  // Cada turno novo rola a conversa até o fim, como num app de mensagens.
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (turnos.length) fim.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turnos]);

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    perguntar(pergunta);
  }

  return (
    <section className="agente" aria-labelledby="agente-titulo">
      <header className="agente-abertura">
        <p className="eyebrow">Agente OpenMaster</p>
        <h1 id="agente-titulo" className="m-0 text-[clamp(2rem,1.5rem+2.2vw,2.75rem)]">
          Pergunte à base.
        </h1>
        <p className="max-w-[29rem] text-sm text-ink-3">
          Respostas baseadas apenas nos registros do OpenMaster, um projeto independente e sem vínculo
          oficial com os órgãos do caso. Toda afirmação traz a fonte pública de onde saiu.
        </p>
      </header>

      <div className="grid gap-6" aria-live="polite">
        {turnos.map((t, i) => (
          <div key={i} className="grid gap-5">
            <p className="agente-pergunta">{t.pergunta}</p>

            {t.estado.tipo === "carregando" && (
              <div className="flex items-center gap-3.5">
                <MarcaAgente pensando />
                <span className="lapis">folheando os registros…</span>
              </div>
            )}

            {(t.estado.tipo === "erro" || t.estado.tipo === "limite") && (
              <div className="flex items-start gap-3.5">
                <MarcaAgente />
                <p className="rounded-2xl border border-rule-strong bg-surface px-4 py-3 text-sm text-ink-2">
                  {t.estado.mensagem}
                </p>
              </div>
            )}

            {t.estado.tipo === "ok" && (
              <div className="flex items-start gap-3.5">
                <MarcaAgente />
                <div className="grid min-w-0 flex-1 gap-3.5">
                  <p className="whitespace-pre-line text-base leading-[1.7] text-ink">{t.estado.dados.resposta}</p>
                  {i === 0 && t.estado.dados.fontes.length > 0 && (
                    <p className="lapis" aria-hidden="true">
                      <svg width="26" height="14" viewBox="0 0 26 14">
                        <g filter="url(#omp)" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M2 10 C8 4 16 3 22 6" />
                          <path d="M17 2 L23 6 L17 10" />
                        </g>
                      </svg>
                      confira sempre na fonte original
                    </p>
                  )}
                  {t.estado.dados.fontes.length > 0 && (
                    <ul className="agente-fontes" aria-label="Fontes citadas">
                      {t.estado.dados.fontes.map((f, n) => (
                        <li key={n}>
                          <a href={f.source_url} target="_blank" rel="noopener noreferrer" className="agente-fonte h-full">
                            <small>
                              <span>FONTE {n + 1}</span>
                              <span aria-hidden="true">↗</span>
                            </small>
                            <span className="text-[0.85rem] font-bold leading-snug">{f.titulo}</span>
                            <span>{f.source_name}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {/* No celular o campo fixo cobre o pé: a rolagem para antes dele. */}
        <div ref={fim} className="scroll-mb-64 lg:scroll-mb-0" />
      </div>

      <div
        className="agente-rodape"
        style={
          teclado > 0
            ? ({ "--teclado": `${teclado}px`, "--abaixo-do-campo": "0px" } as React.CSSProperties)
            : undefined
        }
      >
        <div className="mb-2.5 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]" aria-label="Exemplos de perguntas">
          {EXEMPLOS.map((exemplo) => (
            <button
              key={exemplo}
              type="button"
              onClick={() => perguntar(exemplo)}
              disabled={carregando}
              className="pilula shrink-0 bg-[rgb(255_255_255_/_0.05)] font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exemplo}
            </button>
          ))}
        </div>
        <form onSubmit={aoEnviar} className="agente-compositor flex items-center gap-2.5">
          <label htmlFor="pergunta-agente" className="sr-only">
            Pergunta para o agente OpenMaster
          </label>
          <input
            id="pergunta-agente"
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            placeholder="Pergunte sobre pessoas, processos ou decisões"
            maxLength={500}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-base font-medium text-ink outline-none"
          />
          <span className="hidden shrink-0 whitespace-nowrap rounded-full border border-[rgb(255_255_255_/_0.12)] px-3 py-2 text-xs text-ink-2 lg:inline">
            {registros.toLocaleString("pt-BR")} registros
          </span>
          <button type="submit" disabled={carregando || !pergunta.trim()} className="agente-enviar" aria-label="Perguntar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </form>
      </div>
    </section>
  );
}
