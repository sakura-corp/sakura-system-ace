# Modelo do relatório da leva

> O modelo fixo que o Claude da Sofia segue no **fim de uma leva** (`docs/painel.md`, "Fim de uma leva"). Decidido pela
> Sofia na entrevista de 19/10/2026 (#644, #647). O primeiro relatório nesse formato foi o `leva-1.md`.

## Como funciona

- O relatório é o arquivo **`docs/relatorios/leva-N.md`**, num PR só dele.
- **PR aberto com o arquivo** = a leva está em **Relatório**. A página `/leva/N/relatorio` do painel mostra o texto do PR,
  com "Esperando a aprovação da Sofia" e o link do PR.
- **Aprovar é a Sofia mesclar o PR.** Com o arquivo na `main`, a leva fica **Aprovada**, e a página mostra o arquivo da
  `main`. O painel não tem botão de aprovar.
- A **leva 0** é de antes das fases: aparece como Aprovada, sem relatório. A leva 1 já estreou as fases.
- O painel mostra o arquivo **como texto puro**: nada do que está escrito roda nem vira link. Escreva pensando em quem lê
  o texto cru (tabela em Markdown simples, sem HTML).

## ⛔ O que nunca entra

O repositório é **público**: **nunca dinheiro** (preço, custo, margem, valor de hora) e **nunca nota ou comparação por
pessoa**. As horas são **do total da leva**, sem separar por pessoa. Nada de credencial nem dado pessoal.

## As cinco partes (sempre estas, nesta ordem)

Copie a partir daqui, troque o `N` e preencha:

```markdown
# Relatório da leva N

> Escrito pelo Claude da Sofia em DD/MM/AAAA. **Aprovar é a Sofia mesclar este PR**: com este arquivo na `main`, a
> leva N fica "Aprovada".

## 1. O que entrou

<X> de <Y> tarefas feitas.

| Tarefa | O que é | PR |
|---|---|---|
| #000 | <uma linha> | #000 |

## 2. Horas (no total da leva)

- **Estimadas**: <soma das estimativas de todas as tarefas da leva> h.
- **Entregues**: <soma das estimativas das tarefas feitas> h.
- **Ficaram abertas**: <a diferença> h.

## 3. Defeitos achados nos testes

<As issues com a etiqueta `defeito` achadas na fase Testando (lista em `docs/relatorios/leva-N-testes.md`): número,
uma linha, e o que a Sofia decidiu (entrou na leva, ou fica pra próxima). Se nenhum: "Nenhum.">

## 4. O que ficou pra próxima

<As tarefas abertas que não entraram, com a estimativa de cada uma, e os defeitos que ficaram pra próxima. Se nada:
"Nada.">

| Tarefa | O que é | Estimativa |
|---|---|---|
| #000 | <uma linha> | 0 h |

## 5. O que depende da Sofia

- **Aprovar este relatório** (mesclar o PR).
- <cada decisão que só ela toma, uma por linha>
```

## De onde sai cada número

- **Tarefas e horas**: as issues com a etiqueta `leva-N` (a estimativa é a linha `Estimativa:` do cabeçalho de cada uma,
  `docs/tarefas.md`). Defeito sem `leva-N` não conta em leva nenhuma.
- **Defeitos**: as issues com `defeito` criadas desde que a última tarefa da leva fechou (é o que a fase Testando mostra
  no painel).
