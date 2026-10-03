// Dados 100% inventados pra gerar as imagens do site.
// Nenhum cliente, placa ou CPF de verdade da loja do pai dela.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const LOJA = "10000000-0000-0000-0000-000000000001";
const OP = "20000000-0000-0000-0000-000000000001";
const OP2 = "20000000-0000-0000-0000-000000000002";
const OP3 = "20000000-0000-0000-0000-000000000003";

const hoje = new Date();
// `dia(-3)` é três dias atrás. Fração (`dia(-0.1)`) quer dizer "hoje, um pouco
// mais cedo": vai pra uma hora entre a meia-noite e agora, mais cedo quanto
// maior a fração. Antes ia pro `setDate`, que joga a fração fora e caía em
// ONTEM: no dia 1º do mês a venda de balcão de "hoje" ia pro mês passado,
// sumia da lista (que mostra o mês corrente) e a varredura de telas quebrava.
const dia = (n) => {
  const inteiro = Math.trunc(n);
  const fracao = n - inteiro; // de -1 a 0: as frações usadas aqui são todas pra trás
  const d = new Date(hoje);
  const meiaNoite = new Date(hoje);
  meiaNoite.setHours(0, 0, 0, 0);
  d.setTime(d.getTime() + (hoje.getTime() - meiaNoite.getTime()) * fracao);
  d.setDate(d.getDate() + inteiro);
  return d.toISOString();
};
const diaCurto = (n) => dia(n).slice(0, 10);

export const lojas = [
  { id: LOJA, nome: "Auto Center Modelo", cidade: "Araraquara", uf: "SP", ativo: true, criado_em: dia(-400) },
];

export const operador = {
  id: OP, usuario: "demo", nome: "Marcos Andrade", admin: true,
  permissoes: [], ativo: true, deve_trocar_senha: false, criado_em: dia(-400),
};

const veiculos = [
  { id: "v1", cliente_id: "c1", placa: "RTA-4B71", marca: "Volkswagen", modelo: "Gol 1.6", ano: 2019, cor: "prata", tipo: "hatch", km_atual: 84210 },
  { id: "v2", cliente_id: "c2", placa: "QNS-1D02", marca: "Fiat", modelo: "Strada Freedom", ano: 2021, cor: "branco", tipo: "picape", km_atual: 51430 },
  { id: "v3", cliente_id: "c3", placa: "PVE-8H55", marca: "Chevrolet", modelo: "Onix LTZ", ano: 2022, cor: "preto", tipo: "sedan", km_atual: 33980 },
  { id: "v4", cliente_id: "c4", placa: "SBK-3C19", marca: "Jeep", modelo: "Renegade", ano: 2020, cor: "vermelho", tipo: "suv", km_atual: 67200 },
  { id: "v5", cliente_id: "c5", placa: "MJU-9F44", marca: "Honda", modelo: "CG 160 Fan", ano: 2023, cor: "azul", tipo: "moto", km_atual: 12750 },
  // Carro cadastrado sem placa (o cadastro aceita): é o caso que a lista de
  // Clientes mostrava como uma caixinha vazia antes do "Ver veículos" (#417).
  { id: "v6", cliente_id: "c1", placa: "", marca: "Fiat", modelo: "Uno Mille", ano: 2009, cor: "branco", tipo: "hatch", km_atual: 182400 },
];

export const clientes = [
  { id: "c1", nome: "Ricardo Menezes", tipo_pessoa: "fisica", cpf_cnpj: "123.456.789-00", telefone: "(16) 99000-1122", email: "ricardo@exemplo.com.br", cep: "14800-000", rua: "Rua das Acácias", numero: "215", bairro: "Centro", cidade: "Araraquara", uf: "SP", data_nascimento: "1985-04-12", criado_em: dia(-300) },
  { id: "c2", nome: "Transportes Boa Vista Ltda", tipo_pessoa: "juridica", cpf_cnpj: "12.345.678/0001-90", telefone: "(16) 3333-4455", email: "contato@exemplo.com.br", cep: "14802-100", rua: "Av. Industrial", numero: "1400", bairro: "Distrito Industrial", cidade: "Araraquara", uf: "SP", data_nascimento: null, criado_em: dia(-250) },
  { id: "c3", nome: "Juliana Prado", tipo_pessoa: "fisica", cpf_cnpj: "987.654.321-00", telefone: "(16) 98111-2233", email: "juliana@exemplo.com.br", cep: "14801-300", rua: "Rua Sete de Setembro", numero: "88", bairro: "Vila Xavier", cidade: "Araraquara", uf: "SP", data_nascimento: "1992-09-03", criado_em: dia(-180) },
  { id: "c4", nome: "Eduardo Salles", tipo_pessoa: "fisica", cpf_cnpj: "456.789.123-00", telefone: "(16) 99777-8899", email: "eduardo@exemplo.com.br", cep: "14803-200", rua: "Rua Padre Duarte", numero: "742", bairro: "Jardim Nova", cidade: "Araraquara", uf: "SP", data_nascimento: "1978-12-21", criado_em: dia(-120) },
  { id: "c5", nome: "Camila Rocha", tipo_pessoa: "fisica", cpf_cnpj: "321.654.987-00", telefone: "(16) 98222-3344", email: "camila@exemplo.com.br", cep: "14805-000", rua: "Rua Gonçalves Dias", numero: "56", bairro: "Santa Angelina", cidade: "Araraquara", uf: "SP", data_nascimento: "1996-06-30", criado_em: dia(-60) },
  // O cliente fixo da venda de balcão (migration 0064). O app o deixa de
  // fora das listas com um filtro `neq` — que o banco-falso sabe aplicar.
  { id: "00000000-0000-0000-0000-00000000c000", nome: "Consumidor", tipo_pessoa: "fisica", cpf_cnpj: null, telefone: null, email: null, cep: null, rua: null, numero: null, bairro: null, cidade: null, uf: null, data_nascimento: null, criado_em: dia(-400) },
].map((c) => ({ ...c, veiculos: veiculos.filter((v) => v.cliente_id === c.id) }));

const vlk = (id) => veiculos.find((v) => v.id === id);
const item = (tipo, id, descricao, qtd, preco) => ({
  id: Math.random().toString(36).slice(2), tipo, descricao,
  quantidade: qtd, preco_unitario: preco, desconto: 0,
  peca_id: tipo === "peca" ? id : null, servico_id: tipo === "servico" ? id : null,
  tecnico_id: "f1", tecnico: { nome: "Anderson Lima" },
});

