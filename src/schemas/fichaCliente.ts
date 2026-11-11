import { diaLocal } from "@/lib/datas";
import { somar } from "./dinheiro";
import { diasDeVisita, linhaDoTempo, totalGastoNoVeiculo, type OrdemDaFicha } from "./fichaVeiculo";
import { contaNosNumeros } from "./orcamento";
import { FORMA_PAGAMENTO_LABEL, totalOrdem } from "@/types/os";
import type { StatusContaReceber } from "@/types/contaReceber";

/**
 * As contas da ficha do cliente (#393): o que ele comprou, como pagou e o que
 * deve. É a pergunta do balcão — "esse cliente está devendo alguma coisa?".
 *
 * Nenhuma tabela nova: tudo sai das OS e de `contas_receber`. Fica aqui, como
 * função pura testada, pela regra de sempre (item 49 de `docs/licoes.md`):
 * conta de dinheiro não mora em tela.
 *
 * As contas das OS são AS MESMAS da ficha do veículo (`fichaVeiculo.ts`), de
 * propósito: o total é o `totalGastoNoVeiculo` (soma das faturadas pelo
 * `totalOrdem`, o mesmo "Total" da lista de OS, sem os juros do cartão) e as
 * visitas são os `diasDeVisita`. Assim o cliente com um carro só vê na ficha
 * dele o mesmo número da ficha do carro.
 *
 * Por que não o `resumirPorCliente` (clientes sumidos): lá a "última visita"
 * é o dia do FATURAMENTO e só OS faturada conta, porque a pergunta é "parou de
 * vir?". Aqui a ficha mostra também a OS em andamento, e a visita é o dia em
 * que ele chegou na loja, como na ficha do veículo.
 */

/**
 * A OS como a ficha do cliente recebe. É a da ficha do veículo, mais a forma
 * de pagamento e as parcelas, que só chegam pra quem tem o módulo Ordens de
 * Serviço (a janela `ordens_servico_clientes` não traz; ver
 * `src/lib/fichaCliente.ts`). Ausentes, a tela mostra "—".
 */
export interface OrdemDaFichaDoCliente extends OrdemDaFicha {
  veiculo_id?: string | null;
  /** A placa do carro da OS, quando se sabe. */
  placa?: string | null;
  forma_pagamento?: string | null;
  parcelas?: number | null;
}

/** A conta a receber como a ficha do cliente lê. */
export interface ContaDaFicha {
  id: string;
  loja_id: string;
  ordem_servico_id: string | null;
  descricao: string;
  valor: number;
  /** Dia de calendário, "AAAA-MM-DD" (coluna `date` do banco). */
  vencimento: string;
  status: StatusContaReceber;
  data_recebimento: string | null;
}

/**
 * O que ele comprou: OS e vendas de balcão, da mais recente pra mais antiga.
 * Orçamento e recusado ficam de fora (#379): não é compra.
 */
export function comprasDoCliente<T extends OrdemDaFichaDoCliente>(ordens: readonly T[]): T[] {
  return linhaDoTempo(ordens.filter(contaNosNumeros)) as T[];
}

export interface ResumoDaFichaDoCliente {
  /** Soma das OS e vendas faturadas, fechada no centavo. */
  totalComprado: number;
  /** Quantas OS e vendas já foram faturadas. */
  faturadas: number;
  /** Dias diferentes em que ele passou pela loja (duas OS no mesmo dia = uma visita). */
  visitas: number;
  /** O dia da visita mais recente, "AAAA-MM-DD" no fuso local; `null` se nunca veio. */
  ultimaVisita: string | null;
}

export function resumoDoCliente(ordens: readonly OrdemDaFichaDoCliente[]): ResumoDaFichaDoCliente {
  const compras = ordens.filter(contaNosNumeros);
  const dias = diasDeVisita(compras);
  return {
    totalComprado: totalGastoNoVeiculo(compras),
    faturadas: compras.filter((ordem) => ordem.status === "faturada").length,
    visitas: dias.length,
    ultimaVisita: dias[dias.length - 1] ?? null,
  };
}

