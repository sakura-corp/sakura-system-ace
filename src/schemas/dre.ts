import { diaLocal } from "@/lib/datas";
import { deCentavos, paraCentavos } from "./dinheiro";
import type { GrupoDre } from "./gruposDre";
import { lucratividadePorItem } from "./lucratividade";
import { ehAcertoDeCorrecao, type MapaCusto } from "./metricasCaixa";
import { contaNosNumeros } from "./orcamento";
import type { MovimentoCaixa } from "@/types/caixa";
import type { OrdemServico } from "@/types/os";

/**
 * O DRE do mês (#388): o resumo do dinheiro da loja, lido de cima pra baixo,
 * um mês por coluna. TODA conta do DRE mora aqui; a tela e o documento de
 * imprimir só mostram o que `montarDre` devolve.
 *
 * Nenhuma conta de venda, custo ou lucro é refeita aqui (`docs/licoes.md`,
 * item 49): a venda e o custo de cada mês vêm da `lucratividadePorItem` (a
 * mesma do "Vendido" e da "Sobra das OS" de Relações), então
 * `Receita bruta − Custo das peças e serviços` de um mês é a Sobra das OS de
 * Relações naquele mês.
 *
 * O mês de cada coisa:
 * - a venda (e o custo dela) entra no mês em que a OS foi ABERTA, como em
 *   todo o resto de Relações (orçamento e recusado fora, `contaNosNumeros`);
 * - a taxa da maquininha acompanha a venda dela (o mês da OS);
 * - o lançamento do Caixa (despesa, outra receita...) entra no mês do dia do
 *   lançamento (`diaLocal`), o dia em que o dinheiro saiu ou entrou.
 */

/** "AAAA-MM". */
export type MesDre = string;

/** A categoria do Caixa com o grupo dela (#386). */
export interface CategoriaDoDre {
  id: string;
  nome: string;
  grupo: GrupoDre;
}

/** A taxa gravada num recebimento em cartão (#387, `caixa_taxas_cartao`). */
export interface TaxaGravada {
  movimento_id: string;
  valor_taxa: number;
}

/** O pedaço do lançamento do Caixa que o DRE usa. */
export type MovimentoDoDre = Pick<
  MovimentoCaixa,
  "id" | "data" | "tipo" | "valor" | "ordem_servico_id" | "forma_pagamento" | "categoria_id" | "descricao"
>;

export interface EntradaDoDre {
  /** Os meses, do mais velho pro mais novo (uma coluna cada). */
  meses: readonly MesDre[];
  ordens: OrdemServico[];
  /** Todos os lançamentos da loja (o DRE recorta pelos meses). */
  movimentos: readonly MovimentoDoDre[];
  categorias: readonly CategoriaDoDre[];
  taxas: readonly TaxaGravada[];
  custoPeca: MapaCusto;
  custoServico: MapaCusto;
}

export interface ValorDoMesDre {
  /**
   * Nas linhas (+) e (−), o tamanho (positivo quando a coisa aconteceu no
   * sentido do rótulo); nas linhas (=), o resultado com sinal.
   */
  valor: number;
  /** % sobre a receita bruta da mesma coluna; `null` sem receita. */
  sobreReceita: number | null;
  /** % sobre o resultado bruto da mesma coluna; `null` se ele for zero ou negativo. */
  sobreResultadoBruto: number | null;
  /**
   * Só na linha da taxa da maquininha: houve venda no cartão nesta coluna e
   * NENHUMA tem taxa gravada. A tela mostra "não informadas" em vez de R$ 0,00.
   */
  naoInformado: boolean;
  /** Só na linha da taxa: parte das vendas no cartão desta coluna está sem taxa gravada. */
  parcial: boolean;
}