export const ordens = [
  { numero: 148, cliente: "c1", veiculo: "v1", status: "em_andamento", abertura: -0.2,
    itens: [item("peca", "p1", "Pneu 175/70 R14", 2, 389.9), item("servico", "s1", "Alinhamento e balanceamento", 1, 120)] },
  { numero: 147, cliente: "c4", veiculo: "v4", status: "em_andamento", abertura: -0.6,
    itens: [item("peca", "p3", "Amortecedor dianteiro", 2, 445), item("servico", "s3", "Troca de amortecedor", 1, 260)] },
  { numero: 146, cliente: "c3", veiculo: "v3", status: "concluida", abertura: -1,
    itens: [item("peca", "p4", "Pastilha de freio dianteira", 1, 189.5), item("servico", "s4", "Troca de pastilha de freio", 1, 90)] },
  { numero: 145, cliente: "c2", veiculo: "v2", status: "faturada", abertura: -0.30,
    itens: [item("peca", "p2", "Pneu 205/60 R16", 4, 612), item("servico", "s1", "Alinhamento e balanceamento", 1, 140)] },
  { numero: 144, cliente: "c5", veiculo: "v5", status: "faturada", abertura: -0.55,
    itens: [item("servico", "s2", "Troca de óleo e filtro", 1, 165)] },
  { numero: 143, cliente: "c1", veiculo: "v1", status: "faturada", abertura: -0.80,
    itens: [item("peca", "p5", "Bateria 60Ah", 1, 549), item("servico", "s5", "Instalação de bateria", 1, 40)] },
  // Duas passagens antigas do mesmo Gol (v1), pra ficha do veículo (FN-04)
  // ter uma linha do tempo de verdade: KM subindo, uma peça ainda na
  // garantia e outra já vencida. São antigas o bastante pra ficar fora do
  // filtro "este mês" da lista de OS e das comissões.
  { numero: 109, cliente: "c1", veiculo: "v1", status: "faturada", abertura: -75, km: 81300,
    itens: [item("peca", "p4", "Pastilha de freio dianteira", 1, 189.5), item("servico", "s4", "Troca de pastilha de freio", 1, 90), item("servico", "s2", "Troca de óleo e filtro", 1, 165)] },
  { numero: 97, cliente: "c1", veiculo: "v1", status: "faturada", abertura: -262, km: 74320,
    itens: [item("peca", "p1", "Pneu 175/70 R14", 4, 369.9), item("servico", "s1", "Alinhamento e balanceamento", 1, 110)] },
].map((o) => {
  const cli = clientes.find((c) => c.id === o.cliente);
  const v = vlk(o.veiculo);
  return {
    id: "os" + o.numero, numero: o.numero, loja_id: LOJA,
    cliente_id: o.cliente, veiculo_id: o.veiculo,
    status: o.status, km_entrada: o.km ?? v.km_atual,
    descricao_problema: "", forma_pagamento: o.status === "faturada" ? "Pix" : null,
    parcelas: 1, data_abertura: dia(o.abertura),
    data_fechamento: o.status === "faturada" ? dia(o.abertura + 0.3) : null,
    vendedor_id: o.numero % 2 === 0 ? "f2" : "f3",
    criado_por_id: OP, atualizado_por_id: OP,
    cliente: { nome: cli.nome },
    veiculo: { placa: v.placa, marca: v.marca, modelo: v.modelo, cor: v.cor, tipo: v.tipo },
    vendedor: { nome: o.numero % 2 === 0 ? "Bruna Tavares" : "Marcos Andrade" },
    criado_por: { nome: "Marcos Andrade" },
    atualizado_por: { nome: "Marcos Andrade" },
    itens: o.itens,
  };
});

// Uma venda de balcão (item FN-09): mesmo contador de número das OS, sem
// veículo, no nome do Consumidor. Aparece na aba "Vendas de balcão".
ordens.unshift({
  id: "os149", numero: 149, loja_id: LOJA, tipo: "venda_balcao",
  cliente_id: "00000000-0000-0000-0000-00000000c000", veiculo_id: null,
  status: "faturada", km_entrada: null, descricao_problema: null,
  forma_pagamento: "Dinheiro", parcelas: 1,
  data_abertura: dia(-0.1), data_fechamento: dia(-0.1),
  vendedor_id: "f2", criado_por_id: OP, atualizado_por_id: OP,
  cliente: { nome: "Consumidor" }, veiculo: null,
  vendedor: { nome: "Bruna Tavares" },
  criado_por: { nome: "Bruna Tavares" }, atualizado_por: { nome: "Bruna Tavares" },
  itens: [{ ...item("peca", "p5", "Bateria 60Ah", 1, 549), tecnico_id: null, tecnico: null }],
});

const totalOrdem = (o) =>
  o.itens.reduce((s, i) => s + i.quantidade * i.preco_unitario - i.desconto, 0);

// Movimento do mês inteiro, no tamanho de um autocenter de verdade:
// ~30 atendimentos no mês, ticket entre R$180 e R$2.400, mais as despesas
// operacionais que a loja realmente tem. Tudo inventado.
const TICKETS = [
  255, 550, 455, 480, 440, 225, 570, 460, 1080, 295,
  1095, 2580, 550, 1495, 635, 255, 1085, 270, 470, 880,
  210, 1135, 450, 820, 965, 755, 1900, 335, 850, 1990,
  575, 395, 355, 430, 1185, 465, 820, 360, 1095, 1540,
  1950, 1180, 340, 1195, 1980,
];
const DESPESAS = [
  ["Fornecedor de pneus", 9840],
  ["Folha de pagamento", 11200],
  ["Aluguel do galpão", 3200],
  ["Fornecedor de peças", 4630],
  ["Energia elétrica", 890],
  ["Internet e telefone", 240],
  ["Material de limpeza", 320],
  ["Manutenção de equipamento", 680],
];

const totalItens = (o) =>
  o.itens.reduce((s, i) => s + i.quantidade * i.preco_unitario - i.desconto, 0);

