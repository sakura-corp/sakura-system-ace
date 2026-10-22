# Leva 3: o que testar

Esta é a lista de testes da leva 3. Ela confere, no programa de verdade, as quatro entregas da leva:
o orçamento (#379), o aviso de peça parecida (#653), a peça sem cadastro no orçamento (#655) e o
juntar peças repetidas (#656). Siga um teste de cada vez, na ordem. Cada teste diz quem faz, o que
fazer e o que deve aparecer.

## Antes de começar

Quem prepara o programa é o seu Claude, não você. Abra uma sessão do Claude Code na pasta do
projeto e cole esta frase:

> Vou testar a leva 3. Prepara o programa pra mim: vai pra `main`, traz a versão mais nova
> (`git switch main` e `git pull`), roda `npm install` e abre o programa com `npm run dev`,
> apontando pro `ssace-teste`. Depois me guia na lista `docs/relatorios/leva-3-testes.md`,
> um teste por vez, e me ajuda a abrir a issue de `defeito` se algo der errado.

O Claude roda os comandos e avisa quando a janela do programa abrir. Aí:

1. Entre com o seu login de teste: `sofia`, `gustavo`, `lazaro` ou `tiago`.
2. Confira que você está na loja "Autocenter Exemplo (TESTE)". Se o programa perguntar a loja,
   escolha essa. Sofia: peça ao Claude pra conferir que o seu `.env` aponta pro `ssace-teste`, e
   não pro banco de uma loja.
3. A Sofia já atualizou o banco de teste com as migrations 0065, 0066 e 0067. Se aparecer uma faixa
   amarela dizendo que o banco está atrasado (ou a frase "O banco desta empresa ainda não foi
   atualizado pra esta versão do programa"), pare aqui e avise a Sofia.

Lembretes:

- O banco de teste só tem dados de mentira. Pode criar, aprovar e recusar à vontade.
- Use só os dados criados no próprio teste ou as peças com "(exemplo)" no nome.
- Nota fiscal nunca sai de verdade aqui (o banco de teste não tem a chave da Focus NFe). Mesmo assim,
  nunca clique em "Confirmar emissão".
- Não clique em "Enviar" (WhatsApp) nos orçamentos: o telefone dos clientes é inventado.
- Vários de vocês testam ao mesmo tempo no mesmo banco. O "Estoque atual" de uma peça pode mudar por
  causa do teste de outra pessoa. Por isso os testes pedem pra anotar o número antes e comparar
  depois.

## Os seus nomes de teste

Cada pessoa usa nomes próprios, pra um teste não atrapalhar o do outro. Onde o teste disser
"a sua peça repetida", "o seu sensor" ou "o seu pneu", use a sua linha:

| Quem | A sua peça repetida (primeira / segunda) | O seu sensor | O seu pneu |
|---|---|---|---|
| Gustavo | Filtro de óleo PX10 (teste) / Filtro de oleo PX10 teste | Sensor de estacionamento S11 | Pneu 175/70 R13 (teste) |
| Lázaro | Filtro de ar AX20 (teste) / Filtro de ar AX20 teste | Sensor de estacionamento S22 | Pneu 175/65 R14 (teste) |
| Tiago | Correia dentada CD30 (teste) / Correia dentada CD30 teste | Sensor de estacionamento S33 | Pneu 165/70 R14 (teste) |
| Sofia | Lâmpada H4 farol (teste) / Lampada H4 farol teste | Sensor de estacionamento S44 | Pneu 175/70 R15 (teste) |

## Cadastrar uma peça (passo que se repete)

Vários testes pedem pra cadastrar uma peça. O programa só salva com os campos de imposto
preenchidos. Como é teste, use sempre estes valores:

- NCM: 87089990
- C.E.S.T: 0107100
- CFOP padrão: 5102
- Origem: "0 - Nacional"
- CST / CSOSN: se já vier preenchido, deixe. Se estiver vazio, digite 102.

## Achou algo estranho?

1. Tire um print da tela.
2. Abra uma issue no GitHub com a etiqueta `defeito`.
3. No texto, diga: o número do teste (ex.: T7), o que você fez, o que esperava e o que apareceu.
4. Não tente consertar. Siga pro próximo teste, se der.
5. Marque o número da issue na tabela do fim.

---

## Orçamento (#379)

### T1. O menu "Orçamentos" aparece

- Quem: qualquer um.
- Preparar: nada.

1. Olhe o menu do lado esquerdo.

Deve aparecer: o item "Orçamentos", logo abaixo de "Ordens de Serviço". Se já existir orçamento
aberto, um número aparece ao lado (é quantos esperam resposta).

### T2. Criar um orçamento não mexe no estoque

- Quem: qualquer um.
- Preparar: vá em Estoque, aba "Produtos", procure "Bieleta" e anote o "Estoque atual" da
  "Bieleta (exemplo)".

1. Clique em "Orçamentos" no menu.
2. Clique em "+ Novo orçamento".
3. Em "Cliente", escolha "Ana Paula Ferreira".
4. Em "Veículo", escolha a placa EXA1B23 (o Gol).
5. Confira o campo "Validade": deve vir preenchido com uma data uns 7 dias pra frente.
6. Na primeira linha de item, deixe "Peça" e escolha "Bieleta (exemplo)". Em "Quantidade", digite 2.
7. Clique em "+ adicionar item". Na linha nova, troque "Peça" por "Serviço" e escolha
   "Serviço técnico – Suspensão".
8. Clique em "Salvar orçamento".
9. Volte em Estoque e procure "Bieleta" de novo.
10. Vá em "Ordens de Serviço" e olhe a lista.

Deve aparecer:
- Depois de salvar, a lista de orçamentos, na aba "Abertos", com uma linha "Orçamento" seguido de um
  número, cliente Ana Paula Ferreira, status "Orçamento" e o total.
- O número ao lado de "Orçamentos" no menu sobe 1.
- O "Estoque atual" da Bieleta (exemplo) é o mesmo que você anotou. Orçamento não baixa estoque.
- O orçamento NÃO aparece na lista de Ordens de Serviço.

### T3. Não deixa aprovar sem dizer quem aprovou

- Quem: qualquer um.
- Preparar: o orçamento do T2.

1. Em "Orçamentos", aba "Abertos", clique na linha do seu orçamento da Ana Paula Ferreira.
2. Clique em "Aprovar".
3. Deixe o campo "Quem aprovou?" vazio e clique em "Confirmar aprovação".

Deve aparecer: a frase "Diga quem aprovou (ex.: pelo telefone) antes de confirmar." O orçamento
continua aberto, nada muda. Embaixo do botão aparece "Ao aprovar, vira uma OS em andamento e as peças
saem do estoque."

### T4. Não deixa aprovar com mudança sem salvar

- Quem: qualquer um.
- Preparar: o orçamento do T2, aberto.

1. Clique em "+ adicionar item" e escolha qualquer serviço (ex.: "Balanceamento"). Não salve.
2. Clique em "Aprovar".

Deve aparecer: a frase "Salve as alterações antes de aprovar", e o botão "Confirmar aprovação"
apagado (não dá pra clicar).

3. Agora tire a linha que você acrescentou (botão "Remover" da linha). Se o aviso continuar, clique em
   "Cancelar" e abra o orçamento de novo pela lista.

### T5. Aprovar vira OS e só agora baixa o estoque

- Quem: qualquer um.
- Preparar: o orçamento do T2. O "Estoque atual" da Bieleta (exemplo) anotado de novo, agora.

1. Abra o orçamento da Ana Paula Ferreira.
2. Clique em "Aprovar".
3. Em "Quem aprovou?", digite: o cliente, pelo telefone.
4. Clique em "Confirmar aprovação".
5. Vá em Estoque e procure "Bieleta".
6. Volte em "Orçamentos".

Deve aparecer:
- O programa leva você pra Ordens de Serviço, com a OS aberta. Ela tem número de OS (não mais
  "Orçamento") e o status "Em andamento".
- O "Estoque atual" da Bieleta (exemplo) caiu 2 em relação ao que você anotou.
- Em "Orçamentos", aba "Abertos", o orçamento não está mais lá, e o número do menu desceu 1.

### T6. Recusar com motivo

- Quem: qualquer um.
- Preparar: anote o "Estoque atual" da "Pastilha de freio dianteira (exemplo)".

1. Em "Orçamentos", clique em "+ Novo orçamento".
2. Cliente "Carlos Eduardo Lima", veículo EXB2D34 (o Onix).
3. Item: Peça "Pastilha de freio dianteira (exemplo)", quantidade 1.
4. Clique em "Salvar orçamento".
5. Abra esse orçamento na lista.
6. Em "Motivo da recusa (opcional)", escolha "Preço".
7. Clique em "Recusar".
8. Clique no orçamento recusado pra abrir.

Deve aparecer:
- Depois de recusar, a frase "Orçamento N recusado." (N é o número dele) e a lista na aba
  "Recusados", com ele lá.
- Aberto, a frase "Orçamento recusado — motivo: Preço." e o aviso "Orçamento recusado: fica só como
  histórico, não dá pra mexer nos itens."
- Não aparecem os botões "Aprovar", "Recusar" nem "Salvar alterações".
- O estoque da Pastilha não mudou.

### T7. Orçamento vencido

- Quem: qualquer um.
- Preparar: nada.

1. Em "Orçamentos", clique em "+ Novo orçamento".
2. Cliente "Roberto Alves", veículo EXD5F67 (o Corolla).
3. Item: Serviço "Alinhamento Dianteiro".
4. No campo "Validade", ponha a data de ontem.
5. Clique em "Salvar orçamento".
6. Na lista, olhe a coluna "Status" desse orçamento.
7. Abra o orçamento e clique em "Aprovar".
8. Não confirme. Clique em "Cancelar" pra sair.

Deve aparecer:
- Na lista, uma etiqueta cinza "vencido" ao lado do status.
- Aberto, a etiqueta "vencido" no topo.
- Depois de clicar em "Aprovar", o aviso "Este orçamento passou da validade: o preço pode ter mudado.
  Confira os valores antes de aprovar. Dá pra aprovar mesmo assim."

---

## Aviso de peça parecida (#653)

### T8. Avisa quando a peça já existe

- Quem: qualquer um.
- Preparar: nada.

1. Vá em Estoque, aba "Produtos".
2. Clique em "+ Novo produto".
3. Em "Descrição", digite: Bieleta exemplo
4. Preencha os campos de imposto (veja "Cadastrar uma peça", lá em cima).
5. Clique em "Salvar peça".

Deve aparecer: uma janela "Peça parecida", com a frase "Parece com Bieleta (exemplo). É a mesma?".
Na lista da janela, a "Bieleta (exemplo)", com "nome muito parecido", e o botão "Abrir a que já
existe". Embaixo, o botão "Cadastrar mesmo assim".

6. Clique em "Abrir a que já existe".
7. Saia sem salvar nada e procure "Bieleta" na lista de produtos.

Deve aparecer: o programa mostra a Bieleta (exemplo) que já existia. Na lista de produtos continua
uma Bieleta só. Nenhuma peça nova foi criada.

### T9. "Cadastrar mesmo assim" grava a peça repetida

Este teste cria a sua peça repetida. A Sofia usa a dela no T20.

- Quem: qualquer um (cada um com a sua linha de "Os seus nomes de teste").
- Preparar: nada.

1. Em Estoque, aba "Produtos", clique em "+ Novo produto".
2. Em "Descrição", digite a primeira peça da sua linha (ex.: Filtro de óleo PX10 (teste)).
3. Em "Referência", digite A1. Em "Aquisição (custo)", 10. Em "Preço final", 25.
   Em "Qtde. estoque inicial", 3.
4. Preencha os campos de imposto e clique em "Salvar peça".

Deve aparecer: a peça salva direto, sem aviso.

5. Clique em "+ Novo produto" de novo.
6. Em "Descrição", digite a segunda peça da sua linha (ex.: Filtro de oleo PX10 teste).
7. Em "Referência", digite A2. Em "Aquisição (custo)", 10. Em "Preço final", 30.
   Em "Qtde. estoque inicial", 2.
8. Preencha os campos de imposto e clique em "Salvar peça".

Deve aparecer: a janela "Peça parecida", dizendo que parece com a primeira peça.

9. Clique em "Cadastrar mesmo assim".

Deve aparecer: a janela fecha e as duas peças aparecem na lista de produtos: a primeira com
"Estoque atual" 3, a segunda com 2.

### T10. Medida diferente não avisa, e editar não avisa

- Quem: qualquer um.
- Preparar: as suas peças do T9.

1. Clique em "+ Novo produto".
2. Em "Descrição", digite o seu pneu (ex.: Pneu 175/70 R13 (teste)).
3. Preencha os campos de imposto e clique em "Salvar peça".

Deve aparecer: a peça salva direto, sem a janela "Peça parecida". O nome parece com o
"Pneu 175/70 R14 (exemplo)", mas a medida é outra, então não é a mesma peça.

4. Na lista, na linha da primeira peça do T9 (ex.: Filtro de óleo PX10 (teste)), clique no ícone de
   lápis (passe o mouse: aparece "Editar o produto ...").
5. Mude o "Preço final" pra 26 e clique em "Salvar alterações".

Deve aparecer: salva direto, sem a janela "Peça parecida", mesmo existindo a segunda peça parecida.
Editar nunca pergunta.

---

## Peça sem cadastro no orçamento (#655)

### T11. A linha de peça sem cadastro só existe no orçamento

- Quem: qualquer um.
- Preparar: nada.

1. Vá em "Ordens de Serviço" e clique em "+ Nova ordem de serviço".
2. Na linha de item, deixe "Peça" e abra a lista de peças.
3. Saia sem salvar (botão "Cancelar").
4. Vá em "Orçamentos" e clique em "+ Novo orçamento".
5. Na linha de item, deixe "Peça" e abra a lista de peças.

Deve aparecer:
- Na OS comum, a lista começa com "Selecione a peça". Não existe opção de peça sem cadastro, nem campo
  "Custo (opcional)".
- No orçamento, a lista começa com "Peça sem cadastro (digitar abaixo)". Com ela escolhida, aparecem
  os campos "Descrição da peça" e "Custo (opcional)".

6. Saia sem salvar (botão "Cancelar").

### T12. Aprovar um orçamento com peças sem cadastro (os três caminhos)

- Quem: qualquer um.
- Preparar: anote o "Estoque atual" do "Bico de válvula (exemplo)".

1. Em "Orçamentos", clique em "+ Novo orçamento".
2. Cliente "Fernanda Oliveira", veículo EXC3E45 (o Renegade).
3. Primeira linha: "Peça sem cadastro (digitar abaixo)". "Descrição da peça": Bico de valvula
   cromado. "Custo (opcional)": 3. "Quantidade": 4. "Preço unitário": 10.
4. "+ adicionar item". Peça sem cadastro. Descrição: o seu sensor (ex.: Sensor de estacionamento
   S11). Custo: 60. Quantidade: 1. Preço unitário: 120.
5. "+ adicionar item". Peça sem cadastro. Descrição: Parafuso de roda. Custo: deixe VAZIO.
   Quantidade: 4. Preço unitário: 5.
6. Clique em "Salvar orçamento".
7. Abra o orçamento na lista e clique em "Aprovar".
8. Em "Quem aprovou?", digite: teste. Clique em "Confirmar aprovação".

Deve aparecer: uma janela "Peças sem cadastro", com as três peças. Cada uma tem três opções: "É uma
peça que já tenho", "Cadastrar agora" e "Seguir sem cadastro". Embaixo, "Faltam 3 peças para
escolher o que fazer." e o botão "Aprovar orçamento" apagado.

9. No "Bico de valvula cromado", marque "É uma peça que já tenho". Na lista "Escolha a peça do
   cadastro", escolha "Bico de válvula (exemplo)".

Deve aparecer: a frase dizendo que as peças que parecem com "Bico de valvula cromado" estão no topo
da lista, e "Ao aprovar, ela sai do estoque."

10. No seu sensor, marque "Cadastrar agora" e clique em "Cadastrar a peça".

Deve aparecer: a janela "Cadastrar peça", com a "Descrição" e o "Preço final" já preenchidos com o
que você digitou no orçamento.

11. Preencha os campos de imposto. Em "Qtde. estoque inicial", digite 3. Clique em "Salvar peça".

Deve aparecer: de volta na janela, "Peça cadastrada:" seguido do nome do seu sensor.

12. No "Parafuso de roda", marque "Seguir sem cadastro".

Deve aparecer: "Não mexe no estoque e não sai na nota fiscal até ser cadastrada." O aviso de "Faltam"
some, e o botão "Aprovar orçamento" acende.

13. Clique em "Aprovar orçamento".
14. Vá em Estoque e procure "Bico", o seu sensor e "Parafuso".

Deve aparecer:
- O programa leva pra Ordens de Serviço, com a OS nova "Em andamento".
- O "Bico de válvula (exemplo)" caiu 4 em relação ao que você anotou.
- O seu sensor existe no cadastro, com "Estoque atual" 2 (os 3 que você pôs, menos 1 da OS).
- "Parafuso de roda" NÃO existe no cadastro de peças.

### T13. Lucro mostra "custo não informado"

- Quem: qualquer um.
- Preparar: a OS do T12 (da Fernanda Oliveira) e a OS do T5 (da Ana Paula Ferreira).

1. Vá em "Ordens de Serviço" e olhe a coluna "Lucro" das duas OS. Se a coluna não aparecer,
   aumente a janela do programa.
2. Vá em "Relações" e clique na aba "Lucratividade". Confira que o período inclui o dia de hoje.

Deve aparecer:
- Na lista de OS, a OS da Fernanda mostra "custo não informado" no lugar do lucro (por causa do
  Parafuso de roda, que ficou sem custo).
- A OS da Ana Paula mostra um valor em reais, como sempre.
- Em Lucratividade, a linha "Parafuso de roda" com "custo não informado" nas colunas "Custo" e
  "Margem", e embaixo dos totais a frase "Inclui item com custo não informado".

### T14. Não deixa emitir NFC-e com peça sem cadastro

- Quem: qualquer um. Se der erro de permissão ao abrir a janela da nota, anote no defeito e peça pra
  Sofia fazer este teste e o T15.
- Preparar: a OS do T12 (da Fernanda Oliveira), aberta.

1. Na OS da Fernanda, clique em "Encerrar OS".
2. A tela de faturar abre sozinha. Não fature: saia pelo botão de voltar.
3. Na lista de Ordens de Serviço, na linha dessa OS, clique em "Fechamento".
4. Clique em "Emitir NFC-e".

Deve aparecer: a janela "Emitir NFC-e" com o quadro "Esta nota não pode sair ainda." e a linha
"Parafuso de roda — Essa peça precisa ser cadastrada pra sair na nota.", com o botão "Cadastrar
agora". O botão "Confirmar emissão" fica apagado (não dá pra clicar).

5. Não clique em mais nada. Siga direto pro T15.

### T15. "Cadastrar agora" na nota libera a peça

- Quem: quem fez o T14, logo em seguida.
- Preparar: a janela "Emitir NFC-e" do T14 aberta.

1. Clique em "Cadastrar agora", na linha do Parafuso de roda.
2. Na janela "Cadastrar peça", confira que a "Descrição" veio como "Parafuso de roda".
3. Preencha os campos de imposto. Em "Qtde. estoque inicial", digite 10. Clique em "Salvar peça".

Deve aparecer: o quadro "Esta nota não pode sair ainda." some, e o "Confirmar emissão" acende.

4. NÃO clique em "Confirmar emissão". Clique em "Cancelar".
5. Vá em Estoque e procure "Parafuso".

Deve aparecer: "Parafuso de roda" agora existe no cadastro, com "Estoque atual" 6 (os 10 que você
pôs, menos os 4 da OS). Se mais de uma pessoa já fez este teste, aparece um aviso de peça parecida no
passo 3: clique em "Cadastrar mesmo assim" e procure a sua pelo estoque 6.

---

## Juntar peças repetidas (#656)

Só a Sofia (login `sofia`, administradora) junta peças. Juntar apaga uma das peças e não dá pra
desfazer. Por isso:

- Junte só a sua peça repetida (as "Lâmpada H4 farol"). Não junte as peças "(exemplo)" nem as dos
  outros.
- Duas pessoas nunca juntam as mesmas peças ao mesmo tempo. Se mais alguém ganhar login de
  administradora pra testar, combinem antes quem junta qual par.

### T16. Quem não é administrador não vê o botão

- Quem: Gustavo, Lázaro e Tiago.
- Preparar: nada.

1. Vá em Estoque.

Deve aparecer: o título "Estoque" e as abas, mas NÃO o botão "Juntar peças repetidas".

### T17. Usar a peça que vai sair numa OS

Prepara o T18: a segunda lâmpada ganha uma OS, pra conferir que a OS passa pra peça que fica.

- Quem: só a Sofia.
- Preparar: o T9 feito com as suas lâmpadas ("Lâmpada H4 farol (teste)" com estoque 3 e
  "Lampada H4 farol teste" com estoque 2).

1. Em "Orçamentos", clique em "+ Novo orçamento".
2. Cliente "Roberto Alves", veículo EXD5F67.
3. Item: Peça "Lampada H4 farol teste" (a segunda, sem acento), quantidade 1.
4. Clique em "Salvar orçamento", abra o orçamento e aprove ("Quem aprovou?": teste).
5. Vá em Estoque e procure "H4".

Deve aparecer: "Lâmpada H4 farol (teste)" com estoque 3 e "Lampada H4 farol teste" com estoque 1.

### T18. A prévia antes de juntar

- Quem: só a Sofia.
- Preparar: o T17 feito.

1. Em Estoque, clique em "Juntar peças repetidas".

Deve aparecer: a janela "Juntar peças repetidas", com "Achei N pares que parecem repetidos. Escolha
um para conferir." Um dos pares é o das suas lâmpadas, com "Motivo: nome muito parecido". (Os pares
dos outros também podem aparecer. Não mexa neles.)

2. No par das lâmpadas, clique em "Conferir".

Deve aparecer:
- "Peça que fica": Lâmpada H4 farol (teste) (a cadastrada primeiro).
- "Peça que sai (será apagada)": Lampada H4 farol teste.
- A frase "Estoque 3 + 1 = 4. 1 OS passa pra Lâmpada H4 farol (teste)."
- A tabela "Estoque por loja", com a linha da "Autocenter Exemplo (TESTE)": 3 na peça que fica, 1 na
  peça que sai, 4 em "Depois de juntar".
- O quadro "O que fica em cada campo", com os campos diferentes (pelo menos "Descrição",
  "Referência" e "Preço venda"). Cada um com duas opções, "Da peça que fica" e "Da peça que sai".

3. Clique em "Trocar: a outra é que fica".

Deve aparecer: as duas peças trocam de lugar, e a frase passa a começar com "Estoque 1 + 3 = 4.", sem
OS passando (a OS já é da peça que agora fica).

4. Clique em "Trocar: a outra é que fica" de novo, pra voltar como estava.

### T19. Juntar de verdade, com escolha e confirmação

- Quem: só a Sofia.
- Preparar: o par das lâmpadas aberto, como no fim do T18 (a "Lâmpada H4 farol (teste)" fica).

1. Em "Preço venda", marque "Da peça que sai: R$ 30,00". Deixe os outros campos como estão.
2. Clique em "Juntar estas duas".

Deve aparecer: "Tem certeza? A peça Lampada H4 farol teste será apagada e não dá para desfazer.",
com os botões "Sim, juntar" e "Não, voltar".

3. Clique em "Não, voltar".

Deve aparecer: a prévia de novo, sem nada juntado.

4. Clique em "Juntar estas duas" e depois em "Sim, juntar".

Deve aparecer: a frase "Pronto: "Lampada H4 farol teste" foi juntada em "Lâmpada H4 farol (teste)". A
peça repetida foi apagada." O par das lâmpadas some da lista de pares.

5. Clique em "Fechar". Na aba "Produtos", procure "H4".
6. Abra a aba "Movimentações" e procure as lâmpadas.

Deve aparecer:
- Uma peça só: "Lâmpada H4 farol (teste)", com "Estoque atual" 4 e "Preço venda" R$ 30,00.
- A "Lampada H4 farol teste" não existe mais.
- Em Movimentações, as entradas e a saída da OS que eram da peça apagada agora estão na que ficou.

### T20. A junção fica na Auditoria

- Quem: só a Sofia.
- Preparar: o T19 feito.

1. No pé do menu, clique no ícone "Auditoria" (passe o mouse pra ver o nome).
2. Em "Tabela", escolha "Peças".
3. Olhe as linhas mais novas, feitas por você.
4. Na linha "Editou" mais nova, clique em "Ver detalhes".

Deve aparecer:
- Uma linha "Excluiu" (a peça que saiu) e pelo menos uma linha "Editou" (a peça que ficou), no
  horário da junção.
- Numa das linhas "Editou", no quadro "Antes", o texto "juntada": true e um trecho "peca_que_saiu"
  com o nome "Lampada H4 farol teste". Se não estiver na primeira "Editou", abra a outra.

---

## Nada mudou no que já existia

### T21. OS comum funciona como antes

- Quem: qualquer um.
- Preparar: anote o "Estoque atual" do "Palheta limpador 20" (exemplo)".

1. Vá em "Ordens de Serviço" e clique em "+ Nova ordem de serviço".
2. Cliente "José Antônio Pereira", veículo EXE6G78 (a Strada).
3. Item: Peça "Palheta limpador 20" (exemplo)", quantidade 1.
4. "+ adicionar item": Serviço "Balanceamento".
5. Clique em "Abrir ordem de serviço".
6. Vá em Estoque e confira a palheta.
7. Volte, abra a OS e clique em "Encerrar OS".
8. Na tela de faturar, escolha receber agora, em Dinheiro, e clique em "Confirmar faturamento".
   Confirme a pergunta que aparece.

Deve aparecer:
- A OS nasce direto como OS (sem passar por orçamento), com status "Em andamento".
- O estoque da palheta caiu 1 já ao abrir a OS, como sempre foi.
- Depois de faturar, a OS fica "Faturada", e a coluna "Lucro" mostra um valor em reais.
- Nenhuma janela de peça sem cadastro aparece.

### T22. Venda de balcão funciona como antes

- Quem: qualquer um.
- Preparar: anote o "Estoque atual" do "Fluido de freio 500 ml (exemplo)".

1. Em "Ordens de Serviço", clique em "+ Venda de balcão".
2. Deixe o cliente como Consumidor.
3. Na busca de peças, digite "Fluido" e escolha "Fluido de freio 500 ml (exemplo)".
4. Clique em "Ir para o pagamento".
5. Escolha Dinheiro e clique em "Confirmar venda". Confirme a pergunta "Confirmar a venda?".
6. A janela "Emitir NFC-e" abre sozinha. NÃO emita: clique em "Cancelar".
7. Olhe a aba "Vendas de balcão" e o estoque do fluido.

Deve aparecer:
- A venda aparece na aba "Vendas de balcão".
- O estoque do fluido caiu 1.
- Nada de orçamento nem de peça sem cadastro apareceu no caminho.

---

## Para marcar

Marque "Feito?" com "sim" quando o teste passar. Em "Defeito", ponha o número da issue, se abriu uma.

| Teste | Quem | Feito? | Defeito |
|---|---|---|---|
| T1. Menu "Orçamentos" | qualquer um | | |
| T2. Criar orçamento não mexe no estoque | qualquer um | | |
| T3. Não aprova sem "Quem aprovou?" | qualquer um | | |
| T4. Não aprova com mudança sem salvar | qualquer um | | |
| T5. Aprovar vira OS e baixa o estoque | qualquer um | | |
| T6. Recusar com motivo | qualquer um | | |
| T7. Orçamento vencido | qualquer um | | |
| T8. Aviso de peça parecida | qualquer um | | |
| T9. "Cadastrar mesmo assim" | cada um | | |
| T10. Medida diferente e editar não avisam | qualquer um | | |
| T11. Peça sem cadastro só no orçamento | qualquer um | | |
| T12. Os três caminhos da aprovação | qualquer um | | |
| T13. "custo não informado" no lucro | qualquer um | | |
| T14. NFC-e trava com peça sem cadastro | qualquer um | | |
| T15. "Cadastrar agora" na nota | qualquer um | | |
| T16. Sem administrador, sem botão de juntar | Gustavo, Lázaro, Tiago | | |
| T17. Peça que vai sair usada numa OS | Sofia | | |
| T18. Prévia antes de juntar | Sofia | | |
| T19. Juntar com escolha e confirmação | Sofia | | |
| T20. Junção na Auditoria | Sofia | | |
| T21. OS comum como antes | qualquer um | | |
| T22. Venda de balcão como antes | qualquer um | | |

## Quando você terminar

A tabela acima é só pra você se organizar: ninguém vê o que você marca nela. Quem mostra que você
terminou é a issue **#728** ("Leva 3: rodada de testes"). No fim, peça ao seu Claude:

> Terminei os testes da leva 3. Marca a minha caixinha na issue #728 e comenta lá quais defeitos
> eu abri (os números das issues `defeito`), ou que não achei nenhum. Se eu pulei algum teste,
> diz qual e por quê.

A rodada acaba quando todas as caixinhas da #728 estiverem marcadas e a Sofia tiver decidido o que
fazer com cada defeito. Aí vem o relatório da leva 3.
