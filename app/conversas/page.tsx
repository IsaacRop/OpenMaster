import type { Metadata } from "next";
import Link from "next/link";

import { PhoneFrame } from "@/components/PhoneFrame";
import { listarConversas, MARTHA_ID } from "@/lib/conversas";

export const metadata: Metadata = {
  title: "Conversas — OpenMaster",
  description:
    "Conversas de WhatsApp extraídas do celular de Daniel Vorcaro, publicadas pelo projeto MasterWhats.",
};

export const revalidate = 3600;

function outroParticipante(participants: string[]) {
  return participants.find((p) => p !== "DV") ?? participants[0];
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export default async function ConversasPage() {
  const conversas = await listarConversas();

  return (
    <article className="space-y-8">
      <header>
        <p className="kicker">Conversas</p>
        <h2 className="headline mt-1 text-4xl text-ink">Celular de Daniel Vorcaro</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-2">
          Visualização, no formato de um app de mensagens, das conversas extraídas dos celulares
          apreendidos de Daniel Vorcaro. Os textos não são produzidos por este painel — vêm ao
          vivo do projeto independente{" "}
          <a
            href="https://github.com/rafaelbressan/masterzap"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-rule underline-offset-2 hover:text-seal hover:decoration-seal"
          >
            MasterWhats
          </a>
          , de Rafael Bressan, que transcreveu manualmente o material a partir de reportagens e do
          relatório da Polícia Federal (IPJ-A nº 3298613/2026). Este painel não copia nem
          armazena esses dados — eles são buscados em tempo real do repositório de origem, então
          esta seção depende da disponibilidade dele.
        </p>
        <div className="rule-thick mt-4" />
      </header>

      <PhoneFrame
        header={
          <div>
            <p className="headline text-lg text-ink">Conversas</p>
            <p className="numero text-[0.6875rem] text-ink-3">
              {conversas.length} {conversas.length === 1 ? "conversa" : "conversas"} · toque para
              abrir
            </p>
          </div>
        }
      >
        <ul className="-mx-1 divide-y divide-rule">
          {conversas.map((c) => {
            const nome = c.id === MARTHA_ID ? "Martha Graeff" : outroParticipante(c.participants);
            return (
              <li key={c.id}>
                <Link
                  href={`/conversas/${c.id}`}
                  className="flex items-center gap-3 px-1 py-2.5 no-underline transition-colors hover:bg-paper-2"
                >
                  <span className="numero flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rule bg-paper-2 text-xs text-ink-2">
                    {iniciais(nome)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{nome}</span>
                      <span className="numero shrink-0 text-[0.625rem] text-ink-3">
                        {c.date_range.end.split("-").reverse().join("/")}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs text-ink-3">{c.source}</span>
                      <span className="numero shrink-0 text-[0.625rem] text-ink-3">
                        {c.total_messages.toLocaleString("pt-BR")}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {conversas.length === 0 && (
          <p className="p-3 text-sm text-ink-3">
            Não foi possível carregar as conversas agora — o repositório de origem pode estar fora
            do ar. Tente novamente em alguns minutos.
          </p>
        )}
      </PhoneFrame>
    </article>
  );
}
