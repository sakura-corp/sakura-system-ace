// A promessa em uma frase: depois de pago, mexer numa OS daquele período
// NUNCA passa calado — e uma OS já paga num período não é paga de novo em
// outro sem aviso.
import { describe, expect, it } from "vitest";
import type { ComissaoFechamento } from "@/types/comissaoFechamento";
import type { ComissaoFuncionario, OrdemDaComissao, ResumoPapel } from "./comissoes";
import {
  compararComPagamento,
  jaPagoEmOutrosPeriodos,
  pagamentoDoPeriodo,
  retratoDaLinha,
} from "./comissoesPagas";

function ordem(ordemId: string, numero: number, comissao: number): OrdemDaComissao {
  return {
    ordemId,
    numero,
    data: "2026-09-10T12:00:00Z",
    cliente: "Cliente",
    vendido: 0,
    custo: 0,
    lucro: 0,
    comissao,
    aReceber: false,
    comissaoAReceber: 0,
    itensSemCusto: 0,
  };
}

function papel(ordens: OrdemDaComissao[]): ResumoPapel {
  return { vendido: 0, custo: 0, lucro: 0, comissao: 0, comissaoAReceber: 0, itensSemCusto: 0, ordens };
}

function linha(vendedor: OrdemDaComissao[], tecnico: OrdemDaComissao[], total: number): ComissaoFuncionario {
  return {
    funcionarioId: "f1",
    nome: "Ana",
    percentual: 10,
    comoVendedor: papel(vendedor),
    comoTecnico: papel(tecnico),
    comissaoTotal: total,
    vendidoTotal: 0,
    lucroTotal: 0,
  };
}

function pagamento(
  de: string,
  ate: string,
  snapshot: ComissaoFechamento["snapshot"],
  valor: number,
  funcionario = "f1",
): ComissaoFechamento {
  return {
    id: `p-${de}-${ate}`,
    loja_id: "l",
    funcionario_id: funcionario,
    funcionario_nome: "Ana",
    periodo_inicio: de,
    periodo_fim: ate,
    percentual: 10,
    valor_calculado: valor,
    valor_pago: valor,
    data_pagamento: ate,
    observacao: null,
    snapshot,
    operador_id: null,
    criado_em: `${ate}T20:00:00Z`,
  };
}

describe("retratoDaLinha", () => {
  it("guarda cada OS com o papel e a comissão", () => {
    const l = linha([ordem("o1", 1, 30)], [ordem("o1", 1, 12.5), ordem("o2", 2, 8)], 50.5);
    expect(retratoDaLinha(l)).toEqual([
      { ordemId: "o1", numero: 1, papel: "vendedor", comissao: 30 },
      { ordemId: "o1", numero: 1, papel: "tecnico", comissao: 12.5 },
      { ordemId: "o2", numero: 2, papel: "tecnico", comissao: 8 },
    ]);
  });
});

describe("compararComPagamento", () => {
  const l = linha([ordem("o1", 1, 30)], [ordem("o2", 2, 8)], 38);
  const pago = pagamento("2026-09-01", "2026-09-30", retratoDaLinha(l), 38);

  it("nada mudou: não diverge", () => {
    const c = compararComPagamento(l, pago);
    expect(c).toMatchObject({ divergiu: false, diferenca: 0, mudancas: [] });
  });

  it("uma OS editada depois do pagamento: diverge, e diz qual e quanto", () => {
    const editada = linha([ordem("o1", 1, 24)], [ordem("o2", 2, 8)], 32);
    const c = compararComPagamento(editada, pago);
    expect(c.divergiu).toBe(true);
    expect(c.diferenca).toBe(-6);
    expect(c.mudancas).toEqual([{ numero: 1, papel: "vendedor", antes: 30, agora: 24 }]);
  });

  it("OS que entrou ou saiu do período também aparece", () => {
    const mudou = linha([ordem("o1", 1, 30), ordem("o3", 3, 5)], [], 35);
    const c = compararComPagamento(mudou, pago);
    expect(c.mudancas).toEqual([
      { numero: 2, papel: "tecnico", antes: 8, agora: null },
      { numero: 3, papel: "vendedor", antes: null, agora: 5 },
    ]);
  });

  it("a linha sumiu inteira (todas as OS saíram): recalculado zero, tudo como 'saiu'", () => {
    const c = compararComPagamento(undefined, pago);
    expect(c).toMatchObject({ recalculado: 0, congelado: 38, diferenca: -38, divergiu: true });
    expect(c.mudancas).toHaveLength(2);
  });

  it("diferença de ponto flutuante não vira divergência", () => {
    const l2 = linha([ordem("o1", 1, 0.1 + 0.2)], [], 0.3);
    const p2 = pagamento("2026-09-01", "2026-09-30", [{ ordemId: "o1", numero: 1, papel: "vendedor", comissao: 0.3 }], 0.3);
    expect(compararComPagamento(l2, p2).divergiu).toBe(false);
  });
});

describe("pagamentoDoPeriodo", () => {
  it("acha só o do mesmo funcionário e do MESMO período", () => {
    const pagamentos = [
      pagamento("2026-09-01", "2026-09-30", [], 10),
      pagamento("2026-09-01", "2026-09-30", [], 10, "f2"),
      pagamento("2026-08-01", "2026-08-31", [], 10),
    ];
    expect(pagamentoDoPeriodo(pagamentos, "f1", "2026-09-01", "2026-09-30")).toBe(pagamentos[0]);
    expect(pagamentoDoPeriodo(pagamentos, "f1", "2026-09-01", "2026-09-29")).toBeNull();
  });
});

describe("jaPagoEmOutrosPeriodos", () => {
  it("acusa a OS paga num período que cruza com este", () => {
    const setembro = pagamento(
      "2026-09-01",
      "2026-09-30",
      [
        { ordemId: "o1", numero: 1, papel: "vendedor", comissao: 30 },
        { ordemId: "o9", numero: 9, papel: "vendedor", comissao: 99 },
      ],
      129,
    );
    const outroFuncionario = pagamento("2026-09-01", "2026-09-30", [{ ordemId: "o2", numero: 2, papel: "tecnico", comissao: 8 }], 8, "f2");
    const agora = linha([ordem("o1", 1, 30)], [ordem("o2", 2, 8)], 38);

    const r = jaPagoEmOutrosPeriodos(agora, [setembro, outroFuncionario], "2026-09-15", "2026-10-15");
    expect(r.valor).toBe(30);
    expect(r.numeros).toEqual([1]);
    expect(r.pagamentos).toEqual([setembro]);
  });

  it("o próprio período não conta como 'outro'", () => {
    const agora = linha([ordem("o1", 1, 30)], [], 30);
    const mesmo = pagamento("2026-09-01", "2026-09-30", retratoDaLinha(agora), 30);
    expect(jaPagoEmOutrosPeriodos(agora, [mesmo], "2026-09-01", "2026-09-30").valor).toBe(0);
  });

  it("o mesmo número de OS em papel diferente não é o mesmo pagamento", () => {
    const agora = linha([], [ordem("o1", 1, 12)], 12);
    const comoVendedor = pagamento("2026-09-01", "2026-09-30", [{ ordemId: "o1", numero: 1, papel: "vendedor", comissao: 30 }], 30);
    expect(jaPagoEmOutrosPeriodos(agora, [comoVendedor], "2026-09-15", "2026-10-15").valor).toBe(0);
  });
});
