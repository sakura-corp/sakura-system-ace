// Sakura System — AutoCenter Edition
// Ajuda dos documentos montados em HTML pra imprimir (garantia, recibo de
// comissão): todo texto que veio do banco passa por aqui antes de virar HTML,
// senão um "Pneu <aro 15>" vira tag e some do papel (#978).

/** Troca `& < > " '` pelas entidades do HTML, pra o texto aparecer como texto. */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
