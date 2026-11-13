import { diaLocal } from "@/lib/datas";
import { contaNosNumeros, custoUnitarioDoItem } from "./orcamento";
import type { MapaCusto } from "./metricasCaixa";
import { valorLiquidoDoItem } from "./valorItem";
import { ehConsumidor } from "@/types/cliente";
import type { ItemOS, OrdemServico, TipoItemOS } from "@/types/os";

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
  /**
   * Peça ou serviço (#390, pra curva ABC separar as duas listas). Vem do
   * primeiro item da linha; não muda conta nenhuma.
   */
  tipo: TipoItemOS;
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

/** As OS que entram nos números do período: dia de abertura no fuso local, orçamento fora. */
function ordensDoPeriodo(ordens: OrdemServico[], de: string, ate: string): OrdemServico[] {
  return ordens.filter((ordem) => {
    if (!contaNosNumeros(ordem)) return false;
    const dia = diaLocal(ordem.data_abertura);
    return dia >= de && dia <= ate;
  });
}

/**
 * Quanto um item vende e custa. É o pedaço que a Lucratividade por item e a
 * por cliente (#390) usam — a mesma conta, num lugar só.
 */
function contaDoItem(
  item: ItemOS,
  custoPeca: MapaCusto,
  custoServico: MapaCusto,
): { receita: number; custo: number; custoNaoInformado: boolean } {
  const receita = valorLiquidoDoItem(item);
  const custoUnitario = custoUnitarioDoItem(item, custoPeca, custoServico);
  const custo = item.quantidade * (custoUnitario ?? 0);
  return { receita, custo, custoNaoInformado: custoUnitario === null };
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

  for (const ordem of ordensDoPeriodo(ordens, de, ate)) {
    for (const item of ordem.itens ?? []) {
      const { receita, custo, custoNaoInformado } = contaDoItem(item, custoPeca, custoServico);

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
        tipo: item.tipo,
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
      if (custoNaoInformado) existente.custoNaoInformado = true;
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

export interface LinhaLucroCliente {
  clienteId: string;
  /** O nome vem da `clientes_janela` (aparece mesmo sem o módulo Clientes). */
  nome: string;
  receita: number;
  custo: number;
  margem: number;
  /** Mesmo sentido da `LinhaLucro`: algum item sem custo informado. */
  custoNaoInformado: boolean;
}

export interface LucratividadePorCliente {
  /** Um por cliente de verdade, o de maior venda primeiro. */
  linhas: LinhaLucroCliente[];
  /**
   * A venda de balcão sem cliente escolhido (o Consumidor), à parte: não é
   * um cliente de verdade e tomaria o lugar de quem a loja quer enxergar
   * (#390, pergunta 3). `null` quando não houve.
   */
  consumidor: LinhaLucroCliente | null;
  /** Com o Consumidor: bate com o `totalReceita` da `lucratividadePorItem`. */
  totalReceita: number;
}

export const NOME_CLIENTE_SEM_NOME = "Cliente sem nome";

/**
 * #390: a mesma conta da `lucratividadePorItem` (mesmas OS, mesmo período,
 * mesmo valor e custo de cada item), agrupada pelo cliente da OS.
 */
export function lucratividadePorCliente({
  ordens,
  custoPeca,
  custoServico,
  de,
  ate,
}: {
  ordens: OrdemServico[];
  custoPeca: MapaCusto;
  custoServico: MapaCusto;
  de: string;
  ate: string;
}): LucratividadePorCliente {
  const mapa = new Map<string, LinhaLucroCliente>();

  for (const ordem of ordensDoPeriodo(ordens, de, ate)) {
    // OS sem item não vendeu nada: não cria um cliente com R$ 0 na lista.
    if (!ordem.itens?.length) continue;
    const existente = mapa.get(ordem.cliente_id) ?? {
      clienteId: ordem.cliente_id,
      nome: ordem.cliente?.nome || NOME_CLIENTE_SEM_NOME,
      receita: 0,
      custo: 0,
      margem: 0,
      custoNaoInformado: false,
    };
    for (const item of ordem.itens ?? []) {
      const { receita, custo, custoNaoInformado } = contaDoItem(item, custoPeca, custoServico);
      existente.receita += receita;
      existente.custo += custo;
      existente.margem += receita - custo;
      if (custoNaoInformado) existente.custoNaoInformado = true;
    }
    mapa.set(ordem.cliente_id, existente);
  }

  const todas = [...mapa.values()];
  const consumidor = todas.find((l) => ehConsumidor(l.clienteId)) ?? null;
  const linhas = todas
    .filter((l) => !ehConsumidor(l.clienteId))
    .sort((a, b) => b.receita - a.receita || a.nome.localeCompare(b.nome, "pt-BR"));
  return {
    linhas,
    consumidor,
    totalReceita: todas.reduce((total, l) => total + l.receita, 0),
  };
}
