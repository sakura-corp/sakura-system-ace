import { z } from "zod";
import { diaLocal } from "@/lib/datas";
import type { MovimentoCaixa, NovoMovimentoCaixa, TipoCaixa } from "@/types/caixa";
import { arredondarCentavo, somar } from "./dinheiro";
import { chaveDaForma, ehDinheiro } from "./fechamentoCaixa";
import { resumirMovimentos, type CustoDaOrdem } from "./metricasCaixa";

/**
 * As formas de pagamento do lançamento manual (#1089). Antes era um campo de
 * texto livre, e cada um escrevia de um jeito ("Pix", "PIX", "pix do João"):
 * a conta da gaveta precisava adivinhar o que era dinheiro. Agora escolhe numa
 * lista, e o que fica gravado é a CHAVE (ex: "pix") — a mesma que o
 * faturamento da OS e o pagamento de conta já gravam.
 *
 * O texto livre antigo continua no histórico e continua sendo entendido
 * (`ehDinheiro` e `chaveDaForma`, em `./fechamentoCaixa`).
 */
export const FORMAS_DO_LANCAMENTO = [
  { valor: "dinheiro", nome: "Dinheiro" },
  { valor: "pix", nome: "Pix" },
  { valor: "cartao_debito", nome: "Cartão de débito" },
  { valor: "cartao_credito", nome: "Cartão de crédito" },
  { valor: "transferencia", nome: "Transferência" },
  { valor: "outro", nome: "Outro" },
] as const;

export type FormaDoLancamento = (typeof FORMAS_DO_LANCAMENTO)[number]["valor"];

const CHAVES_DAS_FORMAS = FORMAS_DO_LANCAMENTO.map((f) => f.valor) as [
  FormaDoLancamento,
  ...FormaDoLancamento[],
];

export const caixaFormSchema = z.object({
  tipo: z.enum(["entrada", "saida"]),
  // Obrigatória desde o item TL-27 do guia. Era opcional, e o resultado
  // aparecia na própria tela de Saídas: "Por categoria — Sem categoria:
  // R$ 31.000,00", o mês inteiro de despesa num balde só. Categoria opcional
  // é, na prática, relatório por categoria que não existe.
  //
  // Quem não souber onde encaixar escolhe "Outros", que a migration 0050
  // semeia pros dois tipos justamente pra esta regra ser sempre cumprível.
  categoria_id: z.string().min(1, "Escolha uma categoria."),
  valor: z.string().refine((v) => Number(v) > 0, "Informe um valor maior que zero."),
  forma_pagamento: z.enum(CHAVES_DAS_FORMAS, { message: "Escolha a forma de pagamento." }),
  descricao: z.string(),
});

export type CaixaFormValues = z.infer<typeof caixaFormSchema>;

export function caixaFormVazio(tipoInicial: "entrada" | "saida"): CaixaFormValues {
  return {
    tipo: tipoInicial,
    categoria_id: "",
    valor: "",
    forma_pagamento: "dinheiro",
    descricao: "",
  };
}

export function paraNovoMovimentoCaixa(valores: CaixaFormValues): NovoMovimentoCaixa {
  return {
    ordem_servico_id: null,
    tipo: valores.tipo,
    forma_pagamento: valores.forma_pagamento || null,
    valor: Number(valores.valor),
    descricao: valores.descricao.trim() || null,
    categoria_id: valores.categoria_id || null,
  };
}

/**
 * Lançamento manual é o que NÃO nasceu de uma OS faturada.
 *
 * O faturamento de uma OS entra no caixa sem categoria e assim deve ficar —
 * ele é venda, aparece na aba Diário, e não é despesa nem entrada avulsa pra
 * classificar. Por isso tudo nesta parte do módulo (as abas Entradas e
 * Saídas, o bloco "Por categoria" e o conserto do histórico abaixo) olha
 * sempre para o mesmo recorte: `ordem_servico_id` nulo (a não ser a saída
 * ligada a uma OS, a devolução da #1182, que é saída como as outras).
 *
 * Os lançamentos que a conta a pagar/receber gera AO SER quitada entram aqui
 * de propósito — eles herdam a categoria da conta, que também é opcional, e
 * quando ela vem vazia o lançamento fica sem categoria do mesmo jeito.
 */
