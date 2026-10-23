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

// Garantia dada ao cliente na venda — não é uma tabela própria, é calculada
// a partir do item de peça vendido numa OS (data_fechamento + o prazo de
// garantia cadastrado na peça). Ver PROJETO_STATUS.md.
export async function listarItensComGarantia(): Promise<ItemGarantia[]> {
  // Por páginas: o Supabase corta em 1.000 linhas. `id` desempata a ordem.
  const data = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("ordens_servico_itens")
      .select(
        "id, quantidade, peca:pecas(descricao, prazo_garantia_dias), " +
          "ordem:ordens_servico(id, status, data_fechamento, cliente:clientes_janela(nome), veiculo:veiculos_janela(id, placa))",
      )
      .eq("tipo", "peca")
      .order("id", { ascending: true })
      .range(de, ate),
  );

  const itens = data as unknown as ItemGarantia[];
  // Orçamento (#379) não vendeu nada: aberto ou recusado, fica de fora
  // mesmo que um dia ganhe data de fechamento.
  return itens.filter(
    (item) =>
      item.peca?.prazo_garantia_dias != null &&
      item.ordem?.data_fechamento != null &&
      contaNosNumeros(item.ordem),
  );
}
