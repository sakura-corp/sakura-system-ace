# Teste A3: o conselheiro (`/advisor opus`) contra o Opus sozinho

- **Data**: 2026-10-18
- **Quem conduziu**: a sessão coordenadora (skill `coordenar`)
- **Tarefas**: #590 (skill `/loja-nova`, texto) e #591 (os andares da barra do painel, código)
- **Como**: cada tarefa rodou em **duas sessões ao mesmo tempo**, cada uma na sua branch, sem olhar a
  outra: "Sonnet + conselheiro" (a mãe no Sonnet, sem ajudante forte, consultando o Opus pelo
  `/advisor` quando empacava) × "Opus sozinho" (o ritual normal, com ajudantes por categoria). Ficou o
  melhor PR de cada tarefa; o outro foi fechado sem mesclar e continua na branch como registro.

## Resultado

| | #590 Sonnet + conselheiro (PR #593) | #590 Opus (PR #594) | #591 Sonnet + conselheiro (PR #596) | #591 Opus (PR #597) |
|---|---|---|---|---|
| Entrou na `main` | não | **sim** | **sim** | não |
| Tempo até o PR | ~8 min | ~10 min | ~14 min | ~14 min |
| Ajudantes | nenhum | 3 (rápido, médio, forte) | nenhum | 4 (rápido, 2 médios, forte) |
| Consultas ao conselheiro | 2 | 0 | 2 | 0 |
| Cache lido, sessão mãe (relatório) | 1,5 milhão | 4,4 milhões | 5,9 milhões | 8,1 milhões |
| Cache lido, ajudantes (relatório) | — | 0,9 milhão | — | 4,7 milhões |

O gasto em dinheiro de cada sessão ficou com a Sofia (não entra aqui: repositório público). Pela
conta das sessões, o "Sonnet + conselheiro" saiu **perto de 70% do Opus na #590** e **perto de 60% na
#591**, e o Sonnet ainda cobra menos por token.

## O que se viu

- **Qualidade**: no código (#591) as duas versões deram **o mesmo resultado na tela** (fotos nas duas
  branches); a Sonnet ainda escreveu um teste a mais (todos os endereços antigos continuam abrindo).
  No texto (#590) a Opus foi **mais a fundo**: achou um erro de verdade no guia de instalação (#592)
  e escreveu mensagens mais completas. Por isso entrou a Opus na #590 e a Sonnet na #591.
- **O conselheiro ajudou de verdade**: nas duas tarefas, a 2ª consulta (antes do PR) pegou coisa que
  a Sonnet não tinha visto: na #590, ela citava trechos de documento que não tinha lido e decidia
  sozinha uma coisa que é da Sofia; na #591, a regra "nenhum número na página do Financeiro"
  quebraria com o "3º" do andar.
- **A Sonnet perguntou mais** (duas decisões que eram da Sofia na #590); a Opus decidiu e seguiu.
- **Furo no teste**: a skill `ritual-de-tarefa` tem `model: opus` no cabeçalho, então o turno que a
  carrega roda no Opus mesmo numa sessão Sonnet (visto na #591). O efeito no gasto é pequeno, mas
  vale saber: skill com `model:` no cabeçalho manda no modelo daquele turno.
- **O `/advisor` funciona na sessão da nuvem**, e é a pessoa que liga, digitando na tela (como o
  `/goal`).

## Recomendação (a Sofia decide)

1. **Tarefa de código com plano claro** (tela, painel, teste): **Sonnet + conselheiro** como padrão.
   Mesmo resultado, gasto bem menor.
2. **Tarefa que pede ir a fundo** (achar erro em documento, migration, RLS, dinheiro, nota fiscal,
   segurança): continua o **forte (Opus)**, como a tabela de `docs/tarefas.md` já diz.
3. Antes de mudar a tabela, repetir em mais 2 ou 3 tarefas de código da equipe, pra não decidir com
   uma só.