/**
 * Atrasada = ainda pendente e com o vencimento ANTES de hoje (vencendo hoje
 * ainda não está atrasada).
 *
 * O vencimento é um dia de calendário ("AAAA-MM-DD"), então compara o texto:
 * passar ele por `new Date()` daria meia-noite em UTC, que no Brasil ainda é
 * o dia anterior (itens 34, 42 e 48 de `docs/licoes.md`). O `hoje` vem de
 * `hojeLocal()`.
 */
export function contaAtrasada(conta: Pick<ContaDaFicha, "status" | "vencimento">, hoje: string): boolean {
  return conta.status === "pendente" && conta.vencimento < hoje;
}

export interface DividaDoCliente {
  /** As contas pendentes, da que vence primeiro à que vence por último. */
  pendentes: ContaDaFicha[];
  /** Soma das pendentes (atrasadas ou não). */
  totalEmAberto: number;
  /** Quantas das pendentes estão atrasadas. */
  atrasadas: number;
  /** Soma só das atrasadas. */
  totalAtrasado: number;
}

/** O que ele deve: só conta pendente. Conta recebida não é dívida. */
export function dividaDoCliente(contas: readonly ContaDaFicha[], hoje: string): DividaDoCliente {
  const pendentes = contas
    .filter((conta) => conta.status === "pendente")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.id.localeCompare(b.id));
  const atrasadas = pendentes.filter((conta) => contaAtrasada(conta, hoje));
  return {
    pendentes,
    totalEmAberto: somar(pendentes.map((conta) => conta.valor)),
    atrasadas: atrasadas.length,
    totalAtrasado: somar(atrasadas.map((conta) => conta.valor)),
  };
}

export interface PagamentoDaOrdem {
  ordemId: string;
  numero: number;
  tipo: OrdemDaFicha["tipo"];
  loja_id: string;
  /** O dia do faturamento, no fuso local. */
  dia: string;
  /** "Pix", "Pix + Cartão de crédito"... como o faturamento gravou; `null` se não ficou gravada. */
  forma: string | null;
  parcelas: number | null;
  valor: number;
}

/**
 * Como ele pagou: uma linha por OS ou venda faturada, com a forma e as
 * parcelas que o faturamento gravou, a mais recente primeiro. O valor é o
 * `totalOrdem` (o mesmo "Total" da lista de OS).
 */
export function formasDePagamento(ordens: readonly OrdemDaFichaDoCliente[]): PagamentoDaOrdem[] {
  return ordens
    .filter((ordem) => contaNosNumeros(ordem) && ordem.status === "faturada")
    .map((ordem) => ({
      ordemId: ordem.id,
      numero: ordem.numero,
      tipo: ordem.tipo,
      loja_id: ordem.loja_id,
      momento: ordem.data_fechamento ?? ordem.data_abertura,
      // Hoje o faturamento grava o texto pronto ("Pix + Cartão de crédito");
      // a tradução cobre OS antiga gravada com o código ("cartao_credito"),
      // do mesmo jeito do documento de garantia.
      forma: ordem.forma_pagamento
        ? (FORMA_PAGAMENTO_LABEL[ordem.forma_pagamento] ?? ordem.forma_pagamento)
        : null,
      parcelas: ordem.parcelas ?? null,
      valor: totalOrdem(ordem.itens ?? []),
    }))
    .sort((a, b) => Date.parse(b.momento) - Date.parse(a.momento))
    .map(({ momento, ...linha }) => ({ ...linha, dia: diaLocal(momento) }));
}

export type ContaRecebida = ContaDaFicha & { diaRecebimento: string | null };

/** As contas a receber que ele já pagou, com o dia do recebimento, a mais recente primeiro. */
export function contasRecebidas(contas: readonly ContaDaFicha[]): ContaRecebida[] {
  return contas
    .filter((conta) => conta.status === "recebido")
    .map((conta) => ({
      ...conta,
      diaRecebimento: conta.data_recebimento ? diaLocal(conta.data_recebimento) : null,
    }))
    // Pelo dia local (texto "AAAA-MM-DD" compara como calendário); sem a data
    // do recebimento, vale o vencimento, que já é um dia de calendário.
    .sort(
      (a, b) =>
        (b.diaRecebimento ?? b.vencimento).localeCompare(a.diaRecebimento ?? a.vencimento) ||
        (b.data_recebimento ?? "").localeCompare(a.data_recebimento ?? "") ||
        a.id.localeCompare(b.id),
    );
}
