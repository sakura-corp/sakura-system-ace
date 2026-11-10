import { buscarTudoEmPaginas } from "./paginacao";
import { dataHoraLocalComFuso, hojeLocal } from "./datas";
import { mensagemDeErro } from "./errors";
import { listarSaldos } from "./estoque";
import { listarPecas } from "./pecas";
import { criarPedido } from "./pedidosCompra";
import { supabase } from "./supabase";
import {
  DIAS_DO_RITMO_DE_SAIDA,
  type CotacaoParaSugestao,
  type GrupoPorFornecedor,
  type MovimentoParaConsumo,
  type PecaParaSugestao,
  type PedidoParaSugestao,
} from "@/schemas/estoque";

// A leitura e o "Gerar pedidos" da Sugestão de compra (#382, FN-07). A conta
// mora em src/schemas/estoque.ts; aqui só se busca e se grava.

export interface DadosDaSugestao {
  pecas: PecaParaSugestao[];
  saldos: Map<string, number>;
  movimentos: MovimentoParaConsumo[];
  cotacoes: CotacaoParaSugestao[];
  pedidos: PedidoParaSugestao[];
}

/** Meia-noite local de `hoje` menos (dias - 1) dias, com o fuso no fim. */
function inicioDaJanela(hoje: string, dias: number): string {
  const [ano, mes, dia] = hoje.split("-").map(Number);
  return dataHoraLocalComFuso(new Date(ano, mes - 1, dia - (dias - 1), 0, 0, 0));
}

interface CotacaoLida {
  peca_id: string;
  fornecedor_id: string;
  preco: number;
  criado_em: string;
  fornecedor: { nome: string; ativo: boolean } | null;
}

export async function carregarDadosDaSugestao(
  lojaId: string,
  hoje: string,
): Promise<DadosDaSugestao> {
  const desde = inicioDaJanela(hoje, DIAS_DO_RITMO_DE_SAIDA);

  const [pecas, saldos, movimentos, cotacoesLidas, pedidos] = await Promise.all([
    listarPecas(),
    listarSaldos(lojaId),
    // Só saída de venda e de uso em OS: ajuste e compra não são consumo.
    buscarTudoEmPaginas((de, ate) =>
      supabase
        .from("estoque_movimentos")
        .select("peca_id, tipo, motivo, quantidade, criado_em")
        .eq("loja_id", lojaId)
        .eq("tipo", "saida")
        .in("motivo", ["venda", "uso_em_os"])
        .gte("criado_em", desde)
        .order("criado_em", { ascending: true })
        .order("id", { ascending: true })
        .range(de, ate),
    ),
    buscarTudoEmPaginas((de, ate) =>
      supabase
        .from("cotacoes_pecas")
        .select("peca_id, fornecedor_id, preco, criado_em, fornecedor:fornecedores(nome, ativo)")
        .order("criado_em", { ascending: true })
        .order("id", { ascending: true })
        .range(de, ate),
    ),
    buscarTudoEmPaginas((de, ate) =>
      supabase
        .from("pedidos_compra")
        .select("status, itens:pedidos_compra_itens(peca_id, quantidade_pedida, quantidade_recebida)")
        .eq("loja_id", lojaId)
        .in("status", ["pendente", "parcial"])
        .order("criado_em", { ascending: true })
        .order("id", { ascending: true })
        .range(de, ate),
    ),
  ]);

  return {
    pecas: pecas.map((p) => ({
      id: p.id,
      descricao: p.descricao,
      unidade: p.unidade,
      estoque_minimo: p.estoque_minimo,
      ativo: p.ativo,
    })),
    saldos,
    movimentos: movimentos as unknown as MovimentoParaConsumo[],
    // Cotação de fornecedor inativo (ou sem nome) não vira sugestão de compra.
    cotacoes: (cotacoesLidas as unknown as CotacaoLida[])
      .filter((c) => c.fornecedor !== null && c.fornecedor.ativo !== false)
      .map((c) => ({
        peca_id: c.peca_id,
        fornecedor_id: c.fornecedor_id,
        fornecedor_nome: (c.fornecedor as { nome: string }).nome,
        preco: Number(c.preco),
        criado_em: c.criado_em,
      })),
    pedidos: pedidos as unknown as PedidoParaSugestao[],
  };
}

export interface ResultadoDoGerarPedidos {
  criados: { fornecedorNome: string; numero: number }[];
  naoCriados: { fornecedorNome: string }[];
  erro: string | null;
}

/**
 * Um pedido por fornecedor, em fila. Para no primeiro erro e NÃO tenta de novo
 * sozinho: devolve quais foram criados e quais não (repetir poderia duplicar
 * um pedido que na verdade chegou a ser gravado).
 */
export async function gerarPedidosDaSugestao(
  grupos: readonly GrupoPorFornecedor[],
  lojaId: string,
  operadorId: string | null,
): Promise<ResultadoDoGerarPedidos> {
  const criados: ResultadoDoGerarPedidos["criados"] = [];
  for (let i = 0; i < grupos.length; i++) {
    const grupo = grupos[i];
    try {
      const pedido = await criarPedido(
        {
          fornecedor_id: grupo.fornecedor.id,
          data_pedido: hojeLocal(),
          observacao: "Gerado pela Sugestão de compra",
        },
        grupo.itens.map((item) => ({
          peca_id: item.peca_id,
          quantidade_pedida: item.quantidade,
          preco_unitario: item.preco,
        })),
        lojaId,
        operadorId,
      );
      criados.push({ fornecedorNome: grupo.fornecedor.nome, numero: pedido.numero });
    } catch (err) {
      return {
        criados,
        naoCriados: grupos.slice(i).map((g) => ({ fornecedorNome: g.fornecedor.nome })),
        erro: mensagemDeErro(err),
      };
    }
  }
  return { criados, naoCriados: [], erro: null };
}
