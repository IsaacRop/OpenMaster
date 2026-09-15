import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DataBR } from "@/components/ProcessCard";
import Timeline from "@/components/Timeline";
import { ConfiancaBadge, SourceTag } from "@/components/SourceTag";
import {
  eventosDoProcesso,
  pessoaPorId,
  processoPorId,
  processos,
  relacoesDoNo,
} from "@/lib/data";
import { SIGILO_LABEL, STATUS_LABEL } from "@/lib/schema";

export function generateStaticParams() {
  return processos.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = processoPorId(id);
  if (!p) return { title: "Processo não encontrado — OpenMaster" };
  return {
    title: `${p.numero} — OpenMaster`,
    description: p.apelido,
  };
}

const SYNC_TEXTO: Record<string, string> = {
  ativo: "Sincronizado com a API Pública do DataJud (CNJ).",
  sem_numero_cnj:
    "Sem sincronização automática: este processo não tem número CNJ de 20 dígitos registrado, e o DataJud indexa por esse número. A numeração de classe do STF (“Pet 16.662”) não é número CNJ.",
  tribunal_indisponivel:
    "Sincronização automática indisponível: o índice do tribunal não responde na API Pública do DataJud. As movimentações abaixo vêm de curadoria manual.",
  erro: "A última tentativa de sincronização falhou. As movimentações abaixo vêm de curadoria manual.",
};

export default async function ProcessoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = processoPorId(id);
  if (!p) notFound();

  const eventos = eventosDoProcesso(p.id);
  const relacoes = relacoesDoNo(p.id);

  return (
    <article className="space-y-10">
      <header>
        <Link href="/processos" className="kicker no-underline hover:text-seal">
          ← Processos
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="numero text-4xl font-medium text-ink">{p.numero}</h2>
          <span className="numero border border-ink-2 px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.12em] text-ink-2">
            {STATUS_LABEL[p.status]}
          </span>
          <span className="numero border border-rule px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.12em] text-ink-3">
            {SIGILO_LABEL[p.sigilo]}
          </span>
          <ConfiancaBadge confianca={p.confianca} />
        </div>
        <p className="headline mt-2 text-2xl text-ink-2">{p.apelido}</p>
        <div className="rule-thick mt-4" />
      </header>

      {p.sigilo === "sigiloso" && (
        <p className="border-l-2 border-seal bg-paper-2/60 px-4 py-3 text-sm leading-relaxed text-ink-2">
          Processo sob sigilo. O painel registra apenas dados de tramitação divulgados
          publicamente e o fato de que a peça existe — nunca seu conteúdo.
        </p>
      )}

      <section>
        <h3 className="kicker">Objeto</h3>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-ink">{p.objeto}</p>
        <div className="mt-3">
          <SourceTag fonte={p} />
        </div>
      </section>

      <section className="grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="kicker">Relatoria</h3>
          <p className="mt-2 text-base text-ink">{p.relator_atual}</p>
          {p.relator_originario && (
            <p className="mt-1 text-sm text-ink-3">
              Relator originário: {p.relator_originario}
            </p>
          )}

          {p.historico_relatoria.length > 0 && (
            <ol className="mt-4 space-y-3 border-l border-rule pl-4">
              {p.historico_relatoria.map((h, i) => (
                <li key={i}>
                  <p className="numero text-xs text-ink-3">
                    {h.de ? <DataBR iso={h.de} /> : "início não informado"} —{" "}
                    {h.ate ? <DataBR iso={h.ate} /> : "atual"}
                  </p>
                  <p className="text-sm text-ink">{h.relator}</p>
                  {h.motivo && <p className="text-sm text-ink-2">{h.motivo}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div>
          <h3 className="kicker">Tramitação</h3>
          {p.ultima_movimentacao ? (
            <>
              <p className="numero mt-2 text-lg text-ink">
                <DataBR iso={p.ultima_movimentacao.data} />
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">
                {p.ultima_movimentacao.descricao}
              </p>
              <p className="kicker mt-1 normal-case tracking-normal">
                origem: {p.ultima_movimentacao.origem === "datajud" ? "DataJud/CNJ" : "curadoria manual"}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-3">Nenhuma movimentação registrada.</p>
          )}

          {p.proximo_evento && (
            <div className="mt-4 border-l-2 border-seal pl-3">
              <p className="kicker text-seal">Próximo ato</p>
              <p className="numero mt-0.5 text-base text-seal">
                <DataBR iso={p.proximo_evento.data} />
              </p>
              <p className="text-sm text-ink-2">{p.proximo_evento.descricao}</p>
            </div>
          )}

          <p className="mt-4 border-t border-rule pt-3 text-xs leading-relaxed text-ink-3">
            {SYNC_TEXTO[p.sync]}
            {p.sync_checked_at && (
              <>
                {" "}
                Última verificação: {p.sync_checked_at.slice(0, 10).split("-").reverse().join("/")}.
              </>
            )}
          </p>
        </div>
      </section>

      {p.movimentacoes.length > 0 && (
        <section>
          <h3 className="kicker border-b border-ink pb-1.5">
            Movimentações (DataJud/CNJ)
          </h3>
          <ul className="mt-3 divide-y divide-rule">
            {p.movimentacoes.map((m, i) => (
              <li key={i} className="flex gap-4 py-2">
                <DataBR iso={m.data} />
                <span className="text-sm text-ink-2">{m.descricao}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {eventos.length > 0 && (
        <section>
          <h3 className="kicker border-b border-ink pb-1.5">Neste processo</h3>
          <div className="mt-2">
            <Timeline eventos={eventos} compacta />
          </div>
        </section>
      )}

      {relacoes.length > 0 && (
        <section>
          <h3 className="kicker border-b border-ink pb-1.5">Relações registradas</h3>
          <ul className="mt-3 divide-y divide-rule">
            {relacoes.map((r) => {
              const outro = r.from === p.id ? r.to : r.from;
              const pessoa = pessoaPorId(outro);
              const proc = processoPorId(outro);
              const nome = pessoa?.nome ?? proc?.numero ?? outro;
              const direcao = r.from === p.id ? "→" : "←";
              return (
                <li key={r.id} className="py-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-ink-3">{direcao}</span>
                    {proc ? (
                      <Link
                        href={`/processos/${proc.id}`}
                        className="headline text-base text-ink no-underline hover:text-seal"
                      >
                        {nome}
                      </Link>
                    ) : (
                      <span className="headline text-base text-ink">{nome}</span>
                    )}
                    <ConfiancaBadge confianca={r.confianca} />
                  </div>
                  <p className="mt-0.5 text-sm text-ink-2">{r.rotulo}</p>
                  <div className="mt-1">
                    <SourceTag fonte={r} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}
