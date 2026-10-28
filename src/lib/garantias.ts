import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import { contaNosNumeros } from "@/schemas/orcamento";
import type { StatusOS } from "@/types/os";

export interface ItemGarantia {
  id: string;
  quantidade: number;
  peca: { descricao: string; prazo_garantia_dias: number | null } | null;
  ordem: {
    id: string;
    status: StatusOS;
    data_fechamento: string | null;
    cliente: { nome: string } | null;
    veiculo: { id: string; placa: string } | null;
  } | null;
}

/** A linha da janela `ordens_servico_garantias` (migration 0075, #367): um item de peça por linha. */
export interface LinhaGarantia {
  id: string;
  quantidade: number;
  peca_id: string | null;
  peca_descricao: string | null;
  prazo_garantia_dias: number | null;
  ordem_servico_id: string;
  ordem_status: StatusOS;
  ordem_data_fechamento: string | null;
  cliente_nome: string | null;
  veiculo_id: string | null;
  veiculo_placa: string | null;
}

/** Monta o formato que a tela de Garantias usa a partir da linha da janela. */
export function itemGarantiaDaJanela(linha: LinhaGarantia): ItemGarantia {
  return {
    id: linha.id,
    quantidade: linha.quantidade,
    peca:
      linha.peca_descricao != null
        ? { descricao: linha.peca_descricao, prazo_garantia_dias: linha.prazo_garantia_dias }
        : null,
    ordem: {
      id: linha.ordem_servico_id,
      status: linha.ordem_status,
      data_fechamento: linha.ordem_data_fechamento,
      cliente: linha.cliente_nome != null ? { nome: linha.cliente_nome } : null,
      veiculo:
        linha.veiculo_id != null && linha.veiculo_placa != null
          ? { id: linha.veiculo_id, placa: linha.veiculo_placa }
          : null,
    },
  };
}

// Garantia dada ao cliente na venda — não é uma tabela própria, é calculada
// a partir do item de peça vendido numa OS (data_fechamento + o prazo de
// garantia cadastrado na peça). Ver PROJETO_STATUS.md.
//
// Lê a janela `ordens_servico_garantias` (migration 0075, #367), que só
// responde a quem tem o módulo Garantias e já traz, por item de peça, o que a
// tela mostra: peça, prazo, cliente, placa e o fechamento da OS.
export async function listarItensComGarantia(): Promise<ItemGarantia[]> {
  // Por páginas: o Supabase corta em 1.000 linhas. `id` desempata a ordem.
  const data = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("ordens_servico_garantias")
      .select(
        "id, quantidade, peca_id, peca_descricao, prazo_garantia_dias, ordem_servico_id, " +
          "ordem_status, ordem_data_fechamento, cliente_nome, veiculo_id, veiculo_placa",
      )
      .order("id", { ascending: true })
      .range(de, ate),
  );

  const itens = (data as unknown as LinhaGarantia[]).map(itemGarantiaDaJanela);
  // Orçamento (#379) não vendeu nada: aberto ou recusado, fica de fora
  // mesmo que um dia ganhe data de fechamento.
  return itens.filter(
    (item) =>
      item.peca?.prazo_garantia_dias != null &&
      item.ordem?.data_fechamento != null &&
      contaNosNumeros(item.ordem),
  );
}
