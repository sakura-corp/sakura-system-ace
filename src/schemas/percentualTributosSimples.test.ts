import { describe, expect, it } from "vitest";
import {
  MENSAGEM_PERCENTUAL_TRIBUTOS_SIMPLES,
  avisoPercentualTributosSimplesVazio,
  erroPercentualTributosSimples,
  percentualTributosSimplesParaSalvar,
} from "./percentualTributosSimples";
import { mensagemDeErro } from "@/lib/errors";

describe("erroPercentualTributosSimples", () => {
  it("aceita vazio, 0, 6,5 e 100", () => {
    for (const v of [null, 0, 6.5, 100]) expect(erroPercentualTributosSimples(v)).toBeNull();
  });
  it("recusa negativo, acima de 100 e número inválido", () => {
    for (const v of [-0.01, 100.01, Number.NaN]) {
      expect(erroPercentualTributosSimples(v)).toBe(MENSAGEM_PERCENTUAL_TRIBUTOS_SIMPLES);
    }
  });
  it("a trava do banco mostra a mesma frase da tela", () => {
    const erroDoBanco = {
      code: "23514",
      message:
        'new row for relation "configuracoes_fiscais_loja" violates check constraint "ck_config_fiscal_percentual_tributos_simples"',
    };
    expect(mensagemDeErro(erroDoBanco)).toBe(MENSAGEM_PERCENTUAL_TRIBUTOS_SIMPLES);
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

describe("percentualTributosSimplesParaSalvar", () => {
  it("no Simples, valida e salva o que foi digitado", () => {
    expect(percentualTributosSimplesParaSalvar("simples_nacional", 6.5)).toEqual({
      campos: { percentual_tributos_simples: 6.5 },
      erro: null,
    });
    expect(percentualTributosSimplesParaSalvar("simples_nacional", null)).toEqual({
      campos: { percentual_tributos_simples: null },
      erro: null,
    });
    expect(percentualTributosSimplesParaSalvar("simples_nacional", 150).erro).toBe(
      MENSAGEM_PERCENTUAL_TRIBUTOS_SIMPLES,
    );
  });
  it("arredonda pra 2 casas antes de conferir e de salvar (a coluna é numeric(5,2))", () => {
    expect(percentualTributosSimplesParaSalvar("simples_nacional", 6.456).campos).toEqual({
      percentual_tributos_simples: 6.46,
    });
    // 100,004 arredonda pra 100, que serve.
    expect(percentualTributosSimplesParaSalvar("simples_nacional", 100.004)).toEqual({
      campos: { percentual_tributos_simples: 100 },
      erro: null,
    });
  });
  it("fora do Simples o campo nem vai no salvar: o banco guarda o que já tem", () => {
    expect(percentualTributosSimplesParaSalvar("lucro_presumido", 150)).toEqual({
      campos: {},
      erro: null,
    });
    expect(percentualTributosSimplesParaSalvar(null, 6.5)).toEqual({ campos: {}, erro: null });
  });
});
