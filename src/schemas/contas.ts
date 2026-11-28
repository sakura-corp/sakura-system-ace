import { z } from "zod";
import { semAcento } from "./buscaGlobal";
import { FORMAS_DO_LANCAMENTO, type FormaDoLancamento } from "./caixa";
import { deCentavos, formatarMoeda, paraCentavos, somar } from "./dinheiro";

/**
 * As contas das telas de Contas a Pagar e a Receber (#1094, visual da leva 8):
 * a soma das atrasadas (o número em destaque), o filtro por mês e o aviso do
 * valor pago diferente da conta. Conta de dinheiro nunca dentro de tela
 * (`docs/licoes.md`, item 49): as duas telas usam daqui.
 *
 * Serve pras duas tabelas: em Contas a Pagar a conta quitada tem o status
 * "paga"; em Contas a Receber, "recebido". O que importa aqui é só se ainda
 * está "pendente".
 *
 * Os dias são "AAAA-MM-DD" (o `vencimento` é uma coluna `date`, e o `hoje`
 * vem do `hojeLocal()`): comparar o texto basta, sem `Date` e sem fuso
 * (itens 34, 42 e 48).
 */
export type ContaDaLista = { vencimento: string; valor: number; status: string };

/** "todos" = sem filtro de mês. Os outros são "AAAA-MM". */
export type MesDoFiltro = string;
export const TODOS_OS_MESES = "todos";

function pendente(conta: ContaDaLista): boolean {
  return conta.status === "pendente";
}

function atrasada(conta: ContaDaLista, hoje: string): boolean {
  return pendente(conta) && conta.vencimento < hoje;
}

/**
 * As contas atrasadas, de QUALQUER mês: ainda pendentes e com o vencimento
 * antes de hoje. A que vence hoje ainda não está atrasada. É o número em
 * destaque das duas telas, e não segue o filtro de mês: a conta de outubro
 * que ficou pra trás é justamente a que não pode sumir da vista.
 */
export function resumoDasAtrasadas(contas: readonly ContaDaLista[], hoje: string) {
  const atrasadas = contas.filter((c) => atrasada(c, hoje));
  return { quantas: atrasadas.length, total: somar(atrasadas.map((c) => c.valor)) };
}

/**
 * A busca da lista: cada palavra digitada tem de aparecer em algum dos textos
 * da conta (descrição, cliente, categoria), sem ligar pra acento nem maiúscula.
 */
export function casaComABusca(textos: ReadonlyArray<string | null | undefined>, busca: string): boolean {
  const palavras = semAcento(busca.trim().toLowerCase()).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return true;
  const alvo = semAcento(textos.filter(Boolean).join(" ").toLowerCase());
  return palavras.every((palavra) => alvo.includes(palavra));
}

/** O mês ("AAAA-MM") de um dia "AAAA-MM-DD". */
export function mesDoDia(dia: string): string {
  return dia.slice(0, 7);
}

const NOMES_DOS_MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2026-11" → "novembro de 2026". */
export function nomeDoMes(mes: string): string {
  const [ano, numero] = mes.split("-");
  return `${NOMES_DOS_MESES[Number(numero) - 1] ?? numero} de ${ano}`;
}

/** As contas que vencem no mês escolhido (pelo vencimento). "todos": todas. */
export function contasDoMes<T extends ContaDaLista>(contas: readonly T[], mes: MesDoFiltro): T[] {
  if (mes === TODOS_OS_MESES) return [...contas];
  return contas.filter((c) => mesDoDia(c.vencimento) === mes);
}

/**
 * Os meses que o filtro oferece: os que têm alguma conta, sempre o mês de
 * hoje (é o que a tela abre mostrando) e o mês que está escolhido (excluir a
 * última conta dele, ou trocar de loja, não pode deixar o seletor mostrando
 * um mês e a lista filtrando outro), do mais novo pro mais velho.
 */
