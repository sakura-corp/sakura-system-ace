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
import { crc16Pix, normalizarChavePix, tipoDaChavePix } from "./pix";

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
