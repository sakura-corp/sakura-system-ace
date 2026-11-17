# Relatório da leva 7

> Escrito pelo Claude da Sofia em 17/11/2026. **Aprovar é a Sofia mesclar este PR**: com este arquivo na `main`, a
> leva 7 fica "Aprovada", e a leva 8 deixa de estar "Montando" e passa a ser a leva atual.

## 1. O que entrou

22 de 22 tarefas feitas. A leva juntou três frentes: o que o dono precisa ver (fluxo de caixa, curva ABC, ficha do
cliente, resumo pelo WhatsApp), o que prepara a venda pra outra empresa (importar planilha, modo demonstração, pacote do
contador) e uma faxina de defeitos achados nas revisões (troca de loja, datas, texto do papel, nota).

| Tarefa | O que é | PR |
|---|---|---|
| #373 | Clientes: lista por página, com ordem e busca no banco | #984 |
| #374 | Aviso claro quando a internet da loja cai | #986 |
| #381 | Lembrete de revisão e retorno do cliente (migration 0084) | #987 |
| #382 | Sugestão de compra a partir do estoque | #989 |
| #383 | Pacote do mês pro contador: XML e PDF das notas e o contato do contador (migration 0085) | #1003 |
| #384 | Modo demonstração: abrir o programa com dados inventados, sem banco | #1070 |
| #389 | Relações: fluxo de caixa projetado | #1004 |
| #390 | Curva ABC em Relações: peças, serviços e clientes | #1007 |
| #393 | Ficha do cliente: o que ele comprou, como pagou e o que deve | #1009 |
| #397 | Resumo pro dono pelo WhatsApp no Início e no Fechamento do caixa | #1014 |
| #457 | Importar clientes e veículos por planilha, parte 1 (migration 0083) | #985 |
| #720 | Peça cadastrada na aprovação liga ao item na hora | #1015 |
| #803 | Faturar com a OS travada: o total confere com os itens do banco (migration 0086) | #1026 |
| #909 | Cadastro de peça: o estoque inicial que falha não duplica a peça | #1008 |
| #915 | Garantia: valor do item, totais e parcelas pelas contas de `src/schemas/` | #1035 |
| #927 | Troca de loja: só a carga mais nova mexe na tela, em 14 telas | #1037 |
| #932 | Serviços: código comprido corta com "…" e mostra o inteiro no balão | #1038 |
| #948 | NFS-e Nacional: a documentação e o comentário dizem que a inscrição municipal não vai mais | #1039 |
| #951 | Excluir loja: apaga também os textos de WhatsApp salvos | #1041 |
| #978 | Garantia: texto do cadastro com "<" e "&" aparece inteiro no papel | #1053 |
| #981 | NFC-e: o CFOP vai pra nota só com os números, e a ajuda do campo sem 6102/6404 | #1068 |
| #1005 | Datas um dia antes: trava no teste e a data do pedido de compra | #1069 |

**Mesclados em 17/11**: o modo demonstração (#1070), o CFOP na nota (#1068), as datas (#1069), a Serviços (#1038), o
pacote do contador com a migration 0085 (#1003) e o faturar com a OS travada com a migration 0086 (#1026). No mesmo dia
entrou o conserto da nota baixada (#1114, do defeito #1113).

**Migrations da leva**: 0083 (importação por planilha, #457), 0084 (retorno do cliente, #381), 0085 (contato do contador,
#383) e 0086 (faturar com a OS travada, #803). O banco de uma empresa foi atualizado até a **0086 em 17/11**.

**Onde cada uma está**: tudo isso está na `main`. Em qual versão publicada cada tarefa chegou às lojas não foi conferido
para este texto: a lista de versões está nas releases do GitHub.

## 2. Horas (no total da leva)

- **Estimadas**: 133,5 h (as 22 tarefas).
- **Entregues**: 133,5 h (as 22 feitas, pela estimativa de cada uma).
- **Ficaram abertas**: 0 h.

As horas gastas de verdade não foram medidas: os números acima são as estimativas das tarefas.

## 3. Defeitos achados nos testes

**A rodada de testes desta leva não aconteceu**, como nas levas 4, 5 e 6. O que a leva 7 entregou é testado no dia de
teste da próxima versão, junto com o "Depois de publicar" de cada tarefa.

Defeitos achados no caminho (revisões e uso, não numa rodada de testes):

| Defeito | O que é | Situação |
|---|---|---|
| #1113 | A NFC-e de peças emitida sem identificar o cliente não abria | consertado em #1114 (17/11) |
| #1112 | NFC-e recusada porque a SEFAZ ainda não reconhece o CNPJ do cliente: explicar e oferecer "Emitir sem identificar o cliente" | aberto, vai pra leva 8 |
| #1071 | Recibo da nota: texto com "<" e "&" aparece inteiro no papel (o mesmo da #978, na nota) | aberto, vai pra leva 8 |

Nas revisões dos PRs da leva também apareceram defeitos antigos que viraram tarefa dentro da própria leva: o CFOP com
ponto (#981), as telas sem a proteção da troca de loja (#927) e as datas um dia antes (#1005).

## 4. O que ficou pra próxima

Nenhuma tarefa da leva 7 ficou aberta. Vão pra leva 8 os dois defeitos acima (#1112 e #1071; a estimativa de cada um
será dada na própria tarefa) e a rodada de testes adiada.

A **leva 8 é grande, "a base"**: o visual novo por telas (#990, já quase todo na `main`), o estoquista, os bloqueios,
Relações e o que mais estiver com a etiqueta `leva-8`. Ela fica "Montando", sem ninguém poder pegar tarefa, até este
relatório entrar na `main`.

| O que | Quando |
|---|---|
| Testar o que a leva 7 entregou (o "Depois de publicar" de cada tarefa) | no dia de teste da próxima versão |
| As rodadas adiadas das levas 4, 5 e 6 | nos 10 a 15 dias antes do próximo cliente |

## 5. O que depende da Sofia

- **Aprovar este relatório** (mesclar o PR). A leva 8 passa a ser a leva atual, e a equipe já pode pegar tarefa dela.
- **Publicar a próxima versão e testar antes de liberar**: o pacote do contador, o fluxo de caixa, a curva ABC, a ficha do
  cliente, o resumo pelo WhatsApp, a importação por planilha, o modo demonstração e o faturar com a OS travada.
- **Atualizar o banco das outras empresas até a 0086** (ensaiar, depois aplicar), quando for liberar.
- **Decidir o que fazer com o #1112**: o jeito de explicar a recusa da NFC-e e oferecer "Emitir sem identificar o
  cliente" entra na leva 8.

## Balanço

A leva 7 fechou as 22 tarefas, com quatro migrations e o banco de uma empresa já na 0086. Faltou só o que sempre falta:
a rodada de testes de verdade, que continua sendo a dívida das levas 4 a 7.
