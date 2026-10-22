import { describe, expect, it } from "vitest";
import {
  avisoKmMenor,
  avisoPecaSemCusto,
  avisoSaldoInsuficiente,
  ultimoKmConhecido,
} from "./avisosOrdemServico";

function ordem(
  id: string,
  veiculoId: string | null,
  km: number | null,
  dataAbertura: string,
) {
  return { id, veiculo_id: veiculoId, km_entrada: km, data_abertura: dataAbertura };
}

describe("ultimoKmConhecido", () => {
  const veiculos = [
    { id: "v1", km_atual: 50_000 },
    { id: "v2", km_atual: null },
  ];

  it("não sugere nada quando nenhum veículo foi escolhido", () => {
    expect(ultimoKmConhecido("", veiculos, [])).toBeNull();
  });

  it("usa o km do cadastro quando o carro nunca passou por uma OS", () => {
    expect(ultimoKmConhecido("v1", veiculos, [])).toBe(50_000);
  });

  it("devolve null quando não há km em lugar nenhum", () => {
    expect(ultimoKmConhecido("v2", veiculos, [])).toBeNull();
  });

  it("prefere a OS mais recente ao km do cadastro", () => {
    const ordens = [
      ordem("os1", "v1", 61_000, "2026-03-10T12:00:00Z"),
      ordem("os2", "v1", 58_000, "2026-01-05T12:00:00Z"),
    ];
    expect(ultimoKmConhecido("v1", veiculos, ordens)).toBe(61_000);
  });

  it("ignora orçamento aberto ou recusado (#379): só OS conta como passagem", () => {
    const ordens = [
      { ...ordem("orc1", "v1", 999_999, "2026-03-12T12:00:00Z"), status: "recusado" as const },
      { ...ordem("orc2", "v1", 888_888, "2026-03-11T12:00:00Z"), status: "orcamento" as const },
      { ...ordem("os1", "v1", 61_000, "2026-03-10T12:00:00Z"), status: "faturada" as const },
    ];
    expect(ultimoKmConhecido("v1", veiculos, ordens)).toBe(61_000);
  });

  it("não se deixa contaminar por um km absurdo antigo — vale o mais recente, não o maior", () => {
    // Um "999999" digitado por engano no passado não pode virar a referência
    // eterna: senão o aviso de KM menor dispararia em toda OS seguinte.
    const ordens = [
      ordem("os1", "v1", 999_999, "2026-01-05T12:00:00Z"),
      ordem("os2", "v1", 62_000, "2026-03-10T12:00:00Z"),
    ];
    expect(ultimoKmConhecido("v1", veiculos, ordens)).toBe(62_000);
  });

  it("ignora OS de outro veículo e OS sem km", () => {
    const ordens = [
      ordem("os1", "v2", 80_000, "2026-04-01T12:00:00Z"),
      ordem("os2", "v1", null, "2026-03-30T12:00:00Z"),
      ordem("os3", "v1", 59_000, "2026-02-01T12:00:00Z"),
    ];
    expect(ultimoKmConhecido("v1", veiculos, ordens)).toBe(59_000);
  });

  it("ignora a própria OS aberta na tela (edição)", () => {
    const ordens = [
      ordem("os-atual", "v1", 70_000, "2026-05-01T12:00:00Z"),
      ordem("os-antiga", "v1", 64_000, "2026-02-01T12:00:00Z"),
    ];
    expect(ultimoKmConhecido("v1", veiculos, ordens, "os-atual")).toBe(64_000);
  });
});

describe("avisoKmMenor", () => {
  it("cala quando não há km anterior conhecido", () => {
    expect(avisoKmMenor("1000", null)).toBeNull();
  });

  it("cala com o campo vazio ou com texto que não é número", () => {
    expect(avisoKmMenor("", 60_000)).toBeNull();
    expect(avisoKmMenor("   ", 60_000)).toBeNull();
    expect(avisoKmMenor("abc", 60_000)).toBeNull();
  });

  it("cala quando o km subiu ou ficou igual", () => {
    expect(avisoKmMenor("61000", 60_000)).toBeNull();
    expect(avisoKmMenor("60000", 60_000)).toBeNull();
  });

  it("avisa quando o km digitado é menor, dizendo qual era o anterior", () => {
    const aviso = avisoKmMenor("6000", 60_000);
    expect(aviso).toContain("60.000");
    expect(aviso).toContain("dígito");
  });
});

describe("avisoSaldoInsuficiente", () => {
  it("cala enquanto a quantidade não é um número positivo", () => {
    expect(avisoSaldoInsuficiente("", 3)).toBeNull();
    expect(avisoSaldoInsuficiente("0", 3)).toBeNull();
    expect(avisoSaldoInsuficiente("abc", 3)).toBeNull();
  });

  it("cala quando o saldo cobre a quantidade", () => {
    expect(avisoSaldoInsuficiente("3", 3)).toBeNull();
    expect(avisoSaldoInsuficiente("2", 3)).toBeNull();
  });

  it("avisa quanto o estoque vai ficar negativo", () => {
    const aviso = avisoSaldoInsuficiente("5", 3);
    expect(aviso).toContain("Saldo em estoque: 3");
    expect(aviso).toContain("2");
  });

  it("peça sem movimentação nenhuma conta como saldo zero, não como desconhecido", () => {
    expect(avisoSaldoInsuficiente("1", undefined)).toContain("Saldo em estoque: 0");
  });

  it("avisa também quando o saldo já está negativo", () => {
    expect(avisoSaldoInsuficiente("1", -2)).toContain("negativo em 3");
  });
});

describe("avisoPecaSemCusto", () => {
  it("cala quando nenhuma peça foi escolhida ainda", () => {
    expect(avisoPecaSemCusto(undefined)).toBeNull();
  });

  it("cala quando a peça tem custo cadastrado", () => {
    expect(avisoPecaSemCusto({ preco_custo: 12.5 })).toBeNull();
  });

  it("avisa quando o custo está em branco", () => {
    expect(avisoPecaSemCusto({ preco_custo: null })).toContain("preço de custo");
  });

  it("trata custo zero como custo faltando — mesma regra da tela de Comissões", () => {
    expect(avisoPecaSemCusto({ preco_custo: 0 })).toContain("preço de custo");
  });
});
