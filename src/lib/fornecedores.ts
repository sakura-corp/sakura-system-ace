import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import type { Fornecedor, NovoFornecedor } from "@/types/fornecedor";

export async function listarFornecedores(): Promise<Fornecedor[]> {
  // Por páginas: o Supabase corta em 1.000 linhas. `id` desempata a ordem.
  const data = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("fornecedores")
      .select("*")
      .order("nome", { ascending: true })
      .order("id", { ascending: true })
      .range(de, ate),
  );
  return data as Fornecedor[];
}

export async function criarFornecedor(fornecedor: NovoFornecedor): Promise<Fornecedor> {
  const { data, error } = await supabase
    .from("fornecedores")
    .insert(fornecedor)
    .select()
    .single();

  if (error) throw error;
  return data as Fornecedor;
}

export async function atualizarFornecedor(
  id: string,
  patch: Partial<NovoFornecedor>,
): Promise<void> {
  const { error } = await supabase.from("fornecedores").update(patch).eq("id", id);
  if (error) throw error;
}

export async function atualizarStatusFornecedor(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from("fornecedores").update({ ativo }).eq("id", id);
  if (error) throw error;
}

export async function excluirFornecedor(id: string): Promise<void> {
  const { error } = await supabase.from("fornecedores").delete().eq("id", id);
  if (error) throw error;
}