export const caixa = [
  // lançamentos de hoje, vindos das OS faturadas (mostram cliente e lucro)
  ...ordens.filter((o) => o.status === "faturada").map((o, i) => ({
    id: "cx-os" + o.numero, loja_id: LOJA, data: o.data_fechamento,
    ordem_servico_id: o.id, tipo: "entrada",
    forma_pagamento: ["Pix", "Cartão de crédito", "Dinheiro"][i % 3],
    valor: totalItens(o), descricao: (o.tipo === "venda_balcao" ? "Venda " : "OS ") + o.numero, categoria_id: null,
  })),
  ...TICKETS.map((valor, i) => ({
    id: "cx-e" + i, loja_id: LOJA, data: dia(-(1 + (i % 26))),
    ordem_servico_id: "os-hist-" + i, tipo: "entrada",
    forma_pagamento: ["Pix", "Cartão de crédito", "Dinheiro", "Cartão de débito"][i % 4],
    valor, descricao: "OS " + (118 + i), categoria_id: null,
  })),
  ...DESPESAS.map(([descricao, valor], i) => ({
    id: "cx-s" + i, loja_id: LOJA, data: dia(-(i * 3 + 1)),
    ordem_servico_id: null, tipo: "saida", forma_pagamento: "Transferência",
    valor, descricao, categoria_id: null,
  })),
];

export const contasPagar = [
  { id: "cp1", loja_id: LOJA, descricao: "Aluguel do galpão", valor: 3200, vencimento: diaCurto(4), categoria_id: null, recorrente: true, recorrente_ate: null, status: "pendente", data_pagamento: null, caixa_movimento_id: null, operador_id: OP, criado_em: dia(-30) },
  { id: "cp2", loja_id: LOJA, descricao: "Energia elétrica", valor: 890.4, vencimento: diaCurto(9), categoria_id: null, recorrente: true, recorrente_ate: null, status: "pendente", data_pagamento: null, caixa_movimento_id: null, operador_id: OP, criado_em: dia(-30) },
  { id: "cp3", loja_id: LOJA, descricao: "Fornecedor de pneus", valor: 4750, vencimento: diaCurto(-2), categoria_id: null, recorrente: false, recorrente_ate: null, status: "pendente", data_pagamento: null, caixa_movimento_id: null, operador_id: OP, criado_em: dia(-20) },
];

export const pecas = [
  { id: "p1", codigo_interno: "PN-17570R14", codigo_barras: "7891234567890", descricao: "Pneu 175/70 R14", marca: "Rovelo", modelo: "RHP-A68", aplicacao: "Gol, Onix, HB20", unidade: "UN", preco_custo: 245, preco_venda: 389.9, ncm: "40111000", cest: "", cfop_padrao: "5102", origem: "0", cst_ou_csosn: "500", aliquota_icms: 18, categoria_id: "cat1", prazo_garantia_dias: 90, estoque_minimo: 8, medida: "175/70 R14", indice_carga_velocidade: "84T", dot: "3823", ativo: true, criado_em: dia(-200) },
  { id: "p2", codigo_interno: "PN-20560R16", codigo_barras: "7891234567891", descricao: "Pneu 205/60 R16", marca: "Pirelli", modelo: "Cinturato P1", aplicacao: "Corolla, Civic, Cruze", unidade: "UN", preco_custo: 410, preco_venda: 612, ncm: "40111000", cest: "", cfop_padrao: "5102", origem: "0", cst_ou_csosn: "500", aliquota_icms: 18, categoria_id: "cat1", prazo_garantia_dias: 90, estoque_minimo: 4, medida: "205/60 R16", indice_carga_velocidade: "92V", dot: "1224", ativo: true, criado_em: dia(-200) },
  { id: "p3", codigo_interno: "AM-DIA-001", codigo_barras: "7891234567892", descricao: "Amortecedor dianteiro", marca: "Cofap", modelo: "GP32812", aplicacao: "Renegade, Compass", unidade: "UN", preco_custo: 298, preco_venda: 445, ncm: "87088000", cest: "", cfop_padrao: "5102", origem: "0", cst_ou_csosn: "500", aliquota_icms: 18, categoria_id: "cat2", prazo_garantia_dias: 180, estoque_minimo: null, medida: null, indice_carga_velocidade: null, dot: null, ativo: true, criado_em: dia(-150) },
  { id: "p4", codigo_interno: "PF-DIA-220", codigo_barras: "7891234567893", descricao: "Pastilha de freio dianteira", marca: "Bosch", modelo: "BN1234", aplicacao: "Onix, Prisma", unidade: "JG", preco_custo: 121, preco_venda: 189.5, ncm: "87083090", cest: "", cfop_padrao: "5102", origem: "0", cst_ou_csosn: "500", aliquota_icms: 18, categoria_id: "cat3", prazo_garantia_dias: 90, estoque_minimo: 2, medida: null, indice_carga_velocidade: null, dot: null, ativo: true, criado_em: dia(-140) },
  { id: "p5", codigo_interno: "BT-60AH", codigo_barras: "7891234567894", descricao: "Bateria 60Ah", marca: "Moura", modelo: "M60GD", aplicacao: "Uso geral", unidade: "UN", preco_custo: 372, preco_venda: 549, ncm: "85071000", cest: "", cfop_padrao: "5102", origem: "0", cst_ou_csosn: "500", aliquota_icms: 18, categoria_id: "cat4", prazo_garantia_dias: 365, estoque_minimo: 1, medida: null, indice_carga_velocidade: null, dot: null, ativo: true, criado_em: dia(-90) },
];

export const servicos = [
  { id: "s1", codigo_interno: "SV-ALIN", descricao: "Alinhamento e balanceamento", preco_padrao: 120, custo: 35, categoria_id: null, ativo: true, criado_em: dia(-300) },
  { id: "s2", codigo_interno: "SV-TROCA-OLEO", descricao: "Troca de óleo e filtro", preco_padrao: 165, custo: 60, categoria_id: null, ativo: true, criado_em: dia(-300) },
  { id: "s3", codigo_interno: "SV-AMORT", descricao: "Troca de amortecedor", preco_padrao: 260, custo: 90, categoria_id: null, ativo: true, criado_em: dia(-300) },
  { id: "s4", codigo_interno: "SV-FREIO", descricao: "Troca de pastilha de freio", preco_padrao: 90, custo: 30, categoria_id: null, ativo: true, criado_em: dia(-300) },
  { id: "s5", codigo_interno: "SV-BAT", descricao: "Instalação de bateria", preco_padrao: 40, custo: 12, categoria_id: null, ativo: true, criado_em: dia(-300) },
];

