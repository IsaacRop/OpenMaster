import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CONFIANCA_EXPLICACAO, SourceTag } from "@/components/SourceTag";
import { backlinks, dataBR, grau, grausPorId, ref } from "@/lib/backlinks";
import { dataCorte, pessoaPorId, pessoas, relacoesDoNo } from "@/lib/data";
import { CONFIANCA_LABEL, NIVEL_PRESENCA_LABEL } from "@/lib/schema";

export function generateStaticParams() {
  return pessoas.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = pessoaPorId(id);
  if (!p) return { title: "Envolvido não encontrado — OpenMaster" };
  return { title: `${p.nome} — OpenMaster`, description: p.papel };
}

const iniciais = (nome: string) =>
  nome
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

/** O maior número de referências entre as pessoas: a régua da presença. */
const MAIOR_GRAU = Math.max(1, ...pessoas.map((p) => grausPorId[p.id] ?? 0));

/**
 * A página de uma pessoa é o dossiê: uma folha de papel sobre a mesa, com
 * foto 3×4, resumo e as linhas em que o nome aparece. Ao lado, em vidro, as
 * conexões diretas. O carimbo diz de onde tudo vem — fontes públicas —, e
 * nada no papel sugere culpa: a presença mede frequência, não
 * responsabilidade.
 */
