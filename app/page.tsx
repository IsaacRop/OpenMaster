import Link from "next/link";

import { ConfiancaBadge, SourceTag } from "@/components/SourceTag";
import { dataBR, grau } from "@/lib/backlinks";
import { TOTAL_CONVERSAS } from "@/lib/conversas";
import { dataCorte, documentos, pessoas, processos, relacoes, timeline, timelineDesc } from "@/lib/data";
import { STATUS_LABEL, TIPO_LABEL } from "@/lib/schema";

/**
 * A capa. Lê como a primeira página de um jornal, não como painel: uma
 * manchete (o marco mais recente), as chamadas das três seções que mais
 * gente procura, e o noticiário em ordem. Os números da base ficam no pé,
 * pequenos — são o expediente, não a notícia.
 */

const fmt = (n: number) => n.toLocaleString("pt-BR");

export default function Home() {
  const publicados = timelineDesc.filter((e) => e.data <= dataCorte);
  const manchete = publicados.find((e) => e.milestone) ?? publicados[0];
  const feed = publicados.filter((e) => e.id !== manchete.id).slice(0, 10);

  const proximos = processos
    .filter((p) => p.proximo_evento && p.proximo_evento.data >= dataCorte)
    .sort((a, b) => a.proximo_evento!.data.localeCompare(b.proximo_evento!.data))
    .slice(0, 3);
  const emFoco = processos
    .filter((p) => p.status !== "decidido" && p.ultima_movimentacao)
    .sort((a, b) => b.ultima_movimentacao!.data.localeCompare(a.ultima_movimentacao!.data))
    .slice(0, 4);
  const conectados = [...pessoas].sort((a, b) => grau(b.id) - grau(a.id)).slice(0, 5);

  const instituicoes = pessoas.filter((p) => p.tipo === "instituicao").length;
  const registros = processos.length + timeline.length + pessoas.length + documentos.length;

  return (
    <div className="capa">
      <div className="grid gap-x-12 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <article className="manchete" aria-labelledby="manchete-titulo">
            <p className="manchete-meta">
              <span className="kicker text-accent">{TIPO_LABEL[manchete.tipo]}</span>
              <time dateTime={manchete.data} className="kicker">
                {dataBR(manchete.data)}
              </time>
              <ConfiancaBadge confianca={manchete.confianca} />
            </p>
            <h1 id="manchete-titulo" className="manchete-titulo">
              <Link href={`/eventos/${manchete.id}`}>{manchete.titulo}</Link>
            </h1>
            <p className="manchete-resumo">{manchete.descricao}</p>
            <div className="mt-1.5 sm:mt-2">
              <SourceTag fonte={manchete} />
            </div>
          </article>

          <p className="linha-fina">
            O OpenMaster acompanha, de forma independente, o caso Banco Master: da liquidação do
            banco de Daniel Vorcaro, em novembro de 2025, às frentes abertas no Supremo Tribunal
            Federal. Cada decisão, pessoa e relação registrada aqui traz o link da fonte pública de
            onde foi extraída.
          </p>

          <section aria-label="Seções" className="portas">
            <Link href="/mapa" className="porta">
              <span className="porta-secao">Mapa dos envolvidos</span>
              <span className="porta-texto">Quem se liga a quem no caso, e de onde vem cada ligação.</span>
              <span className="porta-numero">
                {fmt(pessoas.length - instituicoes)} pessoas · {fmt(instituicoes)} instituições ·{" "}
                {fmt(relacoes.length)} relações
              </span>
            </Link>
            <Link href="/conversas" className="porta">
              <span className="porta-secao">O celular de Vorcaro</span>
              <span className="porta-texto">As mensagens extraídas dos aparelhos apreendidos, como num app.</span>
              <span className="porta-numero">{fmt(TOTAL_CONVERSAS)} conversas transcritas</span>
            </Link>
            <div className="porta porta-agente">
              <label htmlFor="pergunta-capa" className="porta-secao">
                Pergunte ao agente
              </label>
              <span className="porta-texto">Respostas limitadas à base, sempre com a fonte citada.</span>
              <form action="/agente" method="get" className="porta-form">
                <input
                  id="pergunta-capa"
                  name="q"
                  type="text"
                  required
                  maxLength={500}
                  placeholder="Quem são os envolvidos centrais?"
                  autoComplete="off"
                />
                <button type="submit" aria-label="Perguntar ao agente">
                  <span aria-hidden="true">→</span>
                </button>
              </form>
              <span className="porta-numero">{fmt(registros)} registros consultáveis</span>
            </div>
          </section>

          <section aria-labelledby="ultimas" className="mt-10">
            <div className="secao-cabeca">
              <h2 id="ultimas">Últimas movimentações</h2>
              <Link href="/timeline" className="meta-link hover:text-accent">
                Ver linha do tempo completa →
              </Link>
            </div>
            <ol className="feed">
              {feed.map((e) => (
                <li key={e.id} className="feed-item">
                  <time dateTime={e.data} className="numero feed-data">
                    {dataBR(e.data)}
                  </time>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="kicker">{TIPO_LABEL[e.tipo]}</span>
                      <ConfiancaBadge confianca={e.confianca} />
                    </p>
                    <h3 className="feed-titulo">
                      <Link href={`/eventos/${e.id}`}>{e.titulo}</Link>
                    </h3>
                    {e.descricao && <p className="feed-resumo">{e.descricao}</p>}
                    <SourceTag fonte={e} />
                  </div>
                </li>
              ))}
            </ol>
            <Link href="/timeline" className="meta-link mt-4 hover:text-accent">
              Ver os {fmt(timeline.length)} acontecimentos em ordem →
            </Link>
          </section>
        </div>

        <aside className="lateral lg:col-span-4" aria-label="Agenda, processos e envolvidos">
          {proximos.length > 0 && (
            <section aria-labelledby="a-seguir">
              <div className="secao-cabeca">
                <h2 id="a-seguir">A seguir</h2>
                <span className="kicker">Datas anunciadas</span>
              </div>
              <ol className="lateral-lista">
                {proximos.map((p) => (
                  <li key={p.id} className="grid grid-cols-[5.5rem_1fr] gap-3">
                    <time dateTime={p.proximo_evento!.data} className="numero text-sm text-accent">
                      {dataBR(p.proximo_evento!.data)}
                    </time>
                    <div>
                      <Link href={`/processos/${p.id}`} className="numero text-sm text-ink hover:text-accent">
                        {p.numero}
                      </Link>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{p.proximo_evento!.descricao}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-labelledby="em-foco">
            <div className="secao-cabeca">
              <h2 id="em-foco">Processos em foco</h2>
              <Link href="/processos" className="meta-link hover:text-accent">
                Todos →
              </Link>
            </div>
            <ol className="lateral-lista">
              {emFoco.map((p) => (
                <li key={p.id}>
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <Link href={`/processos/${p.id}`} className="numero text-sm text-ink hover:text-accent">
                      {p.numero}
                    </Link>
                    <span className="kicker">{STATUS_LABEL[p.status]}</span>
                  </p>
                  <p className="mt-0.5 font-serif text-[1.05rem] font-semibold leading-snug text-ink">{p.apelido}</p>
                  <p className="mt-1 text-xs text-ink-3">
                    Última movimentação em <span className="numero">{dataBR(p.ultima_movimentacao!.data)}</span>
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="conectados">
            <div className="secao-cabeca">
              <h2 id="conectados">Mais conectados</h2>
              <Link href="/pessoas" className="meta-link hover:text-accent">
                Quem é quem →
              </Link>
            </div>
            <ol className="lateral-lista">
              {conectados.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3">
                  <Link href={`/pessoas/${p.id}`} className="min-w-0 truncate text-ink hover:text-accent">
                    {p.nome}
                  </Link>
                  <span className="numero shrink-0 text-xs text-ink-3">{grau(p.id)} referências</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-ink-3">
              Quem mais aparece em processos, eventos e relações da base. Aparecer não indica culpa.
            </p>
          </section>
        </aside>
      </div>

      <section aria-label="A base em números" className="numeros-base">
        <p className="kicker">A base em {dataBR(dataCorte)}</p>
        <dl>
          <div>
            <dt>processos</dt>
            <dd>{fmt(processos.length)}</dd>
          </div>
          <div>
            <dt>pessoas e instituições</dt>
            <dd>{fmt(pessoas.length)}</dd>
          </div>
          <div>
            <dt>documentos</dt>
            <dd>{fmt(documentos.length)}</dd>
          </div>
          <div>
            <dt>eventos</dt>
            <dd>{fmt(timeline.length)}</dd>
          </div>
        </dl>
        <Link href="/metodologia" className="meta-link hover:text-accent">
          Como a base é feita →
        </Link>
      </section>
    </div>
  );
}