export function movimentosManuais(
  movimentos: readonly MovimentoCaixa[],
  tipo: TipoCaixa,
): MovimentoCaixa[] {
  // A saída ligada a uma OS (a devolução da correção de OS faturada, #1182)
  // entra: é dinheiro que saiu da gaveta, com categoria, como qualquer saída
  // (Sofia, 24/11/2026). Só a ENTRADA de OS (o faturamento) fica de fora.
  return movimentos.filter((m) => m.tipo === tipo && (!m.ordem_servico_id || m.tipo === "saida"));
}

/**
 * O passado a consertar: os manuais daquele tipo que ficaram sem categoria.
 *
 * Tornar a categoria obrigatória conserta só o futuro. Sem oferecer o
 * conserto do histórico, o relatório por categoria continua errado pra
 * sempre — os R$ 31.000,00 já lançados não se movem sozinhos.
 */
export function movimentosSemCategoria(
  movimentos: readonly MovimentoCaixa[],
  tipo: TipoCaixa,
): MovimentoCaixa[] {
  return movimentosManuais(movimentos, tipo).filter((m) => !m.categoria_id);
}

export interface ResumoSemCategoria {
  quantidade: number;
  total: number;
}

/** Quantos lançamentos estão sem categoria e quanto dinheiro eles somam. */
export function resumirSemCategoria(
  movimentos: readonly MovimentoCaixa[],
  tipo: TipoCaixa,
): ResumoSemCategoria {
  const semCategoria = movimentosSemCategoria(movimentos, tipo);
  return {
    quantidade: semCategoria.length,
    total: somar(semCategoria.map((m) => m.valor)),
  };
}

export interface GrupoDeCategoria {
  categoriaId: string;
  ids: string[];
}

/**
 * Junta as escolhas por categoria, pra gravar em poucas chamadas em vez de
 * uma por linha — trinta lançamentos viram duas ou três atualizações.
 *
 * Linha deixada em branco fica de fora: quem não soube classificar um
 * lançamento agora continua podendo classificar depois, e nada é gravado por
 * acidente.
 */
export function agruparPorCategoria(
  atribuicoes: Readonly<Record<string, string>>,
): GrupoDeCategoria[] {
  const grupos = new Map<string, string[]>();

  for (const [movimentoId, categoriaId] of Object.entries(atribuicoes)) {
    if (!categoriaId) continue;
    const ids = grupos.get(categoriaId);
    if (ids) ids.push(movimentoId);
    else grupos.set(categoriaId, [movimentoId]);
  }

  return [...grupos.entries()].map(([categoriaId, ids]) => ({ categoriaId, ids }));
}

/**
 * Quanto cada categoria soma (Caixa → Entradas/Saídas), da maior pra menor.
 * Saiu da tela na #875; a conta é a mesma de antes (soma direta, sem
 * arredondar por categoria — a tela formata no centavo).
 */
