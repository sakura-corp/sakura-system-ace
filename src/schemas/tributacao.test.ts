import { describe, expect, it } from "vitest";
import {
  codigoParaPecaImportada,
  csosnMaisUsado,
  ehCsosn,
  ehCst,
  motivoCfopIncompativel,
  motivoCodigoIncompativel,
  regimeUsaCsosn,
} from "./tributacao";

describe("ehCsosn / ehCst / regimeUsaCsosn", () => {
  it("separa CSOSN (3 dígitos) de CST (2 dígitos)", () => {
    expect(ehCsosn("500")).toBe(true);
    expect(ehCst("500")).toBe(false);
    expect(ehCst("00")).toBe(true);
    expect(ehCsosn("00")).toBe(false);
  });

  it("ignora espaço em volta e trata vazio como nenhum dos dois", () => {
    expect(ehCsosn(" 102 ")).toBe(true);
    expect(ehCsosn("")).toBe(false);
    expect(ehCst(null)).toBe(false);
  });

  it("só o Simples Nacional usa CSOSN", () => {
    expect(regimeUsaCsosn("simples_nacional")).toBe(true);
    expect(regimeUsaCsosn("lucro_presumido")).toBe(false);
    expect(regimeUsaCsosn(null)).toBe(false);
  });
});

describe("motivoCodigoIncompativel", () => {
  it("aceita CSOSN no Simples Nacional", () => {
    expect(motivoCodigoIncompativel("500", "simples_nacional")).toBeNull();
  });

  it("recusa CST no Simples Nacional — foi a rejeição real da SEFAZ", () => {
    const motivo = motivoCodigoIncompativel("00", "simples_nacional");
    expect(motivo).toContain("CST 00");
    expect(motivo).toContain("Simples Nacional");
  });

  it("recusa CSOSN no regime normal", () => {
    expect(motivoCodigoIncompativel("500", "lucro_presumido")).toContain("CSOSN 500");
  });

  it("aceita CST no regime normal", () => {
    expect(motivoCodigoIncompativel("60", "lucro_real")).toBeNull();
  });

  it("avisa quando a peça está sem código nenhum", () => {
    expect(motivoCodigoIncompativel("", "simples_nacional")).toContain("sem o código CSOSN");
    expect(motivoCodigoIncompativel(null, "lucro_presumido")).toContain("sem o código CST");
  });

  it("avisa quando o código não é nenhum dos conhecidos", () => {
    expect(motivoCodigoIncompativel("999", "simples_nacional")).toContain('"999"');
  });

  // Sem o regime preenchido em Configurações não dá pra afirmar nada — calar
  // é melhor que encher a tela de aviso que pode estar errado.
  it("fica calado quando o regime da loja não está preenchido", () => {
    expect(motivoCodigoIncompativel("00", null)).toBeNull();
    expect(motivoCodigoIncompativel("", null)).toBeNull();
  });
});

describe("csosnMaisUsado", () => {
  it("devolve o CSOSN mais frequente do cadastro da loja", () => {
    expect(csosnMaisUsado(["500", "102", "500", null, "500"])).toBe("500");
  });

  it("ignora CST e código inválido", () => {
    expect(csosnMaisUsado(["00", "60", "999", "102"])).toBe("102");
  });

  it("devolve null quando não há nenhum CSOSN cadastrado", () => {
    expect(csosnMaisUsado(["00", "", null])).toBeNull();
    expect(csosnMaisUsado([])).toBeNull();
  });
});

describe("codigoParaPecaImportada", () => {
  it("mantém o código da nota quando ele serve pra loja", () => {
    expect(codigoParaPecaImportada("500", "simples_nacional", "102")).toBe("500");
  });

  it("troca o CST do fornecedor pelo padrão da loja no Simples Nacional", () => {
    expect(codigoParaPecaImportada("00", "simples_nacional", "500")).toBe("500");
  });

  it("deixa em branco quando não serve e a loja não tem padrão — melhor vazio que errado", () => {
    expect(codigoParaPecaImportada("00", "simples_nacional", null)).toBeNull();
  });

  it("não mexe em nada quando o regime da loja não está preenchido", () => {
    expect(codigoParaPecaImportada("00", null, "500")).toBe("00");
  });
});

