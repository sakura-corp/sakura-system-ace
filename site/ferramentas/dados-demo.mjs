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
// A fração conta a partir das 8h (a loja abrindo), pra a OS de hoje não sair
// aberta de madrugada; antes das 8h, a partir da meia-noite.
const dia = (n) => {
  const inteiro = Math.trunc(n);
  const fracao = n - inteiro; // de -1 a 0: as frações usadas aqui são todas pra trás
  const d = new Date(hoje);
  const abertura = new Date(hoje);
  abertura.setHours(hoje.getHours() >= 8 ? 8 : 0, 0, 0, 0);
  d.setTime(d.getTime() + (hoje.getTime() - abertura.getTime()) * fracao);
  d.setDate(d.getDate() + inteiro);
  return d.toISOString();
};
// O dia de calendário no fuso local (como o `diaLocal()` do programa), não o
// corte do texto em UTC: depois das 21h em São Paulo, o corte já dava amanhã.
const diaCurto = (n) => new Date(dia(n)).toLocaleDateString("sv-SE");
// `diaAs(-3, 14, 20)` é três dias atrás, às 14h20 (no fuso de quem gera as
// telas). Pros dias passados, em vez de `dia()`: com ele, tudo que é de outro
// dia saía com a mesma hora (a hora em que a tela abriu), e a lista de
// Movimentações do Estoque parecia lançada toda de uma vez (#777, item 6).
const diaAs = (n, hora, minuto = 0) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() + n);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
};
// Como `diaAs`, mas domingo (loja fechada) vira o sábado antes.
const diaDeLojaAs = (n, hora, minuto = 0) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() + n);
  return diaAs(d.getDay() === 0 ? n - 1 : n, hora, minuto);
};
// "AAAA-MM-DD" no fuso local (o mesmo do `diaLocal()` do programa).
const diaLocal = (iso) => new Date(iso).toLocaleDateString("sv-SE");

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
  // Os carros de quem "sumiu" (#684): ver `ordensDeQuemSumiu`.
  { id: "v7", cliente_id: "c6", placa: "FKR-2E63", marca: "Hyundai", modelo: "HB20 1.0", ano: 2018, cor: "cinza", tipo: "hatch", km_atual: 98100 },
  { id: "v8", cliente_id: "c7", placa: "GZL-7A30", marca: "Renault", modelo: "Duster", ano: 2017, cor: "marrom", tipo: "suv", km_atual: 121500 },
];

