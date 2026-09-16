import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Pessoa = {
  id: string;
  nome: string;
  tipo: "pessoa" | "instituicao";
  papel: string;
};

type Candidate = { id: string; label: string; description?: string };
type CommonsImage = {
  id: string;
  nome: string;
  tipo: Pessoa["tipo"];
  entityId: string;
  entityLabel: string;
  entityDescription: string;
  fileName: string;
  downloadUrl: string;
  sourceUrl: string;
  credito: string;
  licenca: string;
  localUrl: string;
};
type CommonsQuery = {
  query?: {
    pages?: Record<string, {
      imageinfo?: Array<{
        url: string;
        thumburl?: string;
        mime?: string;
        extmetadata?: Record<string, { value?: string }>;
      }>;
    }>;
  };
};

const root = process.cwd();
const outputDir = path.join(root, "public", "media", "nodes");
const pessoasPath = path.join(root, "data", "pessoas.json");

const aliases: Record<string, string> = {
  master: "Banco Master",
  pf: "Polícia Federal do Brasil",
  pgr: "Procuradoria-Geral da República do Brasil",
  brb: "Banco de Brasília",
  bcb: "Banco Central do Brasil",
  rioprevidencia: "Rioprevidência",
  "tirreno-cartos": "Cartos Sociedade de Crédito Direto",
  gonet: "Paulo Gonet Branco",
  rodrigues: "Andrei Rodrigues",
  "kassio-nunes-marques": "Nunes Marques",
};

// Títulos revisados manualmente. Não inferimos páginas para pessoas privadas:
// uma ausência é preferível a publicar o retrato de um homônimo.
const wikiPages: Record<string, string> = {
  vorcaro: "Daniel Vorcaro",
  master: "Banco Master",
  faria: "Fábio Faria",
  moraes: "Alexandre de Moraes",
  mendonca: "André Mendonça",
  fachin: "Luiz Edson Fachin",
  gilmar: "Gilmar Mendes",
  zanin: "Cristiano Zanin",
  dino: "Flávio Dino",
  rodrigues: "Andrei Passos Rodrigues",
  pf: "Polícia Federal do Brasil",
  pgr: "Procuradoria-Geral da República (Brasil)",
  "claudio-castro": "Cláudio Castro",
  "flavio-bolsonaro": "Flávio Bolsonaro",
  "eduardo-bolsonaro": "Eduardo Bolsonaro",
  "mario-frias": "Mario Frias",
  "ciro-nogueira": "Ciro Nogueira",
  "jaques-wagner": "Jaques Wagner",
  galipolo: "Gabriel Galípolo",
  gonet: "Paulo Gonet Branco",
  brb: "Banco de Brasília",
  bcb: "Banco Central do Brasil",
  fux: "Luiz Fux",
  toffoli: "Dias Toffoli",
  "carmen-lucia": "Cármen Lúcia",
  "kassio-nunes-marques": "Nunes Marques",
};

// Arquivos revisados manualmente no Commons. Estas entradas prevalecem sobre
// a imagem de capa da Wikipédia: em páginas institucionais, a imagem de capa
// pode ser uma pessoa ou um prédio que não representa bem o nó.
const commonsFiles: Record<string, string> = {
  faria: "Fábio Faria em abril de 2017.jpg",
  master: "Banco Master logo.png",
  pf: "Policia-federal-logo.png",
  pgr: "PGR Brasilia 01.jpg",
  brb: "BRB Logo.png",
  bcb: "Logotipo do Banco Central do Brasil.svg",
  rioprevidencia: "Rioprevidencia logo.png",
};

