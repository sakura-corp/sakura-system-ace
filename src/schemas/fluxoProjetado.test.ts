import { describe, expect, it } from "vitest";
import { calcularFluxoProjetado, type FluxoProjetado } from "./fluxoProjetado";
import type { ContaPagar } from "@/types/contaPagar";
import type { ContaReceber } from "@/types/contaReceber";

/**
 * O `hoje` é sempre texto fixo: o teste não pode depender do relógio de quem
 * roda (nem do fuso, ver `npm run test:fusos`).
 */
const HOJE = "2026-11-11";

function pagar(id: string, campos: Partial<ContaPagar> = {}): ContaPagar {
  return {
    id,
    loja_id: "loja-1",
    descricao: `Conta ${id}`,
    valor: 10,
    vencimento: HOJE,
    categoria_id: null,
    recorrente: false,
    recorrente_ate: null,
    status: "pendente",
    data_pagamento: null,
    caixa_movimento_id: null,
    operador_id: null,
    criado_em: "2026-10-01T12:00:00Z",
    ...campos,
  };
}

function receber(id: string, campos: Partial<ContaReceber> = {}): ContaReceber {
  return {
    id,
    loja_id: "loja-1",
    cliente_id: "cliente-1",
    ordem_servico_id: null,
    descricao: `Receber ${id}`,
    valor: 10,
    vencimento: HOJE,
    status: "pendente",
    data_recebimento: null,
    caixa_movimento_id: null,
    operador_id: null,
    criado_em: "2026-10-01T12:00:00Z",
    ...campos,
  };
}

/** Só os itens, achatados, como "dia tipo chave" — fácil de conferir à mão. */
function itensPorDia(fluxo: FluxoProjetado): string[] {
  return fluxo.dias.flatMap((dia) => dia.itens.map((item) => `${dia.dia} ${item.tipo} ${item.chave}`));
}

function dia(fluxo: FluxoProjetado, data: string) {
  const achado = fluxo.dias.find((d) => d.dia === data);
  if (!achado) throw new Error(`o dia ${data} não está no fluxo`);
  return achado;
}

