# Relatório: tarefa #387, chefe backend

- **Tarefa**: #387, DRE parte 2: taxa da maquininha e quando o cartão cai na conta
- **Chefe**: backend
- **Data**: 2026-11-18
- **PR**: https://github.com/sakura-corp/sakura-system-ace/pull/1121
- **Jeito**: com ajudantes

## O que cada agente fez
- **Sessão mãe**: leu a issue, planejou, escreveu o contrato entre as partes (nomes de tabela, função
  do banco e API). Fez os ajustes de `src/lib/errors.ts`, `src/lib/lojas.ts` e do teste de tabelas
  por loja. Alinhou a conta com o banco (parcela de R$ 0,00) e consertou a ordem da gravação depois
  da revisão. Rodou as conferências e escreveu o relatório e o PR.
- **Ajudante forte (migration)**: escreveu a `0089_taxas_da_maquininha.sql` (3 tabelas, a função
  `registrar_taxa_do_cartao` e a RLS), o `testar-taxas-da-maquininha.sql`, a matriz de RLS, os dados
  de exemplo (taxas inventadas) e regerou a instalação. Testou num Postgres descartável.
- **Ajudante forte (conta e faturamento)**: escreveu `src/schemas/taxaMaquininha.ts` com teste
  primeiro, `src/lib/taxasMaquininha.ts` e a gravação da taxa em `faturarOrdem` e
  `registrarVendaBalcao`. Também fez o aviso na tela de OS.
- **Ajudante médio (telas)**: fez Configurações → Taxas da maquininha e Caixa → Cartão a receber,
  com os testes, as cenas das varreduras e as 4 fotos.
- **Ajudante forte (revisão final)**: leu o diff do zero. Achou 1 defeito confirmado (pagamento
  dividido com dois créditos, abaixo) e 1 de robustez, que foi consertado (a taxa passou a ser
  gravada depois de todos os lançamentos do Caixa).

## Modelos usados
- Planejar (mãe): forte (Opus), esforço médio
- Migration, teste SQL e matriz: forte (Opus), esforço alto
- Conta e gravação no faturamento: forte (Opus), esforço alto
- As duas telas: médio (Sonnet), esforço médio
- Revisão final: forte (Opus), esforço alto
- O explorador "rápido" da tabela da issue não foi chamado: a mãe leu o faturamento direto (eram
  poucos arquivos). Nenhuma troca por falha de modelo.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe** (arquivo, medido antes de escrever este relatório e o PR): 59 respostas;
  entrada 125, cache criado 164.470, cache lido 9.342.382, saída 36.466.
- **Ajudantes** (arquivo):
  - migration (forte, alto): 68 respostas; cache criado 245.885, lido 12.092.135, saída 70.524
  - conta e faturamento (forte, alto): 75 respostas; cache criado 215.504, lido 11.022.482, saída 69.146
  - telas (médio): 48 respostas; cache criado 485.347, lido 5.868.365, saída 28.637
  - revisão (forte, alto): 49 respostas; cache criado 170.353, lido 6.213.528, saída 28.223
  - Pelo aviso: 249.513 / 219.706 / 179.756 / 173.568 `subagent_tokens`, na mesma ordem.
- **Sessões filhas**: nenhuma
- **`/goal`**: não sei se foi ligado (mostrei o texto na primeira mensagem; a coordenadora confere).

## O que testei e VI reprovar
- **A conta** (teste primeiro): cada fatia reprovou antes do código existir. Os casos: R$ 100,00 à
  vista com 3% e 30 dias → 3,00 e 97,00; 3x com a soma fechando e o centavo na última; "tudo de uma
  vez"; Pix e dinheiro; débito em 3x. Também quebrei de propósito: tabela sem a linha devolvendo
  taxa 0 (os testes de "não informada" reprovaram) e data somada direto no número do dia (4
  reprovaram: virada de mês, de ano e fevereiro).
- **Parcela de R$ 0,00**: mudei o teste pra exigir as parcelas de 1 a N sem buraco, como o banco
  quer. Ele reprovou, e passou depois do conserto.
- **O faturamento**: 8 quebras, desfeitas uma a uma. Erro da gravação subindo; erro da leitura
  subindo; taxa lançada como saída no Caixa (o teste "antes × depois" reprovou); tabela lida a cada
  linha; tabela lida no Pix; taxa gravada no "receber depois"; parcelas da linha ignoradas; tabela
  sem a linha virando aviso. Depois da revisão, o teste "a taxa só depois de todos os lançamentos"
  reprovou com o código antigo e passou com o novo.
