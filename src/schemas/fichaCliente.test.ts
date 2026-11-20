import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  comprasDoCliente,
  contaAtrasada,
  contasRecebidas,
  dividaDoCliente,
  formasDePagamento,
  resumoDoCliente,
  type ContaDaFicha,
  type OrdemDaFichaDoCliente,
} from "./fichaCliente";

// Os casos de "dia no fuso local" são do Brasil: fixa o fuso nesses testes
// (o mesmo jeito de comissoes.test.ts), pra rodada em UTC do test:fusos não
// mudar a resposta.
const fusoOriginal = process.env.TZ;
beforeEach(() => {
  process.env.TZ = "America/Sao_Paulo";
});
afterEach(() => {
  process.env.TZ = fusoOriginal;
});

let proximoId = 1;
function ordem(campos: Partial<OrdemDaFichaDoCliente> = {}): OrdemDaFichaDoCliente {
  const id = `os-${proximoId++}`;
  return {
    id,
    numero: proximoId,
    tipo: "os",
    loja_id: "loja-a",
    cliente_id: "cli",
    status: "faturada",
    km_entrada: null,
    data_abertura: "2026-03-10T13:00:00.000Z",
    data_fechamento: "2026-03-10T15:00:00.000Z",
    forma_pagamento: "Pix",
    parcelas: 1,
    itens: [
      {
        id: `${id}-i`,
        tipo: "servico",
        peca_id: null,
        descricao: "Alinhamento",
        quantidade: 1,
        preco_unitario: 100,
        desconto: 0,
      },
    ],
    ...campos,
  };
}

function conta(campos: Partial<ContaDaFicha> = {}): ContaDaFicha {
  return {
    id: `cr-${proximoId++}`,
    loja_id: "loja-a",
    ordem_servico_id: null,
    descricao: "Faturamento da OS 4",
    valor: 100,
    vencimento: "2026-11-20",
    status: "pendente",
    data_recebimento: null,
    ...campos,
  };
}

describe("comprasDoCliente", () => {
  it("deixa o orçamento e o recusado de fora (não é compra)", () => {
    const lista = comprasDoCliente([
      ordem({ status: "orcamento" }),
      ordem({ status: "recusado" }),
      ordem({ status: "em_andamento" }),
    ]);
    expect(lista.map((o) => o.status)).toEqual(["em_andamento"]);
  });

  it("vem da mais recente pra mais antiga", () => {
    const antiga = ordem({ data_abertura: "2026-01-05T13:00:00.000Z" });
    const nova = ordem({ data_abertura: "2026-06-05T13:00:00.000Z" });
    expect(comprasDoCliente([antiga, nova]).map((o) => o.id)).toEqual([nova.id, antiga.id]);
  });
});

describe("resumoDoCliente", () => {
  it("soma só as faturadas (OS e venda de balcão), fechando no centavo", () => {
    const resumo = resumoDoCliente([
      ordem({ itens: [{ ...ordem().itens![0], preco_unitario: 150.1 }] }),
      ordem({ tipo: "venda_balcao", itens: [{ ...ordem().itens![0], preco_unitario: 0.2 }] }),
      ordem({ status: "em_andamento", itens: [{ ...ordem().itens![0], preco_unitario: 999 }] }),
    ]);
    expect(resumo.totalComprado).toBe(150.3);
    expect(resumo.faturadas).toBe(2);
  });

  it("orçamento não conta: nem no total, nem como visita", () => {
    const resumo = resumoDoCliente([
      ordem({
        status: "orcamento",
        data_abertura: "2026-09-01T13:00:00.000Z",
        // Um orçamento nunca é faturado, mas a regra fica escrita mesmo assim.
      }),
      ordem({ status: "recusado", data_abertura: "2026-09-02T13:00:00.000Z" }),
    ]);
    expect(resumo.totalComprado).toBe(0);
    expect(resumo.visitas).toBe(0);
    expect(resumo.ultimaVisita).toBeNull();
  });

  it("orçamento ao lado de uma OS: só a OS conta como visita", () => {
    const resumo = resumoDoCliente([ordem({ status: "orcamento" }), ordem()]);
    expect(resumo.totalComprado).toBe(100);
    expect(resumo.visitas).toBe(1);
  });

  it("conta visitas por dia (duas OS no mesmo dia = uma visita) e dá a última", () => {
    const resumo = resumoDoCliente([
      ordem({ data_abertura: "2026-03-10T13:00:00.000Z" }),
      ordem({ data_abertura: "2026-03-10T18:00:00.000Z" }),
      ordem({ data_abertura: "2026-05-02T13:00:00.000Z", status: "em_andamento" }),
    ]);
    expect(resumo.visitas).toBe(2);
    expect(resumo.ultimaVisita).toBe("2026-05-02");
  });

  it("a última visita é o dia no fuso local, não o de UTC", () => {
    // 01:30 em UTC de 11/03 ainda é 10/03 no Brasil (itens 34 e 42).
    const resumo = resumoDoCliente([ordem({ data_abertura: "2026-03-11T01:30:00.000Z" })]);
    expect(resumo.ultimaVisita).toBe("2026-03-10");
  });

  it("sem nenhuma compra: zero, nenhuma visita", () => {
    expect(resumoDoCliente([])).toEqual({
      totalComprado: 0,
      faturadas: 0,
      visitas: 0,
      ultimaVisita: null,
    });
  });
});

