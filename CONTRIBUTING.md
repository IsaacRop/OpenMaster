# Como contribuir

A contribuição mais valiosa aqui não é código: é **dado com fonte**. O painel só vale o que valem os links que ele carrega.

## O fluxo, em resumo

1. Fork do repositório e branch a partir de `main`.
2. Edite o JSON correspondente em `/data`.
3. `npm run validate` — se passar, os dados estão bem formados e todas as referências resolvem.
4. Abra o PR descrevendo **qual fonte** sustenta a mudança.
5. A CI roda `validate` e o build. PR que não valida não é mergeado.
6. Todo PR exige aprovação de um code owner (`.github/CODEOWNERS`) antes do merge — inclusive os abertos pelo robô de sincronização, e inclusive os do mantenedor. A validação automática pega dado malformado; ela não pega um `confianca` trocado de `apuracao` para `confirmado`, nem um `objeto` sutilmente reescrito. Isso só leitura humana pega.

Não é preciso saber React para contribuir. Quase toda contribuição é uma edição de JSON.

## As quatro regras inegociáveis

**1. Sem `source_url`, não entra.** Toda afirmação sobre pessoa ou instituição nomeada precisa do link público de onde foi extraída. A validação rejeita o registro; não há exceção editorial.

**2. Nada de conteúdo sob sigilo.** Se uma reportagem citar o conteúdo de peça sigilosa, não reproduza. Registre, se for o caso, que existe controvérsia sobre o sigilo — o fato da disputa é público, o conteúdo não. Evento que referencia processo marcado como `sigiloso` exige `sigilo_ack: true`, que é você afirmando que respeitou isso.

**3. Hedge onde a fonte hedgeia.** Se a matéria diz "segundo apuração da PF" ou "teria", o registro é `confianca: "apuracao"` e a redação acompanha. Ato apenas pautado também é `apuracao`: sessão marcada não é julgamento realizado. Só use `confirmado` para o que a fonte trata como assentado.

**4. Fato novo é registro novo.** Quando um ato pautado acontece, adicione um evento com o resultado; não reescreva o item de pauta. O painel guarda o que se esperava e o que veio — a diferença entre os dois é informação.

## O que faz um bom PR de dado

- Uma mudança por PR sempre que possível — fica mais fácil discutir a fonte.
- Prefira fonte primária (decisão publicada, nota oficial do tribunal) a fonte secundária.
- Transcreva o objeto de um processo em vez de resumi-lo com suas palavras.
- Se duas fontes divergem, registre `confianca: "controverso"` e cite a que você usou.
- `updated_at` no processo acompanha a data do dado, não a data do PR.

## Correções

Erro de dado é bug, e corrigir é urgente. Abra uma issue com o link da fonte — ou, melhor, um PR com a correção. Não há vergonha em corrigir: o painel registra apuração em curso, e apuração muda.

## Contribuindo com código

Rode `npm run validate && npm run build` antes de abrir o PR — o build faz a checagem de tipos.

Duas linhas de design que não mudamos sem conversa antes:

- **O sync não cria evento de timeline.** Automação cuida de metadado; interpretação é humana.
- **O mapa abre sempre igual.** `pos` é dado editorial e define a posição *inicial* da simulação, para que o grafo abra reconhecível em toda visita — a partir daí o leitor explora à vontade. Filtrar esconde o nó, nunca o remove: um nó removido reorganizaria o resto e sugeriria um caso com outra forma.
- **A lista abaixo do grafo é a versão citável.** O SVG dá o panorama, mas quem carrega rótulo e fonte clicável é a lista. Zoom não substitui procedência.

## Licença

Ao contribuir, você concorda em licenciar sua contribuição sob a licença MIT do projeto.
