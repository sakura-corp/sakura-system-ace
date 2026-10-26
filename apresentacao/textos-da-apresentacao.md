# Textos da apresentação do SSACE (15 slides)

> Textos dos slides da apresentação em PDF que a Sakura Corp manda à primeira empresa cliente (terça,
> 27/10). Leitor: o dono da loja. Português simples, sem termo técnico, foco no que muda no dia a dia.
>
> **Regras**: sem preço, mensalidade, custo ou desconto (o contato é o da empresa, no slide 15);
> sem o nome da loja que usa hoje, da cidade dela ou de qualquer pessoa (nem de ninguém da Sakura
> Corp: o cliente fala com a equipe da Sakura Corp); sem as funções desligadas
> (as regras de `apresentacao/levantamento-do-sistema.md`); no "O que vem por aí", nenhuma data, mês,
> ano ou prazo. Cada função citada foi conferida no levantamento ou na lista "Existe e não está lá"
> de `apresentacao/o-que-falta-pra-apresentar.md`.
>
> **Só o sistema, nada da venda** (decidido em 26/10/2026): a apresentação mostra o que o sistema é e
> o que ele pode virar. Como começa, prazo da nota, suporte, condições e demonstração ficam pra
> conversa com o cliente, não entram nos slides.
>
> **Fotos**: os nomes são os arquivos de `site/ferramentas/` (dados de mentira da "Auto Center Modelo").
> A montagem do PDF é outra tarefa; aqui só ficam os textos.

## Slide 1 — Capa
**Título:** Sakura System AutoCenter Edition
O fim do retrabalho e da bagunça no caixa.
Um sistema só pra controlar o pátio, a loja e a nota fiscal.
**Foto:** `04-inicio` (a tela de início do sistema, com vendas, lucro e carros no pátio)

## Slide 2 — O problema de hoje
**Título:** A gente sabe como é corrido…
- Fazer orçamento no papel e perder na gaveta.
- Digitar tudo de novo na hora de emitir a nota.
- Chegar no fim do dia e o dinheiro do caixa não bater.
- Não saber direito qual é a margem de lucro de cada peça.
**Foto:** sem foto

## Slide 3 — Tudo num lugar só
**Título:** Tudo num lugar só
- Ordem de serviço, estoque, caixa, contas e nota fiscal no mesmo programa.
- O que entra na ordem de serviço já vale pro caixa, pro estoque e pra nota.
- Feito pra quem não entende de computador.
**Foto:** sem foto (o logo da Sakura System)

## Slide 4 — Do orçamento à ordem de serviço
**Título:** Do orçamento à ordem de serviço, sem retrabalho
- Orçamento com validade: o cliente aprova ou recusa, e dá pra mandar pelo WhatsApp. O estoque só baixa quando ele aprova.
- Aprovado, vira ordem de serviço (OS) com o cliente e o carro. Cliente ou carro novo se cadastra sem sair da OS.
- Peça e serviço lançados uma vez só, com o técnico de cada item: da OS vão pro caixa, pro estoque e pra nota, sem digitar de novo. O lucro de cada OS aparece na hora.
- O botão "Avisar" abre o WhatsApp com "seu carro está pronto" já escrito.
- Quem só compra a peça? Venda de balcão, sem abrir OS.
**Foto:** `07-ordens` (a lista de ordens de serviço) — alternativa: `10f-orcamentos`

## Slide 5 — Cobrar e receber
**Título:** Cobrar e receber do jeito que o cliente paga
- Pagamento dividido: parte no Pix, parte no cartão.
- Só a parte do cartão é parcelada, com os juros que a loja escolher.
- "A receber depois" vira conta a receber e só entra no caixa quando o cliente paga.
- O botão "Cobrar" abre o WhatsApp com valor e vencimento já escritos. Os textos das mensagens a loja pode editar.
**Foto:** `09-os-faturamento` (pagamento dividido entre Pix e cartão em 3x)

## Slide 6 — Nota fiscal sem sair da OS
**Título:** Nota fiscal sem sair da ordem de serviço
- Nota de peça (NFC-e) e nota de serviço (NFS-e) emitidas de dentro da OS. O sistema sabe qual nota cada OS precisa e mostra só o botão certo.
- A nota já aparece em PDF, pronta pra imprimir. Se o cliente pedir de novo, dá pra reabrir uma nota antiga.
- Antes de emitir, avisa quando uma peça está com o código fiscal errado, dizendo o nome da peça.
- Cancelamento pelo próprio sistema.
- As notas do mês saem num arquivo só, do jeito que a contabilidade pede.
**Foto:** `10-os-fechamento` (a OS pronta pra emitir a nota)

## Slide 7 — Caixa e contas
**Título:** O caixa e as contas, sem caderno
- Caixa do dia separado por forma de pagamento.
- Lucro do dia de verdade: desconta o custo da peça, o custo do serviço e as despesas.
- Fechamento da gaveta no fim do dia, com troco e diferença.
- Contas a pagar com vencimento; a conta mensal (aluguel, luz) se repete sozinha. Pagar a conta lança a saída no caixa.
- Despesas com categoria, pra ver pra onde o dinheiro vai, e a lista de quem está devendo.
**Foto:** `33-contas-receber` (quem está devendo, quanto e até quando) — alternativa: `29b-caixa-fechamento`

