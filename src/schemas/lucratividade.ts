import { diaLocal } from "@/lib/datas";
import { contaNosNumeros, custoUnitarioDoItem } from "./orcamento";
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
  /**
   * Algum item desta linha é peça avulsa sem custo informado (#655): o custo
   * dele entrou como zero, então `custo` e `margem` não valem — a tela mostra
   * `TEXTO_CUSTO_NAO_INFORMADO` no lugar.
   */
  custoNaoInformado: boolean;
}

export interface Lucratividade {
  /**
   * Uma linha por peça ou serviço do cadastro (com o nome do cadastro), e por
   * descrição na peça avulsa; a de maior margem primeiro.
   */
  linhas: LinhaLucro[];
  totalReceita: number;
  totalCusto: number;
  totalMargem: number;
  /** Alguma linha tem `custoNaoInformado`: o custo e a margem do total ficam por baixo. */
  algumCustoNaoInformado: boolean;
}

export function lucratividadePorItem({
  ordens,
  custoPeca,
  custoServico,
  nomePeca,
  nomeServico,
  de,
  ate,
}: {
  ordens: OrdemServico[];
  custoPeca: MapaCusto;
  custoServico: MapaCusto;
  /** id → nome no cadastro, pra linha de um item ligado ter o nome do cadastro (#744). */
  nomePeca?: Map<string, string>;
  nomeServico?: Map<string, string>;
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
      const custoUnitario = custoUnitarioDoItem(item, custoPeca, custoServico);
      const custo = item.quantidade * (custoUnitario ?? 0);

      // #744: o item ligado ao cadastro guarda o nome digitado no orçamento
      // ("Bico de valvula cromado"); a linha é a da peça do cadastro, senão a
      // mesma peça sai partida em duas. A peça avulsa segue pelo nome.
      const chave = item.peca_id
        ? `peca:${item.peca_id}`
        : item.servico_id
          ? `servico:${item.servico_id}`
          : `nome:${item.descricao}`;
      const nomeDoCadastro = item.peca_id
        ? nomePeca?.get(item.peca_id)
        : item.servico_id
          ? nomeServico?.get(item.servico_id)
          : undefined;
      const existente = mapa.get(chave) ?? {
        descricao: nomeDoCadastro ?? item.descricao,
        quantidade: 0,
        receita: 0,
        custo: 0,
        margem: 0,
        custoNaoInformado: false,
      };
      existente.quantidade += item.quantidade;
      existente.receita += receita;
      existente.custo += custo;
      existente.margem += receita - custo;
      if (custoUnitario === null) existente.custoNaoInformado = true;
      mapa.set(chave, existente);
    }
  }

  // Linha sem custo informado vai pro fim: a margem dela é inventada e não
  // pode aparecer como "a que mais rende".
  const linhas = [...mapa.values()].sort(
    (a, b) => Number(a.custoNaoInformado) - Number(b.custoNaoInformado) || b.margem - a.margem,
  );
  return {
    linhas,
    totalReceita: linhas.reduce((total, l) => total + l.receita, 0),
    totalCusto: linhas.reduce((total, l) => total + l.custo, 0),
    totalMargem: linhas.reduce((total, l) => total + l.margem, 0),
    algumCustoNaoInformado: linhas.some((l) => l.custoNaoInformado),
  };
}
