# Relatório: tarefa #635, chefe tester

- **Tarefa**: #635, medir o gasto por PR aceito (a ideia do Ruflo, #609)
- **Chefe**: tester
- **Data**: 2026-10-19
- **PR**: https://github.com/sakura-corp/sakura-system-ace/pull/637
- **Jeito**: aberta pela /coordenar

## O que cada agente fez
- Sessão mãe: leu a issue e a seção 5 do relatório da #609, escreveu as duas mudanças, fez o
  ensaio da regra nos relatórios que já existem (pelo GitHub) e este relatório.
- Ajudante rápido (explorador): conferiu se o ritual e os chefes copiam o modelo do relatório.
  Resposta: nenhum copia o bloco do cabeçalho (onde entra o "Jeito"); os chefes copiam só a lista
  das seções e apontam pro README. Por isso o ritual e os chefes **não** foram mexidos (item 3 da issue).
- Ajudante forte (revisão final, esforço alto): achou 8 pontos a mudar e 7 opcionais. Conferi
  cada um; entraram os 8 e os opcionais 9 a 11 e 15 (texto mais curto). O principal: a regra do
  "complemento" dava a #577 como "refazer", mas o #582 só mexeu no relatório.
- Ajudantes rápidos (ensaio `e1` e `e2`): classificaram três PRs só lendo a skill (abaixo).

## Checklist do "Pronto quando" (no PR)
- ✅ **A linha "Jeito" no modelo, com os quatro valores**: `docs/relatorios/README.md`, logo abaixo
  do "PR"; e em "Como medir o Gasto", o que é cada valor e qual vale quando usou mais de um.
- ✅ **O revisor classifica pelo GitHub e explica os três resultados**: `revisor-de-chefes`,
  seção 2, item "gasto por resultado", passo 1.
- ✅ **A regra da mesma via e o "relatório antigo fica fora, e diz quantos"**: mesmo item, passo 2.
- ✅ **O ensaio**: abaixo, em "Ensaio".
- ⏳ **O CI verde**: na descrição do PR, depois que rodar.

## Ensaio: a regra aplicada aos relatórios que já existem
Na pasta, 30 relatórios de 17 a 19/10 (fora o `README.md`, o `exemplo.md` e este). **Nenhum tem a
linha "Jeito"** (ela nasce nesta tarefa), então as duas tabelas saem vazias:

**Via arquivo**
| Jeito | Relatórios | De primeira | Depois de refazer | Fechados | Tokens somados | Tokens por PR mesclado |
|---|---|---|---|---|---|---|
| sessão direta | 0 | 0 | 0 | 0 | 0 | — |
| com ajudantes | 0 | 0 | 0 | 0 | 0 | — |
| com sessões filhas | 0 | 0 | 0 | 0 | 0 | — |
| aberta pela /coordenar | 0 | 0 | 0 | 0 | 0 | — |

**Via aviso**: igual, tudo 0.

