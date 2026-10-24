# Relatório da leva 4

> Escrito pelo Claude da Sofia em 24/10/2026. **Aprovar é a Sofia mesclar este PR**: com este arquivo na `main`, a
> leva 4 fica "Aprovada", e a leva 5 passa a ser a leva atual.

## 1. O que entrou

7 de 7 tarefas feitas. A #706 e a #708 começaram nesta leva e foram pra leva 5 e pra leva 6 antes de alguém pegar;
não contam aqui.

| Tarefa | O que é | PR |
|---|---|---|
| #365 | Clientes e veículos só pra quem tem o módulo (migrations 0068 e 0069) | #753 |
| #368 | Apagar a cópia antiga do token da Focus NFe (migration 0070) | #759 |
| #757 | A faixa "banco atrasado" não aparece quando a migration espera os computadores de propósito | #758 |
| #760 | O botão "Atualizar o banco" aplica em partes, até a migration que espera os computadores | #761 |
| #385 | Electron: o salto da linha 36 pra 40 (versão 0.9.55) | #763 |
| #684 | A tela "Clientes que sumiram" nas fotos automáticas | #767 |
| #689 | O painel mostra o relatório da leva formatado | #719 |

**Onde cada uma está**: a #365, a #368 e a #757 já estão nas lojas, na v0.9.54, com o banco da Pneus Amigão na 70.
A #385 está na 0.9.55, que **ainda não foi publicada**. A #760, a #684 e a #689 são ferramentas (o robô do banco, as
fotos e o painel) e já estão em uso.

## 2. Horas (no total da leva)

- **Estimadas**: 37 h (as 7 tarefas).
- **Entregues**: 37 h (as 7 feitas, pela estimativa de cada uma).
- **Ficaram abertas**: 0 h.

## 3. Defeitos achados nos testes

**A rodada de testes desta leva foi adiada.** A Sofia decidiu em 24/10 pular a fase Testando agora pra a leva 5 (a
primeira empresa cliente) começar logo. Os testes da leva 4 ficam pro período de 10 a 15 dias antes de o próximo
cliente começar.

Por isso: nenhum defeito achado por enquanto. O que aparecer nessa rodada vira issue com a etiqueta `defeito`, sem
`leva-N`.

## 4. O que ficou pra próxima

Nenhuma tarefa da leva ficou aberta. Ficou a rodada de testes, adiada:

| O que | Quando |
|---|---|
| Testar o que a leva 4 entregou (lista no estilo do `leva-3-testes.md`) | nos 10 a 15 dias antes do próximo cliente |
| O "Depois de publicar" de cada tarefa (seção 5) | junto com a rodada, ou no dia de teste da 0.9.55 |

## 5. O que depende da Sofia

- **Aprovar este relatório** (mesclar o PR). A leva 5 passa a ser a leva atual, e a equipe já pode pegar tarefa dela.
- **Publicar a 0.9.55 (Electron 40) e testar antes de liberar**: no Windows dela e no Balcão, imprimir garantia,
  recibo, nota e comissões, e o uso do dia a dia (#385).
- **Conferir na Pneus Amigão** (já dá, a loja está na 0.9.54 e no banco 70): o balcão abre OS, cadastra cliente novo e
  emite nota como antes (#365); emitir, reabrir o PDF e cancelar uma nota de teste (#368).
- **Na rodada adiada**: um login de teste sem o módulo Clientes não vê o cartão dos aniversários nem abre a ficha
  completa (#365); o relatório formatado no iPhone (#689).
