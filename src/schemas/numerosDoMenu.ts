import {
  DIAS_CONTA_PAGAR_VENCENDO,
  contaPagarVenceAte,
  contaReceberAtrasada,
  osProntaPraRetirar,
  somarDias,
} from "./centralDoDia";
import { orcamentoVencido } from "./orcamento";
import type { ContaPagar } from "@/types/contaPagar";
import type { ContaReceber } from "@/types/contaReceber";
import type { OrdemServico } from "@/types/os";

/**
 * O número ao lado do nome de quatro menus (#1092): Orçamentos, Ordens de
 * Serviço, Contas a Pagar e Contas a Receber. É a mesma conta da Central do
 * dia (`centralDoDia.ts`), pra o menu e o Início nunca discordarem. Contas a
 * Pagar também olha 3 dias à frente, igual à Central (decidido em 26/11).
 *
 * Função pura: a tela só desenha. Zero vira `null` (nada aparece).
 */

/** Orçamento que vence em até este tanto de dias já conta como "vencendo". */
export const DIAS_ORCAMENTO_VENCENDO = 2;

export type CorDoNumero = "perigo" | "atencao" | "ok";

export interface NumeroDoMenu {
  quantos: number;
  cor: CorDoNumero;
  /** A frase que aparece ao passar o mouse e que o leitor de tela lê. */
  dica: string;
}

export type ChaveDoNumero = "orcamentos" | "ordens_servico" | "contas_pagar" | "contas_receber";

export interface EntradaNumerosDoMenu {
  /** Hoje, "YYYY-MM-DD" (`hojeLocal()`). */
  hoje: string;
  orcamentos: Pick<OrdemServico, "id" | "status" | "validade">[];
  ordens: Pick<OrdemServico, "id" | "status" | "tipo">[];
  contasPagar: Pick<ContaPagar, "id" | "status" | "vencimento">[];
  contasReceber: Pick<ContaReceber, "id" | "status" | "vencimento">[];
}

function plural(n: number, singular: string, mais: string): string {
  return n === 1 ? singular : mais;
}

/** "3 contas: 1 atrasada e 2 vencendo" quando há dos dois jeitos. */
function juntarDicas(
  total: number,
  nome: [string, string],
  graves: { n: number; um: string; varios: string },
  leves: { n: number; um: string; varios: string },
): string {
  const palavra = plural(total, nome[0], nome[1]);
  if (graves.n > 0 && leves.n > 0) {
    return (
      `${total} ${palavra}: ${graves.n} ${plural(graves.n, graves.um, graves.varios)}` +
      ` e ${leves.n} ${plural(leves.n, leves.um, leves.varios)}`
    );
  }
  if (graves.n > 0) return `${total} ${palavra} ${plural(total, graves.um, graves.varios)}`;
  return `${total} ${palavra} ${plural(total, leves.um, leves.varios)}`;
}

function dosOrcamentos(e: EntradaNumerosDoMenu): NumeroDoMenu | null {
  const limite = somarDias(e.hoje, DIAS_ORCAMENTO_VENCENDO);
  let vencidos = 0;
  let vencendo = 0;
  for (const o of e.orcamentos) {
    if (o.status !== "orcamento" || !o.validade) continue;
    if (orcamentoVencido(o.validade, e.hoje)) vencidos++;
    else if (o.validade <= limite) vencendo++;
  }
  const quantos = vencidos + vencendo;
  if (quantos === 0) return null;
  return {
    quantos,
    cor: vencidos > 0 ? "perigo" : "atencao",
    dica: juntarDicas(
      quantos,
      ["orçamento", "orçamentos"],
      { n: vencidos, um: "vencido", varios: "vencidos" },
      { n: vencendo, um: "vencendo", varios: "vencendo" },
    ),
  };
}

function dasOrdens(e: EntradaNumerosDoMenu): NumeroDoMenu | null {
  const quantos = e.ordens.filter(osProntaPraRetirar).length;
  if (quantos === 0) return null;
  return {
    quantos,
    cor: "ok",
    dica: `${quantos} ${plural(quantos, "OS pronta", "OS prontas")} pra retirar`,
  };
}

function dasContasAPagar(e: EntradaNumerosDoMenu): NumeroDoMenu | null {
  const limite = somarDias(e.hoje, DIAS_CONTA_PAGAR_VENCENDO);
  const ate = e.contasPagar.filter((c) => contaPagarVenceAte(c, limite));
  const atrasadas = ate.filter((c) => c.vencimento < e.hoje).length;
  const vencendo = ate.length - atrasadas;
  if (ate.length === 0) return null;
  return {
    quantos: ate.length,
    cor: atrasadas > 0 ? "perigo" : "atencao",
    dica: juntarDicas(
      ate.length,
      ["conta", "contas"],
      { n: atrasadas, um: "atrasada", varios: "atrasadas" },
      { n: vencendo, um: "vencendo", varios: "vencendo" },
    ),
  };
}

function dasContasAReceber(e: EntradaNumerosDoMenu): NumeroDoMenu | null {
  const quantos = e.contasReceber.filter((c) => contaReceberAtrasada(c, e.hoje)).length;
  if (quantos === 0) return null;
  return {
    quantos,
    cor: "perigo",
    dica: `${quantos} ${plural(quantos, "conta atrasada", "contas atrasadas")}`,
  };
}

export function numerosDoMenu(e: EntradaNumerosDoMenu): Record<ChaveDoNumero, NumeroDoMenu | null> {
  return {
    orcamentos: dosOrcamentos(e),
    ordens_servico: dasOrdens(e),
    contas_pagar: dasContasAPagar(e),
    contas_receber: dasContasAReceber(e),
  };
}
