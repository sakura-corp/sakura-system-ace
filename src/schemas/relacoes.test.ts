import { describe, expect, it } from "vitest";
import { classificarABC } from "./curvaABC";
import type { LinhaLucro } from "./lucratividade";
import {
  LIMITE_DE_DIAS_NO_DIA_A_DIA,
  diferencaEscrita,
  colunasPorDia,
  colunasPorMes,
  itensAVista,
  itensDoPareto,
  linhasDoRanking,
  nomeDoMes,
  pontosDoFluxo,
  resumoDaCurva,
  POUCOS_ITENS_ABC,
  atalhoDoPeriodo,
  despesasPorTipo,
  formatarMoedaCurta,
  fraseDaABC,
  fraseDaPonte,
  fraseDoDiaADia,
  fraseDoFluxo,
  fraseDoMes,
  fraseDoRanking,
  mediaDoDiaAberto,
  mesDoPeriodo,
  oMesAteHoje,
  periodoComparavelNoMesAnterior,
  periodoDoAtalho,
  ponteDoVendido,
  resumoDoPeriodo,
  saldoAPartirDoInformado,
  vendidoDaOrdem,
  vendidoPorDia,
  vendidoPorMes,
  type MovimentoDasRelacoes,
} from "./relacoes";
import { lucratividadePorItem } from "./lucratividade";
import { arredondarCentavo, paraCentavos } from "./dinheiro";
import type { FluxoProjetado } from "./fluxoProjetado";
import type { ItemOS, OrdemServico } from "@/types/os";

// #1086: Relações numa página só. Cada palavra do dicionário é uma conta
// (Vendido, Recebido, Falta receber, Sobra das OS, Despesas, Sobrou), e as
// que já existiam (lucratividade, fluxo) só são juntadas, nunca refeitas.

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

// Meio-dia em UTC: cai no mesmo dia em São Paulo e em UTC (test:fusos).
function ordem(parcial: Partial<OrdemServico> & { dia?: string }): OrdemServico {
  const { dia, ...resto } = parcial;
  return {
    id: "os-1",
    numero: 1,
    loja_id: "loja",
    cliente_id: "cli",
    veiculo_id: null,
    status: "faturada",
    km_entrada: null,
    descricao_problema: null,
    forma_pagamento: null,
    parcelas: 1,
    data_abertura: `${dia ?? "2026-11-10"}T12:00:00.000Z`,
    data_fechamento: null,
    vendedor_id: null,
    criado_por_id: null,
    atualizado_por_id: null,
    itens: [],
    ...resto,
  };
}

function mov(parcial: Partial<MovimentoDasRelacoes> & { dia?: string }): MovimentoDasRelacoes {
  const { dia, ...resto } = parcial;
  return {
    data: `${dia ?? "2026-11-10"}T12:00:00.000Z`,
    tipo: "entrada",
    valor: 0,
    ordem_servico_id: null,
    descricao: null,
    categoria: null,
    ...resto,
  };
}

const custoPeca = new Map([["pneu", 200]]);
const custoServico = new Map([["alinhamento", 30]]);
const novembro = { de: "2026-11-01", ate: "2026-11-30" };

describe("periodoDoAtalho e atalhoDoPeriodo", () => {
  // 26/11/2026 é uma quinta-feira.
  const hoje = "2026-11-26";

  it("cada atalho vira um período de dias inteiros", () => {
    expect(periodoDoAtalho("hoje", hoje)).toEqual({ de: "2026-11-26", ate: "2026-11-26" });
    expect(periodoDoAtalho("semana", hoje)).toEqual({ de: "2026-11-23", ate: "2026-11-26" });
    expect(periodoDoAtalho("mes", hoje)).toEqual({ de: "2026-11-01", ate: "2026-11-26" });
    expect(periodoDoAtalho("mes_passado", hoje)).toEqual({ de: "2026-10-01", ate: "2026-10-31" });
    expect(periodoDoAtalho("ano", hoje)).toEqual({ de: "2026-01-01", ate: "2026-11-26" });
  });

  it("a semana começa na segunda, mesmo no domingo; mês passado atravessa o ano", () => {
    expect(periodoDoAtalho("semana", "2026-11-29")).toEqual({ de: "2026-11-23", ate: "2026-11-29" });
    expect(periodoDoAtalho("semana", "2026-11-23")).toEqual({ de: "2026-11-23", ate: "2026-11-23" });
    expect(periodoDoAtalho("mes_passado", "2026-01-15")).toEqual({ de: "2025-12-01", ate: "2025-12-31" });
    expect(periodoDoAtalho("mes_passado", "2028-03-10")).toEqual({ de: "2028-02-01", ate: "2028-02-29" });
  });

  it("reconhece o atalho de volta, e devolve null num período escolhido à mão", () => {
    expect(atalhoDoPeriodo({ de: "2026-11-23", ate: "2026-11-26" }, hoje)).toBe("semana");
    expect(atalhoDoPeriodo({ de: "2026-10-01", ate: "2026-10-31" }, hoje)).toBe("mes_passado");
    expect(atalhoDoPeriodo({ de: "2026-01-01", ate: "2026-11-26" }, hoje)).toBe("ano");
    expect(atalhoDoPeriodo({ de: "2026-11-02", ate: "2026-11-20" }, hoje)).toBeNull();
    // Quando dois atalhos dão o mesmo período, o mais curto ganha.
    expect(atalhoDoPeriodo({ de: "2026-11-23", ate: "2026-11-23" }, "2026-11-23")).toBe("hoje");
  });
});

