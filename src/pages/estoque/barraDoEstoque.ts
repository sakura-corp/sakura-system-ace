import { lerSaldo, precisaComprar } from "@/schemas/estoque";
import { formatarQuantidade } from "@/schemas/quantidade";
import type { MovimentoEstoque } from "@/types/estoque";

/**
 * A barra do estoque contra o mínimo (visual da leva 8, #1093): o que a
 * lista de Produtos e o perfil da peça mostram no lugar do "7 / mín. 10"
 * solto.
 *
 * Só LÊ o saldo: quem diz se está abaixo do mínimo e se precisa comprar é o
 * `lerSaldo`/`precisaComprar` de `schemas/estoque.ts`, os mesmos da OS e da
 * Sugestão de compra. Aqui só se acrescenta o "perto" (amarelo), que é
 * aparência, e o quanto a barra enche. A conta do estoque não muda (a issue
 * proíbe).
 *
 * - **falta** (vermelho): no mínimo ou abaixo dele. A palavra diz quanto
 *   falta ("falta 3"), ou "no mínimo" quando bateu nele (o mínimo é o ponto
 *   de comprar, não o de acabar).
 * - **perto** (amarelo): acima do mínimo, mas até 1,5 vez ele.
 * - **ok** (verde): folgado.
 * - **negativo** (vermelho): erro de lançamento; o lugar de resolver é a
 *   Contagem, não a compra (por isso não "precisa comprar").
 * - **sem_minimo**: a peça não tem mínimo; sem barra e sem alarme.
 * - **sem_estoque** (amarelo): zerada e sem mínimo.
 */
export type TomDaBarra = "falta" | "perto" | "ok" | "negativo" | "sem_minimo" | "sem_estoque";

export interface LeituraDaBarra {
  tom: TomDaBarra;
  /** A palavra ao lado do número (a cor nunca avisa sozinha, WCAG 1.4.1). */
  palavra: string;
  /** De 0 a 1: quanto a barra enche. O mínimo fica na metade. `null`: sem barra. */
  preenchido: number | null;
  /** Mostra o "Comprar" na linha. */
  precisaComprar: boolean;
}

/** Até quantas vezes o mínimo o saldo ainda é "perto" (amarelo). */
export const FOLGA_DO_PERTO = 1.5;

export function lerBarraDoEstoque(saldo: number, estoqueMinimo: number | null | undefined): LeituraDaBarra {
  const comprar = precisaComprar(saldo, estoqueMinimo);
  const { situacao, faltam } = lerSaldo(saldo, estoqueMinimo);

  if (situacao === "negativo") {
    // Sem mínimo, sem barra: o risquinho do mínimo no meio mentiria.
    return { tom: "negativo", palavra: "negativo", preenchido: estoqueMinimo == null ? null : 0, precisaComprar: false };
  }
  if (estoqueMinimo == null) {
    return saldo === 0
      ? { tom: "sem_estoque", palavra: "sem estoque", preenchido: null, precisaComprar: false }
      : { tom: "sem_minimo", palavra: "sem mínimo", preenchido: null, precisaComprar: false };
  }

  // O mínimo fica na metade da barra; com mínimo zero, qualquer saldo enche.
  const preenchido = estoqueMinimo > 0 ? Math.min(1, Math.max(0, saldo / (2 * estoqueMinimo))) : saldo > 0 ? 1 : 0;

  if (comprar) {
    const quanto = faltam ?? 0;
    return {
      tom: "falta",
      palavra: quanto > 0 ? `falta ${formatarQuantidade(quanto)}` : "no mínimo",
      preenchido,
      precisaComprar: true,
    };
  }
  if (saldo <= estoqueMinimo * FOLGA_DO_PERTO) {
    return { tom: "perto", palavra: "perto do mínimo", preenchido, precisaComprar: false };
  }
  return { tom: "ok", palavra: "ok", preenchido, precisaComprar: false };
}

/**
 * A saída mais nova de cada peça (o `criado_em` do movimento), pra coluna
 * "última saída" da lista e o número de apoio do perfil. Só `saida`: a
 * entrada não diz se a peça vende.
 */
export function ultimaSaidaPorPeca(movimentos: readonly MovimentoEstoque[]): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const m of movimentos) {
    if (m.tipo !== "saida") continue;
    const atual = mapa.get(m.peca_id);
    if (atual === undefined || Date.parse(m.criado_em) > Date.parse(atual)) mapa.set(m.peca_id, m.criado_em);
  }
  return mapa;
}