export const categorias = [
  { id: "cat1", nome: "Pneus", criado_em: dia(-400) },
  { id: "cat2", nome: "Suspensão", criado_em: dia(-400) },
  { id: "cat3", nome: "Freios", criado_em: dia(-400) },
  { id: "cat4", nome: "Elétrica", criado_em: dia(-400) },
];

export const depositos = [{ id: "d1", loja_id: LOJA, nome: "Depósito Principal", ativo: true, criado_em: dia(-400) }];

export const estoque = [
  { id: "e1", loja_id: LOJA, deposito_id: "d1", peca_id: "p1", tipo: "entrada", quantidade: 24, motivo: "compra", referencia: "NF 88213", criado_em: dia(-20) },
  { id: "e2", loja_id: LOJA, deposito_id: "d1", peca_id: "p2", tipo: "entrada", quantidade: 16, motivo: "compra", referencia: "NF 88213", criado_em: dia(-20) },
  { id: "e3", loja_id: LOJA, deposito_id: "d1", peca_id: "p1", tipo: "saida", quantidade: 2, motivo: "uso_em_os", referencia: "OS 148", criado_em: dia(-0.2) },
  { id: "e4", loja_id: LOJA, deposito_id: "d1", peca_id: "p5", tipo: "entrada", quantidade: 12, motivo: "compra", referencia: "NF 88410", criado_em: dia(-12) },
  { id: "e5", loja_id: LOJA, deposito_id: "d1", peca_id: "p3", tipo: "entrada", quantidade: 10, motivo: "compra", referencia: "NF 88410", criado_em: dia(-12) },
  { id: "e6", loja_id: LOJA, deposito_id: "d1", peca_id: "p4", tipo: "entrada", quantidade: 14, motivo: "compra", referencia: "NF 88555", criado_em: dia(-8) },
  { id: "e7", loja_id: LOJA, deposito_id: "d1", peca_id: "p3", tipo: "saida", quantidade: 2, motivo: "uso_em_os", referencia: "OS 147", criado_em: dia(-0.6) },
  { id: "e8", loja_id: LOJA, deposito_id: "d1", peca_id: "p4", tipo: "saida", quantidade: 1, motivo: "uso_em_os", referencia: "OS 146", criado_em: dia(-1) },
  { id: "e9", loja_id: LOJA, deposito_id: "d1", peca_id: "p2", tipo: "saida", quantidade: 4, motivo: "uso_em_os", referencia: "OS 145", criado_em: dia(-0.3) },
];

// ---------------------------------------------------------------------------
// A partir daqui: dados das tabelas que faltavam pra conseguir tirar uma
// imagem de TODAS as telas do sistema (não só as 5 que o site usa).
// Continua tudo inventado — nenhum dado real de loja nenhuma.
// ---------------------------------------------------------------------------

export const categoriasServicos = [
  { id: "cs1", nome: "Pneus", criado_em: dia(-400) },
  { id: "cs2", nome: "Suspensão", criado_em: dia(-400) },
  { id: "cs3", nome: "Freios", criado_em: dia(-400) },
  { id: "cs4", nome: "Alinhamento", criado_em: dia(-400) },
  { id: "cs5", nome: "Outros Serviços", criado_em: dia(-400) },
];

export const categoriasCaixa = [
  { id: "cc1", nome: "Aluguel", tipo: "saida", criado_em: dia(-400) },
  { id: "cc2", nome: "Folha de pagamento", tipo: "saida", criado_em: dia(-400) },
  { id: "cc3", nome: "Energia elétrica", tipo: "saida", criado_em: dia(-400) },
  { id: "cc4", nome: "Compra de peças", tipo: "saida", criado_em: dia(-400) },
  { id: "cc5", nome: "Venda de sucata", tipo: "entrada", criado_em: dia(-400) },
  { id: "cc6", nome: "Aporte do sócio", tipo: "entrada", criado_em: dia(-400) },
];

export const fornecedores = [
  { id: "fo1", nome: "Distribuidora Central de Pneus Ltda", cnpj: "11.222.333/0001-44", telefone: "(16) 3301-7788", email: "vendas@exemplo.com.br", cep: "14810-100", rua: "Av. dos Trabalhadores", numero: "2300", bairro: "Distrito Industrial", cidade: "Araraquara", uf: "SP", ativo: true, criado_em: dia(-320) },
  { id: "fo2", nome: "Auto Peças Bandeirantes S/A", cnpj: "22.333.444/0001-55", telefone: "(16) 3322-9090", email: "pedidos@exemplo.com.br", cep: "14020-500", rua: "Rua São Sebastião", numero: "455", bairro: "Centro", cidade: "Ribeirão Preto", uf: "SP", ativo: true, criado_em: dia(-280) },
  { id: "fo3", nome: "Suspensão & Cia Comércio", cnpj: "33.444.555/0001-66", telefone: "(11) 4004-2211", email: "comercial@exemplo.com.br", cep: "09070-200", rua: "Av. Industrial", numero: "1180", bairro: "Jardim", cidade: "Santo André", uf: "SP", ativo: true, criado_em: dia(-210) },
  { id: "fo4", nome: "Baterias do Vale Distribuidora", cnpj: "44.555.666/0001-77", telefone: "(16) 3355-1200", email: "atendimento@exemplo.com.br", cep: "14807-000", rua: "Rua Carlos Gomes", numero: "77", bairro: "Vila Melhado", cidade: "Araraquara", uf: "SP", ativo: false, criado_em: dia(-160) },
];

const itemPedido = (id, pedido, pecaId, descricao, unidade, pedida, preco, recebida) => ({
  id, pedido_compra_id: pedido, peca_id: pecaId,
  quantidade_pedida: pedida, preco_unitario: preco, quantidade_recebida: recebida,
  peca: { descricao, unidade },
});

