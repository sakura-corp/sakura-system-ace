import type { RegimeTributario } from "@/types/configuracao";

// Percentual aproximado dos tributos do Simples (Lei da Transparência), que a
// NFS-e Nacional leva na nota. Vem da contabilidade da loja; vazio é permitido.

export const AVISO_PERCENTUAL_TRIBUTOS_SIMPLES_VAZIO =
  "Sem este percentual, a nota de serviço sai dizendo 0% de tributos. Peça o número à contabilidade.";

// Devolve o texto do erro, ou null quando o valor serve (vazio serve).
export function erroPercentualTributosSimples(valor: number | null): string | null {
  if (valor === null) return null;
  if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
    return "O percentual dos tributos do Simples precisa estar entre 0 e 100.";
  }
  return null;
}

// Aviso calmo (nunca trava o salvar): Simples com o campo vazio.
export function avisoPercentualTributosSimplesVazio(
  regime: RegimeTributario | null,
  valor: number | null,
): string | null {
  return regime === "simples_nacional" && valor === null
    ? AVISO_PERCENTUAL_TRIBUTOS_SIMPLES_VAZIO
    : null;
}
