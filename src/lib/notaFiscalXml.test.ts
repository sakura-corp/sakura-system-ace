// @vitest-environment jsdom
//
// Precisa de DOM (DOMParser) — mesmo motivo/padrão de notaFiscalXmlFornecedor.test.ts.
//
// Todos os dados abaixo são INVENTADOS (loja, cliente, CNPJ, CPF, chave): o
// repositório é público. A estrutura dos XML segue o leiaute nacional da NFC-e
// (4.00) e da NFS-e Nacional (1.00).
import { describe, expect, it } from "vitest";
import {
  interpretarXmlNotaFiscal,
  montarHtmlVisualNotaFiscal,
  type ContextoDoRecibo,
  type OsDoRecibo,
} from "./notaFiscalXml";

const XML_CONFIRMACAO_GIAP = `<?xml version="1.0"?>
<nfeResposta><notaFiscal><numeroNota>10</numeroNota><numeroRps>2</numeroRps><loteRps>108320147</loteRps><codigoVerificacao>3499756VTP</codigoVerificacao><link>https://araraquara.giap.com.br/ords/pma/f?p=616:116</link><cnpjPrestador>66217744000170</cnpjPrestador><dataEmissaoRPS>27/08/2026</dataEmissaoRPS><dataEmissaoNF>27/08/2026</dataEmissaoNF><statusEmissao>200</statusEmissao><messages>Nota emitida com sucesso!</messages></notaFiscal></nfeResposta>`;

const CHAVE_NFCE = "35261112345678000100650010000042181012345678";
const QR_NFCE =
  "https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode?p=35261112345678000100650010000042181012345678|2|2|1|ABCDEF";

