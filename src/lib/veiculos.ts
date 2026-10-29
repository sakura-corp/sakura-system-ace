import { supabase } from "./supabase";
import type { ItemDaFicha, OrdemDaFicha } from "@/schemas/fichaVeiculo";
import { contaNosNumeros } from "@/schemas/orcamento";
import type { Veiculo } from "@/types/cliente";
import type { StatusOS, TipoOrdem } from "@/types/os";

export type VeiculoDaFicha = Veiculo & {
  cliente: { id: string; nome: string; telefone: string | null } | null;
};

export interface FichaDoVeiculo {
  veiculo: VeiculoDaFicha;
  ordens: OrdemDaFicha[];
}

/** A linha da janela `ordens_servico_clientes` que a ficha lê. */
export interface LinhaOrdemDaFicha {
  id: string;
  loja_id: string;
  numero: number;
  tipo?: TipoOrdem;
  status: StatusOS;
  data_abertura: string;
  data_fechamento: string | null;
  cliente_id: string;
  cliente_nome: string | null;
  km_entrada: number | null;
  itens: (Omit<ItemDaFicha, "peca"> & { prazo_garantia_dias: number | null })[] | null;
}

/** Monta o formato da ficha (`cliente: { nome }`, `peca: { prazo_garantia_dias }`) a partir da janela. */
export function ordemDaFichaDaJanela(linha: LinhaOrdemDaFicha): OrdemDaFicha {
  const { cliente_nome: clienteNome, itens, ...resto } = linha;
  return {
    ...resto,
    cliente: clienteNome != null ? { nome: clienteNome } : null,
    itens: (itens ?? []).map(({ prazo_garantia_dias: prazo, ...item }) => ({
      ...item,
      peca: prazo != null ? { prazo_garantia_dias: prazo } : null,
    })),
  };
}

/**
 * Tudo que a ficha do veículo mostra (item FN-04): o carro, o dono atual e
 * todas as OS em que ele passou. Devolve `null` quando o veículo não existe
 * (link velho, veículo excluído).
 *
 * As OS NÃO são filtradas pela loja ativa, de propósito: a ficha é a
 * história do CARRO, e o cadastro de clientes e veículos é compartilhado
 * entre as lojas da mesma empresa justamente pra um cliente que passa nas
 * duas ter um histórico só (PROJETO_STATUS.md, seção 3). Quem decide o que
 * cada operador enxerga é a RLS: ele vê as OS das lojas a que tem acesso.
 *
 * As OS vêm pela janela `ordens_servico_clientes` (migration 0075, #367), pra
 * quem tem Clientes mas não o módulo OS: só o que a ficha mostra.
 *
 * Quem não tem o módulo Clientes (só OS, migration 0068) lê o carro e o dono
 * pela janela estreita: placa, marca, modelo, cor e tipo, e o nome do dono.
 * Ano, KM do cadastro e telefone voltam `null`, e a tela mostra "—".
 */
export async function buscarFichaDoVeiculo(
  veiculoId: string,
  podeVerCadastro: boolean,
): Promise<FichaDoVeiculo | null> {
  const { data: veiculo, error: erroVeiculo } = podeVerCadastro
    ? await supabase
        .from("veiculos")
        .select("*, cliente:clientes(id, nome, telefone)")
        .eq("id", veiculoId)
        .maybeSingle()
    : await supabase
        .from("veiculos_janela")
        .select("id, cliente_id, placa, marca, modelo, cor, tipo, cliente:clientes_janela(id, nome)")
        .eq("id", veiculoId)
        .maybeSingle();
  if (erroVeiculo) throw erroVeiculo;
  if (!veiculo) return null;

  // As OS do carro vêm pela janela `ordens_servico_clientes` (migration 0075,
  // #367): só o que a ficha mostra — número, datas, KM, cliente, itens e o
  // prazo de garantia da peça. Nunca custo, observação nem forma de pagamento.
  const { data: ordens, error: erroOrdens } = await supabase
    .from("ordens_servico_clientes")
    .select(
      "id, loja_id, numero, tipo, status, data_abertura, data_fechamento, cliente_id, " +
        "cliente_nome, km_entrada, itens",
    )
    .eq("veiculo_id", veiculoId)
    .order("data_abertura", { ascending: false });
  if (erroOrdens) throw erroOrdens;

  return {
    veiculo: completarVeiculoDaJanela(veiculo as unknown as Partial<VeiculoDaFicha>),
    // Orçamento (#379) não é visita: aberto ou recusado, fica fora da
    // história do carro (linha do tempo, KM, total gasto, garantia).
    ordens: ((ordens ?? []) as unknown as LinhaOrdemDaFicha[]).map(ordemDaFichaDaJanela).filter(contaNosNumeros),
  };
}

// A janela não traz ano, KM nem telefone: completa com `null` pra a ficha
// tratar como "não preenchido", em vez de `undefined` escapar pra tela.
function completarVeiculoDaJanela(veiculo: Partial<VeiculoDaFicha>): VeiculoDaFicha {
  return {
    ano: null,
    km_atual: null,
    criado_em: "",
    ...veiculo,
    cliente: veiculo.cliente ? { ...veiculo.cliente, telefone: veiculo.cliente.telefone ?? null } : null,
  } as VeiculoDaFicha;
}
