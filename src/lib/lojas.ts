import { criarDeposito } from "./depositos";
import { supabase } from "./supabase";
import type { Loja, NovaLoja } from "@/types/loja";

export async function listarLojas(): Promise<Loja[]> {
  const { data, error } = await supabase
    .from("lojas")
    .select("*")
    .order("nome", { ascending: true });

  if (error) throw error;
  return data as Loja[];
}

export async function listarLojasDoOperador(operadorId: string): Promise<Loja[]> {
  const { data, error } = await supabase
    .from("operador_lojas")
    .select("loja:lojas(*)")
    .eq("operador_id", operadorId);

  if (error) throw error;
  return (data ?? [])
    .map((linha) => linha.loja as unknown as Loja)
    .filter((loja): loja is Loja => Boolean(loja))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function criarLoja(
  nova: NovaLoja,
  operadorCriadorId: string,
): Promise<Loja> {
  const { data, error } = await supabase.from("lojas").insert(nova).select().single();
  if (error) throw error;

  const loja = data as Loja;

  // Sem isso, quem acabou de criar a loja ficaria sem acesso a ela (a RLS de
  // `lojas`/`operador_lojas` exige já ser admin de uma loja pra criar outra,
  // mas não dá acesso automático à loja nova).
  const { error: erroVinculo } = await supabase
    .from("operador_lojas")
    .insert({ operador_id: operadorCriadorId, loja_id: loja.id });
  if (erroVinculo) throw erroVinculo;

  // Sem isso, a loja nasceria sem nenhum depósito — e todo lançamento de
  // estoque dela (manual ou automático) precisa de um `deposito_id` válido.
  await criarDeposito({ loja_id: loja.id, nome: "Depósito Principal", ativo: true });

  return loja;
}

export async function atualizarStatusLoja(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from("lojas").update({ ativo }).eq("id", id);
  if (error) throw error;
}

// Exclusão de verdade (diferente do inativar acima). Só funciona se a loja
// estiver "vazia" — sem nenhum dado vinculado (estoque, caixa, OS, contas,
// funcionários...) — porque nenhuma dessas tabelas tem "on delete cascade"
// pra loja_id de propósito: perder dado de negócio de verdade sem querer
// seria muito pior que deixar uma loja "presa" como inativa. O próprio
// Postgres barra o delete nesse caso (violação de chave estrangeira);
// aqui só traduzimos isso pra uma mensagem que faça sentido pra usuária.
const ERRO_LOJA_COM_DADOS =
  "Não é possível excluir: essa loja ainda tem dados vinculados (estoque, caixa, ordens de serviço, funcionários...). Deixe-a inativa em vez de excluir.";

// As 4 tabelas de configuração viraram "1 linha por loja" na fundação
// multi-loja (migration 0033) — toda loja sempre tem uma linha em cada uma
// (backfill/criação automática), e nenhuma tem ON DELETE CASCADE pra
// loja_id. Diferente de estoque/caixa/OS (dado de negócio, que a gente
// quer que bloqueie a exclusão de propósito), essas são só configuração —
// sempre seguro apagar junto ao excluir a loja, nunca fica "presa" por
// causa delas.
const TABELAS_CONFIG_POR_LOJA = [
  "depositos",
  "configuracoes_garantia",
  "configuracoes_fiscais_loja",
  "configuracoes_painel_inicio",
  "configuracoes_juros_parcelas",
  // 0081 (#456): o Pix da loja também é só configuração.
  "configuracoes_pix",
  // 0082 (#459): o link de avaliação no Google também é só configuração.
  "configuracoes_avaliacao",
  // 0085 (#383): o contato da contabilidade também é só configuração.
  "configuracoes_contabilidade",
] as const;

export async function excluirLoja(id: string): Promise<void> {
  for (const tabela of TABELAS_CONFIG_POR_LOJA) {
    const { error } = await supabase.from(tabela).delete().eq("loja_id", id);
    if (error) {
      if (error.code === "23503") throw new Error(ERRO_LOJA_COM_DADOS);
      throw error;
    }
  }

  const { error } = await supabase.from("lojas").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") throw new Error(ERRO_LOJA_COM_DADOS);
    throw error;
  }
}

export async function atualizarLoja(
  id: string,
  patch: { nome: string; cidade: string | null; uf: string | null },
): Promise<void> {
  const { error } = await supabase.from("lojas").update(patch).eq("id", id);
  if (error) throw error;
}

export async function definirLojasDoOperador(
  operadorId: string,
  lojaIds: string[],
): Promise<void> {
  const { error: erroExclusao } = await supabase
    .from("operador_lojas")
    .delete()
    .eq("operador_id", operadorId);
  if (erroExclusao) throw erroExclusao;

  if (lojaIds.length === 0) return;

  const { error: erroInsercao } = await supabase
    .from("operador_lojas")
    .insert(lojaIds.map((lojaId) => ({ operador_id: operadorId, loja_id: lojaId })));
  if (erroInsercao) throw erroInsercao;
}
