import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import type { NovaPeca, Peca } from "@/types/peca";

export async function listarPecas(): Promise<Peca[]> {
  // Por páginas: o Supabase corta em 1.000 linhas. `id` desempata a ordem.
  const data = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("pecas")
      .select("*")
      .order("descricao", { ascending: true })
      .order("id", { ascending: true })
      .range(de, ate),
  );
  return data as Peca[];
}

export async function buscarPecasPorIds(ids: string[]): Promise<Peca[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("pecas").select("*").in("id", ids);
  if (error) throw error;
  return data as Peca[];
}

export async function criarPeca(peca: NovaPeca): Promise<Peca> {
  const { data, error } = await supabase
    .from("pecas")
    .insert(peca)
    .select()
    .single();

  if (error) throw error;
  return data as Peca;
}

export async function atualizarPeca(id: string, peca: NovaPeca): Promise<Peca> {
  const { data, error } = await supabase
    .from("pecas")
    .update(peca)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Peca;
}

export async function excluirPeca(id: string): Promise<void> {
  const { error } = await supabase.from("pecas").delete().eq("id", id);
  if (error) throw error;
}

export async function atualizarStatusPeca(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from("pecas").update({ ativo }).eq("id", id);
  if (error) throw error;
}
