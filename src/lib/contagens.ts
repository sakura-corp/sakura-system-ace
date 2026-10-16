import { criarMovimento } from "./estoque";
import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import type { ContagemEstoque } from "@/types/contagem";

export async function listarContagens(lojaId: string): Promise<ContagemEstoque[]> {
  // Por páginas: o Supabase corta em 1.000 linhas. `id` desempata a ordem.
  const data = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("contagens_estoque")
      .select("*")
      .eq("loja_id", lojaId)
      .order("criado_em", { ascending: false })
      .order("id", { ascending: true })
      .range(de, ate),
  );
  return data as ContagemEstoque[];
}

export async function registrarContagem(
  pecaId: string,
  depositoId: string,
  quantidadeContada: number,
  saldoSistema: number,
  observacao: string | null,
  operadorId: string | null,
  lojaId: string,
): Promise<void> {
  const diferenca = quantidadeContada - saldoSistema;

  const { error } = await supabase.from("contagens_estoque").insert({
    peca_id: pecaId,
    deposito_id: depositoId,
    quantidade_contada: quantidadeContada,
    saldo_sistema: saldoSistema,
    diferenca,
    observacao,
    operador_id: operadorId,
    loja_id: lojaId,
  });
  if (error) throw error;

  if (diferenca !== 0) {
    await criarMovimento(
      {
        peca_id: pecaId,
        deposito_id: depositoId,
        tipo: diferenca > 0 ? "entrada" : "saida",
        quantidade: Math.abs(diferenca),
        motivo: "ajuste",
        referencia: "Ajuste por contagem de estoque",
      },
      lojaId,
    );
  }
}
