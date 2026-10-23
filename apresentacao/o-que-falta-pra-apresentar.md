# O que falta pro programa ficar apresentável

> Levantamento da tarefa #777 (23/10/2026), pra apresentação de terça, 27/10. **Só leitura**: nada
> foi consertado. Cada item que a Sofia escolher vira uma tarefa.
>
> Como foi feito: as 54 telas abertas com os **dados de mentira** (`site/ferramentas/`, a loja
> "Auto Center Modelo"), numa janela de **1366 × 768** (a tela do notebook do Balcão), e cada
> foto olhada por um ajudante; os pontos graves foram conferidos de novo na foto e no código.

## Antes da lista: duas origens diferentes

Cada item diz de onde vem o problema, porque isso muda o que adianta consertar:

- **Dados de mentira**: só aparece com a loja inventada. Na loja de verdade não acontece. Mas é
  com ela que se tiram **as fotos do PDF** e, se a demonstração for feita nela, é o que o cliente
  vai ver. O conserto fica todo em `site/ferramentas/dados-demo.mjs` e `banco-falso.mjs`, **sem
  mexer no programa** (não precisa publicar versão).
- **Programa**: aparece em qualquer loja. O conserto vira versão nova, e só chega na terça se
  entrar até o teste do fim de semana.

**Uma decisão sua muda a ordem da lista**: a demonstração vai ser feita **na loja inventada** (os
mesmos dados das fotos) ou numa instalação de teste com outros dados? Se for na inventada, os 7
primeiros itens (todos de dados de mentira) são os mais urgentes. Se não for, eles só importam
pras fotos do PDF, e os itens do programa sobem.

## A lista (do mais grave ao menos grave)

