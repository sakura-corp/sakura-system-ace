import { supabase } from "./supabase";
import type { FechamentoCaixa, NovoFechamentoCaixa } from "@/types/fechamentoCaixa";

/** Os fechamentos mais recentes da loja, do mais novo pro mais velho. */
/** Quantos fechamentos a lista traz (os mais novos). Mais antigos ficam de fora. */
export const LIMITE_DE_FECHAMENTOS = 60;

export async function listarFechamentosCaixa(lojaId: string, limite = LIMITE_DE_FECHAMENTOS): Promise<FechamentoCaixa[]> {
  const { data, error } = await supabase
    .from("fechamentos_caixa")
    .select("*, operador:operadores(nome)")
    .eq("loja_id", lojaId)
    .order("data", { ascending: false })
    .limit(limite);

  if (error) throw error;
  return (data ?? []).map((f) => ({
    ...f,
    // numeric chega como texto em algumas versões do PostgREST; a tela faz
    // conta com isso, então vira número aqui, num lugar só.
    fundo_troco: Number(f.fundo_troco),
    saldo_sistema: Number(f.saldo_sistema),
    valor_contado: Number(f.valor_contado),
    diferenca: Number(f.diferenca),
  })) as FechamentoCaixa[];
}

/**
 * Fecha o caixa do dia. Uma chamada só ao banco (`fechar_caixa`, migration
 * 0058), porque o registro do fechamento e o lançamento da diferença precisam
 * entrar juntos ou não entrar: feito em dois pedidos, uma falha no meio
 * deixaria uma "quebra de caixa" lançada sem fechamento nenhum.
 */
export async function fecharCaixa(novo: NovoFechamentoCaixa): Promise<string> {
  const { data, error } = await supabase.rpc("fechar_caixa", {
    p_loja_id: novo.lojaId,
    p_data: novo.data,
    p_fundo_troco: novo.fundoTroco,
    p_esperado: novo.esperado,
    p_contado: novo.contado,
    p_totais: novo.totais,
    p_observacao: novo.observacao,
    p_momento: novo.momento,
  });
  if (error) throw error;
  return data as string;
}

/** Desfaz um fechamento e apaga o lançamento da diferença. Só admin da loja. */
export async function desfazerFechamentoCaixa(fechamentoId: string): Promise<void> {
  const { error } = await supabase.rpc("desfazer_fechamento_caixa", {
    p_fechamento_id: fechamentoId,
  });
  if (error) throw error;
}
