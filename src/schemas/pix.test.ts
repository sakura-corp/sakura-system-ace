/**
 * Testes do "Pix copia e cola" (BR Code estático), tarefa #456.
 *
 * De onde vem a referência. Não temos um app de banco aqui, então o "igual ao
 * de um app de banco" é provado contra o EXEMPLO PUBLICADO pelo Banco Central
 * no Manual do BR Code (e no Manual de Padrões para Iniciação do Pix): chave
 * aleatória fictícia 123e4567-e12b-12d1-a456-426655440000, recebedor
 * "Fulano de Tal", cidade "BRASILIA", txid "***". O CRC desse exemplo (1D3D)
 * também foi conferido fora deste código, com o `binascii.crc_hqx` do Python
 * (init 0xFFFF), antes de escrever a função.
 *
 * A conferência com o app do banco da Sofia (ler o código gerado pelo
 * programa e ver que o banco mostra o mesmo recebedor e valor) fica pra
 * depois de publicar.
 *
 * Nenhuma chave Pix ou CPF/CNPJ de verdade aqui: o repositório é público. Os
 * documentos usados são inventados, só com o dígito verificador certo.
 */
import { describe, expect, it } from "vitest";
import {
  crc16Pix,
  montarPixCopiaECola,
  normalizarChavePix,
  tipoDaChavePix,
  valorDoQrPix,
} from "./pix";

/** O código publicado pelo Banco Central no manual do BR Code. */
const EXEMPLO_BC =
  "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D";

/**
 * Segunda implementação do CRC16-CCITT-FALSE, escrita aqui de propósito, bit
 * a bit, sem olhar a do código: se as duas errassem do mesmo jeito o teste
 * passaria à toa, então esta é a mais "burra" possível (um bit por vez).
 */
