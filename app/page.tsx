import Link from "next/link";

import FiltroExtrato from "@/components/FiltroExtrato";
import { ConfiancaBadge, SourceTag } from "@/components/SourceTag";
import { dataBR, grau } from "@/lib/backlinks";
import { TOTAL_CONVERSAS } from "@/lib/conversas";
import { dataCorte, documentos, pessoas, processoPorId, processos, relacoes, timeline, timelineDesc } from "@/lib/data";
import { STATUS_LABEL, TIPO_LABEL, type EventoTimeline } from "@/lib/schema";

/**
 * A capa, na identidade "dossiê sobre a mesa": a manchete em letterbox com a
 * fonte ao lado como papel, as três portas de vidro, o extrato do caso (as
 * movimentações como linhas de extrato bancário) e a lateral com quem mais
 * aparece. Tudo com dado real da base — nenhum número ou documento de
 * enfeite; o que é só decorativo (as tarjas do papel) não carrega dado.
 */

const fmt = (n: number) => n.toLocaleString("pt-BR");

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dataCurta = (iso: string) => {
  const [ano, mes, dia] = iso.split("-");
  return `${Number(dia)} ${MESES[Number(mes) - 1]} ${ano}`;
};

/** O glifo tipográfico de cada tipo de movimentação. */
const GLIFO_TIPO: Record<EventoTimeline["tipo"], string> = {
  decisao: "§",
  movimentacao: "fl.",
  operacao: "‡",
  institucional: "¶",
  imprensa: "“",
};

const iniciais = (nome: string) =>
  nome
    .split(" ")
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

/** Seta a lápis (filtro `omp`), apontando para baixo e à esquerda. */
function SetaLapis() {
  return (
    <svg width="46" height="34" viewBox="0 0 46 34" aria-hidden="true">
      <g filter="url(#omp)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M40 2 C30 4 14 10 6 30" />
        <path d="M2 22 L6 31 L13 25" />
      </g>
    </svg>
  );
}