describe("mesDoPeriodo e periodoComparavelNoMesAnterior", () => {
  const hoje = "2026-11-26";

  it("um mês é o mês inteiro, ou o mês corrente até hoje", () => {
    expect(mesDoPeriodo({ de: "2026-10-01", ate: "2026-10-31" }, hoje)).toEqual({ ano: 2026, mes: 10 });
    expect(mesDoPeriodo({ de: "2026-11-01", ate: "2026-11-26" }, hoje)).toEqual({ ano: 2026, mes: 11 });
    expect(mesDoPeriodo({ de: "2026-10-01", ate: "2026-10-20" }, hoje)).toBeNull();
    expect(mesDoPeriodo({ de: "2026-10-02", ate: "2026-10-31" }, hoje)).toBeNull();
    expect(mesDoPeriodo({ de: "2026-10-01", ate: "2026-11-26" }, hoje)).toBeNull();
  });

  it("no mês corrente compara até o mesmo dia; segura no último dia do mês anterior", () => {
    expect(periodoComparavelNoMesAnterior({ de: "2026-11-01", ate: "2026-11-26" }, hoje)).toEqual({
      de: "2026-10-01",
      ate: "2026-10-26",
    });
    expect(periodoComparavelNoMesAnterior({ de: "2026-03-01", ate: "2026-03-31" }, "2026-03-31")).toEqual({
      de: "2026-02-01",
      ate: "2026-02-28",
    });
  });

  it("num mês passado inteiro, compara com o mês anterior inteiro; fora de mês, null", () => {
    expect(periodoComparavelNoMesAnterior({ de: "2026-10-01", ate: "2026-10-31" }, hoje)).toEqual({
      de: "2026-09-01",
      ate: "2026-09-30",
    });
    expect(periodoComparavelNoMesAnterior({ de: "2026-01-01", ate: "2026-01-31" }, hoje)).toEqual({
      de: "2025-12-01",
      ate: "2025-12-31",
    });
    expect(periodoComparavelNoMesAnterior({ de: "2026-11-02", ate: "2026-11-26" }, hoje)).toBeNull();
  });
});

describe("resumoDoPeriodo (o dicionário)", () => {
  const ordens = [
    // Vendido 280 + 80 = 360; custo 200 + 30 = 230; sobra 130.
    ordem({
      id: "os-1",
      itens: [
        item({ preco_unitario: 300, desconto: 20 }),
        item({ tipo: "servico", peca_id: null, servico_id: "alinhamento", descricao: "Alinhamento", preco_unitario: 80 }),
      ],
    }),
    // Em andamento, ainda sem nada no caixa: vendido 300, falta receber 300.
    ordem({ id: "os-2", status: "em_andamento", dia: "2026-11-20", itens: [item({})] }),
    // Orçamento não é venda.
    ordem({ id: "orc", numero: null, status: "orcamento", itens: [item({ quantidade: 9 })] }),
    // De outubro: fora do período.
    ordem({ id: "os-out", dia: "2026-10-28", itens: [item({})] }),
  ];
  const movimentos = [
    // A os-1 foi paga em duas vezes: 200 no período, 100 antes (sinal de outubro).
    mov({ ordem_servico_id: "os-1", valor: 200, dia: "2026-11-10" }),
    mov({ ordem_servico_id: "os-1", valor: 100, dia: "2026-10-30" }),
    // Entrada sem OS (sucata vendida) conta no Recebido.
    mov({ valor: 50, dia: "2026-11-15" }),
    mov({ tipo: "saida", valor: 40, categoria: { nome: "Aluguel" }, dia: "2026-11-05" }),
    mov({ tipo: "saida", valor: 999, categoria: { nome: "Aluguel" }, dia: "2026-10-05" }),
  ];

  const resumo = resumoDoPeriodo({ ordens, movimentos, custoPeca, custoServico, periodo: novembro });

  it("Vendido, custo e Sobra das OS são os da lucratividadePorItem", () => {
    const lucro = lucratividadePorItem({ ordens, custoPeca, custoServico, ...novembro });
    expect(resumo.vendido).toBe(660);
    expect(resumo.vendido).toBe(lucro.totalReceita);
    expect(resumo.custo).toBe(430);
    expect(resumo.sobraDasOS).toBe(lucro.totalMargem);
    expect(resumo.algumCustoNaoInformado).toBe(false);
  });

  it("Recebido e Despesas são as entradas e saídas do caixa no período", () => {
    expect(resumo.recebido).toBe(250);
    expect(resumo.despesas).toBe(40);
  });

  it("Falta receber: o que cada OS do período vendeu menos o que entrou por ela, em qualquer data", () => {
    // os-1: 360 − (200 + 100) = 60. os-2: 300 − 0 = 300.
    expect(resumo.faltaReceber).toBe(360);
  });

  it("OS que recebeu mais do que vendeu não deixa a falta negativa", () => {
    const r = resumoDoPeriodo({
      ordens: [ordem({ id: "a", itens: [item({ preco_unitario: 100 })] }), ordem({ id: "b", itens: [item({ preco_unitario: 50 })] })],
      movimentos: [mov({ ordem_servico_id: "a", valor: 130 })],
      custoPeca,
      custoServico,
      periodo: novembro,
    });
    expect(r.faltaReceber).toBe(50);
  });

  it("Sobrou = Sobra das OS − Despesas, fechando no centavo", () => {
    expect(resumo.sobrou).toBe(190);
    const quebrado = resumoDoPeriodo({
      ordens: [ordem({ itens: [item({ peca_id: null, custo_unitario: 0.1, preco_unitario: 0.3 })] })],
      movimentos: [mov({ tipo: "saida", valor: 0.1 }), mov({ tipo: "saida", valor: 0.2 })],
      custoPeca,
      custoServico,
      periodo: novembro,
    });
    expect(quebrado.sobrou).toBe(-0.1);
  });
});

