# Painel do Caso Master

Painel público de acompanhamento do caso **Daniel Vorcaro / Banco Master / Operação Compliance Zero** no STF: linha do tempo, estado do cluster de processos relacionados e mapa dos envolvidos.

Projeto de acompanhamento **independente**, sem vínculo oficial com o STF, o CNJ, a Polícia Federal, o Banco Master ou qualquer parte dos processos. Código e dados sob licença MIT.

---

## O princípio que organiza tudo

**Dado é build-time, validado por Zod, ou o build quebra.**

Não há banco de dados nem fetch em runtime. Os quatro arquivos em `/data` são importados por Server Components, validados em `lib/data.ts` e o site sai estático. Isso transforma os guardrails editoriais em falha de build em vez de convenção: um evento sem `source_url` não compila, e portanto não vai ao ar — não importa quem abriu o PR.

```
DataJud (metadados oficiais)          Curadoria humana (interpretação)
        │                                      │
  scripts/sync-datajud.ts                 PR no GitHub
        │                                      │
        ├─→ data/processos.json  ←─────────────┤
        │   (ultima_movimentacao, movimentos)  │
        │                                      ├─→ data/timeline.json
        └─→ data/_pending.json                 ├─→ data/pessoas.json
            (movimentos novos aguardando       └─→ data/relacoes.json
             virar evento curado)                      │
                       │                               │
                       └───→ scripts/post-twitter.ts ←─┘
                                     │
                              lib/data.ts (Zod)
                                     │
                                Next.js SSG → Vercel
```

### Duas decisões que valem explicar

**O sync nunca cria evento de timeline.** Ele atualiza metadado objetivo em `processos.json` e deposita movimentos novos em `data/_pending.json`. Promover um movimento a evento é ato humano, feito por PR. Movimentação é metadado; timeline é interpretação — e bot não interpreta.

**O hedging vem do dado, não da redação.** Cada registro carrega `confianca` (`confirmado` | `apuracao` | `controverso`). A UI e o gerador de tweet leem esse campo e marcam o texto sozinhos. Uma sessão apenas pautada é `apuracao` e sai como `[Em apuração]` no X — não vira "STF decidiu" porque alguém redigiu com pressa.

---

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Zod · deploy na Vercel. Sem banco de dados: os dados são arquivos versionados no git.

---

## Rodando local

```bash
npm install
npm run dev        # http://localhost:3000
```

Outros comandos:

| comando | o que faz |
| --- | --- |
| `npm run validate` | valida os 4 JSONs: schema, ids únicos, integridade referencial, guardrail de sigilo |
| `npm run build` | build de produção (valida os dados de novo, via `lib/data.ts`) |
| `npm run sync -- --dry-run` | consulta o DataJud e relata, sem escrever |
| `npm run tweet -- --dry-run` | imprime exatamente o que seria postado no X |

---

## Estrutura

```
app/                      rotas (capa, /processos, /processos/[id], /timeline, /metodologia)
components/               Timeline, ProcessCard, NetworkMap, StatBar, SourceTag, Disclaimer
data/
  processos.json          o cluster
  timeline.json           cronologia curada
  pessoas.json            nós do mapa (pessoas e instituições)
  relacoes.json           arestas do mapa
  _pending.json           movimentos do DataJud aguardando curadoria (gerado)
lib/
  schema.ts               Zod das 4 entidades + rótulos de UI
  data.ts                 carga, validação e acessores
  datajud-client.ts       client tipado da API Pública do CNJ
scripts/
  validate.ts             o portão de qualidade
  sync-datajud.ts         sincronização de metadados
  post-twitter.ts         publicação no X (OAuth 1.0a, sem dependências)
.github/workflows/        validate.yml · sync.yml (abre PR) · tweet.yml (posta após merge)
```

---

## Como adicionar dados

Todos os arquivos em `/data` são JSON com array no topo. Depois de editar, rode `npm run validate` — ele diz exatamente o que falta.

### Um processo novo

