/**
 * Checklist verificável da atualização pós-sessão da Pet 16.662 (15/09/2026).
 *
 * Por que script e não documento: a tentação, num dia em que a sessão é notícia
 * quente, é pular a conferência e postar. Um markdown não impede ninguém de
 * pular linha; este script confere o que dá para conferir sozinho, imprime os
 * seis passos na ordem e sai com código != 0 enquanto algum passo obrigatório
 * não estiver cumprido.
 *
 *   npm run pos-sessao
 *
 * Ele nunca escreve em nada, nunca abre PR e nunca posta. Só lê, confere e diz
 * qual é o próximo passo.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { EventoTimelineArray, ProcessoArray, type EventoTimeline } from "../lib/schema";
import { LIMITE_CHARS, textoDoEvento } from "../lib/tweet-template";

const RAIZ = process.cwd();
const PROCESSO = "pet-16662";
const EVENTO_PAUTA = "2026-09-15-sessao-plenario-pet-16662";
const DATA_SESSAO = "2026-09-15";

/**
 * Estado anterior à sessão, congelado aqui de propósito.
 *
 * O evento de pauta é registro histórico: no dia 14/09 o que existia era uma
 * expectativa, e o painel guarda isso. Se algum destes campos mudar, alguém
 * reescreveu a expectativa com o resultado — que é exatamente o que o passo 2
 * proíbe.
 */
const PAUTA_ORIGINAL = {
  data: "2026-09-15",
  titulo: "Sessão de Plenário — Pet 16.662",
  confianca: "apuracao",
  milestone: true,
  descricao:
    "Julga a decisão de 08/09 do Min. Mendonça (afastamento e suspensão de relatórios de inteligência); PGR pede nulidade do relatório policial que originou o procedimento.",
};

const PROCESSO_ANTES = { status: "pautado", ultima_movimentacao: "2026-09-12" };

// --- infra de relatório ---------------------------------------------------

type Estado = "ok" | "pendente" | "erro" | "manual";

const SIMBOLO: Record<Estado, string> = {
  ok: "[ok]     ",
  pendente: "[pendente]",
  erro: "[ERRO]   ",
  manual: "[manual] ",
};

let bloqueado = false;

function passo(n: number, titulo: string) {
  console.log(`\n${"─".repeat(72)}\n${n}. ${titulo}\n`);
}

function linha(estado: Estado, texto: string) {
  if (estado === "erro" || estado === "pendente") bloqueado = true;
  console.log(`  ${SIMBOLO[estado]} ${texto}`);
}

function nota(texto: string) {
  for (const l of texto.trim().split("\n")) console.log(`            ${l.trim()}`);
}