describe("despesasPorTipo", () => {
  it("agrupa as saídas do período pelo tipo, do maior pro menor, e o resto vira Outras", () => {
    const movimentos = [
      mov({ tipo: "saida", valor: 1000, categoria: { nome: "Aluguel" } }),
      mov({ tipo: "saida", valor: 300, categoria: { nome: "Luz" } }),
      mov({ tipo: "saida", valor: 300, categoria: { nome: "Água" } }),
      mov({ tipo: "saida", valor: 500, categoria: null }),
      mov({ tipo: "saida", valor: 0.1, categoria: { nome: "Café" } }),
      mov({ tipo: "saida", valor: 0.2, categoria: { nome: "Pão" } }),
      mov({ tipo: "saida", valor: 200, categoria: { nome: "Aluguel" }, dia: "2026-12-01" }),
      mov({ tipo: "entrada", valor: 700, categoria: { nome: "Aluguel" } }),
    ];
    const linhas = despesasPorTipo(movimentos, novembro);
    expect(linhas).toEqual([
      { tipo: "Aluguel", valor: 1000 },
      { tipo: "Sem tipo", valor: 500 },
      { tipo: "Água", valor: 300 },
      { tipo: "Luz", valor: 300 },
      { tipo: "Outras", valor: 0.3 },
    ]);
    const resumo = resumoDoPeriodo({ ordens: [], movimentos, custoPeca, custoServico, periodo: novembro });
    expect(paraCentavos(linhas.reduce((s, l) => s + l.valor, 0))).toBe(paraCentavos(resumo.despesas));
  });

  it("sem passar do máximo não cria Outras", () => {
    expect(despesasPorTipo([mov({ tipo: "saida", valor: 10, categoria: { nome: "Luz" } })], novembro)).toEqual([
      { tipo: "Luz", valor: 10 },
    ]);
    expect(despesasPorTipo([], novembro)).toEqual([]);
  });
});

