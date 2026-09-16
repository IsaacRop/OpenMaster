import { grau } from "./backlinks";
import { arestasDoMapa, documentos, pessoas, processos, timeline } from "./data";
import { CURADO, MUNDO, meiaExtensao } from "./mapa-mundo";
import type { ArestaGrafo, NoGrafo } from "@/components/GrafoEnvolvidos";

/**
 * Preparo dos dados do grafo para o componente cliente.
 *
 * Vive fora de `lib/data.ts` por uma razão de dependência: `lib/backlinks.ts`
 * importa `data`, então `data` não pode importar `backlinks` de volta. O grau
 * entra no nó aqui, no andar de cima, e é o mesmo número que a seção de
 * backlinks mostra na página da entidade — uma conta só, dois usos.
 */

/**
 * Respiro além da marca. É o que transforma "encostado" em "constelação": sem
 * ele a relaxação para no instante em que as caixas deixam de se cruzar, e o
 * desenho fica tecnicamente correto e visualmente colado.
 */
const MARGEM = { x: 18, y: 24 };
/** Distância mínima da borda do mundo, para o rótulo não sair cortado. */
const BORDA = 48;
const ITERACOES = 400;
const FORCA_ANCORA = 0.014;

/**
 * Redistribui os nós até nenhum se sobrepor, partindo do desenho curado.
 *
 * As posições em `pos` foram feitas à mão num mundo de 1260×800 e, com a
 * entrada de documentos e instituições, passaram a se cruzar em 74 pares — sem
 * que faltasse espaço: as marcas ocupavam só 20% da área. O problema era
 * distribuição, não densidade.
 *
 * É determinístico de ponta a ponta — ordem de iteração fixa, nenhum sorteio —
 * porque roda no servidor e o resultado vai no payload: qualquer variação entre
 * execuções viraria divergência de hidratação.
 */
function distribuir(nos: NoGrafo[]): NoGrafo[] {
  const escalaX = MUNDO.largura / CURADO.largura;
  const escalaY = MUNDO.altura / CURADO.altura;
  const pontos = nos.map((no) => ({ x: no.pos.x * escalaX, y: no.pos.y * escalaY }));
  const ancoras = pontos.map((ponto) => ({ ...ponto }));
  const meias = nos.map((no) => {
    const meia = meiaExtensao(no.tipo);
    return { x: meia.x + MARGEM.x, y: meia.y + MARGEM.y };
  });

  for (let passo = 0; passo < ITERACOES; passo++) {
    // A âncora segura a composição curada no começo e é solta no fim. Se
    // valesse até o último passo, empataria com a separação e sobrariam
    // sobreposições exatamente onde o desenho original era mais apertado.
    const forca = passo < ITERACOES * 0.6 ? FORCA_ANCORA : 0;

    for (let i = 0; i < nos.length; i++) {
      for (let j = i + 1; j < nos.length; j++) {
        const dx = pontos[j].x - pontos[i].x;
        const dy = pontos[j].y - pontos[i].y;
        const invasaoX = meias[i].x + meias[j].x - Math.abs(dx);
        const invasaoY = meias[i].y + meias[j].y - Math.abs(dy);
        // Caixas só se cruzam quando há invasão nos dois eixos.
        if (invasaoX <= 0 || invasaoY <= 0) continue;

        // Separa pelo eixo de menor penetração: é o empurrão mais curto que
        // desfaz o cruzamento, então desloca menos o desenho original.
        if (invasaoX < invasaoY) {
          const metade = (invasaoX / 2) * (dx < 0 ? -1 : 1);
          pontos[i].x -= metade;
          pontos[j].x += metade;
        } else {
          const metade = (invasaoY / 2) * (dy < 0 ? -1 : 1);
          pontos[i].y -= metade;
          pontos[j].y += metade;
        }
      }
    }

    for (let i = 0; i < nos.length; i++) {
      if (forca) {
        pontos[i].x += (ancoras[i].x - pontos[i].x) * forca;
        pontos[i].y += (ancoras[i].y - pontos[i].y) * forca;
      }
      pontos[i].x = Math.min(MUNDO.largura - BORDA, Math.max(BORDA, pontos[i].x));
      pontos[i].y = Math.min(MUNDO.altura - BORDA, Math.max(BORDA, pontos[i].y));
    }
  }

  return nos.map((no, i) => ({
    ...no,
    pos: { x: Math.round(pontos[i].x * 10) / 10, y: Math.round(pontos[i].y * 10) / 10 },
  }));
}