function xmlNfce({
  comTroco = true,
  infCpl = "Tributos aproximados: R$ 103,42 (5,10%). Fonte: Simples Nacional",
  vTotTrib = null as string | null,
  nomeCliente = "Marina Exemplo",
} = {}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe${CHAVE_NFCE}" versao="4.00">
      <ide><mod>65</mod><serie>1</serie><nNF>4218</nNF><dhEmi>2026-11-13T14:32:00-03:00</dhEmi></ide>
      <emit>
        <CNPJ>12345678000100</CNPJ>
        <xNome>Exemplo Pneus e Servicos Ltda</xNome>
        <xFant>Auto Center Exemplo</xFant>
        <enderEmit><xLgr>Av. das Paineiras</xLgr><nro>480</nro><xBairro>Jardim Exemplo</xBairro><xMun>Cidade Exemplo</xMun><UF>SP</UF><CEP>13560000</CEP><fone>1655500199</fone></enderEmit>
        <IE>123456789000</IE>
      </emit>
      <dest><CPF>12345678909</CPF><xNome>${nomeCliente}</xNome></dest>
      <det nItem="1">
        <prod><cProd>PN-2055516</cProd><xProd>Pneu 205/55 R16 91V</xProd><uCom>UN</uCom><qCom>4.0000</qCom><vUnCom>489.90</vUnCom><vProd>1959.60</vProd><vDesc>59.60</vDesc></prod>
      </det>
      <det nItem="2">
        <prod><cProd>VA-TR414</cProd><xProd>Valvula de roda TR414</xProd><uCom>JG</uCom><qCom>1.0000</qCom><vUnCom>48.00</vUnCom><vProd>48.00</vProd></prod>
      </det>
      <total><ICMSTot><vProd>2007.60</vProd><vDesc>59.60</vDesc>${vTotTrib ? `<vTotTrib>${vTotTrib}</vTotTrib>` : ""}<vNF>1948.00</vNF></ICMSTot></total>
      <pag>
        <detPag><tPag>17</tPag><vPag>1000.00</vPag></detPag>
        <detPag><tPag>01</tPag><vPag>970.00</vPag></detPag>
        ${comTroco ? "<vTroco>22.00</vTroco>" : ""}
      </pag>
      ${infCpl ? `<infAdic><infCpl>${infCpl}</infCpl></infAdic>` : ""}
    </infNFe>
    <infNFeSupl><qrCode><![CDATA[${QR_NFCE}]]></qrCode><urlChave>https://www.homologacao.nfce.fazenda.sp.gov.br/consulta</urlChave></infNFeSupl>
  </NFe>
  <protNFe versao="4.00"><infProt><chNFe>${CHAVE_NFCE}</chNFe><dhRecbto>2026-11-13T14:32:08-03:00</dhRecbto><nProt>135260001234567</nProt></infProt></protNFe>
</nfeProc>`;
}

const CHAVE_NFSE = "35000002123456780001000000000000031226110123456789";

// NFS-e Nacional: o nome e o endereço da loja vêm em infNFSe/emit (enderNac).
// O grupo DPS/prest NÃO traz o nome quando quem emite é o próprio prestador —
// era dele que o recibo lia, e por isso saía "—" (#1029).
const XML_NFSE_NACIONAL = `<?xml version="1.0" encoding="UTF-8"?>
<NFSe versao="1.00" xmlns="http://www.sped.fazenda.gov.br/nfse">
  <infNFSe Id="NFS${CHAVE_NFSE}">
    <xLocEmi>Cidade Exemplo</xLocEmi>
    <xLocPrestacao>Cidade Exemplo</xLocPrestacao>
    <nNFSe>312</nNFSe>
    <xTribNac>Lubrificacao, limpeza, lustracao, revisao, carga e recarga, conserto de veiculos</xTribNac>
    <cStat>100</cStat>
    <dhProc>2026-11-13T15:10:00-03:00</dhProc>
    <emit>
      <CNPJ>12345678000100</CNPJ>
      <IM>45678</IM>
      <xNome>Exemplo Pneus e Servicos Ltda</xNome>
      <enderNac><xLgr>Av. das Paineiras</xLgr><nro>480</nro><xBairro>Jardim Exemplo</xBairro><cMun>3500000</cMun><UF>SP</UF><CEP>13560000</CEP></enderNac>
      <fone>1655500199</fone>
      <email>contato@loja.example</email>
    </emit>
    <valores><vBC>350.00</vBC><pAliqAplic>2.00</pAliqAplic><vISSQN>7.00</vISSQN><vTotalRet>0.00</vTotalRet><vLiq>350.00</vLiq></valores>
    <DPS versao="1.00">
      <infDPS Id="DPS350000021234567800010000100000000000312">
        <dhEmi>2026-11-13T15:05:00-03:00</dhEmi>
        <serie>1</serie>
        <nDPS>312</nDPS>
        <dCompet>2026-11-13</dCompet>
        <prest><CNPJ>12345678000100</CNPJ><IM>45678</IM><regTrib><opSimpNac>3</opSimpNac></regTrib></prest>
        <toma>
          <CNPJ>98765432000100</CNPJ>
          <xNome>Transportes Exemplo Ltda</xNome>
          <end><endNac><cMun>3500000</cMun><CEP>13570000</CEP></endNac><xLgr>Rua dos Jatobas</xLgr><nro>1250</nro><xCpl>sala 3</xCpl><xBairro>Vila Modelo</xBairro></end>
          <fone>1655500177</fone>
          <email>financeiro@cliente.example</email>
        </toma>
        <serv>
          <locPrest><cLocPrestacao>3500000</cLocPrestacao></locPrest>
          <cServ><cTribNac>140101</cTribNac><xDescServ>Alinhamento e balanceamento</xDescServ></cServ>
        </serv>
        <valores>
          <vServPrest><vServ>360.00</vServ></vServPrest>
          <vDescCondIncond><vDescIncond>10.00</vDescIncond></vDescCondIncond>
          <trib><tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun><totTrib><pTotTribSN>6.00</pTotTribSN></totTrib></trib>
        </valores>
      </infDPS>
    </DPS>
  </infNFSe>
</NFSe>`;

function os(parcial: Partial<OsDoRecibo> = {}): OsDoRecibo {
  return {
    numero: 1843,
    tipo: "os",
    veiculo: "Picape 2.0 Diesel 2021 · branca",
    placa: "XYZ9K87",
    km: 88450,
    atendente: "Rafael",
    mecanico: "Diego",
    telefoneCliente: "(16) 5550-0177",
    cliente: { nome: "Transportes Exemplo Ltda", documento: "98765432000100" },
    itens: [
      { tipo: "servico", descricao: "Alinhamento 3D", quantidade: 1, precoUnitario: 120, desconto: 0, garantiaDias: null },
      { tipo: "servico", descricao: "Balanceamento de roda", quantidade: 4, precoUnitario: 60, desconto: 0, garantiaDias: null },
      // A peça não entra na NFS-e: o total que se compara é só o dos serviços.
      { tipo: "peca", descricao: "Valvula de roda", quantidade: 4, precoUnitario: 12, desconto: 0, garantiaDias: 90 },
    ],
    ...parcial,
  };
}

function contexto(parcial: Partial<ContextoDoRecibo> = {}): ContextoDoRecibo {
  return { os: null, loja: null, valorDaNota: null, ...parcial };
}

/** O texto que o cliente lê (sem as tags), pra conferir "—" e o que aparece. */
function textoVisivel(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("style, script").forEach((n) => n.remove());
  // O formatador de moeda usa espaço sem quebra ("R$\u00a0360,00").
  return (doc.body.textContent ?? "").replace(/\u00a0/g, " ");
}

describe("interpretarXmlNotaFiscal — confirmação Giap (Araraquara)", () => {
  it("reconhece o formato de confirmação (sem itens/valores) e extrai o link do documento oficial", () => {
    const dados = interpretarXmlNotaFiscal(XML_CONFIRMACAO_GIAP, "nfse");

    expect(dados.reconhecido).toBe(true);
    expect(dados.numero).toBe("10");
    expect(dados.chaveAcesso).toBe("3499756VTP");
    expect(dados.protocolo).toBe("Lote 108320147 · RPS 2");
    expect(dados.emitente?.documento).toBe("66217744000170");
    expect(dados.itens).toEqual([]);
    expect(dados.total).toBeNull();
    expect(dados.linkOficial).toBe("https://araraquara.giap.com.br/ords/pma/f?p=616:116");
  });

  it("monta o recibo com o link do documento oficial em vez de uma tabela de itens vazia", () => {
    const dados = interpretarXmlNotaFiscal(XML_CONFIRMACAO_GIAP, "nfse");
    const html = montarHtmlVisualNotaFiscal(dados);

    expect(html).toContain("araraquara.giap.com.br");
    expect(html).toContain("Ver documento oficial completo");
    expect(html).not.toContain("<table>");
  });

  it("completa o emitente com os dados da loja (Configurações), em vez de \"—\"", () => {
    const dados = interpretarXmlNotaFiscal(XML_CONFIRMACAO_GIAP, "nfse");
    const html = montarHtmlVisualNotaFiscal(
      dados,
      contexto({
        loja: {
          nomeFantasia: "Auto Center Exemplo",
          razaoSocial: "Exemplo Pneus Ltda",
          cnpj: null,
          inscricaoEstadual: null,
          inscricaoMunicipal: "45678",
          telefone: "(16) 5550-0199",
          email: null,
          endereco: "Av. das Paineiras, 480 · Jardim Exemplo · Cidade Exemplo/SP",
        },
      }),
    );
    const texto = textoVisivel(html);
    expect(texto).toContain("Auto Center Exemplo");
    expect(texto).toContain("Av. das Paineiras, 480");
    expect(texto).not.toContain("—");
  });

  it("total da OS igual ao da nota: lista os itens da OS com a frase de documento sem valor fiscal", () => {
    const dados = interpretarXmlNotaFiscal(XML_CONFIRMACAO_GIAP, "nfse");
    const texto = textoVisivel(
      montarHtmlVisualNotaFiscal(dados, contexto({ os: os(), valorDaNota: 360 })),
    );
    expect(texto).toContain("Documento sem valor fiscal - itens conforme OS nº 1843");
    expect(texto).toContain("Alinhamento 3D");
    expect(texto).toContain("Balanceamento de roda");
    expect(texto).toContain("R$ 360,00");
    // O XML da Giap não traz o cliente: o nome vem do cadastro, pela OS.
    expect(texto).toContain("Transportes Exemplo Ltda");
    // A peça (e a garantia dela) vai na NFC-e, não na NFS-e.
    expect(texto).not.toContain("Valvula de roda");
  });

  it("total da OS diferente do da nota: mostra só o total da nota e \"Itens na OS nº X\", sem os itens", () => {
    const dados = interpretarXmlNotaFiscal(XML_CONFIRMACAO_GIAP, "nfse");
    const texto = textoVisivel(
      montarHtmlVisualNotaFiscal(dados, contexto({ os: os(), valorDaNota: 300 })),
    );
    expect(texto).toContain("Itens na OS nº 1843");
    expect(texto).toContain("R$ 300,00");
    expect(texto).not.toContain("Alinhamento 3D");
    expect(texto).not.toContain("Documento sem valor fiscal");
  });
});

describe("interpretarXmlNotaFiscal — NFS-e Nacional", () => {
  it("lê o nome e o endereço do emitente (nunca \"—\")", () => {
    const dados = interpretarXmlNotaFiscal(XML_NFSE_NACIONAL, "nfse");
    expect(dados.reconhecido).toBe(true);
    expect(dados.emitente?.nome).toBe("Exemplo Pneus e Servicos Ltda");
    expect(dados.emitente?.endereco).toContain("Av. das Paineiras, 480");
    expect(dados.emitente?.inscricaoMunicipal).toBe("45678");

    const texto = textoVisivel(montarHtmlVisualNotaFiscal(dados));
    expect(texto).toContain("Exemplo Pneus e Servicos Ltda");
    expect(texto).toContain("Av. das Paineiras, 480");
    expect(texto).not.toContain("—");
  });

  it("lê o tomador completo, o serviço, os valores e a chave de 50 dígitos", () => {
    const dados = interpretarXmlNotaFiscal(XML_NFSE_NACIONAL, "nfse");
    expect(dados.destinatario?.nome).toBe("Transportes Exemplo Ltda");
    expect(dados.destinatario?.endereco).toContain("Rua dos Jatobas, 1250");
    expect(dados.destinatario?.email).toBe("financeiro@cliente.example");
    expect(dados.destinatario?.telefone).toBe("1655500177");
    expect(dados.chaveAcesso).toBe(CHAVE_NFSE);
    expect(dados.chaveAcesso).toHaveLength(50);
    expect(dados.servico).toMatchObject({
      codigoTributacao: "140101",
      descricaoTributacao: expect.stringContaining("conserto de veiculos"),
      localPrestacao: "Cidade Exemplo",
      competencia: "2026-11-13",
      numeroDps: "312",
      serieDps: "1",
      valorServicos: 360,
      descontos: 10,
      baseCalculo: 350,
      aliquotaIss: 2,
      valorIss: 7,
      issRetido: false,
      retencoes: 0,
      valorLiquido: 350,
    });

    const texto = textoVisivel(montarHtmlVisualNotaFiscal(dados));
    expect(texto).toContain("140101");
    expect(texto).toContain("Valor líquido");
    expect(texto).toContain("R$ 350,00");
    expect(texto).toContain("ISS (2,00%)");
    expect(texto).toMatch(/35000 00212 34567 80001 00000 00000 00031 22611 01234 56789/);
  });

  it("sem QR code no XML da NFS-e, o recibo não inventa um", () => {
    const html = montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(XML_NFSE_NACIONAL, "nfse"));
    expect(html).not.toContain('class="qr"');
  });

  it("tributos aproximados: mostra o percentual que veio no XML (pTotTribSN)", () => {
    const texto = textoVisivel(
      montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(XML_NFSE_NACIONAL, "nfse")),
    );
    expect(texto).toContain("Tributos aproximados");
    expect(texto).toContain("6,00%");
  });

  it("tributos aproximados: sem o dado no XML, a linha não aparece", () => {
    const xml = XML_NFSE_NACIONAL.replace(/<totTrib>.*<\/totTrib>/, "");
    const texto = textoVisivel(montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xml, "nfse")));
    expect(texto).not.toContain("Tributos aproximados");
  });
});

describe("interpretarXmlNotaFiscal — NFC-e", () => {
  it("lê código, unidade, desconto do item, troco, IE, telefone, QR code e data do protocolo", () => {
    const dados = interpretarXmlNotaFiscal(xmlNfce(), "nfe");
    expect(dados.itens[0]).toMatchObject({
      codigo: "PN-2055516",
      unidade: "UN",
      quantidade: 4,
      valorUnitario: 489.9,
      desconto: 59.6,
      valorTotal: 1959.6,
    });
    expect(dados.itens[1].desconto).toBeNull();
    expect(dados.descontoTotal).toBe(59.6);
    expect(dados.subtotal).toBe(2007.6);
    expect(dados.troco).toBe(22);
    expect(dados.emitente?.inscricaoEstadual).toBe("123456789000");
    expect(dados.emitente?.telefone).toBe("1655500199");
    expect(dados.emitente?.nomeFantasia).toBe("Auto Center Exemplo");
    expect(dados.qrCode).toBe(QR_NFCE);
    expect(dados.urlConsulta).toBe("https://www.homologacao.nfce.fazenda.sp.gov.br/consulta");
    expect(dados.dataProtocolo).toBe("2026-11-13T14:32:08-03:00");
  });

  it("mostra código, unidade, desconto, troco, chave em blocos de 4 e o QR code", () => {
    const html = montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xmlNfce(), "nfe"));
    const texto = textoVisivel(html);
    expect(texto).toContain("PN-2055516");
    expect(texto).toContain("JG");
    expect(texto).toContain("R$ 59,60");
    expect(texto).toContain("Troco");
    expect(texto).toContain("R$ 22,00");
    expect(texto).toContain("3526 1112 3456 7800 0100 6500 1000 0042 1810 1234 5678");
    expect(html).toMatch(/<svg[^>]*class="qr"/);
  });

  it("sem troco no XML, a linha do troco não aparece", () => {
    const texto = textoVisivel(
      montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xmlNfce({ comTroco: false }), "nfe")),
    );
    expect(texto).not.toContain("Troco");
  });

  it("tributos aproximados: com a linha no infCpl, aparece com o texto da nota", () => {
    const texto = textoVisivel(montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xmlNfce(), "nfe")));
    expect(texto).toContain("Tributos aproximados: R$ 103,42 (5,10%)");
  });

  it("tributos aproximados: com vTotTrib no XML, aparece o valor", () => {
    const texto = textoVisivel(
      montarHtmlVisualNotaFiscal(
        interpretarXmlNotaFiscal(xmlNfce({ infCpl: "", vTotTrib: "99.10" }), "nfe"),
      ),
    );
    expect(texto).toContain("Tributos aproximados");
    expect(texto).toContain("R$ 99,10");
  });

  it("tributos aproximados: sem vTotTrib e sem a linha no infCpl, não aparece", () => {
    const texto = textoVisivel(
      montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xmlNfce({ infCpl: "" }), "nfe")),
    );
    expect(texto).not.toContain("Tributos aproximados");
  });

  it("texto com < ou & no nome do cliente sai escapado", () => {
    const xml = xmlNfce({ nomeCliente: "Oficina &lt;Teste&gt; &amp; Filhos" });
    const html = montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xml, "nfe"));
    expect(html).toContain("Oficina &lt;Teste&gt; &amp; Filhos");
    expect(html).not.toContain("<Teste>");
    expect(textoVisivel(html)).toContain("Oficina <Teste> & Filhos");
  });

  it("texto da OS com < ou & também sai escapado", () => {
    const html = montarHtmlVisualNotaFiscal(
      interpretarXmlNotaFiscal(xmlNfce(), "nfe"),
      contexto({ os: os({ veiculo: "Carro <script>alert(1)</script> & cia" }) }),
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("nota sem OS ligada: o recibo sai sem as seções de veículo e garantia", () => {
    const texto = textoVisivel(montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xmlNfce(), "nfe")));
    expect(texto).not.toContain("Veículo");
    expect(texto).not.toContain("Garantia");
    expect(texto).not.toContain("Placa");
  });

  it("nota com OS ligada: mostra veículo, placa, km, OS, atendente e a garantia", () => {
    const texto = textoVisivel(
      montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xmlNfce(), "nfe"), contexto({ os: os() })),
    );
    expect(texto).toContain("Veículo");
    expect(texto).toContain("XYZ9K87");
    expect(texto).toContain("88.450 km");
    expect(texto).toContain("OS nº 1843");
    expect(texto).toContain("Rafael");
    expect(texto).toContain("Garantia");
    expect(texto).toContain("90 dias");
  });

  it("nenhuma linha sai com \"—\" no lugar do dado, nem com XML quase vazio", () => {
    const xmlMinimo = `<nfeProc><NFe><infNFe Id="NFe1"><ide><nNF>1</nNF></ide><emit><CNPJ>12345678000100</CNPJ></emit><det nItem="1"><prod><xProd>Item</xProd><qCom>1</qCom><vUnCom>10</vUnCom><vProd>10</vProd></prod></det><total><ICMSTot><vNF>10.00</vNF></ICMSTot></total></infNFe></NFe></nfeProc>`;
    const texto = textoVisivel(montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xmlMinimo, "nfe")));
    expect(texto).not.toContain("—");
    expect(texto).not.toContain("Troco");
    expect(texto).not.toContain("Chave de acesso");
  });

  it("o aviso de que o recibo não substitui o DANFE continua no topo", () => {
    const texto = textoVisivel(montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xmlNfce(), "nfe")));
    expect(texto).toContain("Não substitui o DANFE NFC-e");
  });
});

describe("recibo — achados da revisão final", () => {
  it("Giap: a data dd/mm/aaaa sai como veio (05/11 não vira 11/05)", () => {
    const xml = XML_CONFIRMACAO_GIAP.replace(/27\/08\/2026/g, "05/11/2026");
    const texto = textoVisivel(montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xml, "nfse")));
    expect(texto).toContain("05/11/2026");
    expect(texto).not.toContain("11/05/2026");
  });

  it("NFC-e sem cliente no XML: não imprime o CPF do cadastro (só a Giap usa o cadastro)", () => {
    const xml = xmlNfce().replace(/<dest>.*<\/dest>/, "");
    const texto = textoVisivel(
      montarHtmlVisualNotaFiscal(
        interpretarXmlNotaFiscal(xml, "nfe"),
        contexto({ os: os({ cliente: { nome: "Fulano Cadastro", documento: "12345678909" } }) }),
      ),
    );
    expect(texto).not.toContain("123.456.789-09");
    expect(texto).not.toContain("Fulano Cadastro");
  });

  it("NFC-e sem cliente no XML: também não mostra o telefone do cadastro (pedido da Sofia, 18/11)", () => {
    const xml = xmlNfce().replace(/<dest>.*<\/dest>/, "");
    const texto = textoVisivel(
      montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xml, "nfe"), contexto({ os: os() })),
    );
    expect(texto).not.toContain("(16) 5550-0177");
    expect(texto).not.toContain("Cliente");
  });

  it("item com desconto: a coluna Total mostra o valor já com o desconto", () => {
    const texto = textoVisivel(montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xmlNfce(), "nfe")));
    // 4 × 489,90 = 1.959,60 − 59,60 = 1.900,00
    expect(texto).toContain("R$ 1.900,00");
    expect(texto).not.toContain("R$ 1.959,60");
  });

  it("NF-e modelo 55: o recibo diz NF-e e DANFE, não NFC-e", () => {
    const xml = xmlNfce().replace("<mod>65</mod>", "<mod>55</mod>");
    const texto = textoVisivel(montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xml, "nfe")));
    expect(texto).toContain("Recibo da NF-e");
    expect(texto).not.toContain("NFC-e");
  });

  it("Giap: link que não é da prefeitura (https *.giap.com.br) não vira link clicável", () => {
    const xml = XML_CONFIRMACAO_GIAP.replace(
      "https://araraquara.giap.com.br/ords/pma/f?p=616:116",
      "javascript:alert(1)",
    );
    const html = montarHtmlVisualNotaFiscal(interpretarXmlNotaFiscal(xml, "nfse"));
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("Ver documento oficial completo");
  });

  it("emitente de outro CNPJ (XML de terceiro): não completa com os dados da loja", () => {
    const html = montarHtmlVisualNotaFiscal(
      interpretarXmlNotaFiscal(xmlNfce().replace(/<enderEmit>.*<\/enderEmit>/, ""), "nfe"),
      contexto({
        loja: {
          nomeFantasia: "Outra Loja",
          razaoSocial: null,
          cnpj: "99888777000166",
          inscricaoEstadual: null,
          inscricaoMunicipal: null,
          telefone: "1640004000",
          email: null,
          endereco: "Rua da Outra Loja, 1",
        },
      }),
    );
    expect(textoVisivel(html)).not.toContain("Rua da Outra Loja");
  });
});

describe("interpretarXmlNotaFiscal — XML não reconhecido", () => {
  it("devolve reconhecido: false pra um XML sem os formatos esperados", () => {
    const dados = interpretarXmlNotaFiscal("<algumaCoisa><x>1</x></algumaCoisa>", "nfse");
    expect(dados.reconhecido).toBe(false);
  });
});
