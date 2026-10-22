import { diaLocal, hojeLocal } from "@/lib/datas";
import type { StatusOS } from "@/types/os";

/**
 * Os dois status da etapa de orçamento da OS (#379). Um orçamento aberto
 * ("orcamento") ou recusado ("recusado") não é venda: não tem número de OS,
 * não baixa estoque e não entra em conta nenhuma.
 *
 * Exportado como lista pra servir também de filtro de consulta no Supabase:
 * `.not("status", "in", `(${STATUS_DE_ORCAMENTO.join(",")})`)`.
 */
export const STATUS_DE_ORCAMENTO = ["orcamento", "recusado"] as const satisfies readonly StatusOS[];

/** O filtro pronto pro `.not("status", "in", ...)` do Supabase. */
export const FILTRO_SEM_ORCAMENTO = `(${STATUS_DE_ORCAMENTO.join(",")})`;

export function ehOrcamento(ordem: { status: StatusOS }): boolean {
  return (STATUS_DE_ORCAMENTO as readonly StatusOS[]).includes(ordem.status);
}

/**
 * A REGRA ÚNICA: esta ordem entra nos números da loja (lucro, comissão,
 * ticket médio, caixa, relatórios, ficha do veículo, garantias, clientes
 * sumidos, lista de OS)? OS e venda de balcão sim; orçamento não.
 */
export function contaNosNumeros(ordem: { status: StatusOS }): boolean {
  return !ehOrcamento(ordem);
}

/**
 * Item lançado nesta ordem baixa estoque agora? Em orçamento não: a peça só
 * sai da prateleira quando o cliente aprova (`aprovarOrcamento`).
 */
export function baixaEstoqueAoLancarItem(status: StatusOS): boolean {
  return contaNosNumeros({ status });
}

/** Só orçamento aberto pode ser aprovado (recusado é o fim da linha). */
export function podeAprovar(ordem: { status: StatusOS }): boolean {
  return ordem.status === "orcamento";
}

/** Só orçamento aberto pode ser recusado. */
export function podeRecusar(ordem: { status: StatusOS }): boolean {
  return ordem.status === "orcamento";
}

/** O status que o orçamento ganha ao ser aprovado: vira OS de verdade. */
export const STATUS_AO_APROVAR = "em_andamento" as const satisfies StatusOS;

/**
 * Dá pra ir de `de` pra `para`?
 *   • orçamento → em andamento (aprovado) ou recusado;
 *   • recusado → nada (é o fim);
 *   • OS → nunca volta a orçamento (já tem número de OS, e o banco também
 *     proíbe: `ck_ordens_servico_numero_orcamento`);
 *   • entre os status de OS, nada muda nesta tarefa.
 */
export function transicaoPermitida(de: StatusOS, para: StatusOS): boolean {
  if (de === "orcamento") return para === STATUS_AO_APROVAR || para === "recusado";
  if (de === "recusado") return false;
  return contaNosNumeros({ status: para });
}

/** Quantos dias o orçamento vale, se ninguém mudar (pedido da tarefa #379). */
export const VALIDADE_PADRAO_DIAS = 7;

/**
 * A validade padrão de um orçamento feito `hoje` ("AAAA-MM-DD", dia local):
 * hoje + 7 dias. Monta o dia ao meio-dia LOCAL pra não escorregar um dia na
 * troca do horário de verão, e devolve pelo `diaLocal` — nunca por
 * `toISOString().slice`, que daria o dia de UTC.
 */
export function validadePadrao(hoje: string = hojeLocal()): string {
  const [ano, mes, dia] = hoje.split("-").map(Number);
  return diaLocal(new Date(ano, mes - 1, dia + VALIDADE_PADRAO_DIAS, 12));
}

/**
 * O orçamento passou da validade? Vale até o fim do dia da validade, então
 * só vence no dia seguinte. As duas datas são dia de calendário
 * ("AAAA-MM-DD"), e a comparação de texto já dá a ordem certa. Sem validade
 * gravada (banco anterior à migration 0065), nunca aparece vencido.
 */
export function orcamentoVencido(
  validade: string | null | undefined,
  hoje: string = hojeLocal(),
): boolean {
  return !!validade && hoje > validade;
}

/**
 * Por que o cliente não quis (opcional, um clique). Os valores são os mesmos
 * do check `motivo_recusa` da migration 0065.
 */
export const MOTIVOS_RECUSA = ["preco", "prazo", "outro_lugar", "desistiu", "outro"] as const;
export type MotivoRecusa = (typeof MOTIVOS_RECUSA)[number];

export const MOTIVO_RECUSA_LABEL: Record<MotivoRecusa, string> = {
  preco: "Preço",
  prazo: "Prazo",
  outro_lugar: "Foi em outro lugar",
  desistiu: "Desistiu",
  outro: "Outro",
};

/** O número ao lado de "Orçamentos" no menu: só os que esperam resposta. */
export function contarOrcamentosAbertos(ordens: readonly { status: StatusOS }[]): number {
  return ordens.filter((ordem) => ordem.status === "orcamento").length;
}

export function valoresMensagemOrcamento(_o: unknown, _loja: string): Record<string, string> {
  return {};
}
