# Textos da apresentação do SSACE (14 slides)

> Textos dos slides da apresentação em PDF que a Sofia manda à primeira empresa cliente (terça,
> 27/10). Leitor: o dono da loja. Português simples, sem termo técnico, foco no que muda no dia a dia.
>
> **Regras**: sem preço, mensalidade, custo ou desconto (onde precisar de contato: `[CONTATO: a Sofia preenche]`);
> sem o nome da loja que usa hoje, da cidade dela ou de qualquer pessoa; sem as funções desligadas
> (as regras de `apresentacao/levantamento-do-sistema.md`); no "O que vem por aí", nenhuma data, mês,
> ano ou prazo. Cada função citada foi conferida no levantamento ou na lista "Existe e não está lá"
> de `apresentacao/o-que-falta-pra-apresentar.md`.
>
> **Fotos**: os nomes são os arquivos de `site/ferramentas/` (dados de mentira da "Auto Center Modelo").
> A montagem do PDF é outra tarefa; aqui só ficam os textos.

## Slide 1 — Capa
**Título:** Sakura System AutoCenter Edition
Um programa só pra loja inteira.
Feito pra autocenter e borracharia.
**Foto:** `04-inicio` (a tela de início do sistema, com vendas, lucro e carros no pátio)

## Slide 2 — Por que ele existe
**Título:** Tudo num lugar só
- Ordem de serviço, estoque, caixa, contas e nota fiscal no mesmo programa.
- Feito pra quem não entende de computador.
- Nasceu no balcão de uma borracharia de verdade: cada função veio de um problema real do dia a dia.
- Em uso todo dia desde agosto de 2026, com nota de peça e de serviço emitidas de verdade.
**Foto:** sem foto (sugestão: só o logo da Sakura System)

## Slide 3 — Do orçamento à ordem de serviço
**Título:** Do orçamento à ordem de serviço, sem retrabalho
- Orçamento com validade: o cliente aprova ou recusa, e dá pra mandar pelo WhatsApp. O estoque só baixa quando ele aprova.
- Aprovado, vira ordem de serviço (OS) com o cliente e o carro. Cliente ou carro novo se cadastra sem sair da OS.
- Peça e serviço na mesma OS, com o técnico de cada item. A peça sai do estoque sozinha, e o lucro de cada OS aparece na hora.
- O botão "Avisar" abre o WhatsApp com "seu carro está pronto" já escrito.
- Quem só compra a peça? Venda de balcão, sem abrir OS.
**Foto:** `07-ordens` (a lista de ordens de serviço) — alternativa: `10f-orcamentos`

## Slide 4 — Cobrar e receber
**Título:** Cobrar e receber do jeito que o cliente paga
- Pagamento dividido: parte no Pix, parte no cartão.
- Só a parte do cartão é parcelada, com os juros que a loja escolher.
- "A receber depois" vira conta a receber e só entra no caixa quando o cliente paga.
- O botão "Cobrar" abre o WhatsApp com valor e vencimento já escritos. Os textos das mensagens a loja pode editar.
**Foto:** `09-os-faturamento` (pagamento dividido entre Pix e cartão em 3x)

## Slide 5 — Nota fiscal sem sair da OS
**Título:** Nota fiscal sem sair da ordem de serviço
- Nota de peça (NFC-e) e nota de serviço (NFS-e) emitidas de dentro da OS. O sistema sabe qual nota cada OS precisa e mostra só o botão certo.
- A nota já aparece em PDF, pronta pra imprimir. Se o cliente pedir de novo, dá pra reabrir uma nota antiga.
- Antes de emitir, avisa quando uma peça está com o código fiscal errado, dizendo o nome da peça.
- Cancelamento pelo próprio sistema.
- As notas do mês saem num arquivo só, do jeito que a contabilidade pede.
**Foto:** `10-os-fechamento` (a OS pronta pra emitir a nota)

## Slide 6 — Caixa e contas
**Título:** O caixa e as contas, sem caderno
- Caixa do dia separado por forma de pagamento.
- Lucro do dia de verdade: desconta o custo da peça, o custo do serviço e as despesas.
- Fechamento da gaveta no fim do dia, com troco e diferença.
- Contas a pagar com vencimento; a conta mensal (aluguel, luz) se repete sozinha. Pagar a conta lança a saída no caixa.
- Despesas com categoria, pra ver pra onde o dinheiro vai, e a lista de quem está devendo.
**Foto:** `33-contas-receber` (quem está devendo, quanto e até quando) — alternativa: `29b-caixa-fechamento`

## Slide 7 — Estoque e compras
**Título:** Estoque e compras sob controle
- Custo, preço de venda e margem de cada peça. Campos próprios de pneu: medida, carga/velocidade e DOT.
- Leitor de código de barras: bipou, abriu a peça.
- Estoque mínimo e o filtro "Precisa comprar". Extrato de cada peça e inventário.
- Avisa antes de cadastrar uma peça repetida.
- Pedido de compra com o histórico de preço de cada fornecedor, e o botão que abre o WhatsApp do fornecedor com o pedido já escrito. A entrada da compra pode vir do arquivo da nota do fornecedor (o XML), de uma vez.
**Foto:** `11-estoque-produtos` (a lista de peças do estoque) — alternativa: `20-pedidos-compra`

