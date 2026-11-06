export interface DadosPix {
  chave: string;
  nomeRecebedor: string;
  cidadeRecebedor: string;
  valor?: number | null;
  txid?: string | null;
}

/**
 * CRC16-CCITT-FALSE (polinômio 0x1021, começa em 0xFFFF), 4 dígitos hexa
 * maiúsculos. É o "dígito verificador" do BR Code: o app do banco recalcula e,
 * se não bater, recusa o código inteiro.
 *
 * Conta caractere a caractere com `charCodeAt`. Isso só é igual a contar bytes
 * porque o BR Code montado aqui é todo ASCII (nome, cidade e chave passam por
 * filtro antes); com acento, um caractere viraria dois bytes em UTF-8.
 */
export function crc16Pix(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= (texto.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  // padStart: um CRC como 0x0A1F tem que sair "0A1F", nunca "A1F".
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function normalizarChavePix(_chave: string): string | null {
  return null;
}

export function tipoDaChavePix(
  _chave: string,
): "cpf" | "cnpj" | "telefone" | "email" | "aleatoria" | null {
  return null;
}

export function montarPixCopiaECola(_dados: DadosPix | null | undefined): string | null {
  return null;
}
