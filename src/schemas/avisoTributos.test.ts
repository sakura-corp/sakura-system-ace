import { describe, expect, it } from "vitest";
import { avisoTributosDoMes } from "./avisoTributos";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";

function config(campos: Partial<ConfiguracaoFiscalLoja> = {}): ConfiguracaoFiscalLoja {
  return {
    loja_id: "loja-1",
    regime_tributario: "simples_nacional",
    focus_nfe_configurado: true,
    percentual_tributos_simples: 4,
    percentual_tributos_pecas: 3,
    percentual_estimativa_icms_st: null,
    competencia_tributos_confirmada: "2026-11-01",
    atualizado_em: "2026-11-01T00:00:00Z",
    ...campos,
  } as ConfiguracaoFiscalLoja;
}

const novembro = new Date(2026, 10, 18, 10, 0);

describe("avisoTributosDoMes", () => {
  it("mês já confirmado: não precisa", () => {
    const r = avisoTributosDoMes(config(), novembro);
    expect(r).toEqual({ precisa: false, competencia: "2026-11-01", mes: "novembro" });
  });
  it("confirmado só no mês anterior: precisa", () => {
    const r = avisoTributosDoMes(config({ competencia_tributos_confirmada: "2026-10-01" }), novembro);
    expect(r.precisa).toBe(true);
  });
  it("nunca confirmado: precisa", () => {
    expect(avisoTributosDoMes(config({ competencia_tributos_confirmada: null }), novembro).precisa).toBe(true);
  });
  it("mês confirmado mas nenhuma alíquota configurada: precisa", () => {
    const r = avisoTributosDoMes(
      config({ percentual_tributos_simples: null, percentual_tributos_pecas: null }),
      novembro,
    );
    expect(r.precisa).toBe(true);
  });
  it("só uma das alíquotas configurada e mês confirmado: não precisa", () => {
    const r = avisoTributosDoMes(config({ percentual_tributos_simples: null }), novembro);
    expect(r.precisa).toBe(false);
  });
  it("fora do Simples: não precisa", () => {
    const r = avisoTributosDoMes(
      config({ regime_tributario: "lucro_presumido", competencia_tributos_confirmada: null }),
      novembro,
    );
    expect(r.precisa).toBe(false);
  });
  it("sem Focus NFe: não precisa", () => {
    const r = avisoTributosDoMes(
      config({ focus_nfe_configurado: false, competencia_tributos_confirmada: null }),
      novembro,
    );
    expect(r.precisa).toBe(false);
  });
  it("sem configuração nenhuma: não precisa", () => {
    expect(avisoTributosDoMes(null, novembro).precisa).toBe(false);
  });
  it("às 22h do último dia do mês, ainda é o mês corrente", () => {
    const r = avisoTributosDoMes(config(), new Date(2026, 10, 30, 22, 49));
    expect(r.precisa).toBe(false);
    expect(r.competencia).toBe("2026-11-01");
  });
  it("dia 1º do mês seguinte volta a precisar", () => {
    expect(avisoTributosDoMes(config(), new Date(2026, 11, 1, 0, 5)).precisa).toBe(true);
  });
  it("confirmação gravada com outro dia do mesmo mês vale", () => {
    expect(avisoTributosDoMes(config({ competencia_tributos_confirmada: "2026-11-15" }), novembro).precisa).toBe(false);
  });
});
