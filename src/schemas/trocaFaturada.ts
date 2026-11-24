/**
 * Trocar peça ou serviço de uma OS já faturada, com o total igual (#1145).
 *
 * As contas da janela "antes e depois". Quem decide de verdade é o banco
 * (`trocar_itens_os_faturada`, migration 0087): ele confere o total, o
 * gerente, a nota, o caixa do dia e o estoque de novo, com a OS travada. Aqui
 * é só pra a tela avisar antes, em português, sem a pessoa precisar errar.
 *
 * A conta do total é a mesma do faturar (`somarValoresLiquidos`, com a folga
 * de meio centavo da migration 0086): a OS foi faturada por ela.
 */

import { arredondarCentavo, formatarMoeda, repartirEmCentavos } from "./dinheiro";
import { somarValoresLiquidos, valorLiquidoDoItem } from "./valorItem";
import type { TipoItemOS } from "@/types/os";

/** Um item da lista final. Com `id`: um que já existe e fica; sem: novo. */
export interface ItemDaTroca {
  id?: string;
  tipo: TipoItemOS;
  peca_id: string | null;
  servico_id: string | null;
  tecnico_id: string | null;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  custo_unitario?: number | null;
}

/**
 * O total da lista, ou `null` se algum número ainda não é número (campo
 * vazio ou digitado pela metade): a tela mostra "—" em vez de NaN.
 */
export function totalDaLista(itens: readonly ItemDaTroca[]): number | null {
  const total = somarValoresLiquidos(itens);
  return Number.isFinite(total) ? total : null;
}

/** O total novo é o faturado? (até meio centavo, como o banco). */
export function totalConfere(antes: readonly ItemDaTroca[], depois: readonly ItemDaTroca[]): boolean {
  return Math.abs(somarValoresLiquidos(antes) - somarValoresLiquidos(depois)) <= 0.005;
}

function mesmoItem(a: ItemDaTroca, b: ItemDaTroca): boolean {
  return (
    a.tipo === b.tipo &&
    (a.peca_id ?? null) === (b.peca_id ?? null) &&
    (a.servico_id ?? null) === (b.servico_id ?? null) &&
    (a.tecnico_id ?? null) === (b.tecnico_id ?? null) &&
    a.descricao.trim() === b.descricao.trim() &&
    a.quantidade === b.quantidade &&
    a.preco_unitario === b.preco_unitario &&
    a.desconto === b.desconto
  );
}

/**
 * O que sai e o que entra, pra janela de confirmar. Item que ficou igual não
 * aparece; item corrigido aparece nos dois (como era → como fica).
 */
export function resumoDaTroca(
  antes: readonly ItemDaTroca[],
  depois: readonly ItemDaTroca[],
): { saem: ItemDaTroca[]; entram: ItemDaTroca[] } {
  const depoisPorId = new Map(depois.filter((i) => i.id).map((i) => [i.id, i]));
  const antesPorId = new Map(antes.filter((i) => i.id).map((i) => [i.id, i]));
  const saem = antes.filter((a) => {
    const d = a.id ? depoisPorId.get(a.id) : undefined;
    return !d || !mesmoItem(a, d);
  });
  const entram = depois.filter((d) => {
    const a = d.id ? antesPorId.get(d.id) : undefined;
    return !a || !mesmoItem(a, d);
  });
  return { saem, entram };
}

/**
 * Por que a lista não pode ser confirmada (ou `null`). O total diferente
 * explica que mudar valor vem depois (decisão da Sofia, 20/11/2026).
 */
export function problemaDaTroca(
  antes: readonly ItemDaTroca[],
  depois: readonly ItemDaTroca[],
): string | null {
  if (depois.length === 0) return "A OS precisa continuar com pelo menos um item.";
  // Peça sem cadastro (avulsa, #655) que já estava na OS e continua avulsa
  // pode ficar; peça nova ou trocada precisa ser do cadastro (é ela que mexe
  // no estoque).
  const avulsasDeAntes = new Set(
    antes.filter((i) => i.tipo === "peca" && !i.peca_id && i.id).map((i) => i.id),
  );
  for (const item of depois) {
    if (item.tipo === "peca" && !item.peca_id && !(item.id && avulsasDeAntes.has(item.id))) {
      return "Escolha a peça do cadastro em cada linha de peça.";
    }
    if (!item.descricao.trim()) return "Cada item precisa de uma descrição.";
    if (!(item.quantidade > 0)) return "A quantidade de cada item precisa ser maior que zero.";
    if (item.preco_unitario < 0 || item.desconto < 0) return "Preço e desconto não podem ser negativos.";
    if (item.desconto > item.quantidade * item.preco_unitario) {
      return `O desconto de "${item.descricao}" é maior que o valor do item.`;
    }
  }
  const { saem, entram } = resumoDaTroca(antes, depois);
  if (saem.length === 0 && entram.length === 0) return "Nada mudou nos itens.";
  // Total diferente agora pode (#1182): a diferença é acertada no Caixa de
  // hoje (ou na conta a receber), no 2º passo da janela.
  return null;
}