## Slide 8 — O cliente e o carro
**Título:** Cada carro tem a sua história
- Ficha do veículo pela placa: tudo que já foi feito, garantias em vigor e KM.
- Avisa quando o KM digitado é menor que o da última visita (quase sempre é um dígito faltando).
- Documento de garantia pro cliente assinar.
- "Clientes que sumiram": quem não volta há muito tempo, pra você chamar de volta.
**Foto:** `06b-ficha-veiculo` (a ficha de um carro, com histórico e garantias)

## Slide 9 — Pro dono enxergar o negócio
**Título:** Pro dono enxergar o negócio
- Tela de início com vendas, lucro e ticket médio, comparando com o mês passado. Cada número tem um "?" que explica de onde ele vem.
- Contas dos próximos 15 dias e carros no pátio, com há quantos dias estão lá.
- Gráficos e lucratividade por peça e por serviço: o que vende muito e dá pouco lucro.
- Auditoria: quem mudou o quê, e quando.
- Mais de uma loja no mesmo sistema, se precisar.
**Foto:** `37-lucratividade` (lucro por peça e por serviço) — alternativa: `04-inicio`

## Slide 10 — A equipe
**Título:** Cada um vê só o que deve
- Cada funcionário entra com o próprio usuário e senha; o dono escolhe o que cada um vê.
- Esqueceu a senha? O dono resolve na hora.
- Salário e documentos protegidos.
- Comissões que separam quem vendeu de quem executou, com aviso quando o número merece desconfiança.
**Foto:** `46-comissoes` (a tela de comissões da equipe)

## Slide 11 — Como começa
**Título:** Como começa
- A gente instala e configura tudo. Você não cria conta em serviço nenhum.
- Desde o primeiro dia a loja já usa ordem de serviço, estoque e caixa. As peças e os clientes são cadastrados na própria loja (trazer do sistema antigo por planilha está no "O que vem por aí").
- A nota fiscal é uma etapa à parte: depende do certificado digital da loja, da SEFAZ, da prefeitura e da contabilidade. Fazemos junto com a contabilidade, e a meta é a loja estar emitindo nota nos primeiros 15 dias.
- A nota de serviço muda de prefeitura pra prefeitura: antes de começar, conferimos com a sua contabilidade como é a da sua cidade.
- O que precisa: computador com Windows e internet.
**Foto:** sem foto (sugestão: linha do tempo simples — dia 1: instalação → primeiros dias: vendendo → até 15 dias: emitindo nota)

## Slide 12 — O que vem junto
**Título:** O que vem junto
- Atualizações incluídas e automáticas: fechou e abriu, já está na versão nova.
- Toda versão nova roda primeiro numa loja de verdade, antes de chegar nas outras.
- Os dados da sua empresa ficam num banco só seu, sem se misturar com outras lojas, com cópia de segurança todo dia, guardada em dois lugares.
- Quantos computadores a loja quiser.
- Suporte direto com a gente pelo WhatsApp, sem central de atendimento. Se algo der errado, a tela de diagnóstico manda um resumo do problema.
**Foto:** sem foto (a tela de computadores mostra termos técnicos, como o canal de teste, que num PDF ninguém explica)

## Slide 13 — O que vem por aí
**Título:** O que vem por aí
Estamos construindo, entre outras coisas:
- Uma lista "do dia" no início, com tudo que precisa de atenção, em ordem de urgência e com o botão de resolver.
- Pix "copia e cola" na cobrança.
- Busca geral: achar cliente, placa, peça ou OS de qualquer tela.
- O pacote da contabilidade pronto: as notas e o lembrete do extrato.
- Trazer os dados do sistema antigo por planilha.

A ordem é decidida pelo que as lojas mais pedem.
**Foto:** sem foto

## Slide 14 — Próximo passo
**Título:** Vamos conversar?
Que tal uma conversa com uma demonstração? Você vê o sistema funcionando e tira todas as dúvidas.
`[CONTATO: a Sofia preenche]`
**Foto:** sem foto (sugestão: o logo)

## Fotos usadas

`04-inicio`, `07-ordens`, `10f-orcamentos`, `09-os-faturamento`, `10-os-fechamento`, `33-contas-receber`, `29b-caixa-fechamento`, `11-estoque-produtos`, `20-pedidos-compra`, `06b-ficha-veiculo`, `37-lucratividade`, `46-comissoes`.

Notas:
- As datas da loja de exemplo andam com o relógio. Tire as fotos na véspera ou no dia.
- O `04-inicio` sai sem o aviso da alíquota; o script `apresentacao/fotografar-telas-dos-slides.mjs` já faz isso.
- As fotos que ainda não estão no script (as alternativas e a `06b-ficha-veiculo`) a tarefa do PDF acrescenta, se quiser.
- Antes de usar a `37-lucratividade` e a `46-comissoes`, conferir os números na foto: os itens 3 e 15 de `apresentacao/o-que-falta-pra-apresentar.md` (receita que não bate com o Início; lucro de Comissões que não soma). Se ainda aparecer, no slide 9 usar a alternativa.
