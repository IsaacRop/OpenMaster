import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PhoneFrame } from "@/components/PhoneFrame";
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
      <li className="mx-auto max-w-[90%] py-1 text-center text-[0.6875rem] text-ink-3">
        {msg.content}
      </li>
    );
  }

  return (
    <li className={`flex ${souDV ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] border px-3 py-2 text-sm leading-relaxed ${
          souDV ? "border-accent/40 bg-accent/10 text-ink" : "border-rule bg-surface text-ink"
        }`}
      >
        {!souDV && (
          <p className="numero mb-0.5 text-[0.6875rem] font-semibold text-accent">
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

  const idxDia = paginarPorDia ? datas.findIndex((d) => d.date === diaAtivo) : -1;
  const diaAnterior = idxDia > 0 ? datas[idxDia - 1].date : undefined;
  const diaProximo = idxDia >= 0 && idxDia < datas.length - 1 ? datas[idxDia + 1].date : undefined;

  return (
    <article className="flex h-[calc(100dvh-150px)] min-h-[560px] flex-col items-center justify-center gap-2 overflow-hidden">
      <PhoneFrame
        sizeClassName="h-[calc(100dvh-150px)] max-h-[780px] min-w-[320px] w-auto"
        header={
          <div className="flex items-center gap-2">
            <Link
              href="/conversas"
              aria-label="Voltar para a lista de conversas"
              className="shrink-0 px-1 text-lg text-ink-2 no-underline hover:text-accent"
            >
              ←
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{nomeExibicao(nome)}</p>
              <p className="numero truncate text-[0.625rem] text-ink-3">
                {meta.total_messages.toLocaleString("pt-BR")} mensagens · {meta.source}
              </p>
            </div>
          </div>
        }
        footer={
          paginarPorDia ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={diaAnterior ? `/conversas/${id}?data=${diaAnterior}` : "#"}
                  aria-disabled={!diaAnterior}
                  aria-label="Dia anterior"
                  title="Dia anterior"
                  className={`shrink-0 border px-3 py-1.5 text-center text-sm no-underline ${
                    diaAnterior
                      ? "border-rule text-ink-2 hover:border-accent hover:text-accent"
                      : "cursor-not-allowed border-rule/40 text-ink-3/40"
                  }`}
                >
                  ‹
                </Link>
                <div className="numero min-w-0 flex-1 px-1 text-center text-[0.625rem] text-ink-3">
                  <p className="truncate text-xs font-semibold text-ink">
                    {diaAtivo?.split("-").reverse().join("/")}
                  </p>
                  <p className="truncate">
                    dia {idxDia + 1} de {datas.length}
                  </p>
                </div>
                <Link
                  href={diaProximo ? `/conversas/${id}?data=${diaProximo}` : "#"}
                  aria-disabled={!diaProximo}
                  aria-label="Dia seguinte"
                  title="Dia seguinte"
                  className={`shrink-0 border px-3 py-1.5 text-center text-sm no-underline ${
                    diaProximo
                      ? "border-rule text-ink-2 hover:border-accent hover:text-accent"
                      : "cursor-not-allowed border-rule/40 text-ink-3/40"
                  }`}
                >
                  ›
                </Link>
              </div>
              <form
                action={`/conversas/${id}`}
                method="get"
                className="flex items-center gap-1.5 text-[0.625rem] text-ink-3"
              >
                <span className="shrink-0">Ir direto para:</span>
                <select
                  key={diaAtivo}
                  defaultValue={diaAtivo}
                  name="data"
                  aria-label="Pular para um dia específico da conversa"
                  className="min-w-0 flex-1 border border-rule bg-surface-2 px-1.5 py-1 text-[0.625rem] text-ink"
                >
                  {datas.map((d) => (
                    <option key={d.date} value={d.date}>
                      {d.date.split("-").reverse().join("/")} ({d.count} msgs)
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="shrink-0 border border-rule px-2 py-1 text-[0.625rem] text-ink-2 hover:border-accent hover:text-accent"
                >
                  Ir
                </button>
              </form>
            </div>
          ) : (
            meta.note && <p className="text-center text-[0.625rem] text-ink-3">{meta.note}</p>
          )
        }
      >
        <ul className="space-y-2">
          {mensagensExibidas.map((m) => (
            <ChatMensagem key={m.id} msg={m} souDV={m.sender === "DV"} />
          ))}
        </ul>
      </PhoneFrame>

      <p className="shrink-0 text-center text-[0.6875rem] leading-none text-ink-3">
        <Link href="/conversas" className="underline hover:text-accent">
          ← todas as conversas
        </Link>
        {" · "}
        Buscado ao vivo do{" "}
        <a
          href="https://www.masterwhats.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-rule underline-offset-2 hover:text-accent hover:decoration-accent"
        >
          MasterWhats
        </a>
        , não verificado de forma independente.
      </p>
    </article>
  );
}
