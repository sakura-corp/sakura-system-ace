import { criarContasPagar } from "./contasPagar";
import { registrarCotacoes } from "./cotacoesPecas";
import { hojeLocal } from "./datas";
import { mensagemDeErro } from "./errors";
import { registrarMovimento } from "./estoque";
import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import type { NovaContaPagar } from "@/types/contaPagar";
import { nomePedido } from "@/types/pedidoCompra";
import type {
  NovoItemPedidoCompra,
  NovoPedidoCompra,
  PedidoCompra,
} from "@/types/pedidoCompra";

const SELECT_PEDIDO =
  "*, fornecedor:fornecedores(nome), itens:pedidos_compra_itens(*, peca:pecas_janela(descricao, unidade))";

export async function listarPedidos(lojaId: string): Promise<PedidoCompra[]> {
  // Por páginas: o Supabase corta em 1.000 linhas. `id` desempata a ordem.
  const data = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("pedidos_compra")
      .select(SELECT_PEDIDO)
      .eq("loja_id", lojaId)
      .order("criado_em", { ascending: false })
      .order("id", { ascending: true })
      .range(de, ate),
  );
  return data as unknown as PedidoCompra[];
}

export async function criarPedido(
  pedido: NovoPedidoCompra,
  itens: NovoItemPedidoCompra[],
  lojaId: string,
  operadorId: string | null,
): Promise<PedidoCompra> {
  const { data: pedidoCriado, error: erroPedido } = await supabase
    .from("pedidos_compra")
    .insert({ ...pedido, loja_id: lojaId, operador_id: operadorId })
    .select()
    .single();
  if (erroPedido) throw erroPedido;

  const { error: erroItens } = await supabase.from("pedidos_compra_itens").insert(
    itens.map((item) => ({ ...item, pedido_compra_id: pedidoCriado.id })),
  );
  if (erroItens) throw erroItens;

  // Todo item com preço lançado (maior que zero — cotacoes_pecas.preco tem
  // `check (preco > 0)`, e preço 0 não é uma cotação de verdade) vira uma
  // cotação nova — sem formulário próprio pra preencher, ver "Cotação de
  // peças por fornecedor" no PROJETO_STATUS.md.
  await registrarCotacoes(
    itens
      .filter((item) => item.preco_unitario !== null && item.preco_unitario > 0)
      .map((item) => ({
        peca_id: item.peca_id,
        fornecedor_id: pedido.fornecedor_id,
        preco: item.preco_unitario as number,
      })),
  );

  return pedidoCriado as PedidoCompra;
}

// A observação do pedido importado guarda o número e a CHAVE da nota: é por
// ela que a próxima importação descobre que a nota já entrou (#1020). Sem
// migration: `contas_pagar` e `pedidos_compra` não têm coluna pra chave.
export function observacaoDaImportacao(numero: string | null, chaveAcesso: string | null): string {
  const base = numero ? `Importado da NFe nº ${numero}` : "Importado de nota fiscal XML";
  return chaveAcesso ? `${base} (chave ${chaveAcesso})` : base;
}

/**
 * O pedido em que esta nota (pela chave de acesso) já foi importada, ou null.
 * Só acha notas importadas a partir da #1020 (as de antes não guardavam a
 * chave). Procura em todas as lojas que a pessoa enxerga: a mesma nota em
 * outra loja também seria estoque e conta em dobro.
 */
export async function buscarPedidoDaNota(chaveAcesso: string): Promise<{ numero: number } | null> {
  // A chave é só dígitos (validada na leitura do XML): não tem % nem _ pra escapar.
  const { data, error } = await supabase
    .from("pedidos_compra")
    .select("numero")
    .ilike("observacao", `%chave ${chaveAcesso}%`)
    .limit(1);
  if (error) throw error;
  const achado = (data as { numero: number }[] | null)?.[0];
  return achado ? { numero: achado.numero } : null;
}

export class NotaJaImportadaError extends Error {
  constructor(numeroPedido: number) {
    super(
      `Esta nota já foi importada (${nomePedido(numeroPedido)}). Nada foi lançado de novo: ` +
        "nem estoque, nem contas a pagar.",
    );
    this.name = "NotaJaImportadaError";
  }
}