export function totaisPorCategoria(
  movimentos: readonly Pick<MovimentoCaixa, "valor" | "categoria">[],
): [string, number][] {
  const mapa = new Map<string, number>();
  for (const m of movimentos) {
    const nome = m.categoria?.nome ?? "Sem categoria";
    mapa.set(nome, (mapa.get(nome) ?? 0) + m.valor);
  }
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Só os lançamentos de UM dia ("YYYY-MM-DD"), no fuso de quem usa. É o que a
 * página única do Caixa mostra (#1089): o dia escolhido, nunca "todo o
 * período" misturado.
 *
 * O dia sai de `diaLocal`, nunca do pedaço de texto do horário: no Brasil,
 * das 21h em diante o horário gravado (UTC) já é de amanhã, e a venda da
 * noite sumiria do dia (item 34 de `docs/licoes.md`).
 */
export function movimentosDoDia(movimentos: readonly MovimentoCaixa[], dia: string): MovimentoCaixa[] {
  return movimentos.filter((m) => diaLocal(m.data) === dia);
}

/** O filtro da lista do dia: tudo, só as entradas ou só as saídas. */
export type FiltroDoCaixa = "tudo" | "entrada" | "saida";

export function filtrarPorTipo(movimentos: readonly MovimentoCaixa[], filtro: FiltroDoCaixa): MovimentoCaixa[] {
  if (filtro === "tudo") return [...movimentos];
  return movimentos.filter((m) => m.tipo === filtro);
}

/**
 * O "Total" no rodapé da lista filtrada: as entradas somam e as saídas
 * subtraem. Com `somar`, no centavo — num reduce solto, 0,1 + 0,2 vira
 * 0,30000000000000004.
 */
export function totalDoFiltro(movimentos: readonly MovimentoCaixa[]): number {
  return somar(movimentos.map((m) => (m.tipo === "saida" ? -m.valor : m.valor)));
}

/**
 * O dia anterior a "YYYY-MM-DD" (a seta ‹ da página do Caixa). O `Date` do
 * JavaScript já sabe virar mês, ano e fevereiro bissexto; o horário fica no
 * MEIO-DIA local de propósito, porque meia-noite é justamente a hora que o
 * horário de verão pula, e o dia sai pelo `diaLocal`, nunca pelo UTC.
 */
export function diaAnterior(dia: string): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  return diaLocal(new Date(ano, mes - 1, d - 1, 12));
}

/** Os números do topo da página do Caixa, pro dia escolhido (#1089). */
export interface ResumoDoDiaDoCaixa {
  /** Tudo que entrou no dia (vendas de OS + entradas manuais). */
  entradas: number;
  /** Tudo que saiu no dia. */
  saidas: number;
  /** Entradas − saídas, de todas as formas. */
  saldo: number;
  /**
   * Quanto o dinheiro VIVO mexeu na gaveta no dia: entradas − saídas em
   * dinheiro. Sem o troco da manhã — esse é do fechamento (`./fechamentoCaixa`).
   */
  gaveta: number;
  /** Entradas − saídas no Pix e nos dois cartões: o que confere com o extrato. */
  pixECartao: number;
  /** O mesmo lucro de sempre (`resumirMovimentos`): entradas − saídas − custo da OS. */
  lucro: number;
}

const FORMAS_DO_EXTRATO = new Set(["pix", "cartao_debito", "cartao_credito"]);

/**
 * Resume o dia do Caixa: o saldo, o que mexeu na gaveta, o que foi pro Pix e
 * cartão, e o lucro.
 *
 * A gaveta usa o MESMO `ehDinheiro` do fechamento, pra o número do topo e o
 * "esperado na gaveta" nunca contarem o dinheiro de jeitos diferentes. O Pix
 * e cartão vai pela `chaveDaForma`, então o texto livre antigo ("PIX",
 * "Cartão de crédito") cai junto com a chave do formulário novo.
 *
 * Transferência, "outro" e lançamento sem forma não passam pela gaveta nem
 * pela maquininha: entram só no saldo.
 *
 * Entradas, saídas e lucro vêm de `resumirMovimentos` (a conta do lucro é a
 * mesma da aba de antes), só arredondados no centavo.
 *
 * @param movimentosDoDia só os lançamentos do dia (`movimentosDoDia`)
 */
export function resumirDiaDoCaixa(
  movimentosDoDia: readonly MovimentoCaixa[],
  custoDaOrdem: CustoDaOrdem,
): ResumoDoDiaDoCaixa {
  const resumo = resumirMovimentos(movimentosDoDia, custoDaOrdem);
  const gaveta: number[] = [];
  const pixECartao: number[] = [];

  for (const m of movimentosDoDia) {
    const forma = m.forma_pagamento?.trim() ?? "";
    if (!forma) continue;
    const valor = m.tipo === "saida" ? -m.valor : m.valor;
    if (ehDinheiro(forma)) gaveta.push(valor);
    else if (FORMAS_DO_EXTRATO.has(chaveDaForma(forma))) pixECartao.push(valor);
  }

  const entradas = arredondarCentavo(resumo.entradas);
  const saidas = arredondarCentavo(resumo.saidas);
  return {
    entradas,
    saidas,
    saldo: somar([entradas, -saidas]),
    gaveta: somar(gaveta),
    pixECartao: somar(pixECartao),
    lucro: arredondarCentavo(resumo.lucro),
  };
}

/**
 * As despesas do MÊS do dia escolhido (o bloco "Saídas do mês" da página do
 * Caixa): o total e quanto cada categoria soma.
 *
 * Usa o mesmo recorte das saídas de sempre (`movimentosManuais`), que já
 * inclui a devolução da correção de OS (#1182). O mês sai do dia local de
 * cada lançamento: a saída lançada às 22h do dia 31 é do mês que acabou, não
 * do seguinte.
 *
 * @param dia "YYYY-MM-DD" de qualquer dia do mês
 */
export function saidasDoMes(
  movimentos: readonly MovimentoCaixa[],
  dia: string,
): { total: number; porCategoria: [string, number][] } {
  const mes = dia.slice(0, 7);
  const doMes = movimentosManuais(movimentos, "saida").filter((m) => diaLocal(m.data).slice(0, 7) === mes);
  return {
    total: somar(doMes.map((m) => m.valor)),
    porCategoria: totaisPorCategoria(doMes),
  };
}
