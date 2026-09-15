/**
 * Portão de qualidade dos dados. Roda em todo PR (.github/workflows/validate.yml)
 * e localmente com `npm run validate`.
 *
 * Faz duas coisas que o Zod sozinho não faz:
 *  1. integridade referencial — `from`/`to` das relações apontam para um id de
 *     Pessoa OU de Processo (várias arestas ligam processo a pessoa, ex.
 *     "Pet 16.662 → afastou → Andrei Rodrigues");
 *  2. o guardrail de sigilo — um evento que referencia processo `sigiloso`
 *     precisa declarar `sigilo_ack`, afirmando que descreve apenas a existência
 *     da peça e a controvérsia, nunca seu conteúdo;
 *  3. a forma do histórico de relatoria — `de: null` significa "data de início
 *     não consta das fontes públicas", o que só faz sentido na relatoria
 *     originária. No meio do histórico, seria lacuna por erro de edição.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  EventoTimelineArray,
  PessoaArray,
  ProcessoArray,
  RelacaoArray,
} from "../lib/schema";

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

// --- integridade referencial ---------------------------------------------

const idsProcesso = new Set<string>(processos.map((p) => p.id));
const idsPessoa = new Set<string>(pessoas.map((p) => p.id));
/** O universo de nós do grafo é a união das duas coleções. */
const idsNo = new Set<string>([...idsProcesso, ...idsPessoa]);

for (const r of relacoes) {
  for (const ponta of ["from", "to"] as const) {
    const id = r[ponta];
    if (!idsNo.has(id)) {
      erros.push(
        `data/relacoes.json [${r.id}.${ponta}]: "${id}" não é id de Pessoa nem de Processo`,
      );
    }
  }
  if (r.from === r.to) {
    erros.push(`data/relacoes.json [${r.id}]: aresta liga o nó a ele mesmo`);
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

// Fonte: o Zod já exige source_url; aqui só recusamos esquemas não-http(s).
for (const [arquivo, itens] of [
  ["processos.json", processos],
  ["timeline.json", timeline],
  ["pessoas.json", pessoas],
  ["relacoes.json", relacoes],
] as const) {
  for (const it of itens) {
    if (!/^https?:\/\//.test(it.source_url)) {
      erros.push(`data/${arquivo} [${it.id}]: source_url deve ser http(s)`);
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
console.log(`${n(relacoes)} relações`);
console.log(`${n([...idsNo])} ids no universo de nós (Pessoa + Processo)\n`);

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