/** Quanto cada peça do cadastro muda: positivo = sai mais do estoque. */
function diferencaPorPeca(
  antes: readonly ItemDaTroca[],
  depois: readonly ItemDaTroca[],
): Map<string, number> {
  const dif = new Map<string, number>();
  const somar = (itens: readonly ItemDaTroca[], sinal: number) => {
    for (const item of itens) {
      if (item.tipo !== "peca" || !item.peca_id) continue;
      dif.set(item.peca_id, (dif.get(item.peca_id) ?? 0) + sinal * item.quantidade);
    }
  };
  somar(depois, 1);
  somar(antes, -1);
  return dif;
}

export interface PecaNegativa {
  pecaId: string;
  descricao: string;
  saldoDepois: number;
}

/**
 * As peças que vão baixar e ficar com saldo negativo na loja. A peça que volta
 * pro estoque nunca é aviso.
 */
export function pecasQueFicamNegativas(
  antes: readonly ItemDaTroca[],
  depois: readonly ItemDaTroca[],
  saldoPorPeca: ReadonlyMap<string, number>,
  nomePorPeca: ReadonlyMap<string, string>,
): PecaNegativa[] {
  const resultado: PecaNegativa[] = [];
  for (const [pecaId, diferenca] of diferencaPorPeca(antes, depois)) {
    if (diferenca <= 0) continue;
    const saldoDepois = Math.round(((saldoPorPeca.get(pecaId) ?? 0) - diferenca) * 100) / 100;
    if (saldoDepois < 0) {
      resultado.push({ pecaId, descricao: nomePorPeca.get(pecaId) ?? "Peça", saldoDepois });
    }
  }
  return resultado;
}

/** Por que o botão "Trocar peça ou serviço" não aparece (ou `null`). */
export function motivoParaNaoTrocar(situacao: {
  faturada: boolean;
  gerente: boolean;
  temNota: boolean;
  /**
   * O caixa de HOJE já foi fechado (#1182): a diferença entra nele, então
   * trava. O caixa do dia da fatura fechado não trava mais.
   */
  caixaDeHojeFechado?: boolean;
}): string | null {
  if (!situacao.faturada) return "Só OS faturada passa por esta troca.";
  if (!situacao.gerente) {
    return "Só quem é gerente (administrador da loja) pode trocar peça ou serviço de uma OS faturada.";
  }
  if (situacao.temNota) {
    return (
      "Esta OS já tem nota fiscal emitida: não dá pra trocar peça ou serviço, porque a nota ficaria diferente da OS. " +
      "Cancele a nota antes (o cancelamento tem prazo) e depois corrija."
    );
  }
  if (situacao.caixaDeHojeFechado) {
    return "O caixa de hoje já foi fechado: desfaça o fechamento de hoje antes de corrigir a OS.";
  }
  return null;
}

/**
 * Quanto o total muda com a correção (#1182): o total novo menos o faturado,
 * fechado no centavo. Positivo = subiu; negativo = desceu; zero = o caminho de
 * total igual de sempre (#1145).
 */
export function diferencaDaCorrecao(
  antes: readonly ItemDaTroca[],
  depois: readonly ItemDaTroca[],
): number {
  // `|| 0` tira o "-0" (desceu nada), que a tela mostraria como "-R$ 0,00".
  return arredondarCentavo(somarValoresLiquidos(depois) - somarValoresLiquidos(antes)) || 0;
}

/**
 * Como a diferença é acertada (#1182). Os mesmos nomes da coluna `acerto` de
 * `ordens_servico_trocas`:
 * - `conta_aberta`: a OS foi faturada "a receber" e a conta ainda não foi
 *   recebida → a conta muda de valor, nada entra no Caixa;
 * - `pago_agora`: o cliente paga a diferença agora → Entrada no Caixa de hoje;
 * - `a_receber`: a diferença fica a receber → conta a receber nova, só dela;
 * - `devolvido`: a loja devolve a diferença agora → Saída no Caixa de hoje
 *   ("Devolução ao cliente").
 */
export type AcertoDaCorrecao = "conta_aberta" | "pago_agora" | "a_receber" | "devolvido";

/**
 * Quais acertos a janela oferece, e qual já vem marcado (decisão da Sofia,
 * 24/11/2026). Total igual não tem acerto. "Paga" é tudo que não é a conta do
 * faturamento ainda em aberto: recebido na hora, ou a conta já recebida.
 */
