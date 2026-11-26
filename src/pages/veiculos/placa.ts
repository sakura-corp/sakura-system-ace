/**
 * A máscara da placa na janela do veículo (#1096).
 *
 * Ao digitar: tudo em maiúsculas, só letra e número (o traço e o espaço saem),
 * no máximo 7. É o formato da placa Mercosul (ABC1D23) e o da antiga sem o
 * traço (ABC1234). Placa que JÁ estava cadastrada não passa por aqui ao abrir:
 * ela só muda se a pessoa mexer no campo (veículo antigo salva sem perder nada).
 */
export function mascararPlaca(texto: string): string {
  return texto
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

/**
 * 3 letras, 1 número, 1 letra ou número, 2 números (aceita o traço da antiga).
 * Serve só pra AVISAR: placa fora do padrão salva assim mesmo (carro de fora,
 * placa provisória; `docs/licoes.md`, item 33).
 */
export function placaNoPadrao(placa: string): boolean {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa.replace("-", ""));
}