describe("motivoCfopIncompativel", () => {
  // O caso real (ensaio de 04/11): peça com CSOSN 500 saindo com CFOP 5102.
  it("avisa CFOP 5102 com CSOSN 500 e sugere 5405", () => {
    const motivo = motivoCfopIncompativel("5102", "500", "simples_nacional");
    expect(motivo).toContain("CFOP 5102");
    expect(motivo).toContain("CSOSN 500");
    expect(motivo).toContain("5405");
  });

  it("não avisa CFOP 5405 com CSOSN 500 — é o par certo dentro do estado", () => {
    expect(motivoCfopIncompativel("5405", "500", "simples_nacional")).toBeNull();
  });

  // A NFC-e só aceita CFOP de dentro do estado (Sofia, 09/11/2026, #968): a
  // sugestão é sempre o par que começa com 5, e a frase não fala mais em
  // "outro estado" como saída.
  it("CFOP 6xxx que não combina com CSOSN 500 sugere 5405, nunca 6404", () => {
    const motivo = motivoCfopIncompativel("6102", "500", "simples_nacional");
    expect(motivo).toContain("CFOP 6102");
    expect(motivo).toContain("use 5405");
    expect(motivo).not.toContain("6404");
    expect(motivo).not.toContain("para outro estado");
  });

  // Decisão da Sofia no comentário de 09/11 da #968: o par de fora do estado
  // também ganha aviso, porque a NFC-e não aceita CFOP que começa com 6.
  it("CFOP 6404 com CSOSN 500 avisa que a NFC-e só aceita CFOP de dentro do estado", () => {
    const motivo = motivoCfopIncompativel("6404", "500", "simples_nacional");
    expect(motivo).toContain("a NFC-e só aceita CFOP de dentro do estado");
    expect(motivo).toContain("use 5405");
  });

  it("CFOP 6102 com CSOSN 102 avisa que a NFC-e só aceita CFOP de dentro do estado", () => {
    const motivo = motivoCfopIncompativel("6102", "102", "simples_nacional");
    expect(motivo).toContain("a NFC-e só aceita CFOP de dentro do estado");
    expect(motivo).toContain("use 5102");
  });

  // O CFOP às vezes vem digitado com ponto ("5.405"); a comparação ignora o
  // que não é número.
  it("CFOP com ponto: 5.405 com CSOSN 500 não avisa", () => {
    expect(motivoCfopIncompativel("5.405", "500", "simples_nacional")).toBeNull();
  });

  it("CFOP com ponto: 5.102 com CSOSN 500 avisa com 5102 na frase, sem o ponto", () => {
    const motivo = motivoCfopIncompativel("5.102", "500", "simples_nacional");
    expect(motivo).toContain("o CFOP 5102 não combina");
    expect(motivo).not.toContain("5.102");
    expect(motivo).toContain("use 5405");
  });

  it("não avisa CFOP 5102 com CSOSN 102 — é o par certo da peça comum", () => {
    expect(motivoCfopIncompativel("5102", "102", "simples_nacional")).toBeNull();
  });

  it("avisa CFOP 5405 com CSOSN 102 e sugere 5102", () => {
    const motivo = motivoCfopIncompativel("5405", "102", "simples_nacional");
    expect(motivo).toContain("CFOP 5405");
    expect(motivo).toContain("CSOSN 102");
    expect(motivo).toContain("use 5102");
    expect(motivo).not.toContain("6102");
    expect(motivo).not.toContain("para outro estado");
  });

  it("vale para os CSOSN 101, 103, 300 e 400 também", () => {
    for (const csosn of ["101", "103", "300", "400"]) {
      expect(motivoCfopIncompativel("5405", csosn, "simples_nacional")).toContain("use 5102");
      expect(motivoCfopIncompativel("6404", csosn, "simples_nacional")).toContain("use 5102");
      expect(motivoCfopIncompativel("5102", csosn, "simples_nacional")).toBeNull();
    }
  });

  it("ignora espaço em volta do CFOP e do CSOSN", () => {
    expect(motivoCfopIncompativel(" 5405 ", " 500 ", "simples_nacional")).toBeNull();
    expect(motivoCfopIncompativel(" 5102 ", " 500 ", "simples_nacional")).toContain(
      "o CFOP 5102 não combina com o CSOSN 500 (",
    );
  });

  // A regra é só do Simples Nacional (CSOSN). No regime normal o código é CST
  // e a combinação com o CFOP é outra — melhor calar do que palpitar.
  it("fica calado no regime normal, com CST", () => {
    expect(motivoCfopIncompativel("5102", "60", "lucro_presumido")).toBeNull();
    expect(motivoCfopIncompativel("5102", "500", "lucro_real")).toBeNull();
  });

  it("fica calado quando o regime da loja não está preenchido", () => {
    expect(motivoCfopIncompativel("5102", "500", null)).toBeNull();
    expect(motivoCfopIncompativel("5102", "500", undefined)).toBeNull();
  });

  // CFOP ou CSOSN em branco já têm aviso próprio em outro lugar.
  it("fica calado quando o CFOP ou o CSOSN está vazio", () => {
    expect(motivoCfopIncompativel("", "500", "simples_nacional")).toBeNull();
    expect(motivoCfopIncompativel("   ", "500", "simples_nacional")).toBeNull();
    expect(motivoCfopIncompativel(null, "102", "simples_nacional")).toBeNull();
    expect(motivoCfopIncompativel("5102", "", "simples_nacional")).toBeNull();
    expect(motivoCfopIncompativel("5102", null, "simples_nacional")).toBeNull();
  });

  it("não opina nos CSOSN 201, 202, 203 e 900", () => {
    for (const csosn of ["201", "202", "203", "900"]) {
      expect(motivoCfopIncompativel("5102", csosn, "simples_nacional")).toBeNull();
      expect(motivoCfopIncompativel("5405", csosn, "simples_nacional")).toBeNull();
    }
  });
});
