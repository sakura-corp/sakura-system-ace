import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import type { OrdemDoCliente } from "@/schemas/clientesSumidos";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";

/**
 * As ordens FATURADAS (OS e vendas de balcão) de todas as lojas que a pessoa
 * acessa (o RLS de `ordens_servico` corta as outras, migration 0032), só com o que a conta de "clientes que sumiram" usa (FN-11).
 *
 * Por que não reaproveitar `listarOrdens()`: ela traz uma loja só, com
 * operador, funcionário e tudo mais — e o cliente é da empresa inteira. Quem
 * vem sempre na loja do centro não "sumiu" só porque não passou na da vila.
 *
 * O filtro de "faturada" já vai pro banco pra trazer menos linhas; a conta em
 * `schemas/clientesSumidos.ts` confere de novo, porque é ela que tem teste.
 * O Consumidor (venda de balcão sem cliente) fica de fora: ele nem aparece na
 * lista de clientes, e é quem mais tem venda.
 */
export async function listarOrdensFaturadasDosClientes(): Promise<OrdemDoCliente[]> {
  const dados = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("ordens_servico")
      .select(
        "id, cliente_id, status, data_abertura, data_fechamento, " +
          "veiculo:veiculos(placa, marca, modelo), " +
          "itens:ordens_servico_itens(tipo, descricao, quantidade, preco_unitario, desconto)",
      )
      .eq("status", "faturada")
      .neq("cliente_id", CLIENTE_CONSUMIDOR_ID)
      .order("data_abertura", { ascending: false })
      .order("id", { ascending: false })
      .range(de, ate),
  );
  return dados as unknown as OrdemDoCliente[];
}