const nosCurados: NoGrafo[] = [
  ...pessoas
    .filter((p) => p.pos)
    .map(
      (p): NoGrafo => ({
        id: p.id,
        rotulo: p.nome,
        papel: p.papel,
        tipo: p.tipo,
        grupo: p.grupo,
        nivel_presenca: p.nivel_presenca,
        grau: grau(p.id),
        pos: p.pos!,
        href: `/pessoas/${p.id}`,
        resumo: p.resumo_participacao,
        confianca: p.confianca,
        source_url: p.source_url,
        source_name: p.source_name,
        source_date: p.source_date,
        // Sem `revisado_em`: `Pessoa` não tem carimbo de revisão no schema, e
        // `source_date` é a data de publicação da fonte. Rotular uma como a
        // outra afirmaria ao leitor que a ficha foi conferida numa data em que
        // ninguém a conferiu. A data da fonte continua visível, como fonte.
        eventos: timeline
          .filter((e) => e.pessoas.includes(p.id))
          .map((e) => ({ id: e.id, data: e.data, titulo: e.titulo, confianca: e.confianca })),
      }),
    ),
  ...processos
    .filter((p) => p.pos)
    .map(
      (p): NoGrafo => ({
        id: p.id,
        rotulo: p.numero.replace("/DF", ""),
        papel: p.apelido,
        tipo: "processo",
        grupo: "processo",
        // Processo não tem nível de presença: o campo é da Pessoa. `null` diz
        // ao filtro para nunca escondê-lo por esse critério.
        nivel_presenca: null,
        grau: grau(p.id),
        pos: p.pos!,
        href: `/processos/${p.id}`,
        resumo: p.objeto,
        confianca: p.confianca,
        source_url: p.source_url,
        source_name: p.source_name,
        source_date: p.source_date,
        revisado_em: p.updated_at,
        eventos: timeline
          .filter((e) => e.processos.includes(p.id))
          .map((e) => ({ id: e.id, data: e.data, titulo: e.titulo, confianca: e.confianca })),
      }),
    ),
  ...documentos
    .filter((d) => processos.some((p) => p.id === d.processo_id && p.pos))
    .map((d, index, todos): NoGrafo => {
      const processo = processos.find((p) => p.id === d.processo_id)!;
      const irmas = todos.filter((item) => item.processo_id === d.processo_id);
      const ordem = irmas.findIndex((item) => item.id === d.id);
      const angulo = -0.8 + ordem * (1.6 / Math.max(1, irmas.length - 1));
      const distancia = 105 + (index % 2) * 16;
      return {
        id: d.id,
        rotulo: d.numero_referencia,
        papel: d.resumo,
        tipo: "documento",
        grupo: "documento",
        nivel_presenca: null,
        grau: grau(d.id),
        pos: {
          x: Math.max(45, Math.min(1215, processo.pos!.x + Math.cos(angulo) * distancia)),
          y: Math.max(55, Math.min(745, processo.pos!.y + Math.sin(angulo) * distancia)),
        },
        href: `/documentos/${d.id}`,
        resumo: d.resumo,
        confianca: d.confianca,
        source_url: d.source_url,
        source_name: d.source_name,
        source_date: d.source_date,
        // Mesma razão das pessoas: `d.data` é quando a peça foi expedida, não
        // quando alguém a revisou. Só `Processo` carrega `updated_at`.
        eventos: [],
      };
    }),
];

export const nosGrafo: NoGrafo[] = distribuir(nosCurados);

const relacoesDocumentais: ArestaGrafo[] = documentos
  .filter((d) => nosGrafo.some((n) => n.id === d.id))
  .map((d) => ({
    id: `documento-processo-${d.id}`,
    from: d.id,
    to: d.processo_id,
    rotulo: "integra o processo",
    peso: "normal",
    direcionada: true,
    confianca: d.confianca,
    apuracao: d.confianca !== "confirmado",
    source_url: d.source_url,
    source_name: d.source_name,
    source_date: d.source_date,
    contexto: d.resumo,
  }));

export const arestasGrafo: ArestaGrafo[] = [...arestasDoMapa.map(
  (r): ArestaGrafo => ({
    id: r.id,
    from: r.from,
    to: r.to,
    rotulo: r.rotulo,
    peso: r.peso,
    direcionada: r.direcionada,
    confianca: r.confianca,
    apuracao: r.confianca !== "confirmado",
    source_url: r.source_url,
    source_name: r.source_name,
    source_date: r.source_date,
    // Sem `contexto`: `Relacao` não tem campo de prosa além de `rotulo`, e
    // repeti-lo aqui faria a ficha exibir a mesma frase duas vezes — como
    // título e de novo sob "Contexto", simulando uma camada de informação que
    // não existe. As relações documentais abaixo têm contexto de verdade.
  }),
), ...relacoesDocumentais];
