import { buscarDepositoPadraoId } from "./depositos";
import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import type { MovimentoEstoque, NovoMovimentoEstoque } from "@/types/estoque";

export async function listarMovimentos(lojaId: string): Promise<MovimentoEstoque[]> {
  // Por páginas: o Supabase corta em 1.000 linhas. `id` desempata a ordem.
  const data = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("estoque_movimentos")
      .select("*")
      .eq("loja_id", lojaId)
      .order("criado_em", { ascending: false })
      .order("id", { ascending: true })
      .range(de, ate),
  );
  return data as MovimentoEstoque[];
}

// `deposito_id` é opcional aqui: quem deixa o operador escolher (formulário
// de movimentação manual, contagem) sempre passa o valor escolhido; quem
// gera a movimentação sozinho por trás de outra ação (baixa em OS, entrada
// de Pedido de Compra, importação de nota) pode omitir e cai no depósito
// padrão da loja — ver buscarDepositoPadraoId().
export async function criarMovimento(
  movimento: Omit<NovoMovimentoEstoque, "deposito_id"> & { deposito_id?: string },
  lojaId: string,
): Promise<MovimentoEstoque> {
  const depositoId = movimento.deposito_id ?? (await buscarDepositoPadraoId(lojaId));

  const { data, error } = await supabase
    .from("estoque_movimentos")
    .insert({ ...movimento, deposito_id: depositoId, loja_id: lojaId })
    .select()
    .single();

  if (error) throw error;
  return data as MovimentoEstoque;
}

// Saldo por peça pela view `estoque_saldos` (migration 0073): funciona pra
// quem não tem o módulo Estoque e não baixa a lista inteira de movimentos.
// Mesma conta de `calcularSaldoPorPeca`, feita pelo banco.
export async function listarSaldos(lojaId: string): Promise<Map<string, number>> {
  const data = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("estoque_saldos")
      .select("peca_id, saldo")
      .eq("loja_id", lojaId)
      .order("peca_id", { ascending: true })
      .range(de, ate),
  );
  const saldos = new Map<string, number>();
  for (const linha of data as { peca_id: string; saldo: number }[]) {
    saldos.set(linha.peca_id, Number(linha.saldo));
  }
  return saldos;
}

// Igual a `criarMovimento`, mas SEM `.select()`: quem dá baixa em OS ou recebe
// compra sem ter o módulo Estoque pode gravar o movimento, mas não lê-lo de
// volta (o `returning` exige permissão de leitura). #366.
export async function registrarMovimento(
  movimento: Omit<NovoMovimentoEstoque, "deposito_id"> & { deposito_id?: string },
  lojaId: string,
): Promise<void> {
  const depositoId = movimento.deposito_id ?? (await buscarDepositoPadraoId(lojaId));
  const { error } = await supabase
    .from("estoque_movimentos")
    .insert({ ...movimento, deposito_id: depositoId, loja_id: lojaId });
  if (error) throw error;
}

export function calcularSaldoPorPeca(
  movimentos: MovimentoEstoque[],
): Map<string, number> {
  const saldos = new Map<string, number>();
  for (const movimento of movimentos) {
    const atual = saldos.get(movimento.peca_id) ?? 0;
    const delta =
      movimento.tipo === "entrada" ? movimento.quantidade : -movimento.quantidade;
    saldos.set(movimento.peca_id, atual + delta);
  }
  return saldos;
}

// Saldo por peça, quebrado por depósito (peça → depósito → saldo). Usado só
// onde faz diferença saber "onde" fisicamente está o saldo (Contagem) — o
// resto do app continua olhando pro saldo total da loja (calcularSaldoPorPeca).
export function calcularSaldoPorPecaEDeposito(
  movimentos: MovimentoEstoque[],
): Map<string, Map<string, number>> {
  const saldos = new Map<string, Map<string, number>>();
  for (const movimento of movimentos) {
    const porDeposito = saldos.get(movimento.peca_id) ?? new Map<string, number>();
    const atual = porDeposito.get(movimento.deposito_id) ?? 0;
    const delta =
      movimento.tipo === "entrada" ? movimento.quantidade : -movimento.quantidade;
    porDeposito.set(movimento.deposito_id, atual + delta);
    saldos.set(movimento.peca_id, porDeposito);
  }
  return saldos;
}
