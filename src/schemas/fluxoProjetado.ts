import { diaLocal } from "@/lib/datas";
import { proximoVencimento } from "@/lib/contasPagar";
import { somar } from "./dinheiro";
import type { ContaPagar } from "@/types/contaPagar";
import type { ContaReceber } from "@/types/contaReceber";

/**
 * Fluxo de caixa projetado (#389): o que vai entrar (contas a receber
 * pendentes) e sair (contas a pagar pendentes) do dia de hoje até
 * `hoje + dias`, dia a dia, com o saldo andando a partir do zero.
 */

/** Os períodos que a tela oferece; começa em 30 (decidido pela Sofia, 10/11/2026). */
export const PERIODOS_FLUXO = [7, 30, 60, 90] as const;
export const PERIODO_FLUXO_PADRAO = 30;

export interface ItemFluxo {
  /** id da conta; na prevista, `<id da conta de origem>:<vencimento previsto>`. */
  chave: string;
  tipo: "entra" | "sai";
  descricao: string;
  valor: number;
  /** O vencimento da conta (na atrasada, o dia em que venceu, antes de hoje). */
  vencimento: string;
  /** Venceu antes de hoje e segue pendente: entra no dia de hoje. */
  atrasada: boolean;
  /** Ocorrência futura de uma recorrente que ainda não existe no banco. */
  prevista: boolean;
}

export interface DiaFluxo {
  /** "AAAA-MM-DD" */
  dia: string;
  /** null = sem acesso a Contas a Receber. */
  entra: number | null;
  /** null = sem acesso a Contas a Pagar. */
  sai: number | null;
  /** entra − sai; null se faltar acesso a um dos lados. */
  saldoDoDia: number | null;
  /** Soma dos saldos do dia desde hoje (o saldo começa do zero); null se faltar acesso. */
  saldoAcumulado: number | null;
  itens: ItemFluxo[];
}

export interface FluxoProjetado {
  /** Uma linha por dia, de hoje até `hoje + dias`, inclusive. */
  dias: DiaFluxo[];
  totalEntra: number | null;
  totalSai: number | null;
  saldo: number | null;
}

export interface EntradaFluxoProjetado {
  /** null = quem está usando não tem o módulo Contas a Pagar. */
  contasPagar: ContaPagar[] | null;
  /** null = quem está usando não tem o módulo Contas a Receber. */
  contasReceber: ContaReceber[] | null;
  /** "AAAA-MM-DD", o dia da loja (`hojeLocal()`). */
  hoje: string;
  dias: number;
}

/** "AAAA-MM-DD" + n dias, contando dia de calendário no fuso de quem usa. */
function somarDias(dia: string, n: number): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  return diaLocal(new Date(ano, mes - 1, d + n));
}

/**
 * A "série" de uma conta recorrente. O banco não guarda um id de série: o
 * `pagarConta` cria a próxima copiando descrição, categoria e valor. Então é
 * por esses três que se reconhece que duas contas são do mesmo aluguel.
 */
export function chaveDaSerie(conta: ContaPagar): string {
  return `${conta.descricao.trim().toLowerCase()}|${conta.categoria_id ?? ""}|${conta.valor}`;
}

/**
 * As ocorrências futuras de uma recorrente que ainda não existem no banco.
 *
 * Usa o MESMO `proximoVencimento` do `pagarConta`, pra a previsão cair no dia
 * em que o sistema vai criar a conta de verdade (31/01 → 28/02 → 28/03).
 *
 * Duas regras pra não contar duas vezes nem inventar passado:
 * - se já existe no banco uma conta da mesma série (pendente ou paga) num dos
 *   vencimentos, a projeção desta conta para ali: a que existe "assume" o
 *   resto da série (ela mesma entra, ou já foi paga, e projeta o que vem);
 * - ocorrência com data antes de hoje não entra. A dívida atrasada de verdade
 *   já aparece pela conta que existe; a previsão só olha pra frente.
 */
function previstasDaRecorrente(
  conta: ContaPagar,
  vencimentosDaSerie: Map<string, Set<string>>,
  hoje: string,
  fim: string,
): ItemFluxo[] {
  const existentes = vencimentosDaSerie.get(chaveDaSerie(conta));
  const previstas: ItemFluxo[] = [];
  let vencimento = proximoVencimento(conta.vencimento);
  while (
    vencimento <= fim &&
    (conta.recorrente_ate === null || vencimento <= conta.recorrente_ate)
  ) {
    if (existentes?.has(vencimento)) break;
    if (vencimento >= hoje) {
      previstas.push({
        chave: `${conta.id}:${vencimento}`,
        tipo: "sai",
        descricao: conta.descricao,
        valor: conta.valor,
        vencimento,
        atrasada: false,
        prevista: true,
      });
    }
    vencimento = proximoVencimento(vencimento);
  }
  return previstas;
}

