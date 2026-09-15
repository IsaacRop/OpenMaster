/**
 * Sincroniza metadados de movimentação processual a partir da API Pública do
 * DataJud (CNJ) e atualiza data/processos.json.
 *
 * Decisão editorial embutida: este script NUNCA cria evento de timeline.
 * Timeline é interpretação (quem fez o quê, o que significa) e continua sendo
 * curadoria humana por PR. O que o sync faz é atualizar metadado objetivo e
 * depositar os movimentos novos em data/_pending.json, para que uma pessoa
 * decida se viram evento.
 *
 * Uso:
 *   npm run sync -- --dry-run     não escreve nada, só relata
 *   npm run sync -- --alias stj   consulta outro índice do DataJud
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { DataJudClient, paraMovimentacoes } from "../lib/datajud-client";
import { ProcessoArray, type Movimentacao, type Processo } from "../lib/schema";

const RAIZ = process.cwd();
const ARQ_PROCESSOS = join(RAIZ, "data", "processos.json");
const ARQ_PENDENTES = join(RAIZ, "data", "_pending.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const alias = (() => {
  const i = args.indexOf("--alias");
  return i >= 0 ? args[i + 1] : undefined;
})();

type Pendente = {
  processo_id: string;
  numero: string;
  movimentacao: Movimentacao;
  detectado_em: string;
};

function carregarProcessos(): Processo[] {
  const raw = JSON.parse(readFileSync(ARQ_PROCESSOS, "utf8"));
  const r = ProcessoArray.safeParse(raw);
  if (!r.success) {
    console.error("data/processos.json inválido — rode `npm run validate` antes.");
    process.exit(1);
  }
  return r.data;
}

function carregarPendentes(): Pendente[] {
  if (!existsSync(ARQ_PENDENTES)) return [];
  try {
    return JSON.parse(readFileSync(ARQ_PENDENTES, "utf8"));
  } catch {
    return [];
  }
}

async function main() {
  const processos = carregarProcessos();
  const pendentes = carregarPendentes();
  const agora = new Date().toISOString();

  console.log(`openmaster — sync DataJud${dryRun ? " (dry-run)" : ""}\n`);

  const semNumero = processos.filter((p) => !p.numero_cnj);
  const comNumero = processos.filter((p) => p.numero_cnj);

  for (const p of semNumero) {
    p.sync = "sem_numero_cnj";
    p.sync_checked_at = agora;
  }
  if (semNumero.length) {
    console.log(
      `${semNumero.length} processo(s) sem numero_cnj — fora do sync por construção:\n` +
        semNumero.map((p) => `    ${p.numero}`).join("\n"),
    );
    console.log(
      "    (a numeração de classe do STF não é número CNJ de 20 dígitos; preencha\n" +
        "     numero_cnj quando o processo tiver um, e ele entra no sync sozinho)\n",
    );
  }

  if (comNumero.length === 0) {
    console.log("Nenhum processo elegível para consulta. Nada a fazer.");
    if (!dryRun) gravarProcessos(processos);
    return;
  }

  let client: DataJudClient;
  try {
    client = new DataJudClient({ alias });
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }

  console.log(`Índice: ${client.endpoint}`);
  const probe = await client.verificarAlias();
  if (!probe.disponivel) {
    console.warn(
      `\nÍndice indisponível (${probe.detalhe}).\n` +
        `Marcando os ${comNumero.length} processo(s) elegíveis como "tribunal_indisponivel".\n` +
        "O painel exibe esse estado ao leitor — não silencia a falha.",
    );
    for (const p of comNumero) {
      p.sync = "tribunal_indisponivel";
      p.sync_checked_at = agora;
    }
    if (!dryRun) gravarProcessos(processos);
    return;
  }

  let novos = 0;

  for (const p of comNumero) {
    const res = await client.consultarPorNumero(p.numero_cnj!);
    p.sync_checked_at = agora;

    if (res.status === "tribunal_indisponivel") {
      p.sync = "tribunal_indisponivel";
      console.log(`  ~ ${p.numero}: ${res.detalhe}`);
      continue;
    }
    if (res.status === "erro") {
      p.sync = "erro";
      console.log(`  x ${p.numero}: ${res.detalhe}`);
      continue;
    }
    if (res.status === "nao_encontrado") {
      p.sync = "ativo";
      console.log(`  - ${p.numero}: nenhum registro no índice`);
      continue;
    }

    p.sync = "ativo";
    const movs = paraMovimentacoes(res.processos.flatMap((x) => x.movimentos));
    const conhecidas = new Set(
      p.movimentacoes.map((m) => `${m.data}|${m.codigo ?? ""}|${m.descricao}`),
    );
    const ineditas = movs.filter(
      (m) => !conhecidas.has(`${m.data}|${m.codigo ?? ""}|${m.descricao}`),
    );

    p.movimentacoes = movs;

    // A movimentação manual curada só é sobrescrita por um movimento oficial
    // mais recente — curadoria humana não é apagada por metadado antigo.
    const maisRecente = movs[0];
    if (
      maisRecente &&
      (!p.ultima_movimentacao || maisRecente.data > p.ultima_movimentacao.data)
    ) {
      p.ultima_movimentacao = maisRecente;
      p.updated_at = maisRecente.data;
    }

    for (const m of ineditas) {
      pendentes.push({
        processo_id: p.id,
        numero: p.numero,
        movimentacao: m,
        detectado_em: agora,
      });
    }
    novos += ineditas.length;
    console.log(
      `  ok ${p.numero}: ${movs.length} movimento(s), ${ineditas.length} novo(s)`,
    );
  }

  console.log(`\n${novos} movimento(s) novo(s) aguardando curadoria em data/_pending.json`);

  if (dryRun) {
    console.log("\n--dry-run: nenhum arquivo escrito.");
    return;
  }

  gravarProcessos(processos);
  writeFileSync(ARQ_PENDENTES, JSON.stringify(pendentes, null, 2) + "\n", "utf8");
  console.log("data/processos.json e data/_pending.json atualizados.");
}

function gravarProcessos(processos: Processo[]) {
  writeFileSync(ARQ_PROCESSOS, JSON.stringify(processos, null, 2) + "\n", "utf8");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