export function acertosDaCorrecao(situacao: {
  diferenca: number;
  contaDoFaturamentoEmAberto: boolean;
}): { opcoes: AcertoDaCorrecao[]; padrao: AcertoDaCorrecao | null } {
  if (situacao.diferenca === 0) return { opcoes: [], padrao: null };
  if (situacao.contaDoFaturamentoEmAberto) return { opcoes: ["conta_aberta"], padrao: "conta_aberta" };
  if (situacao.diferenca > 0) return { opcoes: ["pago_agora", "a_receber"], padrao: "pago_agora" };
  return { opcoes: ["devolvido"], padrao: "devolvido" };
}

/**
 * O atalho "Manter o total de R$ X" (#1182, é o "a loja não cobra"): a
 * diferença vira desconto nos itens que entraram ou mudaram, repartida pelo
 * valor de cada um, e a correção segue o caminho de total igual. Cabe sempre:
 * a diferença é o que entrou menos o que saiu, então nunca passa do valor do
 * que entrou. Só existe quando o total subiu (`null` nos outros casos).
 */
export function manterOTotal(
  antes: readonly ItemDaTroca[],
  depois: readonly ItemDaTroca[],
): ItemDaTroca[] | null {
  const diferenca = diferencaDaCorrecao(antes, depois);
  if (!(diferenca > 0)) return null;
  const { entram } = resumoDaTroca(antes, depois);
  const partes = repartirEmCentavos(
    diferenca,
    entram.map((item) => Math.max(0, valorLiquidoDoItem(item))),
  );
  const descontoExtra = new Map(entram.map((item, indice) => [item, partes[indice]]));
  return depois.map((item) => {
    const extra = descontoExtra.get(item);
    return extra ? { ...item, desconto: arredondarCentavo(item.desconto + extra) } : item;
  });
}

/** "2026-11-24" → "24/11"; "2026-12-10" → "10/12/2026" (sem `new Date`, que leria em UTC). */
function diaEMes(dia: string): string {
  const [, mes, d] = dia.split("-");
  return `${d}/${mes}`;
}
function diaMesAno(dia: string): string {
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

/**
 * O rodapé do 2º passo: o que a correção vai lançar, com o valor e o dia
 * (#1182). `hoje` e `vencimento` são dias de calendário ("YYYY-MM-DD");
 * `valorDaConta` é o valor de hoje da conta do faturamento em aberto.
 */
export function textoDoAcerto(dados: {
  acerto: AcertoDaCorrecao | null;
  diferenca: number;
  hoje: string;
  vencimento?: string;
  valorDaConta?: number;
}): string {
  const valor = formatarMoeda(Math.abs(dados.diferenca));
  switch (dados.diferenca === 0 ? null : dados.acerto) {
    case "pago_agora":
      return `Lança ${valor} como Entrada no Caixa de hoje, ${diaEMes(dados.hoje)}.`;
    case "devolvido":
      return `Lança ${valor} como Saída (Devolução ao cliente) no Caixa de hoje, ${diaEMes(dados.hoje)}.`;
    case "a_receber":
      return (
        `Cria uma conta a receber de ${valor}` +
        (dados.vencimento ? `, com vencimento em ${diaMesAno(dados.vencimento)}` : "") +
        ". Nada entra no Caixa hoje."
      );
    case "conta_aberta": {
      const contaAntes = dados.valorDaConta ?? 0;
      const contaDepois = arredondarCentavo(contaAntes + dados.diferenca);
      return `A conta a receber da OS passa de ${formatarMoeda(contaAntes)} para ${formatarMoeda(contaDepois)}. Nada entra no Caixa.`;
    }
    default:
      return "O total não muda: nada entra no Caixa.";
  }
}

/**
 * Por que o 2º passo ainda não pode confirmar (ou `null`): o acerto tem que
 * valer pro caso, e cada acerto pede o que precisa (#1182). O banco confere
 * tudo de novo; aqui é só pra a tela avisar antes.
 */
export function problemaDoAcerto(dados: {
  diferenca: number;
  contaDoFaturamentoEmAberto: boolean;
  acerto: AcertoDaCorrecao | null;
  formaPagamento?: string;
  vencimento?: string;
  hoje: string;
}): string | null {
  const { opcoes } = acertosDaCorrecao(dados);
  if (opcoes.length === 0) return null;
  if (!dados.acerto || !opcoes.includes(dados.acerto)) return "Escolha como acertar a diferença.";
  if ((dados.acerto === "pago_agora" || dados.acerto === "devolvido") && !dados.formaPagamento) {
    return "Escolha a forma de pagamento.";
  }
  if (dados.acerto === "a_receber") {
    if (!dados.vencimento) return "Informe o vencimento da diferença.";
    // "YYYY-MM-DD" compara certo como texto.
    if (dados.vencimento < dados.hoje) return "O vencimento não pode ser antes de hoje.";
  }
  return null;
}