export interface ItemImportacaoXml {
  pecaId: string;
  quantidade: number;
  precoUnitario: number;
}

export interface ResultadoImportacaoNota {
  pedido: PedidoCompra;
  /** Quantas contas a pagar entraram (0 se a caixa estava desmarcada). */
  contasLancadas: number;
  /** O pedido entrou, mas as contas a pagar não: o motivo, pra mostrar. */
  erroContas: string | null;
  /**
   * O pedido entrou, mas um passo depois dele (itens ou estoque) falhou: o
   * que entrou e o que não entrou, pra mostrar. As contas não são lançadas.
   */
  erroAntesDasContas: string | null;
  /** A cotação falhou (só aviso: o resto entrou). */
  avisoCotacao: string | null;
}

// Diferente de criarPedido() + receberItensPedido() (fluxo em duas etapas:
// primeiro planeja, depois confere o que chegou): a nota fiscal XML já é a
// prova de que a mercadoria chegou, então o pedido nasce direto "recebido"
// — sem passar por "pendente". Usada por ImportarNotaFiscalXmlModal.tsx.
//
// #1020: também lança as contas a pagar (as parcelas que a pessoa confirmou
// na janela), DEPOIS do pedido, do estoque e da cotação, e num insert só
// (todas ou nenhuma). Se elas falharem, o pedido já entrou: a função não
// lança erro, devolve `erroContas`, pra janela dizer exatamente o que entrou
// e o que não entrou. Nota já importada (mesma chave) é recusada antes de
// gravar qualquer coisa.
export async function importarNotaFiscalCompra(
  fornecedorId: string,
  itens: ItemImportacaoXml[],
  depositoId: string,
  lojaId: string,
  operadorId: string | null,
  observacao: string | null,
  extras: { chaveAcesso: string | null; contas: NovaContaPagar[] } = {
    chaveAcesso: null,
    contas: [],
  },
): Promise<ResultadoImportacaoNota> {
  if (extras.chaveAcesso) {
    let jaImportada: { numero: number } | null = null;
    try {
      jaImportada = await buscarPedidoDaNota(extras.chaveAcesso);
    } catch (err) {
      // Conferir é aviso, nunca tranca (docs/licoes.md, item 33): a janela já
      // avisou que não deu pra conferir.
      console.error("Erro ao conferir se a nota já foi importada:", err);
    }
    if (jaImportada) throw new NotaJaImportadaError(jaImportada.numero);
  }

  const { data: pedidoCriado, error: erroPedido } = await supabase
    .from("pedidos_compra")
    .insert({
      fornecedor_id: fornecedorId,
      data_pedido: hojeLocal(),
      observacao,
      status: "recebido",
      loja_id: lojaId,
      operador_id: operadorId,
    })
    .select()
    .single();
  if (erroPedido) throw erroPedido;

  const pedido = pedidoCriado as PedidoCompra;
  const nome = nomePedido(pedido.numero);
  // Daqui pra frente o pedido (com a chave da nota) já existe: falhar não pode
  // virar um erro solto, senão a pessoa não sabe o que entrou, e a próxima
  // tentativa ainda esbarra na "nota já importada".
  const parcial = (erroAntesDasContas: string): ResultadoImportacaoNota => ({
    pedido,
    contasLancadas: 0,
    erroContas: null,
    erroAntesDasContas,
    avisoCotacao: null,
  });

  const { error: erroItens } = await supabase.from("pedidos_compra_itens").insert(
    itens.map((item) => ({
      pedido_compra_id: pedido.id,
      peca_id: item.pecaId,
      quantidade_pedida: item.quantidade,
      preco_unitario: item.precoUnitario,
      quantidade_recebida: item.quantidade,
    })),
  );
  if (erroItens) {
    console.error("Erro ao gravar os itens do pedido importado:", erroItens);
    return parcial(
      `O ${nome} foi criado, mas os itens dele não foram gravados (${mensagemDeErro(erroItens)}). ` +
        "Nada entrou no estoque e as contas a pagar não foram lançadas.",
    );
  }

  let entradas = 0;
  for (const item of itens) {
    try {
      await registrarMovimento(
        {
          peca_id: item.pecaId,
          deposito_id: depositoId,
          tipo: "entrada",
          quantidade: item.quantidade,
          motivo: "compra",
          referencia: nome,
        },
        lojaId,
      );
      entradas += 1;
    } catch (err) {
      console.error("Erro ao lançar a entrada no estoque do pedido importado:", err);
      return parcial(
        `O ${nome} foi criado com os itens, mas só ${entradas} de ${itens.length} entradas ` +
          `no estoque foram lançadas (${mensagemDeErro(err)}). As contas a pagar não foram lançadas.`,
      );
    }
  }

  // Mesma regra de criarPedido(): preço 0 (ex: NFe sem `vUnCom`) não vira
  // cotação, senão quebra o `check (preco > 0)` de cotacoes_pecas.
  // A cotação é só referência de preço: falhar é aviso, as contas seguem.
  let avisoCotacao: string | null = null;
  try {
    await registrarCotacoes(
      itens
        .filter((item) => item.precoUnitario > 0)
        .map((item) => ({
          peca_id: item.pecaId,
          fornecedor_id: fornecedorId,
          preco: item.precoUnitario,
        })),
    );
  } catch (err) {
    console.error("Erro ao registrar a cotação do pedido importado:", err);
    avisoCotacao = `A cotação de preço não foi registrada (${mensagemDeErro(err)}).`;
  }

  let contasLancadas = 0;
  let erroContas: string | null = null;
  if (extras.contas.length > 0) {
    try {
      await criarContasPagar(extras.contas, lojaId);
      contasLancadas = extras.contas.length;
    } catch (err) {
      console.error("Erro ao lançar as contas a pagar da nota:", err);
      erroContas = mensagemDeErro(err);
    }
  }

  return { pedido, contasLancadas, erroContas, erroAntesDasContas: null, avisoCotacao };
}

