import { diaLocal } from "@/lib/datas";
import { arredondarCentavo, deCentavos, paraCentavos } from "./dinheiro";
import type { FluxoProjetado } from "./fluxoProjetado";
import { lucratividadePorItem } from "./lucratividade";
import type { MapaCusto } from "./metricasCaixa";
import { contaNosNumeros } from "./orcamento";
import { valorLiquidoDoItem, type ItemComValor } from "./valorItem";
import type { MovimentoCaixa } from "@/types/caixa";
import type { OrdemServico } from "@/types/os";

/**
 * As contas de Relações numa página só (#1086).
 *
 * O dicionário da página (uma palavra = uma conta, sempre a mesma):
 * - **Vendido**: o que as OS abertas no período venderam (o `totalReceita`
 *   da `lucratividadePorItem`).
 * - **Recebido**: as entradas do caixa no período.
 * - **Falta receber**: das OS do período, o que ainda não entrou no caixa.
 * - **Sobra das OS**: Vendido − custo das peças e serviços (o `totalMargem`).
 * - **Despesas**: as saídas do caixa no período.
 * - **Sobrou**: Sobra das OS − Despesas.
 *
 * Nenhuma conta antiga foi refeita aqui: a Sobra vem da Lucratividade e o
 * saldo vem do Fluxo projetado. Este arquivo só junta, recorta por período e
 * monta as frases. Dia de calendário é sempre texto "AAAA-MM-DD" no fuso de
 * quem usa (`diaLocal`), nunca `toISOString().slice`.
 */

/** Dia de calendário "AAAA-MM-DD", de e até inclusive. */
export interface PeriodoRelacoes {
  de: string;
  ate: string;
}

export type AtalhoDoPeriodo = "hoje" | "semana" | "mes" | "mes_passado" | "ano";

/** Na ordem do mais curto pro mais longo: no empate, o mais curto ganha. */
export const ATALHOS_DO_PERIODO: readonly AtalhoDoPeriodo[] = ["hoje", "semana", "mes", "mes_passado", "ano"];

/** O pedaço do lançamento do caixa que estas contas usam. */
export type MovimentoDasRelacoes = Pick<MovimentoCaixa, "data" | "tipo" | "valor" | "ordem_servico_id"> & {
  descricao?: string | null;
  categoria?: { nome: string } | null;
};

/** O pedaço da OS que as contas por dia e por mês usam. */
export type OrdemDasRelacoes = Pick<OrdemServico, "id" | "status" | "data_abertura"> & {
  itens?: readonly ItemComValor[];
};

// ---------------------------------------------------------------------------
// Dias de calendário, sem passar por UTC

function partes(dia: string): [number, number, number] {
  const [ano, mes, d] = dia.split("-").map(Number);
  return [ano, mes, d];
}

function montarDia(ano: number, mes: number, dia: number): string {
  return diaLocal(new Date(ano, mes - 1, dia));
}

