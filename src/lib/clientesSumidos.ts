import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import type { OrdemDoCliente } from "@/schemas/clientesSumidos";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";
import type { StatusOS, TipoOrdem } from "@/types/os";

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
/** A linha da janela `ordens_servico_clientes` (migration 0075, #367). */
export interface LinhaOrdemDoCliente {
  id: string;
  cliente_id: string;
  tipo?: TipoOrdem;
  status: StatusOS;
  data_abertura: string;
  data_fechamento: string | null;
  veiculo_placa: string | null;
  veiculo_marca: string | null;
  veiculo_modelo: string | null;
  itens: NonNullable<OrdemDoCliente["itens"]> | null;
}

/** Monta o formato da conta de "clientes que sumiram" (`veiculo: { placa, ... }`) a partir da janela. */
export function ordemDoClienteDaJanela(linha: LinhaOrdemDoCliente): OrdemDoCliente {
  return {
    id: linha.id,
    cliente_id: linha.cliente_id,
    ...(linha.tipo ? { tipo: linha.tipo } : {}),
    status: linha.status,
    data_abertura: linha.data_abertura,
    data_fechamento: linha.data_fechamento,
    veiculo:
      linha.veiculo_placa != null
        ? {
            placa: linha.veiculo_placa,
            marca: linha.veiculo_marca,
            modelo: linha.veiculo_modelo,
          }
        : null,
    itens: (linha.itens ?? []).map((item) => ({
      tipo: item.tipo,
      descricao: item.descricao,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto: item.desconto,
    })),
  };
}

export async function listarOrdensFaturadasDosClientes(): Promise<OrdemDoCliente[]> {
  const dados = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("ordens_servico_clientes")
      .select(
        "id, cliente_id, tipo, status, data_abertura, data_fechamento, " +
          "veiculo_placa, veiculo_marca, veiculo_modelo, itens",
      )
      .eq("status", "faturada")
      .neq("cliente_id", CLIENTE_CONSUMIDOR_ID)
      .order("data_abertura", { ascending: false })
      .order("id", { ascending: false })
      .range(de, ate),
  );
  return (dados as unknown as LinhaOrdemDoCliente[]).map(ordemDoClienteDaJanela);
}
