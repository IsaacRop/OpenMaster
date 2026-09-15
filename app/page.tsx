import Link from "next/link";

import NetworkMap from "@/components/NetworkMap";
import ProcessCard from "@/components/ProcessCard";
import { ConfiancaBadge } from "@/components/SourceTag";
import StatBar from "@/components/StatBar";
import Timeline from "@/components/Timeline";
import { dataCorte, processos, timelineDesc } from "@/lib/data";

function SecaoTitulo({
  kicker,
  titulo,
  explicacao,
  href,
  hrefLabel,
}: {
  kicker: string;
  titulo: string;
  explicacao?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-3">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h2 className="headline mt-2 text-2xl text-ink sm:text-3xl">{titulo}</h2>
        {explicacao && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{explicacao}</p>}
      </div>
      {href && (
        <Link href={href} className="meta-link text-seal hover:text-seal-soft">
          {hrefLabel} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

const CAMINHOS = [
  {
    indice: "01",
    titulo: "Entenda o que aconteceu",
    texto: "Os fatos em ordem, com uma explicação curta e a fonte de cada registro.",
    href: "/timeline",
    label: "Abrir linha do tempo",
  },
  {
    indice: "02",
    titulo: "Saiba quem é quem",
    texto: "O papel de cada pessoa e instituição, sem presumir conhecimento jurídico.",
    href: "/pessoas",
    label: "Conhecer envolvidos",
  },
  {
    indice: "03",
    titulo: "Procure uma informação",
    texto: "Busque nomes, decisões, processos ou termos em toda a base de uma vez.",
    href: "/busca",
    label: "Fazer uma busca",
  },
] as const;

export default function Home() {
  const recentes = timelineDesc.filter((e) => e.data <= dataCorte).slice(0, 4);
  const ultimoConfirmado = recentes.find((e) => e.confianca === "confirmado") ?? recentes[0];
  const proximos = processos
    .filter((p) => p.proximo_evento && p.proximo_evento.data >= dataCorte)
    .sort((a, b) => a.proximo_evento!.data.localeCompare(b.proximo_evento!.data));
  const processosEmFoco = processos.filter((p) => p.status !== "decidido").slice(0, 3);

  return (
    <div className="space-y-16 sm:space-y-20">
      <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch">
        <div className="flex flex-col justify-center py-4 lg:py-9">
          <p className="eyebrow">Caso Banco Master no STF</p>
          <h2 className="headline mt-4 max-w-4xl text-[2.65rem] leading-[0.98] text-ink sm:text-6xl">
            Os documentos são públicos. As conexões nem sempre são óbvias.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
            O OpenMaster organiza processos, decisões, documentos e pessoas para você entender
            o caso sem precisar dominar o vocabulário jurídico.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/timeline" className="action-primary">
              Entender o caso <span aria-hidden="true">→</span>
            </Link>
            <Link href="/busca" className="action-secondary">
              Buscar na base
            </Link>
          </div>
          <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-ink-3">
            <span className="mt-1 text-seal" aria-hidden="true">◇</span>
            Cada afirmação leva à sua fonte. Apurações e controvérsias são identificadas
            explicitamente.
          </p>
        </div>

        <aside className="panel relative overflow-hidden p-5 sm:p-6" aria-label="Situação atual do caso">
          <div className="absolute right-0 top-0 h-24 w-24 border-b border-l border-rule/70 bg-seal/[0.035]" />
          <p className="kicker text-seal">Situação da base</p>
          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden border border-rule bg-rule">
            <div className="bg-paper-2 p-4">
              <p className="numero text-3xl text-ink">{processos.length}</p>
              <p className="mt-1 text-sm text-ink-2">processos acompanhados</p>
            </div>
            <div className="bg-paper-2 p-4">
              <p className="numero text-3xl text-seal">
                {processos.filter((p) => p.status !== "decidido").length}
              </p>
              <p className="mt-1 text-sm text-ink-2">ainda em andamento</p>
            </div>
          </div>

          {ultimoConfirmado && (
            <div className="mt-6">
              <p className="kicker">Última atualização confirmada</p>
              <p className="numero mt-2 text-sm text-seal">
                {ultimoConfirmado.data.split("-").reverse().join("/")}
              </p>
              <Link
                href={`/eventos/${ultimoConfirmado.id}`}
                className="mt-1 block text-base font-semibold leading-snug text-ink no-underline hover:text-seal"
              >
                {ultimoConfirmado.titulo}
              </Link>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                {ultimoConfirmado.descricao}
              </p>
            </div>
          )}

          <div className="mt-6 border-t border-rule pt-4">
            <p className="kicker mb-2">Como ler os estados</p>
            <div className="flex flex-wrap gap-2" aria-label="Legenda de verificação">
              <ConfiancaBadge confianca="confirmado" />
              <ConfiancaBadge confianca="apuracao" />
              <ConfiancaBadge confianca="controverso" />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-3">
              As cores indicam o grau de verificação, não culpa ou inocência.
            </p>
          </div>

          <div className="mt-5 border-t border-rule pt-4">
            <p className="status-line">
              <span className="status-dot" aria-hidden="true" />
              Corte dos dados: {dataCorte.split("-").reverse().join("/")}
            </p>
          </div>
        </aside>
      </section>

      <section aria-labelledby="comece-aqui">
        <p className="eyebrow">Comece por aqui</p>
        <h2 id="comece-aqui" className="headline mt-2 max-w-2xl text-3xl text-ink">
          Três caminhos simples para explorar
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {CAMINHOS.map((c) => (
            <Link key={c.indice} href={c.href} className="discovery-card group">
              <span className="numero text-xs text-seal">/{c.indice}</span>
              <h3 className="mt-8 text-lg font-semibold text-ink group-hover:text-seal">{c.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{c.texto}</p>
              <span className="meta-link mt-6 text-seal">
                {c.label} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SecaoTitulo
          kicker="Panorama"
          titulo="O caso em números"
          explicacao="Um retrato do que já foi organizado e verificado nesta base."
        />
        <div className="mt-5">
          <StatBar />
        </div>
      </section>

      {proximos.length > 0 && (
        <section>
          <SecaoTitulo
            kicker="Agenda"
            titulo="O que pode acontecer a seguir"
            explicacao="Datas anunciadas não significam que uma decisão já aconteceu."
          />
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {proximos.map((p) => (
              <li key={p.id} className="panel flex gap-4 p-4">
                <div className="numero min-w-16 border-r border-rule pr-4 text-center text-seal">
                  <span className="block text-2xl leading-none">{p.proximo_evento!.data.slice(8, 10)}</span>
                  <span className="mt-1 block text-xs">
                    {p.proximo_evento!.data.slice(5, 7)}/{p.proximo_evento!.data.slice(0, 4)}
                  </span>
                </div>
                <div>
                  <Link href={`/processos/${p.id}`} className="numero text-sm text-ink no-underline hover:text-seal">
                    {p.numero}
                  </Link>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{p.proximo_evento!.descricao}</p>
                  <p className="kicker mt-2 normal-case tracking-normal text-gold">Ato previsto</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SecaoTitulo
          kicker="Cronologia explicada"
          titulo="O que aconteceu recentemente"
          explicacao="Os acontecimentos mais recentes registrados até a data de corte da base."
          href="/timeline"
          hrefLabel="Ver cronologia completa"
        />
        <div className="mt-3">
          <Timeline eventos={recentes} />
        </div>
      </section>

      <section>
        <SecaoTitulo
          kicker="Processos em foco"
          titulo="Onde o caso está acontecendo"
          explicacao="Cada processo é uma frente diferente. Abra um cartão para entender seu papel."
          href="/processos"
          hrefLabel="Ver todos os processos"
        />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {processosEmFoco.map((p) => <ProcessCard key={p.id} processo={p} />)}
        </div>
      </section>

      <section>
        <SecaoTitulo
          kicker="Mapa de conexões"
          titulo="Veja como os elementos se relacionam"
          explicacao="Pessoas, instituições e processos formam uma rede. Selecione um ponto para destacar suas conexões."
          href="/pessoas"
          hrefLabel="Abrir fichas dos envolvidos"
        />
        <div className="mt-5">
          <NetworkMap mostrarLista={false} />
        </div>
        <p className="plain-note mt-4 max-w-3xl text-sm leading-relaxed">
          Uma linha mostra uma relação registrada nas fontes — não significa, por si só, culpa,
          participação em crime ou concordância entre as pessoas conectadas.
        </p>
      </section>
    </div>
  );
}
