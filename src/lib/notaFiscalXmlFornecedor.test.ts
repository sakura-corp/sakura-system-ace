// @vitest-environment jsdom
//
// Único arquivo de teste que precisa de DOM (DOMParser, disponível de
// verdade no Electron/navegador, mas não no ambiente "node" padrão do
// vitest.config.ts) — jsdom só entra pra esse arquivo, o resto continua
// rodando no ambiente node simples de sempre.
import { describe, expect, it } from "vitest";
import { extrairNotaFiscalXml, normalizarCnpj } from "./notaFiscalXmlFornecedor";

const XML_EXEMPLO = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe1234" versao="4.00">
      <ide>
        <nNF>1234</nNF>
        <dhEmi>2026-08-01T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12.345.678/0001-99</CNPJ>
        <xNome>Fornecedor Exemplo LTDA</xNome>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>P001</cProd>
          <cEAN>7891234567890</cEAN>
          <xProd>Pneu 175/70 R14</xProd>
          <NCM>40111000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>150.50</vUnCom>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <pICMS>18.00</pICMS>
            </ICMS00>
          </ICMS>
        </imposto>
      </det>
      <det nItem="2">
        <prod>
          <cProd>P002</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>Amortecedor dianteiro</xProd>
          <NCM>87088000</NCM>
          <CFOP>5102</CFOP>
          <uCom>PC</uCom>
          <qCom>2.0000</qCom>
          <vUnCom>320.00</vUnCom>
        </prod>
        <imposto>
          <ICMS>
            <ICMSSN102>
              <orig>1</orig>
              <CSOSN>102</CSOSN>
            </ICMSSN102>
          </ICMS>
        </imposto>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;

describe("extrairNotaFiscalXml", () => {
  it("extrai fornecedor e número da nota", () => {
    const resultado = extrairNotaFiscalXml(XML_EXEMPLO);
    expect(resultado.fornecedor_cnpj).toBe("12.345.678/0001-99");
    expect(resultado.fornecedor_nome).toBe("Fornecedor Exemplo LTDA");
    expect(resultado.numero).toBe("1234");
  });

  it("extrai os itens, com CST (regime normal)", () => {
    const resultado = extrairNotaFiscalXml(XML_EXEMPLO);
    const item = resultado.itens[0];
    expect(item.descricao).toBe("Pneu 175/70 R14");
    expect(item.codigo_barras).toBe("7891234567890");
    expect(item.ncm).toBe("40111000");
    expect(item.cfop_padrao).toBe("5102");
    expect(item.unidade).toBe("UN");
    expect(item.quantidade).toBe(10);
    expect(item.preco_unitario).toBe(150.5);
    expect(item.origem).toBe("0");
    expect(item.cst_ou_csosn).toBe("00");
    expect(item.aliquota_icms).toBe(18);
  });

  it("extrai item com CSOSN (Simples Nacional) e sem código de barras", () => {
    const resultado = extrairNotaFiscalXml(XML_EXEMPLO);
    const item = resultado.itens[1];
    expect(item.codigo_barras).toBeNull();
    expect(item.cst_ou_csosn).toBe("102");
    expect(item.origem).toBe("1");
    expect(item.aliquota_icms).toBeNull();
  });

  it("lança erro claro pra XML sem infNFe", () => {
    expect(() => extrairNotaFiscalXml("<xml><algumaCoisa/></xml>")).toThrow(/infNFe/);
  });

  it("lança erro claro pra XML corrompido", () => {
    expect(() => extrairNotaFiscalXml("isso não é XML")).toThrow();
  });
});

// #1020: as parcelas da nota (as duplicatas, em `cobr` → `dup`) viram as
// contas a pagar. XML inventado, com dados fictícios.
const CHAVE_FICTICIA = "35261112345678000199550010000012341000012345";

function xmlComCobranca(cobranca: string, protocolo = ""): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe${CHAVE_FICTICIA}" versao="4.00">
      <ide><nNF>1234</nNF></ide>
      <emit><CNPJ>12345678000199</CNPJ><xNome>Fornecedor Exemplo LTDA</xNome></emit>
      <det nItem="1">
        <prod>
          <cProd>P001</cProd><xProd>Pneu 175/70 R14</xProd>
          <qCom>4.0000</qCom><vUnCom>250.00</vUnCom>
        </prod>
      </det>
      <total><ICMSTot><vProd>1000.00</vProd><vNF>1000.00</vNF></ICMSTot></total>
      ${cobranca}
    </infNFe>
  </NFe>
  ${protocolo}
