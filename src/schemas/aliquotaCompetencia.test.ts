import { describe, expect, it } from "vitest";
import {
  avisoAliquotaCompetencia,
  competenciaDoMes,
  lojaEmiteNfse,
  mesPorExtenso,
  PASSO_A_PASSO_ALIQUOTA_PADRAO,
} from "./aliquotaCompetencia";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";

function config(campos: Partial<ConfiguracaoFiscalLoja> = {}): ConfiguracaoFiscalLoja {
  return {
    loja_id: "loja-1",
    cnpj: "12345678000199",
    razao_social: null,
    nome_fantasia: null,
    inscricao_estadual: null,
    inscricao_municipal: "30016580",
    regime_tributario: "simples_nacional",
    cep: null,
    rua: null,
    numero: null,
    bairro: null,
    cidade: null,
    uf: null,
    telefone: null,
    email: null,
    focus_nfe_configurado: true,
    focus_nfe_ambiente: "producao",
    codigo_municipio: "3503208",
    item_lista_servico: "14.01",
    aliquota_iss: 3,
    codigo_tributario_municipio: null,
    codigo_cnae: "452000100",
    competencia_aliquota_confirmada: null,
    aliquota_passo_a_passo: null,
    percentual_tributos_simples: null,
    atualizado_em: "2026-09-01T00:00:00Z",
    ...campos,
  };
}

describe("competenciaDoMes", () => {
  it("é o dia 1º do mês, no fuso local", () => {
    expect(competenciaDoMes(new Date(2026, 8, 17, 14, 30))).toBe("2026-09-01");
  });

  // O bug de fuso que já apareceu quatro vezes neste projeto: às 22h do dia
  // 30, em UTC já é dia 1º do mês seguinte. A competência tem que continuar
  // sendo a do mês de quem está no balcão.
  it("às 22h do último dia do mês, continua sendo o mês corrente", () => {
    expect(competenciaDoMes(new Date(2026, 8, 30, 22, 49))).toBe("2026-09-01");
  });
});

describe("mesPorExtenso", () => {
  it("devolve o nome do mês em português", () => {
    expect(mesPorExtenso("2026-09-01")).toBe("setembro");
    expect(mesPorExtenso("2026-01-01")).toBe("janeiro");
  });
});

describe("lojaEmiteNfse", () => {
  it("loja com token e inscrição municipal emite", () => {
    expect(lojaEmiteNfse(config())).toBe(true);
  });

  it("loja sem token não emite — e não deve ser lembrada todo mês", () => {
    expect(lojaEmiteNfse(config({ focus_nfe_configurado: false }))).toBe(false);
  });

  it("loja sem inscrição municipal não emite nota de serviço", () => {
    expect(lojaEmiteNfse(config({ inscricao_municipal: null }))).toBe(false);
  });

  it("loja sem configuração fiscal nenhuma não emite", () => {
    expect(lojaEmiteNfse(null)).toBe(false);
  });
});

describe("avisoAliquotaCompetencia", () => {
  const setembro = new Date(2026, 8, 3, 9, 0);

  it("avisa quando a competência do mês ainda não foi confirmada", () => {
    const aviso = avisoAliquotaCompetencia(config(), setembro);
    expect(aviso.precisa).toBe(true);
    expect(aviso.competencia).toBe("2026-09-01");
    expect(aviso.mes).toBe("setembro");
  });

  it("cala quando a competência deste mês já foi confirmada", () => {
    const aviso = avisoAliquotaCompetencia(
      config({ competencia_aliquota_confirmada: "2026-09-01" }),
      setembro,
    );
    expect(aviso.precisa).toBe(false);
  });

  it("volta a avisar no mês seguinte — é cadastro de todo mês", () => {
    const outubro = new Date(2026, 9, 1, 8, 0);
    const aviso = avisoAliquotaCompetencia(
      config({ competencia_aliquota_confirmada: "2026-09-01" }),
      outubro,
    );
    expect(aviso.precisa).toBe(true);
    expect(aviso.mes).toBe("outubro");
  });

  it("não enche quem não emite nota de serviço", () => {
    const aviso = avisoAliquotaCompetencia(config({ focus_nfe_configurado: false }), setembro);
    expect(aviso.precisa).toBe(false);
  });

  it("usa o passo a passo padrão quando a loja não escreveu o dela", () => {
    expect(avisoAliquotaCompetencia(config(), setembro).passoAPasso).toBe(
      PASSO_A_PASSO_ALIQUOTA_PADRAO,
    );
  });

  it("usa o passo a passo da loja quando ela escreveu um", () => {
    const aviso = avisoAliquotaCompetencia(
      config({ aliquota_passo_a_passo: "Portal de São Carlos → Alíquotas" }),
      setembro,
    );
    expect(aviso.passoAPasso).toBe("Portal de São Carlos → Alíquotas");
  });

  it("passo a passo só com espaços cai no padrão", () => {
    const aviso = avisoAliquotaCompetencia(config({ aliquota_passo_a_passo: "   " }), setembro);
    expect(aviso.passoAPasso).toBe(PASSO_A_PASSO_ALIQUOTA_PADRAO);
  });
});