describe("ponteDoVendido", () => {
  it("vai do Vendido ao Sobrou, degrau por degrau", () => {
    const ponte = ponteDoVendido({
      vendido: 1000,
      custo: 600,
      despesasPorTipo: [
        { tipo: "Aluguel", valor: 300 },
        { tipo: "Luz", valor: 50 },
      ],
    });
    expect(ponte.degraus.map((d) => [d.rotulo, d.tipo, d.valor, d.de, d.ate])).toEqual([
      ["Vendido", "total", 1000, 0, 1000],
      ["Custo das peças e serviços", "menos", 600, 1000, 400],
      ["Sobra das OS", "total", 400, 0, 400],
      ["Aluguel", "menos", 300, 400, 100],
      ["Luz", "menos", 50, 100, 50],
      ["Sobrou", "total", 50, 0, 50],
    ]);
    expect(ponte.sobrou).toBe(50);
  });

  it("prejuízo: o Sobrou fica negativo e o tamanho continua positivo", () => {
    const ponte = ponteDoVendido({ vendido: 100, custo: 80, despesasPorTipo: [{ tipo: "Aluguel", valor: 50 }] });
    expect(ponte.sobrou).toBe(-30);
    expect(ponte.degraus.at(-1)).toMatchObject({ rotulo: "Sobrou", valor: 30, de: 0, ate: -30 });
  });

  it("fecha ao centavo com valores quebrados, e a Sobra das OS é a da lucratividade", () => {
    const ordens = [
      ordem({
        id: "a",
        itens: [
          item({ peca_id: null, custo_unitario: 0.1, preco_unitario: 0.1 }),
          item({ peca_id: null, custo_unitario: 0.1, preco_unitario: 0.2 }),
          item({ peca_id: null, custo_unitario: 0.07, quantidade: 3, preco_unitario: 0.7 }),
        ],
      }),
    ];
    const movimentos = [
      mov({ tipo: "saida", valor: 0.1, categoria: { nome: "Café" } }),
      mov({ tipo: "saida", valor: 0.2, categoria: { nome: "Pão" } }),
      mov({ tipo: "saida", valor: 0.07, categoria: { nome: "Bala" } }),
    ];
    const resumo = resumoDoPeriodo({ ordens, movimentos, custoPeca, custoServico, periodo: novembro });
    const ponte = ponteDoVendido({
      vendido: resumo.vendido,
      custo: resumo.custo,
      despesasPorTipo: despesasPorTipo(movimentos, novembro),
    });
    const centavos = (v: number) => paraCentavos(v);
    const menos = ponte.degraus.filter((d) => d.tipo === "menos").reduce((s, d) => s + centavos(d.valor), 0);
    expect(centavos(resumo.vendido) - menos).toBe(centavos(ponte.sobrou));
    // 2,40 − 0,41 − 0,10 − 0,20 − 0,07 dá 1,6199999… em ponto flutuante.
    expect(ponte.sobrou).toBe(1.62);
    expect(ponte.sobrou).toBe(resumo.sobrou);
    for (const d of ponte.degraus) {
      expect(d.ate).toBe(arredondarCentavo(d.ate));
    }
    const lucro = lucratividadePorItem({ ordens, custoPeca, custoServico, ...novembro });
    const sobra = ponte.degraus.find((d) => d.chave === "sobra_das_os");
    expect(sobra?.ate).toBe(arredondarCentavo(lucro.totalMargem));
    expect(sobra?.ate).toBe(resumo.sobraDasOS);
  });
});

describe("vendidoDaOrdem, vendidoPorDia e vendidoPorMes", () => {
  it("o vendido da OS é a soma dos itens, com desconto", () => {
    expect(vendidoDaOrdem(ordem({ itens: [item({ quantidade: 2, preco_unitario: 300, desconto: 20 }), item({ preco_unitario: 0.1 })] }))).toBe(580.1);
    expect(vendidoDaOrdem(ordem({ itens: undefined }))).toBe(0);
  });

  it("todos os dias do período aparecem, domingo e dia sem venda com zero", () => {
    const ordens = [
      ordem({ id: "a", dia: "2026-11-01", itens: [item({ preco_unitario: 100 })] }),
      ordem({ id: "b", dia: "2026-11-03", itens: [item({ preco_unitario: 0.1 })] }),
      ordem({ id: "c", dia: "2026-11-03", itens: [item({ preco_unitario: 0.2 })] }),
      ordem({ id: "orc", status: "orcamento", dia: "2026-11-02", itens: [item({})] }),
      ordem({ id: "fora", dia: "2026-11-04", itens: [item({})] }),
    ];
    expect(vendidoPorDia(ordens, { de: "2026-11-01", ate: "2026-11-03" })).toEqual([
      { dia: "2026-11-01", valor: 100 },
      { dia: "2026-11-02", valor: 0 },
      { dia: "2026-11-03", valor: 0.3 },
    ]);
  });

  it("por mês: todos os meses do período, atravessando o ano", () => {
    const ordens = [
      ordem({ id: "a", dia: "2025-11-15", itens: [item({ preco_unitario: 100 })] }),
      ordem({ id: "b", dia: "2026-01-31", itens: [item({ preco_unitario: 50 })] }),
    ];
    expect(vendidoPorMes(ordens, { de: "2025-11-10", ate: "2026-02-05" })).toEqual([
      { mes: "2025-11", valor: 100 },
      { mes: "2025-12", valor: 0 },
      { mes: "2026-01", valor: 50 },
      { mes: "2026-02", valor: 0 },
    ]);
  });

  it("a média do dia aberto ignora os dias sem venda", () => {
    expect(
      mediaDoDiaAberto([
        { dia: "2026-11-01", valor: 100 },
        { dia: "2026-11-02", valor: 0 },
        { dia: "2026-11-03", valor: 200 },
      ]),
    ).toBe(150);
    expect(mediaDoDiaAberto([{ dia: "2026-11-02", valor: 0 }])).toBeNull();
    expect(mediaDoDiaAberto([])).toBeNull();
  });
});

