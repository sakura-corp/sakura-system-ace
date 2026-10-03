// As 54 telas do sistema, com os cliques necessários pra chegar até cada uma.
//
// Mora num arquivo só porque DOIS programas percorrem esta lista: o gerador
// de imagens do catálogo (gerar-catalogo-telas.mjs) e a varredura de
// contraste (scripts/varredura-contraste-dom.mjs). Duas listas iguais viram,
// na primeira mudança de tela, duas listas diferentes.
//
// "passos" são os cliques depois de abrir a rota. Ao mudar o RÓTULO ou o
// LUGAR de um botão no app, procure o texto dele aqui — este é o único teste
// de tela que o projeto tem hoje, e ele já quebrou em silêncio uma vez
// (PROJETO_STATUS.md, seção 6, item 53).

export const CENAS = [
  // ---------------------------------------------------------------- entrada
  { arquivo: "01-login", modulo: "Entrada no sistema", titulo: "Tela de login",
    deslogado: true, rota: "/",
    descricao: "A primeira tela. O operador digita só o usuário e a senha — sem e-mail, pra ser rápido no balcão. Por baixo dos panos o sistema monta um e-mail interno pra falar com o Supabase. A versão do programa aparece no canto inferior direito, e o link embaixo do formulário permite trocar a conexão com o banco caso o computador esteja apontando pro lugar errado." },
  { arquivo: "02-conexao", modulo: "Entrada no sistema", titulo: "Conexão com o banco da empresa",
    deslogado: true, rota: "/", passos: [{ clicar: "Configurar conexão com o banco de dados" }],
    descricao: "Aparece na primeira vez que o programa é aberto em cada computador. É o que permite um instalador único servir qualquer empresa: quem instala cola o endereço e a chave do banco daquela empresa, e o valor fica guardado só naquela máquina. Sem isso, cada cliente novo precisaria de um instalador próprio." },
  { arquivo: "03-trocar-senha", modulo: "Entrada no sistema", titulo: "Troca de senha obrigatória",
    trocarSenha: true, rota: "/",
    descricao: "Quando um administrador redefine a senha de alguém que esqueceu, o sistema gera uma senha temporária e marca esse operador. No login seguinte, esta tela aparece no lugar do sistema e não deixa passar até ele criar uma senha nova." },

  // ------------------------------------------------------------------ início
  { arquivo: "04-inicio", modulo: "Início", titulo: "Painel de início",
    rota: "/",
    descricao: "A tela que abre depois do login. Três cartões escolhidos pelo dono (vendas, lucro e ticket médio do mês), o calendário do mês com feriados, aniversários de clientes e contas a vencer, e as listas de ordens de serviço abertas e veículos no pátio." },

  // ---------------------------------------------------------------- clientes
  { arquivo: "05-clientes", modulo: "Clientes", titulo: "Lista de clientes",
    rota: "/clientes",
    descricao: "Todos os clientes da empresa com busca por nome, telefone ou placa. O cadastro é compartilhado entre as lojas da mesma empresa, então um cliente que passa em duas lojas tem um histórico só." },
  { arquivo: "05b-cliente-veiculos", modulo: "Clientes", titulo: "Veículos de um cliente",
    rota: "/clientes", passos: [{ clicar: "Ver veículos" }],
    descricao: "Os carros de um cliente, abertos pelo 'Ver veículos' da lista. Cada carro leva pra ficha dele; carro cadastrado sem placa aparece pela marca e pelo modelo." },
  { arquivo: "06-cliente-form", modulo: "Clientes", titulo: "Cadastro de cliente e veículos",
    rota: "/clientes", passos: [{ clicar: "+ Novo cliente" }],
    descricao: "Cadastro de pessoa física ou jurídica (os rótulos mudam sozinhos entre CPF/CNPJ e nome/razão social), endereço preenchido pelo CEP e a lista de veículos do cliente — cada um com placa, marca, modelo, cor e tipo, que é o que desenha o ícone do carro na tela de início." },

  { arquivo: "06b-ficha-veiculo", modulo: "Clientes", titulo: "Ficha do veículo",
    rota: "/veiculos/v1",
    descricao: "Tudo que já foi feito num carro, por placa: dono atual, KM mais recente e quanto ele costuma rodar por mês, quanto já foi gasto nele, de quanto em quanto tempo ele volta, as peças que ainda estão na garantia e a linha do tempo de todas as OS, com data, KM, itens e total. Abre pelo 'Ver veículos' em Clientes, ou clicando na placa na lista de OS ou em Garantias." },

  // -------------------------------------------------------- ordens de serviço
  { arquivo: "07-ordens", modulo: "Ordens de Serviço", titulo: "Lista de ordens de serviço",
    rota: "/ordens-servico",
    // A lista inteira cabe em 1366 (o Balcão), sem rolar de lado (#425).
    // Conferido pelo `npm run largura:telas`.
    semRolarAPartirDe: 1366,
    descricao: "O coração do sistema. Cada OS tem número sequencial por loja e passa por três etapas: em andamento, concluída e faturada — mais o estado 'finalizada', que o sistema deduz sozinho quando todas as notas fiscais daquela OS já saíram. A lista mostra total e lucro de cada ordem (e, em tela larga, quanto foi de peças e de serviços)." },
  { arquivo: "08-os-form", modulo: "Ordens de Serviço", titulo: "Abertura de ordem de serviço",
    rota: "/ordens-servico", passos: [{ clicar: "+ Nova ordem de serviço" }],
    descricao: "Escolhe cliente e veículo, quilometragem de entrada, vendedor responsável e vai lançando os itens — peça ou serviço, cada um com quantidade, preço, desconto e o técnico que executou. Peça lançada aqui já dá baixa no estoque sozinha." },
  { arquivo: "09-os-faturamento", modulo: "Ordens de Serviço", titulo: "Faturamento da ordem",
    rota: "/ordens-servico", passos: [{ clicar: "Faturar" }],
    descricao: "Fecha a conta com o cliente. Dá pra dividir o pagamento em mais de uma forma (metade Pix, metade cartão), parcelar só a parte do cartão com os juros configurados, e escolher entre receber na hora — que lança a entrada no caixa — ou deixar como conta a receber." },
  { arquivo: "10-os-fechamento", modulo: "Ordens de Serviço", titulo: "Fechamento: notas fiscais e garantia",
    rota: "/ordens-servico", passos: [{ clicar: "Fechamento" }],
    descricao: "Aqui saem os documentos da OS. O sistema sabe de que nota aquela ordem precisa — NFC-e se tem peça, NFS-e se tem serviço, as duas se tem os dois — e mostra só o botão que faz sentido. A emissão é automática, via Focus NFe, e o PDF aparece na própria tela. O botão de garantia gera o documento pro cliente assinar." },

  // ------------------------------------------------ venda de balcão (FN-09)
  { arquivo: "10b-venda-balcao", modulo: "Ordens de Serviço", titulo: "Venda de balcão",
    rota: "/ordens-servico",
    passos: [
      { clicar: "+ Venda de balcão" },
      { digitar: "7891234567894", em: 'input[placeholder^="Código de barras"]', enter: true },
      { digitar: "pneu", em: 'input[placeholder^="Código de barras"]' },
    ],
    descricao: "Vender uma peça pra quem não vai deixar o carro, numa tela só: passa o leitor de código de barras (ou procura pelo nome ou pela medida), confere quantidade e preço, e segue pro pagamento. Quem não se identifica compra como 'Consumidor'; quem pede CPF na nota é escolhido ou cadastrado ali mesmo. Baixa o estoque, lança no caixa e abre a NFC-e — tudo o que a OS já fazia." },
  { arquivo: "10c-venda-pagamento", modulo: "Ordens de Serviço", titulo: "Pagamento da venda de balcão",
    rota: "/ordens-servico",
    passos: [
      { clicar: "+ Venda de balcão" },
      { digitar: "7891234567894", em: 'input[placeholder^="Código de barras"]', enter: true },
      { clicar: "Ir para o pagamento" },
    ],
    descricao: "O mesmo pagamento da OS — dividir em formas, parcelar o cartão com os juros da loja. Venda no Consumidor é sempre recebida na hora: pra deixar a receber, é preciso saber de quem cobrar." },
  { arquivo: "10d-vendas-lista", modulo: "Ordens de Serviço", titulo: "Vendas de balcão na lista",
    rota: "/ordens-servico", passos: [{ aba: "Vendas de balcão (1)" }],
    descricao: "As vendas de balcão ficam numa aba própria, separadas das ordens de serviço — e fora do ticket médio, que responde quanto rende cada carro atendido. O número é o mesmo contador das OS, então 'Venda 149' e 'OS 148' nunca se repetem." },
  { arquivo: "10e-venda-detalhe", modulo: "Ordens de Serviço", titulo: "Uma venda de balcão já registrada",
    rota: "/ordens-servico", passos: [{ aba: "Vendas de balcão (1)" }, { clicar: "Fechamento" }],
    descricao: "Aberta pela lista, a venda mostra o que sobra pra fazer depois de registrada: emitir (ou reemitir) a NFC-e, ver o DANFE e imprimir a garantia da peça. As peças de uma venda não mudam depois de registrada." },

  // ----------------------------------------------------------------- estoque
  { arquivo: "11-estoque-produtos", modulo: "Estoque", titulo: "Produtos",
    rota: "/estoque",
    descricao: "O catálogo de peças, com saldo atual, preço de custo e de venda. Compartilhado entre as lojas da mesma empresa — o saldo é que fica separado por loja." },
  { arquivo: "12-produto-form", modulo: "Estoque", titulo: "Cadastro de produto",
    rota: "/estoque", passos: [{ clicar: "+ Novo produto" }],
    descricao: "Além dos dados comuns, guarda tudo que a nota fiscal exige (NCM, CFOP, CSOSN, alíquota de ICMS, origem) e o prazo de garantia da peça, que é o que alimenta o módulo de Garantias. Custo, margem e preço final se calculam entre si nos dois sentidos." },
  // "13-importar-foto" saiu da lista junto com o botão "Importar por foto/PDF",
  // desligado a pedido dela em 25/09/2026 (IMPORTAR_POR_FOTO_LIGADO em
  // src/pages/estoque/ProdutosSection.tsx). Religando o botão, a cena volta:
  // { arquivo: "13-importar-foto", modulo: "Estoque", titulo: "Importar produtos por foto ou PDF",
  //   rota: "/estoque", passos: [{ clicar: "Importar por foto/PDF" }],
  //   descricao: "Lê a nota fiscal do fornecedor por foto ou PDF usando inteligência artificial e devolve os produtos já separados numa tabela editável, pra cadastrar em lote em vez de digitar um por um. A chave da IA fica guardada no servidor, nunca dentro do programa instalado." },
  { arquivo: "14-movimentacoes", modulo: "Estoque", titulo: "Movimentações",
    rota: "/estoque", passos: [{ aba: "Movimentações" }],
    descricao: "O extrato de tudo que entrou e saiu do estoque, com o motivo (compra, venda, uso em OS, ajuste) e a referência de onde veio. É aqui que se descobre a origem de um saldo estranho." },
  { arquivo: "15-movimento-form", modulo: "Estoque", titulo: "Registrar movimentação manual",
    rota: "/estoque", passos: [{ aba: "Movimentações" }, { clicar: "+ Registrar movimentação" }],
    descricao: "Entrada ou saída lançada à mão, quando não veio de uma compra nem de uma OS — perda, devolução, transferência entre depósitos." },
  { arquivo: "16-contagem", modulo: "Estoque", titulo: "Contagem de estoque (inventário)",
    rota: "/estoque", passos: [{ aba: "Contagem" }],
    descricao: "Inventário físico por depósito: digita-se quanto foi contado de verdade, o sistema mostra quanto deveria ter e, havendo diferença, gera o ajuste no estoque sozinho." },
  { arquivo: "17-estoque-relatorios", modulo: "Estoque", titulo: "Relatórios de estoque",
    rota: "/estoque", passos: [{ aba: "Relatórios" }],
    descricao: "Quanto dinheiro está parado em peça, o que está com saldo negativo (sinal de erro de lançamento) e o que não tem movimentação há tempo demais." },

  // ------------------------------------------------------------ fornecedores
  { arquivo: "18-fornecedores", modulo: "Fornecedores", titulo: "Cadastro de fornecedores",
    rota: "/fornecedores",
    descricao: "Quem vende pra loja: razão social, CNPJ, contato e endereço completo. Também é compartilhado entre as lojas da mesma empresa." },
  { arquivo: "19-fornecedor-form", modulo: "Fornecedores", titulo: "Ficha do fornecedor",
    rota: "/fornecedores", passos: [{ clicar: "+ Novo fornecedor" }],
    descricao: "O formulário do fornecedor, com endereço preenchido pelo CEP e a opção de inativar em vez de excluir, pra não perder o histórico de compras ligado a ele." },
  { arquivo: "20-pedidos-compra", modulo: "Fornecedores", titulo: "Pedidos de compra",
    rota: "/fornecedores", passos: [{ aba: "Pedidos de compra" }],
    descricao: "O que foi pedido pra cada fornecedor e em que pé está: pendente, parcial (chegou parte) ou recebido. Cada pedido tem número sequencial por loja." },
  { arquivo: "21-pedido-form", modulo: "Fornecedores", titulo: "Novo pedido de compra",
    rota: "/fornecedores", passos: [{ aba: "Pedidos de compra" }, { clicar: "+ Novo pedido" }],
    descricao: "Monta o pedido item a item. Ao escolher a peça, o sistema mostra o que cada fornecedor cobrou dela nas últimas compras, do mais barato pro mais caro, com um botão pra usar aquele preço." },
  { arquivo: "22-receber-pedido", modulo: "Fornecedores", titulo: "Conferência de recebimento",
    rota: "/fornecedores", passos: [{ aba: "Pedidos de compra" }, { clicar: "Receber" }],
    descricao: "Quando a mercadoria chega, confere-se quanto veio de cada item — pode ser parcial, em mais de uma vez. O sistema lança a entrada no estoque e recalcula o status do pedido sozinho." },
  { arquivo: "23-importar-xml", modulo: "Fornecedores", titulo: "Importar XML da nota do fornecedor",
    rota: "/fornecedores", passos: [{ aba: "Pedidos de compra" }, { clicar: "Importar XML de nota fiscal" }],
    descricao: "Lê o arquivo XML que o fornecedor emite, acha o fornecedor pelo CNPJ, casa cada item com uma peça já cadastrada e cria o pedido já como recebido — com entrada de estoque e histórico de preço gravados de uma vez." },

  // ---------------------------------------------------------------- serviços
  { arquivo: "24-servicos", modulo: "Serviços", titulo: "Catálogo de serviços",
    rota: "/servicos",
    descricao: "A lista de mão de obra que a loja vende (alinhamento, troca de óleo, montagem), cada uma com preço padrão e custo — o custo é o que permite calcular o lucro de verdade nos relatórios." },
  { arquivo: "25-servico-form", modulo: "Serviços", titulo: "Cadastro de serviço",
    rota: "/servicos", passos: [{ clicar: "+ Novo serviço" }],
    descricao: "Descrição, código, categoria, preço padrão e custo. O preço padrão é só uma sugestão: na ordem de serviço dá pra mudar item a item." },

  // ------------------------------------------------------------------- caixa
  { arquivo: "26-caixa-diario", modulo: "Caixa Diário", titulo: "Caixa do dia",
    rota: "/caixa",
    descricao: "Tudo que entrou e saiu no dia, junto: as ordens faturadas e os lançamentos feitos à mão. Mostra o lucro do dia já descontando o custo das peças e serviços vendidos e as despesas lançadas, e o resumo por forma de recebimento." },
  { arquivo: "27-caixa-form", modulo: "Caixa Diário", titulo: "Lançamento manual no caixa",
    rota: "/caixa", passos: [{ clicar: "+ Lançamento manual" }],
    descricao: "Dinheiro que entrou ou saiu sem passar por uma ordem de serviço — venda de sucata, pagamento de fornecedor, troco. A categoria é o que faz esses valores aparecerem organizados nos relatórios." },
  { arquivo: "28-caixa-entradas", modulo: "Caixa Diário", titulo: "Entradas",
    rota: "/caixa", passos: [{ aba: "Entradas" }],
    descricao: "Só o dinheiro que entrou por fora das ordens de serviço, com filtro por período e por categoria." },
  { arquivo: "29-caixa-saidas", modulo: "Caixa Diário", titulo: "Saídas",
    rota: "/caixa", passos: [{ aba: "Saídas" }],
    descricao: "As despesas do dia a dia. É o outro lado do Contas a Pagar: aqui fica o que já saiu, lá fica o que ainda vai vencer." },
  { arquivo: "29b-caixa-fechamento", modulo: "Caixa Diário", titulo: "Fechamento do caixa",
    rota: "/caixa", passos: [{ aba: "Fechamento" }],
    descricao: "No fim do dia, conta-se o dinheiro da gaveta e o sistema compara com o que ele esperava. Se faltou ou sobrou, a diferença vira um lançamento de verdade (Quebra ou Sobra de caixa) — ela nunca some. Pix e cartão aparecem à parte, pra conferir com o extrato." },

  // ---------------------------------------------------------- contas a pagar
  { arquivo: "30-contas-pagar", modulo: "Contas a Pagar", titulo: "Contas a pagar",
    rota: "/contas-pagar",
    descricao: "O que a loja ainda deve, com vencimento. As vencidas aparecem destacadas e também no calendário do início. Conta marcada como mensal se recria sozinha depois de paga." },
  { arquivo: "31-conta-pagar-form", modulo: "Contas a Pagar", titulo: "Nova conta a pagar",
    rota: "/contas-pagar", passos: [{ clicar: "+ Nova conta" }],
    descricao: "Descrição, valor, vencimento e categoria. Marcando 'conta mensal', dá pra dizer até quando ela se repete — em branco, repete pra sempre." },
  { arquivo: "32-pagar-conta", modulo: "Contas a Pagar", titulo: "Marcar conta como paga",
    rota: "/contas-pagar", passos: [{ clicar: "Marcar como paga" }],
    descricao: "Confirma a data e a forma de pagamento. O sistema lança a saída no caixa sozinho e, se a conta for mensal, já cria a ocorrência do mês seguinte. Dá pra desfazer se foi engano." },

  // -------------------------------------------------------- contas a receber
  { arquivo: "33-contas-receber", modulo: "Contas a Receber", titulo: "Contas a receber",
    rota: "/contas-receber",
    descricao: "O espelho do Contas a Pagar: o que a loja tem pra receber. Nasce sozinha quando uma OS é faturada como 'a receber depois', e também pode ser lançada à mão pra cobrança que não passou por ordem nenhuma." },
  { arquivo: "34-conta-receber-form", modulo: "Contas a Receber", titulo: "Nova conta a receber",
    rota: "/contas-receber", passos: [{ clicar: "+ Nova conta" }],
    descricao: "Cliente, descrição, valor e previsão de recebimento." },
  { arquivo: "35-receber-conta", modulo: "Contas a Receber", titulo: "Marcar como recebido",
    rota: "/contas-receber", passos: [{ clicar: "Marcar como recebido" }],
    descricao: "Ao confirmar o recebimento, a entrada é lançada no caixa daquele dia — é o que evita cobrar duas vezes ou esquecer de dar baixa." },

  // ---------------------------------------------------------------- relações
  { arquivo: "36-graficos", modulo: "Relações", titulo: "Gráficos de vendas, custos e lucro",
    rota: "/relatorios",
    descricao: "Vendas, custos e lucro por dia, semana, mês ou ano, mais um gráfico comparando o período atual com o anterior. Os gráficos são desenhados pelo próprio sistema, sem depender de biblioteca de fora." },
  { arquivo: "37-lucratividade", modulo: "Relações", titulo: "Lucratividade por item",
    rota: "/relatorios", passos: [{ aba: "Lucratividade" }],
    descricao: "Quanto cada peça e cada serviço deu de margem no período. É o que mostra o que vende muito mas dá pouco lucro." },

  // --------------------------------------------------------------- garantias
  { arquivo: "38-garantias", modulo: "Garantias", titulo: "Garantias em vigor",
    rota: "/garantias",
    descricao: "Toda peça vendida com prazo de garantia aparece aqui, com o cliente, a placa e a data em que a garantia vence. Não é um cadastro à parte: sai da própria ordem de serviço, então nunca fica desatualizado." },

  // ----------------------------------------------------------- notas fiscais
  { arquivo: "39-notas-nfe", modulo: "Notas Fiscais", titulo: "Notas de produto (NFC-e)",
    rota: "/notas-fiscais",
    descricao: "O arquivo de todas as notas de venda de peça, separadas por mês. As emitidas pelo próprio sistema entram aqui sozinhas; as antigas podem ser enviadas à mão. O botão do mês baixa todos os XMLs de uma vez, no formato que a contabilidade pede." },
  { arquivo: "40-notas-nfse", modulo: "Notas Fiscais", titulo: "Notas de serviço (NFS-e)",
    rota: "/notas-fiscais", passos: [{ aba: "NFS-e" }],
    descricao: "O mesmo arquivo, para as notas de serviço emitidas na prefeitura. 'Versão para o cliente' monta um recibo legível a partir do XML, e 'Cancelar nota' cancela de verdade na prefeitura, com justificativa." },
  { arquivo: "41-enviar-xml", modulo: "Notas Fiscais", titulo: "Enviar XML manualmente",
    rota: "/notas-fiscais", passos: [{ clicar: "+ Enviar XML" }],
    descricao: "Para notas emitidas fora do sistema (pela contabilidade, por exemplo), guardando tudo no mesmo lugar — a lei exige manter o XML por cinco anos." },
  { arquivo: "42-cancelar-nota", modulo: "Notas Fiscais", titulo: "Cancelar uma nota emitida",
    // "Cancelar nota" deixou de ser um link solto na linha e passou a viver
    // dentro do menu de três pontinhos (item TR-02.1) — por isso os 2 passos.
    rota: "/notas-fiscais",
    passos: [{ seletor: 'button[aria-haspopup="menu"]' }, { clicar: "Cancelar nota" }],
    descricao: "Cancela na SEFAZ ou na prefeitura uma nota que o sistema emitiu. Exige uma justificativa de no mínimo 15 caracteres, que é o que o órgão pede." },

  // ------------------------------------------------------------ funcionários
  { arquivo: "43-funcionarios", modulo: "Funcionários", titulo: "Lista de funcionários",
    rota: "/funcionarios",
    descricao: "Quem trabalha na loja. Serve pra escolher o vendedor da ordem e o técnico de cada item — inclusive quem não usa o sistema. Todo operador criado nas Configurações ganha uma ficha aqui automaticamente." },
  { arquivo: "44-funcionario-form", modulo: "Funcionários", titulo: "Ficha do funcionário",
    rota: "/funcionarios", passos: [{ clicar: "+ Novo funcionário" }],
    descricao: "Ficha de RH completa: documentos, endereço, cargo, admissão, salário e a porcentagem de comissão que alimenta o cálculo de comissões. Dados de saúde ficaram de fora de propósito, por serem informação sensível." },
  { arquivo: "45-funcionario-familia", modulo: "Funcionários", titulo: "Ficha do funcionário — Família",
    rota: "/funcionarios", passos: [{ clicar: "+ Novo funcionário" }, { clicar: "Família" }],
    descricao: "A segunda aba da ficha: filiação, naturalidade, cônjuge e a lista de filhos — o que costuma ser exigido em documento de admissão." },
  { arquivo: "46-comissoes", modulo: "Funcionários", titulo: "Comissões",
    rota: "/funcionarios", passos: [{ aba: "Comissões" }],
    descricao: "Quanto cada um vendeu, quanto de lucro gerou e quanto tem de comissão a receber, separando quem vendeu de quem executou. A tela avisa quando o número merece desconfiança — peça sem custo cadastrado, OS ainda não recebida, funcionário sem porcentagem." },

  // ---------------------------------------------------------- configurações
  { arquivo: "47-configuracoes", modulo: "Configurações", titulo: "Operadores e lojas",
    rota: "/configuracoes",
    descricao: "Só o administrador entra aqui. Cria os operadores e marca no detalhe a que módulo cada um tem acesso, redefine senha esquecida e cadastra as lojas da empresa — é o que permite uma empresa com mais de uma loja usar o mesmo sistema." },
  { arquivo: "48-operador-form", modulo: "Configurações", titulo: "Cadastro de operador",
    rota: "/configuracoes", passos: [{ clicar: "+ Novo operador" }],
    descricao: "Usuário, senha e as permissões marcadas uma a uma. Quem tem acesso a mais de uma loja também escolhe aqui quais." },
  { arquivo: "49-config-fiscal", modulo: "Configurações", titulo: "Dados fiscais da loja",
    rota: "/configuracoes", passos: [{ secao: "Dados fiscais da loja" }, { rolar: 900 }],
    descricao: "CNPJ, regime tributário, inscrições e o token do serviço de emissão de nota. É o que o sistema usa pra emitir NFC-e e NFS-e, e também o cabeçalho do documento de garantia." },
  { arquivo: "50-config-juros", modulo: "Configurações", titulo: "Juros de parcelamento",
    rota: "/configuracoes", passos: [{ secao: "Juros de parcelamento" }, { rolar: 500 }],
    descricao: "O percentual cobrado em cada número de parcelas no cartão. É o que o faturamento da OS usa pra calcular o valor da parcela na frente do cliente." },
  { arquivo: "51-config-categorias", modulo: "Configurações", titulo: "Categorias e depósitos",
    rota: "/configuracoes", passos: [{ secao: "Depósitos" }, { secao: "Categorias de produto" }, { rolar: 700 }],
    descricao: "Depósitos são os lugares físicos onde a peça fica guardada dentro da loja. As categorias organizam produtos, serviços e lançamentos de caixa — e são o que deixa os relatórios agrupados de um jeito que faz sentido pra loja." },
  { arquivo: "52-config-garantia", modulo: "Configurações", titulo: "Texto de garantia",
    rota: "/configuracoes", passos: [{ secao: "Texto de garantia" }, { rolar: 800 }],
    descricao: "O texto que sai no documento de garantia entregue ao cliente. Os trechos entre chaves são trocados na hora pelos dados reais da ordem." },
  { arquivo: "55-config-computadores", modulo: "Configurações", titulo: "Computadores desta empresa",
    rota: "/configuracoes", passos: [{ secao: "Computadores desta empresa" }, { rolar: 1400 }],
    descricao: "Em que versão está cada computador que abre o sistema, e quando foi usado pela última vez. Cada um aparece sozinho no primeiro login; o administrador só dá um apelido e esquece o que não existe mais. É o que mostra quem ficou pra trás numa atualização." },

  // -------------------------------------------------------------- auditoria
  { arquivo: "53-auditoria", modulo: "Auditoria", titulo: "Trilha de auditoria",
    rota: "/auditoria",
    descricao: "Só o administrador vê. Registra quem alterou ou apagou o quê e quando, nas tabelas que mexem com dinheiro e cadastro. É gravado pelo próprio banco de dados, não pelo programa — então pega qualquer alteração, mesmo feita por fora do sistema." },
  { arquivo: "54-auditoria-detalhe", modulo: "Auditoria", titulo: "Detalhe de uma alteração",
    rota: "/auditoria", passos: [{ clicar: "Ver detalhes" }],
    descricao: "Mostra o registro inteiro antes e depois da alteração, campo a campo — o que responde 'quem mudou esse preço?' sem depender da memória de ninguém." },
];
