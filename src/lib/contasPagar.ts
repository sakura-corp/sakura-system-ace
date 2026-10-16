import { criarMovimentoCaixa, excluirMovimentoCaixa } from "./caixa";
import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import type { ContaPagar, NovaContaPagar } from "@/types/contaPagar";

const SELECT_CONTA = "*, categoria:categorias_caixa(nome)";

export async function listarContasPagar(lojaId: string): Promise<ContaPagar[]> {
  // Por páginas: o Supabase corta em 1.000 linhas. `id` desempata a ordem.
  const data = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("contas_pagar")
      .select(SELECT_CONTA)
      .eq("loja_id", lojaId)
      .order("vencimento", { ascending: true })
      .order("id", { ascending: true })
      .range(de, ate),
  );
  return data as unknown as ContaPagar[];
}

export async function criarContaPagar(
  conta: NovaContaPagar,
  lojaId: string,
): Promise<void> {
  const { error } = await supabase
    .from("contas_pagar")
    .insert({ ...conta, loja_id: lojaId });
  if (error) throw error;
}

export async function excluirContaPagar(id: string): Promise<void> {
  const { error } = await supabase.from("contas_pagar").delete().eq("id", id);
  if (error) throw error;
}

/**
 * O mesmo dia do mês que vem — segurando o dia no último dia do mês quando
 * ele não existe lá.
 *
 * O jeito direto (`new Date(ano, mes, dia)`, contando com o mês 1-based
 * virar o mês seguinte no construtor 0-based) tem uma armadilha: o
 * JavaScript "transborda" data inválida em vez de recusar. Uma conta que
 * vence **31/01** virava `31 de fevereiro`, que o JavaScript converte pra
 * **03/03** — ou seja, a conta pulava fevereiro inteiro e ainda mudava de
 * dia pra sempre (a ocorrência seguinte já nascia dia 3). Acontecia com
 * todo vencimento em 29, 30 ou 31, que é justamente onde caem aluguel e
 * financiamento.
 */
export function proximoVencimento(vencimentoIso: string): string {
  const [ano, mes, dia] = vencimentoIso.split("-").map(Number);
  // `mes` vem 1-based do texto; como o construtor conta a partir do zero,
  // passar `mes` direto já aponta pro mês seguinte.
  const ultimoDiaDoProximoMes = new Date(ano, mes + 1, 0).getDate();
  const proxima = new Date(ano, mes, Math.min(dia, ultimoDiaDoProximoMes));
  return `${proxima.getFullYear()}-${String(proxima.getMonth() + 1).padStart(2, "0")}-${String(
    proxima.getDate(),
  ).padStart(2, "0")}`;
}

interface PagarContaParams {
  conta: ContaPagar;
  valorPago: number;
  formaPagamento: string;
  operadorId: string;
}

// Marca a conta como paga, lança a Saída correspondente no Caixa (mesmo
// padrão do faturamento de OS gerando Entrada) e, se a conta for
// recorrente, já cria a próxima ocorrência (vencimento um mês depois) — a
// menos que o próximo vencimento já passe de `recorrente_ate` (opcional).
export async function pagarConta({
  conta,
  valorPago,
  formaPagamento,
  operadorId,
}: PagarContaParams): Promise<void> {
  const movimentoId = await criarMovimentoCaixa(
    {
      ordem_servico_id: null,
      tipo: "saida",
      forma_pagamento: formaPagamento || null,
      valor: valorPago,
      descricao: conta.descricao,
      categoria_id: conta.categoria_id,
    },
    conta.loja_id,
  );

  const { error: erroConta } = await supabase
    .from("contas_pagar")
    .update({
      status: "paga",
      data_pagamento: new Date().toISOString(),
      caixa_movimento_id: movimentoId,
      operador_id: operadorId,
    })
    .eq("id", conta.id);
  if (erroConta) throw erroConta;

  const proxima = conta.recorrente ? proximoVencimento(conta.vencimento) : null;
  const passouDoFim = conta.recorrente_ate !== null && proxima !== null && proxima > conta.recorrente_ate;

  if (proxima && !passouDoFim) {
    const { error: erroProxima } = await supabase.from("contas_pagar").insert({
      descricao: conta.descricao,
      valor: conta.valor,
      vencimento: proxima,
      categoria_id: conta.categoria_id,
      recorrente: true,
      recorrente_ate: conta.recorrente_ate,
      loja_id: conta.loja_id,
    });
    if (erroProxima) throw erroProxima;
  }
}

// Reverte um pagamento feito por engano: volta a conta pra pendente e
// remove a Saída que tinha sido lançada automaticamente no Caixa.
//
// A ORDEM importa (migration 0062): o lançamento é apagado ANTES de a conta
// ser desligada dele. Quem só tem Contas a Pagar enxerga (e pode apagar) no
// Caixa apenas o lançamento que está ligado a uma conta — desligando
// primeiro, o `delete` seguinte apagaria zero linhas e a saída ficaria órfã
// no Caixa. A chave estrangeira é `on delete set null`, então apagar o
// lançamento já desliga a conta sozinho.
export async function desfazerPagamento(conta: ContaPagar): Promise<void> {
  if (conta.caixa_movimento_id) {
    await excluirMovimentoCaixa(conta.caixa_movimento_id);
  }

  const { error } = await supabase
    .from("contas_pagar")
    .update({
      status: "pendente",
      data_pagamento: null,
      caixa_movimento_id: null,
      operador_id: null,
    })
    .eq("id", conta.id);
  if (error) throw error;
}
