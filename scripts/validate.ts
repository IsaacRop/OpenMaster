/**
 * Portão de qualidade dos dados. Roda em todo PR (.github/workflows/validate.yml)
 * e localmente com `npm run validate`.
 *
 * Faz o que o Zod sozinho não faz:
 *  1. integridade referencial — `from`/`to` das relações apontam para um id de
 *     Pessoa, Processo OU Documento (várias arestas ligam processo a pessoa, ex.
 *     "Pet 16.662 → afastou → Andrei Rodrigues"), e cada Documento aponta para
 *     um processo e um autor existentes;
 *  2. o guardrail de sigilo — um evento ou documento que referencia processo
 *     `sigiloso` precisa declarar `sigilo_ack`, afirmando que descreve apenas a
 *     existência da peça e a controvérsia, nunca seu conteúdo;
 *  3. a forma do histórico de relatoria — `de: null` significa "data de início
 *     não consta das fontes públicas", o que só faz sentido na relatoria
 *     originária. No meio do histórico, seria lacuna por erro de edição;
 *  4. a proibição de backlink curado — backlinks são derivados de
 *     `relacoes.json`, `processo_id` e `autor_id` em build time. Um campo de
 *     backlink escrito à mão num JSON é erro de schema, não dado: envelhece
 *     sozinho e passa a mentir. Ver `lib/backlinks.ts`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DocumentoArray,
  EventoTimelineArray,
  PessoaArray,
  ProcessoArray,
  RelacaoArray,
} from "../lib/schema";
import { ARQUIVOS, canonico, lerNormalizado } from "./format-data";

const RAIZ = process.cwd();
const erros: string[] = [];
const avisos: string[] = [];

function ler(arquivo: string): unknown {
  try {
    return JSON.parse(readFileSync(join(RAIZ, "data", arquivo), "utf8"));
  } catch (e) {
    erros.push(`data/${arquivo}: não foi possível ler/parsear — ${(e as Error).message}`);
    return null;
  }
}

function validar<S extends { safeParse: (v: unknown) => any }>(
  schema: S,
  raw: unknown,
  arquivo: string,
): any[] {
  if (raw === null) return [];
  const r = schema.safeParse(raw);
  if (!r.success) {
    for (const i of r.error.issues) {
      erros.push(`data/${arquivo} [${i.path.join(".")}]: ${i.message}`);
    }
    return [];
  }
  return r.data;
}

const processos = validar(ProcessoArray, ler("processos.json"), "processos.json");
const timeline = validar(EventoTimelineArray, ler("timeline.json"), "timeline.json");
const pessoas = validar(PessoaArray, ler("pessoas.json"), "pessoas.json");
const relacoes = validar(RelacaoArray, ler("relacoes.json"), "relacoes.json");
const documentos = validar(DocumentoArray, ler("documentos.json"), "documentos.json");

// --- ids únicos -----------------------------------------------------------

function checarIdsUnicos(itens: { id: string }[], arquivo: string) {
  const vistos = new Set<string>();
  for (const it of itens) {
    if (vistos.has(it.id)) erros.push(`data/${arquivo}: id duplicado "${it.id}"`);
    vistos.add(it.id);
  }
}

checarIdsUnicos(processos, "processos.json");
checarIdsUnicos(timeline, "timeline.json");
checarIdsUnicos(pessoas, "pessoas.json");
checarIdsUnicos(relacoes, "relacoes.json");
checarIdsUnicos(documentos, "documentos.json");

// Os ids vivem num espaço único: uma relação aponta para "fachin" sem dizer de
// que coleção veio. Colisão entre coleções faria a aresta resolver para a
// entidade errada, em silêncio.
const porColecao = [
  ["processos.json", processos],
  ["timeline.json", timeline],
  ["pessoas.json", pessoas],
  ["documentos.json", documentos],
] as const;

const origemDoId = new Map<string, string>();
for (const [arquivo, itens] of porColecao) {
  for (const it of itens) {
    const anterior = origemDoId.get(it.id);
    if (anterior) {
      erros.push(
        `data/${arquivo} [${it.id}]: id já usado em data/${anterior}. Ids são únicos ` +
          `entre coleções — relações e backlinks resolvem por id, sem saber a coleção.`,
      );
    }
    origemDoId.set(it.id, arquivo);
  }
}

// --- integridade referencial ---------------------------------------------

const idsProcesso = new Set<string>(processos.map((p) => p.id));
const idsPessoa = new Set<string>(pessoas.map((p) => p.id));
const idsDocumento = new Set<string>(documentos.map((d) => d.id));
/** O universo de nós do grafo é a união das três coleções. */
const idsNo = new Set<string>([...idsProcesso, ...idsPessoa, ...idsDocumento]);

for (const r of relacoes) {
  for (const ponta of ["from", "to"] as const) {
    const id = r[ponta];
    if (!idsNo.has(id)) {
      erros.push(
        `data/relacoes.json [${r.id}.${ponta}]: "${id}" não é id de Pessoa, Processo nem Documento`,
      );
    }
  }
  if (r.from === r.to) {
    erros.push(`data/relacoes.json [${r.id}]: aresta liga o nó a ele mesmo`);
  }
}

