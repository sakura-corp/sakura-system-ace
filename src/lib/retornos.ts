import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import type { ItemParaRetorno, OrdemParaRetorno, ServicoComIntervalo } from "@/schemas/retornos";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";
import type { StatusOS, TipoOrdem } from "@/types/os";

/**
 * A leitura do lembrete de retorno (FN-06, #381). A conta mora em
 * `schemas/retornos.ts`; aqui só se busca e se monta o formato dela.
 */

/** A linha da janela `ordens_servico_clientes` (0075; `servico_id` no item desde a 0083). */
export interface LinhaOrdemParaRetorno {
  id: string;
  numero: number;
  loja_id: string;
  cliente_id: string;
  tipo?: TipoOrdem;
  status: StatusOS;
  km_entrada: number | null;
  data_abertura: string;
  data_fechamento: string | null;
  veiculo_id: string | null;
  veiculo_placa: string | null;
  veiculo_marca: string | null;
  veiculo_modelo: string | null;
  itens:
    | (Omit<ItemParaRetorno, "peca" | "servico_id"> & {
        servico_id?: string | null;
        prazo_garantia_dias?: number | null;
      })[]
    | null;
}

/** Monta o formato da conta (`veiculo: { placa, ... }`, `servico_id` em cada item) a partir da janela. */
export function ordemParaRetornoDaJanela(linha: LinhaOrdemParaRetorno): OrdemParaRetorno {
  return {
    id: linha.id,
    numero: linha.numero,
    ...(linha.tipo ? { tipo: linha.tipo } : {}),
    loja_id: linha.loja_id,
    cliente_id: linha.cliente_id,
    status: linha.status,
    km_entrada: linha.km_entrada,
    data_abertura: linha.data_abertura,
    data_fechamento: linha.data_fechamento,
    veiculo_id: linha.veiculo_id,
    veiculo:
      linha.veiculo_placa != null
        ? { placa: linha.veiculo_placa, marca: linha.veiculo_marca, modelo: linha.veiculo_modelo }
        : null,
    itens: (linha.itens ?? []).map(({ prazo_garantia_dias: prazo, servico_id: servicoId, ...item }) => ({
      ...item,
      // Banco ainda sem a 0083: a janela não manda o campo, e o item conta
      // como digitado à mão (não gera retorno). Nunca adivinhar pela descrição.
      servico_id: servicoId ?? null,
      peca: prazo != null ? { prazo_garantia_dias: prazo } : null,
    })),
  };
}

/**
 * As OS FATURADAS de todas as lojas que a pessoa acessa, com o carro e os
 * itens, pra conta dos retornos. Mesma janela e mesmo motivo da lista de
 * clientes sumidos (`listarOrdensFaturadasDosClientes`): o cliente e o carro
 * são da empresa, não de uma loja só; a RLS e o `where` da view cortam o resto.
 *
 * O filtro de "faturada" e o do Consumidor vão pro banco pra trazer menos
 * linhas; a conta confere de novo, porque é ela que tem teste. Por páginas
 * (#498): o Supabase corta em 1.000 linhas; `id` desempata aberturas iguais.
 */
export async function listarOrdensParaRetornos(): Promise<OrdemParaRetorno[]> {
  const dados = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("ordens_servico_clientes")
      .select(
        "id, numero, loja_id, cliente_id, tipo, status, km_entrada, data_abertura, data_fechamento, " +
          "veiculo_id, veiculo_placa, veiculo_marca, veiculo_modelo, itens",
      )
      .eq("status", "faturada")
      .neq("cliente_id", CLIENTE_CONSUMIDOR_ID)
      .order("data_abertura", { ascending: false })
      .order("id", { ascending: false })
      .range(de, ate),
  );
  return (dados as unknown as LinhaOrdemParaRetorno[]).map(ordemParaRetornoDaJanela);
}

const positivo = (n: number | null | undefined) => n != null && n > 0;

/**
 * Os serviços que têm intervalo de retorno (em dias, em km ou nos dois).
 *
 * `select("*")` de propósito: num banco que ainda não recebeu a 0083, pedir
 * `intervalo_dias` pelo nome daria erro de coluna; com `*` os campos só não
 * vêm, viram `null`, e nenhum serviço gera retorno.
 */
export async function listarServicosComIntervalo(): Promise<ServicoComIntervalo[]> {
  const { data, error } = await supabase.from("servicos").select("*");
  if (error) throw error;
  return ((data ?? []) as Partial<ServicoComIntervalo>[])
    .map((servico) => ({
      id: servico.id as string,
      descricao: servico.descricao as string,
      intervalo_dias: servico.intervalo_dias ?? null,
      intervalo_km: servico.intervalo_km ?? null,
    }))
    .filter((servico) => positivo(servico.intervalo_dias) || positivo(servico.intervalo_km));
}
