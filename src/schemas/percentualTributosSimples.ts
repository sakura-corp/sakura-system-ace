import type { RegimeTributario } from "@/types/configuracao";

// Percentual aproximado dos tributos do Simples (Lei da Transparência), que a
// NFS-e Nacional leva na nota. Vem da contabilidade da loja; vazio é permitido.

// Uma frase só, usada pela tela e pela trava do banco
// (`ck_config_fiscal_percentual_tributos_simples`, em src/lib/errors.ts).
export const MENSAGEM_PERCENTUAL_TRIBUTOS_SIMPLES =
  "O percentual de tributos do Simples precisa estar entre 0 e 100%.";

export const AVISO_PERCENTUAL_TRIBUTOS_SIMPLES_VAZIO =
  "Sem este percentual, a nota de serviço sai dizendo 0% de tributos. Peça o número à contabilidade.";

// Devolve o texto do erro, ou null quando o valor serve (vazio serve).
export function erroPercentualTributosSimples(valor: number | null): string | null {
  if (valor === null) return null;
  if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
    return MENSAGEM_PERCENTUAL_TRIBUTOS_SIMPLES;
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

// O que entra no salvar.
// - No Simples: o número arredondado em 2 casas (a coluna é numeric(5,2); assim
//   o que a pessoa vê depois de recarregar é o que foi conferido aqui).
// - Fora do Simples o campo fica escondido: ele nem vai no salvar, e o banco
//   guarda o que já tem. Mandar o valor da tela apagaria um número salvo por
//   outro computador no meio-tempo.
export function percentualTributosSimplesParaSalvar(
  regime: RegimeTributario | null,
  digitado: number | null,
): { campos: { percentual_tributos_simples?: number | null }; erro: string | null } {
  if (regime !== "simples_nacional") return { campos: {}, erro: null };
  const valor =
    digitado === null || !Number.isFinite(digitado) ? digitado : Math.round(digitado * 100) / 100;
  return { campos: { percentual_tributos_simples: valor }, erro: erroPercentualTributosSimples(valor) };
}
