import { describe, expect, it } from "vitest";
import {
  atendimentoLojaSchema,
  paraConfiguracaoAtendimento,
  paraValoresFormularioAtendimento,
} from "./atendimentoLoja";

const ok = (v: object) =>
  atendimentoLojaSchema.safeParse({ whatsapp: "", horario_funcionamento: "", garantia_servico_dias: "", ...v });

describe("atendimentoLojaSchema (#1033)", () => {
  it("tudo vazio é válido", () => {
    expect(ok({}).success).toBe(true);
  });
  it("WhatsApp com 10 a 13 dígitos; senão mensagem em português", () => {
    expect(ok({ whatsapp: "123456789" }).success).toBe(false);
    expect(ok({ whatsapp: "1234567890" }).success).toBe(true);
    expect(ok({ whatsapp: "5516955500199" }).success).toBe(true);
    const r = ok({ whatsapp: "55169555001999" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/de 10 a 13 números/);
  });
  it("WhatsApp com letra é recusado (não descarta a letra calado)", () => {
    expect(ok({ whatsapp: "16 99999-9999 ramal 2" }).success).toBe(false);
    expect(ok({ whatsapp: "+55 (16) 95550-0199" }).success).toBe(true);
  });
  it("horário: até 80 letras", () => {
    expect(ok({ horario_funcionamento: "a".repeat(80) }).success).toBe(true);
    expect(ok({ horario_funcionamento: "a".repeat(81) }).success).toBe(false);
  });
  it("garantia: inteiro de 1 a 3650", () => {
    expect(ok({ garantia_servico_dias: "90" }).success).toBe(true);
    expect(ok({ garantia_servico_dias: "3650" }).success).toBe(true);
    expect(ok({ garantia_servico_dias: "0" }).success).toBe(false);
    expect(ok({ garantia_servico_dias: "3651" }).success).toBe(false);
    expect(ok({ garantia_servico_dias: "1,5" }).success).toBe(false);
    expect(ok({ garantia_servico_dias: "abc" }).success).toBe(false);
  });
});

describe("paraConfiguracaoAtendimento", () => {
  it("grava só os dígitos do WhatsApp", () => {
    const v = atendimentoLojaSchema.parse({
      whatsapp: "(16) 95550-0199",
      horario_funcionamento: "  Seg a sex, 8h às 18h ",
      garantia_servico_dias: "90",
    });
    expect(paraConfiguracaoAtendimento(v)).toEqual({
      whatsapp: "16955500199",
      horario_funcionamento: "Seg a sex, 8h às 18h",
      garantia_servico_dias: 90,
    });
  });
  it("vazio vira null", () => {
    const v = atendimentoLojaSchema.parse({ whatsapp: " ", horario_funcionamento: "  ", garantia_servico_dias: " " });
    expect(paraConfiguracaoAtendimento(v)).toEqual({
      whatsapp: null,
      horario_funcionamento: null,
      garantia_servico_dias: null,
    });
  });
});

describe("paraValoresFormularioAtendimento", () => {
  it("null vira campos vazios", () => {
    expect(paraValoresFormularioAtendimento(null)).toEqual({
      whatsapp: "",
      horario_funcionamento: "",
      garantia_servico_dias: "",
    });
  });
  it("mostra o WhatsApp com máscara e a garantia como texto", () => {
    const f = paraValoresFormularioAtendimento({
      loja_id: "l",
      whatsapp: "16955500199",
      horario_funcionamento: "8h às 18h",
      garantia_servico_dias: 90,
    });
    expect(f).toEqual({ whatsapp: "(16) 95550-0199", horario_funcionamento: "8h às 18h", garantia_servico_dias: "90" });
  });
  it("número fixo e com 55 também ganham máscara; ida e volta mantém os dígitos", () => {
    const mostra = (w: string) =>
      paraValoresFormularioAtendimento({ loja_id: "l", whatsapp: w, horario_funcionamento: null, garantia_servico_dias: null })
        .whatsapp;
    expect(mostra("1633334444")).toBe("(16) 3333-4444");
    expect(mostra("5516955500199")).toBe("+55 (16) 95550-0199");
    expect(paraConfiguracaoAtendimento(atendimentoLojaSchema.parse({
      whatsapp: mostra("5516955500199"), horario_funcionamento: "", garantia_servico_dias: "",
    })).whatsapp).toBe("5516955500199");
  });
});