- **O banco** (Postgres 16 descartável, nunca no Supabase): sem a condição de loja na leitura,
  falharam o `B1` e a matriz (admin_a 1→2, orfao 0→2). Com o Caixa podendo gravar a taxa, falharam o
  `C2` e a matriz (caixa_a 0→1). Sem a conferência de loja nas datas, falhou o `H1`. Sem a
  conferência da soma, falhou o `E3`. Com quem só tem OS lendo a taxa das vendas, falhou o `F2`. Com
  1 centavo a mais nos dados de exemplo, falhou o `B19`. A matriz fica verde no `H1`, porque o
  operador dela só tem uma loja (lição 73); quem pega é o teste SQL.
- **As telas**: salvar sem converter as linhas; formulário sem validação; total do dia errado; aba
  fora da lista. Os 4 testes reprovaram.
- `errors.test.ts` e `lojas.tabelasDaLoja.test.ts` reprovaram com a 0089 antes de as frases e as
  listas entrarem.

- **Pagamento dividido com dois créditos** (pedido da Sofia em 18/11, feito em 20/11): o teste
  "R$ 100 à vista + R$ 200 em 3x" (do formulário até a taxa gravada) e o de `paraPagamentos`
  reprovaram antes de `paraPagamentos` repassar `parcelas: linha.parcelas`, e passaram depois.

## O que passou sem eu ter visto reprovar
- A migration rodando de novo sem erro (rodou 3 vezes a instalação inteira e 2 vezes a 0089
  sozinha; não há como "quebrar" isso de um jeito útil).
- O `contraste:telas` e o `largura:telas` com as cenas novas (passaram de primeira).

## O que ficou de fora
- **Venda "receber depois" recebida no cartão** em Contas a Receber: fica sem taxa (a issue só
  pedia o faturamento). Pro DRE (#388), "sem taxa" pode ser tabela em branco, venda antiga, falha ao
  gravar ou isso.
- A função do banco confere os valores, a forma, as datas e a soma, mas não confere se a taxa é a
  da tabela da loja: quem fatura poderia gravar outra taxa pela API. Estraga só a informação, nunca
  dinheiro.
- Cada "Salvar" das taxas reescreve todas as linhas preenchidas (até 13 registros na auditoria,
  mesmo sem mudança).

## O que depende de alguém
- **Sofia**: aplicar a migration **0089**, sem `versao-minima-do-programa` (só cria coisa nova). Ela
  vem **depois da 0088** do PR #1120 (esta branch está em cima da dele, pela regra de
  `docs/supabase-de-teste.md`). Ordem: 0088 e 0089 no banco, depois a versão do programa.
- **Sofia**: confirmar a leitura da tabela de taxas por quem só tem a permissão de OS (a issue dizia
  "Caixa ou Relações"; sem a OS, quem só fatura não acharia a taxa). **Ela confirmou em 18/11**, e
  também pediu o conserto do pagamento dividido neste PR (feito em 20/11).
- **Gustavo, no PC**: os testes do "No PC de quem fez", depois que a Sofia aplicar a migration no
  Supabase de teste.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a lista de regras de migration e de RLS virou o pedido do
  ajudante quase pronto. "Testador de banco quebra de propósito" fez o ajudante achar o caso da
  lição 73 (a matriz não pega, o SQL pega).
- **Onde eu errei ou tive que adivinhar**: o número da migration (o #1120 já tinha pego o 0087). A
  resposta estava em `docs/supabase-de-teste.md`, não na skill. Também adivinhei a permissão de
  leitura pra quem só tem OS. E escrevi o contrato com "valor > 0" nas datas, que brigou com a conta
  numa venda de centavos: os dois ajudantes resolveram de jeitos diferentes, e precisei alinhar.
- **O que faltou na skill**: dizer o que fazer quando outro PR aberto já usa o próximo número de
  migration, e lembrar que, ao rodar dois ajudantes ao mesmo tempo, cada um vai esbarrar nas listas
  de `src/lib` (`errors.ts`, `lojas.ts`), que alguém precisa assumir.
- **Sugestão de ajuste (opcional)**: no item "Migration nova" da skill, uma linha: "conferir os PRs
  abertos antes de escolher o número (regra em `docs/supabase-de-teste.md`)", e "tabela nova com
  `loja_id` entra em `TABELAS_CONFIG_POR_LOJA` ou `TRAVAM_DE_PROPOSITO`, e trava nova ganha frase
  em `MENSAGEM_DA_TRAVA`".