function crcDeConferencia(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    const byte = texto.charCodeAt(i);
    for (let bit = 7; bit >= 0; bit--) {
      const entra = (byte >> bit) & 1;
      const topo = (crc >> 15) & 1;
      crc = (crc << 1) & 0xffff;
      if (topo ^ entra) crc ^= 0x1021;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

describe("crc16Pix", () => {
  it("dá o CRC publicado no exemplo do Banco Central (1D3D)", () => {
    const semCrc = EXEMPLO_BC.slice(0, -4);
    expect(crc16Pix(semCrc)).toBe("1D3D");
  });

  it("o CRC de conferência do teste também dá 1D3D (prova que ele serve de régua)", () => {
    expect(crcDeConferencia(EXEMPLO_BC.slice(0, -4))).toBe("1D3D");
  });

  it("sempre devolve 4 dígitos, com zero à esquerda", () => {
    // "123456789" é o vetor de teste clássico do CRC16-CCITT-FALSE: 29B1.
    expect(crc16Pix("123456789")).toBe("29B1");
    // Procura um texto cujo CRC comece com zero, pra ver o preenchimento.
    let texto = "";
    for (let n = 0; n < 5000; n++) {
      if (crcDeConferencia(String(n)).startsWith("0")) {
        texto = String(n);
        break;
      }
    }
    expect(texto).not.toBe("");
    expect(crc16Pix(texto)).toBe(crcDeConferencia(texto));
    expect(crc16Pix(texto)).toHaveLength(4);
  });
});

// Documentos inventados agora, só com o dígito verificador certo (não são de
// ninguém). O CPF_QUE_PARECE_CELULAR é "41" (DDD de Curitiba) + "9" + oito
// dígitos, e ainda assim fecha como CPF: de propósito, pra testar a
// ambiguidade CPF × telefone.
const CPF_DE_TESTE = "41853290750";
const CPF_QUE_PARECE_CELULAR = "41983720631";
const CNPJ_DE_TESTE = "48291573000148";

describe("normalizarChavePix e tipoDaChavePix", () => {
  it("CPF: com ou sem pontuação vira só dígitos", () => {
    expect(normalizarChavePix("418.532.907-50")).toBe(CPF_DE_TESTE);
    expect(normalizarChavePix(CPF_DE_TESTE)).toBe(CPF_DE_TESTE);
    expect(tipoDaChavePix("418.532.907-50")).toBe("cpf");
  });

  it("CNPJ: com ou sem pontuação vira só dígitos", () => {
    expect(normalizarChavePix("48.291.573/0001-48")).toBe(CNPJ_DE_TESTE);
    expect(normalizarChavePix(CNPJ_DE_TESTE)).toBe(CNPJ_DE_TESTE);
    expect(tipoDaChavePix("48.291.573/0001-48")).toBe("cnpj");
  });

  it("CNPJ com dígito verificador errado não é chave", () => {
    expect(normalizarChavePix("48.291.573/0001-49")).toBeNull();
    expect(tipoDaChavePix("48291573000149")).toBeNull();
  });

  it("telefone: os três jeitos de digitar viram +55", () => {
    expect(normalizarChavePix("(16) 99123-4567")).toBe("+5516991234567");
    expect(normalizarChavePix("16991234567")).toBe("+5516991234567");
    expect(normalizarChavePix("+5516991234567")).toBe("+5516991234567");
    expect(normalizarChavePix("+55 (16) 99123-4567")).toBe("+5516991234567");
    expect(tipoDaChavePix("(16) 99123-4567")).toBe("telefone");
  });

  it("telefone fixo (10 dígitos) também vale", () => {
    expect(normalizarChavePix("(16) 3322-1144")).toBe("+551633221144");
  });

  it("11 dígitos com CPF válido é CPF, mesmo com DDD válido; com + na frente é telefone", () => {
    expect(tipoDaChavePix(CPF_QUE_PARECE_CELULAR)).toBe("cpf");
    expect(normalizarChavePix(CPF_QUE_PARECE_CELULAR)).toBe(CPF_QUE_PARECE_CELULAR);
    expect(tipoDaChavePix("+55" + CPF_QUE_PARECE_CELULAR)).toBe("telefone");
    expect(normalizarChavePix("+55" + CPF_QUE_PARECE_CELULAR)).toBe("+55" + CPF_QUE_PARECE_CELULAR);
  });

  it("telefone com DDD que não existe não é chave", () => {
    expect(normalizarChavePix("(20) 99123-4567")).toBeNull();
    expect(normalizarChavePix("+5520991234567")).toBeNull();
  });

  it("telefone de fora do Brasil não é chave", () => {
    expect(normalizarChavePix("+1 415 555 0100")).toBeNull();
  });

  it("e-mail vai pra minúsculas e sem espaço nas pontas", () => {
    expect(normalizarChavePix("  Loja.Exemplo@Exemplo.COM.br ")).toBe("loja.exemplo@exemplo.com.br");
    expect(tipoDaChavePix("Loja.Exemplo@Exemplo.COM.br")).toBe("email");
  });

  it("e-mail com acento não é chave (o BR Code é só ASCII)", () => {
    expect(normalizarChavePix("joão@exemplo.com.br")).toBeNull();
  });

  it("chave aleatória (UUID) vai pra minúsculas", () => {
    expect(normalizarChavePix("123E4567-E12B-12D1-A456-426655440000")).toBe(
      "123e4567-e12b-12d1-a456-426655440000",
    );
    expect(tipoDaChavePix("123e4567-e12b-12d1-a456-426655440000")).toBe("aleatoria");
  });

  it("lixo não é chave", () => {
    for (const lixo of ["", "   ", "abc", "123", "12345678901234567", "loja@", "@exemplo.com", "11111111111"]) {
      expect(normalizarChavePix(lixo), lixo).toBeNull();
      expect(tipoDaChavePix(lixo), lixo).toBeNull();
    }
  });
});

/** Fecha um código escrito à mão (que já termina em "6304") com o CRC de conferência. */
function comCrc(semCrc: string): string {
  return semCrc + crcDeConferencia(semCrc);
}

/** Os dados do exemplo do Banco Central, pra variar um campo por teste. */
const DADOS_BC = {
  chave: "123e4567-e12b-12d1-a456-426655440000",
  nomeRecebedor: "Fulano de Tal",
  cidadeRecebedor: "BRASILIA",
};

describe("montarPixCopiaECola", () => {
  it("monta exatamente o código publicado no exemplo do Banco Central", () => {
    expect(montarPixCopiaECola({ ...DADOS_BC, txid: "***" })).toBe(EXEMPLO_BC);
    // Sem txid, o padrão é "***": dá o mesmo código.
    expect(montarPixCopiaECola(DADOS_BC)).toBe(EXEMPLO_BC);
  });

  it("com valor (R$ 10,50): campo 54 entre o 53 e o 58, com ponto e 2 casas", () => {
    const esperado = comCrc(
      "000201" +
        "26580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000" +
        "52040000" +
        "5303986" +
        "540510.50" +
        "5802BR" +
        "5913Fulano de Tal" +
        "6008BRASILIA" +
        "62070503***" +
        "6304",
    );
    expect(montarPixCopiaECola({ ...DADOS_BC, valor: 10.5 })).toBe(esperado);
  });

  it("valor ausente, zero, negativo, NaN ou que arredonda pra zero: sem campo 54", () => {
    for (const valor of [undefined, null, 0, -5, Number.NaN, 0.004]) {
      expect(montarPixCopiaECola({ ...DADOS_BC, valor }), String(valor)).toBe(EXEMPLO_BC);
    }
  });

  it("valor no limite do campo (13 caracteres) vai; acima disso, null", () => {
    const codigo = montarPixCopiaECola({ ...DADOS_BC, valor: 9999999999.99 });
    expect(codigo).toContain("54139999999999.99");
    expect(montarPixCopiaECola({ ...DADOS_BC, valor: 10000000000 })).toBeNull();
    expect(montarPixCopiaECola({ ...DADOS_BC, valor: Number.POSITIVE_INFINITY })).toBeNull();
  });

  it("chave e-mail: normalizada e com o tamanho do campo 26 certo", () => {
    const esperado = comCrc(
      "000201" +
        "26490014br.gov.bcb.pix0127loja.exemplo@exemplo.com.br" +
        "52040000" +
        "5303986" +
        "5802BR" +
        "5919Borracharia Exemplo" +
        "6010Araraquara" +
        "62070503***" +
        "6304",
    );
    expect(
      montarPixCopiaECola({
        chave: "Loja.Exemplo@Exemplo.com.br",
        nomeRecebedor: "Borracharia Exemplo",
        cidadeRecebedor: "Araraquara",
      }),
    ).toBe(esperado);
  });

  it("chave telefone: vai com +55", () => {
    const esperado = comCrc(
      "000201" +
        "26360014br.gov.bcb.pix0114+5516991234567" +
        "52040000" +
        "5303986" +
        "5802BR" +
        "5919Borracharia Exemplo" +
        "6010Araraquara" +
        "62070503***" +
        "6304",
    );
    expect(
      montarPixCopiaECola({
        chave: "(16) 99123-4567",
        nomeRecebedor: "Borracharia Exemplo",
        cidadeRecebedor: "Araraquara",
      }),
    ).toBe(esperado);
  });

  it("chave CPF, com valor: vai só com os dígitos", () => {
    const esperado = comCrc(
      "000201" +
        "26330014br.gov.bcb.pix011141853290750" +
        "52040000" +
        "5303986" +
        "54071234.50" +
        "5802BR" +
        "5919Borracharia Exemplo" +
        "6010Araraquara" +
        "62070503***" +
        "6304",
    );
    expect(
      montarPixCopiaECola({
        chave: "418.532.907-50",
        nomeRecebedor: "Borracharia Exemplo",
        cidadeRecebedor: "Araraquara",
        valor: 1234.5,
      }),
    ).toBe(esperado);
  });

  it("tira acento do nome e da cidade (São Carlos → Sao Carlos)", () => {
    const esperado = comCrc(
      "000201" +
        "26580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000" +
        "52040000" +
        "5303986" +
        "5802BR" +
        "5917Jose da Conceicao" +
        "6010Sao Carlos" +
        "62070503***" +
        "6304",
    );
    expect(
      montarPixCopiaECola({ ...DADOS_BC, nomeRecebedor: "José da Conceição", cidadeRecebedor: "São Carlos" }),
    ).toBe(esperado);
  });

  it("corta o nome em 25 e a cidade em 15, sem deixar espaço no fim", () => {
    const codigo = montarPixCopiaECola({
      ...DADOS_BC,
      nomeRecebedor: "Pneus e Rodas do Exemplo  Ltda",
      cidadeRecebedor: "São José do Rio Preto",
    });
    expect(codigo).toContain("5924Pneus e Rodas do Exemplo6015Sao Jose do Rio6207");
  });

  it("txid: aceita letras e números até 25; fora disso volta pro ***", () => {
    expect(montarPixCopiaECola({ ...DADOS_BC, txid: "PEDIDO123" })).toContain("62130509PEDIDO1236304");
    expect(montarPixCopiaECola({ ...DADOS_BC, txid: "pedido-1" })).toBe(EXEMPLO_BC);
    expect(montarPixCopiaECola({ ...DADOS_BC, txid: "A".repeat(26) })).toBe(EXEMPLO_BC);
    expect(montarPixCopiaECola({ ...DADOS_BC, txid: "" })).toBe(EXEMPLO_BC);
  });

  it("sem dado, sem chave, chave lixo, sem nome ou sem cidade: null, sem lançar erro", () => {
    expect(montarPixCopiaECola(null)).toBeNull();
    expect(montarPixCopiaECola(undefined)).toBeNull();
    expect(montarPixCopiaECola({ ...DADOS_BC, chave: "" })).toBeNull();
    expect(montarPixCopiaECola({ ...DADOS_BC, chave: "não sei a chave" })).toBeNull();
    expect(montarPixCopiaECola({ ...DADOS_BC, nomeRecebedor: "   " })).toBeNull();
    // Nome que some inteiro no filtro de ASCII também conta como sem nome.
    expect(montarPixCopiaECola({ ...DADOS_BC, nomeRecebedor: "™™" })).toBeNull();
    expect(montarPixCopiaECola({ ...DADOS_BC, cidadeRecebedor: "" })).toBeNull();
    // Campo faltando de vez (dado velho do banco, por exemplo).
    expect(montarPixCopiaECola({ chave: DADOS_BC.chave } as unknown as Parameters<typeof montarPixCopiaECola>[0])).toBeNull();
  });
});

describe("valorDoQrPix (qual valor vai no QR do faturamento)", () => {
  it("forma única Pix: o valor cobrado", () => {
    expect(
      valorDoQrPix({ dividir: false, linhasBatem: true, formaPagamento: "pix", valorCobrado: 150.5, linhas: [] }),
    ).toBe(150.5);
  });

  it("forma única que não é Pix: sem QR", () => {
    expect(
      valorDoQrPix({ dividir: false, linhasBatem: true, formaPagamento: "dinheiro", valorCobrado: 150, linhas: [] }),
    ).toBeNull();
  });

  it("forma única Pix com valor zero: sem QR", () => {
    expect(
      valorDoQrPix({ dividir: false, linhasBatem: true, formaPagamento: "pix", valorCobrado: 0, linhas: [] }),
    ).toBeNull();
  });

  it("dividido: o valor da primeira linha Pix com valor maior que zero", () => {
    const linhas = [
      { formaPagamento: "cartao_credito", valorCobrado: 700 },
      { formaPagamento: "pix", valorCobrado: 0 },
      { formaPagamento: "pix", valorCobrado: 300 },
      { formaPagamento: "pix", valorCobrado: 50 },
    ];
    expect(
      valorDoQrPix({ dividir: true, linhasBatem: true, formaPagamento: "pix", valorCobrado: 1050, linhas }),
    ).toBe(300);
  });

  it("dividido com as linhas que ainda não fecham o total: sem QR (o cliente pagaria o valor errado)", () => {
    const linhas = [
      { formaPagamento: "pix", valorCobrado: 1000 },
      { formaPagamento: "cartao_credito", valorCobrado: 300 },
    ];
    expect(
      valorDoQrPix({ dividir: true, linhasBatem: false, formaPagamento: "pix", valorCobrado: 1300, linhas }),
    ).toBeNull();
  });

  it("dividido sem linha Pix: sem QR (a forma única antiga não vale)", () => {
    const linhas = [{ formaPagamento: "dinheiro", valorCobrado: 100 }];
    expect(
      valorDoQrPix({ dividir: true, linhasBatem: true, formaPagamento: "pix", valorCobrado: 100, linhas }),
    ).toBeNull();
  });
});
