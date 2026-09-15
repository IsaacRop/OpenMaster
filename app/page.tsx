import Link from "next/link";

import NetworkMap from "@/components/NetworkMap";
import ProcessCard from "@/components/ProcessCard";
import StatBar from "@/components/StatBar";
import Timeline from "@/components/Timeline";
import { dataBR, ref } from "@/lib/backlinks";
import { dataCorte, documentosDesc, processos, timelineDesc } from "@/lib/data";

function SecaoTitulo({ kicker, titulo, href, hrefLabel }: {
  kicker: string;
  titulo: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-1.5">
      <div>
        <p className="kicker">{kicker}</p>
        <h2 className="headline text-2xl text-ink">{titulo}</h2>
      </div>
      {href && (
        <Link href={href} className="kicker no-underline hover:text-seal">
          {hrefLabel} →
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const recentes = timelineDesc.slice(0, 5);
  const proximos = processos
    .filter((p) => p.proximo_evento)
    .sort((a, b) => a.proximo_evento!.data.localeCompare(b.proximo_evento!.data));

  return (
    <div className="space-y-12">
      <section>
        <p className="kicker">Edição de {dataCorte.split("-").reverse().join("/")}</p>
        <h2 className="headline mt-1 max-w-4xl text-4xl sm:text-5xl text-ink">
          Um cluster de {processos.length} processos no STF, acompanhado peça pública por peça
          pública
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-2">
          Este painel reúne, em formato estruturado e versionado, o estado de cada processo do
          caso Banco Master / Daniel Vorcaro em tramitação no Supremo Tribunal Federal, a
          cronologia dos atos e o mapa de quem aparece onde. Nada aqui vem de peça sob sigilo, e
          cada afirmação carrega o link da fonte pública de onde foi extraída. Onde a fonte
          hesita, o painel hesita junto.
        </p>
      </section>

      <StatBar />

      {proximos.length > 0 && (
        <section>
          <SecaoTitulo kicker="Calendário" titulo="Próximos atos" />
          <ul className="mt-4 divide-y divide-rule border-b border-rule">
            {proximos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
                <span className="numero text-lg text-seal">
                  {p.proximo_evento!.data.split("-").reverse().join("/")}
                </span>
                <Link
                  href={`/processos/${p.id}`}
                  className="numero text-sm text-ink no-underline hover:text-seal"
                >
                  {p.numero}
                </Link>
                <span className="text-sm text-ink-2">{p.proximo_evento!.descricao}</span>
              </li>
            ))}
          </ul>
          <p className="kicker mt-2 normal-case tracking-normal">
            Sessões pautadas não são julgamentos realizados — ver{" "}
            <Link href="/metodologia" className="underline hover:text-seal">
              metodologia
            </Link>
            .
          </p>
        </section>
      )}

      <section>
        <SecaoTitulo
          kicker="Cronologia"
          titulo="Últimos movimentos"
          href="/timeline"
          hrefLabel="linha do tempo completa"
        />
        <div className="mt-2">
          <Timeline eventos={recentes} />
        </div>
      </section>

      <section>
        <SecaoTitulo
          kicker="Cluster"
          titulo="Estado dos processos"
          href="/processos"
          hrefLabel="todos os processos"
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {processos.map((p) => (
            <ProcessCard key={p.id} processo={p} />
          ))}
        </div>
      </section>

      <section>
        <SecaoTitulo
          kicker="Peças"
          titulo="Últimos documentos"
          href="/documentos"
          hrefLabel="todas as peças"
        />
        <ul className="mt-4 divide-y divide-rule border-b border-rule">
          {documentosDesc.slice(0, 5).map((d) => (
            <li key={d.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
              <span className="numero text-sm text-ink-3">{dataBR(d.data)}</span>
              <Link
                href={`/documentos/${d.id}`}
                className="numero text-sm text-ink no-underline hover:text-seal"
              >
                {d.numero_referencia}
              </Link>
              <span className="text-sm text-ink-2">{ref(d.autor_id).rotulo}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SecaoTitulo
          kicker="Quem é quem"
          titulo="Mapa dos envolvidos"
          href="/pessoas"
          hrefLabel="ficha de cada envolvido"
        />
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-2">
          O mapa é explorável: arraste, aproxime, filtre por grupo e por nível de presença. Cada
          nó abre a página da entidade, e seu tamanho é o número de referências que chegam até
          ela.
        </p>
        <div className="mt-5">
          <NetworkMap />
        </div>
      </section>
    </div>
  );
}
