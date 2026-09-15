import Link from "next/link";

const EXEMPLOS = [
  "O que aconteceu por último?",
  "Quem são os envolvidos centrais?",
  "Quais versões estão em disputa?",
] as const;

export default function AgentPanel({ amplo = false }: { amplo?: boolean }) {
  return (
    <section className={`agent-panel ${amplo ? "min-h-[520px]" : ""}`} aria-labelledby="agente-titulo" data-agent-state="planned">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="agent-symbol" aria-hidden="true">
            <span />
          </span>
          <div>
            <p className="kicker text-seal">OpenMaster IA</p>
            <h2 id="agente-titulo" className="mt-0.5 text-base font-semibold text-ink">Consultar o agente do caso</h2>
          </div>
        </div>
        <span className="numero inline-flex items-center gap-2 border border-rule-strong px-2 py-1 text-xs text-ink-3">
          <span className="h-1.5 w-1.5 rounded-full bg-seal" aria-hidden="true" />
          Em preparação
        </span>
      </div>

      <div className={`grid gap-px bg-rule ${amplo ? "lg:grid-cols-[minmax(0,1fr)_280px]" : ""}`}>
        <div className="bg-paper-3 p-4 sm:p-5">
          <p className="max-w-2xl text-sm leading-relaxed text-ink-2">
            Faça perguntas em linguagem simples. As respostas serão limitadas aos dados do OpenMaster e deverão mostrar as fontes usadas.
          </p>

          <div className="mt-4 border border-rule-strong bg-paper-2 p-2">
            <label htmlFor="pergunta-agente" className="sr-only">Pergunta para o agente OpenMaster</label>
            <textarea
              id="pergunta-agente"
              rows={amplo ? 5 : 2}
              disabled
              placeholder="Ex.: Por que a Pet 16.662 é importante para o caso?"
              className="block w-full resize-none bg-transparent px-2 py-2 text-base leading-relaxed text-ink placeholder:text-ink-3 disabled:cursor-not-allowed disabled:opacity-100"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-2 pt-2">
              <p className="numero text-xs text-ink-3">Agente ainda não conectado</p>
              <button type="button" disabled className="agent-submit">Perguntar <span aria-hidden="true">↗</span></button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2" aria-label="Exemplos de perguntas futuras">
            {EXEMPLOS.map((exemplo) => (
              <span key={exemplo} className="border border-rule px-2.5 py-1.5 text-xs text-ink-3">{exemplo}</span>
            ))}
          </div>
        </div>

        {amplo && (
          <aside className="bg-paper-2 p-5">
            <p className="kicker">Compromissos do agente</p>
            <ul className="mt-3 space-y-4 text-sm leading-relaxed text-ink-2">
              <li><strong className="block font-medium text-ink">Responder com evidências</strong>Apontar documentos e registros usados.</li>
              <li><strong className="block font-medium text-ink">Separar fato de apuração</strong>Preservar os estados editoriais da base.</li>
              <li><strong className="block font-medium text-ink">Explicar termos difíceis</strong>Traduzir linguagem jurídica sem perder precisão.</li>
            </ul>
            <Link href="/busca" className="meta-link mt-6 text-seal hover:text-seal-soft">Usar busca literal agora →</Link>
          </aside>
        )}
      </div>
    </section>
  );
}
