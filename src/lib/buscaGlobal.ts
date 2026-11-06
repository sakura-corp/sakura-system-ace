import { supabase } from "./supabase";
import type { ResultadoBusca } from "@/schemas/buscaGlobal";

/** Quantos resultados, no máximo, de cada tipo (placa, cliente, OS, peça, fornecedor). */
export const LIMITE_POR_TIPO = 5;

/**
 * A busca geral do `Ctrl+K` (#372): uma ida só ao banco, pela função
 * `buscar_global` (migration 0077), que procura placa, cliente, OS, peça e
 * fornecedor de uma vez e já deixa de fora o tipo cujo módulo a pessoa não
 * tem. A OS é só da loja aberta.
 *
 * `sinal` cancela a busca anterior quando a pessoa continua digitando: sem
 * ele, uma resposta atrasada de "ab" poderia chegar depois da de "abc1d23" e
 * tomar o lugar dela.
 */
export async function buscarGlobal(
  termo: string,
  lojaId: string,
  sinal?: AbortSignal,
): Promise<ResultadoBusca[]> {
  let consulta = supabase.rpc("buscar_global", {
    p_termo: termo,
    p_loja_id: lojaId,
    p_limite: LIMITE_POR_TIPO,
  });
  if (sinal) consulta = consulta.abortSignal(sinal);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as ResultadoBusca[];
}
