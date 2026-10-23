# Relatório da leva 3

> Escrito pelo Claude da Sofia em 23/10/2026. **Aprovar é a Sofia mesclar este PR**: com este arquivo na `main`, a
> leva 3 fica "Aprovada", e a leva 4 passa a ser a leva atual.

## 1. O que entrou

4 de 4 tarefas feitas. Saíram para as lojas na **v0.9.52** (liberada em 22/10), com as migrations 0065, 0066 e 0067 já
no banco da Pneus Amigão.

| Tarefa | O que é | PR |
|---|---|---|
| #379 | Orçamento como etapa da OS, com aprovação do cliente | #705 |
| #653 | Aviso de peça parecida no cadastro | #707 |
| #655 | Peça avulsa no orçamento (sem cadastro) | #717 |
| #656 | Juntar peças repetidas | #716 |

## 2. Horas (no total da leva)

- **Estimadas**: 43 h (as 4 tarefas).
- **Entregues**: 43 h (as 4 feitas, pela estimativa de cada uma).
- **Ficaram abertas**: 0 h.

## 3. Defeitos achados nos testes

A primeira rodada de testes com lista (`docs/relatorios/leva-3-testes.md`, 22 testes; o andamento ficou na #728).

**Quem testou**: o Tiago fez o T1 ao T16, o T21 e o T22. A Sofia fez o T17 ao T20 (juntar peças) e refez o T9. **A
Sofia decidiu em 23/10 fechar a rodada sem o Gustavo e o Lázaro** (o Lázaro ainda estava sem acesso ao banco de teste),
pra a leva 4 abrir logo.

| Defeito | O que é | Decisão da Sofia |
|---|---|---|
| #741 | No "É uma peça que já tenho" do orçamento, "Bico de valvula cromado" não puxava a "Bico de válvula (exemplo)" como parecida | Consertado na leva 3 (PR #743): essa lista só ordena, então o limite do nome lá é mais baixo |
| #742 | Sem o token do Focus NFe, a janela da NFC-e escondia o aviso de peça sem cadastro (o T14 e o T15 não davam pra fazer no banco de teste) | Consertado na leva 3 (PR #743): os dois avisos aparecem juntos |
| #744 | Peça avulsa ligada a uma do cadastro fica com o nome digitado, e por isso sai numa linha separada na Lucratividade (achado no T12) | Fica pra depois, fora de leva |

**T12, T14 e T15 depois do conserto**: a Sofia decidiu aceitar os testes automáticos novos do PR #743 (cada um visto
reprovar sem o conserto). O Tiago confere na tela quando puder, sem segurar a leva; a #741 e a #742 fecham aí.

**Na lista de testes (não é defeito do programa)**: a lista manda todo mundo usar as mesmas referências (A1/A2) nos
testes de peça parecida e de juntar peças. Com várias pessoas no mesmo banco, o aviso de peça parecida e o "Juntar"
mostraram pares misturados entre pessoas (a correia de um com a lâmpada de outro). Na próxima lista, um código por
pessoa.

## 4. O que ficou pra próxima

Nenhuma tarefa da leva ficou aberta. Ficaram, fora da leva:

| Tarefa | O que é | Estimativa |
|---|---|---|
| #744 | O nome do item ligado e a Lucratividade (defeito, ver acima) | sem estimativa |
| #720 e #721 | Os pontos menores da revisão de código da #655 e da #656 | sem estimativa |

## 5. O que depende da Sofia

- **Aprovar este relatório** (mesclar o PR). A leva 4 passa a ser a leva atual, e a equipe já pode pegar tarefa dela.
- **Publicar os consertos da #741 e da #742 pras lojas**, numa v0.9.53, quando quiser. Hoje eles estão só na `main`.
- **Antes da primeira junção de peças na Pneus Amigão**: a cópia de segurança do banco (`docs/operacao.md`, "Cópia
  na hora"), e depois juntar as peças repetidas de verdade (o "Depois de publicar" da #656).
- **Conferir no ar**: cadastrar de novo uma peça que já existe (#653); o tio monta um orçamento de verdade, manda pelo
  WhatsApp e aprova (#379); um orçamento com peça avulsa aprovado pelos três caminhos (#655).
- **A #744**: em qual leva ela entra.
