import { describe, expect, it } from "vitest";
import { fraseDaPrevisao, fraseDoVencimento, situacaoDoVencimento } from "./vencimento";

describe("situação do vencimento (selos das telas de contas, visual novo #990)", () => {
  const hoje = "2026-11-14";

  it("antes de hoje é atrasada; hoje é 'vence hoje'; depois é 'a vencer'", () => {
    expect(situacaoDoVencimento("2026-11-13", hoje)).toBe("atrasada");
    expect(situacaoDoVencimento("2026-11-14", hoje)).toBe("vence_hoje");
    expect(situacaoDoVencimento("2026-11-15", hoje)).toBe("a_vencer");
  });

  it("vira o mês e o ano sem passar por Date (texto AAAA-MM-DD)", () => {
    expect(situacaoDoVencimento("2026-10-31", "2026-11-01")).toBe("atrasada");
    expect(situacaoDoVencimento("2027-01-01", "2026-12-31")).toBe("a_vencer");
  });

  it("a janela de pagar diz 'venceu', 'vence hoje' ou 'vence em', com o dia certo", () => {
    expect(fraseDoVencimento("2026-11-10", hoje)).toBe("venceu em 10/11/2026");
    expect(fraseDoVencimento("2026-11-14", hoje)).toBe("vence hoje");
    expect(fraseDoVencimento("2026-12-01", hoje)).toBe("vence em 01/12/2026");
  });

  it("a janela de receber diz a previsão, e avisa quando está atrasada", () => {
    expect(fraseDaPrevisao("2026-11-10", hoje)).toBe("previsto para 10/11/2026 (atrasada)");
    expect(fraseDaPrevisao("2026-11-14", hoje)).toBe("previsto para hoje");
    expect(fraseDaPrevisao("2026-12-01", hoje)).toBe("previsto para 01/12/2026");
  });
});