export const pedidosCompra = [
  {
    id: "pc1", numero: 34, loja_id: LOJA, fornecedor_id: "fo1", status: "pendente",
    data_pedido: diaCurto(-1), observacao: "Reposição da linha de pneu aro 14 e 16.",
    operador_id: OP, criado_em: dia(-1), fornecedor: { nome: fornecedores[0].nome },
    itens: [
      itemPedido("pi1", "pc1", "p1", "Pneu 175/70 R14", "UN", 20, 238.5, 0),
      itemPedido("pi2", "pc1", "p2", "Pneu 205/60 R16", "UN", 12, 402, 0),
    ],
  },
  {
    id: "pc2", numero: 33, loja_id: LOJA, fornecedor_id: "fo3", status: "parcial",
    data_pedido: diaCurto(-6), observacao: "Chegou metade; o resto fica pra semana que vem.",
    operador_id: OP, criado_em: dia(-6), fornecedor: { nome: fornecedores[2].nome },
    itens: [
      itemPedido("pi3", "pc2", "p3", "Amortecedor dianteiro", "UN", 10, 291, 6),
    ],
  },
  {
    id: "pc3", numero: 32, loja_id: LOJA, fornecedor_id: "fo2", status: "recebido",
    data_pedido: diaCurto(-13), observacao: "",
    operador_id: OP, criado_em: dia(-13), fornecedor: { nome: fornecedores[1].nome },
    itens: [
      itemPedido("pi4", "pc3", "p4", "Pastilha de freio dianteira", "JG", 14, 118.4, 14),
      itemPedido("pi5", "pc3", "p5", "Bateria 60Ah", "UN", 6, 365, 6),
    ],
  },
];

export const cotacoes = [
  { id: "ct1", peca_id: "p1", fornecedor_id: "fo1", preco: 238.5, criado_em: dia(-1), fornecedor: { nome: fornecedores[0].nome } },
  { id: "ct2", peca_id: "p1", fornecedor_id: "fo2", preco: 251, criado_em: dia(-40), fornecedor: { nome: fornecedores[1].nome } },
  { id: "ct3", peca_id: "p2", fornecedor_id: "fo1", preco: 402, criado_em: dia(-1), fornecedor: { nome: fornecedores[0].nome } },
  { id: "ct4", peca_id: "p3", fornecedor_id: "fo3", preco: 291, criado_em: dia(-6), fornecedor: { nome: fornecedores[2].nome } },
  { id: "ct5", peca_id: "p3", fornecedor_id: "fo2", preco: 305.9, criado_em: dia(-70), fornecedor: { nome: fornecedores[1].nome } },
  { id: "ct6", peca_id: "p4", fornecedor_id: "fo2", preco: 118.4, criado_em: dia(-13), fornecedor: { nome: fornecedores[1].nome } },
  { id: "ct7", peca_id: "p5", fornecedor_id: "fo4", preco: 372, criado_em: dia(-90), fornecedor: { nome: fornecedores[3].nome } },
];

// Migration 0052: os modelos de mensagem ficam vazios de propósito — é o
// estado real de uma loja que não editou nada, e aí vale o texto padrão de
// src/schemas/whatsapp.ts.
export const modelosWhatsapp = [];
// Uma cobrança já aberta, pra o "cobrado em dd/mm" aparecer no catálogo.
export const whatsappMensagens = [
  { id: "wa1", loja_id: LOJA, chave: "cobranca", referencia: "cr2", destino: "(16) 99123-4567", operador_id: OP, criado_em: dia(-2) },
];

export const contasReceber = [
  { id: "cr1", loja_id: LOJA, cliente_id: "c2", ordem_servico_id: "os145", descricao: "OS 145 — 4 pneus + alinhamento", valor: 2588, vencimento: diaCurto(6), status: "pendente", data_recebimento: null, caixa_movimento_id: null, operador_id: OP, criado_em: dia(-0.3), cliente: { nome: "Transportes Boa Vista Ltda" } },
  { id: "cr2", loja_id: LOJA, cliente_id: "c4", ordem_servico_id: null, descricao: "Serviço faturado no fim do mês (frota)", valor: 1340, vencimento: diaCurto(-3), status: "pendente", data_recebimento: null, caixa_movimento_id: null, operador_id: OP, criado_em: dia(-18), cliente: { nome: "Eduardo Salles" } },
  { id: "cr3", loja_id: LOJA, cliente_id: "c1", ordem_servico_id: null, descricao: "Parcela 2/2 do jogo de amortecedores", valor: 720, vencimento: diaCurto(-12), status: "recebido", data_recebimento: diaCurto(-11), caixa_movimento_id: "cx-e3", operador_id: OP, criado_em: dia(-40), cliente: { nome: "Ricardo Menezes" } },
];

const mesCompetencia = (n) => {
  const d = new Date(hoje);
  d.setMonth(d.getMonth() + n, 1);
  return d.toISOString().slice(0, 10);
};

const nota = (id, tipo, comp, nome, numero, origem, status, cliente, ref) => ({
  id, loja_id: LOJA, tipo, competencia: comp, nome_arquivo: nome,
  storage_path: `${tipo}/${comp.slice(0, 7)}/${id}-${nome}`,
  ordem_servico_id: null, operador_id: OP, criado_em: dia(-2),
  origem, numero, chave_acesso: numero ? "3526" + String(numero).padStart(40, "0") : null,
  status, focus_nfe_ref: ref,
  ordem_servico: cliente ? { cliente: { nome: cliente } } : null,
  operador: { nome: "Marcos Andrade" },
});

export const notasFiscais = [
  nota("nf1", "nfe", mesCompetencia(0), "NFCe-000000241.xml", 241, "automatica", "autorizado", "Ricardo Menezes", "os148-nfce-1739"),
  nota("nf2", "nfe", mesCompetencia(0), "NFCe-000000240.xml", 240, "automatica", "autorizado", "Camila Rocha", "os144-nfce-1738"),
  nota("nf3", "nfe", mesCompetencia(0), "NFCe-000000239.xml", 239, "automatica", "cancelado", "Eduardo Salles", "os142-nfce-1737"),
  nota("nf4", "nfe", mesCompetencia(-1), "NFCe-000000238.xml", 238, "manual", null, null, null),
  nota("nf5", "nfse", mesCompetencia(0), "NFSe-00000015.xml", 15, "automatica", "autorizado", "Juliana Prado", "os146-nfse-1741"),
  nota("nf6", "nfse", mesCompetencia(0), "NFSe-00000014.xml", 14, "automatica", "autorizado", "Ricardo Menezes", "os143-nfse-1740"),
  nota("nf7", "nfse", mesCompetencia(-1), "NFSe-00000013.xml", 13, "manual", null, null, null),
];

