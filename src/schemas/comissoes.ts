import { custoDosItens, type MapaCusto } from "./metricasCaixa";
import { arredondarCentavo as arredondar } from "./dinheiro";
import { contaNosNumeros, custoUnitarioDoItem } from "./orcamento";
import { temNumeroDeOS } from "@/types/os";
import type { ItemOS, OrdemNumerada, OrdemServico, TipoOrdem } from "@/types/os";

/**
 * Comissão por funcionário, pra tela Relações → Comissões.
 *
 * Regras decididas com a usuária (02/09/2026):
 *
 * 1. Os dois papéis contam, separados: o **vendedor** da OS leva pelo que
 *    atendeu (a OS inteira) e o **técnico** leva só pelos itens que executou.
 *    Um mesmo funcionário pode aparecer nos dois — são somas diferentes, não
 *    contagem dupla do mesmo dinheiro.
 * 2. A base é o **lucro** (venda − custo), não o valor vendido, aplicando a
 *    porcentagem de `funcionarios.comissao`.
 * 3. Só conta OS **faturada**, pela data do faturamento — com a parte ainda
 *    não recebida (OS faturada como "a receber depois") destacada à parte,
 *    pra não pagar comissão de cliente que ainda não pagou sem perceber.
 *
 * O custo vem das mesmas funções usadas pelo Caixa, Início e Relações
 * (`metricasCaixa.ts`) de propósito: conta de dinheiro repetida em cada tela
 * sempre diverge — ver PROJETO_STATUS.md, seção 6, item 40.
 */

/** Chave usada pra quem vendeu/executou sem estar identificado na OS. */
export const SEM_FUNCIONARIO = "sem-funcionario";

export interface OrdemDaComissao {
  ordemId: string;
  numero: number;
  /** Só pra o rótulo ("Venda 17"); ausente = OS. */
  tipo?: TipoOrdem;
  data: string;
  cliente: string;
  vendido: number;
  custo: number;
  lucro: number;
  comissao: number;
  /** OS faturada como "a receber depois" e ainda não recebida. */
  aReceber: boolean;
  /** Itens que entraram com custo zero — ver `itensSemCusto` abaixo. */
  itensSemCusto: number;
}

export interface ResumoPapel {
  vendido: number;
  custo: number;
  lucro: number;
  comissao: number;
  /** Parte da comissão que veio de OS ainda não recebida. */
  comissaoAReceber: number;
  /**
   * Itens que entraram com custo zero (peça/serviço sem custo cadastrado,
   * serviço avulso, ou peça avulsa sem custo digitado — #655). O lucro deles é o preço cheio, então a comissão sai
   * maior que a real — a tela avisa quando isso acontece.
   */
  itensSemCusto: number;
  ordens: OrdemDaComissao[];
}

export interface ComissaoFuncionario {
  funcionarioId: string;
  nome: string;
  /** `null` = funcionário sem porcentagem cadastrada (comissão fica em zero). */
  percentual: number | null;
  comoVendedor: ResumoPapel;
  comoTecnico: ResumoPapel;
  comissaoTotal: number;
  /**
   * Vendido e lucro sem contar a mesma OS duas vezes. Quem vendeu E executou
   * a mesma OS aparece nos dois papéis, mas o dinheiro é um só: a OS entra
   * pelo papel de vendedor (que cobre a OS inteira) e só é somada de novo
   * como técnico quando ele executou item de uma OS que **outra** pessoa
   * vendeu. Já `comissaoTotal` soma os dois de propósito — ali são
   * pagamentos diferentes, mesmo quando caem pra mesma pessoa.
   */
  vendidoTotal: number;
  lucroTotal: number;
}

export interface EntradaComissoes {
  ordens: OrdemServico[];
  funcionarios: { id: string; nome: string; comissao: number | null }[];
  custoPeca: MapaCusto;
  custoServico: MapaCusto;
  /** Ids de OS com conta a receber ainda pendente. */
  ordensAReceber: Set<string>;
  de: string;
  ate: string;
}