describe("oMesAteHoje", () => {
  const ordens = [
    ordem({ id: "o1", dia: "2026-10-01", itens: [item({ preco_unitario: 100 })] }),
    ordem({ id: "o2", dia: "2026-10-03", itens: [item({ preco_unitario: 50 })] }),
    ordem({ id: "o3", dia: "2026-10-31", itens: [item({ preco_unitario: 1000 })] }),
    ordem({ id: "n1", dia: "2026-11-01", itens: [item({ preco_unitario: 30 })] }),
    ordem({ id: "n2", dia: "2026-11-03", itens: [item({ preco_unitario: 200 })] }),
  ];

  it("no mês corrente vai até hoje e compara com o anterior no mesmo dia", () => {
    const m = oMesAteHoje({ ordens, periodo: { de: "2026-11-01", ate: "2026-11-03" }, hoje: "2026-11-03" });
    expect(m).toMatchObject({ ano: 2026, mes: 11, diasNoMes: 30, diaDeReferencia: 3, ehMesCorrente: true });
    expect(m.atual).toEqual([30, 30, 230]);
    expect(m.anterior).toHaveLength(31);
    expect(m.anterior?.slice(0, 3)).toEqual([100, 100, 150]);
    expect(m.anterior?.at(-1)).toBe(1150);
    expect(m.diferencaNoMesmoDia).toBe(80);
    expect(m.mediaPorDia).toBeCloseTo(76.67, 2);
  });

  it("num mês passado vai até o último dia, e o dia de comparação segura no fim do mês anterior", () => {
    const m = oMesAteHoje({
      ordens: [
        ordem({ id: "j", dia: "2026-01-31", itens: [item({ preco_unitario: 10 })] }),
        ordem({ id: "m", dia: "2026-03-31", itens: [item({ preco_unitario: 40 })] }),
      ],
      periodo: { de: "2026-03-01", ate: "2026-03-31" },
      hoje: "2026-11-26",
    });
    expect(m.diaDeReferencia).toBe(31);
    expect(m.ehMesCorrente).toBe(false);
    expect(m.anterior).toHaveLength(28);
    // Fevereiro vazio, mas houve OS antes de março: o anterior existe, todo em zero.
    expect(m.diferencaNoMesmoDia).toBe(40);
  });

  it("loja com um mês só: sem anterior, sem diferença", () => {
    const m = oMesAteHoje({ ordens: ordens.slice(3), periodo: { de: "2026-11-01", ate: "2026-11-03" }, hoje: "2026-11-03" });
    expect(m.anterior).toBeNull();
    expect(m.diferencaNoMesmoDia).toBeNull();
  });
});

describe("saldoAPartirDoInformado", () => {
  const fluxo: FluxoProjetado = {
    dias: [
      { dia: "2026-11-26", entra: 100, sai: 0, saldoDoDia: 100, saldoAcumulado: 100, itens: [] },
      {
        dia: "2026-11-27",
        entra: 0,
        sai: 1300,
        saldoDoDia: -1300,
        saldoAcumulado: -1200,
        itens: [
          { chave: "a", tipo: "sai", descricao: "Luz", valor: 300, vencimento: "2026-11-27", atrasada: false, prevista: false },
          { chave: "b", tipo: "sai", descricao: "Aluguel", valor: 1000, vencimento: "2026-11-27", atrasada: false, prevista: false },
        ],
      },
      { dia: "2026-11-28", entra: 500, sai: 0, saldoDoDia: 500, saldoAcumulado: -700, itens: [] },
    ],
    totalEntra: 600,
    totalSai: 1300,
    saldo: -700,
  };

  it("sem acesso a um dos lados, não há saldo", () => {
    expect(saldoAPartirDoInformado({ ...fluxo, saldo: null }, 1000)).toBeNull();
  });

  it("começa do saldo informado e aponta o dia mais baixo com o motivo", () => {
    const s = saldoAPartirDoInformado(fluxo, 0.1);
    expect(s?.comecouDoInformado).toBe(true);
    expect(s?.pontos).toEqual([
      { dia: "2026-11-26", saldo: 100.1 },
      { dia: "2026-11-27", saldo: -1199.9 },
      { dia: "2026-11-28", saldo: -699.9 },
    ]);
    expect(s?.diaMaisBaixo).toEqual({ dia: "2026-11-27", saldo: -1199.9, motivo: "Aluguel" });
    expect(s?.saldoFinal).toBe(-699.9);
  });

  it("sem informado começa do zero; dia mais baixo sem saída não tem motivo", () => {
    const s = saldoAPartirDoInformado(fluxo, null);
    expect(s?.comecouDoInformado).toBe(false);
    expect(s?.inicial).toBe(0);
    const s2 = saldoAPartirDoInformado(fluxo, 5000);
    expect(s2?.diaMaisBaixo).toEqual({ dia: "2026-11-27", saldo: 3800, motivo: "Aluguel" });
    const soEntra = saldoAPartirDoInformado(
      { dias: [{ dia: "2026-11-26", entra: 10, sai: 0, saldoDoDia: 10, saldoAcumulado: 10, itens: [] }], totalEntra: 10, totalSai: 0, saldo: 10 },
      null,
    );
    expect(soEntra?.diaMaisBaixo).toEqual({ dia: "2026-11-26", saldo: 10, motivo: null });
  });
});

