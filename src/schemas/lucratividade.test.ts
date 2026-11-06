import { describe, expect, it } from "vitest";
import { lucratividadePorItem } from "./lucratividade";
import type { ItemOS, OrdemServico } from "@/types/os";

// Relações → Lucratividade: receita, custo e margem por peça/serviço no
// período. A conta morava dentro da tela (docs/licoes.md, item 38) e veio
// pra cá com a tarefa #379, que pediu que orçamento não entrasse nela.

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

function ordem(parcial: Partial<OrdemServico>): OrdemServico {
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
    data_abertura: "2026-10-10T12:00:00.000Z",
    data_fechamento: null,
    vendedor_id: null,
    criado_por_id: null,
    atualizado_por_id: null,
    itens: [],
    ...parcial,
  };
}

const custoPeca = new Map([["pneu", 200]]);
const custoServico = new Map([["alinhamento", 30]]);
const periodo = { de: "2026-10-01", ate: "2026-10-31" };

describe("lucratividadePorItem", () => {
  it("soma receita, custo e margem por descrição, maior margem primeiro", () => {
    const resultado = lucratividadePorItem({
      ordens: [
        ordem({
          id: "os-1",
          itens: [
            item({ quantidade: 2, preco_unitario: 300, desconto: 20 }),
            item({ tipo: "servico", peca_id: null, servico_id: "alinhamento", descricao: "Alinhamento", preco_unitario: 80 }),
          ],
        }),
        ordem({ id: "os-2", status: "em_andamento", itens: [item({ quantidade: 1 })] }),
      ],
      custoPeca,
      custoServico,
      ...periodo,
    });
    // Pneu: 3 un., receita 600-20+300 = 880, custo 3x200 = 600, margem 280.
    // Alinhamento: receita 80, custo 30, margem 50.
    expect(resultado.linhas).toEqual([
      { descricao: "Pneu", quantidade: 3, receita: 880, custo: 600, margem: 280, custoNaoInformado: false },
      { descricao: "Alinhamento", quantidade: 1, receita: 80, custo: 30, margem: 50, custoNaoInformado: false },
    ]);
    expect(resultado.totalReceita).toBe(960);
    expect(resultado.totalCusto).toBe(630);
    expect(resultado.totalMargem).toBe(330);
  });

  it("fica só no período, pelo dia de abertura no fuso local", () => {
    const fusoOriginal = process.env.TZ;
    process.env.TZ = "America/Sao_Paulo";
    try {
      // 22h de 31/10 em São Paulo = 01h de 01/11 em UTC: é de outubro.
      const aNoite = ordem({ data_abertura: "2026-11-01T01:00:00.000Z", itens: [item({})] });
      const novembro = ordem({ id: "os-2", data_abertura: "2026-11-01T12:00:00.000Z", itens: [item({})] });
      const resultado = lucratividadePorItem({ ordens: [aNoite, novembro], custoPeca, custoServico, ...periodo });
      expect(resultado.totalReceita).toBe(300);
    } finally {
      process.env.TZ = fusoOriginal;
    }
  });

  it("orçamento (aberto ou recusado) não entra", () => {
    const resultado = lucratividadePorItem({
      ordens: [
        ordem({ id: "os-1", itens: [item({})] }),
        ordem({ id: "orc-1", numero: null, numero_orcamento: 1, status: "orcamento", itens: [item({ quantidade: 4 })] }),
        ordem({ id: "orc-2", numero: null, numero_orcamento: 2, status: "recusado", itens: [item({ quantidade: 4 })] }),
      ],
      custoPeca,
      custoServico,
      ...periodo,
    });
    expect(resultado.linhas).toEqual([
      { descricao: "Pneu", quantidade: 1, receita: 300, custo: 200, margem: 100, custoNaoInformado: false },
    ]);
  });

  // #655: peça avulsa (sem peca_id) usa o custo digitado no orçamento. Sem
  // custo digitado, a linha não tem margem de verdade: fica marcada (e vai
  // pro fim, pra margem inventada não aparecer como "a que mais rende").
  it("peça avulsa usa o custo digitado; sem custo marca a linha e o total", () => {
    const resultado = lucratividadePorItem({
      ordens: [
        ordem({
          itens: [
            item({ peca_id: null, custo_unitario: 40, descricao: "Palheta", quantidade: 2, preco_unitario: 50 }),
            item({ peca_id: null, custo_unitario: null, descricao: "Farol", preco_unitario: 500 }),
            item({ quantidade: 1 }),
          ],
        }),
      ],
      custoPeca,
      custoServico,
      ...periodo,
    });
    // Pneu: 300 − 200 = 100. Palheta: 100 − 2x40 = 20. Farol: sem custo.
    expect(resultado.linhas).toEqual([
      { descricao: "Pneu", quantidade: 1, receita: 300, custo: 200, margem: 100, custoNaoInformado: false },
      { descricao: "Palheta", quantidade: 2, receita: 100, custo: 80, margem: 20, custoNaoInformado: false },
      { descricao: "Farol", quantidade: 1, receita: 500, custo: 0, margem: 500, custoNaoInformado: true },
    ]);
    expect(resultado.algumCustoNaoInformado).toBe(true);
  });

  it("sem peça avulsa sem custo, o total não fica marcado", () => {
    const resultado = lucratividadePorItem({
      ordens: [ordem({ itens: [item({ peca_id: null, custo_unitario: 0 })] })],
      custoPeca,
      custoServico,
      ...periodo,
    });
    expect(resultado.linhas[0]).toMatchObject({ custo: 0, margem: 300, custoNaoInformado: false });
    expect(resultado.algumCustoNaoInformado).toBe(false);
  });

  // #744: no orçamento, a peça digitada ligada a uma do cadastro ("É uma
  // peça que já tenho") guarda o peca_id, mas o item fica com o nome
  // digitado. A linha é a da peça do cadastro, com o nome do cadastro; o
  // item (e o que o cliente viu impresso) não muda.
  it("item ligado ao cadastro agrupa pela peça, com o nome do cadastro, mesmo digitado diferente", () => {
    const resultado = lucratividadePorItem({
      ordens: [
        ordem({
          itens: [
            item({ peca_id: "bico", descricao: "Bico de válvula (exemplo)", preco_unitario: 10 }),
            item({ peca_id: "bico", descricao: "Bico de valvula cromado", preco_unitario: 12 }),
          ],
        }),
      ],
      custoPeca: new Map([["bico", 4]]),
      custoServico,
      nomePeca: new Map([["bico", "Bico de válvula (exemplo)"]]),
      ...periodo,
    });
    expect(resultado.linhas).toEqual([
      { descricao: "Bico de válvula (exemplo)", quantidade: 2, receita: 22, custo: 8, margem: 14, custoNaoInformado: false },
    ]);
  });

  it("o serviço do cadastro também agrupa pelo cadastro; peça avulsa continua pelo nome", () => {
    const resultado = lucratividadePorItem({
      ordens: [
        ordem({
          itens: [
            item({ tipo: "servico", peca_id: null, servico_id: "alinhamento", descricao: "Alinhamento", preco_unitario: 80 }),
            item({ tipo: "servico", peca_id: null, servico_id: "alinhamento", descricao: "Alinhamento 3D", preco_unitario: 80 }),
            item({ peca_id: null, custo_unitario: 10, descricao: "Palheta", preco_unitario: 50 }),
            item({ peca_id: null, custo_unitario: 10, descricao: "Palheta", preco_unitario: 50 }),
          ],
        }),
      ],
      custoPeca,
      custoServico,
      nomeServico: new Map([["alinhamento", "Alinhamento"]]),
      ...periodo,
    });
    expect(resultado.linhas.map((l) => [l.descricao, l.quantidade])).toEqual([
      ["Alinhamento", 2],
      ["Palheta", 2],
    ]);
  });

  it("peça que saiu do cadastro (sem nome no mapa) agrupa pelo id, com o nome do primeiro item", () => {
    const resultado = lucratividadePorItem({
      ordens: [ordem({ itens: [item({ descricao: "Pneu aro 13" }), item({ descricao: "Pneu 13" })] })],
      custoPeca,
      custoServico,
      ...periodo,
    });
    expect(resultado.linhas.map((l) => [l.descricao, l.quantidade])).toEqual([["Pneu aro 13", 2]]);
  });
});
