import { describe, expect, it } from "vitest";
import {
  avisoAliquotaCompetencia,
  competenciaDoMes,
  lojaEmiteNfse,
  mesPorExtenso,
  PASSO_A_PASSO_ALIQUOTA_ARARAQUARA,
  PASSO_A_PASSO_ALIQUOTA_GERAL,
  passoAPassoAliquotaPadrao,
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
    // O cadastro mensal da alíquota é do caminho municipal: a base dos
    // testes é uma loja fora do Simples (a do Simples tem os testes dela).
    regime_tributario: "lucro_presumido",
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

  // #853: desde 01/11/2026 a loja do Simples emite a NFS-e pelo Padrão
  // Nacional (PR #839), onde não existe o cadastro mensal da alíquota no
  // portal da prefeitura (confirmado pela contabilidade em 05/11).
  it("não avisa a loja do Simples, que emite pelo Padrão Nacional", () => {
    const aviso = avisoAliquotaCompetencia(config({ regime_tributario: "simples_nacional" }), setembro);
    expect(aviso.precisa).toBe(false);
  });

  it("continua avisando a loja de outro regime (caminho municipal)", () => {
    expect(avisoAliquotaCompetencia(config({ regime_tributario: "lucro_real" }), setembro).precisa).toBe(true);
    expect(avisoAliquotaCompetencia(config({ regime_tributario: null }), setembro).precisa).toBe(true);
  });

  it("loja de Araraquara sem texto próprio: o caminho do portal de Araraquara", () => {
    expect(avisoAliquotaCompetencia(config(), setembro).passoAPasso).toBe(
      PASSO_A_PASSO_ALIQUOTA_ARARAQUARA,
    );
  });

  // #876: o passo a passo do portal de Araraquara aparecia pra loja de
  // qualquer cidade — numa demonstração em São Carlos, o dono lia o caminho
  // de um portal que não é o dele.
  it("loja de outra cidade sem texto próprio: o texto geral, sem Araraquara", () => {
    const aviso = avisoAliquotaCompetencia(config({ codigo_municipio: "3548906" }), setembro);
    expect(aviso.passoAPasso).toBe(PASSO_A_PASSO_ALIQUOTA_GERAL);
    expect(aviso.passoAPasso).not.toMatch(/Araraquara|Giap|Replicar/);
  });

  it("loja sem código do município: o texto geral", () => {
    const aviso = avisoAliquotaCompetencia(config({ codigo_municipio: null }), setembro);
    expect(aviso.passoAPasso).toBe(PASSO_A_PASSO_ALIQUOTA_GERAL);
  });

  it("usa o passo a passo da loja quando ela escreveu um", () => {
    const aviso = avisoAliquotaCompetencia(
      config({ aliquota_passo_a_passo: "Portal de São Carlos → Alíquotas" }),
      setembro,
    );
    expect(aviso.passoAPasso).toBe("Portal de São Carlos → Alíquotas");
  });

  it("passo a passo só com espaços cai no padrão da cidade", () => {
    const aviso = avisoAliquotaCompetencia(config({ aliquota_passo_a_passo: "   " }), setembro);
    expect(aviso.passoAPasso).toBe(PASSO_A_PASSO_ALIQUOTA_ARARAQUARA);
    const outraCidade = avisoAliquotaCompetencia(
      config({ aliquota_passo_a_passo: "   ", codigo_municipio: "3548906" }),
      setembro,
    );
    expect(outraCidade.passoAPasso).toBe(PASSO_A_PASSO_ALIQUOTA_GERAL);
  });
});

describe("passoAPassoAliquotaPadrao", () => {
  it("é o de Araraquara só pro código IBGE de Araraquara (3503208)", () => {
    expect(passoAPassoAliquotaPadrao("3503208")).toBe(PASSO_A_PASSO_ALIQUOTA_ARARAQUARA);
    expect(passoAPassoAliquotaPadrao(" 3503208 ")).toBe(PASSO_A_PASSO_ALIQUOTA_ARARAQUARA);
  });

  it("aceita o código digitado com pontuação ou com 6 dígitos", () => {
    expect(passoAPassoAliquotaPadrao("3503-208")).toBe(PASSO_A_PASSO_ALIQUOTA_ARARAQUARA);
    expect(passoAPassoAliquotaPadrao("350320")).toBe(PASSO_A_PASSO_ALIQUOTA_ARARAQUARA);
  });

  it("é o geral pra qualquer outro código, vazio ou nulo", () => {
    for (const codigo of ["3548906", "", null, undefined]) {
      expect(passoAPassoAliquotaPadrao(codigo)).toBe(PASSO_A_PASSO_ALIQUOTA_GERAL);
    }
  });

  it("o texto geral manda pedir o caminho à contabilidade, sem citar cidade", () => {
    expect(PASSO_A_PASSO_ALIQUOTA_GERAL).toMatch(/contabilidade/);
    expect(PASSO_A_PASSO_ALIQUOTA_GERAL).not.toMatch(/Araraquara/);
  });
});