// A data vem do banco em UTC — pegar o "dia" com `.slice(0, 10)` pegaria o dia
// em UTC, e no Brasil (UTC-3) uma OS faturada depois das ~21h viraria "amanhã"
// e sumiria do filtro. Ver PROJETO_STATUS.md, seção 6, item 34.
export function diaLocal(dataIso: string): string {
  return new Date(dataIso).toLocaleDateString("sv-SE");
}

function valorDosItens(itens: ItemOS[]): number {
  return itens.reduce(
    (total, item) => total + item.quantidade * item.preco_unitario - item.desconto,
    0,
  );
}

function contarItensSemCusto(
  itens: ItemOS[],
  custoPeca: MapaCusto,
  custoServico: MapaCusto,
): number {
  // Peça avulsa (#655) usa o custo digitado; sem ele (`null`), conta aqui
  // como sem custo, igual peça cadastrada sem custo.
  return itens.filter((item) => {
    const unitario = custoUnitarioDoItem(item, custoPeca, custoServico);
    return unitario === null || unitario === 0;
  }).length;
}

function papelVazio(): ResumoPapel {
  return {
    vendido: 0,
    custo: 0,
    lucro: 0,
    comissao: 0,
    comissaoAReceber: 0,
    itensSemCusto: 0,
    ordens: [],
  };
}

/**
 * Só OS faturada, com a data do faturamento dentro do período. Orçamento
 * (#379) nunca entra: nem é faturado, nem tem número de OS — as duas
 * checagens de cima repetem isso de propósito, pela regra única
 * `contaNosNumeros`.
 */
export function ordensDoPeriodo(
  ordens: OrdemServico[],
  de: string,
  ate: string,
): OrdemNumerada[] {
  return ordens.filter((ordem): ordem is OrdemNumerada => {
    if (!contaNosNumeros(ordem) || !temNumeroDeOS(ordem)) return false;
    if (ordem.status !== "faturada") return false;
    // `data_fechamento` é gravada no faturamento (ver lib/ordensServico.ts).
    // O fallback pra `data_abertura` cobre OS antiga que ficou sem ela.
    const dia = diaLocal(ordem.data_fechamento ?? ordem.data_abertura);
    return dia >= de && dia <= ate;
  });
}