describe("formatarMoedaCurta", () => {
  it.each([
    [950, "R$ 950"],
    [0, "R$ 0"],
    [949.6, "R$ 950"],
    [2600, "R$ 2,6 mil"],
    [2000, "R$ 2 mil"],
    [2049, "R$ 2 mil"],
    [9960, "R$ 10 mil"],
    [12345, "R$ 12 mil"],
    [999_600, "R$ 1 mi"],
    [1_234_567, "R$ 1,2 mi"],
    [-2600, "−R$ 2,6 mil"],
    [-0.2, "R$ 0"],
  ])("%s → %s", (valor, esperado) => {
    expect(formatarMoedaCurta(valor)).toBe(esperado);
  });
});

describe("as frases-título", () => {
  it("o mês, com e sem o anterior", () => {
    const base = { ano: 2026, mes: 11, diasNoMes: 30, diaDeReferencia: 3, atual: [], anterior: [], mediaPorDia: 620, ehMesCorrente: true };
    expect(fraseDoMes({ ...base, diferencaNoMesmoDia: 2000 })).toBe("Novembro está R$ 2 mil acima de outubro no mesmo dia");
    expect(fraseDoMes({ ...base, diferencaNoMesmoDia: -2600 })).toBe("Novembro está R$ 2,6 mil abaixo de outubro no mesmo dia");
    expect(fraseDoMes({ ...base, diferencaNoMesmoDia: 0.2 })).toBe("Novembro está igual a outubro no mesmo dia");
    expect(fraseDoMes({ ...base, diferencaNoMesmoDia: null })).toBe("Novembro: média de R$ 620 por dia até agora");
    expect(fraseDoMes({ ...base, mes: 1, ehMesCorrente: false, diferencaNoMesmoDia: 500 })).toBe("Janeiro ficou R$ 500 acima de dezembro");
    expect(fraseDoMes({ ...base, ehMesCorrente: false, diferencaNoMesmoDia: null })).toBe("Novembro: média de R$ 620 por dia");
  });

  it("a ponte: sobrou ou faltou", () => {
    expect(fraseDaPonte(12000, 3100)).toBe("De R$ 12 mil vendidos, sobraram R$ 3,1 mil");
    expect(fraseDaPonte(12000, -800)).toBe("De R$ 12 mil vendidos, faltaram R$ 800 pra cobrir as despesas");
    expect(fraseDaPonte(0, 0)).toBe("Nada vendido no período");
  });

  it("o ranking diz quem mais deu dinheiro", () => {
    expect(
      fraseDoRanking([
        { descricao: "Pneu", valor: 900 },
        { descricao: "Troca de óleo", valor: 4100 },
      ]),
    ).toBe("Troca de óleo é quem mais deu dinheiro: R$ 4,1 mil");
    expect(fraseDoRanking([])).toBe("Nenhuma venda no período");
  });

  it("a curva ABC, e com poucos itens avisa que ainda não diz muito", () => {
    expect(fraseDaABC({ quantosNoA: 3, total: 12, percentual: 81.4, umItem: "peça", variosItens: "peças" })).toBe(
      "3 de 12 peças fazem 81% do que entrou",
    );
    expect(fraseDaABC({ quantosNoA: 1, total: 10, percentual: 80, umItem: "peça", variosItens: "peças" })).toBe(
      "1 de 10 peças faz 80% do que entrou",
    );
    expect(POUCOS_ITENS_ABC).toBe(10);
    expect(fraseDaABC({ quantosNoA: 3, total: 5, percentual: 81, umItem: "peça", variosItens: "peças" })).toBe(
      "Poucos itens: a curva ainda não diz muito",
    );
    expect(fraseDaABC({ quantosNoA: 0, total: 0, percentual: 0, umItem: "peça", variosItens: "peças" })).toBe(
      "Sem peças no período",
    );
  });

  it("o fluxo, com e sem saldo informado", () => {
    const comInformado = {
      comecouDoInformado: true,
      inicial: 1000,
      pontos: [
        { dia: "2026-12-04", saldo: 3000 },
        { dia: "2026-12-05", saldo: 1200 },
      ],
      diaMaisBaixo: { dia: "2026-12-05", saldo: 1200, motivo: "Aluguel" },
      saldoFinal: 1200,
    };
    expect(fraseDoFluxo(comInformado)).toBe("O dia mais apertado é 05/12: R$ 1,2 mil (Aluguel)");
    expect(fraseDoFluxo({ ...comInformado, diaMaisBaixo: { dia: "2026-12-05", saldo: -1200, motivo: null } })).toBe(
      "O dia mais apertado é 05/12: −R$ 1,2 mil",
    );
    const pontos30 = Array.from({ length: 31 }, (_, i) => ({ dia: `d${i}`, saldo: i === 10 ? -1200 : 0 }));
    const semInformado = {
      comecouDoInformado: false,
      inicial: 0,
      pontos: pontos30,
      diaMaisBaixo: { dia: "d10", saldo: -1200, motivo: "Aluguel" },
      saldoFinal: 0,
    };
    expect(fraseDoFluxo(semInformado)).toBe("Quanto falta cobrir nos próximos 30 dias: R$ 1,2 mil");
    expect(fraseDoFluxo({ ...semInformado, diaMaisBaixo: { dia: "d0", saldo: 0, motivo: null } })).toBe(
      "Nos próximos 30 dias entra mais do que sai",
    );
  });

  it("o dia a dia: hoje contra a média, ou o último dia com venda", () => {
    const porDia = [
      { dia: "2026-11-24", valor: 400 },
      { dia: "2026-11-25", valor: 0 },
      { dia: "2026-11-26", valor: 850 },
    ];
    expect(fraseDoDiaADia({ porDia, hoje: "2026-11-26" })).toBe("Hoje: R$ 850, acima da média de R$ 625 por dia aberto");
    expect(fraseDoDiaADia({ porDia: porDia.slice(0, 2), hoje: "2026-11-26" })).toBe(
      "24/11: R$ 400, na média de R$ 400 por dia aberto",
    );
    expect(fraseDoDiaADia({ porDia: [...porDia.slice(0, 2), { dia: "2026-11-26", valor: 0 }], hoje: "2026-11-26" })).toBe(
      "Hoje: R$ 0, abaixo da média de R$ 400 por dia aberto",
    );
    expect(fraseDoDiaADia({ porDia: [{ dia: "2026-11-26", valor: 0 }], hoje: "2026-11-26" })).toBe("Nenhuma venda no período");
  });
});

