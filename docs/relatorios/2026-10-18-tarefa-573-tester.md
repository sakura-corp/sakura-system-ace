# Relatório: tarefa #573, chefe tester

- **Tarefa**: #573, Memória: a skill /coordenar (a sessão coordenadora vira padrão)
- **Chefe**: tester
- **Data**: 2026-10-18
- **PR**: ver a descrição do PR que fecha a #573

## O que cada agente fez
- Sessão mãe: leu a issue e o comentário da rodada de 18/10, escreveu a skill `coordenar`, a linha em `docs/jeito-de-trabalhar.md` e este relatório. A issue diz `Ajudantes: nenhum`, mas a tabela de etapas põe a escrita num ajudante médio; segui o cabeçalho, como na #568 (texto curto, plano pronto), e usei ajudantes só pra ensaiar e revisar.
- Três ajudantes de ensaio (médio): cada um leu só o arquivo da skill e respondeu a casos de exemplo, sem criar nada: (1) a skill inteira com três casos (uma tarefa só; duas tarefas no mesmo arquivo; o limite acabando); (2) uma cópia sem a seção "Quando usar"; (3) uma cópia sem a seção e sem o "2 ou mais" da `description`.
- Ajudante revisor (forte, esforço alto): revisão final do diff. Achou 5 ajustes, nenhum bloqueio; conferi os campos do `get_session` nesta própria sessão e fiz os 5: a conferência de segurança para quando nenhuma sessão está trabalhando; o `resetsAt` é um número em segundos (UTC) e vem com o `rateLimitType`; o `usage` não existe e o `context_usage` pode vir 0 (depois a coordenadora mandou tirar essa lição; a skill só diz pra não medir assim); arquivar as sessões só com o "sim" da Sofia; não abrir sessão no modo de plano.

## Modelos usados
- Ler, planejar e escrever: forte (a própria sessão).
- Ensaios: médio (Sonnet, esforço médio).
- Revisão final: forte (Opus, esforço alto). Nenhuma troca por falha.

## Sessões filhas
- nenhuma (a issue diz `Sessões filhas: não`)

## Checklist do "Pronto quando"
- ✅ **Cabeçalho válido e `description` só dispara com pedido de coordenar**: `yaml.safe_load` passa; o Claude Code passou a listar a `coordenar` assim que o arquivo foi criado; a `description` diz "Use SÓ" com "/coordenar", "sessão coordenadora", "coordena essas tarefas" e "toca essas tarefas em paralelo", e exclui uma tarefa só e pedido comum.
- ✅ **Os 7 passos, os limites e o "quando não usar"**: seção 4 (os 7 passos, na ordem da issue), seção 8 (o que nunca faz: programar, mesclar sem a Sofia, abrir o privado nas sessões das tarefas, e os limites de sempre) e seção 1 (quando não usar: uma tarefa só ou curta, arquivos que não se separam, quem não é a Sofia).
- ✅ **Cada lição do comentário da rodada virou regra** (tabela abaixo).
- ✅ `typecheck` e `lint` verdes na sessão; ⏳ o CI, no PR.
- ⏳ **Depois de publicar** (a Sofia): na próxima vez com várias tarefas, "/coordenar" abre as sessões e traz as mensagens delas.

### O comentário da rodada de 18/10 → onde virou regra
| Lição | Onde na skill |
|---|---|
| Conferir os arquivos na `main` antes das levas; um dono por arquivo; "é da #N" e o "Não fazer" com o número | seção 4, passo 2 |
| Lista de "Arquivos" exata em cada tarefa | seção 4, passo 3 |
| Abrir as sessões (`create_session`, forte, `outcome_branch` por tarefa) com o texto fixo | seção 4, passo 4, e seção 5 (o texto inteiro) |
| Conferir cada PR (arquivos contra a lista, CI) e levar só a decisão de verdade, com recomendação | seções 4 (passo 5) e 7 |
| Sem etiqueta `leva-N`; a leva mora na tabela do plano | seção 4, passo 2 |
| As sessões não criam etiqueta: conferir antes e pedir à Sofia no começo | seção 3, item 2 |
| Perguntar no começo quem mescla | seção 3, item 1, e seção 7, item 6 |
| Limite acabando: guardar o andamento, `send_later`, horário pelo `rate_limit_info.resetsAt` (não chutar) | seção 6 |
| A conferência de segurança cai depois da volta do limite | seção 6 |
| Sessão que não chamou ajudante numa troca pequena e anotou: aceitar | seção 7, item 5 |
| ~~`get_session` mostra os tokens: medir o gasto~~ | **não virou regra**: a coordenadora corrigiu (a sessão da #570 testou: `used_tokens` 0 e nenhum `usage` numa sessão em andamento; conferi o mesmo nesta). A skill diz pra não medir assim e aponta "Como medir o Gasto" de `docs/relatorios/README.md` (#570) |
| Avisos do GitHub dos PRs da própria coordenadora não precisam de resposta | seção 4, passo 7 |

## O que testei e VI reprovar
- **O "quando não usar"**: com a skill inteira, o caso "uma tarefa só" foi recusado citando a seção 1 e os 70 mil tokens. Na cópia **sem a seção 1 e sem o "2 ou mais" da `description`**, o mesmo caso seguiu o roteiro (perguntas da seção 3, "se mesmo assim quiser a coordenação, sigo"), e o próprio ajudante disse que só sugeriu uma sessão comum "porque achei exagero, e não porque a skill mande". Então a recusa vem dessas duas partes.
- **Primeira tentativa que não provou nada**: tirei só a seção 1, e a cópia ainda recusou, porque a `description` também dizia "2 ou mais" e "não use pra uma tarefa só". As duas seguram juntas; tirar uma só não basta pra ver reprovar.

## O que passou sem eu ter visto reprovar
- Os casos "duas tarefas no mesmo arquivo" e "limite acabando" foram respondidos certo (um dono por arquivo ou leva seguinte; `resetsAt`, sem chutar, volta e conferência depois do horário), mas não ensaiei cópias quebradas deles.
- O texto padrão da seção 5 é o mesmo que abriu esta sessão (a coordenadora mandou), e esta sessão avisou "começou" com ele; isso mostra que ele funciona numa sessão, não que a skill o monte sozinha.

## O que ficou de fora
- Nada da issue. Não mexi no `ritual-de-tarefa`, nas skills dos chefes nem no painel (o "Não fazer").

## O que depende de alguém
- **Sofia**: o "depois de publicar" acima; e aprovar a skill (ela nasce como RASCUNHO, igual às outras de 17/10).

## Defeitos abertos
- nenhum

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: o "só vale o teste que eu vi reprovar" me fez ver que a primeira cópia quebrada não reprovava, e achar a segunda trava (a `description`).
- **Onde eu errei ou tive que adivinhar**: a issue diz `Ajudantes: nenhum` e a tabela de etapas diz ajudante médio pra escrever; segui o cabeçalho, como a #568. E "marcar o andamento onde o plano mora": o plano de 17/10 mora no privado, então a skill diz que só com a autorização dela e só na coordenadora.
- **O que faltou na skill**: o mesmo que na #568: o chefe tester não diz como ensaiar uma skill (texto). Funcionou de novo: ajudante que só lê a skill, mais uma cópia quebrada.
- **Sugestão de ajuste (opcional)**: no chefe tester, a linha sugerida na #568, mais: "quando a regra aparece em dois lugares (a `description` e o corpo), a cópia quebrada tira os dois".
