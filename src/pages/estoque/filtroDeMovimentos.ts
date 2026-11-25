import { diaLocal } from "@/lib/datas";
import type { MovimentoEstoque, TipoMovimento } from "@/types/estoque";

/**
 * O filtro da lista de Movimentações (#1093; #1079, item 23): Tudo /
 * Entradas / Saídas, um período e um produto. O dia de cada movimento é o
 * do calendário de quem usa (`diaLocal`), nunca o de UTC: uma saída às 23h30
 * do dia 10 é do dia 10 (itens 34, 42 e 48 das lições).
 */
export type TipoDoFiltro = "tudo" | TipoMovimento;

export interface FiltroDeMovimentos {
  tipo: TipoDoFiltro;
  /** "AAAA-MM-DD" ou vazio (sem ponta). */
  de: string;
  ate: string;
  /** Vazio: todos os produtos. */
  pecaId: string;
}

export function filtrarMovimentos(
  movimentos: readonly MovimentoEstoque[],
  filtro: FiltroDeMovimentos,
): MovimentoEstoque[] {
  return movimentos.filter((m) => {
    if (filtro.tipo !== "tudo" && m.tipo !== filtro.tipo) return false;
    if (filtro.pecaId && m.peca_id !== filtro.pecaId) return false;
    if (filtro.de || filtro.ate) {
      const dia = diaLocal(m.criado_em);
      if (filtro.de && dia < filtro.de) return false;
      if (filtro.ate && dia > filtro.ate) return false;
    }
    return true;
  });
}

/** O nome do motivo do movimento, na lista e no perfil da peça. */
export const MOTIVO_DO_MOVIMENTO: Record<string, string> = {
  compra: "Compra",
  venda: "Venda",
  ajuste: "Ajuste manual",
  uso_em_os: "Uso em OS",
};
