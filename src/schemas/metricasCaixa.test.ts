import { describe, expect, it } from "vitest";
import {
  custoDosItens,
  lucroPorMovimento,
  mapaCustoPecas,
  mapaCustoServicos,
  resumirMovimentos,
} from "./metricasCaixa";
import type { MovimentoCaixa } from "@/types/caixa";
import type { ItemOS } from "@/types/os";

const custoPeca = mapaCustoPecas([
  { id: "pneu", preco_custo: 300 },
  { id: "sem-custo", preco_custo: null },
]);
const custoServico = mapaCustoServicos([{ id: "alinhamento", custo: 50 }]);

function item(
  tipo: "peca" | "servico",
  refId: string,
  quantidade: number,
  preco: number,
): ItemOS {
  return {
    id: crypto.randomUUID(),
    ordem_servico_id: "os",
    tipo,
    peca_id: tipo === "peca" ? refId : null,
    servico_id: tipo === "servico" ? refId : null,
    tecnico_id: null,
    descricao: refId,
    quantidade,
    preco_unitario: preco,
    desconto: 0,
  };
}

function entrada(
  id: string,
  valor: number,
  ordemId: string | null,
  itens: ItemOS[] = [],
): MovimentoCaixa {
  return {
    id,
    loja_id: "l1",
    data: "2026-08-28T15:00:00Z",
    ordem_servico_id: ordemId,
    tipo: "entrada",
    forma_pagamento: "pix",
    valor,
    descricao: null,
    categoria_id: null,
    ordem_servico: ordemId ? { id: ordemId, numero: 1, cliente: null, itens } : null,
  };
}

function saida(id: string, valor: number): MovimentoCaixa {
  return {
    id,
    loja_id: "l1",
    data: "2026-08-28T15:00:00Z",
    ordem_servico_id: null,
    tipo: "saida",
    forma_pagamento: null,
    valor,
    descricao: "Aluguel",
    categoria_id: null,
    ordem_servico: null,
  };
}

describe("custoDosItens", () => {
  it("soma custo de peça e de serviço", () => {
    const itens = [item("peca", "pneu", 2, 600), item("servico", "alinhamento", 1, 100)];
    expect(custoDosItens(itens, custoPeca, custoServico)).toBe(650); // 2x300 + 50
  });

  it("peça sem custo cadastrado conta como zero, não quebra", () => {
    expect(custoDosItens([item("peca", "sem-custo", 1, 100)], custoPeca, custoServico)).toBe(0);
  });

  // #655: peça avulsa (sem peca_id) usa o custo digitado no orçamento.
  it("peça avulsa usa o custo digitado; sem custo conta como zero", () => {
    const avulsa = { ...item("peca", "x", 2, 150), peca_id: null, custo_unitario: 80 };
    const semCusto = { ...item("peca", "x", 1, 90), peca_id: null, custo_unitario: null };
    expect(custoDosItens([avulsa, semCusto], custoPeca, custoServico)).toBe(160); // 2x80 + 0
  });
});