Em `data/processos.json`. Convenção de `id`: classe em minúsculas + número sem pontuação — `Pet 16.662/DF` → `pet-16662`, `SL 1.946-MC/DF` → `sl-1946`.

```jsonc
{
  "id": "pet-99999",
  "numero": "Pet 99.999/DF",          // como o tribunal escreve
  "numero_cnj": "00000000000000000000", // opcional: 20 dígitos, só se existir
  "apelido": "Nome curto e humano",
  "objeto": "Transcreva da fonte, não resuma.",
  "status": "em_aberto",               // pautado | em_aberto | decidido
  "sigilo": "publico",                 // publico | parcial | sigiloso
  "relator_atual": "Min. Fulano",
  "historico_relatoria": [],
  "ultima_movimentacao": { "data": "2026-09-14", "descricao": "...", "origem": "manual" },
  "pos": { "x": 500, "y": 400 },       // opcional: só quem tem pos entra no mapa
  "updated_at": "2026-09-14",
  "source_url": "https://...",         // obrigatório
  "source_name": "ConJur"              // obrigatório
}
```

`numero_cnj` é o que decide a sincronização. A numeração de classe do STF não é número CNJ, então quase todo o cluster fica em `sync: "sem_numero_cnj"` — o painel mostra isso ao leitor como estado, não como buraco.

### Um evento de timeline

Em `data/timeline.json`. `id` no formato `AAAA-MM-DD-slug`.

```jsonc
{
  "id": "2026-09-15-resultado-da-sessao",
  "data": "2026-09-15",
  "titulo": "...",
  "descricao": "...",
  "milestone": true,
  "tipo": "decisao",          // decisao | operacao | movimentacao | institucional | imprensa
  "confianca": "confirmado",  // confirmado | apuracao | controverso
  "processos": ["pet-16662"],
  "pessoas": ["fachin"],
  "sigilo_ack": false,        // true e obrigatório se citar processo sob sigilo
  "tweet": false,             // true libera para o post-twitter
  "source_url": "https://...",
  "source_name": "..."
}
```

Regra de ouro ao registrar o desfecho de um ato pautado: **crie um evento novo, não edite o item de pauta.** O registro do que se esperava não deve ser reescrito pelo que aconteceu.

### Uma pessoa e uma relação

`data/pessoas.json` leva `id`, `nome`, `tipo` (`pessoa` | `instituicao`), `papel`, `grupo` (`central` | `stf` | `instituicao` | `outros`), `pos` e fonte.

`data/relacoes.json` leva `from`, `to`, `rotulo`, `peso` (`forte` | `normal`), `confianca` e fonte. **`from` e `to` aceitam id de Pessoa _ou_ de Processo** — várias arestas ligam processo a pessoa, como `pet-16662 → afastou preventivamente → rodrigues`. A validação confere as duas pontas contra a união das duas coleções.

O layout do mapa é editorial: `pos` é coordenada fixa no `viewBox="20 10 1220 760"`, sem física nem force-directed. Dois deploys iguais desenham o mesmo mapa. `npm run validate` avisa se dois nós colidem ou se algum nó posicionado ficou sem nenhuma aresta.

---

## Configurando o DataJud

A API Pública do DataJud é mantida pelo CNJ e feita para consumo automatizado. A chave de acesso é **pública e a mesma para todos** — está publicada na própria documentação do CNJ (`datajud-wiki.cnj.jus.br`, seção de acesso à API pública). Copie de lá e coloque em `.env`:

```bash
cp .env.example .env
# DATAJUD_API_KEY=<chave publicada pelo CNJ>
```

```bash
npm run sync -- --dry-run
```

### Duas limitações reais, tratadas explicitamente

1. **O índice do STF pode não existir.** O DataJud expõe um índice por tribunal (`api_publica_stj`, `api_publica_trf1`, …) e o STF não está sob a gestão de dados do CNJ nos mesmos termos dos demais tribunais. Quando o índice não responde, o client devolve `tribunal_indisponivel`, o processo é marcado com esse estado e a ficha diz isso ao leitor. Nenhuma falha é silenciosa. Para apontar para outro índice: `npm run sync -- --alias trf1` ou a variável `DATAJUD_ALIAS`.
2. **O DataJud indexa por número CNJ de 20 dígitos**, que a numeração de classe do STF não é. Só processos com `numero_cnj` preenchido entram no sync.

