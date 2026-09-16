/**
 * Cache de pergunta exata, em memória do processo.
 *
 * Limitação conhecida: numa lambda serverless (Vercel), cada instância fria
 * tem sua própria memória — isto NÃO é um cache compartilhado entre
 * requisições concorrentes em instâncias diferentes, é um "não repita a
 * última pergunta idêntica nesta mesma instância quente". Ainda assim corta
 * chamadas repetidas em rajada (várias pessoas colando a mesma pergunta
 * depois de um link compartilhado, por exemplo). Se o volume justificar um
 * cache de verdade compartilhado, trocar por Vercel KV aqui — a interface
 * (get/set) já é a mesma que um client de KV expõe.
 */

const TTL_MS = 24 * 60 * 60 * 1000;

export type RespostaCache = {
  resposta: string;
  fontes: { titulo: string; source_url: string; source_name: string }[];
  totalCartoes: number;
};

type Entrada = { valor: RespostaCache; expiraEm: number };

const cache = new Map<string, Entrada>();

/** lowercase, trim, sem pontuação supérflua — perguntas equivalentes caem na mesma chave. */
export function normalizarPergunta(pergunta: string): string {
  return pergunta
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

export function lerCache(pergunta: string): RespostaCache | null {
  const chave = normalizarPergunta(pergunta);
  const entrada = cache.get(chave);
  if (!entrada) return null;
  if (Date.now() > entrada.expiraEm) {
    cache.delete(chave);
    return null;
  }
  return entrada.valor;
}

export function gravarCache(pergunta: string, valor: RespostaCache): void {
  const chave = normalizarPergunta(pergunta);
  cache.set(chave, { valor, expiraEm: Date.now() + TTL_MS });
}