export function mesesParaEscolher(
  contas: readonly ContaDaLista[],
  hoje: string,
  escolhido: MesDoFiltro = TODOS_OS_MESES,
): string[] {
  const meses = new Set(contas.map((c) => mesDoDia(c.vencimento)));
  meses.add(mesDoDia(hoje));
  if (escolhido !== TODOS_OS_MESES) meses.add(escolhido);
  return [...meses].sort().reverse();
}

/**
 * O mês filtrado em números: quantas contas, o total delas (pagas ou não) e o
 * que ainda falta pagar ou receber. É o "contra o quê?" do número das
 * atrasadas.
 */
export function resumoDoMes(contas: readonly ContaDaLista[], mes: MesDoFiltro) {
  const doMes = contasDoMes(contas, mes);
  return {
    quantas: doMes.length,
    total: somar(doMes.map((c) => c.valor)),
    falta: somar(doMes.filter(pendente).map((c) => c.valor)),
  };
}

/**
 * A ordem da lista: o atrasado aparece primeiro (o mais velho em cima),
 * depois o que ainda vai vencer (o mais perto em cima) e, por último, o que
 * já foi pago ou recebido (o mais novo em cima).
 */
export function ordenarParaALista<T extends ContaDaLista>(contas: readonly T[], hoje: string): T[] {
  const grupo = (c: T) => (atrasada(c, hoje) ? 0 : pendente(c) ? 1 : 2);
  return [...contas].sort((a, b) => {
    const diferencaDeGrupo = grupo(a) - grupo(b);
    if (diferencaDeGrupo !== 0) return diferencaDeGrupo;
    return grupo(a) === 2 ? b.vencimento.localeCompare(a.vencimento) : a.vencimento.localeCompare(b.vencimento);
  });
}

const CHAVES_DAS_FORMAS = FORMAS_DO_LANCAMENTO.map((f) => f.valor) as [
  FormaDoLancamento,
  ...FormaDoLancamento[],
];

/**
 * A janela de pagar (ou receber) uma conta. A forma de pagamento é escolhida
 * na MESMA lista do Caixa (#1089): o que fica gravado é a chave ("pix"), a
 * mesma que o faturamento da OS e o lançamento manual gravam. Antes era um
 * campo de texto livre.
 */
export const quitarContaSchema = z.object({
  valor: z.string().refine((v) => Number(v) > 0, "Informe um valor maior que zero."),
  formaPagamento: z.enum(CHAVES_DAS_FORMAS, { message: "Escolha a forma de pagamento." }),
});

export type QuitarContaValues = z.infer<typeof quitarContaSchema>;

/** Abre com o valor da conta e "Dinheiro", como antes. */
export function quitarContaVazio(valorDaConta: number): QuitarContaValues {
  return { valor: String(valorDaConta), formaPagamento: "dinheiro" };
}

export type DiferencaDoValor =
  | { tipo: "igual"; diferenca: 0 }
  | { tipo: "a_mais" | "a_menos"; diferenca: number };

/** Quanto o valor digitado passa (ou falta) da conta, em centavos fechados. */
export function diferencaDoValor(digitado: number, daConta: number): DiferencaDoValor {
  const centavos = paraCentavos(digitado) - paraCentavos(daConta);
  if (centavos === 0) return { tipo: "igual", diferenca: 0 };
  return { tipo: centavos > 0 ? "a_mais" : "a_menos", diferenca: deCentavos(Math.abs(centavos)) };
}

/**
 * O aviso ao lado do valor, na janela de pagar ou receber: "R$ 30,00 a mais
 * que a conta". É AVISO, nunca tranca (#1079, item 14; `docs/licoes.md`,
 * item 33): pagar com juros ou receber uma parte é legítimo, e o valor
 * diferente pode ser salvo. Sem valor (campo vazio, zero) não avisa: aí quem
 * fala é a validação do campo.
 */
export function avisoDoValorDiferente(digitado: number, daConta: number): string | null {
  if (!Number.isFinite(digitado) || digitado <= 0) return null;
  const { tipo, diferenca } = diferencaDoValor(digitado, daConta);
  if (tipo === "igual") return null;
  return `${formatarMoeda(diferenca)} ${tipo === "a_mais" ? "a mais" : "a menos"} que a conta`;
}
