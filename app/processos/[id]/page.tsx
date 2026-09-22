import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Backlinks from "@/components/Backlinks";
import FichaDados from "@/components/FichaDados";
import { DataBR } from "@/components/ProcessCard";
import Timeline from "@/components/Timeline";
import { ConfiancaBadge, SourceTag } from "@/components/SourceTag";
import { EntidadeLink } from "@/components/Entidade";
import { backlinks, dataBR, ref } from "@/lib/backlinks";
import {
  documentosDoProcesso,
  eventosDoProcesso,
  processoPorId,
  processos,
} from "@/lib/data";
import { SIGILO_LABEL, STATUS_LABEL, TIPO_DOCUMENTO_LABEL } from "@/lib/schema";

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
  const pecas = documentosDoProcesso(p.id);

  return (
    <article>
      <header>
        <Link href="/processos" className="kicker no-underline hover:text-accent">
          ← Voltar para processos
        </Link>
        <p className="kicker mt-4">Processo · {p.tribunal}</p>
        <h1 className="headline mt-1 text-4xl text-ink">{p.numero}</h1>
        <p className="headline mt-2 max-w-3xl text-2xl text-ink-2">{p.apelido}</p>
        <div className="rule-thick mt-4" />
        <FichaDados
          itens={[
            ["Situação", STATUS_LABEL[p.status]],
            ["Sigilo", SIGILO_LABEL[p.sigilo]],
            ["Relator", p.relator_atual],
            ["Última movimentação", p.ultima_movimentacao ? <DataBR iso={p.ultima_movimentacao.data} /> : "—"],
            ["Confiança", <ConfiancaBadge confianca={p.confianca} />],
          ]}
        />
      </header>

      <div className="detalhe-grade">
        <div className="detalhe-corpo">
          {p.sigilo === "sigiloso" && (
            <p className="border-l-2 border-accent bg-surface-2/60 px-4 py-3 text-sm leading-relaxed text-ink-2">
              Processo sob sigilo. O painel registra apenas dados de tramitação divulgados
              publicamente e o fato de que a peça existe — nunca seu conteúdo.
            </p>
          )}

          <section>
            <h2 className="kicker">O que este processo trata</h2>
            <p className="mt-2 max-w-3xl text-base leading-relaxed text-ink">{p.objeto}</p>
            <div className="mt-3">
              <SourceTag fonte={p} />
            </div>
          </section>

          <section className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="kicker">Quem conduz o processo</h2>
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
              <h2 className="kicker">Movimentação mais recente</h2>
              {p.ultima_movimentacao ? (
                <>
                  <p className="numero mt-2 text-lg text-ink">
                    <DataBR iso={p.ultima_movimentacao.data} />
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">
                    {p.ultima_movimentacao.descricao}
                  </p>
                  <p className="nota mt-1">
                    origem: {p.ultima_movimentacao.origem === "datajud" ? "DataJud/CNJ" : "curadoria manual"}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-ink-3">Nenhuma movimentação registrada.</p>
              )}

              {p.proximo_evento && (
                <div className="mt-4 border-l-2 border-accent pl-3">
                  <p className="kicker text-accent">Próximo ato</p>
                  <p className="numero mt-0.5 text-base text-accent">
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
              <h2 className="titulo-secao">
                Movimentações (DataJud/CNJ)
              </h2>
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
              <h2 className="titulo-secao">O que aconteceu neste processo</h2>
              <div className="mt-2">
                <Timeline eventos={eventos} compacta />
              </div>
            </section>
          )}

          {pecas.length > 0 && (
            <section>
              <h2 className="titulo-secao">
                Documentos identificados · {pecas.length}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-ink-2">
                Peças que as fontes públicas nomeiam. O painel registra o que cada uma decidiu
                segundo a fonte — nunca o inteiro teor.
              </p>
              <ul className="mt-3 divide-y divide-rule">
                {pecas.map((d) => (
                  <li key={d.id} className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[5.5rem_1fr]">
                    <div className="numero text-sm text-ink-3">
                      <div className="text-ink">{dataBR(d.data)}</div>
                      <div className="kicker mt-0.5">{TIPO_DOCUMENTO_LABEL[d.tipo]}</div>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <EntidadeLink entidade={ref(d.id)} comTipo={false} />
                        <ConfiancaBadge confianca={d.confianca} />
                      </div>
                      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-2">{d.resumo}</p>
                      <p className="mt-1 text-xs text-ink-3">
                        Assinada por{" "}
                        <Link href={ref(d.autor_id).href} className="underline hover:text-accent">
                          {ref(d.autor_id).rotulo}
                        </Link>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="detalhe-lateral" aria-label="Referências">
          <Backlinks backlinks={backlinks(p.id)} lateral />
        </aside>
      </div>

    </article>
  );
}
