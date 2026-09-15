/**
 * Normaliza os JSONs de /data para o formato canônico.
 *
 * Por que isso existe: `scripts/sync-datajud.ts` reescreve processos.json com
 * JSON.stringify. Se o arquivo no repo estiver formatado de outro jeito — arrays
 * inline, por exemplo — a primeira escrita do robô reformata o arquivo inteiro,
 * e o PR chega com centenas de linhas alteradas para esconder duas de conteúdo.
 *
 * Diff ruidoso não é questão de gosto aqui: o CODEOWNERS existe para que alguém
 * leia o diff contra a fonte. Um diff de 400 linhas não é lido, é aprovado.
 *
 *   npm run format:data
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const ARQUIVOS = [
  "processos.json",
  "timeline.json",
  "pessoas.json",
  "documentos.json",
  "relacoes.json",
] as const;

/** A forma canônica: indentação de 2, quebra final, LF. */
export function canonico(bruto: string): string {
  return JSON.stringify(JSON.parse(bruto), null, 2) + "\n";
}

export function lerNormalizado(raiz: string, arquivo: string): string {
  return readFileSync(join(raiz, "data", arquivo), "utf8").replace(/\r\n/g, "\n");
}

function main() {
  const raiz = process.cwd();
  let mudou = 0;

  for (const arquivo of ARQUIVOS) {
    const bruto = lerNormalizado(raiz, arquivo);
    const alvo = canonico(bruto);
    if (bruto === alvo) {
      console.log(`  ok  data/${arquivo}`);
      continue;
    }
    writeFileSync(join(raiz, "data", arquivo), alvo, "utf8");
    console.log(`  ->  data/${arquivo} reformatado`);
    mudou++;
  }

  console.log(
    mudou === 0
      ? "\nTodos os arquivos já estavam canônicos."
      : `\n${mudou} arquivo(s) reformatado(s).`,
  );
}

// Só formata quando executado direto. `scripts/validate.ts` importa os helpers
// daqui, e validação tem de ser somente leitura: sem esta guarda, rodar
// `npm run validate` reescreveria data/ como efeito colateral do import — e na
// CI reescreveria arquivos no meio da checagem que deveria apenas reprovar.
if (require.main === module) {
  main();
}
