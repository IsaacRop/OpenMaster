import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Pesquisa = {
  id: string;
  fileName: string;
  sourceUrl: string;
  localUrl: string;
};

type Pessoa = {
  id: string;
  nome: string;
  foto?: {
    url: string;
    credito: string;
    licenca: string;
    source_url: string;
    source_name: string;
  };
  [key: string]: unknown;
};

const limparHtml = (texto = "") => texto
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&#39;|&quot;/g, "'")
  .replace(/\s+/g, " ")
  .trim();

async function main() {
  const root = process.cwd();
  const pesquisas = JSON.parse(await readFile(path.join(root, "data", "node-image-research.json"), "utf8")) as Pesquisa[];
  const pessoasPath = path.join(root, "data", "pessoas.json");
  const pessoas = JSON.parse(await readFile(pessoasPath, "utf8")) as Pessoa[];
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    titles: pesquisas.map((item) => `File:${item.fileName}`).join("|"),
    prop: "imageinfo",
    iiprop: "extmetadata",
    format: "json",
    origin: "*",
  }).toString();
  const response = await fetch(url, { headers: { "User-Agent": "OpenMaster/0.1 image-metadata" } });
  if (!response.ok) throw new Error(`Commons respondeu ${response.status}`);
  const data = await response.json() as { query?: { pages?: Record<string, {
    title?: string;
    imageinfo?: Array<{ extmetadata?: Record<string, { value?: string }> }>;
  }> } };
  const metadados = new Map<string, { credito: string; licenca: string }>();
  for (const pagina of Object.values(data.query?.pages ?? {})) {
    const fileName = pagina.title?.replace(/^File:/, "").replace(/_/g, " ");
    const meta = pagina.imageinfo?.[0]?.extmetadata ?? {};
    const credito = limparHtml(meta.Artist?.value ?? meta.Credit?.value ?? "");
    const licenca = limparHtml(meta.LicenseShortName?.value ?? meta.UsageTerms?.value ?? "");
    if (fileName && credito && licenca) metadados.set(fileName, { credito, licenca });
  }
  let aplicadas = 0;
  for (const pessoa of pessoas) {
    const pesquisa = pesquisas.find((item) => item.id === pessoa.id);
    if (!pesquisa) continue;
    const meta = metadados.get(pesquisa.fileName.replace(/_/g, " "));
    if (!meta) continue;
    pessoa.foto = {
      url: pesquisa.localUrl,
      credito: meta.credito,
      licenca: meta.licenca,
      source_url: pesquisa.sourceUrl,
      source_name: "Wikimedia Commons",
    };
    aplicadas += 1;
  }
  await writeFile(pessoasPath, `${JSON.stringify(pessoas, null, 2)}\n`);
  console.log(`Fotos aplicadas com autoria e licença verificadas: ${aplicadas}`);
}

main().catch((erro) => { console.error(erro); process.exitCode = 1; });