export const auditoria = [
  { id: "au1", tabela: "pecas", registro_id: "p1", acao: "atualizar", operador_id: OP, criado_em: dia(-0.1), operador: { nome: "Marcos Andrade" }, dados_antes: { descricao: "Pneu 175/70 R14", preco_venda: 369.9 }, dados_depois: { descricao: "Pneu 175/70 R14", preco_venda: 389.9 } },
  { id: "au2", tabela: "ordens_servico", registro_id: "os146", acao: "atualizar", operador_id: OP, criado_em: dia(-0.4), operador: { nome: "Marcos Andrade" }, dados_antes: { numero: 146, status: "em_andamento" }, dados_depois: { numero: 146, status: "concluida" } },
  { id: "au3", tabela: "contas_pagar", registro_id: "cp9", acao: "excluir", operador_id: OP, criado_em: dia(-1.2), operador: { nome: "Marcos Andrade" }, dados_antes: { descricao: "Assinatura de software (duplicada)", valor: 149 }, dados_depois: null },
  { id: "au4", tabela: "clientes", registro_id: "c3", acao: "atualizar", operador_id: OP, criado_em: dia(-2.1), operador: { nome: "Marcos Andrade" }, dados_antes: { nome: "Juliana Prado", telefone: "(16) 98111-0000" }, dados_depois: { nome: "Juliana Prado", telefone: "(16) 98111-2233" } },
  { id: "au5", tabela: "operadores", registro_id: OP2, acao: "atualizar", operador_id: OP, criado_em: dia(-5), operador: { nome: "Marcos Andrade" }, dados_antes: { usuario: "bruna", admin: false }, dados_depois: { usuario: "bruna", admin: true } },
];

export const contagens = [
  { id: "cg1", loja_id: LOJA, deposito_id: "d1", peca_id: "p1", quantidade_contada: 21, saldo_sistema: 22, diferenca: -1, observacao: "Um pneu estava no setor de montagem.", operador_id: OP, criado_em: dia(-3) },
  { id: "cg2", loja_id: LOJA, deposito_id: "d1", peca_id: "p4", quantidade_contada: 13, saldo_sistema: 13, diferenca: 0, observacao: "", operador_id: OP, criado_em: dia(-3) },
  { id: "cg3", loja_id: LOJA, deposito_id: "d1", peca_id: "p5", quantidade_contada: 12, saldo_sistema: 12, diferenca: 0, observacao: "", operador_id: OP, criado_em: dia(-10) },
];

export const funcionarios = [
  { id: "f1", loja_id: LOJA, nome: "Anderson Lima", cargo: "Mecânico", operador_id: null, ativo: true, criado_em: dia(-300),
    cpf: "111.222.333-44", rg: "12.345.678-9", cnh_categoria: "B", cnh_numero: "01234567890", data_nascimento: "1988-03-15", estado_civil: "casado", tipo_sanguineo: "O+",
    cep: "14801-000", endereco: "Rua das Palmeiras", numero: "120", bairro: "Vila Xavier", cidade: "Araraquara", estado: "SP", complemento: "", telefone: "(16) 3333-1010", celular: "(16) 99123-4567", email: "anderson@exemplo.com.br",
    pis: "123.45678.90-1", codigo_registro: "004", cbo: "9144-05", salario: 2850, comissao: 5, admissao: "2019-02-04", data_ferias: "2026-11-03",
    pai: "José Lima", mae: "Marta Lima", naturalidade: "Araraquara/SP", sexo: "masculino", conjuge_nome: "Renata Lima", conjuge_nascimento: "1990-07-22", data_casamento: "2014-05-10", conjuge_telefone: "", conjuge_celular: "(16) 99888-7766",
    operador: null, filhos: [{ id: "fl1", funcionario_id: "f1", nome: "Pedro Lima", data_nascimento: "2016-08-19", criado_em: dia(-300) }] },
  { id: "f2", loja_id: LOJA, nome: "Bruna Tavares", cargo: "Balconista", operador_id: OP2, ativo: true, criado_em: dia(-220),
    cpf: "222.333.444-55", rg: "23.456.789-0", cnh_categoria: "AB", cnh_numero: "09876543210", data_nascimento: "1995-11-02", estado_civil: "solteiro", tipo_sanguineo: "A+",
    cep: "14803-100", endereco: "Rua Padre Duarte", numero: "980", bairro: "Centro", cidade: "Araraquara", estado: "SP", complemento: "Apto 42", telefone: "", celular: "(16) 99555-2211", email: "bruna@exemplo.com.br",
    pis: "234.56789.01-2", codigo_registro: "005", cbo: "5211-10", salario: 2250, comissao: 3, admissao: "2022-06-13", data_ferias: "",
    pai: "Carlos Tavares", mae: "Sônia Tavares", naturalidade: "Matão/SP", sexo: "feminino", conjuge_nome: "", conjuge_nascimento: "", data_casamento: "", conjuge_telefone: "", conjuge_celular: "",
    operador: { usuario: "bruna" }, filhos: [] },
  { id: "f3", loja_id: LOJA, nome: "Marcos Andrade", cargo: "Gerente", operador_id: OP, ativo: true, criado_em: dia(-400),
    cpf: "333.444.555-66", rg: "34.567.890-1", cnh_categoria: "B", cnh_numero: "11223344556", data_nascimento: "1979-01-28", estado_civil: "casado", tipo_sanguineo: "B+",
    cep: "14800-500", endereco: "Av. Bento de Abreu", numero: "45", bairro: "Jardim Nova", cidade: "Araraquara", estado: "SP", complemento: "", telefone: "", celular: "(16) 99777-1234", email: "marcos@exemplo.com.br",
    pis: "345.67890.12-3", codigo_registro: "001", cbo: "1423-10", salario: 4600, comissao: 2, admissao: "2016-01-11", data_ferias: "2026-12-15",
    pai: "Antônio Andrade", mae: "Célia Andrade", naturalidade: "Araraquara/SP", sexo: "masculino", conjuge_nome: "Paula Andrade", conjuge_nascimento: "1982-04-09", data_casamento: "2008-09-20", conjuge_telefone: "", conjuge_celular: "(16) 99666-5544",
    operador: { usuario: "demo" }, filhos: [
      { id: "fl2", funcionario_id: "f3", nome: "Laura Andrade", data_nascimento: "2011-02-14", criado_em: dia(-400) },
      { id: "fl3", funcionario_id: "f3", nome: "Miguel Andrade", data_nascimento: "2014-10-05", criado_em: dia(-400) },
    ] },
  { id: "f4", loja_id: LOJA, nome: "Rogério Pinto", cargo: "Mecânico", operador_id: null, ativo: false, criado_em: dia(-500),
    cpf: "444.555.666-77", rg: "", cnh_categoria: "", cnh_numero: "", data_nascimento: "1983-05-30", estado_civil: "", tipo_sanguineo: "",
    cep: "", endereco: "", numero: "", bairro: "", cidade: "", estado: "", complemento: "", telefone: "", celular: "(16) 99444-3322", email: "",
    pis: "", codigo_registro: "003", cbo: "", salario: 2600, comissao: 4, admissao: "2018-03-01", data_ferias: "",
    pai: "", mae: "", naturalidade: "", sexo: "masculino", conjuge_nome: "", conjuge_nascimento: "", data_casamento: "", conjuge_telefone: "", conjuge_celular: "",
    operador: null, filhos: [] },
];