function somarDias(dia: string, n: number): string {
  const [ano, mes, d] = partes(dia);
  return montarDia(ano, mes, d + n);
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

function dois(n: number): string {
  return String(n).padStart(2, "0");
}

/** "AAAA-MM-DD" → "DD/MM". */
function diaEMes(dia: string): string {
  const [, mes, d] = partes(dia);
  return `${dois(d)}/${dois(mes)}`;
}

function noPeriodo(dia: string, periodo: PeriodoRelacoes): boolean {
  return dia >= periodo.de && dia <= periodo.ate;
}

// ---------------------------------------------------------------------------
// 1. Os atalhos do período

/** O período de cada atalho, com `hoje` = `hojeLocal()`. A semana começa na segunda. */
export function periodoDoAtalho(atalho: AtalhoDoPeriodo, hoje: string): PeriodoRelacoes {
  const [ano, mes, dia] = partes(hoje);
  switch (atalho) {
    case "hoje":
      return { de: hoje, ate: hoje };
    case "semana": {
      const desdeSegunda = (new Date(ano, mes - 1, dia).getDay() + 6) % 7;
      return { de: somarDias(hoje, -desdeSegunda), ate: hoje };
    }
    case "mes":
      return { de: montarDia(ano, mes, 1), ate: hoje };
    case "mes_passado":
      return { de: montarDia(ano, mes - 1, 1), ate: montarDia(ano, mes, 0) };
    case "ano":
      return { de: montarDia(ano, 1, 1), ate: hoje };
  }
}

/** O atalho que dá exatamente este período (o mais curto, no empate), ou `null`. */
export function atalhoDoPeriodo(periodo: PeriodoRelacoes, hoje: string): AtalhoDoPeriodo | null {
  for (const atalho of ATALHOS_DO_PERIODO) {
    const p = periodoDoAtalho(atalho, hoje);
    if (p.de === periodo.de && p.ate === periodo.ate) return atalho;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2. O período é um mês?

/**
 * `{ ano, mes }` (mês de 1 a 12) quando o período é um mês: o mês inteiro, ou
 * o mês corrente do dia 1 até hoje. Senão `null`.
 */
export function mesDoPeriodo(periodo: PeriodoRelacoes, hoje: string): { ano: number; mes: number } | null {
  const [ano, mes, diaDe] = partes(periodo.de);
  const [anoAte, mesAte, diaAte] = partes(periodo.ate);
  if (diaDe !== 1 || ano !== anoAte || mes !== mesAte) return null;
  if (diaAte === ultimoDiaDoMes(ano, mes)) return { ano, mes };
  const [anoHoje, mesHoje] = partes(hoje);
  if (ano === anoHoje && mes === mesHoje && periodo.ate === hoje) return { ano, mes };
  return null;
}

/**
 * Com o que comparar um mês. No mês corrente (até hoje), do dia 1 até o mesmo
 * dia do mês anterior, segurado no último dia dele (31/03 → 28/02, como a
 * `mesmaJanelaNoMesAnterior` do Início). Num mês passado inteiro, o mês
 * anterior inteiro. Período que não é mês: `null`.
 */
export function periodoComparavelNoMesAnterior(periodo: PeriodoRelacoes, hoje: string): PeriodoRelacoes | null {
  const mesRef = mesDoPeriodo(periodo, hoje);
  if (!mesRef) return null;
  const { ano, mes } = mesRef;
  const ultimoDoAnterior = ultimoDiaDoMes(ano, mes - 1);
  const de = montarDia(ano, mes - 1, 1);
  if (periodo.ate === hoje) {
    const dia = Math.min(partes(hoje)[2], ultimoDoAnterior);
    return { de, ate: montarDia(ano, mes - 1, dia) };
  }
  return { de, ate: montarDia(ano, mes - 1, ultimoDoAnterior) };
}

// ---------------------------------------------------------------------------
// 3 e 4. O dicionário

/** O que a OS vendeu: a soma dos itens com desconto (a mesma conta da Lucratividade). */
export function vendidoDaOrdem(ordem: { itens?: readonly ItemComValor[] }): number {
  return deCentavos(
    paraCentavos((ordem.itens ?? []).reduce((soma, item) => soma + valorLiquidoDoItem(item), 0)),
  );
}

function ordensDoPeriodo<O extends OrdemDasRelacoes>(ordens: readonly O[], periodo: PeriodoRelacoes): O[] {
  return ordens.filter((o) => contaNosNumeros(o) && noPeriodo(diaLocal(o.data_abertura), periodo));
}

function centavosDe(movimentos: readonly MovimentoDasRelacoes[], tipo: MovimentoDasRelacoes["tipo"], periodo: PeriodoRelacoes): number {
  return movimentos
    .filter((m) => m.tipo === tipo && noPeriodo(diaLocal(m.data), periodo))
    .reduce((soma, m) => soma + paraCentavos(m.valor), 0);
}

export interface ResumoDoPeriodo {
  vendido: number;
  /** Custo das peças e serviços vendidos (= Vendido − Sobra das OS, no centavo). */
  custo: number;
  sobraDasOS: number;
  /** Alguma peça avulsa sem custo: o custo fica por baixo e a sobra por cima. */
  algumCustoNaoInformado: boolean;
  recebido: number;
  faltaReceber: number;
  despesas: number;
  sobrou: number;
}

export function resumoDoPeriodo({
  ordens,
  movimentos,
  custoPeca,
  custoServico,
  nomePeca,
  nomeServico,
  periodo,
}: {
  ordens: OrdemServico[];
  /**
   * Os lançamentos do caixa. Pro Falta receber valer, precisa ter as entradas
   * das OS do período mesmo quando caíram fora dele (o sinal pago antes).
   */
  movimentos: readonly MovimentoDasRelacoes[];
  custoPeca: MapaCusto;
  custoServico: MapaCusto;
  nomePeca?: Map<string, string>;
  nomeServico?: Map<string, string>;
  periodo: PeriodoRelacoes;
}): ResumoDoPeriodo {
  const lucro = lucratividadePorItem({
    ordens,
    custoPeca,
    custoServico,
    nomePeca,
    nomeServico,
    de: periodo.de,
    ate: periodo.ate,
  });
  const vendidoC = paraCentavos(lucro.totalReceita);
  const sobraC = paraCentavos(lucro.totalMargem);

  const recebidoPorOrdem = new Map<string, number>();
  for (const m of movimentos) {
    if (m.tipo !== "entrada" || !m.ordem_servico_id) continue;
    recebidoPorOrdem.set(m.ordem_servico_id, (recebidoPorOrdem.get(m.ordem_servico_id) ?? 0) + paraCentavos(m.valor));
  }
  const faltaC = ordensDoPeriodo(ordens, periodo).reduce(
    (soma, o) => soma + Math.max(0, paraCentavos(vendidoDaOrdem(o)) - (recebidoPorOrdem.get(o.id) ?? 0)),
    0,
  );

  const despesasC = centavosDe(movimentos, "saida", periodo);
  return {
    vendido: deCentavos(vendidoC),
    custo: deCentavos(vendidoC - sobraC),
    sobraDasOS: deCentavos(sobraC),
    algumCustoNaoInformado: lucro.algumCustoNaoInformado,
    recebido: deCentavos(centavosDe(movimentos, "entrada", periodo)),
    faltaReceber: deCentavos(faltaC),
    despesas: deCentavos(despesasC),
    sobrou: deCentavos(sobraC - despesasC),
  };
}

// ---------------------------------------------------------------------------
// 5 e 6. As despesas por tipo e a ponte do Vendido ao Sobrou

export const SEM_TIPO = "Sem tipo";
export const OUTRAS = "Outras";

export interface DespesaPorTipo {
  tipo: string;
  valor: number;
}

/**
 * As saídas do período agrupadas pelo tipo (a categoria do lançamento), do
 * maior pro menor (empate pelo nome). Passando de `maximo` tipos, os menores
 * viram uma linha "Outras" no fim. A soma bate com as Despesas no centavo.
 */
export function despesasPorTipo(
  movimentos: readonly MovimentoDasRelacoes[],
  periodo: PeriodoRelacoes,
  maximo = 4,
): DespesaPorTipo[] {
  const porTipo = new Map<string, number>();
  for (const m of movimentos) {
    if (m.tipo !== "saida" || !noPeriodo(diaLocal(m.data), periodo)) continue;
    const tipo = m.categoria?.nome || SEM_TIPO;
    porTipo.set(tipo, (porTipo.get(tipo) ?? 0) + paraCentavos(m.valor));
  }
  const linhas = [...porTipo.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
  const mostradas = linhas.slice(0, maximo).map(([tipo, c]) => ({ tipo, valor: deCentavos(c) }));
  const resto = linhas.slice(maximo).reduce((soma, [, c]) => soma + c, 0);
  return linhas.length > maximo ? [...mostradas, { tipo: OUTRAS, valor: deCentavos(resto) }] : mostradas;
}

export interface Degrau {
  chave: string;
  rotulo: string;
  /** O tamanho do degrau, sempre positivo. O sinal está em `de` e `ate`. */
  valor: number;
  /** "total": barra do zero até `ate`. "menos": desce de `de` até `ate`. */
  tipo: "total" | "menos";
  de: number;
  ate: number;
}

export interface PonteDoVendido {
  degraus: Degrau[];
  sobrou: number;
}

/**
 * Do Vendido ao Sobrou: Vendido → Custo das peças e serviços → Sobra das OS →
 * cada despesa → Sobrou. Em centavos, pra Vendido − custo − despesas fechar
 * exato no Sobrou.
 */
export function ponteDoVendido({
  vendido,
  custo,
  despesasPorTipo: despesas,
}: {
  vendido: number;
  custo: number;
  despesasPorTipo: readonly DespesaPorTipo[];
}): PonteDoVendido {
  const degraus: Degrau[] = [];
  const total = (chave: string, rotulo: string, c: number) =>
    degraus.push({ chave, rotulo, valor: deCentavos(Math.abs(c)), tipo: "total", de: 0, ate: deCentavos(c) });
  const menos = (chave: string, rotulo: string, de: number, c: number) =>
    degraus.push({ chave, rotulo, valor: deCentavos(Math.abs(c)), tipo: "menos", de: deCentavos(de), ate: deCentavos(de - c) });

  const vendidoC = paraCentavos(vendido);
  const custoC = paraCentavos(custo);
  total("vendido", "Vendido", vendidoC);
  menos("custo", "Custo das peças e serviços", vendidoC, custoC);
  let atual = vendidoC - custoC;
  total("sobra_das_os", "Sobra das OS", atual);
  for (const d of despesas) {
    const c = paraCentavos(d.valor);
    menos(`despesa:${d.tipo}`, d.tipo, atual, c);
    atual -= c;
  }
  total("sobrou", "Sobrou", atual);
  return { degraus, sobrou: deCentavos(atual) };
}

// ---------------------------------------------------------------------------
// 7 e 8. Vendido por dia, por mês, e a média do dia aberto

export interface VendidoNoDia {
  dia: string;
  valor: number;
}

export interface VendidoNoMes {
  /** "AAAA-MM" */
  mes: string;
  valor: number;
}

function centavosPorDia(ordens: readonly OrdemDasRelacoes[], periodo: PeriodoRelacoes): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const o of ordensDoPeriodo(ordens, periodo)) {
    const dia = diaLocal(o.data_abertura);
    mapa.set(dia, (mapa.get(dia) ?? 0) + paraCentavos(vendidoDaOrdem(o)));
  }
  return mapa;
}

/** Todos os dias do período, inclusive o domingo e o dia sem venda (zero). */
export function vendidoPorDia(ordens: readonly OrdemDasRelacoes[], periodo: PeriodoRelacoes): VendidoNoDia[] {
  const mapa = centavosPorDia(ordens, periodo);
  const dias: VendidoNoDia[] = [];
  for (let dia = periodo.de; dia <= periodo.ate; dia = somarDias(dia, 1)) {
    dias.push({ dia, valor: deCentavos(mapa.get(dia) ?? 0) });
  }
  return dias;
}

/** Todos os meses do período (pra período longo, mais de 62 dias). */
export function vendidoPorMes(ordens: readonly OrdemDasRelacoes[], periodo: PeriodoRelacoes): VendidoNoMes[] {
  const porMes = new Map<string, number>();
  for (const [dia, c] of centavosPorDia(ordens, periodo)) {
    const mes = dia.slice(0, 7);
    porMes.set(mes, (porMes.get(mes) ?? 0) + c);
  }
  const [anoFim, mesFim] = partes(periodo.ate);
  const meses: VendidoNoMes[] = [];
  let [ano, mes] = partes(periodo.de);
  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    const chave = `${ano}-${dois(mes)}`;
    meses.push({ mes: chave, valor: deCentavos(porMes.get(chave) ?? 0) });
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
  return meses;
}

/** A média só dos dias que venderam alguma coisa; `null` se nenhum vendeu. */
export function mediaDoDiaAberto(porDia: readonly VendidoNoDia[]): number | null {
  const abertos = porDia.filter((d) => d.valor > 0);
  if (abertos.length === 0) return null;
  return arredondarCentavo(abertos.reduce((soma, d) => soma + paraCentavos(d.valor), 0) / abertos.length / 100);
}

// ---------------------------------------------------------------------------
// 9. O mês até hoje, contra o mês anterior

export interface MesAteHoje {
  ano: number;
  /** De 1 a 12. */
  mes: number;
  diasNoMes: number;
  /** No mês corrente, o dia de hoje; num mês passado, o último dia. */
  diaDeReferencia: number;
  ehMesCorrente: boolean;
  /** O Vendido acumulado, do dia 1 até o dia de referência. */
  atual: number[];
  /** O mês anterior inteiro, acumulado. `null` se a loja não tem OS antes deste mês. */
  anterior: number[] | null;
  /** Atual no dia de referência − anterior no mesmo dia (segurado no fim dele). */
  diferencaNoMesmoDia: number | null;
  /** Vendido do mês até o dia de referência ÷ o dia de referência. */
  mediaPorDia: number;
}

function acumulado(porDia: readonly VendidoNoDia[]): number[] {
  let soma = 0;
  return porDia.map((d) => {
    soma += paraCentavos(d.valor);
    return deCentavos(soma);
  });
}

/** O mês de referência é o do `periodo.ate`. */
export function oMesAteHoje({
  ordens,
  periodo,
  hoje,
}: {
  ordens: readonly OrdemDasRelacoes[];
  periodo: PeriodoRelacoes;
  hoje: string;
}): MesAteHoje {
  const [ano, mes] = partes(periodo.ate);
  const [anoHoje, mesHoje, diaHoje] = partes(hoje);
  const diasNoMes = ultimoDiaDoMes(ano, mes);
  const ehMesCorrente = ano === anoHoje && mes === mesHoje;
  const diaDeReferencia = ehMesCorrente ? diaHoje : diasNoMes;

  const primeiroDia = montarDia(ano, mes, 1);
  const atual = acumulado(vendidoPorDia(ordens, { de: primeiroDia, ate: montarDia(ano, mes, diaDeReferencia) }));

  const temOrdemAntes = ordens.some((o) => contaNosNumeros(o) && diaLocal(o.data_abertura) < primeiroDia);
  const anterior = temOrdemAntes
    ? acumulado(vendidoPorDia(ordens, { de: montarDia(ano, mes - 1, 1), ate: montarDia(ano, mes, 0) }))
    : null;

  const atualNoDia = atual.at(-1) ?? 0;
  const diferencaNoMesmoDia = anterior
    ? deCentavos(paraCentavos(atualNoDia) - paraCentavos(anterior[Math.min(diaDeReferencia, anterior.length) - 1]))
    : null;

  return {
    ano,
    mes,
    diasNoMes,
    diaDeReferencia,
    ehMesCorrente,
    atual,
    anterior,
    diferencaNoMesmoDia,
    mediaPorDia: arredondarCentavo(atualNoDia / diaDeReferencia),
  };
}

// ---------------------------------------------------------------------------
// 10. O saldo do fluxo a partir do saldo informado

export interface SaldoAPartirDoInformado {
  /** O lojista informou quanto tem hoje; senão o saldo começa do zero. */
  comecouDoInformado: boolean;
  inicial: number;
  pontos: { dia: string; saldo: number }[];
  /** `null` só se o fluxo não tiver dia nenhum. */
  diaMaisBaixo: { dia: string; saldo: number; motivo: string | null } | null;
  saldoFinal: number;
}

/**
 * O saldo do Fluxo projetado somado ao que a loja tem hoje. Não refaz o
 * fluxo: soma o `informado` ao `saldoAcumulado` de cada dia. `null` quando o
 * fluxo não tem saldo (falta acesso a Contas a Pagar ou a Receber).
 */
export function saldoAPartirDoInformado(
  fluxo: FluxoProjetado,
  informado: number | null,
): SaldoAPartirDoInformado | null {
  if (fluxo.saldo === null) return null;
  const inicialC = paraCentavos(informado ?? 0);
  const pontos = fluxo.dias.map((d) => ({
    dia: d.dia,
    saldo: deCentavos(inicialC + paraCentavos(d.saldoAcumulado ?? 0)),
  }));

  let diaMaisBaixo: SaldoAPartirDoInformado["diaMaisBaixo"] = null;
  fluxo.dias.forEach((d, i) => {
    if (diaMaisBaixo && pontos[i].saldo >= diaMaisBaixo.saldo) return;
    const maiorSaida = d.itens
      .filter((item) => item.tipo === "sai")
      .reduce<(typeof d.itens)[number] | null>((maior, item) => (!maior || item.valor > maior.valor ? item : maior), null);
    diaMaisBaixo = { dia: d.dia, saldo: pontos[i].saldo, motivo: maiorSaida?.descricao ?? null };
  });

  return {
    comecouDoInformado: informado !== null,
    inicial: deCentavos(inicialC),
    pontos,
    diaMaisBaixo,
    saldoFinal: pontos.at(-1)?.saldo ?? deCentavos(inicialC),
  };
}

// ---------------------------------------------------------------------------
// 11. Dinheiro curto pros títulos

function numeroCurto(n: number, casas: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

/** "R$ 950", "R$ 2,6 mil", "R$ 12 mil", "R$ 1,2 mi", "−R$ 2,6 mil". */
export function formatarMoedaCurta(valor: number): string {
  const reais = Math.round(Math.abs(valor));
  const sinal = valor < 0 && reais > 0 ? "−" : "";
  let texto: string;
  const milComCasa = Math.round(reais / 100) / 10;
  const milInteiro = Math.round(reais / 1000);
  if (reais < 1000) texto = String(reais);
  else if (milComCasa < 10) texto = `${numeroCurto(milComCasa, 1)} mil`;
  else if (milInteiro < 1000) texto = `${numeroCurto(milInteiro, 0)} mil`;
  else {
    const mi = Math.round(reais / 100_000) / 10;
    texto = `${numeroCurto(mi, mi < 10 ? 1 : 0)} mi`;
  }
  return `${sinal}R$ ${texto}`;
}

// ---------------------------------------------------------------------------
// 12. As frases-título (o título do cartão é a resposta)

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function nomeDoMes(mes: number): string {
  return MESES[(((mes - 1) % 12) + 12) % 12];
}

function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function fraseDoMes(
  m: Pick<MesAteHoje, "mes" | "ehMesCorrente" | "diferencaNoMesmoDia" | "mediaPorDia">,
): string {
  const este = maiuscula(nomeDoMes(m.mes));
  const outro = nomeDoMes(m.mes - 1);
  if (m.diferencaNoMesmoDia === null) {
    return `${este}: média de ${formatarMoedaCurta(m.mediaPorDia)} por dia${m.ehMesCorrente ? " até agora" : ""}`;
  }
  const verbo = m.ehMesCorrente ? "está" : "ficou";
  const fim = m.ehMesCorrente ? " no mesmo dia" : "";
  const diferenca = Math.round(m.diferencaNoMesmoDia);
  if (diferenca === 0) return `${este} ${verbo} igual a ${outro}${fim}`;
  const lado = diferenca > 0 ? "acima de" : "abaixo de";
  return `${este} ${verbo} ${formatarMoedaCurta(Math.abs(diferenca))} ${lado} ${outro}${fim}`;
}

export function fraseDaPonte(vendido: number, sobrou: number): string {
  if (vendido === 0 && sobrou === 0) return "Nada vendido no período";
  const inicio = `De ${formatarMoedaCurta(vendido)} vendidos`;
  return sobrou >= 0
    ? `${inicio}, sobraram ${formatarMoedaCurta(sobrou)}`
    : `${inicio}, faltaram ${formatarMoedaCurta(-sobrou)} pra cobrir as despesas`;
}

/** `valor` é o que a tela escolheu medir (Vendido ou Sobra das OS). */
export function fraseDoRanking(linhas: readonly { descricao: string; valor: number }[]): string {
  const primeira = [...linhas].sort(
    (a, b) => b.valor - a.valor || a.descricao.localeCompare(b.descricao, "pt-BR"),
  )[0];
  if (!primeira || primeira.valor <= 0) return "Nenhuma venda no período";
  return `${primeira.descricao} é quem mais deu dinheiro: ${formatarMoedaCurta(primeira.valor)}`;
}

/** Com menos itens que isso, a curva ABC não diz muita coisa. */
export const POUCOS_ITENS_ABC = 10;

export function fraseDaABC({
  quantosNoA,
  total,
  percentual,
  variosItens,
}: {
  quantosNoA: number;
  total: number;
  /** Quanto o grupo A faz do total, em % (0 a 100). */
  percentual: number;
  /** "peça", "serviço", "cliente" (fica pra quando a frase precisar do singular). */
  umItem: string;
  variosItens: string;
}): string {
  if (total === 0) return `Sem ${variosItens} no período`;
  if (total < POUCOS_ITENS_ABC) return "Poucos itens: a curva ainda não diz muito";
  const verbo = quantosNoA === 1 ? "faz" : "fazem";
  return `${quantosNoA} de ${total} ${variosItens} ${verbo} ${Math.round(percentual)}% do que entrou`;
}

export function fraseDoFluxo(saldo: SaldoAPartirDoInformado): string {
  const baixo = saldo.diaMaisBaixo;
  if (saldo.comecouDoInformado && baixo) {
    const motivo = baixo.motivo ? ` (${baixo.motivo})` : "";
    return `O dia mais apertado é ${diaEMes(baixo.dia)}: ${formatarMoedaCurta(baixo.saldo)}${motivo}`;
  }
  const dias = Math.max(saldo.pontos.length - 1, 0);
  if (baixo && Math.round(baixo.saldo) < 0) {
    return `Quanto falta cobrir nos próximos ${dias} dias: ${formatarMoedaCurta(-baixo.saldo)}`;
  }
  return `Nos próximos ${dias} dias entra mais do que sai`;
}

export function fraseDoDiaADia({ porDia, hoje }: { porDia: readonly VendidoNoDia[]; hoje: string }): string {
  const media = mediaDoDiaAberto(porDia);
  if (media === null) return "Nenhuma venda no período";
  const deHoje = porDia.find((d) => d.dia === hoje);
  const dia = deHoje ?? [...porDia].reverse().find((d) => d.valor > 0)!;
  const rotulo = deHoje ? "Hoje" : diaEMes(dia.dia);
  const diferenca = paraCentavos(dia.valor) - paraCentavos(media);
  const comparacao = diferenca > 0 ? "acima da média" : diferenca < 0 ? "abaixo da média" : "na média";
  return `${rotulo}: ${formatarMoedaCurta(dia.valor)}, ${comparacao} de ${formatarMoedaCurta(media)} por dia aberto`;
}