for (const d of documentos) {
  if (!idsProcesso.has(d.processo_id)) {
    erros.push(`data/documentos.json [${d.id}.processo_id]: processo inexistente "${d.processo_id}"`);
  }
  if (!idsPessoa.has(d.autor_id)) {
    erros.push(`data/documentos.json [${d.id}.autor_id]: pessoa inexistente "${d.autor_id}"`);
  }
}

for (const e of timeline) {
  for (const id of e.processos) {
    if (!idsProcesso.has(id)) {
      erros.push(`data/timeline.json [${e.id}.processos]: processo inexistente "${id}"`);
    }
  }
  for (const id of e.pessoas) {
    if (!idsPessoa.has(id)) {
      erros.push(`data/timeline.json [${e.id}.pessoas]: pessoa inexistente "${id}"`);
    }
  }
}

// --- guardrails editoriais ------------------------------------------------

const sigilosos = new Set<string>(
  processos.filter((p) => p.sigilo === "sigiloso").map((p) => p.id),
);

for (const e of timeline) {
  const tocaSigiloso = e.processos.filter((id: string) => sigilosos.has(id));
  if (tocaSigiloso.length > 0 && !e.sigilo_ack) {
    erros.push(
      `data/timeline.json [${e.id}]: referencia processo sob sigilo (${tocaSigiloso.join(", ")}) ` +
        `sem "sigilo_ack": true. O evento pode registrar que a peça existe e que há controvérsia, ` +
        `nunca seu conteúdo — marque sigilo_ack para declarar que é o caso.`,
    );
  }
}

for (const d of documentos) {
  if (sigilosos.has(d.processo_id) && !d.sigilo_ack) {
    erros.push(
      `data/documentos.json [${d.id}]: peça em processo sob sigilo (${d.processo_id}) ` +
        `sem "sigilo_ack": true. O registro pode dizer que a peça existe, de quem partiu e ` +
        `o que dela se noticiou publicamente — nunca o inteiro teor.`,
    );
  }
}

// `pdf_url` só existe quando há link público real. Um link para peça de
// processo sigiloso seria a contradição direta do guardrail acima.
for (const d of documentos) {
  if (d.pdf_url && sigilosos.has(d.processo_id)) {
    erros.push(
      `data/documentos.json [${d.id}]: pdf_url em peça de processo sob sigilo (${d.processo_id}).`,
    );
  }
}

// `de: null` = "início não consta das fontes públicas". Isso é aceitável para a
// relatoria originária (o primeiro item), onde a lacuna é a própria informação.
// Depois do primeiro, a data de início é a data de redistribuição, que sempre
// existe — um null ali é erro de edição transformando registro em buraco.
for (const p of processos) {
  p.historico_relatoria.forEach((h: { de: string | null; relator: string }, i: number) => {
    if (h.de === null && i > 0) {
      erros.push(
        `data/processos.json [${p.id}.historico_relatoria.${i}]: "de": null só é válido ` +
          `no primeiro item do histórico (relatoria originária de início desconhecido). ` +
          `Neste item (${h.relator}) informe a data de início da relatoria.`,
      );
    }
  });

  // Coerência de encadeamento: só a relatoria vigente fica em aberto.
  p.historico_relatoria.forEach((h: { ate: string | null; relator: string }, i: number) => {
    if (h.ate === null && i < p.historico_relatoria.length - 1) {
      erros.push(
        `data/processos.json [${p.id}.historico_relatoria.${i}]: "ate": null só é válido ` +
          `no último item — ${h.relator} aparece como relator atual, mas há item posterior.`,
      );
    }
  });
}

// Backlinks sao derivados (lib/backlinks.ts), nunca escritos. Esta checagem roda
// sobre o JSON *bruto*: o Zod descarta chave desconhecida em silencio, entao um
// "aparece_em" curado a mao passaria batido pelo schema e ficaria no arquivo
// envelhecendo, divergindo do que o build calcula.
const CAMPOS_DERIVADOS = [
  "backlinks",
  "backlink",
  "referenciado_por",
  "referenciada_por",
  "referencias",
  "aparece_em",
  "citado_por",
  "citada_por",
  "mencoes",
  "mencionado_em",
  "mencionada_em",
  "eventos",
  "documentos",
  "grau",
];

function varrerDerivados(valor: unknown, arquivo: string, caminho: string) {
  if (Array.isArray(valor)) {
    valor.forEach((v, i) => varrerDerivados(v, arquivo, `${caminho}[${i}]`));
    return;
  }
  if (valor === null || typeof valor !== "object") return;
  for (const [chave, v] of Object.entries(valor as Record<string, unknown>)) {
    const cheio = `${caminho ? caminho + "." : ""}${chave}`;
    if (CAMPOS_DERIVADOS.includes(chave)) {
      erros.push(
        `data/${arquivo} [${cheio}]: campo de backlink escrito a mao. Backlinks sao ` +
          `calculados no build a partir de relacoes.json, processo_id e autor_id ` +
          `(lib/backlinks.ts) — um campo curado aqui envelhece sozinho e passa a mentir. Remova-o.`,
      );
    }
    varrerDerivados(v, arquivo, cheio);
  }
}