</nfeProc>`;
}

const COBRANCA_3_PARCELAS = `<cobr>
  <fat><nFat>1234</nFat><vOrig>1000.00</vOrig><vLiq>1000.00</vLiq></fat>
  <dup><nDup>001</nDup><dVenc>2026-12-01</dVenc><vDup>333.34</vDup></dup>
  <dup><nDup>002</nDup><dVenc>2026-12-31</dVenc><vDup>333.33</vDup></dup>
  <dup><nDup>003</nDup><dVenc>2027-01-30</dVenc><vDup>333.33</vDup></dup>
</cobr>`;

describe("extrairNotaFiscalXml: duplicatas, total e chave (#1020)", () => {
  it("nota com 3 duplicatas devolve as 3, com número, vencimento e valor", () => {
    const resultado = extrairNotaFiscalXml(xmlComCobranca(COBRANCA_3_PARCELAS));
    expect(resultado.duplicatas).toEqual([
      { numero: "001", vencimento: "2026-12-01", valor: 333.34 },
      { numero: "002", vencimento: "2026-12-31", valor: 333.33 },
      { numero: "003", vencimento: "2027-01-30", valor: 333.33 },
    ]);
  });

  it("nota sem cobrança devolve a lista de duplicatas vazia", () => {
    const resultado = extrairNotaFiscalXml(xmlComCobranca(""));
    expect(resultado.duplicatas).toEqual([]);
  });

  it("nota só com a fatura (sem dup) também devolve a lista vazia", () => {
    const resultado = extrairNotaFiscalXml(
      xmlComCobranca("<cobr><fat><nFat>1</nFat><vLiq>1000.00</vLiq></fat></cobr>"),
    );
    expect(resultado.duplicatas).toEqual([]);
  });

  it("o vencimento sai como o dia escrito na nota, sem passar por Date (fuso)", () => {
    // dVenc é dia de calendário: 31/12 tem que continuar 31/12 em qualquer fuso.
    const resultado = extrairNotaFiscalXml(xmlComCobranca(COBRANCA_3_PARCELAS));
    expect(resultado.duplicatas[1].vencimento).toBe("2026-12-31");
  });

  it("vencimento fora do formato AAAA-MM-DD vira nulo (a pessoa preenche)", () => {
    const resultado = extrairNotaFiscalXml(
      xmlComCobranca("<cobr><dup><nDup>1</nDup><dVenc>01/12/2026</dVenc><vDup>1000.00</vDup></dup></cobr>"),
    );
    expect(resultado.duplicatas).toEqual([{ numero: "1", vencimento: null, valor: 1000 }]);
  });

  it("lê o total da nota (vNF)", () => {
    expect(extrairNotaFiscalXml(xmlComCobranca("")).valor_total).toBe(1000);
  });

  it("lê a chave de acesso do Id do infNFe, sem o prefixo NFe", () => {
    expect(extrairNotaFiscalXml(xmlComCobranca("")).chave_acesso).toBe(CHAVE_FICTICIA);
  });

  it("prefere a chave do protocolo de autorização quando ela existe", () => {
    const outra = "35261112345678000199550010000012341000099999";
    const protocolo = `<protNFe><infProt><chNFe>${outra}</chNFe></infProt></protNFe>`;
    expect(extrairNotaFiscalXml(xmlComCobranca("", protocolo)).chave_acesso).toBe(outra);
  });

  it("sem chave de 44 dígitos, a chave fica nula", () => {
    // O XML_EXEMPLO lá de cima tem Id="NFe1234", que não é chave de verdade.
    expect(extrairNotaFiscalXml(XML_EXEMPLO).chave_acesso).toBeNull();
    expect(extrairNotaFiscalXml(XML_EXEMPLO).valor_total).toBeNull();
  });
});

describe("normalizarCnpj", () => {
  it("remove pontuação, mantendo só dígitos", () => {
    expect(normalizarCnpj("12.345.678/0001-99")).toBe("12345678000199");
  });

  it("nulo/vazio vira string vazia", () => {
    expect(normalizarCnpj(null)).toBe("");
    expect(normalizarCnpj(undefined)).toBe("");
    expect(normalizarCnpj("")).toBe("");
  });
});