export interface LinhaDre {
  /** Única no DRE (ex.: "receita_bruta", "despesas_pessoal", "categoria:<id>"). */
  chave: string;
  rotulo: string;
  /** "+" soma, "-" subtrai, "=" é um resultado (negrito na tela). */
  sinal: "+" | "-" | "=";
  /** Uma por mês, na ordem de `meses`, e a última é o total do período. */
  colunas: ValorDoMesDre[];
  /** O detalhe que abre ao clicar (vazio = não abre). */
  filhas: LinhaDre[];
}

export interface ForaDoDre {
  quantidade: number;
  /** Soma dos valores (entrada e saída somam, é "dinheiro que ficou de fora"). */
  total: number;
}

export interface Dre {
  meses: MesDre[];
  /** As 11 linhas da issue, na ordem, cada uma com o seu detalhe. */
  linhas: LinhaDre[];
  /** Lançamentos sem categoria ou em categoria "A classificar": a faixa do topo. */
  semGrupo: ForaDoDre;
  /** Lançamentos em categoria "Fora do resultado" (não entram em linha nenhuma). */
  foraDoResultado: ForaDoDre;
  /**
   * Devoluções da correção de OS faturada (#1182, saída ligada a uma OS): não
   * são despesa; a venda da OS já está corrigida na receita.
   */
  devolucoesDeOs: ForaDoDre;
  /** Alguma peça avulsa sem custo: o custo fica por baixo e o resultado por cima. */
  algumCustoNaoInformado: boolean;
}

export const FRASE_DO_MES_DO_DRE =
  "A venda entra no mês em que a OS foi aberta (o mesmo jeito do resto de Relações); a despesa, no dia do lançamento no Caixa, o dia em que o dinheiro saiu.";

/** Os grupos em que a ENTRADA soma (nos outros, a saída soma e a entrada desconta). */
const GRUPOS_DE_ENTRADA: readonly GrupoDre[] = ["outras_receitas", "receitas_financeiras"];

const FORMAS_DE_CARTAO = ["cartao_debito", "cartao_credito"];

/** A linha ainda em centavos (uma posição por mês e a última é o total). */
interface Rascunho {
  chave: string;
  rotulo: string;
  sinal: "+" | "-" | "=";
  centavos: number[];
  filhas: Rascunho[];
  naoInformado?: boolean[];
  parcial?: boolean[];
}

/** O primeiro e o último dia do mês, "AAAA-MM-DD" (sem passar por UTC). */
function diasDoMes(mes: MesDre): { de: string; ate: string } {
  const [ano, m] = mes.split("-").map(Number);
  const ultimo = new Date(ano, m, 0).getDate();
  return { de: `${mes}-01`, ate: `${mes}-${String(ultimo).padStart(2, "0")}` };
}

function somarColunas(...listas: number[][]): number[] {
  return listas[0].map((_, i) => listas.reduce((soma, lista) => soma + lista[i], 0));
}

function menos(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}