for (const arquivo of ARQUIVOS) {
  try {
    varrerDerivados(JSON.parse(lerNormalizado(RAIZ, arquivo)), arquivo, "");
  } catch {
    // JSON invalido ja foi reportado na leitura acima.
  }
}

// Formato canônico. O sync reescreve processos.json com JSON.stringify; se o
// arquivo versionado estiver formatado de outro jeito, a primeira escrita do
// robô reformata tudo e o diff de duas linhas de conteúdo chega com centenas.
for (const arquivo of ARQUIVOS) {
  try {
    const bruto = lerNormalizado(RAIZ, arquivo);
    if (bruto !== canonico(bruto)) {
      erros.push(
        `data/${arquivo}: fora do formato canônico. Rode \`npm run format:data\` — ` +
          `sem isso, o proximo PR do sync vem com o arquivo inteiro reformatado.`,
      );
    }
  } catch {
    // JSON invalido ja foi reportado na leitura acima.
  }
}

// Fonte: o Zod (lib/schema.ts, UrlHttps) já exige https; esta é a rede de
// segurança redundante sobre o JSON bruto, caso o schema mude e alguém
// esqueça de atualizar aqui também.
for (const [arquivo, itens] of [...porColecao, ["relacoes.json", relacoes]] as const) {
  for (const it of itens) {
    if (!/^https:\/\//.test(it.source_url)) {
      erros.push(`data/${arquivo} [${it.id}]: source_url deve ser https`);
    }
  }
}

// --- avisos (não bloqueiam) ----------------------------------------------

const posVistas = new Map<string, string>();
for (const n of [...pessoas, ...processos]) {
  if (!n.pos) continue;
  const chave = `${n.pos.x},${n.pos.y}`;
  const anterior = posVistas.get(chave);
  if (anterior) avisos.push(`mapa: "${n.id}" e "${anterior}" ocupam a mesma posição ${chave}`);
  posVistas.set(chave, n.id);
}

const idsEmArestas = new Set<string>(relacoes.flatMap((r) => [r.from, r.to]));
for (const n of [...pessoas, ...processos]) {
  if (n.pos && !idsEmArestas.has(n.id)) {
    avisos.push(`mapa: "${n.id}" tem posição mas nenhuma relação — ficará solto no grafo`);
  }
}

// `status` é editorial e não se atualiza sozinho quando `ultima_movimentacao`
// muda. Se a movimentação é mais recente que `updated_at`, o status pode ter
// ficado para trás — não bloqueia o build, mas pede uma segunda olhada.
for (const p of processos) {
  if (p.ultima_movimentacao && p.ultima_movimentacao.data > p.updated_at) {
    avisos.push(
      `data/processos.json [${p.id}]: ultima_movimentacao (${p.ultima_movimentacao.data}) é mais ` +
        `recente que updated_at (${p.updated_at}) — confira se "status" ainda reflete o processo.`,
    );
  }
}

// CODEOWNERS com usuário inexistente falha em silêncio no GitHub: a regra
// simplesmente deixa de valer, sem erro. Como é uma trava de segurança do
// repositório, avisa alto enquanto o placeholder estiver lá.
try {
  const codeowners = readFileSync(join(RAIZ, ".github", "CODEOWNERS"), "utf8");
  if (codeowners.includes("@ISAAC-USUARIO-GITHUB")) {
    avisos.push(
      ".github/CODEOWNERS ainda tem o placeholder @ISAAC-USUARIO-GITHUB — " +
        "troque pelo usuário real do GitHub, ou a regra de aprovação obrigatória não valerá nada",
    );
  }
} catch {
  avisos.push(".github/CODEOWNERS não encontrado — nenhum aprovador obrigatório configurado");
}

for (const e of timeline) {
  if (e.tweet && e.tweeted_at) {
    avisos.push(`timeline [${e.id}]: tweet=true e já tem tweeted_at — não será repostado`);
  }
}

// --- saída ----------------------------------------------------------------

const n = (x: unknown[]) => String(x.length).padStart(3);
console.log("openmaster — validação de dados\n");
console.log(`${n(processos)} processos`);
console.log(`${n(timeline)} eventos de timeline`);
console.log(`${n(pessoas)} pessoas/instituições`);
console.log(`${n(documentos)} documentos (peças)`);
console.log(`${n(relacoes)} relações`);
console.log(`${n([...idsNo])} ids no universo de nós (Pessoa + Processo + Documento)\n`);

if (avisos.length) {
  console.log(`avisos (${avisos.length}):`);
  for (const a of avisos) console.log(`  ~ ${a}`);
  console.log("");
}

if (erros.length) {
  console.error(`ERROS (${erros.length}):`);
  for (const e of erros) console.error(`  x ${e}`);
  console.error("\nvalidação falhou.");
  process.exit(1);
}

console.log("validação ok — todos os dados têm fonte e todas as referências resolvem.");
