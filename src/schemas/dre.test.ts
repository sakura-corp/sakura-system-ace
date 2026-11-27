import { describe, expect, it } from "vitest";
import {
  MAXIMO_DE_MESES,
  mesesEntre,
  montarDre,
  rotuloDoMes,
  ultimosMeses,
  type CategoriaDoDre,
  type Dre,
  type EntradaDoDre,
  type LinhaDre,
  type MovimentoDoDre,
  type TaxaGravada,
} from "./dre";
import { custoDaOrdemPelosMapas, resumirMovimentos } from "./metricasCaixa";
import { resumoDoPeriodo } from "./relacoes";
import type { MovimentoCaixa } from "@/types/caixa";
import type { ItemOS, OrdemServico } from "@/types/os";
import { paraCentavos } from "./dinheiro";

// #388: o DRE do mês. Loja inventada; nenhum número de loja de verdade.

describe("os meses do DRE", () => {
  it("ultimosMeses: os n meses que terminam no mês de hoje, do mais velho pro mais novo", () => {
    expect(ultimosMeses("2026-11-27", 6)).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(ultimosMeses("2026-02-10", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(ultimosMeses("2026-02-10", 1)).toEqual(["2026-02"]);
  });

  it("mesesEntre: de e até inclusive, vazio ao contrário, e no máximo os 24 mais novos", () => {
    expect(mesesEntre("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(mesesEntre("2026-03", "2026-03")).toEqual(["2026-03"]);
    expect(mesesEntre("2026-03", "2026-02")).toEqual([]);
    const longo = mesesEntre("2024-01", "2026-12");
    expect(MAXIMO_DE_MESES).toBe(24);
    expect(longo).toHaveLength(24);
    expect(longo[0]).toBe("2025-01");
    expect(longo[23]).toBe("2026-12");
  });

  it("rotuloDoMes: três letras minúsculas e o ano com dois dígitos", () => {
    expect(rotuloDoMes("2026-11")).toBe("nov/26");
    expect(rotuloDoMes("2027-03")).toBe("mar/27");
    expect(rotuloDoMes("2026-01")).toBe("jan/26");
    expect(rotuloDoMes("2026-12")).toBe("dez/26");
  });
});

// ---------------------------------------------------------------------------
// A loja inventada: setembro e outubro de 2026.
// Meio-dia em UTC: cai no mesmo dia em São Paulo e em UTC (test:fusos).

function item(parcial: Partial<ItemOS>): ItemOS {
  return {
    id: "i",
    ordem_servico_id: "os",
    tipo: "peca",
    peca_id: "pneu",
    servico_id: null,
    tecnico_id: null,
    descricao: "Pneu",
    quantidade: 1,
    preco_unitario: 300,
    desconto: 0,
    ...parcial,
  };
}

const alinhamento = (parcial: Partial<ItemOS> = {}) =>
  item({ tipo: "servico", peca_id: null, servico_id: "alinhamento", descricao: "Alinhamento", preco_unitario: 80, ...parcial });

function ordem(id: string, dia: string, itens: ItemOS[], parcial: Partial<OrdemServico> = {}): OrdemServico {
  return {
    id,
    numero: Number(id.replace(/\D/g, "")) || 1,
    loja_id: "loja",
    cliente_id: "cli",
    veiculo_id: null,
    status: "faturada",
    km_entrada: null,
    descricao_problema: null,
    forma_pagamento: null,
    parcelas: 1,
    data_abertura: `${dia}T12:00:00.000Z`,
    data_fechamento: null,
    vendedor_id: null,
    criado_por_id: null,
    atualizado_por_id: null,
    itens,
    ...parcial,
  };
}

function mov(
  id: string,
  dia: string,
  tipo: "entrada" | "saida",
  valor: number,
  parcial: Partial<MovimentoDoDre> = {},
): MovimentoDoDre {
  return {
    id,
    data: `${dia}T12:00:00.000Z`,
    tipo,
    valor,
    ordem_servico_id: null,
    forma_pagamento: "dinheiro",
    categoria_id: null,
    descricao: null,
    ...parcial,
  };
}

const custoPeca = new Map([
  ["pneu", 200],
  ["valvula", 5],
]);
const custoServico = new Map([["alinhamento", 30]]);

const categorias: CategoriaDoDre[] = [
  { id: "c-aluguel", nome: "Aluguel", grupo: "despesas_administrativas" },
  { id: "c-energia", nome: "Energia", grupo: "despesas_administrativas" },
  { id: "c-salarios", nome: "Salários", grupo: "despesas_pessoal" },
  { id: "c-anuncio", nome: "Anúncio", grupo: "despesas_comerciais" },
  { id: "c-simples", nome: "Simples Nacional", grupo: "deducoes_venda" },
  { id: "c-frete", nome: "Frete de compra", grupo: "custos" },
  { id: "c-sucata", nome: "Venda de sucata", grupo: "outras_receitas" },
  { id: "c-multa", nome: "Multa", grupo: "outras_despesas" },
  { id: "c-juros", nome: "Juros recebidos", grupo: "receitas_financeiras" },
  { id: "c-tarifa", nome: "Tarifa bancária", grupo: "despesas_financeiras" },
  { id: "c-retirada", nome: "Retirada do dono", grupo: "fora_do_resultado" },
  { id: "c-aporte", nome: "Aporte do dono", grupo: "fora_do_resultado" },
  { id: "c-diversos", nome: "Diversos", grupo: "a_classificar" },
];

// Setembro: os-1 vende 680 (custo 430), os-2 vende 110 (custo 50).
// Outubro: os-3 vende 460 (custo 260); os-4 é orçamento e não conta.
const ordens: OrdemServico[] = [
  ordem("os-1", "2026-09-10", [item({ quantidade: 2 }), alinhamento()]),
  ordem("os-2", "2026-09-20", [
    item({ peca_id: "valvula", descricao: "Válvula", quantidade: 4, preco_unitario: 10 }),
    alinhamento({ desconto: 10 }),
  ]),
  ordem("os-3", "2026-10-05", [item({}), alinhamento({ quantidade: 2 })], { status: "concluida" }),
  ordem("os-4", "2026-10-08", [item({ quantidade: 4 })], { status: "orcamento" }),
];

const movimentos: MovimentoDoDre[] = [
  // Pagamentos das OS (a venda vem das OS, não daqui).
  mov("m1", "2026-09-10", "entrada", 680, { ordem_servico_id: "os-1", forma_pagamento: "cartao_credito" }),
  mov("m2", "2026-09-20", "entrada", 50, { ordem_servico_id: "os-2" }),
  // os-2 (aberta em setembro) termina de pagar em outubro, no débito, sem taxa.
  mov("m3", "2026-10-02", "entrada", 60, { ordem_servico_id: "os-2", forma_pagamento: "cartao_debito" }),
  mov("m4", "2026-10-05", "entrada", 460, { ordem_servico_id: "os-3", forma_pagamento: "cartao_credito" }),
  // Pagamento de orçamento com taxa: não conta em nada.
  mov("m5", "2026-10-08", "entrada", 50, { ordem_servico_id: "os-4", forma_pagamento: "cartao_credito" }),
  // Correção da OS 3 (#1182): entrada da diferença, não é venda no cartão.
  mov("m6", "2026-10-20", "entrada", 20, {
    ordem_servico_id: "os-3",
    forma_pagamento: "cartao_credito",
    descricao: "Correção da OS 3",
  }),
  // Devolução da correção da OS 1: não é despesa.
  mov("m7", "2026-10-15", "saida", 15, { ordem_servico_id: "os-1", descricao: "Devolução da correção da OS 1" }),

  // Setembro, lançamentos do Caixa.
  mov("s1", "2026-09-05", "saida", 1500, { categoria_id: "c-aluguel" }),
  mov("s2", "2026-09-12", "saida", 200, { categoria_id: "c-energia" }),
  mov("s3", "2026-09-30", "saida", 1000, { categoria_id: "c-salarios" }),
  mov("s4", "2026-09-20", "saida", 68, { categoria_id: "c-simples" }),
  mov("s5", "2026-09-15", "saida", 25, { categoria_id: "c-frete" }),
  mov("s6", "2026-09-18", "entrada", 40, { categoria_id: "c-sucata" }),
  mov("s7", "2026-09-28", "saida", 3.5, { categoria_id: "c-tarifa" }),
  mov("s8", "2026-09-29", "saida", 500, { categoria_id: "c-retirada" }),
  mov("s9", "2026-09-10", "saida", 30, { categoria_id: "c-diversos" }),
  mov("s10", "2026-09-11", "saida", 12),

  // Outubro.
  mov("o1", "2026-10-05", "saida", 1500, { categoria_id: "c-aluguel" }),
  mov("o2", "2026-10-12", "saida", 250, { categoria_id: "c-energia" }),
  // Estorno da energia: entrada em grupo de saída desconta.
  mov("o3", "2026-10-13", "entrada", 10, { categoria_id: "c-energia" }),
  mov("o4", "2026-10-30", "saida", 1000, { categoria_id: "c-salarios" }),
  mov("o5", "2026-10-20", "saida", 46, { categoria_id: "c-simples" }),
  mov("o6", "2026-10-22", "saida", 100, { categoria_id: "c-anuncio" }),
  mov("o7", "2026-10-31", "entrada", 5.25, { categoria_id: "c-juros" }),
  mov("o8", "2026-10-25", "saida", 80, { categoria_id: "c-multa" }),
  mov("o9", "2026-10-01", "entrada", 300, { categoria_id: "c-aporte" }),
  mov("o10", "2026-10-03", "entrada", 20, { categoria_id: "c-diversos" }),
  mov("o11", "2026-10-04", "saida", 7, { categoria_id: "c-que-sumiu" }),

  // Fora dos meses pedidos: não entram.
  mov("f1", "2026-08-31", "saida", 999, { categoria_id: "c-aluguel" }),
  mov("f2", "2026-11-01", "saida", 999, { categoria_id: "c-aluguel" }),
  mov("f3", "2026-11-01", "saida", 999),
];

const taxas: TaxaGravada[] = [
  { movimento_id: "m1", valor_taxa: 20.4 },
  { movimento_id: "m5", valor_taxa: 1.5 },
];

const entradaDaLoja: EntradaDoDre = {
  meses: ["2026-09", "2026-10"],
  ordens,
  movimentos,
  categorias,
  taxas,
  custoPeca,
  custoServico,
};

function acharLinha(linhas: readonly LinhaDre[], chave: string): LinhaDre | undefined {
  for (const l of linhas) {
    if (l.chave === chave) return l;
    const filha = acharLinha(l.filhas, chave);
    if (filha) return filha;
  }
  return undefined;
}

function linha(dre: Dre, chave: string): LinhaDre {
  const achada = acharLinha(dre.linhas, chave);
  if (!achada) throw new Error(`linha ${chave} não existe`);
  return achada;
}

/** [setembro, outubro, total] */
function valores(dre: Dre, chave: string): number[] {
  return linha(dre, chave).colunas.map((c) => c.valor);
}

function todasAsLinhas(linhas: readonly LinhaDre[]): LinhaDre[] {
  return linhas.flatMap((l) => [l, ...todasAsLinhas(l.filhas)]);
}

describe("montarDre: a loja inventada de setembro e outubro", () => {
  const dre = montarDre(entradaDaLoja);

  it("as 13 linhas de topo, na ordem, com rótulo e sinal", () => {
    expect(dre.meses).toEqual(["2026-09", "2026-10"]);
    expect(dre.linhas.map((l) => [l.chave, l.rotulo, l.sinal])).toEqual([
      ["receita_bruta", "Receita bruta", "+"],
      ["deducoes", "Deduções", "-"],
      ["receita_liquida", "Receita líquida", "="],
      ["custo_vendido", "Custo do que foi vendido", "-"],
      ["resultado_bruto", "Resultado bruto", "="],
      ["despesas_operacionais", "Despesas operacionais", "-"],
      ["lucro_operacional", "Lucro operacional", "="],
      ["outras_receitas", "Outras receitas", "+"],
      ["outras_despesas", "Outras despesas", "-"],
      ["resultado_antes_financeiro", "Resultado antes do financeiro", "="],
      ["receitas_financeiras", "Receitas financeiras", "+"],
      ["despesas_financeiras", "Despesas financeiras", "-"],
      ["resultado_do_mes", "Resultado do mês", "="],
    ]);
    for (const l of todasAsLinhas(dre.linhas)) expect(l.colunas).toHaveLength(3);
  });

  it("a receita bruta e o custo, separados em peça e serviço", () => {
    expect(valores(dre, "receita_bruta")).toEqual([790, 460, 1250]);
    expect(valores(dre, "venda_produtos")).toEqual([640, 300, 940]);
    expect(valores(dre, "venda_servicos")).toEqual([150, 160, 310]);
    expect(linha(dre, "receita_bruta").filhas.map((f) => f.rotulo)).toEqual([
      "Venda de produtos",
      "Venda de serviços",
    ]);

    expect(valores(dre, "custo_vendido")).toEqual([505, 260, 765]);
    expect(valores(dre, "custo_pecas")).toEqual([420, 200, 620]);
    expect(valores(dre, "custo_servicos")).toEqual([60, 60, 120]);
    expect(valores(dre, "categoria:c-frete")).toEqual([25, 0, 25]);
    expect(linha(dre, "custo_vendido").filhas.map((f) => [f.chave, f.rotulo])).toEqual([
      ["custo_pecas", "Custo das peças"],
      ["custo_servicos", "Custo dos serviços"],
      ["categoria:c-frete", "Frete de compra"],
    ]);
  });

  it("as deduções: a taxa da maquininha no mês da OS e o imposto", () => {
    expect(valores(dre, "taxa_maquininha")).toEqual([20.4, 0, 20.4]);
    expect(valores(dre, "categoria:c-simples")).toEqual([68, 46, 114]);
    expect(valores(dre, "deducoes")).toEqual([88.4, 46, 134.4]);
    expect(linha(dre, "deducoes").filhas.map((f) => [f.chave, f.rotulo])).toEqual([
      ["taxa_maquininha", "Taxa da maquininha"],
      ["categoria:c-simples", "Simples Nacional"],
    ]);
    expect(valores(dre, "receita_liquida")).toEqual([701.6, 414, 1115.6]);
    expect(valores(dre, "resultado_bruto")).toEqual([196.6, 154, 350.6]);
  });

  it("as despesas operacionais nos três grupos, cada um com as categorias dele", () => {
    expect(linha(dre, "despesas_operacionais").filhas.map((f) => [f.chave, f.rotulo])).toEqual([
      ["despesas_pessoal", "Despesas com pessoal"],
      ["despesas_administrativas", "Despesas administrativas"],
      ["despesas_comerciais", "Despesas comerciais"],
    ]);
    expect(valores(dre, "despesas_pessoal")).toEqual([1000, 1000, 2000]);
    // Energia de outubro: 250 − 10 de estorno.
    expect(valores(dre, "despesas_administrativas")).toEqual([1700, 1740, 3440]);
    expect(valores(dre, "despesas_comerciais")).toEqual([0, 100, 100]);
    expect(valores(dre, "despesas_operacionais")).toEqual([2700, 2840, 5540]);
    // A de maior total primeiro.
    expect(linha(dre, "despesas_administrativas").filhas.map((f) => f.rotulo)).toEqual(["Aluguel", "Energia"]);
    expect(valores(dre, "categoria:c-energia")).toEqual([200, 240, 440]);
    expect(valores(dre, "lucro_operacional")).toEqual([-2503.4, -2686, -5189.4]);
  });

  it("o resto do caminho até o resultado do mês", () => {
    expect(valores(dre, "outras_receitas")).toEqual([40, 0, 40]);
    expect(valores(dre, "outras_despesas")).toEqual([0, 80, 80]);
    expect(valores(dre, "resultado_antes_financeiro")).toEqual([-2463.4, -2766, -5229.4]);
    expect(valores(dre, "receitas_financeiras")).toEqual([0, 5.25, 5.25]);
    expect(valores(dre, "despesas_financeiras")).toEqual([3.5, 0, 3.5]);
    expect(valores(dre, "resultado_do_mes")).toEqual([-2466.9, -2760.75, -5227.65]);
    expect(linha(dre, "outras_receitas").filhas.map((f) => f.rotulo)).toEqual(["Venda de sucata"]);
    expect(linha(dre, "receitas_financeiras").filhas.map((f) => f.rotulo)).toEqual(["Juros recebidos"]);
  });

  it("os dois percentuais, numa linha de despesa", () => {
    const comerciais = linha(dre, "despesas_comerciais").colunas;
    // outubro: 100 de 460 de receita e de 154 de resultado bruto.
    expect(comerciais[1].sobreReceita).toBeCloseTo(21.73913043478261, 10);
    expect(comerciais[1].sobreResultadoBruto).toBeCloseTo(64.93506493506493, 10);
    // setembro: zero de despesa comercial é 0%, não "sem dado".
    expect(comerciais[0].sobreReceita).toBe(0);
    const aluguel = linha(dre, "categoria:c-aluguel").colunas;
    // total: 3000 de 1250 e de 350,60.
    expect(aluguel[2].sobreReceita).toBeCloseTo(240, 10);
    expect(aluguel[2].sobreResultadoBruto).toBeCloseTo(855.6759840273816, 10);
    expect(linha(dre, "receita_bruta").colunas.map((c) => c.sobreReceita)).toEqual([100, 100, 100]);
  });

  it("o que fica de fora: a classificar, sem categoria, fora do resultado e a devolução da OS", () => {
    // s9 (30) e o10 (20) "a classificar", s10 (12) sem categoria, o11 (7) categoria que sumiu.
    expect(dre.semGrupo).toEqual({ quantidade: 4, total: 69 });
    expect(dre.foraDoResultado).toEqual({ quantidade: 2, total: 800 });
    expect(dre.devolucoesDeOs).toEqual({ quantidade: 1, total: 15 });
    const chaves = todasAsLinhas(dre.linhas).map((l) => l.chave);
    expect(chaves).not.toContain("categoria:c-diversos");
    expect(chaves).not.toContain("categoria:c-que-sumiu");
    expect(chaves).not.toContain("categoria:c-retirada");
    expect(chaves).not.toContain("categoria:c-aporte");
    expect(dre.algumCustoNaoInformado).toBe(false);
  });

  it("a coluna do total é a soma dos meses, em toda linha", () => {
    for (const l of todasAsLinhas(dre.linhas)) {
      const [set, out, total] = l.colunas.map((c) => c.valor);
      expect(Math.round(total * 100), l.chave).toBe(Math.round(set * 100) + Math.round(out * 100));
    }
  });
});

describe("montarDre: a taxa da maquininha", () => {
  // Janeiro: cartão sem taxa nenhuma. Fevereiro: 3 vendas no cartão, 2 com taxa
  // (uma delas paga em março, mas a OS é de fevereiro; outra de OS que não veio
  // na lista, que fica no mês do lançamento). Março: só pix, um orçamento pago no
  // cartão (não conta) e a entrada de uma correção no cartão (não é venda).
  const dre = montarDre({
    meses: ["2026-01", "2026-02", "2026-03"],
    ordens: [
      ordem("os-a", "2026-01-10", [item({})]),
      ordem("os-b1", "2026-02-05", [item({})]),
      ordem("os-b2", "2026-02-06", [item({})]),
      ordem("os-c", "2026-03-03", [item({})]),
      ordem("os-o", "2026-03-04", [item({})], { status: "orcamento" }),
    ],
    movimentos: [
      mov("a", "2026-01-10", "entrada", 300, { ordem_servico_id: "os-a", forma_pagamento: "cartao_debito" }),
      mov("b1", "2026-03-02", "entrada", 300, { ordem_servico_id: "os-b1", forma_pagamento: "cartao_credito" }),
      mov("b2", "2026-02-06", "entrada", 300, { ordem_servico_id: "os-b2", forma_pagamento: "cartao_credito" }),
      mov("fantasma", "2026-02-20", "entrada", 100, {
        ordem_servico_id: "os-que-nao-veio",
        forma_pagamento: "cartao_credito",
      }),
      mov("c", "2026-03-03", "entrada", 300, { ordem_servico_id: "os-c", forma_pagamento: "pix" }),
      mov("o", "2026-03-04", "entrada", 50, { ordem_servico_id: "os-o", forma_pagamento: "cartao_credito" }),
      mov("cor", "2026-03-10", "entrada", 20, {
        ordem_servico_id: "os-c",
        forma_pagamento: "cartao_credito",
        descricao: "Correção da OS 7",
      }),
    ],
    categorias: [],
    taxas: [
      { movimento_id: "b1", valor_taxa: 9 },
      { movimento_id: "fantasma", valor_taxa: 3 },
      { movimento_id: "o", valor_taxa: 2 },
    ],
    custoPeca,
    custoServico,
  });

  it("o valor vai pro mês da OS (ou do lançamento, se a OS não veio)", () => {
    expect(valores(dre, "taxa_maquininha")).toEqual([0, 12, 0, 12]);
    expect(valores(dre, "deducoes")).toEqual([0, 12, 0, 12]);
  });

  it("sem taxa nenhuma: não informado; com parte: parcial; sem cartão: nenhum dos dois", () => {
    const colunas = linha(dre, "taxa_maquininha").colunas;
    expect(colunas.map((c) => c.naoInformado)).toEqual([true, false, false, false]);
    expect(colunas.map((c) => c.parcial)).toEqual([false, true, false, true]);
  });

  it("só a linha da taxa leva os avisos; as Deduções somam a taxa conhecida sem aviso", () => {
    for (const l of todasAsLinhas(dre.linhas)) {
      if (l.chave === "taxa_maquininha") continue;
      expect(l.colunas.every((c) => !c.naoInformado && !c.parcial), l.chave).toBe(true);
    }
  });

  it("o total: todas as vendas no cartão sem taxa é não informado", () => {
    const soCartaoSemTaxa = montarDre({
      meses: ["2026-01", "2026-03"],
      ordens: [ordem("os-a", "2026-01-10", [item({})]), ordem("os-c", "2026-03-03", [item({})])],
      movimentos: [
        mov("a", "2026-01-10", "entrada", 300, { ordem_servico_id: "os-a", forma_pagamento: "cartao_debito" }),
        mov("c", "2026-03-03", "entrada", 300, { ordem_servico_id: "os-c", forma_pagamento: "pix" }),
      ],
      categorias: [],
      taxas: [],
      custoPeca,
      custoServico,
    });
    const colunas = linha(soCartaoSemTaxa, "taxa_maquininha").colunas;
    expect(colunas.map((c) => c.naoInformado)).toEqual([true, false, true]);
    expect(colunas.map((c) => c.parcial)).toEqual([false, false, false]);
  });
});

describe("montarDre: os percentuais sem base e o custo não informado", () => {
  it("sem receita, os dois percentuais são null; resultado bruto negativo também dá null", () => {
    const dre = montarDre({
      meses: ["2026-04", "2026-05"],
      // Maio: pneu vendido abaixo do custo (150 de venda, 200 de custo).
      ordens: [ordem("os-1", "2026-05-10", [item({ preco_unitario: 150 })])],
      movimentos: [mov("s", "2026-04-10", "saida", 100, { categoria_id: "c-aluguel" })],
      categorias,
      taxas: [],
      custoPeca,
      custoServico,
    });
    const aluguel = linha(dre, "categoria:c-aluguel").colunas;
    expect(aluguel[0].sobreReceita).toBeNull();
    expect(aluguel[0].sobreResultadoBruto).toBeNull();
    expect(valores(dre, "resultado_bruto")).toEqual([0, -50, -50]);
    const bruta = linha(dre, "receita_bruta").colunas;
    expect(bruta[1].sobreReceita).toBe(100);
    expect(bruta[1].sobreResultadoBruto).toBeNull();
  });

  it("peça avulsa sem custo em algum mês: algumCustoNaoInformado", () => {
    const avulsa = item({ peca_id: null, descricao: "Peça avulsa", custo_unitario: null });
    const dre = montarDre({
      meses: ["2026-04", "2026-05"],
      ordens: [ordem("os-1", "2026-04-10", [item({})]), ordem("os-2", "2026-05-10", [avulsa])],
      movimentos: [],
      categorias: [],
      taxas: [],
      custoPeca,
      custoServico,
    });
    expect(dre.algumCustoNaoInformado).toBe(true);
    expect(montarDre({ ...entradaDaLoja, meses: ["2026-09"] }).algumCustoNaoInformado).toBe(false);
  });

  it("empate no total da categoria: pelo nome", () => {
    const dre = montarDre({
      meses: ["2026-04"],
      ordens: [],
      movimentos: [
        mov("1", "2026-04-10", "saida", 50, { categoria_id: "c-energia" }),
        mov("2", "2026-04-11", "saida", 50, { categoria_id: "c-aluguel" }),
      ],
      categorias,
      taxas: [],
      custoPeca,
      custoServico,
    });
    expect(linha(dre, "despesas_administrativas").filhas.map((f) => f.rotulo)).toEqual(["Aluguel", "Energia"]);
  });
});

describe("montarDre: o teste que amarra o DRE com Relações e com o Caixa", () => {
  it("(a) Receita bruta − custo das peças e serviços = Sobra das OS; Receita bruta = Vendido", () => {
    // A loja de setembro e outubro, mais uma OS com centavos quebrados.
    const os5 = ordem("os-5", "2026-10-15", [
      item({ peca_id: "valvula", descricao: "Válvula", quantidade: 3, preco_unitario: 19.99, desconto: 0.01 }),
      alinhamento({ preco_unitario: 49.9 }),
    ]);
    const entrada = { ...entradaDaLoja, ordens: [...ordens, os5] };
    const dre = montarDre(entrada);
    const doPeriodo = (de: string, ate: string) =>
      resumoDoPeriodo({ ordens: entrada.ordens, movimentos, custoPeca, custoServico, periodo: { de, ate } });

    const periodos = [
      doPeriodo("2026-09-01", "2026-09-30"),
      doPeriodo("2026-10-01", "2026-10-31"),
      doPeriodo("2026-09-01", "2026-10-31"),
    ];
    const bruta = valores(dre, "receita_bruta");
    const pecas = valores(dre, "custo_pecas");
    const servicos = valores(dre, "custo_servicos");
    periodos.forEach((resumo, i) => {
      expect(bruta[i]).toBe(resumo.vendido);
      expect(paraCentavos(bruta[i]) - paraCentavos(pecas[i]) - paraCentavos(servicos[i])).toBe(
        paraCentavos(resumo.sobraDasOS),
      );
    });
    // Escrito à mão: 1250 + 59,96 + 49,90; sobra 510 + 109,86 − 45.
    expect(bruta[2]).toBe(1359.86);
    expect(periodos[2].sobraDasOS).toBe(574.86);
  });

  it("(b) com cada OS paga à vista no mês em que abriu, o Resultado bruto = entradas das OS − custo do Caixa", () => {
    type Mov = MovimentoCaixa<ItemOS>;
    const ordensB = [
      ordem("os-x", "2026-09-03", [item({ quantidade: 2 }), alinhamento()]),
      ordem("os-y", "2026-09-25", [
        item({ peca_id: "valvula", descricao: "Válvula", quantidade: 4, preco_unitario: 10 }),
        alinhamento({ desconto: 10 }),
      ]),
      ordem("os-z", "2026-10-07", [item({}), alinhamento({ quantidade: 2 })]),
    ];
    const daOrdem = (id: string): Mov["ordem_servico"] => {
      const o = ordensB.find((x) => x.id === id);
      if (!o) throw new Error(id);
      return { id: o.id, numero: o.numero ?? 0, cliente: null, itens: o.itens ?? [] };
    };
    const movB = (m: MovimentoDoDre): Mov => ({
      ...m,
      loja_id: "loja",
      ordem_servico: m.ordem_servico_id ? daOrdem(m.ordem_servico_id) : null,
    });
    const movimentosB: Mov[] = [
      // os-x paga dividida (dinheiro + pix): o custo entra uma vez só.
      movB(mov("x1", "2026-09-03", "entrada", 400, { ordem_servico_id: "os-x" })),
      movB(mov("x2", "2026-09-03", "entrada", 280, { ordem_servico_id: "os-x", forma_pagamento: "pix" })),
      movB(mov("y1", "2026-09-25", "entrada", 110, { ordem_servico_id: "os-y" })),
      movB(mov("z1", "2026-10-07", "entrada", 460, { ordem_servico_id: "os-z", forma_pagamento: "cartao_credito" })),
      // Uma despesa: não mexe no resultado bruto.
      movB(mov("d1", "2026-10-05", "saida", 1500, { categoria_id: "c-aluguel" })),
    ];
    const dre = montarDre({
      meses: ["2026-09", "2026-10"],
      ordens: ordensB,
      movimentos: movimentosB,
      categorias,
      taxas: [],
      custoPeca,
      custoServico,
    });

    const custoDaOrdem = custoDaOrdemPelosMapas(custoPeca, custoServico);
    const doCaixa = (filtro: (m: Mov) => boolean) => {
      const lista = movimentosB.filter(filtro);
      const entradasDasOS = lista
        .filter((m) => m.tipo === "entrada" && m.ordem_servico_id)
        .reduce((soma, m) => soma + paraCentavos(m.valor), 0);
      return entradasDasOS - paraCentavos(resumirMovimentos(lista, custoDaOrdem).custoDeAquisicao);
    };
    const doMes = (mes: string) => (m: Mov) => m.data.startsWith(mes);

    const bruto = valores(dre, "resultado_bruto").map(paraCentavos);
    expect(bruto).toEqual([doCaixa(doMes("2026-09")), doCaixa(doMes("2026-10")), doCaixa(() => true)]);
    // Escrito à mão: setembro 790 − 480, outubro 460 − 260.
    expect(bruto).toEqual([31000, 20000, 51000]);
  });

  it("(c) toda saída do Caixa no período cai num lugar só: linha, fora do resultado, sem grupo ou devolução", () => {
    const movimentosC: MovimentoDoDre[] = [
      mov("1", "2026-09-05", "saida", 1500, { categoria_id: "c-aluguel" }),
      mov("2", "2026-10-12", "saida", 200, { categoria_id: "c-energia" }),
      mov("3", "2026-10-30", "saida", 1000, { categoria_id: "c-salarios" }),
      mov("4", "2026-09-20", "saida", 68, { categoria_id: "c-simples" }),
      mov("5", "2026-10-15", "saida", 25, { categoria_id: "c-frete" }),
      mov("6", "2026-09-25", "saida", 80, { categoria_id: "c-multa" }),
      mov("7", "2026-10-28", "saida", 3.5, { categoria_id: "c-tarifa" }),
      mov("8", "2026-09-22", "saida", 100, { categoria_id: "c-anuncio" }),
      mov("9", "2026-10-29", "saida", 500, { categoria_id: "c-retirada" }),
      mov("10", "2026-09-10", "saida", 30, { categoria_id: "c-diversos" }),
      mov("11", "2026-10-11", "saida", 12),
      mov("12", "2026-09-04", "saida", 7, { categoria_id: "c-que-sumiu" }),
      mov("13", "2026-10-16", "saida", 15, { ordem_servico_id: "os-1", descricao: "Devolução da correção da OS 1" }),
      // Fora dos meses.
      mov("14", "2026-11-02", "saida", 999, { categoria_id: "c-aluguel" }),
    ];
    const dre = montarDre({
      meses: ["2026-09", "2026-10"],
      ordens: [],
      movimentos: movimentosC,
      categorias,
      taxas: [],
      custoPeca,
      custoServico,
    });

    const saidasDoPeriodo = movimentosC
      .filter((m) => m.tipo === "saida" && m.data >= "2026-09-01" && m.data < "2026-11-01")
      .reduce((soma, m) => soma + paraCentavos(m.valor), 0);
    const nasLinhas = todasAsLinhas(dre.linhas)
      .filter((l) => l.chave.startsWith("categoria:"))
      .reduce((soma, l) => soma + paraCentavos(l.colunas[2].valor), 0);
    const foraDasLinhas =
      paraCentavos(dre.foraDoResultado.total) + paraCentavos(dre.semGrupo.total) + paraCentavos(dre.devolucoesDeOs.total);

    expect(nasLinhas + foraDasLinhas).toBe(saidasDoPeriodo);
    // Escrito à mão.
    expect(saidasDoPeriodo).toBe(354050);
    expect(nasLinhas).toBe(297650);
    // E as linhas de topo de saída somam o mesmo que as categorias delas.
    const topoDeSaida = ["deducoes", "custo_vendido", "despesas_operacionais", "outras_despesas", "despesas_financeiras"];
    expect(topoDeSaida.reduce((soma, chave) => soma + paraCentavos(valores(dre, chave)[2]), 0)).toBe(nasLinhas);
  });
});
