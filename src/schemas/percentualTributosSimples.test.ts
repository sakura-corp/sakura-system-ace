import { describe, expect, it } from "vitest";
import {
  avisoPercentualTributosSimplesVazio,
  erroPercentualTributosSimples,
} from "./percentualTributosSimples";

describe("erroPercentualTributosSimples", () => {
  it("aceita vazio, 0, 6,5 e 100", () => {
    for (const v of [null, 0, 6.5, 100]) expect(erroPercentualTributosSimples(v)).toBeNull();
  });
  it("recusa negativo, acima de 100 e número inválido", () => {
    for (const v of [-0.01, 100.01, Number.NaN]) {
      expect(erroPercentualTributosSimples(v)).toMatch(/0 e 100/);
    }
  });
});

describe("avisoPercentualTributosSimplesVazio", () => {
  it("avisa só no Simples com o campo vazio", () => {
    expect(avisoPercentualTributosSimplesVazio("simples_nacional", null)).toMatch(/0%/);
    expect(avisoPercentualTributosSimplesVazio("simples_nacional", 6.5)).toBeNull();
    expect(avisoPercentualTributosSimplesVazio("simples_nacional", 0)).toBeNull();
    expect(avisoPercentualTributosSimplesVazio("lucro_presumido", null)).toBeNull();
    expect(avisoPercentualTributosSimplesVazio(null, null)).toBeNull();
  });
});
