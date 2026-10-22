import { diaLocal } from "@/lib/datas";
import { contaNosNumeros } from "./orcamento";
import type { MapaCusto } from "./metricasCaixa";
import type { OrdemServico } from "@/types/os";

/**
 * Relações → Lucratividade: receita, custo e margem por peça/serviço, no
 * período. Morava dentro da tela (`LucratividadeSection.tsx`, dívida anotada
 * em `arquitetura.test.ts`) e veio pra cá com a tarefa #379, que pediu que
 * orçamento não entrasse nesta conta.
 *
 * O resto ficou como era na tela: a ordem entra pelo dia de ABERTURA (no
 * fuso local) e em qualquer status de OS — não só faturada.
 */

export interface LinhaLucro {
  descricao: string;
  quantidade: number;
  receita: number;
  custo: number;
  margem: number;
}

export interface Lucratividade {
  /** Uma linha por descrição de item, a de maior margem primeiro. */
  linhas: LinhaLucro[];
  totalReceita: number;
  totalCusto: number;
  totalMargem: number;
}

export function lucratividadePorItem({
  ordens,
  custoPeca,
  custoServico,
  de,
  ate,
}: {
  ordens: OrdemServico[];
  custoPeca: MapaCusto;
  custoServico: MapaCusto;
  /** Dia de calendário "AAAA-MM-DD", inclusive. */
  de: string;
  ate: string;
}): Lucratividade {
  const mapa = new Map<string, LinhaLucro>();

  for (const ordem of ordens) {
    if (!contaNosNumeros(ordem)) continue;
    const dia = diaLocal(ordem.data_abertura);
    if (dia < de || dia > ate) continue;

    for (const item of ordem.itens ?? []) {
      const receita = item.quantidade * item.preco_unitario - item.desconto;
      const custoUnitario =
        item.tipo === "peca"
          ? custoPeca.get(item.peca_id ?? "") ?? 0
          : custoServico.get(item.servico_id ?? "") ?? 0;
      const custo = item.quantidade * custoUnitario;

      const existente = mapa.get(item.descricao) ?? {
        descricao: item.descricao,
        quantidade: 0,
        receita: 0,
        custo: 0,
        margem: 0,
      };
      existente.quantidade += item.quantidade;
      existente.receita += receita;
      existente.custo += custo;
      existente.margem += receita - custo;
      mapa.set(item.descricao, existente);
    }
  }

  const linhas = [...mapa.values()].sort((a, b) => b.margem - a.margem);
  return {
    linhas,
    totalReceita: linhas.reduce((total, l) => total + l.receita, 0),
    totalCusto: linhas.reduce((total, l) => total + l.custo, 0),
    totalMargem: linhas.reduce((total, l) => total + l.margem, 0),
  };
}
