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
          souDV ? "border-seal/40 bg-seal/10 text-ink" : "border-rule bg-paper-3 text-ink"
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

  const idxDia = paginarPorDia ? datas.findIndex((d) => d.date === diaAtivo) : -1;
  const diaAnterior = idxDia > 0 ? datas[idxDia - 1].date : undefined;
  const diaProximo = idxDia >= 0 && idxDia < datas.length - 1 ? datas[idxDia + 1].date : undefined;

  return (
    <article className="space-y-4">
      <div>
        <Link href="/conversas" className="kicker no-underline hover:text-seal">
          ← Voltar para conversas
        </Link>
      </div>

      <PhoneFrame
        header={
          <div className="flex items-center gap-2">
            <Link
              href="/conversas"
              aria-label="Voltar para a lista de conversas"
              className="shrink-0 px-1 text-lg text-ink-2 no-underline hover:text-seal"
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
                  className={`flex-1 border px-2 py-1.5 text-center text-xs no-underline ${
                    diaAnterior
                      ? "border-rule text-ink-2 hover:border-seal hover:text-seal"
                      : "cursor-not-allowed border-rule/40 text-ink-3/40"
                  }`}
                >
                  ← Dia anterior
                </Link>
                <div className="numero shrink-0 px-1 text-center text-[0.625rem] text-ink-3">
                  <p className="text-xs font-semibold text-ink">
                    {diaAtivo?.split("-").reverse().join("/")}
                  </p>
                  <p>
                    dia {idxDia + 1} de {datas.length}
                  </p>
                </div>
                <Link
                  href={diaProximo ? `/conversas/${id}?data=${diaProximo}` : "#"}
                  aria-disabled={!diaProximo}
                  className={`flex-1 border px-2 py-1.5 text-center text-xs no-underline ${
                    diaProximo
                      ? "border-rule text-ink-2 hover:border-seal hover:text-seal"
                      : "cursor-not-allowed border-rule/40 text-ink-3/40"
                  }`}
                >
                  Dia seguinte →
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
                  className="min-w-0 flex-1 border border-rule bg-paper-2 px-1.5 py-1 text-[0.625rem] text-ink"
                >
                  {datas.map((d) => (
                    <option key={d.date} value={d.date}>
                      {d.date.split("-").reverse().join("/")} ({d.count} msgs)
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="shrink-0 border border-rule px-2 py-1 text-[0.625rem] text-ink-2 hover:border-seal hover:text-seal"
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

      <p className="mx-auto max-w-[400px] text-xs leading-relaxed text-ink-3">
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
