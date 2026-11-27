import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import { listarCategoriasCaixa } from "./categoriasCaixa";
import type { CategoriaDoDre, TaxaGravada } from "@/schemas/dre";

/**
 * O que o DRE (#388) lê além das OS e do Caixa que Relações já carrega: as
 * categorias do Caixa com o grupo de cada uma (#386) e a taxa da maquininha
 * gravada em cada recebimento em cartão (#387). A conta mora em
 * `src/schemas/dre.ts`.
 *
 * Os erros do Supabase sobem como vieram; quem mostra pra pessoa passa por
 * `mensagemDeErro()`.
 */

interface TaxaDoBanco {
  movimento_id: string;
  valor_taxa: number | string;
}

export async function carregarDadosDoDre(
  lojaId: string,
): Promise<{ categorias: CategoriaDoDre[]; taxas: TaxaGravada[] }> {
  const [categoriasDoCaixa, taxasDoBanco] = await Promise.all([
    listarCategoriasCaixa(),
    buscarTudoEmPaginas<TaxaDoBanco>((de, ate) =>
      supabase
        .from("caixa_taxas_cartao")
        .select("movimento_id, valor_taxa")
        .eq("loja_id", lojaId)
        // Ordem total (movimento_id é único aqui): sem empate, nenhuma linha
        // cai em duas páginas ou em nenhuma.
        .order("movimento_id")
        .range(de, ate)
        .then((r) => ({
          data: r.data as unknown as TaxaDoBanco[] | null,
          error: r.error,
        })),
    ),
  ]);
  return {
    categorias: categoriasDoCaixa.map((c) => ({
      id: c.id,
      nome: c.nome,
      grupo: c.grupo,
    })),
    // `numeric` pode chegar como texto; a conta precisa de número.
    taxas: taxasDoBanco.map((t) => ({
      movimento_id: t.movimento_id,
      valor_taxa: Number(t.valor_taxa),
    })),
  };
}