export function montarDre(entrada: EntradaDoDre): Dre {
  const meses = [...entrada.meses];
  const total = meses.length;
  const indiceDoMes = new Map(meses.map((mes, i) => [mes, i]));
  const zeros = () => new Array<number>(total + 1).fill(0);
  /** Põe na última posição a soma dos meses. */
  const fecharTotal = (lista: number[]) => {
    lista[total] = lista.slice(0, total).reduce((soma, v) => soma + v, 0);
    return lista;
  };

  // 1. A venda e o custo de cada mês: a mesma conta do Vendido e da Sobra das OS.
  const receita = zeros();
  const receitaServicos = zeros();
  const custo = zeros();
  const custoServicos = zeros();
  let algumCustoNaoInformado = false;
  meses.forEach((mes, i) => {
    const { de, ate } = diasDoMes(mes);
    const lucro = lucratividadePorItem({
      ordens: entrada.ordens,
      custoPeca: entrada.custoPeca,
      custoServico: entrada.custoServico,
      de,
      ate,
    });
    const servicos = lucro.linhas.filter((l) => l.tipo === "servico");
    receita[i] = paraCentavos(lucro.totalReceita);
    receitaServicos[i] = paraCentavos(servicos.reduce((soma, l) => soma + l.receita, 0));
    custo[i] = paraCentavos(lucro.totalCusto);
    custoServicos[i] = paraCentavos(servicos.reduce((soma, l) => soma + l.custo, 0));
    if (lucro.algumCustoNaoInformado) algumCustoNaoInformado = true;
  });
  [receita, receitaServicos, custo, custoServicos].forEach(fecharTotal);
  // Produtos e peças pela diferença: assim os dois pedaços fecham no centavo com o total.
  const receitaProdutos = menos(receita, receitaServicos);
  const custoPecas = menos(custo, custoServicos);

  // 2. Os lançamentos do Caixa e as taxas.
  const categoriaPorId = new Map(entrada.categorias.map((c) => [c.id, c]));
  const ordemPorId = new Map(entrada.ordens.map((o) => [o.id, o]));
  const taxaPorMovimento = new Map<string, number>();
  for (const t of entrada.taxas) {
    taxaPorMovimento.set(t.movimento_id, (taxaPorMovimento.get(t.movimento_id) ?? 0) + paraCentavos(t.valor_taxa));
  }

  const porCategoria = new Map<string, number[]>();
  const taxa = zeros();
  const vendasNoCartao = zeros();
  const vendasComTaxa = zeros();
  const semGrupo = { quantidade: 0, centavos: 0 };
  const foraDoResultado = { quantidade: 0, centavos: 0 };
  const devolucoesDeOs = { quantidade: 0, centavos: 0 };

  for (const m of entrada.movimentos) {
    const centavos = paraCentavos(m.valor);

    if (m.ordem_servico_id) {
      if (m.tipo === "saida") {
        // A devolução da correção (#1182): a venda já está corrigida na receita.
        if (indiceDoMes.has(diaLocal(m.data).slice(0, 7))) {
          devolucoesDeOs.quantidade += 1;
          devolucoesDeOs.centavos += centavos;
        }
        continue;
      }
      // A entrada de OS não é receita aqui (a venda vem das OS); só a taxa dela,
      // que acompanha a venda no mês em que a OS foi aberta.
      const ordem = ordemPorId.get(m.ordem_servico_id);
      if (ordem && !contaNosNumeros(ordem)) continue;
      const i = indiceDoMes.get(diaLocal(ordem ? ordem.data_abertura : m.data).slice(0, 7));
      if (i === undefined) continue;
      const taxaDoMovimento = taxaPorMovimento.get(m.id);
      if (taxaDoMovimento !== undefined) taxa[i] += taxaDoMovimento;
      if (FORMAS_DE_CARTAO.includes(m.forma_pagamento ?? "") && !ehAcertoDeCorrecao(m)) {
        vendasNoCartao[i] += 1;
        if (taxaDoMovimento !== undefined) vendasComTaxa[i] += 1;
      }
      continue;
    }

    const i = indiceDoMes.get(diaLocal(m.data).slice(0, 7));
    if (i === undefined) continue;
    const categoria = m.categoria_id ? categoriaPorId.get(m.categoria_id) : undefined;
    if (!categoria || categoria.grupo === "a_classificar") {
      semGrupo.quantidade += 1;
      semGrupo.centavos += centavos;
      continue;
    }
    if (categoria.grupo === "fora_do_resultado") {
      foraDoResultado.quantidade += 1;
      foraDoResultado.centavos += centavos;
      continue;
    }
    const tipoQueSoma = GRUPOS_DE_ENTRADA.includes(categoria.grupo) ? "entrada" : "saida";
    const lista = porCategoria.get(categoria.id) ?? zeros();
    lista[i] += m.tipo === tipoQueSoma ? centavos : -centavos;
    porCategoria.set(categoria.id, lista);
  }
  [taxa, vendasNoCartao, vendasComTaxa, ...porCategoria.values()].forEach(fecharTotal);

  // 3. As linhas.
  const filhasDoGrupo = (grupo: GrupoDre): Rascunho[] =>
    entrada.categorias
      .filter((c) => c.grupo === grupo && porCategoria.has(c.id))
      .map((c): Rascunho => ({
        chave: `categoria:${c.id}`,
        rotulo: c.nome,
        sinal: GRUPOS_DE_ENTRADA.includes(grupo) ? "+" : "-",
        centavos: porCategoria.get(c.id) ?? zeros(),
        filhas: [],
      }))
      .sort((a, b) => b.centavos[total] - a.centavos[total] || a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  const somaDasFilhas = (filhas: Rascunho[]) =>
    filhas.length ? somarColunas(...filhas.map((f) => f.centavos)) : zeros();

  const linhaDoGrupo = (chave: string, rotulo: string, sinal: "+" | "-", grupo: GrupoDre): Rascunho => {
    const filhas = filhasDoGrupo(grupo);
    return { chave, rotulo, sinal, centavos: somaDasFilhas(filhas), filhas };
  };

  const linhaComFilhas = (chave: string, rotulo: string, sinal: "+" | "-", filhas: Rascunho[]): Rascunho => ({
    chave,
    rotulo,
    sinal,
    centavos: somaDasFilhas(filhas),
    filhas,
  });

  const simples = (chave: string, rotulo: string, sinal: "+" | "-" | "=", centavos: number[]): Rascunho => ({
    chave,
    rotulo,
    sinal,
    centavos,
    filhas: [],
  });

  const receitaBruta = linhaComFilhas("receita_bruta", "Receita bruta", "+", [
    simples("venda_produtos", "Venda de produtos", "+", receitaProdutos),
    simples("venda_servicos", "Venda de serviços", "+", receitaServicos),
  ]);

  const linhaDaTaxa: Rascunho = {
    ...simples("taxa_maquininha", "Taxa da maquininha", "-", taxa),
    naoInformado: vendasNoCartao.map((n, i) => n > 0 && vendasComTaxa[i] === 0),
    parcial: vendasNoCartao.map((n, i) => vendasComTaxa[i] > 0 && vendasComTaxa[i] < n),
  };
  const deducoes = linhaComFilhas("deducoes", "Deduções", "-", [linhaDaTaxa, ...filhasDoGrupo("deducoes_venda")]);
  const receitaLiquida = simples("receita_liquida", "Receita líquida", "=", menos(receitaBruta.centavos, deducoes.centavos));

  const custoVendido = linhaComFilhas("custo_vendido", "Custo do que foi vendido", "-", [
    simples("custo_pecas", "Custo das peças", "-", custoPecas),
    simples("custo_servicos", "Custo dos serviços", "-", custoServicos),
    ...filhasDoGrupo("custos"),
  ]);
  const resultadoBruto = simples("resultado_bruto", "Resultado bruto", "=", menos(receitaLiquida.centavos, custoVendido.centavos));

  const despesasOperacionais = linhaComFilhas("despesas_operacionais", "Despesas operacionais", "-", [
    linhaDoGrupo("despesas_pessoal", "Despesas com pessoal", "-", "despesas_pessoal"),
    linhaDoGrupo("despesas_administrativas", "Despesas administrativas", "-", "despesas_administrativas"),
    linhaDoGrupo("despesas_comerciais", "Despesas comerciais", "-", "despesas_comerciais"),
  ]);
  const lucroOperacional = simples(
    "lucro_operacional",
    "Lucro operacional",
    "=",
    menos(resultadoBruto.centavos, despesasOperacionais.centavos),
  );

  const outrasReceitas = linhaDoGrupo("outras_receitas", "Outras receitas", "+", "outras_receitas");
  const outrasDespesas = linhaDoGrupo("outras_despesas", "Outras despesas", "-", "outras_despesas");
  const antesDoFinanceiro = simples(
    "resultado_antes_financeiro",
    "Resultado antes do financeiro",
    "=",
    menos(somarColunas(lucroOperacional.centavos, outrasReceitas.centavos), outrasDespesas.centavos),
  );

  const receitasFinanceiras = linhaDoGrupo("receitas_financeiras", "Receitas financeiras", "+", "receitas_financeiras");
  const despesasFinanceiras = linhaDoGrupo("despesas_financeiras", "Despesas financeiras", "-", "despesas_financeiras");
  const resultadoDoMes = simples(
    "resultado_do_mes",
    "Resultado do mês",
    "=",
    menos(somarColunas(antesDoFinanceiro.centavos, receitasFinanceiras.centavos), despesasFinanceiras.centavos),
  );

  const rascunhos = [
    receitaBruta,
    deducoes,
    receitaLiquida,
    custoVendido,
    resultadoBruto,
    despesasOperacionais,
    lucroOperacional,
    outrasReceitas,
    outrasDespesas,
    antesDoFinanceiro,
    receitasFinanceiras,
    despesasFinanceiras,
    resultadoDoMes,
  ];

  // 4. Os percentuais e a volta pra reais.
  const percentual = (valor: number, base: number) => (base > 0 ? (valor / base) * 100 : null);
  const finalizar = (r: Rascunho): LinhaDre => ({
    chave: r.chave,
    rotulo: r.rotulo,
    sinal: r.sinal,
    colunas: r.centavos.map((c, i) => ({
      valor: deCentavos(c),
      sobreReceita: percentual(c, receita[i]),
      sobreResultadoBruto: percentual(c, resultadoBruto.centavos[i]),
      naoInformado: r.naoInformado?.[i] ?? false,
      parcial: r.parcial?.[i] ?? false,
    })),
    filhas: r.filhas.map(finalizar),
  });

  const fora = (f: { quantidade: number; centavos: number }): ForaDoDre => ({
    quantidade: f.quantidade,
    total: deCentavos(f.centavos),
  });

  return {
    meses,
    linhas: rascunhos.map(finalizar),
    semGrupo: fora(semGrupo),
    foraDoResultado: fora(foraDoResultado),
    devolucoesDeOs: fora(devolucoesDeOs),
    algumCustoNaoInformado,
  };
}

/** Os `n` meses que terminam no mês de `hoje` ("AAAA-MM-DD"), do mais velho pro mais novo. */
export function ultimosMeses(hoje: string, n: number): MesDre[] {
  const fim = numeroDoMes(hoje.slice(0, 7));
  const meses: MesDre[] = [];
  for (let k = fim - n + 1; k <= fim; k++) meses.push(mesDoNumero(k));
  return meses;
}

/** Os meses de `de` até `ate` ("AAAA-MM"), inclusive; vazio se `de` > `ate`. No máximo `MAXIMO_DE_MESES`. */
export function mesesEntre(de: MesDre, ate: MesDre): MesDre[] {
  const fim = numeroDoMes(ate);
  const inicio = Math.max(numeroDoMes(de), fim - MAXIMO_DE_MESES + 1);
  const meses: MesDre[] = [];
  for (let k = inicio; k <= fim; k++) meses.push(mesDoNumero(k));
  return meses;
}

export const MESES_PADRAO = 6;
export const MAXIMO_DE_MESES = 24;

/** "2026-11" → "nov/26". */
export function rotuloDoMes(mes: MesDre): string {
  const [ano, m] = mes.split("-").map(Number);
  return `${NOMES_DOS_MESES[m - 1]}/${String(ano % 100).padStart(2, "0")}`;
}

const NOMES_DOS_MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "AAAA-MM" → um número que cresce de 1 em 1 a cada mês (sem passar por Date). */
function numeroDoMes(mes: MesDre): number {
  const [ano, m] = mes.split("-").map(Number);
  return ano * 12 + (m - 1);
}

function mesDoNumero(numero: number): MesDre {
  const ano = Math.floor(numero / 12);
  return `${ano}-${String((numero % 12) + 1).padStart(2, "0")}`;
}
