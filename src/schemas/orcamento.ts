import { diaBrasileiro, diaLocal, hojeLocal } from "@/lib/datas";
import { arredondarCentavo, formatarMoeda } from "./dinheiro";
import type { MapaCusto } from "./metricasCaixa";
import { totalOrdem } from "@/types/os";
import type { ItemOS, OrdemServico, StatusOS } from "@/types/os";

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

/**
 * Os valores dos marcadores do modelo de WhatsApp "orcamento" (texto da
 * tarefa #379, em `schemas/whatsapp.ts`). O total é o mesmo `totalOrdem` da
 * lista de OS; a validade sai como "29/10/2026", sem passar por `Date`.
 */
export function valoresMensagemOrcamento(
  ordem: Pick<OrdemServico, "numero" | "numero_orcamento" | "status" | "validade" | "cliente" | "veiculo"> & {
    itens?: readonly Pick<ItemOS, "quantidade" | "preco_unitario" | "desconto">[];
  },
  nomeLoja: string,
): Record<string, string> {
  const veiculo = [ordem.veiculo?.marca, ordem.veiculo?.modelo].filter(Boolean).join(" ");
  return {
    cliente: ordem.cliente?.nome ?? "",
    numero: String(ordem.numero_orcamento ?? ""),
    loja: nomeLoja,
    veiculo: veiculo || ordem.veiculo?.placa || "",
    valor: formatarMoeda(totalOrdem(ordem.itens ?? [])),
    validade: ordem.validade ? diaBrasileiro(ordem.validade) : "",
  };
}

// ---------------------------------------------------------------------------
// Peça digitada sem cadastro no orçamento (#655)
// ---------------------------------------------------------------------------

/**
 * Peça avulsa: digitada no orçamento sem escolher do cadastro (`peca_id`
 * nulo). Não mexe no estoque e não sai em NFC-e (não tem NCM) até ganhar um
 * cadastro. Só o orçamento cria; uma OS aprovada com "sem cadastro" mantém.
 */
export function ehPecaAvulsa(item: Pick<ItemOS, "tipo" | "peca_id">): boolean {
  return item.tipo === "peca" && !item.peca_id;
}

export function pecasAvulsas<T extends Pick<ItemOS, "tipo" | "peca_id">>(itens: readonly T[]): T[] {
  return itens.filter(ehPecaAvulsa);
}

/**
 * O que fazer com cada peça avulsa ao aprovar o orçamento:
 *   • "existente": é uma peça que já está no cadastro → o item passa a
 *     apontar pra ela e baixa estoque;
 *   • "cadastrar": a tela cadastrou a peça na hora (`pecaId` é o da nova) →
 *     idem;
 *   • "sem_cadastro": fica avulsa, sem estoque (e sem NFC-e até cadastrar).
 */
export type CaminhoAvulsa =
  | { caminho: "existente"; pecaId: string }
  | { caminho: "cadastrar"; pecaId: string }
  | { caminho: "sem_cadastro" };

/** O caminho está completo? "existente"/"cadastrar" só valem com a peça escolhida. */
function caminhoCompleto(escolha: CaminhoAvulsa | undefined): boolean {
  if (!escolha) return false;
  if (escolha.caminho === "sem_cadastro") return true;
  return escolha.pecaId.trim() !== "";
}

/**
 * As peças avulsas que ainda não têm caminho escolhido (`escolhas` é por
 * `item.id`). A aprovação só segue com a lista vazia.
 */
export function pendenciasDaAprovacao<T extends Pick<ItemOS, "id" | "tipo" | "peca_id">>(
  itens: readonly T[],
  escolhas: ReadonlyMap<string, CaminhoAvulsa>,
): T[] {
  return pecasAvulsas(itens).filter((item) => !caminhoCompleto(escolhas.get(item.id)));
}

/**
 * Os itens que ganham `peca_id` na aprovação ("existente" e "cadastrar"),
 * pra `aprovarOrcamento` gravar antes de baixar o estoque. "Sem cadastro"
 * não vincula, e escolha pra item que não é avulso é ignorada.
 */
export function vinculosDaAprovacao(
  itens: readonly Pick<ItemOS, "id" | "tipo" | "peca_id">[],
  escolhas: ReadonlyMap<string, CaminhoAvulsa>,
): { itemId: string; pecaId: string }[] {
  return pecasAvulsas(itens).flatMap((item) => {
    const escolha = escolhas.get(item.id);
    if (!escolha || escolha.caminho === "sem_cadastro" || !caminhoCompleto(escolha)) return [];
    return [{ itemId: item.id, pecaId: escolha.pecaId }];
  });
}

/**
 * Quanto custou pra loja uma unidade do item, ou `null` se ninguém informou:
 *   • peça do cadastro → custo do cadastro (0 se ele não tem, como sempre);
 *   • peça avulsa → o custo digitado no orçamento; sem ele, `null`;
 *   • serviço → custo do cadastro (0 se não tem), sem mudança.
 */
export function custoUnitarioDoItem(
  item: Pick<ItemOS, "tipo" | "peca_id" | "servico_id" | "custo_unitario">,
  custoPeca: MapaCusto,
  custoServico: MapaCusto,
): number | null {
  if (item.tipo === "servico") return custoServico.get(item.servico_id ?? "") ?? 0;
  if (ehPecaAvulsa(item)) return item.custo_unitario ?? null;
  return custoPeca.get(item.peca_id ?? "") ?? 0;
}

/** O que a tela mostra no lugar do lucro quando falta custo de peça avulsa. */
export const TEXTO_CUSTO_NAO_INFORMADO = "custo não informado";

/**
 * Lucro da ordem (venda − custo). Se algum item tem custo não informado
 * (peça avulsa sem custo), não há número: `custoNaoInformado` e a tela
 * mostra `TEXTO_CUSTO_NAO_INFORMADO`.
 */
export type LucroDaOrdem =
  | { lucro: number; custoNaoInformado: false }
  | { lucro: null; custoNaoInformado: true };

export function lucroDaOrdem(
  itens: readonly Pick<
    ItemOS,
    "tipo" | "peca_id" | "servico_id" | "custo_unitario" | "quantidade" | "preco_unitario" | "desconto"
  >[],
  custoPeca: MapaCusto,
  custoServico: MapaCusto,
): LucroDaOrdem {
  let custo = 0;
  for (const item of itens) {
    const unitario = custoUnitarioDoItem(item, custoPeca, custoServico);
    // Um custo faltando já basta: qualquer número aqui seria lucro inventado.
    if (unitario === null) return { lucro: null, custoNaoInformado: true };
    custo += item.quantidade * unitario;
  }
  return { lucro: arredondarCentavo(totalOrdem(itens) - custo), custoNaoInformado: false };
}