/**
 * Atrasadas primeiro (são as mais urgentes), depois o que entra antes do que
 * sai, depois pela descrição. A chave desempata, pra a ordem nunca depender
 * da ordem em que as contas vieram do banco.
 */
function compararItens(a: ItemFluxo, b: ItemFluxo): number {
  if (a.atrasada !== b.atrasada) return a.atrasada ? -1 : 1;
  if (a.tipo !== b.tipo) return a.tipo === "entra" ? -1 : 1;
  const porDescricao = a.descricao.localeCompare(b.descricao, "pt-BR");
  if (porDescricao !== 0) return porDescricao;
  return a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0;
}

export function calcularFluxoProjetado(entrada: EntradaFluxoProjetado): FluxoProjetado {
  const { contasPagar, contasReceber, hoje } = entrada;
  // Mesmo critério do `contasVencendoAte` (Início): de hoje até hoje + dias.
  const fim = somarDias(hoje, entrada.dias);

  const itens: ItemFluxo[] = [];

  // Conta que existe: só a pendente. Venceu antes de hoje? Vai pro dia de hoje,
  // marcada como atrasada, porque é dinheiro que ainda vai sair (ou entrar).
  // Data "AAAA-MM-DD" compara certo como texto, sem fuso no meio.
  function incluirExistente(
    conta: { id: string; descricao: string; valor: number; vencimento: string },
    tipo: ItemFluxo["tipo"],
  ) {
    if (conta.vencimento > fim) return;
    itens.push({
      chave: conta.id,
      tipo,
      descricao: conta.descricao,
      valor: conta.valor,
      vencimento: conta.vencimento,
      atrasada: conta.vencimento < hoje,
      prevista: false,
    });
  }

  for (const conta of contasReceber ?? []) {
    if (conta.status === "pendente") incluirExistente(conta, "entra");
  }

  if (contasPagar) {
    // Todos os vencimentos de cada série, pagos ou não: é contra eles que a
    // previsão confere se a ocorrência já existe.
    const vencimentosDaSerie = new Map<string, Set<string>>();
    for (const conta of contasPagar) {
      const chave = chaveDaSerie(conta);
      const vencimentos = vencimentosDaSerie.get(chave) ?? new Set<string>();
      vencimentos.add(conta.vencimento);
      vencimentosDaSerie.set(chave, vencimentos);
    }

    for (const conta of contasPagar) {
      if (conta.status !== "pendente") continue;
      incluirExistente(conta, "sai");
      if (conta.recorrente) {
        itens.push(...previstasDaRecorrente(conta, vencimentosDaSerie, hoje, fim));
      }
    }
  }

  const itensDoDia = new Map<string, ItemFluxo[]>();
  for (const item of itens) {
    const dia = item.atrasada ? hoje : item.vencimento;
    const doDia = itensDoDia.get(dia) ?? [];
    doDia.push(item);
    itensDoDia.set(dia, doDia);
  }

  // Saldo de um lado só pareceria verdade: sem acesso a um dos módulos, o
  // saldo some (fica null) em vez de mostrar só as entradas ou só as saídas.
  const temSaldo = contasPagar !== null && contasReceber !== null;

  const dias: DiaFluxo[] = [];
  let saldoAcumulado = 0;
  for (let n = 0; n <= entrada.dias; n += 1) {
    const dia = somarDias(hoje, n);
    const doDia = (itensDoDia.get(dia) ?? []).sort(compararItens);
    const entra =
      contasReceber === null
        ? null
        : somar(doDia.filter((i) => i.tipo === "entra").map((i) => i.valor));
    const sai =
      contasPagar === null
        ? null
        : somar(doDia.filter((i) => i.tipo === "sai").map((i) => i.valor));
    let saldoDoDia: number | null = null;
    if (temSaldo && entra !== null && sai !== null) {
      saldoDoDia = somar([entra, -sai]);
      saldoAcumulado = somar([saldoAcumulado, saldoDoDia]);
    }
    dias.push({
      dia,
      entra,
      sai,
      saldoDoDia,
      saldoAcumulado: temSaldo ? saldoAcumulado : null,
      itens: doDia,
    });
  }

  const totalEntra =
    contasReceber === null ? null : somar(dias.map((d) => d.entra ?? 0));
  const totalSai = contasPagar === null ? null : somar(dias.map((d) => d.sai ?? 0));
  return {
    dias,
    totalEntra,
    totalSai,
    saldo: totalEntra !== null && totalSai !== null ? somar([totalEntra, -totalSai]) : null,
  };
}
