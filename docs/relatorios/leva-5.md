# Relatório da leva 5

> Escrito pelo Claude da Sofia em 31/10/2026. **Aprovar é a Sofia mesclar este PR**: com este arquivo na `main`, a
> leva 5 fica "Aprovada", e a leva 6 passa a ser a leva atual.

## 1. O que entrou

7 de 7 tarefas feitas. A leva foi a da primeira empresa cliente: a apresentação, os serviços padrão da empresa nova e
mais dois lotes de "cada módulo só pra quem tem" (peças e estoque, e ordens de serviço).

| Tarefa | O que é | PR |
|---|---|---|
| #784 | Apresentação: os textos dos slides, sem preço | #795 |
| #785 | Apresentação: o PDF com as fotos das telas | #799 |
| #786 | Lista de serviços típicos de autocenter, com faixa de preço e fonte | #798 |
| #706 | Item mexido no instante da aprovação do orçamento passa a sair do estoque (migration 0071) | #802 |
| #787 | Serviços padrão melhores, só em empresa nova (migration 0072) | #811 |
| #366 | Peças e estoque só pra quem tem o módulo (migrations 0073 e 0074) | #816 |
| #367 | Ordens de serviço só pra quem tem o módulo (migrations 0075 e 0076) | #818 |

**Onde cada uma está**: a #784, a #785 e a #786 são texto e PDF, já em uso. A #706, a #787 e a #366 estão nas lojas, na
v0.9.55, com o banco da Pneus Amigão na 74 (#809). A #367 vai na **0.9.56, que ainda não foi publicada**: a 0075 já
rodou na Pneus Amigão, e a 0076 espera os dois computadores chegarem na 0.9.56.

## 2. Horas (no total da leva)

- **Estimadas**: 53 h (as 7 tarefas).
- **Entregues**: 53 h (as 7 feitas, pela estimativa de cada uma).
- **Ficaram abertas**: 0 h.

## 3. Defeitos achados nos testes

**A rodada de testes desta leva foi adiada**, como na leva 4. A Sofia decidiu em 31/10 aprovar o relatório agora, pra a
leva 6 abrir e a equipe ter tarefa pra pegar. O que a leva 5 entregou é testado no dia de teste da 0.9.56, junto com o
"Depois de publicar" de cada tarefa (seção 5).

Por isso: nenhum defeito achado por enquanto. O que aparecer nessa rodada vira issue com a etiqueta `defeito`, sem
`leva-N`.

## 4. O que ficou pra próxima

Nenhuma tarefa da leva ficou aberta. Ficou a rodada de testes, adiada:

| O que | Quando |
|---|---|
| Testar o que a leva 5 entregou (o "Pronto quando" de cada tarefa, seção 5) | no dia de teste da 0.9.56 |
| A rodada adiada da leva 4 | nos 10 a 15 dias antes do próximo cliente (relatório da leva 4) |

## 5. O que depende da Sofia

- **Aprovar este relatório** (mesclar o PR). A leva 6 passa a ser a leva atual, e a equipe já pode pegar tarefa dela.
- **Conferir na Pneus Amigão** (já dá, a loja está na 0.9.55 e no banco 74): o lucro do dia no Caixa bate com o normal
  (#366, e o que falta pra fechar a #809).
- **Publicar a 0.9.56 e testar antes de liberar** (a ordem está na #809): com a #367, olhar o Início, o Caixa, as
  Garantias, as Comissões e as Notas como antes; depois de liberar, os dois computadores na 0.9.56 e a 0076 pelo botão
  "Atualizar o banco" (ensaiar, depois aplicar).
- **Na Pneus Amigão, depois da 0076**: o lucro do dia no Caixa e as comissões do mês batem com os de antes (#367).
- **Na instalação da primeira empresa cliente**: ver a lista nova em Serviços (#787).
- **Abrir o PDF da apresentação no celular** e passar os slides, se ainda não foi feito (#785).