O portal do STF **não** é acessado por robô: o robots.txt proíbe acesso automatizado e as peças eletrônicas exigem certificado ICP-Brasil. Não tente contornar isso.

---

## Configurando o X / Twitter

Crie um app no portal de desenvolvedores do X com permissão de leitura e escrita, gere as credenciais OAuth 1.0a de usuário e coloque as quatro em `.env` (ou nos secrets do repositório):

```
X_API_KEY= X_API_SECRET= X_ACCESS_TOKEN= X_ACCESS_TOKEN_SECRET=
```

Sem as quatro, `npm run tweet` **cai em dry-run sozinho** em vez de falhar. Não existe caminho em que credencial ausente vire postagem acidental.

Duas filas, com regras diferentes:

- **movimentações do DataJud** (`data/_pending.json`) — metadado oficial, texto por template, sem interpretação;
- **eventos curados** (`data/timeline.json`) — só entram quando alguém marca `"tweet": true` num PR, e o texto herda o hedging de `confianca`.

Teste sempre antes: `npm run tweet -- --dry-run`.

---

## Automação

| workflow | quando | o que faz |
| --- | --- | --- |
| `validate.yml` | todo PR e push | valida dados e roda o build |
| `sync.yml` | diário 09:00 UTC + manual | consulta o DataJud e **abre PR**, nunca commita em `main` |
| `tweet.yml` | push em `main` que toca `data/**` | posta a fila e grava `tweeted_at` |

O cron fica no GitHub Actions e não na Vercel: o plano Hobby limita a uma execução diária e não escreve no repositório, e aqui o sync precisa abrir PR.

Secrets a configurar em *Settings → Secrets and variables → Actions*: `DATAJUD_API_KEY`, `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`. Variáveis: `SITE_URL` e, opcionalmente, `DATAJUD_ALIAS`.

Para o `sync.yml` conseguir abrir PR: *Settings → Actions → General → Workflow permissions* → marque **Allow GitHub Actions to create and approve pull requests**.

---

## Deploy na Vercel

1. Suba o repositório para o GitHub.
2. Na Vercel, *Add New → Project* e importe o repositório. O preset Next.js é detectado sozinho; não há nada para configurar em build command ou output directory.
3. Em *Settings → Environment Variables*, defina `SITE_URL` com o domínio final (é o que entra nos links dos tweets). `DATAJUD_API_KEY` só é necessária se você quiser rodar o sync de lá — no fluxo padrão ele roda no GitHub Actions.
4. Deploy. Cada merge em `main` republica.

Como o site é estático e os dados vivem no git, o deploy da Vercel é consequência do merge do PR — a revisão do dado e a publicação são o mesmo ato.

---

## Guardrails editoriais

São regras do projeto, e a maior parte é verificada por máquina:

- **Sem fonte, não entra.** `source_url` e `source_name` são obrigatórios nas quatro entidades. Aplicado pelo Zod.
- **Nada sob sigilo.** Conteúdo de peça sigilosa não é publicado, ainda que apareça em alguma cobertura. Quando há disputa sobre o sigilo, registra-se que a controvérsia existe — não o que o documento diz. Evento que referencia processo `sigiloso` exige `sigilo_ack: true`, uma afirmação explícita de quem editou. Aplicado por `validate.ts`.
- **Hedge onde a fonte hedgeia.** `confianca: "apuracao"` para apuração em curso e para atos apenas pautados. A UI e o tweet marcam sozinhos.
- **Aviso permanente** no rodapé de todas as páginas, deixando claro que o projeto é independente.

---

## Contribuindo

Veja [CONTRIBUTING.md](./CONTRIBUTING.md). Correção de dado é bug: abra issue ou PR com o link da fonte que sustenta a correção.

## Licença

MIT — veja [LICENSE](./LICENSE).