Ficaram fora: **30 sem Jeito**, 0 não medidos, 0 com PR aberto, 0 sem PR (cada um contado uma vez,
no primeiro motivo). Só pra informação, sem a linha Jeito eles teriam saído assim: 15 sem a seção
"Gasto" (de antes da #570), 7 com a mãe "não medido" e 8 medidos via arquivo.

**O passo 1 (classificar pelo GitHub), ensaiado nesses 8 medidos**, mesmo fora da tabela, pra ver
se a regra funciona com PR de verdade. Nenhum dos 8 PRs tem revisão formal no GitHub (a Sofia
mescla sem aprovar ali), então a primeira revisão é a abertura do PR:

| Relatório | PR | Commit depois de abrir | Resultado |
|---|---|---|---|
| #570 | #575 | nenhum | de primeira |
| #577 | #579 (+ #582) | nenhum; o #582 só mexe no relatório | de primeira |
| #578 | #581 | nenhum | de primeira |
| #583 | #585 | nenhum | de primeira |
| #586 | #588 | `5f5adfd`, "Decisões da Sofia de 18/10, trazidas pela coordenadora" | depois de refazer |
| #590 | #594 | `50a0dc9`, "ajustes da Sofia" | depois de refazer |
| #591 | #596 | `6a1d471`, só o relatório (link do PR) | de primeira |
| #609 | #633 | `3bf64fb`, só o relatório (link do PR) | de primeira |

Isso mostrou três buracos no primeiro texto, consertados antes do PR: não havia revisão no GitHub
pra servir de "primeira revisão"; o commit só do link do PR contaria como refazer; o relatório
quase nunca traz o link do PR (a regra agora manda achar pela branch ou pelo `Closes #N`).

## O que testei e VI reprovar
- **A regra "sem revisão no GitHub, a primeira revisão é a abertura do PR"**. Duas cópias da skill
  (nome neutro, `conferente`), lidas pelo ajudante rápido, que não lê a memória do projeto: `e1`
  inteira e `e2` sem esse parágrafo. Os mesmos três PRs (os dados do #594, do #633 e do #575):
  - `e1`: A (o #594) **depois de refazer**, B e C de primeira. Certo.
  - `e2`: A **de primeira** ("não há revisão, então o commit não vem depois de nenhuma revisão").
    Errado. A regra muda o resultado, e a cópia sem ela reprova.
- O cabeçalho da skill passa no `yaml.safe_load` (`name: revisor-de-chefes`).

## O que passou sem eu ter visto reprovar
- A conta da tabela (tokens ÷ PRs mesclados) e o "fica fora": não deu pra ver com número, porque
  nenhum relatório tem a linha "Jeito" ainda. A primeira revisão do mês com relatórios novos é a prova.
- O "Jeito" escolhido por quem escreve o relatório: só se vê quando os próximos relatórios saírem.

## O que ficou de fora
- `docs/relatorios/exemplo.md` não ganhou a linha "Jeito" (fora da lista de arquivos da issue).
  Quem copia o exemplo em vez do modelo pode esquecer a linha. Sugestão abaixo.
- O ritual, os chefes e a /coordenar: não mexi (a conferência mostrou que só apontam pro README, e
  a issue manda não mexer nesse caso).
- Opcionais da revisão que não entraram: rebase mudando a data do commit (a regra já manda ler a
  mensagem do commit) e o `exemplo.md`.

## O que depende de alguém
- **A Sofia**: revisar o PR. Depois de publicar: na próxima revisão do mês, conferir se o PR do
  revisor traz a tabela "tokens por PR mesclado".

## Modelos usados
- Planejar, escrever e ensaiar: sessão mãe, forte (`claude-opus-5-5`), esforço baixo (a tarefa é
  só texto, com o plano pronto na issue; a tabela pedia "médio" pra escrever, e a mãe escreveu).
- Conferir o ritual e os chefes: `ajudante-rapido`, esforço padrão do agente.
- Revisão final: `ajudante-forte`, esforço alto.
- Ensaio `e1` e `e2`: `ajudante-rapido`, esforço padrão do agente.
- Nenhuma troca por falha.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe** (via arquivo, medido depois da revisão final e dos ensaios, antes deste
  relatório e do PR, que ficam de fora): 34 respostas; entrada 73, cache criado 101.878, cache
  lido 4.157.539, saída 20.730.
- **Ajudantes**: 4.
  - Explorador (rápido): aviso 63.533; arquivo 4 respostas, entrada 8, cache criado 61.790, cache
    lido 167.283, saída 301.
  - Revisão final (forte, alto): aviso 88.852; arquivo 8 respostas, entrada 16, cache criado
    85.071, cache lido 499.708, saída 71.
  - Ensaio `e1` (rápido): aviso 53.571; arquivo 2 respostas, entrada 4, cache criado 52.365, cache
    lido 46.746, saída 142.
  - Ensaio `e2` (rápido): aviso 54.573; arquivo 2 respostas, entrada 4, cache criado 52.075, cache
    lido 46.746, saída 143.
- **Sessões filhas**: nenhuma.
- **`/goal`**: não usei. Mandei o texto pronto à coordenadora na primeira mensagem; a sessão foi
  aberta por ela, e a Sofia não está nesta tela pra colar. Contei "turno N de T" (T = 20) assim mesmo.
- **Colado pela pessoa (opcional)**: nada.

## Defeitos abertos
- nenhum

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: o ensaio com duas cópias de nome neutro (chefe-tester)
  provou que o parágrafo novo muda o resultado. A revisão final forte achou o erro da #577 que eu
  tinha escrito.
- **Onde eu errei ou tive que adivinhar**: o primeiro texto contava o #582 (complemento só do
  relatório) como "refazer". Errei a ferramenta de mensagem na primeira tentativa (a de agentes
  locais não alcança a coordenadora; a certa é a de mandar mensagem entre sessões na nuvem).
- **O que faltou na skill**: o ritual diz "ajudante médio pra escrever", mas numa tarefa só de
  texto curto chamar um ajudante custa uns 60 mil tokens só pra começar; a mãe escreveu.
- **Sugestão de ajuste (opcional)**: pôr a linha "Jeito" também em `docs/relatorios/exemplo.md`
  (uma linha, numa próxima tarefa).