function git(cmd: string): string | null {
  try {
    return execSync(`git ${cmd}`, { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function ler<T>(schema: { parse: (v: unknown) => T }, arquivo: string): T {
  return schema.parse(JSON.parse(readFileSync(join(RAIZ, "data", arquivo), "utf8")));
}

// --- execução -------------------------------------------------------------

const timeline = ler(EventoTimelineArray, "timeline.json");
const processos = ler(ProcessoArray, "processos.json");

const pauta = timeline.find((e) => e.id === EVENTO_PAUTA);
const processo = processos.find((p) => p.id === PROCESSO);

/**
 * O evento do resultado: qualquer evento de 15/09 em diante que cite a
 * Pet 16.662, não seja o item de pauta e esteja marcado como confirmado.
 */
const novos = timeline.filter(
  (e) =>
    e.id !== EVENTO_PAUTA &&
    e.data >= DATA_SESSAO &&
    e.processos.includes(PROCESSO) &&
    e.confianca === "confirmado",
);
const resultado: EventoTimeline | undefined = novos[0];

console.log("painel-caso-master — checklist pós-sessão da Pet 16.662 (15/09/2026)");
console.log("Este script não escreve, não abre PR e não posta. Só confere.");

// 1 -------------------------------------------------------------------------
passo(1, "Reabrir a fonte primária e confirmar o que foi decidido");
linha("manual", "Nenhuma automação substitui esta leitura.");
nota(`
  Fonte do item de pauta, para reabrir:
  ${pauta?.source_url ?? "(evento de pauta não encontrado)"}

  Procure a cobertura do RESULTADO, não a da expectativa. Se as fontes
  divergirem sobre o que foi decidido, o registro é confianca: "controverso",
  não uma escolha entre elas.
`);

// 2 -------------------------------------------------------------------------
passo(2, "Adicionar evento NOVO com o resultado — sem tocar no evento de pauta");

if (!pauta) {
  linha("erro", `Evento de pauta "${EVENTO_PAUTA}" sumiu de data/timeline.json.`);
  nota("Ele precisa continuar existindo, como registro do que se esperava.");
} else {
  const alterados = (Object.keys(PAUTA_ORIGINAL) as (keyof typeof PAUTA_ORIGINAL)[]).filter(
    (k) => (pauta as unknown as Record<string, unknown>)[k] !== PAUTA_ORIGINAL[k],
  );
  if (alterados.length === 0) {
    linha("ok", "Evento de pauta intacto (expectativa preservada como registro).");
  } else {
    linha("erro", `Evento de pauta foi editado: ${alterados.join(", ")}.`);
    nota(`
      Reverta essas alterações. O resultado entra como evento NOVO; o item de
      pauta fica como estava, senão o painel perde a informação de que aquilo
      era expectativa até 15/09.
    `);
  }
}

if (!resultado) {
  linha("pendente", "Nenhum evento novo de resultado encontrado.");
  nota(`
    Adicione a data/timeline.json um evento com:
      "id":        "2026-09-15-resultado-sessao-pet-16662"  (ou data real do ato)
      "data":      "${DATA_SESSAO}" ou posterior
      "tipo":      "decisao"
      "confianca": "confirmado"
      "processos": ["${PROCESSO}"]
      "source_url" apontando para a cobertura DO RESULTADO
      "tweet":     false   <- deixe false até ter lido o dry-run (passo 4)
  `);
} else {
  linha("ok", `Evento de resultado encontrado: "${resultado.id}".`);
  if (novos.length > 1) {
    nota(`Há ${novos.length} eventos candidatos; conferindo o primeiro por data.`);
  }
  if (resultado.source_url === pauta?.source_url) {
    linha("erro", "O evento novo reusa a MESMA source_url do item de pauta.");
    nota(`
      A fonte da pauta anunciava a sessão; ela não pode sustentar o resultado.
      Troque por uma cobertura publicada depois do julgamento.
    `);
  } else {
    linha("ok", `Fonte distinta da fonte da pauta: ${resultado.source_name}.`);
  }
}

// 3 -------------------------------------------------------------------------
passo(3, "Atualizar status e ultima_movimentacao da Pet 16.662");

if (!processo) {
  linha("erro", `Processo "${PROCESSO}" não encontrado em data/processos.json.`);
} else {
  const mudouStatus = processo.status !== PROCESSO_ANTES.status;
  const mudouMov = processo.ultima_movimentacao?.data !== PROCESSO_ANTES.ultima_movimentacao;

  if (mudouStatus) {
    linha("ok", `status: "${PROCESSO_ANTES.status}" -> "${processo.status}".`);
  } else {
    linha("pendente", `status continua "${processo.status}".`);
    nota(`
      Se o Plenário julgou, deixa de ser "pautado". Provavelmente "decidido";
      se a sessão foi suspensa ou o julgamento continua, "em_aberto".
    `);
  }

  if (mudouMov) {
    linha("ok", `ultima_movimentacao: ${processo.ultima_movimentacao?.data}.`);
  } else {
    linha("pendente", `ultima_movimentacao ainda em ${PROCESSO_ANTES.ultima_movimentacao}.`);
  }

  if (processo.proximo_evento && processo.proximo_evento.data <= DATA_SESSAO) {
    linha("pendente", `proximo_evento ainda aponta para ${processo.proximo_evento.data}.`);
    nota('Aponte para o próximo ato real, ou use null se não houver data marcada.');
  }

  if (processo.updated_at < DATA_SESSAO) {
    linha("pendente", `updated_at ainda em ${processo.updated_at}.`);
  }
}

// 4 -------------------------------------------------------------------------
passo(4, "Validar e conferir o texto do tweet ANTES de qualquer publicação");

linha("manual", "Rode `npm run validate` — ele precisa passar antes de seguir.");

if (!resultado) {
  linha("pendente", "Sem evento de resultado, não há texto para conferir.");
} else {
  const texto = textoDoEvento(resultado);
  const temHedge = texto.includes("[Em apuração]") || texto.includes("[Ponto controverso]");

  console.log("\n  ---- texto que o post-twitter geraria ----");
  for (const l of texto.split("\n")) console.log(`  | ${l}`);
  console.log(`  ---- ${texto.length}/${LIMITE_CHARS} caracteres ----\n`);

  if (temHedge) {
    linha("erro", "O texto ainda sai com marca de ressalva.");
    nota(`
      O evento do resultado precisa de confianca: "confirmado". Se a cobertura
      ainda trata o desfecho como parcial, então ele NÃO é resultado: mantenha
      como apuração e não poste.
    `);
  } else {
    linha("ok", 'Sem prefixo de ressalva — sai como afirmação direta.');
    nota(`
      Nota sobre o formato: "confirmado" não imprime "[Confirmado]" no texto.
      A marca existe só para ressalvar; sua ausência É o sinal de fato
      consumado. O que este passo garante é que "[Em apuração]" — que o item de
      pauta carregava — sumiu.
    `);
  }

  if (texto.length > LIMITE_CHARS) {
    linha("erro", `Texto com ${texto.length} caracteres, acima do limite.`);
  }
}

// 5 -------------------------------------------------------------------------
passo(5, "Abrir PR — nunca commit direto, mesmo sendo você editando à mão");

// symbolic-ref funciona mesmo em branch sem commit nenhum, que rev-parse não lê.
const branch = git("symbolic-ref --short HEAD") ?? git("rev-parse --abbrev-ref HEAD");
const sujo = git("status --porcelain data/");

if (branch === null) {
  linha("manual", "Não consegui ler o estado do git.");
} else if (branch === "main" || branch === "master") {
  linha("erro", `Você está em "${branch}".`);
  nota(`
    git checkout -b atualiza/resultado-sessao-15-09

    A regra de CODEOWNERS vale no merge, não no seu editor: commitar direto
    em ${branch} contorna a própria trava que o repositório instalou.
  `);
} else {
  linha("ok", `Em branch de trabalho: "${branch}".`);
}

if (sujo) {
  linha("manual", "Há alterações em data/ prontas para virar PR.");
} else if (resultado) {
  linha("manual", "data/ sem alterações pendentes — talvez já esteja commitado.");
}

nota(`
  Depois de abrir o PR, espere a sua própria aprovação via CODEOWNERS.
  Aprovar o próprio PR não é teatro: é o passo que obriga a reler o diff
  com olhos de revisor, não de autor.
`);

// 6 -------------------------------------------------------------------------
passo(6, "Publicar no X — só depois do merge, e como ato manual");

if (resultado) {
  if (resultado.tweet && !resultado.tweeted_at) {
    linha("manual", '"tweet": true — o evento entra na fila do post-twitter.');
    nota(`
      Ligue essa flag só no PR do resultado, e depois do dry-run. Assim que
      o merge em main tocar data/, o workflow tweet.yml publica.
    `);
  } else if (resultado.tweeted_at) {
    linha("ok", `Já publicado em ${resultado.tweeted_at.slice(0, 10)}.`);
  } else {
    linha("manual", '"tweet": false — nada será publicado.');
    nota('Vire para true quando quiser publicar; antes, rode `npm run tweet -- --dry-run`.');
  }
}

nota(`
  Nenhuma pressa aqui melhora o painel. Um post errado sobre decisão de
  Plenário circula mais rápido do que a correção.
`);

// --- veredito -------------------------------------------------------------

console.log(`\n${"─".repeat(72)}`);
if (bloqueado) {
  console.log("Checklist INCOMPLETO — resolva os itens [pendente] e [ERRO] acima.");
  process.exit(1);
}
console.log("Checklist cumprido no que é verificável. Os passos [manual] são com você.");