describe("contaAtrasada", () => {
  const hoje = "2026-11-11";
  it("pendente com vencimento antes de hoje está atrasada", () => {
    expect(contaAtrasada(conta({ vencimento: "2026-11-10" }), hoje)).toBe(true);
  });
  it("vencendo hoje ainda não está atrasada", () => {
    expect(contaAtrasada(conta({ vencimento: "2026-11-11" }), hoje)).toBe(false);
  });
  it("recebida nunca está atrasada", () => {
    expect(
      contaAtrasada(conta({ vencimento: "2026-01-01", status: "recebido" }), hoje),
    ).toBe(false);
  });
});

describe("dividaDoCliente", () => {
  const hoje = "2026-11-11";

  it("soma só as pendentes; a recebida não é dívida", () => {
    const divida = dividaDoCliente(
      [
        conta({ valor: 80.1 }),
        conta({ valor: 0.2, vencimento: "2026-10-01" }),
        conta({ valor: 500, status: "recebido", data_recebimento: "2026-10-05T14:00:00.000Z" }),
      ],
      hoje,
    );
    expect(divida.totalEmAberto).toBe(80.3);
    expect(divida.pendentes).toHaveLength(2);
  });

  it("separa o atrasado (vencimento antes de hoje)", () => {
    const divida = dividaDoCliente(
      [
        conta({ valor: 100, vencimento: "2026-11-10" }),
        conta({ valor: 40, vencimento: "2026-11-11" }),
        conta({ valor: 60, vencimento: "2026-12-01" }),
      ],
      hoje,
    );
    expect(divida.totalAtrasado).toBe(100);
    expect(divida.atrasadas).toBe(1);
    expect(divida.totalEmAberto).toBe(200);
  });

  it("as pendentes vêm da que vence primeiro à última", () => {
    const tarde = conta({ vencimento: "2026-12-01" });
    const cedo = conta({ vencimento: "2026-10-01" });
    expect(dividaDoCliente([tarde, cedo], hoje).pendentes.map((c) => c.id)).toEqual([
      cedo.id,
      tarde.id,
    ]);
  });

  it("sem conta nenhuma: não deve nada", () => {
    expect(dividaDoCliente([], hoje)).toEqual({
      pendentes: [],
      totalEmAberto: 0,
      atrasadas: 0,
      totalAtrasado: 0,
    });
  });
});

describe("formasDePagamento", () => {
  it("uma linha por OS ou venda faturada, com a forma, as parcelas e o valor", () => {
    const linhas = formasDePagamento([
      ordem({
        numero: 4,
        forma_pagamento: "Cartão de crédito",
        parcelas: 3,
        data_fechamento: "2026-04-02T15:00:00.000Z",
      }),
      ordem({ status: "concluida", forma_pagamento: null }),
    ]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      numero: 4,
      forma: "Cartão de crédito",
      parcelas: 3,
      valor: 100,
      dia: "2026-04-02",
    });
  });

  it("traduz o código antigo da forma (\"cartao_credito\") e deixa o texto pronto como está", () => {
    const linhas = formasDePagamento([
      ordem({ forma_pagamento: "cartao_credito", data_fechamento: "2026-02-02T15:00:00.000Z" }),
      ordem({ forma_pagamento: "Pix + Dinheiro", data_fechamento: "2026-01-02T15:00:00.000Z" }),
      ordem({ forma_pagamento: null, data_fechamento: "2025-12-02T15:00:00.000Z" }),
    ]);
    expect(linhas.map((l) => l.forma)).toEqual(["Cartão de crédito", "Pix + Dinheiro", null]);
  });

  it("a mais recente primeiro, pelo dia do faturamento", () => {
    const antiga = ordem({ data_fechamento: "2026-01-02T15:00:00.000Z" });
    const nova = ordem({ data_fechamento: "2026-08-02T15:00:00.000Z" });
    expect(formasDePagamento([antiga, nova]).map((l) => l.ordemId)).toEqual([nova.id, antiga.id]);
  });
});

describe("contasRecebidas", () => {
  it("só as recebidas, com o dia do recebimento no fuso local, a mais recente primeiro", () => {
    const linhas = contasRecebidas([
      conta({ status: "pendente" }),
      conta({ id: "a", status: "recebido", data_recebimento: "2026-05-03T01:00:00.000Z" }),
      conta({ id: "b", status: "recebido", data_recebimento: "2026-07-10T15:00:00.000Z" }),
    ]);
    expect(linhas.map((c) => c.id)).toEqual(["b", "a"]);
    // 01:00 UTC de 03/05 é 02/05 no Brasil.
    expect(linhas[1].diaRecebimento).toBe("2026-05-02");
  });
});
