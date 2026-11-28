import { describe, expect, it } from "vitest";
import { textoTributosAproximados, tributosDasPecas, tributosDoServico } from "./tributosAproximados";

// Números de teste (nunca a alíquota real de uma loja: o repositório é público).
const SIMPLES = { regime_tributario: "simples_nacional" as const };
const PECAS = { ...SIMPLES, percentual_tributos_pecas: 4, percentual_estimativa_icms_st: 3 };

describe("tributosDoServico", () => {
  it("serviço de R$ 200,00 com 6,5%: R$ 13,00 (6,50%)", () => {
    expect(
      tributosDoServico(200, { ...SIMPLES, percentual_tributos_simples: 6.5 }),
    ).toEqual({ linhas: [13], base: 200, total: 13, percentual: 6.5, incluiST: false });
  });

  it("sem alíquota (vazia ou zero): nada", () => {
    expect(tributosDoServico(200, { ...SIMPLES, percentual_tributos_simples: null })).toBeNull();
    expect(tributosDoServico(200, { ...SIMPLES, percentual_tributos_simples: 0 })).toBeNull();
  });

  it("loja fora do Simples: nada (o texto fala da alíquota do Simples)", () => {
    expect(
      tributosDoServico(200, { regime_tributario: "lucro_presumido", percentual_tributos_simples: 6.5 }),
    ).toBeNull();
  });
});

describe("tributosDasPecas", () => {
  it("peças sem ST: cada linha com a alíquota das peças", () => {
    expect(
      tributosDasPecas(
        [
          { valor: 100, temST: false },
          { valor: 50.55, temST: false },
        ],
        PECAS,
      ),
    ).toEqual({ linhas: [4, 2.02], base: 150.55, total: 6.02, percentual: 4, incluiST: false });
  });

  it("peça com ST: soma a estimativa do ICMS-ST", () => {
    expect(tributosDasPecas([{ valor: 100, temST: true }], PECAS)).toEqual({
      linhas: [7],
      base: 100,
      total: 7,
      percentual: 7,
      incluiST: true,
    });
  });

  it("nota mista: a ST só na peça que tem", () => {
    expect(
      tributosDasPecas(
        [
          { valor: 100, temST: true },
          { valor: 50, temST: false },
        ],
        PECAS,
      ),
    ).toEqual({ linhas: [7, 2], base: 150, total: 9, percentual: 6, incluiST: true });
  });

  it("ST configurada, mas nenhuma peça com ST: não inclui ST", () => {
    expect(tributosDasPecas([{ valor: 100, temST: false }], PECAS)?.incluiST).toBe(false);
  });

  it("peça com ST, mas sem estimativa: só a alíquota das peças, sem dizer ST", () => {
    expect(
      tributosDasPecas([{ valor: 100, temST: true }], { ...PECAS, percentual_estimativa_icms_st: null }),
    ).toEqual({ linhas: [4], base: 100, total: 4, percentual: 4, incluiST: false });
  });

  it("o total é a soma das linhas JÁ arredondadas (bate com o DANFE)", () => {
    // 0,70 × 6,5% = 0,0455 → 0,05 por linha; 0,10 no total (e não 0,09).
    const resultado = tributosDasPecas(
      [
        { valor: 0.7, temST: false },
        { valor: 0.7, temST: false },
      ],
      { ...PECAS, percentual_tributos_pecas: 6.5 },
    );
    expect(resultado).toEqual({ linhas: [0.05, 0.05], base: 1.4, total: 0.1, percentual: 7.14, incluiST: false });
  });

  it("sem alíquota das peças: nada, mesmo com a estimativa de ST", () => {
    expect(
      tributosDasPecas([{ valor: 100, temST: true }], { ...PECAS, percentual_tributos_pecas: null }),
    ).toBeNull();
    expect(
      tributosDasPecas([{ valor: 100, temST: true }], { ...PECAS, percentual_tributos_pecas: 0 }),
    ).toBeNull();
  });

  it("loja fora do Simples: nada", () => {
    expect(
      tributosDasPecas([{ valor: 100, temST: false }], { ...PECAS, regime_tributario: "lucro_real" }),
    ).toBeNull();
  });
});

describe("textoTributosAproximados", () => {
  it("sem ST: valor e porcentagem no formato brasileiro", () => {
    const tributos = tributosDoServico(200, { ...SIMPLES, percentual_tributos_simples: 6.5 });
    expect(tributos && textoTributosAproximados(tributos)).toBe(
      "Tributos aproximados: R$ 13,00 (6,50%). Alíquota efetiva do Simples Nacional, Lei 12.741/2012.",
    );
  });

  it("com peça com ST: avisa que inclui a estimativa do ICMS-ST", () => {
    const tributos = tributosDasPecas(
      [
        { valor: 100, temST: true },
        { valor: 50, temST: false },
      ],
      PECAS,
    );
    expect(tributos && textoTributosAproximados(tributos)).toBe(
      "Tributos aproximados: R$ 9,00 (6,00%), inclui estimativa do ICMS-ST. " +
        "Alíquota efetiva do Simples Nacional, Lei 12.741/2012.",
    );
  });

  it("milhar com ponto, centavo com vírgula, espaço comum depois do R$", () => {
    expect(
      textoTributosAproximados({ linhas: [1234.5], base: 20000, total: 1234.5, percentual: 6.17, incluiST: false }),
    ).toBe("Tributos aproximados: R$ 1.234,50 (6,17%). Alíquota efetiva do Simples Nacional, Lei 12.741/2012.");
  });
});