export async function cancelarPedido(id: string): Promise<void> {
  const { error } = await supabase
    .from("pedidos_compra")
    .update({ status: "cancelado" })
    .eq("id", id);
  if (error) throw error;
}

export interface RecebimentoItem {
  itemId: string;
  pecaId: string;
  quantidadeRecebidaAgora: number;
}

// Confere as quantidades que chegaram contra o pedido: lança a entrada no
// estoque de cada item recebido (motivo "compra"), soma na
// `quantidade_recebida` do item, e recalcula o status do pedido inteiro
// (recebido só quando TODO item já bateu a quantidade pedida; parcial
// quando pelo menos um chegou sem fechar tudo ainda).
export async function receberItensPedido(
  pedido: PedidoCompra,
  recebimentos: RecebimentoItem[],
  lojaId: string,
): Promise<void> {
  const aplicaveis = recebimentos.filter((r) => r.quantidadeRecebidaAgora > 0);

  for (const recebimento of aplicaveis) {
    await registrarMovimento(
      {
        peca_id: recebimento.pecaId,
        tipo: "entrada",
        quantidade: recebimento.quantidadeRecebidaAgora,
        motivo: "compra",
        referencia: nomePedido(pedido.numero),
      },
      lojaId,
    );

    const itemAtual = pedido.itens?.find((item) => item.id === recebimento.itemId);
    const { error: erroItem } = await supabase
      .from("pedidos_compra_itens")
      .update({
        quantidade_recebida:
          (itemAtual?.quantidade_recebida ?? 0) + recebimento.quantidadeRecebidaAgora,
      })
      .eq("id", recebimento.itemId);
    if (erroItem) throw erroItem;
  }

  const itensAtualizados = (pedido.itens ?? []).map((item) => {
    const recebimento = aplicaveis.find((r) => r.itemId === item.id);
    return recebimento
      ? { ...item, quantidade_recebida: item.quantidade_recebida + recebimento.quantidadeRecebidaAgora }
      : item;
  });
  const tudoRecebido = itensAtualizados.every(
    (item) => item.quantidade_recebida >= item.quantidade_pedida,
  );
  const algumaCoisaRecebida = itensAtualizados.some((item) => item.quantidade_recebida > 0);
  const novoStatus = tudoRecebido ? "recebido" : algumaCoisaRecebida ? "parcial" : "pendente";

  const { error: erroPedido } = await supabase
    .from("pedidos_compra")
    .update({ status: novoStatus })
    .eq("id", pedido.id);
  if (erroPedido) throw erroPedido;
}