export const clientes = [
  { id: "c1", nome: "Ricardo Menezes", tipo_pessoa: "fisica", cpf_cnpj: "123.456.789-00", telefone: "(16) 99000-1122", email: "ricardo@exemplo.com.br", cep: "14800-000", rua: "Rua das Acácias", numero: "215", bairro: "Centro", cidade: "Araraquara", uf: "SP", data_nascimento: "1985-04-12", criado_em: dia(-300) },
  { id: "c2", nome: "Transportes Boa Vista Ltda", tipo_pessoa: "juridica", cpf_cnpj: "12.345.678/0001-90", telefone: "(16) 3333-4455", email: "contato@exemplo.com.br", cep: "14802-100", rua: "Av. Industrial", numero: "1400", bairro: "Distrito Industrial", cidade: "Araraquara", uf: "SP", data_nascimento: null, criado_em: dia(-250) },
  { id: "c3", nome: "Juliana Prado", tipo_pessoa: "fisica", cpf_cnpj: "987.654.321-00", telefone: "(16) 98111-2233", email: "juliana@exemplo.com.br", cep: "14801-300", rua: "Rua Sete de Setembro", numero: "88", bairro: "Vila Xavier", cidade: "Araraquara", uf: "SP", data_nascimento: "1992-09-03", criado_em: dia(-180) },
  { id: "c4", nome: "Eduardo Salles", tipo_pessoa: "fisica", cpf_cnpj: "456.789.123-00", telefone: "(16) 99777-8899", email: "eduardo@exemplo.com.br", cep: "14803-200", rua: "Rua Padre Duarte", numero: "742", bairro: "Jardim Nova", cidade: "Araraquara", uf: "SP", data_nascimento: "1978-12-21", criado_em: dia(-120) },
  { id: "c6", nome: "Paulo Vieira", tipo_pessoa: "fisica", cpf_cnpj: "654.987.321-00", telefone: "(16) 99333-4455", email: "paulo@exemplo.com.br", cep: "14806-000", rua: "Rua Rui Barbosa", numero: "310", bairro: "Vila Harmonia", cidade: "Araraquara", uf: "SP", data_nascimento: "1981-02-17", criado_em: dia(-420) },
  { id: "c7", nome: "Sandra Moreira", tipo_pessoa: "fisica", cpf_cnpj: "789.123.456-00", telefone: "(16) 98444-5566", email: "sandra@exemplo.com.br", cep: "14804-000", rua: "Av. Portugal", numero: "1020", bairro: "Jardim Primavera", cidade: "Araraquara", uf: "SP", data_nascimento: "1974-08-08", criado_em: dia(-380) },
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

// As OS de hoje, com o número subindo junto com a hora (a 146 foi concluída
// hoje, depois da 145).
export const ordens = [
  { numero: 148, cliente: "c1", veiculo: "v1", status: "em_andamento", abertura: -0.25,
    itens: [item("peca", "p1", "Pneu 175/70 R14", 2, 389.9), item("servico", "s1", "Alinhamento e balanceamento", 1, 120)] },
  { numero: 147, cliente: "c4", veiculo: "v4", status: "em_andamento", abertura: -0.4,
    itens: [item("peca", "p3", "Amortecedor dianteiro", 2, 445), item("servico", "s3", "Troca de amortecedor", 1, 260)] },
  { numero: 146, cliente: "c3", veiculo: "v3", status: "concluida", abertura: -0.5,
    itens: [item("peca", "p4", "Pastilha de freio dianteira", 1, 189.5), item("servico", "s4", "Troca de pastilha de freio", 1, 90)] },
  { numero: 145, cliente: "c2", veiculo: "v2", status: "faturada", abertura: -0.6,
    itens: [item("peca", "p2", "Pneu 205/60 R16", 4, 612), item("servico", "s1", "Alinhamento e balanceamento", 1, 140)] },
  { numero: 144, cliente: "c5", veiculo: "v5", status: "faturada", abertura: -0.75,
    itens: [item("servico", "s2", "Troca de óleo e filtro", 1, 165)] },
  { numero: 143, cliente: "c1", veiculo: "v1", status: "faturada", abertura: -0.9,
    itens: [item("peca", "p5", "Bateria 60Ah", 1, 549), item("servico", "s5", "Instalação de bateria", 1, 40)] },
  // Duas passagens antigas do mesmo Gol (v1), pra ficha do veículo (FN-04)
  // ter uma linha do tempo de verdade: KM subindo, uma peça ainda na
  // garantia e outra já vencida. São antigas o bastante pra ficar fora do
  // filtro "este mês" da lista de OS e das comissões.
  { numero: 10, cliente: "c1", veiculo: "v1", status: "faturada", abertura: -75, dataAbertura: diaDeLojaAs(-75, 9, 20), dataFechamento: diaDeLojaAs(-75, 11, 5), km: 81300,
    itens: [item("peca", "p4", "Pastilha de freio dianteira", 1, 189.5), item("servico", "s4", "Troca de pastilha de freio", 1, 90), item("servico", "s2", "Troca de óleo e filtro", 1, 165)] },
  { numero: 5, cliente: "c1", veiculo: "v1", status: "faturada", abertura: -262, dataAbertura: diaDeLojaAs(-262, 9, 20), dataFechamento: diaDeLojaAs(-262, 11, 5), km: 74320,
    itens: [item("peca", "p1", "Pneu 175/70 R14", 4, 369.9), item("servico", "s1", "Alinhamento e balanceamento", 1, 110)] },
].map(montarOrdem);

function montarOrdem(o) {
  const cli = clientes.find((c) => c.id === o.cliente);
  const v = vlk(o.veiculo);
  return {
    id: "os" + o.numero, numero: o.numero, loja_id: LOJA,
    cliente_id: o.cliente, veiculo_id: o.veiculo,
    status: o.status, km_entrada: o.km ?? v.km_atual,
    descricao_problema: "", forma_pagamento: o.status === "faturada" ? "Pix" : null,
    parcelas: 1, data_abertura: o.dataAbertura ?? dia(o.abertura),
    data_fechamento: o.status !== "faturada" ? null : o.dataFechamento ?? dia(o.abertura + 0.3),
    vendedor_id: o.numero % 2 === 0 ? "f2" : "f3",
    criado_por_id: OP, atualizado_por_id: OP,
    cliente: { nome: cli.nome },
    veiculo: { placa: v.placa, marca: v.marca, modelo: v.modelo, cor: v.cor, tipo: v.tipo },
    vendedor: { nome: o.numero % 2 === 0 ? "Bruna Tavares" : "Marcos Andrade" },
    criado_por: { nome: "Marcos Andrade" },
    atualizado_por: { nome: "Marcos Andrade" },
    itens: o.itens,
  };
}

// Clientes que "sumiram" (#684): a última OS faturada do Paulo e da Sandra é
// de mais de 6 meses atrás, pra a cena "Clientes que sumiram" ter gente. Antes
// eram a Juliana e o Eduardo, que estão com OS aberta hoje (146 e 147): a
// regra estava certa (só faturada conta), mas a tela dizia que sumiu quem está
// com o carro na loja (#777, item 11). Ficam FORA de `ordens`, como os
// orçamentos: são antigas demais pro caixa e pras garantias.
const ordensDeQuemSumiu = [
  { numero: 7, cliente: "c6", veiculo: "v7", status: "faturada", abertura: -220, dataAbertura: diaDeLojaAs(-220, 9, 20), dataFechamento: diaDeLojaAs(-220, 11, 5), km: 86400,
    itens: [item("peca", "p4", "Pastilha de freio dianteira", 1, 189.5), item("servico", "s4", "Troca de pastilha de freio", 1, 90)] },
  { numero: 3, cliente: "c7", veiculo: "v8", status: "faturada", abertura: -300, dataAbertura: diaDeLojaAs(-300, 9, 20), dataFechamento: diaDeLojaAs(-300, 11, 5), km: 109800,
    itens: [item("peca", "p2", "Pneu 205/60 R16", 4, 598), item("servico", "s1", "Alinhamento e balanceamento", 1, 130)] },
].map(montarOrdem);

// O movimento das últimas 8 semanas: as OS 11 a 142, já faturadas, no
// tamanho de um autocenter de verdade (perto de 3 atendimentos por dia, de
// segunda a sábado, das 8h às 17h). Oito semanas e não quatro: o Início
// compara o mês com o MESMO pedaço do mês passado, e com só 26 dias de
// histórico o mês passado quase não tinha venda e o cartão dizia "+999%". Antes o
// caixa tinha só os VALORES dessas vendas, sem OS nenhuma por trás: o Diário
// mostrava cliente "—" e lucro "—", o lucro do mês saía igual à venda e
// Relações → Lucratividade não achava as vendas que o Início somava (#777,
// itens 2 e 3). Agora cada venda é uma OS com itens do catálogo, e o caixa,
// o estoque e as notas saem delas.
const PACOTES = {
  oleo: () => [item("servico", "s2", "Troca de óleo e filtro", 1, 165)],
  alinhamento: () => [item("servico", "s1", "Alinhamento e balanceamento", 1, 120)],
  freio: () => [item("peca", "p4", "Pastilha de freio dianteira", 1, 189.5), item("servico", "s4", "Troca de pastilha de freio", 1, 90)],
  oleoEFreio: () => [item("servico", "s2", "Troca de óleo e filtro", 1, 165), item("peca", "p4", "Pastilha de freio dianteira", 1, 189.5), item("servico", "s4", "Troca de pastilha de freio", 1, 90)],
  revisao: () => [item("servico", "s2", "Troca de óleo e filtro", 1, 165), item("servico", "s1", "Alinhamento e balanceamento", 1, 120), item("peca", "p4", "Pastilha de freio dianteira", 1, 189.5), item("servico", "s4", "Troca de pastilha de freio", 1, 90)],
  bateria: () => [item("peca", "p5", "Bateria 60Ah", 1, 549), item("servico", "s5", "Instalação de bateria", 1, 40)],
  doisPneus14: () => [item("peca", "p1", "Pneu 175/70 R14", 2, 389.9), item("servico", "s1", "Alinhamento e balanceamento", 1, 120)],
  quatroPneus14: () => [item("peca", "p1", "Pneu 175/70 R14", 4, 389.9), item("servico", "s1", "Alinhamento e balanceamento", 1, 120)],
  amortecedor: () => [item("peca", "p3", "Amortecedor dianteiro", 2, 445), item("servico", "s3", "Troca de amortecedor", 1, 260)],
  doisPneus16: () => [item("peca", "p2", "Pneu 205/60 R16", 2, 612), item("servico", "s1", "Alinhamento e balanceamento", 1, 140)],
  quatroPneus16: () => [item("peca", "p2", "Pneu 205/60 R16", 4, 612), item("servico", "s1", "Alinhamento e balanceamento", 1, 140)],
};
const BASE = [
  "oleo", "doisPneus14", "alinhamento", "freio", "bateria", "revisao", "amortecedor", "quatroPneus14", "oleoEFreio",
  "alinhamento", "doisPneus14", "oleo", "quatroPneus16", "freio", "revisao", "doisPneus14", "alinhamento",
  "amortecedor", "oleoEFreio", "doisPneus16", "revisao", "freio", "quatroPneus14", "alinhamento", "oleo",
];
// 132 atendimentos, a mesma mistura repetida.
const SEQUENCIA = Array.from({ length: 132 }, (_, i) => BASE[(i * 7) % BASE.length]);
// Os dias de loja aberta das últimas 8 semanas (domingo fechado), do mais
// antigo pro mais novo.
const DIAS_DE_LOJA = [];
for (let n = -56; n <= -1; n++) {
  const d = new Date(hoje);
  d.setDate(d.getDate() + n);
  if (d.getDay() !== 0) DIAS_DE_LOJA.push(n);
}
// A loja está crescendo: o movimento sobe aos poucos ao longo das 8 semanas
// (cerca de 0,88 do normal no começo e 1,12 no fim). Com o movimento igual todo
// dia, o lucro do mês saía menor que o do mesmo pedaço do mês passado em boa
// parte dos dias, e o Início mostrava "Lucro do mês ↓ -24%" em vermelho na
// capa da apresentação (#785). A conta: a posição `f` (de 0 a 1) da OS na
// sequência vira o ponto `x` do período em que a curva a·x² + (1−a)·x chega em `f`.
const CRESCIMENTO = 0.12;
const diaDaOs = (i) => {
  const f = i / SEQUENCIA.length;
  const a = CRESCIMENTO;
  const x = (-(1 - a) + Math.sqrt((1 - a) ** 2 + 4 * a * f)) / (2 * a);
  return DIAS_DE_LOJA[Math.min(DIAS_DE_LOJA.length - 1, Math.floor(x * DIAS_DE_LOJA.length))];
};
const porDia = new Map();
SEQUENCIA.forEach((_, i) => porDia.set(diaDaOs(i), (porDia.get(diaDaOs(i)) ?? 0) + 1));
// Quem traz cada carro, em rodízio (o Paulo e a Sandra de fora: são os que sumiram).
const DONOS = [["c1", "v1"], ["c2", "v2"], ["c3", "v3"], ["c4", "v4"], ["c5", "v5"]];
const historico = SEQUENCIA.map((pacote, i) => {
  const numero = 11 + i;
  // Do mais antigo pro mais novo (ontem), com o número e a hora subindo juntos.
  const n = diaDaOs(i);
  const posicao = SEQUENCIA.slice(0, i).filter((_, j) => diaDaOs(j) === n).length;
  const minutos = 8 * 60 + Math.floor(((posicao + 0.5) * 8 * 60) / porDia.get(n)); // das 8h às 16h
  const hora = Math.floor(minutos / 60);
  const minuto = minutos % 60;
  const [cliente, veiculo] = DONOS[(i * 3) % DONOS.length];
  return montarOrdem({
    numero, cliente, veiculo, status: "faturada",
    dataAbertura: diaAs(n, hora, minuto),
    dataFechamento: diaAs(n, hora + 1, minuto),
    km: vlk(veiculo).km_atual - 3000 + i * 20,
    itens: PACOTES[pacote](),
  });
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

// Orçamentos (#379): ficam FORA de `ordens` de propósito. Orçamento não é
// venda: o resto da demo (caixa, ticket, comissão) é calculado em cima de
// `ordens` e não pode contá-los. Só entram na tabela `ordens_servico`, de onde
// a lista de orçamentos e o número do menu os leem. A validade é relativa a
// hoje pra a cena nunca "vencer" sozinha com o tempo (nem deixar de vencer).
const orcamentoDemo = (n, cliente, veiculo, status, validadeEmDias, itens, extra = {}) => {
  const cli = clientes.find((c) => c.id === cliente);
  const v = vlk(veiculo);
  return {
    id: "orc" + n, numero: null, numero_orcamento: n, loja_id: LOJA,
    cliente_id: cliente, veiculo_id: veiculo, status,
    validade: diaCurto(validadeEmDias), km_entrada: v.km_atual,
    descricao_problema: "", forma_pagamento: null, parcelas: 1,
    data_abertura: diaDeLojaAs(-3 - n, 10, 15), data_fechamento: null,
    vendedor_id: "f2", criado_por_id: OP, atualizado_por_id: OP,
    cliente: { nome: cli.nome },
    veiculo: { placa: v.placa, marca: v.marca, modelo: v.modelo, cor: v.cor, tipo: v.tipo },
    vendedor: { nome: "Bruna Tavares" },
    criado_por: { nome: "Marcos Andrade" }, atualizado_por: { nome: "Marcos Andrade" },
    itens: itens,
    ...extra,
  };
};
export const orcamentos = [
  orcamentoDemo(3, "c2", "v2", "orcamento", 5,
    [item("peca", "p2", "Pneu 205/60 R16", 4, 612), item("servico", "s1", "Alinhamento e balanceamento", 1, 140)]),
  orcamentoDemo(2, "c3", "v3", "orcamento", -2,
    [item("peca", "p3", "Amortecedor dianteiro", 2, 445), item("servico", "s3", "Troca de amortecedor", 1, 260)]),
  orcamentoDemo(1, "c5", "v5", "recusado", 3,
    [item("servico", "s2", "Troca de óleo e filtro", 1, 165)],
    { motivo_recusa: "preco", recusado_em: dia(-1) }),
];

export const categoriasCaixa = [
  { id: "cc1", nome: "Aluguel", tipo: "saida", criado_em: dia(-400) },
  { id: "cc2", nome: "Folha de pagamento", tipo: "saida", criado_em: dia(-400) },
  { id: "cc3", nome: "Energia elétrica", tipo: "saida", criado_em: dia(-400) },
  { id: "cc4", nome: "Compra de peças", tipo: "saida", criado_em: dia(-400) },
  { id: "cc5", nome: "Venda de sucata", tipo: "entrada", criado_em: dia(-400) },
  { id: "cc6", nome: "Aporte do sócio", tipo: "entrada", criado_em: dia(-400) },
  { id: "cc7", nome: "Internet e telefone", tipo: "saida", criado_em: dia(-400) },
  { id: "cc8", nome: "Manutenção e limpeza", tipo: "saida", criado_em: dia(-400) },
  { id: "cc9", nome: "Recebimento de cliente", tipo: "entrada", criado_em: dia(-400) },
];
function nomeDaCategoriaCaixa(id) {
  return categoriasCaixa.find((c) => c.id === id).nome;
}

const totalItens = (o) =>
  o.itens.reduce((s, i) => s + i.quantidade * i.preco_unitario - i.desconto, 0);

// A OS 145 (a frota da Transportes Boa Vista) foi faturada "a receber
// depois": no programa, isso cria a conta a receber e NÃO lança no caixa até
// ela ser recebida. Antes ela estava nos dois ao mesmo tempo (#777, item 4).
const OS_A_RECEBER = "os145";

// As despesas do mês, já com a categoria (#777, item 7): sem ela, a aba
// Saídas mostrava a faixa "8 lançamentos antigos estão sem categoria" e o
// "Por categoria" só tinha "Sem categoria". Sem pagamento de fornecedor de
// peça: o programa já tira do lucro o custo de cada peça vendida, e pagar a
// nota aqui também contava a mesma compra duas vezes (o mês saía com
// prejuízo de R$ 10 mil). O fornecedor a pagar fica em Contas a Pagar.
// Contas do mês, pagas todo mês no mesmo dia (antes só existiam no mês
// corrente: o mês passado ficava sem aluguel nem folha, e o Início dizia
// "lucro −98%" comparando os dois). [descrição, valor, categoria, dia do mês]
const DESPESAS = [
  ["Folha de pagamento", 9700, "cc2", 5],
  ["Aluguel do galpão", 3200, "cc1", 5],
  ["Energia elétrica", 890, "cc3", 10],
  ["Internet e telefone", 240, "cc7", 12],
  ["Material de limpeza", 320, "cc8", 15],
  ["Manutenção do elevador", 680, "cc8", 20],
];
// O dia `diaDoMes` de `mesesAtras` meses atrás, em dias a partir de hoje (só
// os que já passaram), pulando o domingo.
const despesasPagas = [];
for (const mesesAtras of [1, 0]) {
  for (const [descricao, valor, categoria, diaDoMes] of DESPESAS) {
    const quando = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, diaDoMes);
    const meiaNoiteDeHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    if (quando >= meiaNoiteDeHoje) continue;
    const n = Math.round((quando - meiaNoiteDeHoje) / 864e5);
    despesasPagas.push([descricao, valor, categoria, n]);
  }
}

// O lançamento no caixa traz a OS junto (`ordem_servico:ordens_servico_caixa(
// id, numero, tipo, status, cliente_nome, itens)` em src/lib/caixa.ts, #367):
// é dela que o Diário tira o cliente, o número ("OS 145") e o lucro da linha
// (#777, item 2). `cliente_nome` é o que o programa lê; `cliente` e os itens
// inteiros ficam só porque os testes de dados-de-mentira conferem o custo e o
// total em cima deles (o banco falso devolve o que está aqui, sem filtrar colunas).
const ordemNoCaixa = (o) => ({
  id: o.id, numero: o.numero, tipo: o.tipo ?? "os", status: o.status,
  cliente_nome: o.cliente.nome,
  cliente: o.cliente, itens: o.itens,
});
// O programa grava no caixa a CHAVE da forma ("cartao_debito") e o Diário a
// mostra assim, crua (defeito do programa, anotado no relatório da #780).
// Aqui fica o nome, como sempre ficou nos dados de mentira, pra a foto não
// levar o defeito junto; o fechamento do caixa entende os dois.
const FORMAS = ["pix", "cartao_credito", "dinheiro", "cartao_debito"];
const NOME_DA_FORMA = { pix: "Pix", cartao_credito: "Cartão de crédito", dinheiro: "Dinheiro", cartao_debito: "Cartão de débito" };
const vendasNoCaixa = [...historico, ...ordens]
  .filter((o) => o.status === "faturada" && o.id !== OS_A_RECEBER && o.data_fechamento > dia(-60))
  .map((o, i) => {
    const forma = o.tipo === "venda_balcao" ? "dinheiro" : FORMAS[i % FORMAS.length];
    o.forma_pagamento = NOME_DA_FORMA[forma];
    return {
      id: "cx-" + o.id, loja_id: LOJA, data: o.data_fechamento,
      ordem_servico_id: o.id, tipo: "entrada", forma_pagamento: NOME_DA_FORMA[forma],
      valor: totalItens(o),
      descricao: `Faturamento da ${o.tipo === "venda_balcao" ? "Venda" : "OS"} ${o.numero}`,
      categoria_id: null, ordem_servico: ordemNoCaixa(o), categoria: null,
    };
  });

export const caixa = [
  ...vendasNoCaixa,
  // A parcela que a conta a receber `cr3` recebeu (entrada sem OS, com
  // categoria). 40 dias atrás fica sempre fora do mês corrente: dentro dele, ela
  // entraria nas vendas do Início e não na Lucratividade, que só conta OS.
  { id: "cx-cr3", loja_id: LOJA, data: diaAs(-40, 10, 40), ordem_servico_id: null, tipo: "entrada",
    forma_pagamento: "Pix", valor: 720, descricao: "Recebimento: Parcela 2/2 do jogo de amortecedores",
    categoria_id: "cc9", ordem_servico: null, categoria: { nome: "Recebimento de cliente" } },
  ...despesasPagas.map(([descricao, valor, categoria, n], i) => ({
    id: "cx-s" + i, loja_id: LOJA, data: diaDeLojaAs(n, 17, 10 + i),
    ordem_servico_id: null, tipo: "saida", forma_pagamento: "Transferência",
    valor, descricao, categoria_id: categoria, ordem_servico: null,
    categoria: { nome: nomeDaCategoriaCaixa(categoria) },
  })),
];

export const contasPagar = [
  { id: "cp1", loja_id: LOJA, descricao: "Aluguel do galpão", valor: 3200, vencimento: diaCurto(4), categoria_id: "cc1", categoria: { nome: "Aluguel" }, recorrente: true, recorrente_ate: null, status: "pendente", data_pagamento: null, caixa_movimento_id: null, operador_id: OP, criado_em: dia(-30) },
  { id: "cp2", loja_id: LOJA, descricao: "Energia elétrica", valor: 890.4, vencimento: diaCurto(9), categoria_id: "cc3", categoria: { nome: "Energia elétrica" }, recorrente: true, recorrente_ate: null, status: "pendente", data_pagamento: null, caixa_movimento_id: null, operador_id: OP, criado_em: dia(-30) },
  { id: "cp3", loja_id: LOJA, descricao: "Fornecedor de pneus", valor: 4750, vencimento: diaCurto(-2), categoria_id: "cc4", categoria: { nome: "Compra de peças" }, recorrente: false, recorrente_ate: null, status: "pendente", data_pagamento: null, caixa_movimento_id: null, operador_id: OP, criado_em: dia(-20) },
];

export const pecas = [
  { id: "p1", codigo_interno: "PN-17570R14", codigo_barras: "7891234567890", descricao: "Pneu 175/70 R14", marca: "Rovelo", modelo: "RHP-A68", aplicacao: "Gol, Onix, HB20", unidade: "UN", preco_custo: 245, preco_venda: 389.9, ncm: "40111000", cest: "", cfop_padrao: "5102", origem: "0", cst_ou_csosn: "500", aliquota_icms: 18, categoria_id: "cat1", prazo_garantia_dias: 90, estoque_minimo: 8, medida: "175/70 R14", indice_carga_velocidade: "84T", dot: "3823", ativo: true, criado_em: dia(-200) },
  { id: "p2", codigo_interno: "PN-20560R16", codigo_barras: "7891234567891", descricao: "Pneu 205/60 R16", marca: "Pirelli", modelo: "Cinturato P1", aplicacao: "Corolla, Civic, Cruze", unidade: "UN", preco_custo: 410, preco_venda: 612, ncm: "40111000", cest: "", cfop_padrao: "5102", origem: "0", cst_ou_csosn: "500", aliquota_icms: 18, categoria_id: "cat1", prazo_garantia_dias: 90, estoque_minimo: 4, medida: "205/60 R16", indice_carga_velocidade: "92V", dot: "1224", ativo: true, criado_em: dia(-200) },
  { id: "p3", codigo_interno: "AM-DIA-001", codigo_barras: "7891234567892", descricao: "Amortecedor dianteiro", marca: "Cofap", modelo: "GP32812", aplicacao: "Renegade, Compass", unidade: "UN", preco_custo: 298, preco_venda: 445, ncm: "87088000", cest: "", cfop_padrao: "5102", origem: "0", cst_ou_csosn: "500", aliquota_icms: 18, categoria_id: "cat2", prazo_garantia_dias: 180, estoque_minimo: null, medida: null, indice_carga_velocidade: null, dot: null, ativo: true, criado_em: dia(-150) },
  { id: "p4", codigo_interno: "PF-DIA-220", codigo_barras: "7891234567893", descricao: "Pastilha de freio dianteira", marca: "Bosch", modelo: "BN1234", aplicacao: "Onix, Prisma", unidade: "JG", preco_custo: 121, preco_venda: 189.5, ncm: "87083090", cest: "", cfop_padrao: "5102", origem: "0", cst_ou_csosn: "500", aliquota_icms: 18, categoria_id: "cat3", prazo_garantia_dias: 90, estoque_minimo: 2, medida: null, indice_carga_velocidade: null, dot: null, ativo: true, criado_em: dia(-140) },
  { id: "p5", codigo_interno: "BT-60AH", codigo_barras: "7891234567894", descricao: "Bateria 60Ah", marca: "Moura", modelo: "M60GD", aplicacao: "Uso geral", unidade: "UN", preco_custo: 372, preco_venda: 549, ncm: "85071000", cest: "", cfop_padrao: "5102", origem: "0", cst_ou_csosn: "500", aliquota_icms: 18, categoria_id: "cat4", prazo_garantia_dias: 365, estoque_minimo: 1, medida: null, indice_carga_velocidade: null, dot: null, ativo: true, criado_em: dia(-90) },
];

export const servicos = [
  { id: "s1", codigo_interno: "SV-ALIN", descricao: "Alinhamento e balanceamento", preco_padrao: 120, custo: 35, categoria_id: "cs4", ativo: true, criado_em: dia(-300) },
  { id: "s2", codigo_interno: "SV-TROCA-OLEO", descricao: "Troca de óleo e filtro", preco_padrao: 165, custo: 60, categoria_id: "cs5", ativo: true, criado_em: dia(-300) },
  { id: "s3", codigo_interno: "SV-AMORT", descricao: "Troca de amortecedor", preco_padrao: 260, custo: 90, categoria_id: "cs2", ativo: true, criado_em: dia(-300) },
  { id: "s4", codigo_interno: "SV-FREIO", descricao: "Troca de pastilha de freio", preco_padrao: 90, custo: 30, categoria_id: "cs3", ativo: true, criado_em: dia(-300) },
  { id: "s5", codigo_interno: "SV-BAT", descricao: "Instalação de bateria", preco_padrao: 40, custo: 12, categoria_id: "cs5", ativo: true, criado_em: dia(-300) },
];

export const categorias = [
  { id: "cat1", nome: "Pneus", criado_em: dia(-400) },
  { id: "cat2", nome: "Suspensão", criado_em: dia(-400) },
  { id: "cat3", nome: "Freios", criado_em: dia(-400) },
  { id: "cat4", nome: "Elétrica", criado_em: dia(-400) },
];

export const depositos = [{ id: "d1", loja_id: LOJA, nome: "Depósito Principal", ativo: true, criado_em: dia(-400) }];

// O estoque sai das próprias OS: cada peça lançada numa OS (ou vendida no
// balcão) é uma saída, na hora em que foi lançada. Antes eram 9 movimentos
// soltos, e a Bateria vendida hoje duas vezes (OS 143 e Venda 149) nem saía
// do saldo (#777, item 6). O saldo de partida (a contagem geral de 28 dias
// atrás) é calculado pra cada peça terminar no `SALDO_FINAL`.
const SALDO_FINAL = { p1: 18, p2: 10, p3: 6, p4: 8, p5: 7 };
const ENTRADAS = [
  // [peça, quantidade, referência, dias atrás, hora]
  ["p1", 24, "NF 88213", -20, 9],
  ["p2", 16, "NF 88213", -20, 9],
  ["p3", 10, "NF 88410", -12, 10],
  ["p4", 14, "Pedido 32", -13, 15],
  ["p5", 6, "Pedido 32", -13, 15],
  ["p3", 6, "Pedido 33", -6, 11],
];
const movimentosDeEstoque = [];
for (const [peca_id, quantidade, referencia, diasAtras, hora] of ENTRADAS) {
  movimentosDeEstoque.push({ peca_id, tipo: "entrada", quantidade, motivo: "compra", referencia, criado_em: diaAs(diasAtras, hora, 5) });
}
for (const o of [...historico, ...ordens]) {
  if (o.data_abertura < dia(-28)) continue;
  const lancadoEm = new Date(new Date(o.data_abertura).getTime() + 10 * 60 * 1000).toISOString();
  for (const i of o.itens.filter((x) => x.tipo === "peca")) {
    movimentosDeEstoque.push({
      peca_id: i.peca_id, tipo: "saida", quantidade: i.quantidade, motivo: "uso_em_os",
      referencia: `${o.tipo === "venda_balcao" ? "Venda" : "OS"} ${o.numero}`,
      criado_em: lancadoEm < dia(0) ? lancadoEm : o.data_abertura,
    });
  }
}
// A contagem que achou um pneu a menos lança o ajuste, como o programa faz
// (src/lib/contagens.ts) — antes a contagem dizia -1 e o saldo nem mexia.
const CONTAGEM_COM_DIFERENCA = { peca_id: "p1", em: diaAs(-3, 18, 30), diferenca: -1 };
movimentosDeEstoque.push({
  peca_id: "p1", tipo: "saida", quantidade: 1, motivo: "ajuste",
  referencia: "Ajuste por contagem de estoque", criado_em: diaAs(-3, 18, 31),
});
const delta = (m) => (m.tipo === "entrada" ? m.quantidade : -m.quantidade);
movimentosDeEstoque.sort((a, b) => (a.criado_em < b.criado_em ? -1 : 1));
for (const peca_id of Object.keys(SALDO_FINAL)) {
  // Sem a partida, o saldo andaria assim; a partida cobre o ponto mais baixo
  // (nunca fica negativo, e sobram ao menos 2) e, se der, termina no alvo.
  let semPartida = 0;
  let maisBaixo = 0;
  for (const m of movimentosDeEstoque.filter((x) => x.peca_id === peca_id)) {
    semPartida += delta(m);
    maisBaixo = Math.min(maisBaixo, semPartida);
  }
  movimentosDeEstoque.push({
    peca_id, tipo: "entrada", quantidade: Math.max(SALDO_FINAL[peca_id] - semPartida, 2 - maisBaixo), motivo: "ajuste",
    referencia: "Contagem geral do estoque", criado_em: diaAs(-28, 8, 0),
  });
}
movimentosDeEstoque.sort((a, b) => (a.criado_em < b.criado_em ? -1 : 1));

export const estoque = movimentosDeEstoque.map((m, i) => ({
  id: "e" + String(i + 1).padStart(3, "0"), loja_id: LOJA, deposito_id: "d1", ...m,
}));

const saldoAntesDe = (peca_id, momento) =>
  estoque.filter((m) => m.peca_id === peca_id && m.criado_em < momento).reduce((t, m) => t + delta(m), 0);

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
  { id: "cr1", loja_id: LOJA, cliente_id: "c2", ordem_servico_id: "os145", descricao: "Faturamento da OS 145", valor: 2588, vencimento: diaCurto(6), status: "pendente", data_recebimento: null, caixa_movimento_id: null, operador_id: OP, criado_em: dia(-0.3), cliente: { nome: "Transportes Boa Vista Ltda" } },
  { id: "cr2", loja_id: LOJA, cliente_id: "c4", ordem_servico_id: null, descricao: "Serviço faturado no fim do mês (frota)", valor: 1340, vencimento: diaCurto(-3), status: "pendente", data_recebimento: null, caixa_movimento_id: null, operador_id: OP, criado_em: dia(-18), cliente: { nome: "Eduardo Salles" } },
  { id: "cr3", loja_id: LOJA, cliente_id: "c1", ordem_servico_id: null, descricao: "Parcela 2/2 do jogo de amortecedores", valor: 720, vencimento: diaCurto(-41), status: "recebido", data_recebimento: diaLocal(diaAs(-40, 10, 40)), caixa_movimento_id: "cx-cr3", operador_id: OP, criado_em: dia(-70), cliente: { nome: "Ricardo Menezes" } },
];

const competenciaDe = (iso) => diaLocal(iso).slice(0, 8) + "01";
const mesCompetencia = (n) => {
  const d = new Date(hoje);
  d.setMonth(d.getMonth() + n, 1);
  return d.toLocaleDateString("sv-SE");
};

const nota = ({ id, tipo, competencia, numero, origem, status, ordem, criadoEm }) => {
  const nome = tipo === "nfe"
    ? `NFCe-${String(numero).padStart(9, "0")}.xml`
    : `NFSe-${String(numero).padStart(8, "0")}.xml`;
  return {
    id, loja_id: LOJA, tipo, competencia, nome_arquivo: nome,
    storage_path: `${tipo}/${competencia.slice(0, 7)}/${id}-${nome}`,
    ordem_servico_id: ordem?.id ?? null, operador_id: OP, criado_em: criadoEm,
    origem, numero, chave_acesso: numero ? "3526" + String(numero).padStart(40, "0") : null,
    status, focus_nfe_ref: origem === "automatica" ? `${ordem.id}-${tipo === "nfe" ? "nfce" : "nfse"}-${numero}` : null,
    ordem_servico: ordem ? { cliente_nome: ordem.cliente.nome } : null,
    operador: { nome: "Marcos Andrade" },
  };
};

// Cada OS faturada tem as notas dela, LIGADAS a ela (`ordem_servico_id`):
// NFC-e se tem peça, NFS-e se tem serviço, na ordem em que foram fechadas.
// Antes as notas não eram de OS nenhuma e o banco falso devolvia todas pra
// qualquer OS: a venda 149 dizia "falta NFC-e" e "Todas as notas já foram
// emitidas" na mesma tela, com "Ver PDF da NFS-e" duas vezes (#777, item 1).
// A OS 143 teve a primeira NFC-e cancelada e emitida de novo, pra a tela de
// Notas ter uma cancelada sem a OS ficar devendo nota.
const notasDasOrdens = [];
{
  // Numeração das notas longe da das OS, pra "NFS-e 141" não parecer a OS 141.
  let nfce = 2100;
  let nfse = 600;
  const faturadas = [...historico, ...ordens]
    .filter((o) => o.status === "faturada")
    .sort((a, b) => (a.data_fechamento < b.data_fechamento ? -1 : 1));
  for (const o of faturadas) {
    const emitir = (tipo, status = "autorizado") => {
      const numero = tipo === "nfe" ? ++nfce : ++nfse;
      notasDasOrdens.push(nota({
        id: `nf-${tipo}-${numero}`, tipo, competencia: competenciaDe(o.data_fechamento), numero,
        origem: "automatica", status, ordem: o, criadoEm: o.data_fechamento,
      }));
    };
    if (o.itens.some((i) => i.tipo === "peca")) {
      if (o.numero === 143) emitir("nfe", "cancelado");
      emitir("nfe");
    }
    if (o.itens.some((i) => i.tipo === "servico")) emitir("nfse");
  }
}

export const notasFiscais = [
  ...notasDasOrdens,
  // XML que o contador mandou à mão, sem OS: é o "Enviada à mão" da lista.
  nota({ id: "nf-manual-1", tipo: "nfe", competencia: mesCompetencia(-1), numero: 2051, origem: "manual", status: null, ordem: null, criadoEm: dia(-35) }),
  nota({ id: "nf-manual-2", tipo: "nfse", competencia: mesCompetencia(-1), numero: 571, origem: "manual", status: null, ordem: null, criadoEm: dia(-35) }),
];

export const auditoria = [
  { id: "au1", tabela: "pecas", registro_id: "p1", acao: "atualizar", operador_id: OP, criado_em: dia(-0.1), operador_nome: "Marcos Andrade", dados_antes: { descricao: "Pneu 175/70 R14", estoque_minimo: 6 }, dados_depois: { descricao: "Pneu 175/70 R14", estoque_minimo: 8 } },
  { id: "au2", tabela: "ordens_servico", registro_id: "os146", acao: "atualizar", operador_id: OP, criado_em: dia(-0.4), operador_nome: "Marcos Andrade", dados_antes: { numero: 146, status: "em_andamento" }, dados_depois: { numero: 146, status: "concluida" } },
  { id: "au3", tabela: "contas_pagar", registro_id: "cp9", acao: "excluir", operador_id: OP2, criado_em: diaAs(-1, 15, 12), operador_nome: "Bruna Tavares", dados_antes: { descricao: "Assinatura de software (duplicada)", valor: 149 }, dados_depois: null },
  { id: "au4", tabela: "clientes", registro_id: "c3", acao: "atualizar", operador_id: OP2, criado_em: diaAs(-2, 10, 47), operador_nome: "Bruna Tavares", dados_antes: { nome: "Juliana Prado", telefone: "(16) 98111-0000" }, dados_depois: { nome: "Juliana Prado", telefone: "(16) 98111-2233" } },
  { id: "au5", tabela: "operadores", registro_id: OP2, acao: "atualizar", operador_id: OP, criado_em: dia(-5), operador_nome: "Marcos Andrade", dados_antes: { usuario: "bruna", admin: false }, dados_depois: { usuario: "bruna", admin: true } },
];

// O saldo do sistema de cada contagem é o saldo de verdade naquela hora,
// tirado dos movimentos acima.
const contagem = (id, peca_id, em, diferenca, observacao) => {
  const saldo = saldoAntesDe(peca_id, em);
  return {
    id, loja_id: LOJA, deposito_id: "d1", peca_id, quantidade_contada: saldo + diferenca,
    saldo_sistema: saldo, diferenca, observacao, operador_id: OP, criado_em: em,
  };
};
export const contagens = [
  contagem("cg1", "p1", CONTAGEM_COM_DIFERENCA.em, CONTAGEM_COM_DIFERENCA.diferenca, "Um pneu estava no setor de montagem."),
  contagem("cg2", "p4", diaAs(-3, 18, 40), 0, ""),
  contagem("cg3", "p5", diaAs(-10, 18, 0), 0, ""),
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
for (const o of [...historico, ...ordens]) {
  for (const i of o.itens) {
    if (i.peca_id) {
      i.peca = { prazo_garantia_dias: pecas.find((p) => p.id === i.peca_id)?.prazo_garantia_dias ?? 90 };
    }
  }
}

// Tabela "achatada" dos itens das OS — é o que a tela de Garantias consulta
// direto (a garantia não tem tabela própria: sai do item de peça + o prazo
// cadastrado na peça + a data em que a OS foi fechada).
export const ordensItens = [...historico, ...ordens].flatMap((o) =>
  o.itens.map((i) => ({
    ...i,
    ordem_servico_id: o.id,
    ordem: {
      id: o.id,
      // OS aberta fica sem data de fechamento: o programa tira da tela de
      // Garantias (src/lib/garantias.ts) o que ainda não foi fechado.
      status: o.status,
      data_fechamento: o.data_fechamento,
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

// Fechamentos de caixa (TR-06.4, migration 0058): os três últimos dias de
// loja aberta, um que bateu, um com falta e um com sobra — a aba Fechamento
// mostra o histórico e a soma das diferenças. O esperado é o que o programa
// calcula (`resumirDiaParaFechamento`): o fundo de troco + o dinheiro do dia.
const FUNDO_DE_TROCO = 100;
const dinheiroDoDia = (data) =>
  caixa
    .filter((m) => diaLocal(m.data) === data && /dinheiro/i.test(m.forma_pagamento ?? ""))
    .reduce((t, m) => t + (m.tipo === "entrada" ? m.valor : -m.valor), 0);
const fechamentosCaixa = [
  { diferenca: 0, obs: null },
  { diferenca: -12.5, obs: "Troco de R$ 12,50 dado a mais pro cliente da tarde" },
  { diferenca: 5, obs: null },
].map((f, i) => {
  const n = DIAS_DE_LOJA[DIAS_DE_LOJA.length - 1 - i];
  const data = diaLocal(diaAs(n, 18, 0));
  const esperado = Math.round((FUNDO_DE_TROCO + dinheiroDoDia(data)) * 100) / 100;
  return {
    id: `fc-${i}`, loja_id: LOJA, data, fundo_troco: FUNDO_DE_TROCO,
    saldo_sistema: esperado, valor_contado: Math.round((esperado + f.diferenca) * 100) / 100,
    diferenca: f.diferenca,
    totais_por_forma: {}, observacao: f.obs, caixa_movimento_id: null,
    operador_id: OP, criado_em: diaAs(n, 18, 5), operador: { nome: "Marcos Andrade" },
  };
});

// Um pagamento de comissão do mês passado (TL-46.1, migration 0059) — a aba
// Comissões mostra o histórico e o recibo a partir dele. Cita duas OS de
// verdade, fechadas dentro do período pago (antes eram números fixos, que o
// relógio levava pra fora do período), com 10% do lucro de cada uma.
const primeiroDoMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
const ultimoDoMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
const inicioPago = primeiroDoMesPassado.toLocaleDateString("sv-SE");
const fimPago = ultimoDoMesPassado.toLocaleDateString("sv-SE");
const custoDoItem = (i) =>
  i.peca_id ? pecas.find((p) => p.id === i.peca_id).preco_custo : servicos.find((x) => x.id === i.servico_id).custo;
const snapshotPago = historico
  .filter((o) => diaLocal(o.data_fechamento) >= inicioPago && diaLocal(o.data_fechamento) <= fimPago)
  .slice(0, 2)
  .map((o) => ({
    ordemId: o.id, numero: o.numero, papel: "tecnico",
    comissao: Math.round(0.1 * o.itens.reduce((t, i) => t + i.quantidade * (i.preco_unitario - custoDoItem(i)), 0) * 100) / 100,
  }));
const totalPago = Math.round(snapshotPago.reduce((t, l) => t + l.comissao, 0) * 100) / 100;
// Pago no dia 5 deste mês (ou hoje, se ainda não chegou o dia 5).
const diaDoPagamento = Math.min(hoje.getDate(), 5);
const comissoesPagas = [{
  id: "cp-1", loja_id: LOJA, funcionario_id: "f1", funcionario_nome: "Anderson Lima",
  periodo_inicio: inicioPago,
  periodo_fim: fimPago,
  percentual: 10, valor_calculado: totalPago, valor_pago: totalPago,
  data_pagamento: new Date(hoje.getFullYear(), hoje.getMonth(), diaDoPagamento).toLocaleDateString("sv-SE"),
  observacao: null,
  snapshot: snapshotPago,
  operador_id: OP, criado_em: diaAs(diaDoPagamento - hoje.getDate(), 9, 30),
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

// As janelas das OS (migration 0075, #367): cada tela que não é a de OS lê a
// sua, com só as colunas dela. O banco falso devolve a tabela inteira sem
// olhar o `select`, então aqui ficam as linhas no formato de cada view.
const todasAsOrdens = [...ordens, ...historico, ...ordensDeQuemSumiu, ...orcamentos];
const sub = (item, campos) => Object.fromEntries(campos.map((c) => [c, item[c] ?? null]));
const janelaOrdensCaixa = todasAsOrdens.map((o) => ({
  id: o.id, loja_id: o.loja_id, numero: o.numero, tipo: o.tipo ?? "os", status: o.status,
  cliente_nome: o.cliente.nome,
  itens: o.itens.map((i) => sub(i, ["quantidade", "preco_unitario", "desconto"])),
}));
const janelaOrdensComissoes = todasAsOrdens
  .filter((o) => o.status === "faturada")
  .map((o) => ({
    id: o.id, loja_id: o.loja_id, numero: o.numero, tipo: o.tipo ?? "os", status: o.status,
    data_abertura: o.data_abertura, data_fechamento: o.data_fechamento,
    vendedor_id: o.vendedor_id, cliente_nome: o.cliente.nome,
    itens: o.itens.map((i) =>
      sub(i, ["id", "tipo", "peca_id", "servico_id", "quantidade", "preco_unitario", "desconto", "custo_unitario", "tecnico_id"]),
    ),
  }));
const janelaOrdensGarantias = todasAsOrdens.flatMap((o) =>
  o.itens
    .filter((i) => i.tipo === "peca")
    .map((i) => {
      const peca = pecas.find((p) => p.id === i.peca_id);
      return {
        id: i.id, quantidade: i.quantidade, peca_id: i.peca_id,
        peca_descricao: peca ? peca.descricao : null,
        prazo_garantia_dias: peca ? (peca.prazo_garantia_dias ?? null) : null,
        ordem_servico_id: o.id, ordem_status: o.status, ordem_data_fechamento: o.data_fechamento,
        loja_id: o.loja_id, cliente_nome: o.cliente.nome,
        veiculo_id: o.veiculo_id, veiculo_placa: o.veiculo ? o.veiculo.placa : null,
      };
    }),
);
const janelaOrdensNotas = todasAsOrdens.map((o) => ({
  id: o.id, loja_id: o.loja_id, numero: o.numero, tipo: o.tipo ?? "os", status: o.status,
  data_abertura: o.data_abertura, cliente_nome: o.cliente.nome,
}));
const janelaOrdensClientes = todasAsOrdens.map((o) => ({
  id: o.id, loja_id: o.loja_id, numero: o.numero, tipo: o.tipo ?? "os", status: o.status,
  data_abertura: o.data_abertura, data_fechamento: o.data_fechamento,
  cliente_id: o.cliente_id, cliente_nome: o.cliente.nome,
  veiculo_id: o.veiculo_id, km_entrada: o.km_entrada,
  veiculo_placa: o.veiculo ? o.veiculo.placa : null,
  veiculo_marca: o.veiculo ? o.veiculo.marca : null,
  veiculo_modelo: o.veiculo ? o.veiculo.modelo : null,
  itens: o.itens.map((i) => ({
    ...sub(i, ["id", "tipo", "peca_id", "descricao", "quantidade", "preco_unitario", "desconto"]),
    prazo_garantia_dias: i.peca ? (i.peca.prazo_garantia_dias ?? null) : null,
  })),
}));

export const TABELAS = {
  computadores,
  schema_versao: schemaVersao,
  lojas, clientes, pecas, servicos, depositos,
  // A janela de peças e o saldo pronto (migration 0073, #366): é por eles que
  // a OS, o balcão, o pedido de compra e a nota leem. Sem eles as telas
  // geradas abririam sem peça nenhuma pra escolher.
  pecas_janela: pecas.map((p) => ({
    id: p.id,
    codigo_interno: p.codigo_interno ?? null,
    codigo_barras: p.codigo_barras ?? null,
    descricao: p.descricao,
    marca: p.marca ?? null,
    modelo: p.modelo ?? null,
    medida: p.medida ?? null,
    unidade: p.unidade ?? null,
    preco_venda: p.preco_venda ?? null,
    prazo_garantia_dias: p.prazo_garantia_dias ?? null,
    ativo: p.ativo ?? true,
    sem_custo: p.preco_custo == null || p.preco_custo === 0,
  })),
  estoque_saldos: saldosDeEstoque(),
  // Cópia com o dono embutido (a ficha do veículo pede
  // `cliente:clientes(...)`). Cópia, e não o próprio objeto: o cliente já
  // carrega a lista de veículos dele, e os dois apontando um pro outro não
  // viram JSON.
  veiculos: veiculos.map((v) => {
    const c = clientes.find((cl) => cl.id === v.cliente_id);
    return { ...v, cliente: c ? { id: c.id, nome: c.nome, telefone: c.telefone } : null };
  }),
  ordens_servico: todasAsOrdens,
  ordens_servico_itens: ordensItens,
  ordens_servico_caixa: janelaOrdensCaixa,
  ordens_servico_comissoes: janelaOrdensComissoes,
  ordens_servico_garantias: janelaOrdensGarantias,
  ordens_servico_notas: janelaOrdensNotas,
  ordens_servico_clientes: janelaOrdensClientes,
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
  // As da #366 (migration 0073) respondem conforme o pedido: função aqui
  // recebe o corpo da chamada.
  custo_das_ordens: ({ p_ordens }) => custoDasOrdens(p_ordens ?? []),
  dados_fiscais_das_pecas: ({ p_pecas }) =>
    pecas
      .filter((p) => (p_pecas ?? []).includes(p.id))
      .map(({ id, codigo_interno, codigo_barras, descricao, unidade, ncm, cest, cfop_padrao, origem, cst_ou_csosn, aliquota_icms }) => ({
        id, codigo_interno, codigo_barras, descricao, unidade, ncm, cest, cfop_padrao, origem, cst_ou_csosn, aliquota_icms,
      })),
  cadastrar_peca_rapida: "00000000-0000-0000-0000-0000000d3366",
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

// O saldo por peça e loja, a mesma conta da view `estoque_saldos` (0073).
function saldosDeEstoque() {
  const saldos = new Map();
  for (const m of estoque) {
    const chave = `${m.peca_id}|${m.loja_id}`;
    const sinal = m.tipo === "entrada" ? 1 : -1;
    saldos.set(chave, (saldos.get(chave) ?? 0) + sinal * Number(m.quantidade));
  }
  return [...saldos].map(([chave, saldo]) => {
    const [peca_id, loja_id] = chave.split("|");
    return { peca_id, loja_id, saldo };
  });
}

// O custo de cada OS, a mesma regra da função `custo_das_ordens` (0073) e do
// custoUnitarioDoItem do programa.
function custoDasOrdens(ids) {
  return ids.map((id) => {
    let custo = 0;
    let completo = true;
    for (const i of ordensItens.filter((item) => item.ordem_servico_id === id)) {
      let unitario;
      if (i.tipo === "servico") unitario = servicos.find((s) => s.id === i.servico_id)?.custo ?? 0;
      else if (!i.peca_id) {
        if (i.custo_unitario == null) completo = false;
        unitario = i.custo_unitario ?? 0;
      } else unitario = pecas.find((p) => p.id === i.peca_id)?.preco_custo ?? 0;
      custo += Number(i.quantidade) * unitario;
    }
    return { ordem_servico_id: id, custo, custo_completo: completo };
  });
}