const normalizar = (texto: string) => texto
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\([^)]*\)|["'“”]/g, " ")
  .replace(/\b(sociedade|participacoes|ltda|s\.a|sa|llc|lp|brasil|brasileiro|brasileira|do|da|de|e)\b/gi, " ")
  .replace(/[^a-z0-9]+/gi, " ")
  .trim()
  .toLowerCase();

const limparHtml = (texto = "") => texto
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&#39;|&quot;/g, "'")
  .replace(/\s+/g, " ")
  .trim();

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let ultimoRequest = 0;
async function json<T>(url: string): Promise<T> {
  for (let tentativa = 0; tentativa < 6; tentativa += 1) {
    const intervalo = Date.now() - ultimoRequest;
    if (intervalo < 450) await esperar(450 - intervalo);
    ultimoRequest = Date.now();
    const response = await fetch(url, { headers: { "User-Agent": "OpenMaster/0.1 image-research (local editorial tool)" } });
    if (response.ok) return response.json() as Promise<T>;
    if (response.status !== 429) throw new Error(`${response.status} ${url}`);
    const retryAfter = Number(response.headers.get("retry-after") ?? 0) * 1000;
    await esperar(Math.max(retryAfter, Math.min(12_000, 1_200 * 2 ** tentativa)));
  }
  throw new Error(`limite persistente: ${url}`);
}

function pontuar(pessoa: Pessoa, candidato: Candidate) {
  const esperado = normalizar(aliases[pessoa.id] ?? pessoa.nome);
  const label = normalizar(candidato.label);
  let pontos = esperado === label ? 120 : 0;
  if (!pontos && (esperado.includes(label) || label.includes(esperado))) pontos += 70;
  const tokens = esperado.split(" ").filter((token) => token.length > 2);
  pontos += tokens.filter((token) => label.includes(token)).length * 8;
  const descricao = normalizar(candidato.description ?? "");
  const pistas = normalizar(pessoa.papel).split(" ").filter((token) => token.length > 5);
  pontos += pistas.filter((token) => descricao.includes(token)).slice(0, 3).length * 4;
  if (pessoa.tipo === "pessoa" && /politic|ministro|advog|empres|policial|procurador|diretor|senador|deputado/.test(descricao)) pontos += 8;
  if (pessoa.tipo === "instituicao" && /banco|empresa|institu|orgao|fundo|financeir/.test(descricao)) pontos += 8;
  return pontos;
}

async function pesquisarEntidade(pessoa: Pessoa) {
  const termo = aliases[pessoa.id] ?? pessoa.nome.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.search = new URLSearchParams({
    action: "wbsearchentities", search: termo, language: "pt", uselang: "pt",
    type: "item", limit: "8", format: "json", origin: "*",
  }).toString();
  const data = await json<{ search: Candidate[] }>(url.toString());
  const candidatos = data.search
    .map((candidato) => ({ candidato, pontos: pontuar(pessoa, candidato) }))
    .sort((a, b) => b.pontos - a.pontos);
  return candidatos[0]?.pontos >= 85 ? candidatos[0].candidato : null;
}

async function arquivoDaEntidade(entityId: string) {
  const data = await json<{ entities: Record<string, { claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: string } } }>> }> }>(
    `https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`,
  );
  const claims = data.entities[entityId]?.claims ?? {};
  return claims.P18?.[0]?.mainsnak?.datavalue?.value ?? claims.P154?.[0]?.mainsnak?.datavalue?.value ?? null;
}

async function arquivoDaWikipedia(titulo: string) {
  const slug = encodeURIComponent(titulo.replace(/ /g, "_"));
  const data = await json<{
    title?: string;
    thumbnail?: { source?: string };
    originalimage?: { source?: string };
  }>(`https://pt.wikipedia.org/api/rest_v1/page/summary/${slug}`);
  const original = data.originalimage?.source;
  if (!original) return null;
  const semQuery = original.split("?")[0];
  const fileName = decodeURIComponent(semQuery.slice(semQuery.lastIndexOf("/") + 1)).replace(/_/g, " ");
  return {
    fileName,
    label: data.title ?? titulo,
    downloadUrl: data.thumbnail?.source ?? original,
  };
}

function nomeLicenca(url: string) {
  if (/publicdomain\/zero\/1\.0/.test(url)) return "CC0 1.0";
  const cc = url.match(/creativecommons\.org\/licenses\/([^/]+)\/([^/]+)/);
  if (cc) return `CC ${cc[1].toUpperCase()} ${cc[2]}`;
  if (/publicdomain/.test(url)) return "Domínio público";
  return "Licença indicada na fonte";
}

