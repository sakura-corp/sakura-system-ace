# Pra onde o SSACE vai: a visão dela (rascunho em discussão, 12/10/2026)

> Parte da memória do projeto. O índice é o `PROJETO_STATUS.md`. Abrir ao planejar
> funcionalidade nova. **É direção, não ordem de construir**: cada item só começa quando ela
> pedir (seção 1 do índice), e nada daqui passa na frente do que está marcado pra antes da
> primeira loja de terceiro (`docs/decisoes.md`, fase 2).

## De onde veio

Do artigo "Services: The New Software" (Julien Bek, Sequoia, março/2026):
- para cada US$ 1 gasto com programa, as empresas gastam US$ 6 pagando gente para fazer o
  trabalho;
- quem vende o **trabalho pronto** (o "autopiloto") vai ganhar de quem vende só a **ferramenta**
  (o "copiloto");
- o melhor lugar para começar é o trabalho de regra, conta e papel que a empresa **já paga
  alguém de fora** para fazer.

Na borracharia, o trabalho com o pneu é físico e fica de fora. O que se encaixa é o
**"escritório" da loja**: o contador, as notas, o caixa, a cobrança, o pedido de compra. Hoje o
SSACE é um copiloto: uma ferramenta que o dono e os funcionários operam. Em 12/10 ela escolheu
ir para o lado do autopiloto.

## O que ela quer

1. **Um programa só para a loja inteira.** O que puder caber no SSACE, cabe: balcão, oficina,
   estoque, financeiro, notas, contador e conversa com o cliente. A loja não precisa de outro
   sistema nem de planilha.
2. **O máximo possível automático.** O SSACE entrega o trabalho pronto, não só a tela para a
   pessoa fazer. Exemplo: em vez de "uma tela para montar o pacote do contador", o contador
   recebe tudo sozinho.
3. **Integração com as ferramentas que a loja já usa**, a começar pelo WhatsApp.
4. **Um assistente de IA dentro do programa** (mais para frente), que organize as OS e o resto.

## Como isso se encaixa no que já foi decidido

- **"Simples e moderno de usar" continua sendo o diferencial** (`docs/decisoes.md`, seção 2).
  Automatizar é **esconder trabalho, não acrescentar tela**: cada coisa nova deveria tirar
  cliques, não pôr. O risco de "o máximo de coisas" é virar o S3Auto, de tela densa.
- **A IA sugere, a pessoa confirma**, em tudo que mexe com dinheiro, nota ou cliente. É a mesma
  linha do item 33 da seção 6 ("validação incerta é aviso, nunca tranca") e do WhatsApp, que
  registra "conversa aberta", nunca "enviada". *Proposta, a confirmar com ela.*
- **O que custa por uso** (IA, WhatsApp automático) entra na regra "a infraestrutura das lojas é
  paga por ela" (`docs/decisoes.md`, 28/08) e pesa no preço. A conta vai para o repositório
  privado.

## As quatro frentes

### 1. O pacote do contador sai sozinho

- **Hoje**: o botão que junta os XMLs do mês num `.zip` (`v0.9.26`); e a tarefa **#383**
  (`FN-13`), uma tela "Fechamento do mês" com vendas, despesas, formas de pagamento e notas
  canceladas.
- **Para onde vai**: além da tela, o pacote **chega sozinho** ao contador da loja todo mês, sem
  o dono juntar nada. Isso também faz o contador recomendar o SSACE para outros clientes dele.
- **Antes de construir**: perguntar ao contador da Pneus Amigão exatamente o que ele pede (já
  está no `FN-13`).
- **Em aberto**:
  - por onde o pacote chega: por e-mail automático, que precisa de um serviço de envio, ou pelo
    WhatsApp automático, da frente 3;
  - quanto a loja paga hoje ao contador. Isso mede o tamanho da oportunidade, e o número vai
    para o privado.

### 2. Trabalhos prontos dentro da loja

São trabalhos de regra e conta que hoje alguém faz na mão (ou ninguém faz) e que o SSACE pode
deixar prontos:

| Trabalho pronto | Onde está |
|---|---|
| O pedido de compra já sai montado | #382 (`FN-07`) |
| O lembrete de revisão vai para o cliente certo, na hora certa | #381 (`FN-06`) |
| O resumo do dia ou do mês chega ao dono no WhatsApp | #397 |
| A lista de quem parou de vir, com a mensagem pronta | `FN-11` (sem tarefa) |
| A conta atrasada renegociada | #396 |
| O resultado do mês (DRE), com a taxa da maquininha | #386 → #387 → #388 |
| Conferir o que caiu da maquininha e do Pix contra o caixa | sem tarefa; a integração com maquininha (TEF) está em "Futuro" na seção 8 |

### 3. WhatsApp

- **Hoje** (`FN-03`, 12/09): os botões "Cobrar", "Avisar" e "Enviar" abrem a conversa com o
  texto pronto, e a pessoa aperta enviar. Não custa nada.
- **O próximo passo**: a mensagem sair **sozinha**, sem ninguém clicar (lembrete de revisão,
  cobrança, "seu carro está pronto", resumo para o dono). Isso só pelo **caminho oficial**, a
  plataforma do WhatsApp para empresas, da Meta. Ela exige:
  - o número cadastrado na plataforma;
  - modelos de mensagem aprovados pela Meta;
  - pagamento **por mensagem**: conferir a tabela oficial da Meta na hora de decidir, porque
    ela está mudando para cobrança em reais em 2026.
- **Não fazer**: robô "não oficial" que controla o WhatsApp Web. É contra as regras do
  WhatsApp, e **o número da loja pode ser banido**.
- **Em aberto**:
  - de quem é o número: de cada loja (o cliente reconhece) ou um da Sakura;
  - quem paga as mensagens;
  - qual mensagem automática vem primeiro.

### 4. Assistente de IA

- **Hoje**: só o leitor de nota fiscal por foto, no Estoque, que fica de fora das lojas novas
  (`docs/decisoes.md`, 27/09). O "assistente de IA pro estoque" estava em "Futuro, só com pedido
  explícito" (seção 8).
- **O que ela imagina** (12/10): um assistente dentro do programa que organize as OS e o resto.
- **Para conversar antes de desenhar**:
  1. O que é "organizar as OS" para ela e para o pai. Pode ser dizer qual OS fazer primeiro;
     montar a OS a partir de um áudio, uma foto ou uma mensagem do cliente; avisar o que está
     parado ou atrasado; ou responder perguntas ("quanto vendi hoje?", "o que esse carro já
     fez?").
  2. Quem vai usar: o pai, o funcionário do balcão ou ela.
  3. O custo por uso (cada pergunta à IA custa) e quem paga.
- **Sugestão**: a IA vem **depois** das frentes 1 a 3. Ela fica boa quando os dados já estão
  organizados e as automações simples já existem. E começa por **um uso pequeno**, testado na
  Pneus Amigão.

## Na gaveta

- **Vender "sistema + contabilidade"**, com um escritório contábil parceiro (a opção 3 da
  conversa de 12/10; ela escolheu a 1 e a 2). Contabilidade exige contador com registro no CRC,
  e a Sakura Corp só tem a atividade de software.

## Ordem sugerida (a decidir com ela)

1. **#383**, o pacote do contador, perguntando antes ao contador da loja.
2. **#397, #382 e #381**: trabalhos prontos que não custam nada por uso.
3. **WhatsApp automático**: decidir o número e quem paga; depois, a primeira mensagem.
4. **Assistente de IA**: um uso pequeno primeiro.