export default async function PessoaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = pessoaPorId(id);
  if (!p) notFound();

  const bl = backlinks(p.id);
  const refs = grau(p.id);
  const segmentos = Math.max(1, Math.ceil((refs / MAIOR_GRAU) * 5));
  const linhas = [...bl.eventos, ...bl.documentos].sort((a, b) =>
    (b.fonte.source_date ?? "").localeCompare(a.fonte.source_date ?? ""),
  );
  const conexoes = relacoesDoNo(p.id).map((r) => ({ relacao: r, outro: ref(r.from === p.id ? r.to : r.from) }));
  const tipo = p.tipo === "instituicao" ? "Instituição" : "Pessoa";

  return (
    <div>
      <nav aria-label="Você está em" className="migalhas">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <Link href="/pessoas">Pessoas</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{p.nome}</span>
      </nav>

      <div className="dossie-grade">
        <article className="papel dossie" aria-labelledby="dossie-nome">
          <p className="dossie-topo">
            <span>DOSSIÊ · {tipo.toUpperCase()}</span>
            <span>ATUALIZADO {dataBR(dataCorte)}</span>
          </p>
          <span className="carimbo" aria-hidden="true">
            FONTES PÚBLICAS
          </span>

          <div className="grid gap-8">
            <header className="flex flex-wrap items-end gap-6">
              <figure className="m-0">
                <div className="dossie-foto">
                  <span className="fita" aria-hidden="true" />
                  {p.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.foto.url} alt={`Retrato de ${p.nome}`} loading="lazy" />
                  ) : (
                    <span aria-hidden="true">{iniciais(p.nome)}</span>
                  )}
                </div>
                {p.foto && (
                  <figcaption className="mt-2 max-w-[7.5rem] text-[0.65rem] leading-snug text-grafite-2">
                    {p.foto.credito} ·{" "}
                    <a href={p.foto.source_url} target="_blank" rel="noopener noreferrer" className="text-azul-tinta underline">
                      {p.foto.licenca}
                    </a>
                  </figcaption>
                )}
              </figure>
              <div className="grid min-w-[13rem] flex-1 gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-azul-tinta">
                  {tipo} · {refs} {refs === 1 ? "referência" : "referências"} na base
                </p>
                <h1 id="dossie-nome" className="m-0">
                  {p.nome}
                </h1>
                <p className="text-base text-tinta-papel">{p.papel}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="dossie-etiqueta">Presença: {NIVEL_PRESENCA_LABEL[p.nivel_presenca]}</span>
                  <span className="dossie-etiqueta">{CONFIANCA_LABEL[p.confianca] ?? "Confirmado"}</span>
                  <span className="dossie-etiqueta">
                    {conexoes.length} {conexoes.length === 1 ? "conexão" : "conexões"}
                  </span>
                </div>
              </div>
            </header>

            <section className="dossie-bloco" aria-labelledby="presenca">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="presenca" className="m-0 font-sans text-xs font-bold uppercase tracking-[0.14em] text-grafite-2">
                  Presença no caso
                </h2>
                <span className="font-extrabold">
                  {refs} {refs === 1 ? "referência" : "referências"}
                </span>
              </div>
              <div className="presenca" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} data-on={i <= segmentos ? "" : undefined} />
                ))}
              </div>
              <p className="text-[0.82rem] leading-normal text-grafite-2">
                Mede com que frequência o nome aparece na base, em relação a quem mais aparece. Não indica
                responsabilidade. O nível editorial —{" "}
                <strong>{NIVEL_PRESENCA_LABEL[p.nivel_presenca].toLowerCase()}</strong> — mede protagonismo nos
                fatos, e não volume.
              </p>
            </section>

            <section className="grid gap-3.5" aria-labelledby="resumo">
              <h2 id="resumo" className="m-0">
                Resumo de participação
              </h2>
              <p className="text-[1.0625rem] leading-[1.7]">{p.resumo_participacao}</p>
              {p.descricao && <p className="text-base leading-[1.7] text-tinta-papel">{p.descricao}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <SourceTag fonte={p} papel />
              </div>
              <p className="text-xs leading-relaxed text-grafite-2">
                Resumo em redação própria, apoiado na fonte acima; não é citação literal.{" "}
                <strong>{CONFIANCA_LABEL[p.confianca] ?? "Confirmado"}</strong>: {CONFIANCA_EXPLICACAO[p.confianca]}
              </p>
            </section>

            {linhas.length > 0 && (
              <section aria-labelledby="aparece">
                <h2 id="aparece" className="mb-2">
                  Aparece na base
                </h2>
                <ol>
                  {linhas.map((b) => (
                    <li key={`${b.origem.id}-${b.chave}`} className="dossie-linha">
                      <span className="text-[0.8rem] font-bold text-grafite-2">
                        {b.fonte.source_date ? dataBR(b.fonte.source_date) : b.origem.sublinha}
                      </span>
                      <div className="min-w-0">
                        <Link href={b.origem.href}>{b.origem.rotulo}</Link>
                        <div className="mt-0.5 text-[0.78rem] text-grafite-2">
                          <SourceTag fonte={b.fonte} papel />
                        </div>
                      </div>
                      <span className="dossie-papel-etiqueta">{b.via}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <p className="dossie-aviso">
              <span className="font-display text-lg font-extrabold leading-none" aria-hidden="true">
                §
              </span>
              <span>
                Esta página reúne o que consta em fontes públicas. Aparecer num processo não significa ter
                cometido crime. Encontrou um erro?{" "}
                <Link href="/metodologia" className="font-bold text-azul-tinta">
                  Veja como pedir correção
                </Link>
                .
              </span>
            </p>
          </div>
        </article>

        <aside className="dossie-lateral grid gap-5" aria-label="Conexões e referências">
          <section className="vidro lateral-cartao" aria-labelledby="conexoes">
            <h2 id="conexoes" className="kicker mb-2 font-sans">
              Conexões diretas
            </h2>
            {conexoes.length ? (
              <ul>
                {conexoes.map(({ relacao, outro }) => (
                  <li key={relacao.id} className="grid gap-0.5">
                    <span className="flex justify-between gap-3">
                      <Link href={outro.href} className="font-semibold text-ink no-underline hover:text-accent">
                        {outro.rotulo}
                      </Link>
                      <span className="text-right text-ink-3">{relacao.rotulo}</span>
                    </span>
                    <SourceTag fonte={relacao} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Nenhuma relação direta registrada.</p>
            )}
            <Link href={`/mapa?entidade=${p.id}`} className="botao-contorno mt-3 w-full">
              Ver no mapa de envolvidos
            </Link>
          </section>

          {bl.relacoes.length > 0 && (
            <section className="panel lateral-cartao" aria-labelledby="citam">
              <h2 id="citam" className="kicker mb-2 font-sans">
                Páginas que citam
              </h2>
              <ul>
                {bl.relacoes.map((b) => (
                  <li key={`${b.origem.id}-${b.via}`} className="flex gap-2.5">
                    <span className="text-accent" aria-hidden="true">
                      ↩
                    </span>
                    <Link href={b.origem.href} className="text-ink no-underline hover:text-accent">
                      {b.origem.rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