## Slide 8 — Estoque e compras
**Título:** Estoque e compras sob controle
- Custo, preço de venda e margem de cada peça. Campos próprios de pneu: medida, carga/velocidade e DOT.
- Leitor de código de barras: bipou, abriu a peça.
- Estoque mínimo e o filtro "Precisa comprar". Extrato de cada peça e inventário.
- Avisa antes de cadastrar uma peça repetida.
- Pedido de compra com o histórico de preço de cada fornecedor, e o botão que abre o WhatsApp do fornecedor com o pedido já escrito. A entrada da compra pode vir do arquivo da nota do fornecedor (o XML), de uma vez.
**Foto:** `11-estoque-produtos` (a lista de peças do estoque) — alternativa: `20-pedidos-compra`

## Slide 9 — O cliente e o carro
**Título:** Cada carro tem a sua história
- Ficha do veículo pela placa: tudo que já foi feito, garantias em vigor e KM.
- Avisa quando o KM digitado é menor que o da última visita (quase sempre é um dígito faltando).
- Documento de garantia pro cliente assinar.
- "Clientes que sumiram": quem não volta há muito tempo, pra você chamar de volta.
**Foto:** `06b-ficha-veiculo` (a ficha de um carro, com histórico e garantias)

## Slide 10 — Pro dono enxergar o negócio
**Título:** Pro dono enxergar o negócio
- Tela de início com vendas, lucro e ticket médio, comparando com o mês passado. Cada número tem um "?" que explica de onde ele vem.
- Contas dos próximos 15 dias e carros no pátio, com há quantos dias estão lá.
- Gráficos e lucratividade por peça e por serviço: o que vende muito e dá pouco lucro.
- Auditoria: quem mudou o quê, e quando.
- Mais de uma loja no mesmo sistema, se precisar.
**Foto:** `37-lucratividade` (lucro por peça e por serviço) — alternativa: `04-inicio`

## Slide 11 — A equipe
**Título:** Cada um vê só o que deve
- Cada funcionário entra com o próprio usuário e senha; o dono escolhe o que cada um vê.
- Esqueceu a senha? O dono resolve na hora.
- Salário e documentos protegidos.
- Comissões que separam quem vendeu de quem executou, com aviso quando o número merece desconfiança.
**Foto:** `46-comissoes` (a tela de comissões da equipe)

## Slide 12 — Feito no pátio
**Título:** Feito no pátio, não no laboratório
- Nasceu no balcão de uma borracharia de verdade: cada função veio de um problema real do dia a dia.
- Em uso todo dia desde agosto de 2026, com nota de peça e de serviço emitidas de verdade.
- Toda versão nova roda primeiro nessa loja, antes de chegar nas outras.
**Foto:** sem foto (o logo da Sakura System)

## Slide 13 — Seguro e sempre atualizado
**Título:** Seguro e sempre atualizado
- Atualização automática: fechou e abriu, já está na versão nova.
- Os dados da sua empresa ficam num banco só seu, sem se misturar com outras lojas.
- Cópia de segurança todo dia, guardada em dois lugares.
- Se algo der errado, a tela de diagnóstico junta um resumo do problema.
**Foto:** sem foto

## Slide 14 — O que vem por aí
**Título:** O que vem por aí
Estamos construindo, entre outras coisas:
- Uma lista "do dia" no início, com tudo que precisa de atenção, em ordem de urgência e com o botão de resolver.
- Pix "copia e cola" na cobrança.
- Busca geral: achar cliente, placa, peça ou OS de qualquer tela.
- O pacote da contabilidade pronto: as notas e o lembrete do extrato.
- Trazer os dados do sistema antigo por planilha.

A ordem é decidida pelo que as lojas mais pedem.
**Foto:** sem foto

## Slide 15 — Próximo passo
**Título:** Vamos conversar?
Ficou alguma dúvida, ou quer ver o sistema funcionando? Fale com a equipe da Sakura Corp.
- E-mail: contato@sakuracorp.com.br
- WhatsApp: `[WHATSAPP]` (o número vai direto no PDF, não neste repositório, que é público)
**Foto:** sem foto (sugestão: o logo)

## Fotos usadas

`04-inicio`, `07-ordens`, `10f-orcamentos`, `09-os-faturamento`, `10-os-fechamento`, `33-contas-receber`, `29b-caixa-fechamento`, `11-estoque-produtos`, `20-pedidos-compra`, `06b-ficha-veiculo`, `37-lucratividade`, `46-comissoes`.

Notas:
- As datas da loja de exemplo andam com o relógio. Tire as fotos na véspera ou no dia.
- O `04-inicio` sai sem o aviso da alíquota; o script `apresentacao/fotografar-telas-dos-slides.mjs` já faz isso.
- As fotos que ainda não estão no script (as alternativas e a `06b-ficha-veiculo`) a tarefa do PDF acrescenta, se quiser.
- Antes de usar a `37-lucratividade` e a `46-comissoes`, conferir os números na foto: os itens 3 e 15 de `apresentacao/o-que-falta-pra-apresentar.md` (receita que não bate com o Início; lucro de Comissões que não soma). Se ainda aparecer, no slide 10 usar a alternativa.
- No slide 15, o WhatsApp entra direto no PDF (`[WHATSAPP]`): o número não fica no repositório, que é público. Nenhum nome de pessoa aparece nos slides; quem fala com o cliente é a equipe da Sakura Corp.
