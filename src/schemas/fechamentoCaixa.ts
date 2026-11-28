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
import { arredondarCentavo, formatarMoeda, somar } from "./dinheiro";

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
 * O faturamento de OS, o pagamento de conta e o lançamento manual gravam a
 * chave `dinheiro` (o lançamento manual escolhe numa lista desde a #1089).
 * Antes disso o lançamento manual era um campo de texto livre que aceitava
 * qualquer coisa, e esse histórico continua no banco — daí aceitar os jeitos
 * comuns de escrever.
 */
export function ehDinheiro(forma: string | null | undefined): boolean {
  if (!forma) return false;
  const f = normalizar(forma);
  return f === "dinheiro" || f === "especie" || f === "em especie" || f === "din";
}

/**
 * A chave de agrupamento de uma forma de pagamento. O faturamento e o
 * lançamento manual (desde a #1089) gravam a chave ("pix", "cartao_credito"),
 * mas o lançamento manual antigo e as janelas de pagar e receber conta ainda
 * têm texto livre — "Pix", "PIX" e "Cartão de crédito" precisam cair no mesmo
 * grupo, senão a conferência com o extrato mostraria o Pix do dia partido em
 * dois.
 */
export function chaveDaForma(forma: string): string {
  const f = normalizar(forma).replace(/\s+de\s+/g, "_").replace(/\s+/g, "_");
  return f;
}

/**
 * As duas formas que só o lançamento manual tem (a lista de
 * `FORMAS_DO_LANCAMENTO`, em `./caixa`, #1089). Ficam aqui, e não no
 * `FORMA_PAGAMENTO_LABEL`, porque aquele alimenta o faturar da OS, que não
 * oferece transferência nem "outro".
 */
const ROTULO_SO_DO_LANCAMENTO: Record<string, string> = {
  transferencia: "Transferência",
  outro: "Outro",
};

/**
 * O nome que a tela mostra pra uma forma de pagamento gravada. A chave vira
 * o nome ("pix" → "Pix"); o texto livre antigo que não é chave conhecida
 * aparece como foi escrito ("Vale da loja").
 */
export function rotuloDaForma(forma: string): string {
  const chave = chaveDaForma(forma);
  return FORMA_PAGAMENTO_LABEL[chave] ?? ROTULO_SO_DO_LANCAMENTO[chave] ?? forma;
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
 * A diferença em palavras, pro número grande do fechamento passo a passo
 * (#1090): "Faltam R$ 69,00", "Sobram R$ 5,00", "Bateu certinho". O valor vai
 * sem sinal (a palavra já diz o lado); a cor e o ícone a tela escolhe pela
 * `situacao`. Qualquer centavo já é falta ou sobra: nada é arredondado pra
 * "bateu".
 */
export function fraseDaDiferenca(diferenca: number): { situacao: SituacaoDaDiferenca; frase: string } {
  const situacao = situacaoDaDiferenca(diferenca);
  if (situacao === "bateu") return { situacao, frase: "Bateu certinho" };
  const valor = formatarMoeda(Math.abs(diferenca));
  return { situacao, frase: situacao === "faltou" ? `Faltam ${valor}` : `Sobram ${valor}` };
}

/** As notas que existem, da maior pra menor (a ajuda pra contar a gaveta). */
export const NOTAS_DA_GAVETA = [200, 100, 50, 20, 10, 5, 2] as const;

export interface LinhaDaContagem {
  nota: number;
  quantidade: number;
  /** nota × quantidade. */
  valor: number;
}

/** "3" → 3; vazio, letra ou negativo → 0; "1.9" → 1 (não existe meia nota). */
function quantidadeDeNotas(texto: string | undefined): number {
  const n = Number((texto ?? "").trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
}

/** "3,75" ou "3.75" → 3,75; vazio, letra ou negativo → 0. */
function valorDasMoedas(texto: string | undefined): number {
  const n = Number((texto ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return arredondarCentavo(n);
}

/**
 * A ajuda OPCIONAL pra contar a gaveta (#1090): quantas notas de cada valor e
 * o valor das moedas, somados no centavo. O resultado vai pro campo "contado";
 * a conta do fechamento continua a mesma (contado − esperado).
 *
 * @param notas a quantidade digitada de cada nota, pela nota ("100": "2")
 * @param moedas o valor das moedas, como foi digitado ("3,75")
 */
export function somarAGaveta(
  notas: Readonly<Record<string, string | undefined>>,
  moedas: string | undefined,
): { linhas: LinhaDaContagem[]; moedas: number; total: number } {
  const linhas = NOTAS_DA_GAVETA.map((nota) => {
    const quantidade = quantidadeDeNotas(notas[String(nota)]);
    return { nota, quantidade, valor: somar([nota * quantidade]) };
  });
  const valorMoedas = valorDasMoedas(moedas);
  return { linhas, moedas: valorMoedas, total: somar([...linhas.map((l) => l.valor), valorMoedas]) };
}

/**
 * É o primeiro fechamento da loja? (#1090, #1079 item 13) Sem nenhum
 * fechamento ANTES do dia, o troco da manhã não tem de onde vir sugerido, e a
 * tela pede: "diga quanto tinha na gaveta ao abrir".
 */
export function ehPrimeiroFechamento(fechamentos: readonly Pick<FechamentoCaixa, "data">[], dia: string): boolean {
  return !fechamentos.some((f) => f.data < dia);
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