async function metadadosCommonsHtml(fileName: string) {
  const sourceUrl = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName.replace(/ /g, "_"))}`;
  return { sourceUrl, credito: "PENDENTE", licenca: "PENDENTE" };
}

async function metadadosCommons(fileName: string) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query", titles: `File:${fileName}`, prop: "imageinfo",
    // O maior uso no grafo tem 54 px; 240 px preserva nitidez em telas de alta
    // densidade sem carregar logos de vários megabytes.
    iiprop: "url|mime|extmetadata", iiurlwidth: "240", format: "json", origin: "*",
  }).toString();
  const data = await json<CommonsQuery>(url.toString());
  const pagina = Object.values(data.query?.pages ?? {})[0];
  return pagina?.imageinfo?.[0] ?? null;
}

async function pesquisar(pessoa: Pessoa): Promise<CommonsImage | null> {
  const arquivoRevisado = commonsFiles[pessoa.id];
  if (arquivoRevisado) {
    const imageInfo = await metadadosCommons(arquivoRevisado);
    if (!imageInfo) return null;
    const meta = imageInfo.extmetadata ?? {};
    const downloadUrl = imageInfo.thumburl ?? imageInfo.url;
    const pathname = new URL(downloadUrl).pathname.toLowerCase();
    const extensao = pathname.endsWith(".png") ? "png" : pathname.endsWith(".webp") ? "webp" : "jpg";
    return {
      id: pessoa.id,
      nome: pessoa.nome,
      tipo: pessoa.tipo,
      entityId: `commons:${arquivoRevisado}`,
      entityLabel: arquivoRevisado,
      entityDescription: "Arquivo do Wikimedia Commons revisado manualmente",
      fileName: arquivoRevisado,
      downloadUrl,
      sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(arquivoRevisado.replace(/ /g, "_"))}`,
      credito: limparHtml(meta.Artist?.value ?? meta.Credit?.value ?? "PENDENTE"),
      licenca: limparHtml(meta.LicenseShortName?.value ?? meta.UsageTerms?.value ?? "PENDENTE"),
      localUrl: `/media/nodes/${pessoa.id}.${extensao}`,
    };
  }
  const titulo = wikiPages[pessoa.id];
  if (!titulo) return null;
  const pagina = await arquivoDaWikipedia(titulo);
  if (!pagina) return null;
  const fileName = pagina.fileName;
  const meta = await metadadosCommonsHtml(fileName);
  if (!meta) return null;
  const downloadUrl = pagina.downloadUrl;
  const pathname = new URL(downloadUrl).pathname.toLowerCase();
  const extensao = pathname.endsWith(".png") ? "png" : pathname.endsWith(".webp") ? "webp" : pathname.endsWith(".svg") ? "svg" : "jpg";
  return {
    id: pessoa.id, nome: pessoa.nome, tipo: pessoa.tipo,
    entityId: `ptwiki:${titulo}`, entityLabel: pagina.label,
    entityDescription: "Título da Wikipédia em português revisado manualmente", fileName, downloadUrl,
    sourceUrl: meta.sourceUrl,
    credito: meta.credito, licenca: meta.licenca, localUrl: `/media/nodes/${pessoa.id}.${extensao}`,
  };
}

async function emLotes<T, R>(itens: T[], tamanho: number, tarefa: (item: T) => Promise<R>) {
  const resultados: R[] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    resultados.push(...await Promise.all(itens.slice(i, i + tamanho).map(tarefa)));
  }
  return resultados;
}

async function main() {
  const pessoas = JSON.parse(await readFile(pessoasPath, "utf8")) as Pessoa[];
  await mkdir(outputDir, { recursive: true });
  const encontrados = (await emLotes(pessoas, 1, async (pessoa) => {
    try { return await pesquisar(pessoa); }
    catch (erro) { console.error(`erro ${pessoa.id}:`, erro); return null; }
  })).filter((item): item is CommonsImage => Boolean(item));

  for (const item of encontrados) {
    const response = await fetch(item.downloadUrl, { headers: { "User-Agent": "OpenMaster/0.1 image-research" } });
    if (!response.ok) throw new Error(`download ${response.status}: ${item.downloadUrl}`);
    await writeFile(path.join(root, "public", item.localUrl), Buffer.from(await response.arrayBuffer()));
  }

  await writeFile(path.join(root, "data", "node-image-research.json"), `${JSON.stringify(encontrados, null, 2)}\n`);
  console.log(`Encontradas e baixadas: ${encontrados.length}/${pessoas.length}`);
  for (const item of encontrados) console.log(`${item.id}\t${item.entityLabel}\t${item.licenca}\t${item.credito}`);
  const ids = new Set(encontrados.map((item) => item.id));
  console.log("\nSem correspondência segura:");
  for (const pessoa of pessoas.filter((item) => !ids.has(item.id))) console.log(`${pessoa.id}\t${pessoa.nome}`);
}

main().catch((erro) => { console.error(erro); process.exitCode = 1; });