describe("resumirMovimentos", () => {
  // O caso que apareceu na loja: OS paga em duas formas contava o lucro dela
  // duas vezes no total do dia.
  const itensOsDividida = [item("peca", "pneu", 2, 597.5), item("servico", "alinhamento", 1, 300)];
  const diaComPagamentoDividido = [
    entrada("m1", 940, "os-2", [item("peca", "pneu", 1, 940)]),
    entrada("m2", 1195, "os-3", itensOsDividida),
    entrada("m3", 300, "os-3", itensOsDividida),
  ];

  it("conta o custo de uma OS uma vez só, mesmo com pagamento dividido", () => {
    const resumo = resumirMovimentos(diaComPagamentoDividido, custoPeca, custoServico);
    expect(resumo.entradas).toBe(2435);
    // OS 2: 300 de custo. OS 3: 2x300 + 50 = 650. Uma vez cada.
    expect(resumo.custoDeAquisicao).toBe(950);
    expect(resumo.lucro).toBe(1485);
  });

  it("ticket médio é por ordem, não por lançamento", () => {
    const resumo = resumirMovimentos(diaComPagamentoDividido, custoPeca, custoServico);
    expect(resumo.ordensDistintas).toBe(2);
    expect(resumo.ticketMedio).toBe(2435 / 2);
  });

  it("venda de balcão entra em vendas, custo e lucro, mas fica fora do ticket médio", () => {
    // Um par de palhetas vendido no balcão não é "um carro atendido": se
    // entrasse na média, derrubaria o ticket médio da oficina.
    const venda = entrada("m4", 100, "venda-1", [item("peca", "pneu", 1, 100)]);
    venda.ordem_servico = { ...venda.ordem_servico!, tipo: "venda_balcao" };

    const resumo = resumirMovimentos([...diaComPagamentoDividido, venda], custoPeca, custoServico);
    expect(resumo.entradas).toBe(2535);
    expect(resumo.custoDeAquisicao).toBe(950 + 300);
    expect(resumo.lucro).toBe(2535 - 1250);
    expect(resumo.ordensDistintas).toBe(2);
    expect(resumo.ticketMedio).toBe(2435 / 2);
  });

  it("sem OS no período, o ticket médio é zero mesmo com venda de balcão", () => {
    const venda = entrada("m4", 100, "venda-1", [item("peca", "pneu", 1, 100)]);
    venda.ordem_servico = { ...venda.ordem_servico!, tipo: "venda_balcao" };

    const resumo = resumirMovimentos([venda], custoPeca, custoServico);
    expect(resumo.entradas).toBe(100);
    expect(resumo.ordensDistintas).toBe(0);
    expect(resumo.ticketMedio).toBe(0);
  });

  it("desconta as saídas lançadas à mão do lucro", () => {
    const resumo = resumirMovimentos(
      [...diaComPagamentoDividido, saida("s1", 485)],
      custoPeca,
      custoServico,
    );
    expect(resumo.saidas).toBe(485);
    expect(resumo.lucro).toBe(1000);
  });

  it("entrada manual (sem OS) entra nas vendas mas não conta no ticket médio", () => {
    const resumo = resumirMovimentos([entrada("m1", 200, null)], custoPeca, custoServico);
    expect(resumo.entradas).toBe(200);
    expect(resumo.ordensDistintas).toBe(0);
    expect(resumo.ticketMedio).toBe(0);
  });

  it("dia sem movimento nenhum não quebra nem divide por zero", () => {
    const resumo = resumirMovimentos([], custoPeca, custoServico);
    expect(resumo).toMatchObject({ entradas: 0, lucro: 0, ticketMedio: 0 });
  });
});

describe("lucroPorMovimento", () => {
  const itens = [item("peca", "pneu", 2, 597.5), item("servico", "alinhamento", 1, 300)];

  it("reparte o lucro da OS entre os lançamentos, na proporção do que foi pago", () => {
    const movimentos = [entrada("m2", 1195, "os-3", itens), entrada("m3", 300, "os-3", itens)];
    const lucros = lucroPorMovimento(movimentos, custoPeca, custoServico);
    // Lucro da OS: 1495 de venda − 650 de custo = 845.
    expect((lucros.get("m2") ?? 0) + (lucros.get("m3") ?? 0)).toBeCloseTo(845, 2);
    expect(lucros.get("m2")).toBeCloseTo(845 * (1195 / 1495), 2);
  });

  it("OS paga numa forma só mostra o lucro inteiro naquela linha", () => {
    const lucros = lucroPorMovimento([entrada("m1", 1495, "os-3", itens)], custoPeca, custoServico);
    expect(lucros.get("m1")).toBe(845);
  });

  it("lançamento manual não tem lucro atribuído", () => {
    const lucros = lucroPorMovimento([entrada("m1", 200, null)], custoPeca, custoServico);
    expect(lucros.has("m1")).toBe(false);
  });
});
