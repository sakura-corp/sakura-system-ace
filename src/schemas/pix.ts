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

export type TipoChavePix = "cpf" | "cnpj" | "telefone" | "email" | "aleatoria";

/** Os DDDs que existem no Brasil (Anatel). Telefone com outro DDD é digitação errada. */
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68,
  69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95,
  96, 97, 98, 99,
]);

/**
 * O e-mail cabe no campo 26 do BR Code, que vai até 99 caracteres: 18 do
 * "0014br.gov.bcb.pix" + 4 do "01" e tamanho = sobram 77 pra chave. É o mesmo
 * limite que o Banco Central usa pra chave e-mail.
 */
const TAMANHO_MAXIMO_EMAIL = 77;

function cpfValido(digitos: string): boolean {
  if (!/^\d{11}$/.test(digitos) || /^(\d)\1{10}$/.test(digitos)) return false;
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(digitos[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    if ((resto === 10 ? 0 : resto) !== Number(digitos[tamanho])) return false;
  }
  return true;
}

function cnpjValido(digitos: string): boolean {
  if (!/^\d{14}$/.test(digitos) || /^(\d)\1{13}$/.test(digitos)) return false;
  for (const tamanho of [12, 13]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) {
      // Pesos do CNPJ: vão de 5 (ou 6) até 2 e recomeçam em 9.
      const peso = ((tamanho - 1 - i) % 8) + 2;
      soma += Number(digitos[i]) * peso;
    }
    const resto = soma % 11;
    if ((resto < 2 ? 0 : 11 - resto) !== Number(digitos[tamanho])) return false;
  }
  return true;
}

/**
 * Telefone brasileiro sem o 55: DDD que existe + número. Celular tem 11
 * dígitos e começa com 9 depois do DDD; fixo tem 10 e começa com 2 a 5.
 * O "começa com 9" também derruba coisa como "11111111111".
 */
function telefoneValido(digitos: string): boolean {
  if (!DDDS.has(Number(digitos.slice(0, 2)))) return false;
  if (digitos.length === 11) return digitos[2] === "9";
  if (digitos.length === 10) return /[2-5]/.test(digitos[2]);
  return false;
}

/**
 * Descobre o tipo da chave e já devolve ela do jeito que o BR Code espera.
 *
 * A ambiguidade CPF × telefone (os dois podem ter 11 dígitos), nesta ordem:
 * 1. começou com "+": é telefone (só +55, Brasil);
 * 2. 11 dígitos com dígito verificador de CPF certo: é CPF, mesmo que os
 *    dois primeiros pareçam um DDD (quem tem chave telefone e digita sem o
 *    +55 cai aqui só se o número, por acaso, fechar como CPF; pra não haver
 *    dúvida, a tela pode mostrar o tipo reconhecido);
 * 3. senão, 10 ou 11 dígitos com DDD que existe: é telefone.
 *
 * CNPJ aqui é só o numérico de 14 dígitos (o CNPJ com letras, que a Receita
 * começou a dar, ainda não é reconhecido).
 */
function classificarChave(entrada: string): { tipo: TipoChavePix; chave: string } | null {
  const chave = (entrada ?? "").trim();
  if (chave === "") return null;
  // Tudo no BR Code é ASCII: caractere de fora (acento, emoji) não tem como ir.
  if (!/^[\x20-\x7e]+$/.test(chave)) return null;

  if (chave.includes("@")) {
    const email = chave.toLowerCase();
    if (email.length > TAMANHO_MAXIMO_EMAIL) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? { tipo: "email", chave: email } : null;
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave)) {
    return { tipo: "aleatoria", chave: chave.toLowerCase() };
  }

  if (chave.startsWith("+")) {
    if (!/^\+[\d\s().-]+$/.test(chave)) return null;
    const digitos = chave.replace(/\D/g, "");
    if (!digitos.startsWith("55")) return null;
    const nacional = digitos.slice(2);
    return telefoneValido(nacional) ? { tipo: "telefone", chave: `+55${nacional}` } : null;
  }

  // Daqui pra baixo só número, com a pontuação que as pessoas costumam digitar.
  if (!/^[\d\s().\-/]+$/.test(chave)) return null;
  const digitos = chave.replace(/\D/g, "");
  if (digitos.length === 14) return cnpjValido(digitos) ? { tipo: "cnpj", chave: digitos } : null;
  if (digitos.length === 11 && cpfValido(digitos)) return { tipo: "cpf", chave: digitos };
  if (telefoneValido(digitos)) return { tipo: "telefone", chave: `+55${digitos}` };
  return null;
}

/**
 * Normaliza a chave como o BR Code espera: CPF/CNPJ só dígitos (com ou sem
 * pontuação na entrada), telefone com +55 (aceita "(16) 99123-4567",
 * "16991234567", "+5516991234567"), e-mail em minúsculas, chave aleatória
 * (UUID) em minúsculas. Devolve null se não reconhece (inclusive chave com
 * caractere fora do ASCII). A regra CPF × telefone está em `classificarChave`.
 */
export function normalizarChavePix(chave: string): string | null {
  return classificarChave(chave)?.chave ?? null;
}

/** Pra validar o formulário de Configurações: o tipo reconhecido, ou null. */
export function tipoDaChavePix(chave: string): TipoChavePix | null {
  return classificarChave(chave)?.tipo ?? null;
}

export function montarPixCopiaECola(_dados: DadosPix | null | undefined): string | null {
  return null;
}