// A ficha do veículo lê o prazo de garantia pelo item da OS
// (`itens:ordens_servico_itens(..., peca:pecas(prazo_garantia_dias))`).
for (const o of ordens) {
  for (const i of o.itens) {
    if (i.peca_id) {
      i.peca = { prazo_garantia_dias: pecas.find((p) => p.id === i.peca_id)?.prazo_garantia_dias ?? 90 };
    }
  }
}

// Tabela "achatada" dos itens das OS — é o que a tela de Garantias consulta
// direto (a garantia não tem tabela própria: sai do item de peça + o prazo
// cadastrado na peça + a data em que a OS foi fechada).
export const ordensItens = ordens.flatMap((o) =>
  o.itens.map((i) => ({
    ...i,
    ordem_servico_id: o.id,
    ordem: {
      id: o.id,
      data_fechamento: o.data_fechamento ?? dia(-1),
      cliente: { nome: o.cliente.nome },
      veiculo: o.veiculo ? { placa: o.veiculo.placa } : null,
    },
    peca: i.peca_id
      ? {
          descricao: i.descricao,
          prazo_garantia_dias: pecas.find((p) => p.id === i.peca_id)?.prazo_garantia_dias ?? 90,
        }
      : null,
  })),
);

export const operadores = [
  operador,
  { id: OP2, usuario: "bruna", nome: "Bruna Tavares", admin: false, permissoes: ["painel", "clientes", "ordens_servico", "estoque", "caixa"], ativo: true, deve_trocar_senha: false, criado_em: dia(-220) },
  { id: OP3, usuario: "anderson", nome: "Anderson Lima", admin: false, permissoes: ["painel", "ordens_servico", "estoque"], ativo: true, deve_trocar_senha: false, criado_em: dia(-300) },
];

export const configuracoesFiscais = [{
  loja_id: LOJA, cnpj: "12.345.678/0001-99", razao_social: "Auto Center Modelo Comércio de Pneus Ltda",
  nome_fantasia: "Auto Center Modelo", inscricao_estadual: "111.222.333.444", inscricao_municipal: "30012345",
  regime_tributario: "simples_nacional", cep: "14801-000", rua: "Av. Bento de Abreu", numero: "1500",
  bairro: "Vila Melhado", cidade: "Araraquara", uf: "SP", telefone: "(16) 3333-0000", email: "contato@exemplo.com.br",
  focus_nfe_ambiente: "producao",
  codigo_municipio: "3503208", item_lista_servico: "14.01", aliquota_iss: 3, codigo_tributario_municipio: "452000100",
  codigo_cnae: "4520001",
}];

export const jurosParcelas = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => ({
  loja_id: LOJA, numero_parcelas: n, juros_percentual: Number((1.99 + (n - 2) * 0.75).toFixed(2)),
}));

export const configGarantia = [{
  loja_id: LOJA,
  texto:
    "Garantimos os serviços e as peças aplicadas no veículo {veiculo}, do cliente {cliente}, " +
    "conforme os itens abaixo:\n\n{itens}\n\nA garantia cobre defeito de fabricação da peça e " +
    "falha de montagem do serviço executado. Não cobre desgaste natural, mau uso, batida ou " +
    "problema causado por outra peça fora de especificação.\n\nAraraquara, {data}.",
}];

// A versão do esquema que o app espera, lida do próprio código: um banco de
// mentira "atrasado" faria a faixa de aviso do TR-05.7 aparecer nas 54 telas
// do catálogo e nas imagens do site. Lido em vez de copiado justamente pra
// não ficar pra trás na próxima migration.
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const versaoDoEsquema = Number(
  readFileSync(join(RAIZ, "src/schemas/versaoEsquema.ts"), "utf8").match(
    /VERSAO_ESQUEMA_ESPERADA = (\d+)/,
  )[1],
);

const schemaVersao = [{ versao: versaoDoEsquema, aplicada_em: dia(-30) }];

// Fechamentos de caixa (TR-06.4, migration 0058): três dias pra trás, um que
// bateu, um com falta e um com sobra — a aba Fechamento mostra o histórico e
// a soma das diferenças, e sem dado ela apareceria vazia no catálogo.
const fechamentosCaixa = [
  { d: -1, esperado: 612.4, contado: 612.4, obs: null },
  { d: -2, esperado: 845.0, contado: 832.5, obs: "Troco de R$ 12,50 dado a mais pro cliente da tarde" },
  { d: -3, esperado: 498.9, contado: 503.9, obs: null },
].map((f, i) => ({
  id: `fc-${i}`, loja_id: LOJA, data: diaCurto(f.d), fundo_troco: 100,
  saldo_sistema: f.esperado, valor_contado: f.contado,
  diferenca: Math.round((f.contado - f.esperado) * 100) / 100,
  totais_por_forma: {}, observacao: f.obs, caixa_movimento_id: null,
  operador_id: OP, criado_em: dia(f.d), operador: { nome: "Marcos Andrade" },
}));

