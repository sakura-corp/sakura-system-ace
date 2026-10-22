# As levas como funcionam hoje (resumo pra planejar a separação)

> Escrito em 22/10/2026, pra sessão que vai separar as levas por projeto. Retrato de **hoje**; o
> detalhe e o porquê de cada regra estão em `docs/painel.md`. Quando a separação for decidida,
> este arquivo pode ser apagado (ou virar o "antes" da decisão).

## O modelo

- **Uma leva de cada vez, pra todo mundo** (decisão de 14/10/2026). Programa das lojas, painel e
  qualquer outra coisa entram **na mesma fila** de levas.
- **Leva = etiqueta `leva-N`** numa issue do `sakura-corp/sakura-system-ace`. Só esse repositório:
  o worker do painel tem `ORGANIZACAO = "sakura-corp"` e `REPOSITORIO = "sakura-system-ace"`
  fixos (`painel/worker/github.ts`). **Issue de outro repositório não aparece no painel.**
- **Tarefa** = issue com a etiqueta. Um dono (assignee), um PR que fecha a issue (`Closes #N`).
  Estados: livre (sem dono), em andamento (dono, sem PR), em revisão (PR aberto), feita (fechada).
- **Estimativa**: a linha `Estimativa: N h` no texto da issue. É dela que saem as horas do painel
  e o "horas por pessoa".

## As cinco fases (#644, lidas do GitHub, sem botão)

`painel/src/logica/fases.ts`, função `faseDaLeva`:

| Fase | Quando |
|---|---|
| **Aprovada** | o `docs/relatorios/leva-N.md` está na `main` (a Sofia mesclou), ou é a leva 0 |
| **Montando** | alguma leva de **número menor** ainda não foi aprovada, ou a leva não tem tarefa |
| **Trabalhando** | tem tarefa aberta |
| **Relatório** | todas fechadas e tem um PR aberto mexendo no `leva-N.md` |
| **Testando** | todas fechadas, sem o relatório num PR. A tela mostra "Leva congelada" e o `leva-N-testes.md` |

## As regras que travam (é aqui que a separação mexe)

1. **A leva atual** (`levaAtual`, `painel/src/logica/estado.ts`): é **a mais antiga ainda não
   aprovada**, uma só pro painel inteiro.
2. **Montando espera a anterior**: a leva N só sai de Montando quando **todas** as de número menor
   foram aprovadas. É por isso que hoje a leva 4 espera a 3, mesmo sendo de outro assunto.
3. **Pegar tarefa** (`levaAceitaPegar`): nunca de leva em Montando. Pode da atual, e de uma anterior
   que ainda tenha tarefa aberta. O worker confere de novo (`painel/worker/pegar.ts`).
4. **Uma tarefa por pessoa**, em qualquer leva aberta: só pega outra depois de abrir o PR da atual.
5. **Fim de leva**: congela, todo mundo testa, o Claude da Sofia escreve o relatório, ela mescla.
   Só então vêm o banco e o "Liberar versão" (do programa das lojas).

## Onde isso aparece no código do painel

- `painel/src/logica/estado.ts`: `numeroDaLeva` (lê `leva-N`; outro formato é ignorado),
  `levaAtual` e `levaAceitaPegar`.
- `painel/src/logica/fases.ts`: as fases e os nomes dos relatórios (`leva-N.md`, `leva-N-testes.md`).
- `painel/worker/tarefas.ts`: busca as etiquetas `leva-` do repositório, põe a fase em cada leva e
  devolve a atual (`/api/levas`, `/api/levas/resumo`, `/api/leva/<n>`).
- `painel/worker/pegar.ts`, `relatorio.ts` e `testes.ts`: pegar tarefa, o relatório e a lista de testes.
- `painel/src/logica/levasAnteriores.ts`: a página "Levas anteriores" (as 20 últimas).

## Onde estamos (22/10)

- **Leva 3** (programa das lojas: #379, #653, #655, #656): todas feitas, em **Testando**. Espera
  a v0.9.52 sair, a rodada de testes e o relatório.
- **Leva 4** (#706, #708, #365, #368, #385, mais as do painel #699, #689, #684) e **leva 5**
  (#454, #456, #372, #459): em Montando, presas atrás da 3.
- **Leva 6**: reservada pro projeto novo (o plano mora no privado `caranovavidanova/sakura-corp`).

## O que separar vai ter que responder

- **Como o nome da etiqueta diz o projeto?** Hoje só `leva-N` é lido; `leva-x` e `leva-03a` são
  ignorados de propósito. Um formato novo (ex.: `painel-leva-1`, `novo-leva-1`) muda o
  `numeroDaLeva`, as consultas do worker e os nomes dos relatórios.
- **Uma "leva atual" por projeto?** A regra 1 e a 2 passam a valer dentro de cada trilha. E a 4
  (uma tarefa por pessoa): continua valendo no total, ou passa a ser por trilha?
- **Projeto em outro repositório?** Se o projeto novo morar num repositório próprio, o worker
  precisa ler mais de um (hoje é fixo). Ver também o token do worker: ele só alcança o que a
  chave dele alcança.
- **O fim de leva** (testar, relatório, liberar versão) é do programa das lojas. Uma trilha do
  painel ou de um projeto novo precisa de todos esses passos?
- **As levas 4 e 5 que já existem**: continuam na trilha das lojas, ou as tarefas do painel
  (#699, #689, #684) vão pra trilha do Gusta?
