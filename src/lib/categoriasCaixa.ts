import { supabase } from "./supabase";
import type { GrupoDre } from "@/schemas/gruposDre";
import type { CategoriaCaixa, NovaCategoriaCaixa } from "@/types/categoriaCaixa";

export async function listarCategoriasCaixa(): Promise<CategoriaCaixa[]> {
  const { data, error } = await supabase
    .from("categorias_caixa")
    .select("*")
    .order("nome", { ascending: true });

  if (error) throw error;
  return data as CategoriaCaixa[];
}

export async function criarCategoriaCaixa(
  categoria: NovaCategoriaCaixa,
): Promise<CategoriaCaixa> {
  const { data, error } = await supabase
    .from("categorias_caixa")
    .insert(categoria)
    .select()
    .single();

  if (error) throw error;
  return data as CategoriaCaixa;
}

/** Troca só o grupo do DRE da categoria. O banco recusa grupo que não serve pro tipo. */
export async function trocarGrupoCategoriaCaixa(id: string, grupo: GrupoDre): Promise<void> {
  const { error } = await supabase.from("categorias_caixa").update({ grupo }).eq("id", id);
  if (error) throw error;
}

export async function excluirCategoriaCaixa(id: string): Promise<void> {
  const { error } = await supabase.from("categorias_caixa").delete().eq("id", id);
  if (error) throw error;
}
