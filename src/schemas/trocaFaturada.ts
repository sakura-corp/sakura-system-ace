/**
 * Trocar peça ou serviço de uma OS já faturada, com o total igual (#1145).
 *
 * As contas da janela "antes e depois". Quem decide de verdade é o banco
 * (`trocar_itens_os_faturada`, migration 0087): ele confere o total, o
 * gerente, a nota, o caixa do dia e o estoque de novo, com a OS travada. Aqui
 * é só pra a tela avisar antes, em português, sem a pessoa precisar errar.
 *
 * A conta do total é a mesma do faturar (`somarValoresLiquidos`, com a folga
 * de meio centavo da migration 0086): a OS foi faturada por ela.
 */

import { formatarMoeda } from "./dinheiro";
import { somarValoresLiquidos } from "./valorItem";
import type { TipoItemOS } from "@/types/os";

/** Um item da lista final. Com `id`: um que já existe e fica; sem: novo. */
export interface ItemDaTroca {
  id?: string;
  tipo: TipoItemOS;
  peca_id: string | null;
  servico_id: string | null;
  tecnico_id: string | null;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  custo_unitario?: number | null;
}

/**
 * O total da lista, ou `null` se algum número ainda não é número (campo
 * vazio ou digitado pela metade): a tela mostra "—" em vez de NaN.
 */
export function totalDaLista(itens: readonly ItemDaTroca[]): number | null {
  const total = somarValoresLiquidos(itens);
  return Number.isFinite(total) ? total : null;
}

/** O total novo é o faturado? (até meio centavo, como o banco). */
export function totalConfere(antes: readonly ItemDaTroca[], depois: readonly ItemDaTroca[]): boolean {
  return Math.abs(somarValoresLiquidos(antes) - somarValoresLiquidos(depois)) <= 0.005;
}

function mesmoItem(a: ItemDaTroca, b: ItemDaTroca): boolean {
  return (
    a.tipo === b.tipo &&
    (a.peca_id ?? null) === (b.peca_id ?? null) &&
    (a.servico_id ?? null) === (b.servico_id ?? null) &&
    (a.tecnico_id ?? null) === (b.tecnico_id ?? null) &&
    a.descricao.trim() === b.descricao.trim() &&
    a.quantidade === b.quantidade &&
    a.preco_unitario === b.preco_unitario &&
    a.desconto === b.desconto
  );
}

/**
 * O que sai e o que entra, pra janela de confirmar. Item que ficou igual não
 * aparece; item corrigido aparece nos dois (como era → como fica).
 */
export function resumoDaTroca(
  antes: readonly ItemDaTroca[],
  depois: readonly ItemDaTroca[],
): { saem: ItemDaTroca[]; entram: ItemDaTroca[] } {
  const depoisPorId = new Map(depois.filter((i) => i.id).map((i) => [i.id, i]));
  const antesPorId = new Map(antes.filter((i) => i.id).map((i) => [i.id, i]));
  const saem = antes.filter((a) => {
    const d = a.id ? depoisPorId.get(a.id) : undefined;
    return !d || !mesmoItem(a, d);
  });
  const entram = depois.filter((d) => {
    const a = d.id ? antesPorId.get(d.id) : undefined;
    return !a || !mesmoItem(a, d);
  });
  return { saem, entram };
}

/**
 * Por que a lista não pode ser confirmada (ou `null`). O total diferente
 * explica que mudar valor vem depois (decisão da Sofia, 20/11/2026).
 */
export function problemaDaTroca(
  antes: readonly ItemDaTroca[],
  depois: readonly ItemDaTroca[],
): string | null {
  if (depois.length === 0) return "A OS precisa continuar com pelo menos um item.";
  // Peça sem cadastro (avulsa, #655) que já estava na OS e continua avulsa
  // pode ficar; peça nova ou trocada precisa ser do cadastro (é ela que mexe
  // no estoque).
  const avulsasDeAntes = new Set(
    antes.filter((i) => i.tipo === "peca" && !i.peca_id && i.id).map((i) => i.id),
  );
  for (const item of depois) {
    if (item.tipo === "peca" && !item.peca_id && !(item.id && avulsasDeAntes.has(item.id))) {
      return "Escolha a peça do cadastro em cada linha de peça.";
    }
    if (!item.descricao.trim()) return "Cada item precisa de uma descrição.";
    if (!(item.quantidade > 0)) return "A quantidade de cada item precisa ser maior que zero.";
    if (item.preco_unitario < 0 || item.desconto < 0) return "Preço e desconto não podem ser negativos.";
    if (item.desconto > item.quantidade * item.preco_unitario) {
      return `O desconto de "${item.descricao}" é maior que o valor do item.`;
    }
  }
  const { saem, entram } = resumoDaTroca(antes, depois);
  if (saem.length === 0 && entram.length === 0) return "Nada mudou nos itens.";
  if (!totalConfere(antes, depois)) {
    return (
      `O total ficaria ${formatarMoeda(somarValoresLiquidos(depois))}, e a OS foi faturada por ` +
      `${formatarMoeda(somarValoresLiquidos(antes))}. Por enquanto, numa OS faturada só dá pra ` +
      `trocar peça ou serviço mantendo o mesmo total; mudar o valor vem numa próxima etapa.`
    );
  }
  return null;
}

/** Quanto cada peça do cadastro muda: positivo = sai mais do estoque. */
function diferencaPorPeca(
  antes: readonly ItemDaTroca[],
  depois: readonly ItemDaTroca[],
): Map<string, number> {
  const dif = new Map<string, number>();
  const somar = (itens: readonly ItemDaTroca[], sinal: number) => {
    for (const item of itens) {
      if (item.tipo !== "peca" || !item.peca_id) continue;
      dif.set(item.peca_id, (dif.get(item.peca_id) ?? 0) + sinal * item.quantidade);
    }
  };
  somar(depois, 1);
  somar(antes, -1);
  return dif;
}

export interface PecaNegativa {
  pecaId: string;
  descricao: string;
  saldoDepois: number;
}

/**
 * As peças que vão baixar e ficar com saldo negativo na loja. A peça que volta
 * pro estoque nunca é aviso.
 */
export function pecasQueFicamNegativas(
  antes: readonly ItemDaTroca[],
  depois: readonly ItemDaTroca[],
  saldoPorPeca: ReadonlyMap<string, number>,
  nomePorPeca: ReadonlyMap<string, string>,
): PecaNegativa[] {
  const resultado: PecaNegativa[] = [];
  for (const [pecaId, diferenca] of diferencaPorPeca(antes, depois)) {
    if (diferenca <= 0) continue;
    const saldoDepois = Math.round(((saldoPorPeca.get(pecaId) ?? 0) - diferenca) * 100) / 100;
    if (saldoDepois < 0) {
      resultado.push({ pecaId, descricao: nomePorPeca.get(pecaId) ?? "Peça", saldoDepois });
    }
  }
  return resultado;
}

/** Por que o botão "Trocar peça ou serviço" não aparece (ou `null`). */
export function motivoParaNaoTrocar(situacao: {
  faturada: boolean;
  gerente: boolean;
  temNota: boolean;
}): string | null {
  if (!situacao.faturada) return "Só OS faturada passa por esta troca.";
  if (!situacao.gerente) {
    return "Só quem é gerente (administrador da loja) pode trocar peça ou serviço de uma OS faturada.";
  }
  if (situacao.temNota) {
    return "Esta OS já tem nota fiscal emitida: não dá pra trocar peça ou serviço, porque a nota ficaria diferente da OS.";
  }
  return null;
}