| # | Tela | O que se vê | Por que atrapalha a demonstração | Origem | Horas |
|---|---|---|---|---|---|
| 1 | **Ordens de Serviço** → uma OS (aba Fechamento) e uma venda de balcão aberta; também a lista | Na venda 149, o selo do topo diz **"falta NFC-e"** e logo abaixo **"Todas as notas desta venda já foram emitidas"** e **"NFC-e emitida ✓"**, com **"Ver DANFE" duas vezes** e **"Ver PDF da NFS-e" duas vezes** (venda de balcão nem tem NFS-e). A OS 146, que nem foi faturada, também diz "todas as notas emitidas". Na lista, as OS faturadas aparecem com "falta NFC-e e NFS-e". | É a tela de nota fiscal, a parte que mais vende o programa, e ela se contradiz na mesma tela. | Dados de mentira: o banco falso não filtra as notas pela OS e as notas inventadas não estão ligadas a OS nenhuma | 1–2 |
| 2 | **Caixa Diário** (Diário) | As 4 linhas do dia mostram Cliente **"—"**, Origem só **"OS"** (sem número) e Lucro **"—"**. O cartão **"Lucro do dia R$ 3.891,00" é igual às entradas**, como se peça não tivesse custo. | É a tela que o dono mais olha. Parece quebrada, e "lucro igual à venda" faz duvidar da conta. O mesmo defeito deixa o gráfico de Relações com lucro quase igual à venda em uns dias e prejuízo enorme em outros. | Dados de mentira: os lançamentos do caixa não trazem a OS junto | 1–1,5 |
| 3 | **Relações** (Gráficos × Lucratividade) e **Início** | Gráficos e Início: **vendas do mês R$ 38.301,00**. Lucratividade, no mesmo período: **receita R$ 6.220,30**. | O dono compara as duas abas e o número não bate. | Dados de mentira: o histórico de vendas inventado só existe no caixa, sem as OS por trás | 2–3 |
| 4 | **Contas a Receber** × **Caixa Diário** | A OS 145 (R$ 2.588,00) está **"Pendente"** a receber e, ao mesmo tempo, **paga no cartão** no caixa de hoje. | Conta que não fecha: ou recebeu ou não recebeu. | Dados de mentira | 0,5 |
| 5 | **Auditoria** | A coluna **"Quem" vem "—" em todas as linhas**. | A tela existe pra responder "quem mudou?", e não mostra ninguém. | Dados de mentira: o campo do nome vem com outro nome nos dados (conserto de uma linha por registro) | 0,1 |
| 6 | **Estoque** → Movimentações (e Produtos, Relatórios) | Lista **fora de ordem de data** (03/10, 23/10, 11/10, 15/10…), quase todas com a **mesma hora "18:01:25"**. A Bateria 60Ah foi vendida duas vezes hoje, mas **não tem saída** e o saldo continua 12. A contagem anotou 1 pneu a menos e o saldo não mudou. | Parece estoque bagunçado, e o saldo não bate com as vendas, exatamente o que o programa promete resolver. | Dados de mentira: o banco falso ignora a ordenação | 1–2 |
| 7 | **Caixa Diário** → Saídas (também Serviços e Contas a Pagar) | Faixa amarela **"8 lançamentos antigos estão sem categoria, somando R$ 31.000,00"**, "Por categoria" só com **"Sem categoria"**, e coluna Categoria **"—"** em Saídas, Serviços e Contas a Pagar. | A loja de exemplo parece desorganizada, e a tela de categorias, que é uma vantagem, aparece vazia. | Dados de mentira | 0,5–1 |
| 8 | **Estoque** → Produtos | Margem com **ponto**: "59.1%", "49.3%" (o resto do programa usa vírgula). E a margem é **sobre o custo** (custo 245 → venda 389,90 = 59,1%); sobre a venda daria 37,2%. | O ponto aparece em toda linha. A conta sobre o custo pode virar discussão ("minha margem é 37, não 59"). | Programa (`ProdutosSection.tsx`, `schemas/peca.ts`) | 0,5 (vírgula); o nome ou a conta é decisão sua |
| 9 | **Ordens de Serviço** → Nova OS, Novo orçamento, aba Fechamento | A **barra fixa de baixo** (totais + Cancelar + Abrir) **cobre conteúdo** na primeira tela: o "+ adicionar item" e o campo "Descrição da peça" aparecem cortados pela metade, e no Fechamento cobre os botões de DANFE. No Fechamento, o botão é **"Cancelar"** numa aba que só mostra dados (devia ser "Voltar"). | É o formulário mais mostrado numa demonstração; campo cortado parece defeito. | Programa (`OrdemServicoForm.tsx`) | 1–1,5 |
| 10 | **Todas** (menu da esquerda) | Em 768 de altura o menu **termina cortado em "Relações"**: Garantias, Notas Fiscais, Funcionários e Auditoria só aparecem rolando uma barra fininha. O nome do usuário sai **"Marcos A..."**. | Na demonstração, metade dos módulos "não existe" até alguém rolar o menu. | Programa (`Sidebar.tsx`) | 0,5–2 |
| 11 | **Clientes** → Clientes que sumiram | Eduardo Salles e Juliana Prado aparecem como **"sumiram"**, mas os dois têm **OS aberta hoje** (no Início e na lista de OS). | "Ele está aqui com o carro e sumiu?" A regra está certa (só OS faturada conta); a escolha dos clientes é que destoa. | Dados de mentira | 1–2 |
| 12 | **Início** (aviso da alíquota) e **Configurações** → Dados fiscais e Texto de garantia | O aviso da alíquota traz o **passo a passo do portal de Araraquara**; os Dados fiscais dizem "**Araraquara**" duas vezes e enchem a tela de termos como **Focus NFe, token, homologação, IBGE, LC 116, CNAE**; a loja inventada aparece em **"Ambiente: Produção"** com token cadastrado; o texto de garantia de exemplo termina em "Araraquara, {data}". | Se a empresa cliente for de outra cidade, vê a cidade de outra loja; e a tela fiscal assusta quem não é contador. | Programa (os textos com a cidade) + dados de mentira (produção e token) | 1–1,5 |
| 13 | **Fornecedores** → Pedidos de compra; **Estoque** → Produtos; **Contas a Receber** | Tabelas apertadas em 1366: a etiqueta **"Recebido parcialmente" quebra em duas linhas** com o fundo cortado; códigos quebram no meio ("PN-" / "17570R14"); o texto de busca sai cortado ("…marca ou m"); "Marcar como recebido" quebra numa linha e não na outra. | Dá aparência de inacabado nas telas de lista. | Programa | 1–1,5 |
| 14 | **Notas Fiscais** (NFC-e e NFS-e) | A coluna **"Ordem de Serviço" mostra o nome do cliente**, não o número da OS. A aba se chama **"NFe"**, mas as notas são NFC-e. As tabelas de outubro e setembro ficam com as colunas desalinhadas entre si. | O cabeçalho não bate com o conteúdo; quem conhece nota estranha "NFe". | Programa (`ArquivosSection.tsx`) | 0,5–1 |
| 15 | **Funcionários** → Comissões | **"Lucro do período R$ 1.400,00"**, mas a coluna "Lucro gerado" soma **R$ 2.623,00** (o lucro de uma OS conta pro vendedor e pro técnico). Os dois avisos são **faixas creme bem claras**, fora do padrão escuro do resto. | O dono soma a coluna e não bate; e os avisos parecem erro. | Programa (uma frase explicando a conta; a cor do aviso) | 1–1,5 |

