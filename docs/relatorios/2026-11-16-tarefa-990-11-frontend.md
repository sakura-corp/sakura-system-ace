# Relatório: tarefa #990 (visual novo, tarefa 11), chefe frontend

- **Tarefa**: #990, tarefa 11 do visual novo: Contas a Pagar e a Receber
- **Chefe**: frontend
- **Data**: 2026-11-16 (madrugada)
- **PR**: o PR da branch `claude/visual-novo-11-contas` (link na descrição do PR)
- **Jeito**: sessão filha aberta pela coordenadora (/coordenar)

## O que mudou, em uma frase
As duas listas, os dois formulários de conta nova e as duas janelas (pagar e receber) usam as
peças do visual novo, nos dois temas; atrasada, vence hoje, a vencer, paga e recebida viraram selos;
nenhuma conta mudou. Fotos de antes e depois em `docs/referencia/visual-novo/andamento/12-contas/`.

## Melhorar enquanto mexe (seção 12 das regras)

**Usando como quem está no balcão.** Quem abre Contas a Pagar quer saber "o que eu tenho que pagar
hoje, e o que já passou". A tela antiga punha a mesma etiqueta "Pendente" (amarela) em tudo que não
estava vencido, inclusive no que vence hoje, e mostrava o dia do vencimento **um dia antes** (#1005).
Em Contas a Receber, a conta que veio de uma OS abria a OS clicando na linha, sem nada que dissesse
isso, e só com o mouse.

**Já fiz** (aparência e clareza):
- Os selos: **Atrasada** (vermelho, triângulo), **Vence hoje** (amarelo, relógio), **A vencer**
  (cinza, calendário), **Paga em …** e **Recebida em …** (verde, visto). Antes: "Vencida" e
  "Pendente", e nada nas pagas.
- Ao lado de "Pendentes", um selo com **quantas estão atrasadas** (só a contagem, nenhum valor novo).
- O **Total pendente** virou o cartão de número do Início, com o "?" explicando o que soma.
- **O dia certo do vencimento** nas duas listas, nas duas janelas e na **mensagem de cobrança do
  WhatsApp** (a parte das telas de contas da #1005, com o conserto que a Sofia já tinha decidido lá:
  o `diaBrasileiro()`). Com o selo "Vence hoje", o dia errado ficaria escancarado ("13/11 · Vence
  hoje" no dia 14).
- Janela de pagar: "venceu em", "vence hoje" ou "vence em" (antes era sempre "venceu em", até pra
  conta do mês seguinte); o valor da conta no alto da janela; o valor que vai pro Caixa em negrito.
  Janela de receber: "(atrasada)" quando já passou da previsão.
- "Abrir a OS" no **Mais ações** da conta a receber que veio de uma OS (a linha continua abrindo a
  OS com o clique, como antes).
- O botão da linha ("Marcar como paga", "Marcar como recebido") ficou **secundário**, não laranja:
  com 10 contas seriam 10 botões laranja (a "mancha laranja" que a regra 2 quer evitar). O laranja
  ficou com "Nova conta" e com o "Confirmar" das janelas.
- Os avisos que somem: "Conta paga: …", "Conta recebida: …", "Conta cadastrada: …", "Conta
  excluída: …", "Pagamento desfeito: …". Erro continua parado, agora com o triângulo.
- "mensal" virou o selo "Mensal" com o ícone de repetir.

**Onde foi parar o que mudou de lugar** (nada sumiu):
- "+ Nova conta" → "Nova conta" com o ícone de +, no mesmo canto.
- "Marcar como paga": era texto laranja; agora botão com visto, no mesmo lugar. "Excluir conta"
  continua no Mais ações (⋯).
- "Desfazer pagamento": continua à vista na linha da paga, como botão fantasma com a seta de voltar.
- "cobrado em …" (Contas a Receber): saiu do lado dos botões e foi pra **embaixo do selo de status**;
  a explicação, que era o `title`, virou a dica do visual novo.
- As colunas "Pago em" e "Recebido em" viraram "Status": o dia continua lá, dentro do selo verde
  ("Paga em 24/10/2026").

**Sugiro** (mexe com costume da loja ou com conta; não fiz):
1. **"Forma de pagamento" é texto livre** nas duas janelas (vem escrito "dinheiro"). Uma escolha
   com as formas da loja, como no Faturar, evita "Dinheiro", "dinheiro" e "din" virarem três formas
   no Caixa. Recomendo; mexe no que vai pro Caixa, então é dela.
2. **Um segundo cartão "Atrasadas"** com a soma em dinheiro (e talvez "Vence em 7 dias"). Número novo
   de dinheiro: só com o "sim" dela.
3. **Valor pago diferente do valor da conta** (juros, desconto): hoje a conta fica paga com o valor
   digitado, sem dizer a diferença. Mostrar "R$ 30,00 a mais que a conta" na janela ajudaria a
   pegar erro de digitação. Regra de conta: dela.
4. **Busca ou filtro por mês** em Contas a Pagar, pra quando a lista crescer.
5. **Peças**: o `Combobox` (Categoria, Cliente) ainda está no estilo antigo, mais baixo que os campos
   novos; o aviso de erro (triângulo + fundo vermelho fraco) está escrito à mão em cada tela; o
   `SeloDoVencimento` e o `vencimento.ts` moram em `contas-pagar/` e Contas a Receber importa de lá.
   Os três ficariam melhor em `src/components/` numa tarefa das peças (esta não podia mexer lá).
6. **Depois que a tarefa 7 entrar**: os botões das janelas podem ir pro rodapé do `Modal` (hoje ficam
   dentro do formulário, porque o Enter no último campo só acha o botão de fora com o conserto da
   tarefa 7). O ⋯ das linhas ganha o visual novo sozinho quando a 7 entrar.
7. **Os dados de exemplo** não têm conta a pagar paga nem atrasada, então as fotos de Contas a Pagar
   não mostram os selos "Atrasada" e "Paga" (Contas a Receber mostra). Os testes mostram.

**Virou tarefa**: nada novo. A #1005 (datas um dia antes) continua aberta: fica com a trava do
`arquitetura.test.ts` e o Pedido de compra; os 7 lugares das telas de contas foram feitos aqui.

## O que testei e VI reprovar
- `vencimento.test.ts` (novo, 4 testes): atrasada / vence hoje / a vencer, virada de mês e de ano, e
  as frases das duas janelas.
- `ContasPagarPage.visual.test.tsx` (novo, 3 testes, com o relógio parado em 14/11/2026 15h): os
  selos de cada linha e o dia certo (13/11, 14/11); "1 atrasada" ao lado de "Pendentes"; a paga com
  "Paga em" e o desfazer à vista; a janela de pagar com "vence hoje" e o valor; **o `pagarConta`
  recebe exatamente a conta, R$ 129,90, "dinheiro" e o operador**; desfazer continua pedindo
  confirmação. Com as telas antigas no fuso do Brasil, 2 dos 3 reprovaram.
- `ContasReceberPage.visual.test.tsx` (novo, 4 testes): os selos e o dia certo; **a mensagem de
  cobrança do WhatsApp sai com "13/11/2026"** (a antiga, no fuso do Brasil, dizia 12/11); "Abrir a
  OS" no Mais ações só na conta que veio de OS; **o `receberConta` recebe a conta, R$ 1.340,00,
  "dinheiro" e o operador**, e abrir a janela não navega pra OS. Com as telas antigas, os 4
  reprovaram.

## O que passou sem eu ter visto reprovar
- Os testes de hoje das contas (`ContaPagarForm.test.tsx`, os dois `trocaLoja`): passaram sem mudar
  uma linha.
- **O caso feito à mão nas fotos**: Contas a Pagar, 3.200,00 + 890,40 + 4.750,00 = **8.840,40**, o
  mesmo total de antes; Contas a Receber, 1.340,00 + 2.588,00 = **3.928,00**, o mesmo de antes.
- `typecheck`, `lint` (o único aviso já existia na `main`), `test:fusos` (2217 testes, nos dois
  fusos), `contraste`, `contraste:telas` e `largura:telas` (aberto e encolhido): ver a descrição do PR.

## As revisões
- **`/code-review` (médio)**: 8 pontos. Conferi cada um. **Corrigidos (3)**: o "cobrado em", que
  mudou pra dentro da linha clicável, abria a OS no clique (agora não abre); "Pago em | Paga em …"
  repetido (a coluna virou "Status"); o `formatarMoeda` copiado em 4 arquivos (agora o de
  `@/schemas/dinheiro`, idêntico). **Ficaram como estão (5)**: a dica do "cobrado em" só no mouse
  (já era assim com o `title`); "Vence hoje" × "previsto para hoje" na janela de receber (mantive a
  frase antiga da janela); "A vencer" cinza e não amarelo (escolha explicada acima); as peças em
  `contas-pagar/` e o aviso de erro repetido (sugestão 5: esta tarefa não podia mexer em
  `src/components/`).
- **Ajudante forte (revisão final, dinheiro)**: nada alto nem médio nas quatro frentes (o que é
  gravado e calculado, os fluxos, data e fuso, o que sumiu). Mesmos argumentos em `pagarConta`,
  `receberConta`, criar, excluir e desfazer; o total igual; os `new Date` que ficaram são todos de
  coluna com hora. Um baixo: a dica do "cobrado em" (o mesmo de cima).

## O que depende de alguém
- **A Sofia**: o teste do fim de semana (passos na descrição do PR) e as sugestões 1 a 3.
- Um arquivo fora da lista: `site/ferramentas/cenas.mjs` (2 linhas, "+ Nova conta" → "Nova conta"),
  sem o que as fotos e as varreduras não acham o botão. Mesmo caso da tarefa 7.

## Como eu agi
- **O que ajudou**: olhar as fotos de antes mostrou o dia errado ao lado do que seria o "Vence hoje"
  (os dados de exemplo vencem hoje e a tela dizia ontem); foi o que me fez trazer a parte da #1005.
- **Onde tive que decidir sozinho**: "A vencer" ficou cinza, e não amarelo como sugere a tabela do
  `Selo.tsx` ("a vencer" = atenção), pra o amarelo marcar só o que vence hoje; o botão da linha
  secundário, e não laranja.
