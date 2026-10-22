import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import type { NovaPeca, Peca } from "@/types/peca";
import { lerResumo, type CampoJuntavel, type ResumoPecaJuntar } from "@/schemas/juntarPecas";

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

// "Juntar peças repetidas" (#656). Quem conta e quem junta é o banco, numa
// transação só; a prévia e as escolhas campo a campo estão em
// `schemas/juntarPecas.ts`. Só admin das lojas onde a peça aparece: quem
// confere é o banco (`lojas_sem_acesso` > 0 no resumo, ou erro ao juntar).

// O que a peça tem em cada loja e em quantas OS, compras, contagens e
// cotações ela aparece. Base da prévia antes de juntar.
export async function resumoPecaParaJuntar(id: string): Promise<ResumoPecaJuntar> {
  const { data, error } = await supabase.rpc("resumo_peca_para_juntar", { p_peca: id });
  if (error) throw error;
  return lerResumo(data);
}

// Junta a peça `saiId` na `ficaId`: tudo da que sai passa pra que fica, os
// campos listados em `campos` são copiados da que sai, e a que sai deixa de
// existir. `esperado` são os resumos que a prévia mostrou: se o banco já
// estiver diferente (alguém mexeu nas peças nesse meio-tempo), ele recusa em
// vez de juntar com números que a pessoa não viu. Devolve o resumo da peça
// que ficou.
export async function juntarPecas(
  ficaId: string,
  saiId: string,
  campos: CampoJuntavel[],
  esperado: { fica: ResumoPecaJuntar; sai: ResumoPecaJuntar },
): Promise<ResumoPecaJuntar> {
  const { data, error } = await supabase.rpc("juntar_pecas", {
    p_fica: ficaId,
    p_sai: saiId,
    p_campos_da_que_sai: campos,
    p_esperado: esperado,
  });
  if (error) throw error;
  return lerResumo(data);
}
