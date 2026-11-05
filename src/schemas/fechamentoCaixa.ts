// As contas do fechamento de caixa do dia (item TR-06.4 do guia).
//
// Moram aqui, e não na tela, pela regra 8 do guia: conta de dinheiro escrita
// dentro de tela diverge — este projeto já pagou isso cinco vezes (§6 itens
// 35, 40, 44, 49 e 60 do PROJETO_STATUS). O banco (migration 0058) só guarda
// o número que sai daqui e faz a subtração contado − esperado.
//
// A PERGUNTA que o fechamento responde é uma só: quanto dinheiro EM ESPÉCIE
// devia estar na gaveta agora? Pix e cartão não passam pela gaveta — eles
// aparecem pra conferência com o extrato, mas não entram na conta.
import { FORMA_PAGAMENTO_LABEL } from "@/types/os";
import type { MovimentoCaixa } from "@/types/caixa";
import type { FechamentoCaixa } from "@/types/fechamentoCaixa";
import { arredondarCentavo, somar } from "./dinheiro";

/** Tira acento, espaço e maiúscula: "Espécie " e "especie" são a mesma coisa. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * A forma de pagamento é dinheiro vivo?
 *
 * O faturamento de OS e o pagamento de conta gravam a chave `dinheiro`; o
 * lançamento manual tem um campo de texto livre que já nasce com "dinheiro",
 * mas aceita qualquer coisa — daí aceitar os jeitos comuns de escrever.
 */
export function ehDinheiro(forma: string | null | undefined): boolean {
  if (!forma) return false;
  const f = normalizar(forma);
  return f === "dinheiro" || f === "especie" || f === "em especie" || f === "din";
}

/**
 * A chave de agrupamento de uma forma de pagamento. O faturamento grava a
 * chave ("pix", "cartao_credito"), mas o lançamento manual tem texto livre —
 * "Pix", "PIX" e "Cartão de crédito" precisam cair no mesmo grupo, senão a
 * conferência com o extrato mostraria o Pix do dia partido em dois.
 */
export function chaveDaForma(forma: string): string {
  const f = normalizar(forma).replace(/\s+de\s+/g, "_").replace(/\s+/g, "_");
  return f;
}

/** O nome que a tela mostra pra uma forma de pagamento gravada. */
export function rotuloDaForma(forma: string): string {
  return FORMA_PAGAMENTO_LABEL[chaveDaForma(forma)] ?? forma;
}

export interface TotalDaForma {
  /** A chave gravada (ex: "pix"), ou o texto livre do lançamento manual. */
  forma: string;
  rotulo: string;
  entradas: number;
  saidas: number;
}

export interface ResumoDoDia {
  fundoTroco: number;
  entradasDinheiro: number;
  saidasDinheiro: number;
  /** Fundo + entradas em dinheiro − saídas em dinheiro. */
  esperado: number;
  /** Tudo que não é dinheiro, pra conferir com o extrato. */
  outrasFormas: TotalDaForma[];
  /**
   * Lançamentos SEM forma de pagamento informada. Não entram na conta — não
   * dá pra saber se saíram da gaveta — e por isso a tela os mostra à parte:
   * se foram em dinheiro, a diferença do dia provavelmente vem daí.
   */
  semForma: { quantidade: number; entradas: number; saidas: number };
}

/**
 * O que o sistema espera encontrar na gaveta, a partir dos lançamentos do dia.
 *
 * @param movimentosDoDia só os lançamentos do dia que está sendo fechado
 * @param fundoTroco o dinheiro que já estava na gaveta ao abrir
 */
export function resumirDiaParaFechamento(
  movimentosDoDia: readonly MovimentoCaixa[],
  fundoTroco: number,
): ResumoDoDia {
  const dinheiroEntrada: number[] = [];
  const dinheiroSaida: number[] = [];
  const porForma = new Map<string, { rotulo: string; entradas: number[]; saidas: number[] }>();
  const semFormaEntradas: number[] = [];
  const semFormaSaidas: number[] = [];

  for (const m of movimentosDoDia) {
    const forma = m.forma_pagamento?.trim() ?? "";
    if (!forma) {
      (m.tipo === "entrada" ? semFormaEntradas : semFormaSaidas).push(m.valor);
    } else if (ehDinheiro(forma)) {
      (m.tipo === "entrada" ? dinheiroEntrada : dinheiroSaida).push(m.valor);
    } else {
      const chave = chaveDaForma(forma);
      const grupo = porForma.get(chave) ?? { rotulo: rotuloDaForma(forma), entradas: [], saidas: [] };
      (m.tipo === "entrada" ? grupo.entradas : grupo.saidas).push(m.valor);
      porForma.set(chave, grupo);
    }
  }

  const fundo = arredondarCentavo(Math.max(0, fundoTroco || 0));
  const entradasDinheiro = somar(dinheiroEntrada);
  const saidasDinheiro = somar(dinheiroSaida);

  return {
    fundoTroco: fundo,
    entradasDinheiro,
    saidasDinheiro,
    esperado: somar([fundo, entradasDinheiro, -saidasDinheiro]),
    outrasFormas: [...porForma.entries()]
      .map(([forma, grupo]) => ({
        forma,
        rotulo: grupo.rotulo,
        entradas: somar(grupo.entradas),
        saidas: somar(grupo.saidas),
      }))
      .sort((a, b) => b.entradas - a.entradas),
    semForma: {
      quantidade: semFormaEntradas.length + semFormaSaidas.length,
      entradas: somar(semFormaEntradas),
      saidas: somar(semFormaSaidas),
    },
  };
}

