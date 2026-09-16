import type { Metadata } from "next";
import Link from "next/link";

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

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {conversas.map((c) => {
          const nome = c.id === MARTHA_ID ? "Martha Graeff" : outroParticipante(c.participants);
          return (
            <Link
              key={c.id}
              href={`/conversas/${c.id}`}
              className="block border border-rule p-4 transition-colors hover:border-seal"
            >
              <p className="headline text-xl text-ink">{nome}</p>
              <p className="numero mt-1 text-xs text-ink-3">
                {c.total_messages.toLocaleString("pt-BR")} mensagens ·{" "}
                {c.date_range.start.split("-").reverse().join("/")}
                {" – "}
                {c.date_range.end.split("-").reverse().join("/")}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-3">{c.source}</p>
            </Link>
          );
        })}
      </section>

      {conversas.length === 0 && (
        <p className="text-sm text-ink-3">
          Não foi possível carregar as conversas agora — o repositório de origem pode estar fora
          do ar. Tente novamente em alguns minutos.
        </p>
      )}
    </article>
  );
}