/** Círculo a lápis em volta de um termo curto. */
function Circulo() {
  return (
    <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
      <path
        filter="url(#omp)"
        d="M30 40 C10 14 80 4 130 8 C180 12 200 28 188 42 C174 58 90 60 50 52 C18 46 8 32 24 20"
        fill="none"
        stroke="var(--lapis-grafite)"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function Home() {
  const publicados = timelineDesc.filter((e) => e.data <= dataCorte);
  const manchete = publicados.find((e) => e.milestone) ?? publicados[0];
  const feed = publicados.filter((e) => e.id !== manchete.id).slice(0, 10);

  // O extrato agrupa por dia, como um app de banco.
  const dias: { data: string; eventos: EventoTimeline[] }[] = [];
  for (const e of feed) {
    const dia = dias.find((d) => d.data === e.data);
    if (dia) dia.eventos.push(e);
    else dias.push({ data: e.data, eventos: [e] });
  }
  const tiposNoFeed = [...new Set(feed.map((e) => e.tipo))];

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
  const processosDaManchete = manchete.processos.map(processoPorId).filter((p) => p !== undefined);

  return (
    <div className="capa">
      <p className="capa-faixa">
        <span>
          Edição de {dataCurta(dataCorte)} · {fmt(registros)} registros
        </span>
        <span>Código aberto · dados de fontes públicas</span>
      </p>

      <article className="manchete" aria-labelledby="manchete-titulo">
        <div className="manchete-grade">
          <div className="manchete-texto">
            <p className="eyebrow">Manchete · {TIPO_LABEL[manchete.tipo]}</p>
            <h1 id="manchete-titulo" className="manchete-titulo">
              <Link href={`/eventos/${manchete.id}`}>{manchete.titulo}</Link>
            </h1>
            <p className="manchete-resumo">{manchete.descricao}</p>
            <p className="lapis ml-6 sm:ml-10" aria-hidden="true">
              <SetaLapis />
              <span>confira a fonte antes de citar</span>
            </p>
            <div className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <SourceTag fonte={manchete} />
              <ConfiancaBadge confianca={manchete.confianca} />
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/eventos/${manchete.id}`} className="cta-principal">
                Ler o registro
              </Link>
              <Link href="/timeline" className="botao-vidro">
                Linha do tempo
              </Link>
            </div>
            <p className="manchete-meta">
              <span>Redação OpenMaster</span>
              <time dateTime={manchete.data}>{dataCurta(manchete.data)}</time>
              <span>
                {manchete.processos.length} {manchete.processos.length === 1 ? "processo citado" : "processos citados"}
              </span>
            </p>
          </div>

          {/*
            A fonte da manchete como papel sobre a mesa. Decorativo e fora da
            árvore de acessibilidade: tudo o que ele mostra já está escrito ao
            lado. As tarjas são só desenho — nenhuma cobre dado real.
          */}
          <div className="manchete-docs" aria-hidden="true">
            <div className="doc-fundo">
              <p className="text-[0.62rem] font-bold tracking-[0.2em]">EXTRATO DO CASO</p>
              <div className="h-px bg-papel-linha" />
              {publicados.slice(0, 4).map((e) => (
                <div key={e.id}>
                  <span>
                    {dataBR(e.data).slice(0, 5)} {TIPO_LABEL[e.tipo].toUpperCase()}
                  </span>
                  <span>{e.confianca === "confirmado" ? "✓" : "…"}</span>
                </div>
              ))}
            </div>
            <div className="papel doc-frente">
              <span className="fita" />
              <p className="doc-rotulo">
                <span>{TIPO_LABEL[manchete.tipo].toUpperCase()} · {dataBR(manchete.data)}</span>
                <span>FONTE</span>
              </p>
              <p className="font-display text-[1.3rem] font-bold leading-tight">{manchete.source_name}</p>
              <div className="tarja-linha w-full" />
              <div className="tarja-linha w-[92%]" />
              <div className="flex gap-1.5">
                <div className="tarja-linha w-[30%]" />
                <div className="tarja-preta w-[44%]" />
                <div className="tarja-linha w-[18%]" />
              </div>
              <div className="tarja-linha w-[76%]" />
              <div className="doc-linha-valor">
                <span className="text-[0.68rem] uppercase tracking-[0.08em] text-grafite-2">
                  {processosDaManchete.length ? "Processo citado" : "Registro"}
                </span>
                <span className="circulado text-[1.05rem] font-extrabold">
                  {processosDaManchete[0]?.numero ?? dataBR(manchete.data)}
                  <Circulo />
                </span>
              </div>
              <div className="tarja-linha w-[88%]" />
              <div className="flex gap-1.5">
                <div className="tarja-preta w-[60%]" />
                <div className="tarja-linha w-[30%]" />
              </div>
              <span className="carimbo">FONTE PÚBLICA</span>
            </div>
          </div>
        </div>
      </article>

      <section aria-label="Seções" className="portas">
        <Link href="/mapa" className="porta vidro cartao-vivo">
          <span className="porta-topo">
            <span className="glifo" aria-hidden="true">⌘</span>
            <span className="porta-numero">
              {fmt(pessoas.length - instituicoes)} pessoas · {fmt(relacoes.length)} conexões
            </span>
          </span>
          <span className="porta-secao">Mapa de envolvidos</span>
          <span className="porta-texto">Quem aparece ao lado de quem, com cada conexão ligada à fonte de origem.</span>
          <span className="porta-cta">Abrir o quadro →</span>
        </Link>
        <Link href="/conversas" className="porta vidro cartao-vivo">
          <span className="porta-topo">
            <span className="glifo" aria-hidden="true">“</span>
            <span className="porta-numero">{fmt(TOTAL_CONVERSAS)} conversas transcritas</span>
          </span>
          <span className="porta-secao">Conversas</span>
          <span className="porta-texto">As mensagens do celular apreendido, na ordem em que foram transcritas.</span>
          <span className="porta-cta">Ler as conversas →</span>
        </Link>
        <div className="porta vidro">
          <span className="porta-topo">
            <span className="glifo" aria-hidden="true">✦</span>
            <span className="porta-numero">{fmt(registros)} registros consultáveis</span>
          </span>
          <label htmlFor="pergunta-capa" className="porta-secao">
            Agente de IA
          </label>
          <span className="porta-texto">Pergunte em português. Toda resposta cita a fonte de onde saiu.</span>
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </form>
        </div>
      </section>

      <div className="capa-grade entra">
        <section aria-labelledby="ultimas" className="panel extrato">
          <FiltroExtrato
            tipos={tiposNoFeed.map((t) => ({ valor: t, rotulo: TIPO_LABEL[t] }))}
            cabeca={
              <div>
                <p className="kicker">Extrato do caso</p>
                <h2 id="ultimas" className="extrato-titulo">
                  Últimas movimentações
                </h2>
              </div>
            }
          >
            {dias.map((dia, i) => (
              <div key={dia.data} className="extrato-grupo">
                <p className="extrato-dia">
                  {dataCurta(dia.data)}
                  {i === 0 ? " · mais recente" : ""}
                </p>
                <ol>
                  {dia.eventos.map((e) => (
                    <li key={e.id} className="extrato-linha" data-tipo={e.tipo}>
                      <span className="glifo glifo-neutro" aria-hidden="true">
                        {GLIFO_TIPO[e.tipo]}
                      </span>
                      <div className="grid min-w-0 flex-1 gap-1">
                        <h3 className="m-0 font-sans text-base leading-snug tracking-normal">
                          <Link href={`/eventos/${e.id}`} className="extrato-linha-titulo">
                            {e.titulo}
                          </Link>
                        </h3>
                        <p className="extrato-linha-meta">
                          <span>{TIPO_LABEL[e.tipo]}</span>
                          {e.processos.slice(0, 2).map((id) => {
                            const p = processoPorId(id);
                            return p ? <span key={id}>{p.numero}</span> : null;
                          })}
                        </p>
                        <SourceTag fonte={e} />
                      </div>
                      <div className="extrato-status">
                        {e.data === dataCorte && <span className="chip chip-novo">Novo</span>}
                        <ConfiancaBadge confianca={e.confianca} />
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </FiltroExtrato>
          <p className="extrato-pe">
            <span className="text-ink-3">
              {fmt(timeline.length)} acontecimentos em {fmt(processos.length)} processos
            </span>
            <Link href="/timeline" className="meta-link">
              Extrato completo →
            </Link>
          </p>
        </section>

        <aside className="lateral" aria-label="Quem mais aparece, agenda e processos">
          <section aria-labelledby="conectados" className="panel lateral-cartao">
            <p className="kicker">Na base</p>
            <h2 id="conectados" className="mb-2 text-[1.625rem]">
              Mais citados
            </h2>
            <ol>
              {conectados.map((p) => (
                <li key={p.id}>
                  <Link href={`/pessoas/${p.id}`} className="group flex items-center gap-3 text-ink no-underline">
                    <span className="avatar" aria-hidden="true">
                      {iniciais(p.nome)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold group-hover:text-accent">{p.nome}</span>
                      <span className="block truncate text-[0.78rem] text-ink-3">{p.papel}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-extrabold">{grau(p.id)}</span>
                      <span className="block text-[0.68rem] text-ink-3">referências</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs leading-relaxed text-ink-3">
              Frequência na base, nunca grau de culpa.{" "}
              <Link href="/pessoas" className="font-bold text-accent no-underline hover:text-accent-hover">
                Quem é quem →
              </Link>
            </p>
          </section>

          {proximos.length > 0 && (
            <section aria-labelledby="a-seguir" className="panel lateral-cartao">
              <p className="kicker">Agenda</p>
              <h2 id="a-seguir" className="mb-2 text-[1.625rem]">
                A seguir
              </h2>
              <ol>
                {proximos.map((p) => (
                  <li key={p.id} className="grid grid-cols-[4.5rem_1fr] gap-3">
                    <time dateTime={p.proximo_evento!.data} className="font-extrabold text-accent">
                      {dataBR(p.proximo_evento!.data).slice(0, 5)}
                    </time>
                    <div className="min-w-0">
                      <Link href={`/processos/${p.id}`} className="font-semibold text-ink no-underline hover:text-accent">
                        {p.numero}
                      </Link>
                      <p className="mt-0.5 text-[0.8rem] leading-relaxed text-ink-3">{p.proximo_evento!.descricao}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-labelledby="em-foco" className="panel lateral-cartao">
            <p className="kicker">Em andamento</p>
            <h2 id="em-foco" className="mb-2 text-[1.625rem]">
              Processos em foco
            </h2>
            <ol>
              {emFoco.map((p) => (
                <li key={p.id}>
                  <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <Link href={`/processos/${p.id}`} className="font-semibold text-ink no-underline hover:text-accent">
                      {p.numero}
                    </Link>
                    <span className="chip">{STATUS_LABEL[p.status]}</span>
                  </p>
                  <p className="mt-0.5 text-[0.8rem] text-ink-3">
                    {p.apelido} · última movimentação em {dataBR(p.ultima_movimentacao!.data)}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <div className="postit">
            <span className="fita" />
            <p className="mb-2 font-lapis text-[1.35rem] leading-tight">Como ler este site</p>
            <p className="text-sm leading-relaxed">
              Aparecer num processo não significa ter cometido crime. Cada informação aqui mostra de onde
              veio: o link da fonte pública, a data e o grau de confirmação.
            </p>
            <p className="mt-3 text-[0.8rem]">
              <Link href="/metodologia">Nossa metodologia →</Link>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
