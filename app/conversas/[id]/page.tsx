import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { agruparPorData, obterConversa, MARTHA_ID, type ConversaMensagem } from "@/lib/conversas";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const conversa = await obterConversa(id);
  if (!conversa) return { title: "Conversa não encontrada — OpenMaster" };
  const nome = conversa.meta.participants.find((p) => p !== "DV") ?? conversa.meta.participants[0];
  return { title: `Conversa com ${nome} — OpenMaster` };
}

function nomeExibicao(sender: string) {
  return sender === "DV" ? "Daniel Vorcaro" : sender;
}

function ChatMensagem({ msg, souDV }: { msg: ConversaMensagem; souDV: boolean }) {
  if (msg.type === "system") {
    return (
      <li className="mx-auto max-w-md py-1 text-center text-[0.6875rem] text-ink-3">
        {msg.content}
      </li>
    );
  }

  return (
    <li className={`flex ${souDV ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] border px-3 py-2 text-sm leading-relaxed sm:max-w-[65%] ${
          souDV
            ? "border-seal/40 bg-seal/10 text-ink"
            : "border-rule bg-paper-3 text-ink"
        }`}
      >
        {!souDV && (
          <p className="numero mb-0.5 text-[0.6875rem] font-semibold text-seal">
            {nomeExibicao(msg.sender)}
          </p>
        )}
        {msg.type === "text" ? (
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        ) : (
          <p className="italic text-ink-3">
            {msg.content?.startsWith("[")
              ? msg.content
              : `[${msg.type}] ${msg.content || msg.attachment || "conteúdo não recuperado"}`}
          </p>
        )}
        <p className="numero mt-1 flex items-center gap-2 text-[0.625rem] text-ink-3">
          <span>{msg.time.slice(0, 5)}</span>
          {msg.is_edited && <span>editado</span>}
          {msg.source_page && (
            <span title="Página/figura do laudo da PF de onde foi transcrita">
              laudo p.{msg.source_page}
              {msg.source_figure ? `, fig.${msg.source_figure}` : ""}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}

export default async function ConversaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ data?: string }>;
}) {
  const { id } = await params;
  const { data: dataSelecionada } = await searchParams;

  const conversa = await obterConversa(id);
  if (!conversa) notFound();

  const { meta, messages } = conversa;
  const nome = meta.participants.find((p) => p !== "DV") ?? meta.participants[0];
  const datas = agruparPorData(messages).sort((a, b) => a.date.localeCompare(b.date));

  // Conversas longas (Martha Graeff) são paginadas por dia; as demais, todas as
  // mensagens vêm do relatório da PF em recortes curtos e cabem numa só tela.
  const paginarPorDia = id === MARTHA_ID;
  const diaAtivo = paginarPorDia ? dataSelecionada ?? datas.at(-1)?.date : undefined;
  const mensagensExibidas = paginarPorDia
    ? messages.filter((m) => m.date === diaAtivo)
    : messages;

  return (
    <article className="space-y-6">
      <div>
        <Link href="/conversas" className="kicker no-underline hover:text-seal">
          ← Voltar para conversas
        </Link>
      </div>

      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-3">
        <div>
          <h2 className="headline text-3xl text-ink">{nomeExibicao(nome)}</h2>
          <p className="numero mt-1 text-xs text-ink-3">
            {meta.total_messages.toLocaleString("pt-BR")} mensagens · {meta.source}
          </p>
        </div>
        {meta.note && (
          <p className="max-w-sm text-xs leading-relaxed text-ink-3">{meta.note}</p>
        )}
      </header>

      {paginarPorDia && (
        <nav aria-label="Navegar por data" className="flex flex-wrap items-center gap-2">
          <span className="kicker">Dia</span>
          <form action={`/conversas/${id}`} method="get" className="flex items-center gap-2">
            <select
              defaultValue={diaAtivo}
              name="data"
              aria-label="Selecionar dia da conversa"
              className="border border-rule bg-paper-2 px-2 py-1 text-xs text-ink"
            >
              {datas.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.date.split("-").reverse().join("/")} ({d.count})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="border border-rule px-2 py-1 text-xs text-ink-2 hover:border-seal hover:text-seal"
            >
              Ir
            </button>
          </form>
          <DataNavLinks id={id} datas={datas.map((d) => d.date)} atual={diaAtivo!} />
        </nav>
      )}

      <ul className="space-y-2">
        {mensagensExibidas.map((m) => (
          <ChatMensagem key={m.id} msg={m} souDV={m.sender === "DV"} />
        ))}
      </ul>

      <p className="border-t border-rule pt-4 text-xs leading-relaxed text-ink-3">
        Conteúdo buscado ao vivo do projeto{" "}
        <a
          href="https://www.masterwhats.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-rule underline-offset-2 hover:text-seal hover:decoration-seal"
        >
          MasterWhats
        </a>
        , de Rafael Bressan. Este painel não verifica de forma independente cada mensagem — a
        proveniência (página e figura do laudo, quando aplicável) é a mesma indicada pela fonte
        original. Mensagens de mídia (áudio, imagem, vídeo) não fazem parte do vazamento e
        aparecem como placeholder.
      </p>
    </article>
  );
}

function DataNavLinks({ id, datas, atual }: { id: string; datas: string[]; atual: string }) {
  const idx = datas.indexOf(atual);
  const anterior = idx > 0 ? datas[idx - 1] : undefined;
  const proximo = idx >= 0 && idx < datas.length - 1 ? datas[idx + 1] : undefined;
  return (
    <span className="flex items-center gap-2 text-xs">
      {anterior ? (
        <Link href={`/conversas/${id}?data=${anterior}`} className="underline hover:text-seal">
          ← anterior
        </Link>
      ) : (
        <span className="text-ink-3">← anterior</span>
      )}
      {proximo ? (
        <Link href={`/conversas/${id}?data=${proximo}`} className="underline hover:text-seal">
          próximo →
        </Link>
      ) : (
        <span className="text-ink-3">próximo →</span>
      )}
    </span>
  );
}