// ---------------------------------------------------------------------------
// A montagem pra página (#1086): as contas que a tela só chama.


function linhaLucro(parcial: Partial<LinhaLucro>): LinhaLucro {
  return {
    descricao: "Item",
    tipo: "peca",
    quantidade: 1,
    receita: 100,
    custo: 60,
    margem: 40,
    custoNaoInformado: false,
    pecaId: null,
    ...parcial,
  };
}

describe("linhasDoRanking e itensAVista", () => {
  it("a Sobra das OS e o 'de cada R$ 100, sobra' de cada item; sem custo, sem percentual", () => {
    const linhas = linhasDoRanking([
      linhaLucro({ descricao: "Pneu", receita: 800, custo: 600, margem: 200 }),
      linhaLucro({ descricao: "Farol", receita: 500, custo: 0, margem: 500, custoNaoInformado: true, pecaId: "p9" }),
    ]);
    expect(linhas[0]).toMatchObject({ nome: "Pneu", valor: 200, percentual: 25, tipo: "peca", custoNaoInformado: false });
    expect(linhas[1]).toMatchObject({ nome: "Farol", percentual: null, custoNaoInformado: true, pecaId: "p9" });
  });

  it("7 à vista; o item sem custo não fica escondido atrás do corte", () => {
    const comCusto = Array.from({ length: 9 }, (_, i) => linhaLucro({ descricao: `Item ${i}`, margem: 90 - i }));
    const semCusto = linhaLucro({ descricao: "Sem custo", custoNaoInformado: true });
    const vista = itensAVista(linhasDoRanking([...comCusto, semCusto]));
    expect(vista).toHaveLength(7);
    expect(vista[0].nome).toBe("Item 0");
    expect(vista.at(-1)?.nome).toBe("Sem custo");
    expect(vista.map((l) => l.nome)).not.toContain("Item 6");
    // Cabe tudo: nada é cortado.
    expect(itensAVista(linhasDoRanking(comCusto.slice(0, 3)))).toHaveLength(3);
  });
});