export function resumirComissoes({
  ordens,
  funcionarios,
  custoPeca,
  custoServico,
  ordensAReceber,
  de,
  ate,
}: EntradaComissoes): ComissaoFuncionario[] {
  const percentuais = new Map(funcionarios.map((f) => [f.id, f.comissao]));
  const nomes = new Map(funcionarios.map((f) => [f.id, f.nome]));
  const linhas = new Map<string, ComissaoFuncionario>();

  function linhaDe(funcionarioId: string): ComissaoFuncionario {
    const existente = linhas.get(funcionarioId);
    if (existente) return existente;

    const nova: ComissaoFuncionario = {
      funcionarioId,
      nome:
        funcionarioId === SEM_FUNCIONARIO
          ? "Sem funcionário definido"
          : nomes.get(funcionarioId) ?? "Funcionário removido",
      percentual: funcionarioId === SEM_FUNCIONARIO ? null : percentuais.get(funcionarioId) ?? null,
      comoVendedor: papelVazio(),
      comoTecnico: papelVazio(),
      comissaoTotal: 0,
      vendidoTotal: 0,
      lucroTotal: 0,
    };
    linhas.set(funcionarioId, nova);
    return nova;
  }

  // Por funcionário, quais OS já entraram no total sem repetir (ver
  // `vendidoTotal`/`lucroTotal` em ComissaoFuncionario).
  const ordensJaSomadas = new Map<string, Set<string>>();

  function somar(
    linha: ComissaoFuncionario,
    papel: ResumoPapel,
    ordem: OrdemNumerada,
    itens: ItemOS[],
  ): void {
    const percentual = linha.percentual;
    const vendido = valorDosItens(itens);
    const custo = custoDosItens(itens, custoPeca, custoServico);
    const lucro = vendido - custo;
    const comissao = arredondar(lucro * ((percentual ?? 0) / 100));
    const aReceber = ordensAReceber.has(ordem.id);
    const itensSemCusto = contarItensSemCusto(itens, custoPeca, custoServico);

    papel.vendido += vendido;
    papel.custo += custo;
    papel.lucro += lucro;
    papel.comissao += comissao;
    if (aReceber) papel.comissaoAReceber += comissao;
    papel.itensSemCusto += itensSemCusto;
    const jaSomadas = ordensJaSomadas.get(linha.funcionarioId) ?? new Set<string>();
    if (!jaSomadas.has(ordem.id)) {
      jaSomadas.add(ordem.id);
      ordensJaSomadas.set(linha.funcionarioId, jaSomadas);
      linha.vendidoTotal += vendido;
      linha.lucroTotal += lucro;
    }

    papel.ordens.push({
      ordemId: ordem.id,
      numero: ordem.numero,
      ...(ordem.tipo ? { tipo: ordem.tipo } : {}),
      data: ordem.data_fechamento ?? ordem.data_abertura,
      cliente: ordem.cliente?.nome ?? "—",
      vendido,
      custo,
      lucro,
      comissao,
      aReceber,
      itensSemCusto,
    });
  }

  for (const ordem of ordensDoPeriodo(ordens, de, ate)) {
    const itens = ordem.itens ?? [];
    if (itens.length === 0) continue;

    // Vendedor: leva pela OS inteira que atendeu.
    const idVendedor = ordem.vendedor_id ?? SEM_FUNCIONARIO;
    const linhaVendedor = linhaDe(idVendedor);
    somar(linhaVendedor, linhaVendedor.comoVendedor, ordem, itens);

    // Técnico: leva só pelos itens que executou, então a OS é dividida por
    // técnico antes de somar (uma OS pode ter itens de gente diferente).
    const itensPorTecnico = new Map<string, ItemOS[]>();
    for (const item of itens) {
      const idTecnico = item.tecnico_id ?? SEM_FUNCIONARIO;
      const grupo = itensPorTecnico.get(idTecnico) ?? [];
      grupo.push(item);
      itensPorTecnico.set(idTecnico, grupo);
    }
    for (const [idTecnico, itensDele] of itensPorTecnico) {
      const linhaTecnico = linhaDe(idTecnico);
      somar(linhaTecnico, linhaTecnico.comoTecnico, ordem, itensDele);
    }
  }

  for (const linha of linhas.values()) {
    linha.comissaoTotal = arredondar(linha.comoVendedor.comissao + linha.comoTecnico.comissao);
  }

  return [...linhas.values()].sort((a, b) => {
    // A linha "sem funcionário definido" fica sempre por último: é um aviso
    // de cadastro faltando, não um funcionário concorrendo com os outros.
    if (a.funcionarioId === SEM_FUNCIONARIO) return 1;
    if (b.funcionarioId === SEM_FUNCIONARIO) return -1;
    return b.comissaoTotal - a.comissaoTotal;
  });
}

export interface TotaisComissoes {
  lucro: number;
  comissao: number;
  comissaoAReceber: number;
  itensSemCusto: number;
}

/**
 * Totais do período. O lucro é contado **uma vez por OS** (o do vendedor, que
 * cobre a OS inteira) — somar também o dos técnicos contaria o mesmo lucro
 * duas vezes. Já a comissão soma os dois papéis de propósito: é dinheiro
 * diferente, saindo pra pessoas diferentes.
 */
export function totaisComissoes(linhas: ComissaoFuncionario[]): TotaisComissoes {
  return linhas.reduce<TotaisComissoes>(
    (totais, linha) => ({
      lucro: totais.lucro + linha.comoVendedor.lucro,
      comissao: arredondar(totais.comissao + linha.comissaoTotal),
      comissaoAReceber: arredondar(
        totais.comissaoAReceber +
          linha.comoVendedor.comissaoAReceber +
          linha.comoTecnico.comissaoAReceber,
      ),
      itensSemCusto: totais.itensSemCusto + linha.comoVendedor.itensSemCusto,
    }),
    { lucro: 0, comissao: 0, comissaoAReceber: 0, itensSemCusto: 0 },
  );
}