/** O que vai pra coluna `totais_por_forma`: só o líquido de cada forma. */
export function totaisParaGravar(resumo: ResumoDoDia): Record<string, number> {
  const totais: Record<string, number> = { dinheiro: somar([resumo.entradasDinheiro, -resumo.saidasDinheiro]) };
  for (const f of resumo.outrasFormas) totais[f.forma] = somar([f.entradas, -f.saidas]);
  return totais;
}

/** Contado − esperado, no centavo. Negativo = faltou; positivo = sobrou. */
export function diferencaDoFechamento(esperado: number, contado: number): number {
  return somar([contado, -esperado]);
}

export type SituacaoDaDiferenca = "bateu" | "faltou" | "sobrou";

export function situacaoDaDiferenca(diferenca: number): SituacaoDaDiferenca {
  if (diferenca === 0) return "bateu";
  return diferenca < 0 ? "faltou" : "sobrou";
}

/**
 * Quando o lançamento da diferença entra no caixa.
 *
 * Fechando HOJE: nulo, e o banco usa a hora de agora. Fechando um dia que já
 * passou (fechou só na manhã seguinte, por exemplo): o fim daquele dia no
 * fuso de quem usa — senão a quebra cairia no dia errado, e o dia fechado
 * nunca bateria com o que foi contado.
 *
 * @param dia "YYYY-MM-DD" do dia sendo fechado
 * @param hoje "YYYY-MM-DD" de hoje, no fuso local
 */
export function momentoDoLancamento(dia: string, hoje: string): string | null {
  if (dia === hoje) return null;
  const [ano, mes, d] = dia.split("-").map(Number);
  return new Date(ano, mes - 1, d, 23, 59, 0).toISOString();
}

/**
 * Os lançamentos que entraram DEPOIS de o dia ser fechado — uma OS faturada
 * mais tarde, uma saída lançada à noite. Não são bloqueados (regra 7 do
 * guia: aviso, nunca tranca); aparecem marcados, porque são exatamente os
 * que fazem a gaveta deixar de bater com o que foi contado.
 *
 * O próprio lançamento da diferença não conta: ele é o fechamento.
 */
export function lancamentosDepoisDoFechamento(
  movimentosDoDia: readonly MovimentoCaixa[],
  fechamento: Pick<FechamentoCaixa, "criado_em" | "caixa_movimento_id"> | null,
): MovimentoCaixa[] {
  if (!fechamento) return [];
  const fechouEm = new Date(fechamento.criado_em).getTime();
  return movimentosDoDia.filter(
    (m) => m.id !== fechamento.caixa_movimento_id && new Date(m.data).getTime() > fechouEm,
  );
}

/**
 * O fundo de troco que o próximo fechamento já traz preenchido: o do
 * fechamento mais recente ANTES do dia sendo fechado. Loja costuma deixar
 * sempre o mesmo troco na gaveta; digitar de novo todo dia é chato e é onde
 * o erro de digitação entra.
 */
export function fundoSugerido(
  fechamentos: readonly Pick<FechamentoCaixa, "data" | "fundo_troco">[],
  dia: string,
): number {
  const anteriores = fechamentos.filter((f) => f.data < dia).sort((a, b) => (a.data < b.data ? 1 : -1));
  return anteriores[0]?.fundo_troco ?? 0;
}

/** Soma das diferenças de uma lista de fechamentos — "quanto faltou no mês?". */
export function somarDiferencas(fechamentos: readonly Pick<FechamentoCaixa, "diferenca">[]): number {
  return somar(fechamentos.map((f) => f.diferenca));
}

/**
 * Quanto entrou em cada forma de pagamento (Caixa → Diário), da maior pra
 * menor, como pares [rótulo, total]. Pela chave (#790): "cartao_debito" do
 * faturamento e "Cartão de débito" do lançamento manual caem juntos, com o
 * rótulo do primeiro que apareceu. Saiu da tela na #875, sem mudar a conta.
 */
export function totaisPorFormaDePagamento(
  movimentos: readonly Pick<MovimentoCaixa, "tipo" | "forma_pagamento" | "valor">[],
): [string, number][] {
  const mapa = new Map<string, [string, number]>();
  for (const m of movimentos) {
    if (m.tipo !== "entrada") continue;
    const chave = m.forma_pagamento ? chaveDaForma(m.forma_pagamento) : "";
    const rotulo = m.forma_pagamento ? rotuloDaForma(m.forma_pagamento) : "Não informado";
    const [, total] = mapa.get(chave) ?? [rotulo, 0];
    mapa.set(chave, [rotulo, total + m.valor]);
  }
  return [...mapa.values()].sort((a, b) => b[1] - a[1]);
}
