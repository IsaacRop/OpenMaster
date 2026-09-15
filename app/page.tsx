import Link from "next/link";

import HubGraph from "@/components/HubGraph";
import { ConfiancaBadge, SourceTag } from "@/components/SourceTag";
import { grau } from "@/lib/backlinks";
import { dataCorte, documentos, pessoas, processos, stats, timeline, timelineDesc } from "@/lib/data";
import { TIPO_LABEL } from "@/lib/schema";

const dataBR = (iso: string) => iso.split("-").reverse().join("/");

const ATALHOS = [
  { href: "/timeline", label: "Linha do tempo", valor: stats.marcos, apoio: "marcos" },
  { href: "/processos", label: "Processos", valor: stats.processos, apoio: "frentes" },
  { href: "/pessoas", label: "Pessoas e instituições", valor: stats.envolvidos, apoio: "fichas" },
  { href: "/documentos", label: "Documentos", valor: stats.documentos, apoio: "peças" },
] as const;

export default function Home() {
  const recentes = timelineDesc.filter((e) => e.data <= dataCorte).slice(0, 5);
  const emFoco = processos.find((p) => p.status === "pautado") ?? processos.find((p) => p.status === "em_aberto") ?? processos[0];
  const proximos = processos
    .filter((p) => p.proximo_evento && p.proximo_evento.data >= dataCorte)
    .sort((a, b) => a.proximo_evento!.data.localeCompare(b.proximo_evento!.data))
    .slice(0, 3);
  const conectados = [...pessoas].sort((a, b) => grau(b.id) - grau(a.id)).slice(0, 5);
  const anos = timeline.map((evento) => Number(evento.data.slice(0, 4)));
  const periodo = `${Math.min(...anos)} — ${Math.max(...anos)}`;
  const instituicoes = pessoas.filter((p) => p.tipo === "instituicao").length;
  const pessoasFisicas = pessoas.length - instituicoes;

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-4">
        <div>
          <p className="kicker text-seal">Hub de acompanhamento · Caso Banco Master</p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">Visão geral</h1>
          <p className="mt-1 text-sm text-ink-3">O que mudou, onde está e quem aparece — com a fonte ao lado.</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-ink-3">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
          Base verificada até {dataBR(dataCorte)}
        </div>
      </header>

      <section aria-label="Resumo da base" className="mb-px grid grid-cols-2 gap-px bg-rule md:grid-cols-4">
        {[
          [stats.processos, "Processos", `${stats.emAberto + stats.pautados} em andamento`],
          [pessoasFisicas, "Pessoas", `${instituicoes} instituições`],
          [documentos.length, "Documentos", "peças identificadas"],
          [timeline.length, "Eventos", `${stats.marcos} marcos centrais`],
        ].map(([valor, rotulo, apoio]) => (
          <div key={rotulo} className="bg-paper-3 p-4">
            <p className="kicker">{rotulo}</p>
            <p className="numero mt-1 text-2xl font-medium text-white">{String(valor).padStart(2, "0")}</p>
            <p className="mt-1 text-xs text-ink-3">{apoio}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-px bg-rule lg:grid-cols-[210px_minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <aside className="bg-paper-2 p-4" aria-label="Orientação e filtros do painel">
          <section>
            <p className="kicker">Explorar</p>
            <nav className="mt-3" aria-label="Seções da base">
              <ul className="divide-y divide-rule">
                {ATALHOS.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="group flex items-center justify-between gap-3 py-3 no-underline">
                      <span className="text-sm text-ink-2 group-hover:text-ink">{item.label}</span>
                      <span className="numero text-xs text-ink-3">{item.valor} {item.apoio}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </section>

          <section className="mt-7 border-t border-rule pt-5">
            <p className="kicker">Status da informação</p>
            <div className="mt-3 space-y-2.5">
              <ConfiancaBadge confianca="confirmado" />
              <ConfiancaBadge confianca="apuracao" />
              <ConfiancaBadge confianca="controverso" />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-3">O status mede a verificação da informação, não culpa ou inocência.</p>
          </section>

          <section className="mt-7 border-t border-rule pt-5">
            <p className="kicker">Período indexado</p>
            <p className="numero mt-3 text-sm text-ink-2">{periodo}</p>
            <div className="mt-3 h-[3px] bg-rule-strong"><div className="h-[3px] w-[88%] bg-seal" /></div>
          </section>

          <section className="mt-7 border border-rule-strong bg-paper-3 p-3.5">
            <p className="kicker text-seal">Novo por aqui?</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">Veja os acontecimentos em ordem e abra os termos que não conhece.</p>
            <Link href="/timeline" className="meta-link mt-3 text-seal hover:text-seal-soft">Entender o caso <span aria-hidden="true">→</span></Link>
          </section>
        </aside>

        <div className="min-w-0 bg-paper-2 p-4 sm:p-5">
          <section aria-labelledby="atividade-recente">
            <div className="hub-section-title">
              <h2 id="atividade-recente" className="text-base font-semibold text-ink">Atividade recente</h2>
              <Link href="/timeline" className="meta-link hover:text-seal">Ver linha completa →</Link>
            </div>

            <ol className="border-l border-rule-strong">
              {recentes.map((evento) => (
                <li key={evento.id} className="relative grid gap-2 border-b border-rule py-4 pl-5 sm:grid-cols-[96px_1fr] sm:gap-4">
                  <span
                    className={`absolute -left-1 top-[1.35rem] h-2 w-2 rounded-full ${
                      evento.confianca === "confirmado" ? "bg-ok" : evento.confianca === "apuracao" ? "bg-seal" : "bg-disputed"
                    }`}
                    aria-hidden="true"
                  />
                  <time dateTime={evento.data} className="numero text-xs text-ink-3">{dataBR(evento.data)}</time>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="kicker">{TIPO_LABEL[evento.tipo]}</span>
                      <ConfiancaBadge confianca={evento.confianca} />
                    </div>
                    <Link href={`/eventos/${evento.id}`} className="mt-1 block text-[0.95rem] font-medium leading-snug text-ink no-underline hover:text-seal">
                      {evento.titulo}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-3">{evento.descricao}</p>
                    <div className="mt-1"><SourceTag fonte={evento} /></div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-6" aria-labelledby="processo-em-foco">
            <div className="hub-section-title">
              <h2 id="processo-em-foco" className="text-base font-semibold text-ink">Processo em foco</h2>
              <Link href="/processos" className="meta-link hover:text-seal">Todos os processos →</Link>
            </div>
            <article className="mt-4 border border-rule-strong bg-paper-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/processos/${emFoco.id}`} className="numero text-sm text-seal no-underline hover:text-seal-soft">{emFoco.numero}</Link>
                <ConfiancaBadge confianca={emFoco.confianca} />
              </div>
              <h3 className="mt-3 text-lg font-semibold leading-snug text-white">{emFoco.apelido}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-2">{emFoco.objeto}</p>
              <dl className="mt-4 grid gap-3 border-t border-rule pt-4 sm:grid-cols-3">
                <div><dt className="kicker">Tribunal</dt><dd className="mt-1 text-sm text-ink-2">{emFoco.tribunal}</dd></div>
                <div><dt className="kicker">Última movimentação</dt><dd className="numero mt-1 text-sm text-ink-2">{emFoco.ultima_movimentacao ? dataBR(emFoco.ultima_movimentacao.data) : "—"}</dd></div>
                <div><dt className="kicker">Situação</dt><dd className="mt-1 text-sm text-ink-2">{emFoco.status === "pautado" ? "Pautado" : emFoco.status === "em_aberto" ? "Em aberto" : "Decidido"}</dd></div>
              </dl>
            </article>
          </section>
        </div>

        <aside className="min-w-0 bg-paper-2 p-4 sm:p-5" aria-label="Relações e agenda">
          <section aria-labelledby="grafo-resumo">
            <div className="hub-section-title">
              <h2 id="grafo-resumo" className="text-base font-semibold text-ink">Grafo de envolvidos</h2>
              <span className="numero text-xs text-ink-3">{pessoas.length + processos.length} nós</span>
            </div>
            <div className="mt-4 border border-rule-strong bg-paper-3 p-2"><HubGraph /></div>
            <p className="mt-2 text-xs leading-relaxed text-ink-3">Linhas mostram relações documentadas; não indicam culpa ou participação em crime.</p>
          </section>

          <section className="mt-6" aria-labelledby="mais-conectados">
            <div className="hub-section-title">
              <h2 id="mais-conectados" className="text-base font-semibold text-ink">Mais conectados</h2>
              <Link href="/pessoas" className="meta-link hover:text-seal">Ver fichas →</Link>
            </div>
            <ol className="divide-y divide-rule">
              {conectados.map((pessoa) => (
                <li key={pessoa.id}>
                  <Link href={`/pessoas/${pessoa.id}`} className="group flex items-center justify-between gap-3 py-3 no-underline">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pessoa.confianca === "confirmado" ? "bg-ok" : pessoa.confianca === "apuracao" ? "bg-seal" : "bg-disputed"}`} />
                      <span className="truncate text-sm text-ink-2 group-hover:text-ink">{pessoa.nome}</span>
                    </span>
                    <span className="numero shrink-0 text-xs text-ink-3">{grau(pessoa.id)} refs.</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          {proximos.length > 0 && (
            <section className="mt-6" aria-labelledby="agenda">
              <div className="hub-section-title">
                <h2 id="agenda" className="text-base font-semibold text-ink">Próximos atos</h2>
                <span className="kicker">Datas anunciadas</span>
              </div>
              <ol className="divide-y divide-rule">
                {proximos.map((processo) => (
                  <li key={processo.id} className="grid grid-cols-[70px_1fr] gap-3 py-3">
                    <time dateTime={processo.proximo_evento!.data} className="numero text-xs text-seal">{dataBR(processo.proximo_evento!.data)}</time>
                    <div>
                      <Link href={`/processos/${processo.id}`} className="numero text-xs text-ink no-underline hover:text-seal">{processo.numero}</Link>
                      <p className="mt-1 text-xs leading-relaxed text-ink-3">{processo.proximo_evento!.descricao}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
