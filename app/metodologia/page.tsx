import type { Metadata } from "next";

import { documentos, pessoas, processos, relacoes, timeline } from "@/lib/data";

export const metadata: Metadata = {
  title: "Metodologia — OpenMaster",
  description:
    "De onde vem cada dado do painel, o que não publicamos e por quê, e como pedir uma correção.",
};

/** As fontes efetivamente citadas nos dados, contadas a partir deles. */
const fontes = (() => {
  const mapa = new Map<string, { nome: string; url: string; n: number }>();
  for (const item of [...processos, ...timeline, ...pessoas, ...documentos, ...relacoes]) {
    const atual = mapa.get(item.source_url);
    if (atual) atual.n++;
    else mapa.set(item.source_url, { nome: item.source_name, url: item.source_url, n: 1 });
  }
  return [...mapa.values()].sort((a, b) => b.n - a.n);
})();

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="headline border-b border-ink pb-1.5 text-2xl text-ink">{titulo}</h3>
      <div className="mt-3 max-w-3xl space-y-3 text-base leading-relaxed text-ink-2">
        {children}
      </div>
    </section>
  );
}

export default function MetodologiaPage() {
  return (
    <div className="space-y-10">
      <header>
        <p className="kicker">Como este painel é feito</p>
        <h2 className="headline mt-1 text-4xl text-ink">Metodologia</h2>
        <div className="rule-thick mt-4" />
      </header>

      <div className="border-l-4 border-seal bg-paper-2/60 px-5 py-4">
        <p className="kicker text-seal">Corte temporal desta edição</p>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-ink">
          Os dados desta sessão têm corte em 14/09/2026 e a sessão de 15/09 ainda não havia
          ocorrido. Verifique a matéria fonte antes de tratar qualquer item futuro como
          resultado.
        </p>
      </div>

      <Secao titulo="O que é e o que não é">
        <p>
          Projeto de acompanhamento independente, sem vínculo com o STF, o CNJ, a Polícia
          Federal, o Banco Master ou qualquer parte. Não é fonte oficial, não é assessoria
          jurídica e não substitui a consulta ao andamento processual no próprio tribunal.
        </p>
      </Secao>

      <Secao titulo="De onde vêm os dados">
        <p>
          <strong className="font-semibold text-ink">Metadados de tramitação</strong> vêm da API
          Pública do DataJud, mantida pelo CNJ — API oficial, pública e feita para consumo
          automatizado. Ela indexa processos pelo número CNJ de 20 dígitos; a numeração de classe
          do STF (“Pet 16.662”) não é número CNJ, então a maior parte do cluster hoje aparece
          como <em>sem sincronização automática</em>, e não como dado faltante. Quando o índice de
          um tribunal não responde, o painel diz isso na ficha do processo em vez de fingir que a
          consulta ocorreu.
        </p>
        <p>
          <strong className="font-semibold text-ink">Conteúdo interpretativo</strong> — o que cada
          decisão fez, quem pediu o quê — é curadoria manual a partir de cobertura jurídica
          pública, estruturada à mão e enviada por pull request. As publicações citadas não são
          raspadas: são lidas por uma pessoa, que então registra o dado com o link de volta.
        </p>
        <p>
          O portal do STF <strong className="font-semibold text-ink">não</strong> é acessado por
          robô. O robots.txt do site proíbe acesso automatizado, e as peças eletrônicas completas
          exigem certificado ICP-Brasil.
        </p>
      </Secao>

      <Secao titulo="O que não publicamos">
        <p>
          Conteúdo de peça sob sigilo não entra, ainda que apareça em alguma cobertura. Quando há
          disputa pública sobre o sigilo de um documento, o painel registra que a controvérsia
          existe — nunca o que o documento diz.
        </p>
        <p>
          Afirmação sobre pessoa nomeada sem link de fonte também não entra: a validação de dados
          que roda a cada alteração rejeita o registro, e o site não compila.
        </p>
      </Secao>

      <Secao titulo="Hedging: por que alguns itens vêm marcados">
        <p>
          Cada registro carrega um grau de confiança que espelha o da própria fonte.{" "}
          <span className="numero text-seal">Em apuração</span> marca o que a imprensa ainda trata
          como apuração em curso, e também atos apenas pautados — uma sessão marcada não é um
          julgamento realizado.{" "}
          <span className="numero text-disputed">Ponto controverso</span> marca aquilo sobre o que há
          disputa pública. Quando um ato pautado acontece, o resultado entra como evento novo; o
          item de pauta permanece como estava, para que o registro do que se esperava não seja
          reescrito pelo que veio depois.
        </p>
      </Secao>

      <Secao titulo="Nível de presença e resumo de participação">
        <p>
          Cada envolvido carrega dois campos que são julgamento editorial declarado, não medição:
          o <strong className="font-semibold text-ink">nível de presença</strong> (central,
          recorrente ou periférico) e um{" "}
          <strong className="font-semibold text-ink">resumo de participação</strong> de duas a
          quatro frases. O nível mede protagonismo nos fatos, não frequência de menção — quem é
          citado dez vezes de passagem continua periférico, e quem assina o ato que muda o rumo do
          caso é central ainda que apareça uma vez. Quem quiser a medida de volume tem o número de
          referências, que é contado e aparece em cada página.
        </p>
        <p>
          Os dois campos são curados à mão e cobertos pela mesma exigência de fonte que todo o
          resto. São redação nossa apoiada na fonte, não citação literal dela.
        </p>
      </Secao>

      <Secao titulo="Documentos: o que registramos de cada peça">
        <p>
          O painel cataloga as peças que as fontes públicas nomeiam — decisões, liminares,
          despachos e ofícios — com autor, data, processo e o efeito que a cobertura lhes
          atribui. Não há transcrição de inteiro teor, e o link para o documento só existe quando
          há um link público real: campo vazio é informação, link quebrado é ruído.
        </p>
      </Secao>

      <Secao titulo="Backlinks são calculados, nunca escritos">
        <p>
          A seção “o que aponta para aqui”, presente em toda página de entidade, é derivada dos
          dados a cada build, a partir das referências que já existem: os processos e pessoas que
          um evento cita, o processo e o autor de uma peça, as duas pontas de cada relação.
        </p>
        <p>
          Nenhum arquivo em <code className="numero text-sm">/data</code> guarda essa contagem, e a
          validação recusa qualquer tentativa de escrevê-la à mão. O motivo é simples: um campo
          desses é verdadeiro no dia em que é preenchido e falso no dia seguinte, quando alguém
          acrescenta um evento e esquece de atualizá-lo — e um dado errado tem exatamente a mesma
          aparência de um certo.
        </p>
      </Secao>

      <Secao titulo="Busca e filtros">
        <p>
          A busca é gerada no build e roda inteira no navegador de quem pesquisa: não há servidor
          de busca, e portanto não há onde registrar quem procurou o quê. Num painel sobre
          investigação criminal, isso é parte do que o projeto promete, não detalhe de
          arquitetura.
        </p>
        <p>
          Os filtros de processos e da linha do tempo guardam seu estado na barra de endereços,
          para que um recorte específico possa ser copiado e citado como link.
        </p>
      </Secao>

      <Secao titulo="Fontes citadas nesta edição">
        <ul className="space-y-2">
          {fontes.map((f) => (
            <li key={f.url} className="flex flex-wrap items-baseline gap-2">
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline decoration-rule underline-offset-2 hover:text-seal"
              >
                {f.nome}
              </a>
              <span className="numero text-xs text-ink-3">
                {f.n} {f.n === 1 ? "registro" : "registros"}
              </span>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Correções">
        <p>
          Erro de dado é bug. Abra uma issue ou um pull request no repositório alterando o
          arquivo JSON correspondente em <code className="numero text-sm">/data</code>, com o link
          da fonte que sustenta a correção. O fluxo está descrito no{" "}
          <code className="numero text-sm">CONTRIBUTING.md</code>.
        </p>
      </Secao>
    </div>
  );
}
