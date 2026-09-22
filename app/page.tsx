import Link from "next/link";

import Icone, { type NomeIcone } from "@/components/Icone";
import { ConfiancaBadge, SourceTag } from "@/components/SourceTag";
import { dataBR, grau } from "@/lib/backlinks";
import { TOTAL_CONVERSAS } from "@/lib/conversas";
import { dataCorte, documentos, pessoas, processos, relacoes, timeline, timelineDesc } from "@/lib/data";
import { STATUS_LABEL, TIPO_LABEL } from "@/lib/schema";

/**
 * A capa: uma manchete (o marco mais recente), as chamadas das três seções
 * que mais gente procura, e o noticiário em ordem. Cada bloco leva um ícone
 * para ser achado de relance; os números da base ficam no pé.
 */

const fmt = (n: number) => n.toLocaleString("pt-BR");

function CabecaSecao({
  id,
  icone,
  titulo,
  children,
}: {
  id: string;
  icone: NomeIcone;
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="secao-cabeca">
      <h2 id={id}>
        <span className="icone-chip">
          <Icone nome={icone} tamanho={18} />
        </span>
        {titulo}
      </h2>
      {children}
    </div>
  );
}

function VerMais({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="meta-link">
      {children}
      <Icone nome="direita" tamanho={16} />
    </Link>
  );
}

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

  const numeros: [NomeIcone, string, number][] = [
    ["balanca", "processos", processos.length],
    ["pessoas", "pessoas e instituições", pessoas.length],
    ["documento", "documentos", documentos.length],
    ["relogio", "eventos", timeline.length],
  ];

  return (
    <div className="capa">
      <div className="grid gap-x-8 lg:grid-cols-12">
        <div className="capa-principal lg:col-span-8">
          <article className="manchete" aria-labelledby="manchete-titulo">
            <p className="manchete-meta">
              <span className="selo">
                <Icone nome="estrela" tamanho={13} />
                {TIPO_LABEL[manchete.tipo]}
              </span>
              <time dateTime={manchete.data} className="chip numero">
                <Icone nome="calendario" tamanho={13} />
                {dataBR(manchete.data)}
              </time>
              <ConfiancaBadge confianca={manchete.confianca} />
            </p>
            <h1 id="manchete-titulo" className="manchete-titulo">
              <Link href={`/eventos/${manchete.id}`}>{manchete.titulo}</Link>
            </h1>
            <p className="manchete-resumo">{manchete.descricao}</p>
            <div className="mt-1.5 sm:mt-3">
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
            <Link href="/mapa" className="porta cartao-vivo">
              <span className="icone-chip">
                <Icone nome="mapa" />
              </span>
              <span className="porta-secao">Mapa dos envolvidos</span>
              <span className="porta-texto">Quem se liga a quem no caso, e de onde vem cada ligação.</span>
              <span className="porta-numero">
                {fmt(pessoas.length - instituicoes)} pessoas · {fmt(instituicoes)} instituições ·{" "}
                {fmt(relacoes.length)} relações
              </span>
            </Link>
            <Link href="/conversas" className="porta cartao-vivo">
              <span className="icone-chip">
                <Icone nome="conversas" />
              </span>
              <span className="porta-secao">O celular de Vorcaro</span>
              <span className="porta-texto">As mensagens extraídas dos aparelhos apreendidos, como num app.</span>
              <span className="porta-numero">{fmt(TOTAL_CONVERSAS)} conversas transcritas</span>
            </Link>
            <div className="porta porta-agente">
              <span className="icone-chip">
                <Icone nome="faisca" />
              </span>
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
                  <Icone nome="direita" tamanho={18} />
                </button>
              </form>
              <span className="porta-numero">{fmt(registros)} registros consultáveis</span>
            </div>
          </section>

          <section aria-labelledby="ultimas" className="entra mt-10">
            <CabecaSecao id="ultimas" icone="atividade" titulo="Últimas movimentações">
              <VerMais href="/timeline">Linha do tempo</VerMais>
            </CabecaSecao>
            <ol className="feed cartao-lista">
              {feed.map((e) => (
                <li key={e.id} className="feed-item">
                  <time dateTime={e.data} className="numero feed-data">
                    {dataBR(e.data)}
                  </time>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="chip">{TIPO_LABEL[e.tipo]}</span>
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
            <div className="mt-4">
              <VerMais href="/timeline">Ver os {fmt(timeline.length)} acontecimentos em ordem</VerMais>
            </div>
          </section>
        </div>

        <aside className="lateral entra lg:col-span-4" aria-label="Agenda, processos e envolvidos">
          {proximos.length > 0 && (
            <section aria-labelledby="a-seguir">
              <CabecaSecao id="a-seguir" icone="calendario" titulo="A seguir" />
              <ol className="lateral-lista cartao-lista">
                {proximos.map((p) => (
                  <li key={p.id} className="grid grid-cols-[auto_1fr] items-start gap-3">
                    <time
                      dateTime={p.proximo_evento!.data}
                      className="numero grid w-12 place-items-center rounded-lg bg-accent-soft py-1.5 text-center leading-tight text-accent"
                    >
                      <span className="text-lg font-bold">{p.proximo_evento!.data.slice(8, 10)}</span>
                      <span className="text-[0.7rem] font-medium">
                        {p.proximo_evento!.data.slice(5, 7)}/{p.proximo_evento!.data.slice(2, 4)}
                      </span>
                    </time>
                    <div className="min-w-0">
                      <Link href={`/processos/${p.id}`} className="numero text-sm font-semibold text-ink hover:text-accent">
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
            <CabecaSecao id="em-foco" icone="balanca" titulo="Processos em foco">
              <VerMais href="/processos">Todos</VerMais>
            </CabecaSecao>
            <ol className="lateral-lista cartao-lista">
              {emFoco.map((p) => (
                <li key={p.id}>
                  <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <Link href={`/processos/${p.id}`} className="numero text-sm text-ink-2 hover:text-accent">
                      {p.numero}
                    </Link>
                    <span className="chip">{STATUS_LABEL[p.status]}</span>
                  </p>
                  <p className="mt-1 font-display text-[1.02rem] font-bold leading-snug text-ink">{p.apelido}</p>
                  <p className="mt-1 text-xs text-ink-3">
                    Última movimentação em <span className="numero">{dataBR(p.ultima_movimentacao!.data)}</span>
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="conectados">
            <CabecaSecao id="conectados" icone="pessoas" titulo="Mais conectados">
              <VerMais href="/pessoas">Quem é quem</VerMais>
            </CabecaSecao>
            <ol className="lateral-lista cartao-lista">
              {conectados.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <Link href={`/pessoas/${p.id}`} className="min-w-0 truncate font-medium text-ink hover:text-accent">
                    {p.nome}
                  </Link>
                  <span className="chip numero">{grau(p.id)} referências</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 px-1 text-xs leading-relaxed text-ink-3">
              Quem mais aparece em processos, eventos e relações da base. Aparecer não indica culpa.
            </p>
          </section>
        </aside>
      </div>

      <section aria-labelledby="numeros" className="numeros-base">
        <CabecaSecao id="numeros" icone="livro" titulo={`A base em ${dataBR(dataCorte)}`}>
          <VerMais href="/metodologia">Como a base é feita</VerMais>
        </CabecaSecao>
        <dl>
          {numeros.map(([icone, rotulo, n]) => (
            <div key={rotulo}>
              <dt>
                <span className="icone-chip">
                  <Icone nome={icone} tamanho={18} />
                </span>
                {rotulo}
              </dt>
              <dd>{fmt(n)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