**Soma**: os 7 itens de dados de mentira dão **cerca de 7 a 11 horas**, sem versão nova. Os 8 do
programa dão **cerca de 6 a 10 horas**, e precisam entrar até o teste do fim de semana.

### Ficaram de fora dos 15 (menores, ou é só saber responder)

- **Orçamentos**: a etiqueta "Orçamento" se repete em toda linha (e some no fundo escuro); no
  vencido, empilha "Orçamento" + "vencido". Aprovar é em dois passos ("Aprovar" só abre o campo).
- **Botão de arquivo em inglês** ("Choose File / No file chosen") em Importar XML e Enviar XML.
  Pode ser só do navegador da foto; **conferir no notebook do Balcão** antes de consertar.
- **Início**: "Lucros mês" (devia ser "Lucro do mês"). **Relações** é um nome que o dono não liga
  a "gráficos de vendas e lucro"; o gráfico fica estreito no meio do cartão.
- **Cadastro de cliente**: "Código IBGE do município (só p/ NFS-e)".
- **Lançamento manual no caixa**: a forma de pagamento é texto livre ("dinheiro", "pix", "PIX"…).
- **Fechamento do caixa**: troco mostrado como "100", sem "R$" nem ",00".
- **Computadores desta empresa**: mostra "canal de teste" e o número da versão (só explicar).
- **Cancelar nota**: o texto cita "Focus NFe" (o fornecedor por trás da nota).
- **Login**: "Configurar conexão com o banco de dados" no rodapé, termo de técnico.

### Cuidados pra terça (não são defeitos)

- **As datas da loja inventada andam com o relógio**: "hoje", os totais do mês e os vencimentos são
  contados a partir do dia em que a tela abre. As fotos de hoje (23/10) **não vão bater** com o que
  aparece na terça. Tirar as fotos do PDF na véspera ou no próprio dia.
- **O que fica abaixo da dobra não foi olhado**: as telas rolam por dentro, e as fotos pegaram só o
  que cabe em 1366 × 768 (o fim dos formulários de cliente, produto e OS, a parte de baixo do
  Início, o histórico de contagens e o resto de Comissões e Computadores).

## O levantamento de 25/09 ainda está certo?

`apresentacao/levantamento-do-sistema.md` não foi mexido. O que mudou desde ele:

**Existe e não está lá** (as versões publicadas pras lojas foram conferidas no GitHub, até a
0.9.54):
- **Venda de balcão** (0.9.45): peça pra quem não deixa o carro; baixa o estoque, lança no caixa e
  emite a NFC-e. Numeração própria ("Venda 17").
- **Orçamento** (0.9.52): etapa antes da OS, com numeração própria, validade de 7 dias, aprovar ou
  recusar com motivo, envio pelo WhatsApp; o estoque só baixa na aprovação.
- **Ficha do veículo** (0.9.46): tudo que já foi feito num carro, pela placa, com garantias em
  vigor, KM por mês e a volta média.
- **Clientes que sumiram**: quem não volta há muito tempo, pra chamar de volta.
- **Fechamento do caixa** (0.9.42): conferência da gaveta no fim do dia, com troco e diferença.
- **Computadores desta empresa** (0.9.44): a versão de cada computador da loja.
- **Peça parecida** (0.9.52): avisa antes de cadastrar uma peça que já existe; e **Juntar peças
  repetidas** (só administrador).
- **Peça sem cadastro no orçamento** (0.9.52).
- Na versão de teste (0.9.55, ainda não liberada): o link "Ver documento oficial completo" da
  NFS-e abre no navegador.

**O que mudou no que já está lá**:
- Seção 1, "Etapas simples: em andamento → concluída → faturada": agora tem o **orçamento antes**.
- Seção 4: o "Importar por foto/PDF" **continua desligado** (a regra de não citar continua valendo).
- Seção 6: o aviso da alíquota e o passo a passo do portal são de **Araraquara** (ver item 12);
  pra loja de outra cidade, o texto precisa mudar antes.
- Seções 11 e 12: o texto cita a loja pelo nome e foi escrito pros "amigos do pai". Pra uma
  empresa cliente, a regra de não citar a loja pelo nome continua valendo.