describe("resumoDaCurva e itensDoPareto", () => {
  const curva = classificarABC(
    [
      { nome: "Pneu", valor: 800 },
      { nome: "Farol", valor: 150 },
      { nome: "Palheta", valor: 40 },
      { nome: "Bico", valor: 10 },
    ],
    (l) => l.valor,
  );

  it("o resumo diz quantos itens, quantos no A e quanto cada grupo faz do total", () => {
    const r = resumoDaCurva(curva);
    expect(r.total).toBe(4);
    expect(r.quantosNoA).toBe(1);
    expect(r.percentualDoA).toBeCloseTo(80);
    expect(r.grupos.map((g) => [g.letra, g.quantos])).toEqual([
      ["A", 1],
      ["B", 1],
      ["C", 2],
    ]);
    expect(r.grupos.reduce((s, g) => s + g.parte, 0)).toBeCloseTo(100);
  });

  it("o Pareto leva só 7 itens, na ordem, com a parte e o acumulado", () => {
    const itens = itensDoPareto(curva, (l) => l.nome);
    expect(itens.map((i) => i.nome)).toEqual(["Pneu", "Farol", "Palheta", "Bico"]);
    expect(itens[0]).toMatchObject({ letra: "A", valor: 800 });
    expect(itens[0].parte).toBeCloseTo(80);
    expect(itens[1].acumulado).toBeCloseTo(95);
    const muitos = classificarABC(
      Array.from({ length: 12 }, (_, i) => ({ nome: `n${i}`, valor: 100 - i })),
      (l) => l.valor,
    );
    expect(itensDoPareto(muitos, (l) => l.nome)).toHaveLength(7);
  });

  it("item fora da conta não entra no Pareto nem na parte dos grupos", () => {
    const comZero = classificarABC(
      [
        { nome: "Bom", valor: 100 },
        { nome: "Zero", valor: 0 },
      ],
      (l) => l.valor,
    );
    expect(itensDoPareto(comZero, (l) => l.nome).map((i) => i.nome)).toEqual(["Bom"]);
    expect(resumoDaCurva(comZero).total).toBe(2);
  });
});

describe("colunasPorDia e colunasPorMes", () => {
  it("todo dia vira coluna, com o dia da semana; o dia sem venda aparece", () => {
    const colunas = colunasPorDia(
      [
        { dia: "2026-11-22", valor: 300 },
        { dia: "2026-11-23", valor: 0 },
      ],
      "2026-11-23",
    );
    // 22/11/2026 é domingo.
    expect(colunas[0]).toMatchObject({ rotulo: "dom", sub: "22", valor: 300 });
    expect(colunas[1]).toMatchObject({ rotulo: "seg", sub: "23", valor: 0 });
    expect(colunas[0].dica).toBe("dom 22/11: R$ 300");
    expect(colunas[1].dica).toBe("Hoje, seg 23/11: sem venda");
  });

  it("com período longo, uma coluna por mês", () => {
    const colunas = colunasPorMes([
      { mes: "2026-10", valor: 12000 },
      { mes: "2026-11", valor: 0 },
    ]);
    expect(colunas.map((c) => [c.rotulo, c.sub, c.valor])).toEqual([
      ["out", "2026", 12000],
      ["nov", "2026", 0],
    ]);
    expect(LIMITE_DE_DIAS_NO_DIA_A_DIA).toBe(62);
    expect(nomeDoMes(11)).toBe("novembro");
  });
});

describe("pontosDoFluxo", () => {
  const fluxo: FluxoProjetado = {
    totalEntra: 250,
    totalSai: 1000,
    saldo: -750,
    dias: [
      { dia: "2026-11-24", entra: 0, sai: 0, saldoDoDia: 0, saldoAcumulado: 0, itens: [] },
      {
        dia: "2026-11-25",
        entra: 250,
        sai: 1000,
        saldoDoDia: -750,
        saldoAcumulado: -750,
        itens: [
          { chave: "a", tipo: "sai", descricao: "Aluguel", valor: 1000, vencimento: "2026-11-25", atrasada: false, prevista: false },
        ],
      },
    ],
  };

  it("sem o 'quanto tenho hoje': aponta o dia que falta cobrir, com a data e o motivo", () => {
    const saldo = saldoAPartirDoInformado(fluxo, null)!;
    const p = pontosDoFluxo(saldo, fluxo);
    expect(p.dias.map((d) => [d.rotulo, d.entra, d.sai, d.saldo])).toEqual([
      ["24/11", 0, 0, 0],
      ["25/11", 250, 1000, -750],
    ]);
    expect(p.maisBaixo).toEqual({ indice: 1, texto: "−R$ 750 em 25/11: Aluguel" });
    expect(p.fim).toBe("−R$ 750 em 25/11");
  });

  it("sem aperto (nada negativo e sem valor informado): não aponta dia nenhum", () => {
    const folgado: FluxoProjetado = {
      ...fluxo,
      dias: fluxo.dias.map((d) => ({ ...d, saldoAcumulado: 0, saldoDoDia: 0, itens: [] })),
    };
    const p = pontosDoFluxo(saldoAPartirDoInformado(folgado, null)!, folgado);
    expect(p.maisBaixo).toBeNull();
  });
});

describe("diferencaEscrita", () => {
  it("escreve a diferença do mês contra o anterior", () => {
    expect(diferencaEscrita(2000)).toBe("R$ 2 mil acima");
    expect(diferencaEscrita(-2600)).toBe("R$ 2,6 mil abaixo");
    expect(diferencaEscrita(0.4)).toBe("igual");
    expect(diferencaEscrita(null)).toBeUndefined();
  });
});
