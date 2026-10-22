# Pra onde o SSACE vai: a visão dela (aprovada em 12/10/2026)

> Parte da memória do projeto. O índice é o `PROJETO_STATUS.md`. Abrir ao planejar
> funcionalidade nova. **É direção, não ordem de construir**: cada item só começa quando ela
> pedir, e nada daqui passa na frente do que está marcado pra antes da
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
4. **Um assistente de IA dentro do programa** (mais para frente). Nas palavras dela (12/10): que
   faça **tudo o que puder para organizar a visualização, os dados, a urgência, o que precisa
   ser feito e o que dá para melhorar**.

## Os princípios (confirmados por ela em 12/10)

- **Automatizar é tirar trabalho, não acrescentar tela.** Cada coisa nova deveria tirar
  cliques, não pôr. **Mas o produto precisa de muitas funções para entrar na disputa**: quem
  compara sistemas olha a lista do que cada um faz. As duas coisas valem juntas: muitas funções,
  cada uma simples, e um menu que continue fácil de achar (#371). O risco a vigiar é virar o
  S3Auto, de tela densa.
- **A IA sugere, a pessoa confirma**, em tudo que mexe com dinheiro, nota ou cliente. É a mesma
  linha do item 33 da seção 6 ("validação incerta é aviso, nunca tranca") e do WhatsApp, que
  registra "conversa aberta", nunca "enviada". E **a dinâmica do assistente tem que ser muito
  bem definida e planejada antes de qualquer código** (ela, 12/10).
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
- **O que a contabilidade da Pneus Amigão respondeu (13/10)**:
  - o sistema deles **já puxa as notas sozinho** do governo; mesmo assim, eles gostam de receber
    as notas **até o dia 7**, pra conferir se falta alguma;
  - **o que eles não conseguem puxar é o extrato do banco**: até o **dia 10**, em OFX e PDF. É o
    que mais falta pra eles, e hoje eles pedem duas vezes por ano a quem não manda;
  - então o pacote encolhe: **as notas do mês em XML e PDF**, e um **lembrete do extrato**. As
    planilhas de vendas e despesas que o `FN-13` previa **ninguém pediu**.
- **Ideia pra depois**: o extrato só o banco dá. Puxar o extrato direto do banco (Open Finance) é
  um projeto grande e com custo, mas é exatamente o trabalho que o contador mais precisa.
- **Em aberto**:
  - por onde o pacote chega: por e-mail automático, que precisa de um serviço de envio, ou pelo
    WhatsApp automático, da frente 3;
  - quanto a loja paga hoje ao contador. Isso mede o tamanho da oportunidade, e o número vai
    para o privado.

### 2. Trabalhos prontos dentro da loja

São trabalhos de regra e conta que hoje alguém faz na mão (ou ninguém faz) e que o SSACE pode
deixar prontos. A lista com a ordem está em "Prioridade", abaixo.

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
- **Adiado por ela (12/10)**: de quem é o número (de cada loja ou um da Sakura) e quem paga as
  mensagens. Até lá, tudo continua "abre a conversa com o texto pronto", que é de graça.

### 4. Assistente de IA

- **Hoje**: só o leitor de nota fiscal por foto, no Estoque, que fica de fora das lojas novas
  (`docs/decisoes.md`, 27/09).
- **O que ela quer** (12/10): organizar a visualização, os dados, a urgência, o que precisa ser
  feito e o que dá para melhorar.
- **O caminho proposto**, em dois passos:
  1. **A "Central do dia", sem IA** (#454): uma lista no Início com tudo que
     precisa de atenção, por urgência, cada linha com o botão de agir. É o assistente feito de
     regras, sem custo por uso, e é o esqueleto em que a IA vai trabalhar depois.
  2. **O desenho do assistente** (#458): um documento planejado com ela antes de
     qualquer código. Diz o que ele vê, o que sugere, o que nunca faz sozinho, como a pessoa
     confirma, quanto custa por loja e como testar na Pneus Amigão.

## Prioridade (aprovada por ela em 12/10)

**Como foi ordenado**: primeiro o que **não tem custo por mês nem por uso**; dentro disso, o que
dá **mais resultado pelo menor tamanho**. O resultado se mede de dois jeitos: quanto trabalho
tira da loja e quanto pesa na escolha de quem compara sistemas (a vitrine dos concorrentes está
em `MELHORIAS.md`, "Mercado", e em `docs/comparativo-anexar.md`).

**Continua na frente de tudo**, porque já foi combinado como base para vender: permissões no
banco (#365, #366, #367), o token antigo da Focus (#368), o Electron (#385), e o contrato e a
LGPD (item 10 da seção 8).
**Mudou em 22/10** (ela): a #365, a #368 e a #385 entram na leva 4; **a #366 e a #367 esperam** até
outra empresa ir usar o sistema (na Pneus Amigão o risco é teórico, `docs/licoes.md`, item 1). A
leva 5 é a #454, a #456, a #372 e a #459 (`docs/painel.md`, "Andamento").

### Onda 1: sem custo, rápidas, tiram trabalho já

| Tarefa | Tamanho | Por quê |
|---|---|---|
| #454 Central do dia | média | o "assistente sem IA"; junta numa lista o que precisa de atenção, com o botão de agir |
| #397 Resumo pro dono no WhatsApp | pequena | o dono fica sabendo sem abrir o programa |
| #455 Clientes que sumiram (`FN-11`) | pequena | traz cliente de volta com dado que já existe |
| #456 Pix copia e cola na cobrança e no faturamento | pequena a média | o cliente paga o valor certo sem digitar, sem banco intermediário |
| #459 Pedir avaliação no Google depois do serviço | pequena | ajuda a loja a ganhar cliente, e isso vende o sistema |
| #457 Importar do sistema antigo, por planilha (`FN-15`) | grande, em partes | subiu da onda 2: as lojas da próxima fase **usam outro sistema**, que exporta planilhas (ela, 12/10). Precisa ser **compatível com tudo**, porque não se sabe o que a exportação traz |
| #381 Lembrete de revisão | média | os concorrentes vendem "alerta automático de revisão" |
| #382 Sugestão de compra | média | o pedido já sai montado |
| #383 Pacote do contador | pequena a média | a contabilidade respondeu (13/10): as notas até o dia 7 e o lembrete do extrato até o dia 10 |
| #372 Busca geral (Ctrl+K) | média | tira cliques o dia todo |

### Onda 2: sem custo, maiores, pesam na escolha de quem compra

| Tarefa | Tamanho | Por quê |
|---|---|---|
| #379 Orçamento com aprovação | grande | o que mais aparece na vitrine dos concorrentes |
| #380 Checklist com fotos | grande | idem; o custo é só o espaço das fotos |
| #373 Listas longas com páginas | média | necessária quando a loja importar milhares de clientes |
| #371 Menu agrupado | média | com mais funções, é o que mantém o programa fácil |
| #384 Modo demonstração | média | mostrar o sistema na hora de vender |
| #386 → #387 → #388 DRE, #389 Fluxo projetado, #390 Curva ABC, #393 Tela do cliente | médias e uma grande | o "financeiro de dono", com dados que já existem |
| #399 Devolução, #400 Agenda | média, grande | buracos do dia a dia |
| #458 Desenho do assistente (sem código) | conversa | depois da Central do dia |

### Onda 3: sem custo, quando uma loja pedir

#391 limite de crédito, #392 vales, #394 várias contas, #395 centro de custo, #396 renegociar,
#398 metas, #401 reserva, #402 etiqueta, #403 equipamentos, #404 relatório por modelo, #405
filtro livre, #406 horas do mecânico, #407 tabela de preço, #408 convênio.

### Com custo: decidir uma por uma, depois

| O quê | O custo |
|---|---|
| WhatsApp que manda sozinho | por mensagem, à Meta (adiado por ela) |
| Assistente de IA | por uso (depois do desenho) |
| O pacote do contador chegar sozinho por e-mail | perto de zero, mas precisa de um serviço de envio |
| Aprovação do orçamento pelo cliente num link (versão 2 da #379) | perto de zero, mas exige uma página aberta na internet: decisão estrutural |
| #411 Boleto | por boleto, ao banco intermediário |
| #377 Assinar o instalador | certificado por ano |
| #409 NF-e e #410 MD-e | conferir o plano da Focus |
| #412 App de celular | projeto novo inteiro |

O resto das tarefas abertas é a base técnica (#369, #370, #374, #375, #376, #378) e segue no
trilho dela, fora desta análise.

## As tarefas (criadas e atualizadas em 12/10)

- **Novas**: #454 Central do dia, #455 Clientes que sumiram, #456 Pix copia e cola, #457
  Importar do sistema antigo, #458 Desenho do assistente, #459 Pedir avaliação no Google.
- **Todas as tarefas da análise** ganharam a linha "**Prioridade** (12/10)" com a onda. As que
  mudaram de conteúdo: #381 e #382 (aparecem na Central do dia), #383 (a pergunta à
  contabilidade e a versão 2, o pacote chegar sozinho), #379 (a versão 2, a aprovação por link) e
  #371 (o motivo novo).
- **Decidido que fica pra hora da #454** (ela, 12/10): a OS ganhar "esperando peça", "esperando
  o cliente" e "prometido para".

## Na gaveta

- **Vender "sistema + contabilidade"**, com um escritório contábil parceiro (a opção 3 da
  conversa de 12/10; ela escolheu a 1 e a 2). Contabilidade exige contador com registro no CRC,
  e a Sakura Corp só tem a atividade de software.
