import { ref } from "@/lib/backlinks";
import { arestasDoMapa } from "@/lib/data";
import { arestasGrafo, nosGrafo } from "@/lib/grafo";
import { EntidadeLink } from "./Entidade";
import GrafoEnvolvidos from "./GrafoEnvolvidos";
import { ConfiancaBadge, SourceTag } from "./SourceTag";

/**
 * O grafo é o panorama e agora é explorável; a lista abaixo continua sendo a
 * versão citável — é lá que cada relação aparece com rótulo e fonte clicável,
 * que `<title>` de SVG não comporta e que zoom nenhum substitui.
 */
export default function NetworkMap() {
  return (
    <div>
      <GrafoEnvolvidos nos={nosGrafo} arestas={arestasGrafo} />

      <h3 className="headline mt-8 text-lg text-ink">Relações, uma a uma</h3>
      <p className="mt-1 text-sm text-ink-2">
        O mapa dá o panorama; esta lista é a versão citável — cada ligação com seu rótulo e a
        fonte de onde foi extraída.
      </p>
      <ul className="mt-4 divide-y divide-rule border-y border-rule">
        {arestasDoMapa.map((r) => (
          <li key={r.id} className="py-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <EntidadeLink entidade={ref(r.from)} comTipo={false} />
              <span className="text-ink-3">→</span>
              <EntidadeLink entidade={ref(r.to)} comTipo={false} />
              <ConfiancaBadge confianca={r.confianca} />
            </div>
            <p className="mt-1 text-sm text-ink-2">{r.rotulo}</p>
            <div className="mt-1">
              <SourceTag fonte={r} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
