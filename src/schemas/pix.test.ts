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
import { crc16Pix } from "./pix";

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