// Um pagamento de comissão registrado no mês passado (TL-46.1, migration
// 0059) — a aba Comissões mostra o histórico e o recibo a partir dele.
const primeiroDoMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
const ultimoDoMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
const comissoesPagas = [{
  id: "cp-1", loja_id: LOJA, funcionario_id: "f1", funcionario_nome: "Anderson Lima",
  periodo_inicio: primeiroDoMesPassado.toLocaleDateString("sv-SE"),
  periodo_fim: ultimoDoMesPassado.toLocaleDateString("sv-SE"),
  percentual: 10, valor_calculado: 486.3, valor_pago: 486.3,
  data_pagamento: diaCurto(-20), observacao: null,
  snapshot: [
    { ordemId: "os-hist-3", numero: 121, papel: "tecnico", comissao: 212.1 },
    { ordemId: "os-hist-7", numero: 125, papel: "tecnico", comissao: 274.2 },
  ],
  operador_id: OP, criado_em: dia(-20),
}];

// Os computadores da empresa (migration 0063): quatro, pra seção de
// Configurações mostrar o que ela existe pra mostrar — um no canal de teste,
// um uma versão atrás, e um notebook que sumiu há mais de 30 dias.
const versaoDoApp = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../package.json"), "utf8"),
).version;
const versaoAnterior = versaoDoApp.replace(/(\d+)$/, (n) => String(Math.max(0, Number(n) - 1)));
const computadores = [
  { id: "pc-1", nome_maquina: "DESKTOP-4K7PQ2", apelido: "Balcão", versao_app: versaoDoApp,
    canal: "teste", sistema: "Windows 11 Pro", loja_id: LOJA, operador_id: OP,
    primeiro_acesso: dia(-200), visto_em: dia(0), loja: { nome: lojas[0].nome }, operador: { nome: "Marcos Andrade" } },
  { id: "pc-2", nome_maquina: "DESKTOP-9ZB1LM", apelido: "Caixa", versao_app: versaoDoApp,
    canal: "normal", sistema: "Windows 10 Pro", loja_id: LOJA, operador_id: OP2,
    primeiro_acesso: dia(-180), visto_em: dia(0), loja: { nome: lojas[0].nome }, operador: { nome: "Bruna Tavares" } },
  { id: "pc-3", nome_maquina: "DESKTOP-A1C3F9", apelido: null, versao_app: versaoAnterior,
    canal: "normal", sistema: "Windows 10 Home", loja_id: LOJA, operador_id: OP3,
    primeiro_acesso: dia(-60), visto_em: dia(-2), loja: { nome: lojas[0].nome }, operador: { nome: "Anderson Lima" } },
  { id: "pc-4", nome_maquina: "NOTEBOOK-SALA", apelido: "Notebook antigo", versao_app: "0.9.30",
    canal: "normal", sistema: "Windows 10 Home", loja_id: LOJA, operador_id: OP,
    primeiro_acesso: dia(-300), visto_em: dia(-41), loja: { nome: lojas[0].nome }, operador: { nome: "Marcos Andrade" } },
];

export const TABELAS = {
  computadores,
  schema_versao: schemaVersao,
  lojas, clientes, pecas, servicos, depositos,
  // Cópia com o dono embutido (a ficha do veículo pede
  // `cliente:clientes(...)`). Cópia, e não o próprio objeto: o cliente já
  // carrega a lista de veículos dele, e os dois apontando um pro outro não
  // viram JSON.
  veiculos: veiculos.map((v) => {
    const c = clientes.find((cl) => cl.id === v.cliente_id);
    return { ...v, cliente: c ? { id: c.id, nome: c.nome, telefone: c.telefone } : null };
  }),
  ordens_servico: ordens,
  ordens_servico_itens: ordensItens,
  caixa_movimentos: caixa,
  fechamentos_caixa: fechamentosCaixa,
  comissoes_fechamentos: comissoesPagas,
  contas_pagar: contasPagar,
  contas_receber: contasReceber,
  estoque_movimentos: estoque,
  contagens_estoque: contagens,
  operadores,
  operador_lojas: [{ operador_id: OP, loja_id: LOJA, loja: lojas[0] }],
  configuracoes_painel_inicio: [{ loja_id: LOJA, cartoes: ["vendas_mes", "lucro_mes", "ticket_medio_mes"] }],
  configuracoes_fiscais_loja: configuracoesFiscais,
  configuracoes_juros_parcelas: jurosParcelas,
  configuracoes_garantia: configGarantia,
  notas_fiscais_arquivos: notasFiscais,
  fornecedores,
  pedidos_compra: pedidosCompra,
  pedidos_compra_itens: pedidosCompra.flatMap((p) => p.itens),
  cotacoes_pecas: cotacoes,
  categorias,
  categorias_servicos: categoriasServicos,
  categorias_caixa: categoriasCaixa,
  funcionarios,
  // A view do TR-04.3 (migration 0056): a mesma gente, só que sem salário,
  // CPF nem família. É por ela que o seletor de técnico e de vendedor da OS
  // lê — deixá-la de fora aqui deixaria os dois selects vazios nas telas
  // geradas, sem nada explicando.
  funcionarios_publico: funcionarios.map(({ id, loja_id, nome, cargo, operador_id, ativo }) => ({
    id,
    loja_id,
    nome,
    cargo,
    operador_id,
    ativo,
  })),
  funcionario_filhos: funcionarios.flatMap((f) => f.filhos),
  auditoria,
  configuracoes_whatsapp: modelosWhatsapp,
  whatsapp_mensagens: whatsappMensagens,
};
// As funções do banco que o app chama por `supabase.rpc(...)`. Sem resposta
// aqui, a pergunta "esta loja tem token da Focus NFe?" (TR-04.2) voltaria
// vazia — e as telas geradas mostrariam a emissão de nota como "token não
// configurado", e o aviso da alíquota sumiria do Início, sem nada explicando.
export const FUNCOES = {
  loja_tem_token_focus_nfe: true,
  definir_token_focus_nfe: null,
  registrar_computador: null,
  definir_apelido_computador: null,
};

export const SESSAO = {
  access_token: "demo-access-token", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "demo-refresh-token",
  user: {
    id: OP, aud: "authenticated", role: "authenticated", email: "demo@sakura.local",
    email_confirmed_at: dia(-400), phone: "", confirmed_at: dia(-400),
    last_sign_in_at: dia(0), app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {}, identities: [], created_at: dia(-400), updated_at: dia(0),
  },
};
