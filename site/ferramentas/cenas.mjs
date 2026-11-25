// Todas as telas do sistema, com os cliques necessários pra chegar até cada uma.
// (Sem o número: "54 telas" ficou velho a cada tela nova.)
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
    deslogado: true, rota: "/", passos: [{ clicar: "Configurar a conexão" }],
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
  // A caixinha não é botão nem link, então vai por seletor (#684).
  { arquivo: "05c-clientes-sumidos", modulo: "Clientes", titulo: "Clientes que sumiram",
    rota: "/clientes",
    passos: [{ seletor: 'label:has-text("Só os clientes que sumiram") input[type="checkbox"]' }],
    descricao: "Quem não volta há mais de 6 meses (o número de meses dá pra mudar), começando por quem mais gastou: a última visita, o que fez naquela vez e quanto já gastou na loja. O botão do WhatsApp abre a conversa com a mensagem pronta pra chamar o cliente de volta. Conta só OS e vendas de balcão faturadas, de todas as lojas que a pessoa acessa." },
  { arquivo: "05d-clientes-retornos", modulo: "Clientes", titulo: "Retornos: quem deve voltar",
    rota: "/clientes",
    passos: [{ seletor: 'label:has-text("Retornos: quem deve voltar") input[type="checkbox"]' }],
    descricao: "Quem já deveria ter voltado (atrasados) e quem deve voltar nesta semana, calculado a partir do intervalo cadastrado em cada serviço (em dias ou em km) e da última OS faturada do carro. A data é uma previsão; quando vem do KM, diz 'estimado pelo KM'. O botão do WhatsApp abre a conversa com a mensagem pronta e a tela mostra quando o aviso foi aberto pela última vez. Quem está marcado como 'não mandar lembrete' não aparece." },
  { arquivo: "06-cliente-form", modulo: "Clientes", titulo: "Cadastro de cliente e veículos",
    rota: "/clientes", passos: [{ clicar: "+ Novo cliente" }],
    descricao: "Cadastro de pessoa física ou jurídica (os rótulos mudam sozinhos entre CPF/CNPJ e nome/razão social), endereço preenchido pelo CEP a caixinha 'Não mandar lembrete pra este cliente' e a lista de veículos do cliente — cada um com placa, marca, modelo, cor e tipo, que é o que desenha o ícone do carro na tela de início." },

  // Planilha inventada: uma linha sem nome (problema) e uma placa que já está no cadastro de mentira.
  { arquivo: "06c-clientes-importar", modulo: "Clientes", titulo: "Importar clientes de uma planilha",
    rota: "/clientes",
    passos: [
      { clicar: "Importar planilha" },
      { enviarArquivo: { em: 'input[type="file"]', nome: "clientes-exemplo.csv",
        conteudo: "Nome;CPF;Telefone;Placa;Modelo\nAna Exemplo;529.982.247-25;(16) 99999-0001;QWE1R23;Gol\n;111.444.777-35;;ZXC4V56;Uno\nBia Teste;;(16) 99999-0002;ASD7F89;Palio\n" } },
      { clicar: "Continuar" },
    ],
    descricao: "Só o administrador vê o botão 'Importar planilha'. Escolhe-se um arquivo .csv, diz-se o que é cada coluna e revisa-se linha por linha antes de gravar: quem já existe só é pulado, linha com problema aparece com o motivo e dá pra corrigir na própria tabela. Nada entra antes do Confirmar, e a importação pode ser desfeita depois." },
  { arquivo: "06b-ficha-veiculo", modulo: "Clientes", titulo: "Ficha do veículo",
    rota: "/veiculos/v1",
    descricao: "Tudo que já foi feito num carro, por placa: dono atual, KM mais recente e quanto ele costuma rodar por mês, quanto já foi gasto nele, de quanto em quanto tempo ele volta, as peças que ainda estão na garantia e a linha do tempo de todas as OS, com data, KM, itens e total. Abre pelo 'Ver veículos' em Clientes, ou clicando na placa na lista de OS ou em Garantias." },

  { arquivo: "06c-ficha-cliente", modulo: "Clientes", titulo: "Ficha do cliente",
    rota: "/clientes/c4",
    descricao: "O dinheiro de um cliente numa tela só: quanto ele deve (com o atrasado em destaque), quanto já comprou e quantas vezes veio, as contas pendentes, as OS e vendas dele e como pagou cada uma. Abre pelo nome do cliente em Clientes, na OS, em Contas a Receber e na ficha do veículo. Quem não tem o módulo de uma parte vê \"—\" e o porquê, nunca R$ 0,00." },

  // -------------------------------------------------------- ordens de serviço
  { arquivo: "07-ordens", modulo: "Ordens de Serviço", titulo: "Lista de ordens de serviço",
    rota: "/ordens-servico",
    // A lista inteira cabe em 1024 com o menu aberto (a janela mais estreita
    // que o Electron deixa), sem rolar de lado: a #425 pedia 1366, e a #1091
    // desceu pra 1024 com o molde de lista. Conferido pelo `npm run largura:telas`.
    semRolarAPartirDe: 1024,
    descricao: "O coração do sistema. Cada OS tem número sequencial por loja e passa por três etapas: em andamento, concluída e faturada — mais o estado 'finalizada', que o sistema deduz sozinho quando todas as notas fiscais daquela OS já saíram. A lista mostra total e lucro de cada ordem (e, em tela larga, quanto foi de peças e de serviços)." },

  // Os estados do molde de lista e dos chips (#1085, parte 5/5 #1136), na
  // primeira tela que usa o molde. O estado de erro e o esqueleto do
  // "carregando" não têm cena: o banco de mentira não sabe falhar nem
  // demorar só numa cena; eles estão provados nos testes do MoldeLista.
  { arquivo: "07a-ordens-busca-sem-nada", modulo: "Ordens de Serviço", titulo: "Lista de OS: a busca que não achou nada",
    rota: "/ordens-servico", semRolarAPartirDe: 1024,
    passos: [{ digitar: "Placa que não existe", em: 'input[type="search"]' }],
    descricao: "O vazio de uma busca é diferente do vazio de uma loja nova: a lista diz o que foi buscado e oferece limpar a busca, em vez de \"nenhuma OS cadastrada\" (que assusta quem tem centenas). Os chips do período ficam apagados enquanto a busca vale, porque a busca olha o histórico inteiro." },
  { arquivo: "07b-ordens-escolher-datas", modulo: "Ordens de Serviço", titulo: "Lista de OS: escolher o período",
    rota: "/ordens-servico", semRolarAPartirDe: 1024, passos: [{ clicar: "Escolher datas" }],
    descricao: "Os chips do período: um só escolhido por vez, marcado também pelo visto (✓) e pela palavra em negrito, não só pela cor. \"Escolher datas\" abre os dois campos de data ao lado, sem janela." },
  { arquivo: "07c-ordens-loja-nova", modulo: "Ordens de Serviço", titulo: "Lista de OS de uma loja que ainda não atendeu ninguém",
    rota: "/ordens-servico", semRolarAPartirDe: 1024,
    // Só as OS saem (orçamento e recusado ficam, como numa loja que só orçou).
    tirarLinhas: { ordens_servico: (o) => !["orcamento", "recusado"].includes(o.status) },
    descricao: "O vazio de começo: uma frase do que vai aparecer ali e o botão pra começar (\"Nova OS\"), sem busca nem filtro, que não teriam o que procurar." },
  { arquivo: "08-os-form", modulo: "Ordens de Serviço", titulo: "Abertura de ordem de serviço",
    rota: "/ordens-servico", passos: [{ clicar: "Nova ordem de serviço" }],
    // Desde a #1087 a OS abre numa página só dela (a lista sai da tela e volta
    // no mesmo lugar pelo "Voltar"), com uma busca só pra peça e serviço.
    semRolarAPartirDe: 1024,
    descricao: "Escolhe cliente e veículo, quilometragem de entrada e vendedor, e lança os itens por uma busca só: o mesmo campo acha peça e serviço (pelo nome, código, medida, ou passando o leitor de código de barras). A OS abre numa página só dela; o 'Voltar' devolve a lista no mesmo lugar. Peça lançada aqui já dá baixa no estoque sozinha." },
  { arquivo: "08b-os-itens", modulo: "Ordens de Serviço", titulo: "Itens da OS: busca única e tabela",
    rota: "/ordens-servico",
    passos: [
      { clicar: "Nova ordem de serviço" },
      { digitar: "7891234567890", em: 'input[aria-label="Buscar peça ou serviço"]', enter: true },
      { digitar: "7891234567890", em: 'input[aria-label="Buscar peça ou serviço"]', enter: true },
      { digitar: "SV-ALIN", em: 'input[aria-label="Buscar peça ou serviço"]', enter: true },
      { digitar: "pneu", em: 'input[aria-label="Buscar peça ou serviço"]' },
    ],
    semRolarAPartirDe: 1024,
    descricao: "Os itens numa tabela só: peça e serviço com o mesmo tipo de linha, quantidade, preço, desconto e técnico editáveis na própria linha, e o resto (trocar a peça, descrição, custo) ao abrir o item. O 'Técnico pra todos' vale pros itens novos. Passar o leitor duas vezes no mesmo pneu põe 2 unidades. Embaixo, o total grande e, de apoio, peças, serviços e o lucro previsto (verde com ▲, ou vermelho com ▼ se der prejuízo)." },
  { arquivo: "08c-os-aberta", modulo: "Ordens de Serviço", titulo: "Uma OS em andamento aberta",
    rota: "/ordens-servico",
    passos: [
      { seletor: 'li:has-text("Em andamento") button[aria-label^="Mais ações"]' },
      { clicar: "Abrir a OS" },
    ],
    semRolarAPartirDe: 1024,
    descricao: "A OS já gravada, na página dela: os itens lançados aparecem na mesma tabela (cada um com 'Editar', que salva na hora), a busca fica pronta pra pôr mais, e o rodapé mostra o total e o lucro previsto calculado pelo banco." },
  { arquivo: "09-os-faturamento", modulo: "Ordens de Serviço", titulo: "Faturamento da ordem",
    rota: "/ordens-servico", passos: [{ clicar: "Faturar" }],
    descricao: "Fecha a conta com o cliente. Dá pra dividir o pagamento em mais de uma forma (metade Pix, metade cartão), parcelar só a parte do cartão com os juros configurados, e escolher entre receber na hora — que lança a entrada no caixa — ou deixar como conta a receber." },
  { arquivo: "10-os-fechamento", modulo: "Ordens de Serviço", titulo: "Fechamento: notas fiscais e garantia",
    // Desde a tarefa 7 do visual novo, "Fechamento" mora no "Mais ações" da
    // linha (o primeiro que tem é o de uma OS concluída ou faturada). Desde a
    // #1091 a lista é o molde de lista: cada OS é um <li>, não mais um <tr>.
    rota: "/ordens-servico",
    passos: [
      { seletor: 'li:has-text("Concluída") button[aria-label^="Mais ações"]' },
      { clicar: "Fechamento" },
    ],
    descricao: "Aqui saem os documentos da OS. O sistema sabe de que nota aquela ordem precisa — NFC-e se tem peça, NFS-e se tem serviço, as duas se tem os dois — e mostra só o botão que faz sentido. A emissão é automática, via Focus NFe, e o PDF aparece na própria tela. O botão de garantia gera o documento pro cliente assinar." },

  // A recusa da SEFAZ por causa do CNPJ do cliente (#1112). O banco de mentira
  // responde a Focus NFe com a recusa só nesta cena (`funcoesDaCena`) e a OS 145,
  // de uma empresa (pessoa jurídica), com peça, perde a NFC-e (`tirarLinhas`).
  { arquivo: "10c-nfce-recusada-cnpj", modulo: "Ordens de Serviço", titulo: "Emitir NFC-e: SEFAZ não reconhece o CNPJ do cliente",
    rota: "/ordens-servico",
    // A OS 145 já tem as notas dela no catálogo; aqui ela volta a ficar sem NFC-e.
    tirarLinhas: { notas_fiscais_arquivos: (n) => n.ordem_servico_id === "os145" && n.tipo === "nfe" },
    // O cliente ganha um CNPJ de exemplo válido (o do cadastro de mentira tem o dígito errado).
    alterarLinhas: { clientes: { c2: { cpf_cnpj: "11.222.333/0001-81" } } },
    funcoesDaCena: {
      "focus-nfe": (corpo) => corpo?.acao === "consultar"
        ? { json: { ok: true, status: 200, dados: {
            status: "erro_autorizacao", status_sefaz: "999", ref: corpo?.ref ?? "os145-nfce-1",
            mensagem_sefaz: "Rejeição: CNPJ 11222333000181 do destinatário não cadastrado na Receita Federal",
          } } }
        : { json: { ok: true, status: 202, dados: { status: "processando_autorizacao" } } },
    },
    passos: [
      { seletor: 'li:has-text("OS 145") button:has-text("Emitir nota")' },
      { clicar: "Emitir NFC-e" },
      { clicar: "Confirmar emissão" },
    ],
    descricao: "Quando a SEFAZ recusa a nota porque ainda não reconhece o CNPJ do cliente, a janela explica em português simples o que aconteceu e mostra a mensagem da SEFAZ, com 'Copiar o erro'. Em vez de repetir a mesma recusa, oferece emitir a nota sem identificar o cliente, num botão laranja que avisa o que muda." },

  // ------------------------------------------------ venda de balcão (FN-09)
  { arquivo: "10b-venda-balcao", modulo: "Ordens de Serviço", titulo: "Venda de balcão",
    rota: "/ordens-servico",
    passos: [
      { clicar: "Venda de balcão" },
      { digitar: "7891234567894", em: 'input[aria-label="Buscar peça"]', enter: true },
      { digitar: "pneu", em: 'input[aria-label="Buscar peça"]' },
    ],
    descricao: "Vender uma peça pra quem não vai deixar o carro, numa tela só: passa o leitor de código de barras (ou procura pelo nome ou pela medida), confere quantidade e preço, e segue pro pagamento. Quem não se identifica compra como 'Consumidor'; quem pede CPF na nota é escolhido ou cadastrado ali mesmo. Baixa o estoque, lança no caixa e abre a NFC-e — tudo o que a OS já fazia." },
  { arquivo: "10c-venda-pagamento", modulo: "Ordens de Serviço", titulo: "Pagamento da venda de balcão",
    rota: "/ordens-servico",
    passos: [
      { clicar: "Venda de balcão" },
      { digitar: "7891234567894", em: 'input[aria-label="Buscar peça"]', enter: true },
      { clicar: "Ir para o pagamento" },
    ],
    descricao: "O mesmo pagamento da OS — dividir em formas, parcelar o cartão com os juros da loja. Venda no Consumidor é sempre recebida na hora: pra deixar a receber, é preciso saber de quem cobrar." },
  { arquivo: "10d-vendas-lista", modulo: "Ordens de Serviço", titulo: "Vendas de balcão na lista",
    rota: "/ordens-servico", passos: [{ seletor: 'button[role="tab"]:has-text("Vendas de balcão")' }],
    descricao: "As vendas de balcão ficam numa aba própria, separadas das ordens de serviço — e fora do ticket médio, que responde quanto rende cada carro atendido. O número é o mesmo contador das OS, então 'Venda 149' e 'OS 148' nunca se repetem." },
  { arquivo: "10e-venda-detalhe", modulo: "Ordens de Serviço", titulo: "Uma venda de balcão já registrada",
    rota: "/ordens-servico",
    passos: [
      { seletor: 'button[role="tab"]:has-text("Vendas de balcão")' },
      { seletor: 'button[aria-label^="Mais ações"]' },
      { clicar: "Fechamento" },
    ],
    descricao: "Aberta pela lista, a venda mostra o que sobra pra fazer depois de registrada: emitir (ou reemitir) a NFC-e, ver o DANFE e imprimir a garantia da peça. As peças de uma venda não mudam depois de registrada." },

  // --------------------------------------------------------- orçamentos (#379)
  { arquivo: "10f-orcamentos", modulo: "Ordens de Serviço", titulo: "Lista de orçamentos",
    rota: "/orcamentos",
    // Cabe em 1024 sem rolar de lado, como a lista de OS (#1091).
    semRolarAPartirDe: 1024,
    descricao: "Os orçamentos que esperam resposta do cliente, com número próprio, total e até quando valem. Passou da validade ganha a etiqueta 'vencido' (ainda dá pra aprovar). Os recusados ficam numa aba à parte. Um orçamento não é venda: não baixa estoque nem entra em número nenhum até ser aprovado." },
  { arquivo: "10g-orcamento-form", modulo: "Ordens de Serviço", titulo: "Novo orçamento",
    rota: "/orcamentos", passos: [{ clicar: "Novo orçamento" }],
    descricao: "O mesmo formulário da ordem de serviço, com a validade (7 dias, se ninguém mudar) e sem baixa de estoque." },
  { arquivo: "10h-orcamento-aprovar", modulo: "Ordens de Serviço", titulo: "Aprovar um orçamento vencido",
    rota: "/orcamentos",
    // O "Aprovar" é a ação da linha (#1091): abre o orçamento já com a janela.
    passos: [{ seletor: 'button[aria-label="Aprovar — Orçamento 2"]' }],
    descricao: "Aprovar abre uma janela que pede só quem aprovou (por exemplo, 'pelo telefone'). Se o orçamento passou da validade, avisa que o preço pode ter mudado, mas deixa aprovar. Ao aprovar, vira OS em andamento e as peças saem do estoque." },
  { arquivo: "10i-orcamento-recusar", modulo: "Ordens de Serviço", titulo: "Recusar um orçamento",
    // "Recusar" mora no fim do "Mais ações" da linha, longe do "Aprovar" (#1091).
    rota: "/orcamentos",
    passos: [{ seletor: 'button[aria-label="Mais ações — Orçamento 2"]' }, { clicar: "Recusar" }],
    descricao: "Recusar fica longe do Aprovar, no fim do menu de três pontos, e abre a sua própria janela: só ali aparece o motivo (opcional, um clique). O orçamento recusado vai pra aba Recusados e fica como histórico." },

  // ----------------------------------------------------------------- estoque
  // Os dados de mentira não têm peça abaixo do mínimo: a cena sobe o mínimo de
  // duas, pra foto mostrar o "falta" com o "Comprar" e o "perto" (#1093).
  { arquivo: "11-estoque-produtos", modulo: "Estoque", titulo: "Produtos",
    rota: "/estoque", alterarLinhas: { pecas: { p1: { estoque_minimo: 20 }, p4: { estoque_minimo: 6 } } },
    descricao: "O catálogo de peças no molde de lista: em cima, quantas peças estão no mínimo ou abaixo dele; em cada linha, a barra do estoque contra o mínimo (vermelho quando falta, amarelo perto, verde ok, sempre com o número e a palavra), a última saída e, quando falta, o botão 'Comprar', que leva à Sugestão de compra. Busca (que também aceita o leitor de código de barras) e filtros em botões. Compartilhado entre as lojas da mesma empresa — o saldo é que fica separado por loja." },
  { arquivo: "11b-estoque-perfil-peca", modulo: "Estoque", titulo: "Perfil da peça",
    rota: "/estoque", alterarLinhas: { pecas: { p1: { estoque_minimo: 20 } } },
    passos: [{ seletor: 'ul[aria-label="Produtos"] li button:has-text("Pneu 175/70 R14")' }],
    descricao: "Clicar no nome de uma peça abre o perfil dela: o saldo grande contra o mínimo, o preço e a última saída de apoio, as movimentações da peça (entrada com '+', saída com '−') e onde ela foi usada (as OS e vendas). Quando falta, o botão principal é 'Comprar'." },
  { arquivo: "12-produto-form", modulo: "Estoque", titulo: "Cadastro de produto",
    rota: "/estoque", passos: [{ clicar: "Novo produto" }],
    descricao: "Além dos dados comuns, guarda tudo que a nota fiscal exige (NCM, CFOP, CSOSN, alíquota de ICMS, origem) e o prazo de garantia da peça, que é o que alimenta o módulo de Garantias. Custo, margem e preço final se calculam entre si nos dois sentidos." },
  // "13-importar-foto" saiu da lista junto com o botão "Importar por foto/PDF",
  // desligado a pedido dela em 25/09/2026 (IMPORTAR_POR_FOTO_LIGADO em
  // src/pages/estoque/ProdutosSection.tsx). Religando o botão, a cena volta:
  // { arquivo: "13-importar-foto", modulo: "Estoque", titulo: "Importar produtos por foto ou PDF",
  //   rota: "/estoque", passos: [{ clicar: "Importar por foto/PDF" }],
  //   descricao: "Lê a nota fiscal do fornecedor por foto ou PDF usando inteligência artificial e devolve os produtos já separados numa tabela editável, pra cadastrar em lote em vez de digitar um por um. A chave da IA fica guardada no servidor, nunca dentro do programa instalado." },
  { arquivo: "14-movimentacoes", modulo: "Estoque", titulo: "Movimentações",
    rota: "/estoque", passos: [{ clicar: "Movimentações" }],
    descricao: "O extrato de tudo que entrou e saiu do estoque, com o motivo (compra, venda, uso em OS, ajuste) e a referência de onde veio, filtrável por Tudo / Entradas / Saídas, por período e por produto. É aqui que se descobre a origem de um saldo estranho." },
  { arquivo: "15-movimento-form", modulo: "Estoque", titulo: "Registrar movimentação manual",
    rota: "/estoque", passos: [{ clicar: "Movimentações" }, { clicar: "Registrar movimentação" }],
    descricao: "Entrada ou saída lançada à mão, quando não veio de uma compra nem de uma OS — perda, devolução, transferência entre depósitos." },
  { arquivo: "16-contagem", modulo: "Estoque", titulo: "Contagem de estoque (inventário)",
    rota: "/estoque", passos: [{ clicar: "Contagem" }],
    descricao: "Inventário físico por depósito: digita-se quanto foi contado de verdade, o sistema mostra quanto deveria ter e, havendo diferença, gera o ajuste no estoque sozinho." },
  { arquivo: "17-estoque-relatorios", modulo: "Estoque", titulo: "Relatórios de estoque",
    rota: "/estoque", passos: [{ clicar: "Relatórios" }],
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
    descricao: "A lista de mão de obra que a loja vende (alinhamento, troca de óleo, montagem), com busca pelo nome ou código e filtro Todos / Ativos / Inativos. Cada linha mostra o preço padrão; o custo, que permite calcular o lucro de verdade nos relatórios, fica no cadastro." },
  // Sem nenhum serviço: a frase e o botão pra começar (o estado vazio do molde, #1093).
  { arquivo: "24b-servicos-vazio", modulo: "Serviços", titulo: "Catálogo de serviços vazio",
    rota: "/servicos", tirarLinhas: { servicos: () => true },
    descricao: "Loja que ainda não cadastrou nenhum serviço: a lista diz isso numa frase e oferece o botão pra cadastrar o primeiro." },
  { arquivo: "25-servico-form", modulo: "Serviços", titulo: "Cadastro de serviço",
    rota: "/servicos", passos: [{ clicar: "Novo serviço" }],
    descricao: "Abre numa janela por cima da lista. Descrição, código, categoria, preço padrão e custo, e de quanto em quanto tempo o cliente deve voltar (em dias ou em km; vazio = não gera lembrete). O preço padrão é só uma sugestão: na ordem de serviço dá pra mudar item a item." },

  // ------------------------------------------------------------------- caixa
  { arquivo: "26-caixa-diario", modulo: "Caixa Diário", titulo: "Caixa do dia",
    rota: "/caixa",
    descricao: "Uma página só: o saldo do dia em destaque (com o de ontem pra comparar) e o botão de fechar o caixa, logo abaixo o dinheiro na gaveta, o Pix e cartão e o lucro do dia, e a lista dos lançamentos do dia escolhido. Do lado: as formas de pagamento do dia, as saídas do mês e os últimos fechamentos." },
  { arquivo: "27-caixa-form", modulo: "Caixa Diário", titulo: "Lançamento manual no caixa",
    rota: "/caixa", passos: [{ clicar: "Novo lançamento" }],
    descricao: "Dinheiro que entrou ou saiu sem passar por uma ordem de serviço — venda de sucata, pagamento de fornecedor, troco. Na ordem do balcão: entrada ou saída, o valor, a forma de pagamento escolhida na lista e a categoria, que é o que faz esses valores aparecerem organizados nos relatórios." },
  { arquivo: "28-caixa-entradas", modulo: "Caixa Diário", titulo: "Entradas",
    rota: "/caixa", passos: [{ clicar: "Entradas" }],
    descricao: "O filtro Entradas da lista do dia: só o dinheiro que entrou no dia escolhido, com o total embaixo." },
  { arquivo: "29-caixa-saidas", modulo: "Caixa Diário", titulo: "Saídas",
    rota: "/caixa", passos: [{ clicar: "Saídas" }],
    descricao: "O filtro Saídas da lista do dia: as despesas do dia escolhido. É o outro lado do Contas a Pagar: aqui fica o que já saiu, lá fica o que ainda vai vencer." },
  { arquivo: "29c-caixa-cartao-a-receber", modulo: "Caixa Diário", titulo: "Cartão a receber",
    rota: "/caixa", passos: [{ clicar: "Cartão a receber" }],
    descricao: "O que as maquininhas ainda vão depositar, dia a dia e já sem a taxa, numa janela aberta pelo botão do lado da página. É só uma previsão pra saber quando o dinheiro do cartão chega: não vira conta a receber nem lançamento no Caixa." },
  { arquivo: "29b-caixa-fechamento", modulo: "Caixa Diário", titulo: "Fechamento do caixa",
    rota: "/caixa", passos: [{ clicar: "Fechar o caixa de hoje" }],
    descricao: "No fim do dia, conta-se o dinheiro da gaveta e o sistema compara com o que ele esperava. Se faltou ou sobrou, a diferença vira um lançamento de verdade (Quebra ou Sobra de caixa) — ela nunca some. Pix e cartão aparecem à parte, pra conferir com o extrato. Abre numa janela pelo botão laranja do saldo do dia." },

  // ---------------------------------------------------------- contas a pagar
  { arquivo: "30-contas-pagar", modulo: "Contas a Pagar", titulo: "Contas a pagar",
    rota: "/contas-pagar",
    descricao: "O que a loja ainda deve, com vencimento. As vencidas aparecem destacadas e também no calendário do início. Conta marcada como mensal se recria sozinha depois de paga." },
  { arquivo: "31-conta-pagar-form", modulo: "Contas a Pagar", titulo: "Nova conta a pagar",
    rota: "/contas-pagar", passos: [{ clicar: "Nova conta" }],
    descricao: "Descrição, valor, vencimento e categoria. Marcando 'conta mensal', dá pra dizer até quando ela se repete — em branco, repete pra sempre." },
  { arquivo: "32-pagar-conta", modulo: "Contas a Pagar", titulo: "Marcar conta como paga",
    rota: "/contas-pagar", passos: [{ clicar: "Marcar como paga" }],
    descricao: "Confirma a data e a forma de pagamento. O sistema lança a saída no caixa sozinho e, se a conta for mensal, já cria a ocorrência do mês seguinte. Dá pra desfazer se foi engano." },

  // -------------------------------------------------------- contas a receber
  { arquivo: "33-contas-receber", modulo: "Contas a Receber", titulo: "Contas a receber",
    rota: "/contas-receber",
    descricao: "O espelho do Contas a Pagar: o que a loja tem pra receber. Nasce sozinha quando uma OS é faturada como 'a receber depois', e também pode ser lançada à mão pra cobrança que não passou por ordem nenhuma." },
  { arquivo: "34-conta-receber-form", modulo: "Contas a Receber", titulo: "Nova conta a receber",
    rota: "/contas-receber", passos: [{ clicar: "Nova conta" }],
    descricao: "Cliente, descrição, valor e previsão de recebimento." },
  { arquivo: "35-receber-conta", modulo: "Contas a Receber", titulo: "Marcar como recebido",
    rota: "/contas-receber", passos: [{ clicar: "Marcar como recebido" }],
    descricao: "Ao confirmar o recebimento, a entrada é lançada no caixa daquele dia — é o que evita cobrar duas vezes ou esquecer de dar baixa." },

  // ---------------------------------------------------------------- relações
  { arquivo: "36-relacoes", modulo: "Relações", titulo: "Relações: o resumo e os gráficos do período",
    rota: "/relatorios",
    descricao: "Tudo numa página só, com um período lá em cima (hoje, esta semana, este mês, mês passado, este ano, ou as datas que quiser) e os botões Ir para. Em destaque, a Sobra das OS (o vendido menos o custo das peças e dos serviços), e ao lado Vendido, Recebido e Falta receber, cada um comparado com o mês anterior. Abaixo, o mês até hoje contra o anterior e o dia a dia lado a lado, e a ponte do vendido ao que sobrou (com as despesas). Cada gráfico tem como título a resposta, e o Ver como tabela mostra os mesmos números." },
  { arquivo: "37-por-item", modulo: "Relações", titulo: "O que me dá dinheiro",
    rota: "/relatorios", passos: [{ clicar: "Por item" }],
    descricao: "Ranking das peças e serviços pela Sobra das OS de cada um, do que mais dá pro que menos dá, com o de cada R$ 100, sobra e a média da loja. Item sem custo informado avisa e leva a cadastrar o custo. O Ver todos abre a tabela completa." },
  { arquivo: "37a-curva-abc", modulo: "Relações", titulo: "Curva ABC",
    rota: "/relatorios", passos: [{ clicar: "Curva ABC" }],
    descricao: "Peças, serviços e clientes em A, B e C pelo quanto rendem no período, por venda ou por lucro. O A são os poucos que fazem a maior parte: o que não pode faltar no estoque e os clientes mais importantes. Com menos de 10 itens, o título avisa que a curva ainda não diz muito." },
  { arquivo: "37b-proximos-dias", modulo: "Relações", titulo: "Próximos 30 dias",
    rota: "/relatorios", passos: [{ clicar: "Próximos 30 dias" }],
    descricao: "O que vai entrar (contas a receber) e sair (contas a pagar) nos próximos 7, 30, 60 ou 90 dias, com o saldo em degraus a partir de hoje: o título diz quanto falta cobrir e o dia mais apertado vem apontado. O Ver como tabela abre dia a dia, com as contas previstas e atrasadas." },

  // --------------------------------------------------------------- garantias
  { arquivo: "38-garantias", modulo: "Garantias", titulo: "Garantias em vigor",
    rota: "/garantias",
    descricao: "Toda peça vendida com prazo de garantia aparece aqui, com o cliente, a placa e a data em que a garantia vence. Não é um cadastro à parte: sai da própria ordem de serviço, então nunca fica desatualizado." },

  // ----------------------------------------------------------- notas fiscais
  { arquivo: "39-notas-nfe", modulo: "Notas Fiscais", titulo: "Notas de produto (NFC-e)",
    rota: "/notas-fiscais",
    descricao: "O arquivo de todas as notas de venda de peça, separadas por mês. As emitidas pelo próprio sistema entram aqui sozinhas; as antigas podem ser enviadas à mão. O botão do mês baixa todos os XMLs de uma vez, no formato que a contabilidade pede." },
  // Desde a tarefa 12 do visual novo (#990), a linha mostra "Nota do cliente"
  // (era "Ver DANFE") e "Versão para o cliente" mora no "Mais ações".
  { arquivo: "39b-nota-do-cliente", modulo: "Notas Fiscais", titulo: "A nota do cliente",
    rota: "/notas-fiscais", passos: [{ clicar: "Nota do cliente" }],
    descricao: "O PDF da nota que o sistema emitiu, pra ver, imprimir e mandar ao cliente quando ele volta pedindo. Cada botão de baixar diz o que baixa e pra quem: o PDF pro cliente, o XML pro contador." },
  { arquivo: "39c-versao-para-o-cliente", modulo: "Notas Fiscais", titulo: "Versão para o cliente (resumo do XML)",
    rota: "/notas-fiscais",
    passos: [
      { seletor: 'tr:has-text("Autorizada") button[aria-haspopup="menu"]' },
      { clicar: "Versão para o cliente (resumo do XML)" },
    ],
    descricao: "Um resumo legível que o programa monta a partir do XML. É o que existe pra nota feita fora do programa, que não tem PDF guardado." },
  { arquivo: "40-notas-nfse", modulo: "Notas Fiscais", titulo: "Notas de serviço (NFS-e)",
    rota: "/notas-fiscais", passos: [{ aba: "Notas dos serviços (NFS-e)" }],
    descricao: "O mesmo arquivo, para as notas de serviço emitidas na prefeitura. 'Nota do cliente' abre o PDF da nota, 'Versão para o cliente' monta um recibo legível a partir do XML, e 'Cancelar nota' cancela de verdade na prefeitura, com justificativa." },
  { arquivo: "41-enviar-xml", modulo: "Notas Fiscais", titulo: "Enviar XML manualmente",
    rota: "/notas-fiscais", passos: [{ clicar: "Enviar XML" }],
    descricao: "Para notas emitidas fora do sistema (pela contabilidade, por exemplo), guardando tudo no mesmo lugar — a lei exige manter o XML por cinco anos." },
  { arquivo: "42-cancelar-nota", modulo: "Notas Fiscais", titulo: "Cancelar uma nota emitida",
    // "Cancelar nota" deixou de ser um link solto na linha e passou a viver
    // dentro do menu de três pontinhos (item TR-02.1) — por isso os 2 passos.
    rota: "/notas-fiscais",
    // "Cancelar nota" só existe na nota autorizada que o programa emitiu.
    passos: [{ seletor: 'tr:has-text("Autorizada") button[aria-haspopup="menu"]' }, { clicar: "Cancelar nota" }],
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
  { arquivo: "50b-config-taxas-maquininha", modulo: "Configurações", titulo: "Taxas da maquininha",
    rota: "/configuracoes", passos: [{ secao: "Taxas da maquininha" }, { rolar: 500 }],
    descricao: "O que a maquininha cobra da loja em cada venda no cartão e em quantos dias o dinheiro cai. Linha em branco, o programa não calcula. Não muda o que o cliente paga nem o Caixa." },
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