describe("calcularFluxoProjetado: o período", () => {
  it("devolve uma linha por dia, de hoje até hoje + dias, inclusive", () => {
    const fluxo = calcularFluxoProjetado({ contasPagar: [], contasReceber: [], hoje: HOJE, dias: 2 });
    expect(fluxo.dias.map((d) => d.dia)).toEqual(["2026-11-11", "2026-11-12", "2026-11-13"]);
  });

  it("vira o mês e o ano sem pular nem repetir dia", () => {
    const fluxo = calcularFluxoProjetado({
      contasPagar: [],
      contasReceber: [],
      hoje: "2026-12-29",
      dias: 4,
    });
    expect(fluxo.dias.map((d) => d.dia)).toEqual([
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });

  it("dia sem movimento aparece com zero e repete o saldo acumulado", () => {
    const fluxo = calcularFluxoProjetado({
      contasPagar: [pagar("p1", { valor: 30, vencimento: "2026-11-13" })],
      contasReceber: [receber("r1", { valor: 100, vencimento: "2026-11-11" })],
      hoje: HOJE,
      dias: 3,
    });
    expect(
      fluxo.dias.map((d) => [d.dia, d.entra, d.sai, d.saldoDoDia, d.saldoAcumulado, d.itens.length]),
    ).toEqual([
      ["2026-11-11", 100, 0, 100, 100, 1],
      ["2026-11-12", 0, 0, 0, 100, 0],
      ["2026-11-13", 0, 30, -30, 70, 1],
      ["2026-11-14", 0, 0, 0, 70, 0],
    ]);
    expect(fluxo.totalEntra).toBe(100);
    expect(fluxo.totalSai).toBe(30);
    expect(fluxo.saldo).toBe(70);
  });

  it("vencimento no último dia entra; depois do fim não entra", () => {
    // hoje + 7 = 18/11.
    const fluxo = calcularFluxoProjetado({
      contasPagar: [
        pagar("no-fim", { vencimento: "2026-11-18", valor: 5 }),
        pagar("depois", { vencimento: "2026-11-19", valor: 7 }),
      ],
      contasReceber: [receber("r-depois", { vencimento: "2026-12-01", valor: 50 })],
      hoje: HOJE,
      dias: 7,
    });
    expect(itensPorDia(fluxo)).toEqual(["2026-11-18 sai no-fim"]);
    expect(fluxo.totalSai).toBe(5);
    expect(fluxo.totalEntra).toBe(0);
  });
});

describe("calcularFluxoProjetado: quais contas entram", () => {
  it("conta paga e conta recebida não entram", () => {
    const fluxo = calcularFluxoProjetado({
      contasPagar: [
        pagar("paga", { status: "paga", vencimento: "2026-11-12" }),
        pagar("aberta", { vencimento: "2026-11-12", valor: 8 }),
      ],
      contasReceber: [
        receber("recebida", { status: "recebido", vencimento: "2026-11-12" }),
        receber("a-receber", { vencimento: "2026-11-12", valor: 20 }),
      ],
      hoje: HOJE,
      dias: 5,
    });
    expect(itensPorDia(fluxo)).toEqual(["2026-11-12 entra a-receber", "2026-11-12 sai aberta"]);
    expect(fluxo.totalSai).toBe(8);
    expect(fluxo.totalEntra).toBe(20);
  });

  it("vencida e pendente entra no dia de hoje, marcada como atrasada, com o vencimento original", () => {
    const fluxo = calcularFluxoProjetado({
      contasPagar: [pagar("velha", { vencimento: "2026-10-20", valor: 40 })],
      contasReceber: [receber("devendo", { vencimento: "2026-11-01", valor: 15 })],
      hoje: HOJE,
      dias: 3,
    });
    const hoje = dia(fluxo, HOJE);
    expect(hoje.itens).toEqual([
      {
        chave: "devendo",
        tipo: "entra",
        descricao: "Receber devendo",
        valor: 15,
        vencimento: "2026-11-01",
        atrasada: true,
        prevista: false,
      },
      {
        chave: "velha",
        tipo: "sai",
        descricao: "Conta velha",
        valor: 40,
        vencimento: "2026-10-20",
        atrasada: true,
        prevista: false,
      },
    ]);
    // E conta no saldo, desde o primeiro dia.
    expect(hoje.saldoDoDia).toBe(-25);
    expect(fluxo.saldo).toBe(-25);
  });

  it("soma fecha no centavo (0,1 + 0,2 = 0,3)", () => {
    const fluxo = calcularFluxoProjetado({
      contasPagar: [],
      contasReceber: [
        receber("a", { valor: 0.1, vencimento: "2026-11-11" }),
        receber("b", { valor: 0.2, vencimento: "2026-11-11" }),
        receber("c", { valor: 0.1, vencimento: "2026-11-12" }),
        receber("d", { valor: 0.2, vencimento: "2026-11-13" }),
      ],
      hoje: HOJE,
      dias: 2,
    });
    expect(dia(fluxo, "2026-11-11").entra).toBe(0.3);
    expect(fluxo.dias.map((d) => d.saldoAcumulado)).toEqual([0.3, 0.4, 0.6]);
    expect(fluxo.totalEntra).toBe(0.6);
    expect(fluxo.saldo).toBe(0.6);
  });

  it("ordena os itens do dia: atrasadas primeiro, depois entra antes de sai, depois descrição", () => {
    const fluxo = calcularFluxoProjetado({
      contasPagar: [
        pagar("p-zeta", { descricao: "Zeta", vencimento: "2026-11-11" }),
        pagar("p-alfa", { descricao: "alfa", vencimento: "2026-11-11" }),
        pagar("p-velha", { descricao: "Velha", vencimento: "2026-11-01" }),
      ],
      contasReceber: [
        receber("r-beta", { descricao: "Beta", vencimento: "2026-11-11" }),
        receber("r-aaa", { descricao: "Aaa", vencimento: "2026-11-11" }),
      ],
      hoje: HOJE,
      dias: 0,
    });
    expect(fluxo.dias).toHaveLength(1);
    expect(fluxo.dias[0].itens.map((i) => i.chave)).toEqual([
      "p-velha",
      "r-aaa",
      "r-beta",
      "p-alfa",
      "p-zeta",
    ]);
  });
});

describe("calcularFluxoProjetado: recorrentes", () => {
  it("projeta as próximas ocorrências como previstas, com o mesmo valor e descrição", () => {
    // hoje + 60 = 10/01/2027: cabe 15/11 (a de verdade) e 15/12 (prevista).
    const fluxo = calcularFluxoProjetado({
      contasPagar: [
        pagar("aluguel", {
          descricao: "Aluguel",
          valor: 1500,
          vencimento: "2026-11-15",
          recorrente: true,
        }),
      ],
      contasReceber: [],
      hoje: HOJE,
      dias: 60,
    });
    expect(itensPorDia(fluxo)).toEqual([
      "2026-11-15 sai aluguel",
      "2026-12-15 sai aluguel:2026-12-15",
    ]);
    expect(dia(fluxo, "2026-12-15").itens[0]).toEqual({
      chave: "aluguel:2026-12-15",
      tipo: "sai",
      descricao: "Aluguel",
      valor: 1500,
      vencimento: "2026-12-15",
      atrasada: false,
      prevista: true,
    });
    expect(dia(fluxo, "2026-11-15").itens[0].prevista).toBe(false);
    expect(fluxo.totalSai).toBe(3000);
  });

  it("conta que não é recorrente não é projetada", () => {
    const fluxo = calcularFluxoProjetado({
      contasPagar: [pagar("uma-vez", { vencimento: "2026-11-15" })],
      contasReceber: [],
      hoje: HOJE,
      dias: 90,
    });
    expect(itensPorDia(fluxo)).toEqual(["2026-11-15 sai uma-vez"]);
  });

  it("recorrente já paga não projeta nada sozinha", () => {
    const fluxo = calcularFluxoProjetado({
      contasPagar: [pagar("paga", { vencimento: "2026-11-05", recorrente: true, status: "paga" })],
      contasReceber: [],
      hoje: HOJE,
      dias: 90,
    });
    expect(itensPorDia(fluxo)).toEqual([]);
  });

  it("vencimento dia 31 segue o mesmo encadeamento do pagarConta: 31/01, 28/02, 28/03", () => {
    // hoje + 90 = 10/04/2027.
    const fluxo = calcularFluxoProjetado({
      contasPagar: [pagar("luz", { vencimento: "2027-01-31", recorrente: true })],
      contasReceber: [],
      hoje: "2027-01-10",
      dias: 90,
    });
    expect(itensPorDia(fluxo)).toEqual([
      "2027-01-31 sai luz",
      "2027-02-28 sai luz:2027-02-28",
      "2027-03-28 sai luz:2027-03-28",
    ]);
  });

  it("para no \"Recorrente até\", que conta inclusive", () => {
    // hoje + 120 = 11/03/2027: sem limite, daria 15/12, 15/01 e 15/02.
    const ateDezembro = calcularFluxoProjetado({
      contasPagar: [
        pagar("plano", { vencimento: "2026-11-15", recorrente: true, recorrente_ate: "2026-12-31" }),
      ],
      contasReceber: [],
      hoje: HOJE,
      dias: 120,
    });
    expect(itensPorDia(ateDezembro)).toEqual([
      "2026-11-15 sai plano",
      "2026-12-15 sai plano:2026-12-15",
    ]);

    // No dia exato do "até" ainda entra (o pagarConta só para quando passa dele).
    const ateODia = calcularFluxoProjetado({
      contasPagar: [
        pagar("plano", { vencimento: "2026-11-15", recorrente: true, recorrente_ate: "2027-01-15" }),
      ],
      contasReceber: [],
      hoje: HOJE,
      dias: 120,
    });
    expect(itensPorDia(ateODia)).toEqual([
      "2026-11-15 sai plano",
      "2026-12-15 sai plano:2026-12-15",
      "2027-01-15 sai plano:2027-01-15",
    ]);
  });

  it("recorrente atrasada há mais de um mês: a atrasada aparece hoje e a previsão só olha pra frente", () => {
    // Venceu 20/09 e ninguém pagou. A de 20/10 ainda não existe (o pagarConta
    // só cria a próxima ao pagar): ela NÃO vira prevista no passado, nem é
    // jogada pra hoje. A de 20/11 já está no período e entra como prevista.
    const fluxo = calcularFluxoProjetado({
      contasPagar: [pagar("internet", { vencimento: "2026-09-20", recorrente: true, valor: 100 })],
      contasReceber: [],
      hoje: HOJE,
      dias: 30,
    });
    expect(itensPorDia(fluxo)).toEqual([
      "2026-11-11 sai internet",
      "2026-11-20 sai internet:2026-11-20",
    ]);
    expect(dia(fluxo, HOJE).itens[0].atrasada).toBe(true);
    expect(fluxo.totalSai).toBe(200);
  });

  it("não conta duas vezes quando a próxima já existe pendente (pagamento desfeito)", () => {
    // Pagou a de 15/11 (o sistema criou a de 15/12) e depois desfez: as duas
    // ficam pendentes. Cada mês aparece uma vez só.
    const fluxo = calcularFluxoProjetado({
      contasPagar: [
        pagar("nov", { descricao: "Aluguel", valor: 1500, vencimento: "2026-11-15", recorrente: true }),
        pagar("dez", {
          // A série é a mesma mesmo com espaço e maiúscula diferentes.
          descricao: "  aluguel ",
          valor: 1500,
          vencimento: "2026-12-15",
          recorrente: true,
        }),
      ],
      contasReceber: [],
      hoje: HOJE,
      dias: 70, // até 20/01/2027
    });
    expect(itensPorDia(fluxo)).toEqual([
      "2026-11-15 sai nov",
      "2026-12-15 sai dez",
      "2027-01-15 sai dez:2027-01-15",
    ]);
    expect(fluxo.totalSai).toBe(4500);
  });

  it("não reaparece como prevista a ocorrência que já existe paga", () => {
    const fluxo = calcularFluxoProjetado({
      contasPagar: [
        pagar("nov", { descricao: "Aluguel", vencimento: "2026-11-15", recorrente: true }),
        pagar("dez", {
          descricao: "Aluguel",
          vencimento: "2026-12-15",
          recorrente: true,
          status: "paga",
        }),
        pagar("jan", { descricao: "Aluguel", vencimento: "2027-01-15", recorrente: true }),
      ],
      contasReceber: [],
      hoje: HOJE,
      dias: 70,
    });
    expect(itensPorDia(fluxo)).toEqual(["2026-11-15 sai nov", "2027-01-15 sai jan"]);
  });

  it("série diferente (outro valor ou outra categoria) projeta por conta própria", () => {
    const fluxo = calcularFluxoProjetado({
      contasPagar: [
        pagar("a", { descricao: "Seguro", valor: 100, vencimento: "2026-11-15", recorrente: true }),
        pagar("b", { descricao: "Seguro", valor: 200, vencimento: "2026-12-15", recorrente: true }),
        pagar("c", {
          descricao: "Seguro",
          valor: 100,
          categoria_id: "cat-2",
          vencimento: "2026-12-15",
          recorrente: true,
        }),
      ],
      contasReceber: [],
      hoje: HOJE,
      dias: 40, // até 21/12
    });
    expect(itensPorDia(fluxo)).toEqual([
      "2026-11-15 sai a",
      "2026-12-15 sai a:2026-12-15",
      "2026-12-15 sai b",
      "2026-12-15 sai c",
    ]);
  });
});

describe("calcularFluxoProjetado: sem acesso a um dos módulos", () => {
  const contasPagar = [pagar("p", { valor: 30, vencimento: "2026-11-12" })];
  const contasReceber = [receber("r", { valor: 100, vencimento: "2026-11-12" })];

  it("sem Contas a Pagar: a saída e o saldo ficam null, a entrada continua", () => {
    const fluxo = calcularFluxoProjetado({ contasPagar: null, contasReceber, hoje: HOJE, dias: 2 });
    for (const d of fluxo.dias) {
      expect(d.sai).toBeNull();
      expect(d.saldoDoDia).toBeNull();
      expect(d.saldoAcumulado).toBeNull();
    }
    expect(fluxo.dias.map((d) => d.entra)).toEqual([0, 100, 0]);
    expect(itensPorDia(fluxo)).toEqual(["2026-11-12 entra r"]);
    expect(fluxo.totalSai).toBeNull();
    expect(fluxo.totalEntra).toBe(100);
    expect(fluxo.saldo).toBeNull();
  });

  it("sem Contas a Receber: a entrada e o saldo ficam null, a saída continua", () => {
    const fluxo = calcularFluxoProjetado({ contasPagar, contasReceber: null, hoje: HOJE, dias: 2 });
    for (const d of fluxo.dias) {
      expect(d.entra).toBeNull();
      expect(d.saldoDoDia).toBeNull();
      expect(d.saldoAcumulado).toBeNull();
    }
    expect(fluxo.dias.map((d) => d.sai)).toEqual([0, 30, 0]);
    expect(itensPorDia(fluxo)).toEqual(["2026-11-12 sai p"]);
    expect(fluxo.totalEntra).toBeNull();
    expect(fluxo.totalSai).toBe(30);
    expect(fluxo.saldo).toBeNull();
  });

  it("sem os dois: tudo null, nenhum item, mas os dias continuam lá", () => {
    const fluxo = calcularFluxoProjetado({
      contasPagar: null,
      contasReceber: null,
      hoje: HOJE,
      dias: 2,
    });
    expect(fluxo.dias).toHaveLength(3);
    for (const d of fluxo.dias) {
      expect([d.entra, d.sai, d.saldoDoDia, d.saldoAcumulado]).toEqual([null, null, null, null]);
      expect(d.itens).toEqual([]);
    }
    expect([fluxo.totalEntra, fluxo.totalSai, fluxo.saldo]).toEqual([null, null, null]);
  });
});
