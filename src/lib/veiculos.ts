import { supabase } from "./supabase";
import type { OrdemDaFicha } from "@/schemas/fichaVeiculo";
import { contaNosNumeros } from "@/schemas/orcamento";
import type { Veiculo } from "@/types/cliente";

export type VeiculoDaFicha = Veiculo & {
  cliente: { id: string; nome: string; telefone: string | null } | null;
};

export interface FichaDoVeiculo {
  veiculo: VeiculoDaFicha;
  ordens: OrdemDaFicha[];
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
 * `ordens_servico` vai com `*`, e não com a lista de colunas: `tipo` só
 * existe a partir da migration 0064, e pedir uma coluna que um banco mais
 * antigo não tem derrubaria a tela inteira (é o mesmo motivo do SELECT_ORDEM
 * em ordensServico.ts).
 */
export async function buscarFichaDoVeiculo(veiculoId: string): Promise<FichaDoVeiculo | null> {
  const { data: veiculo, error: erroVeiculo } = await supabase
    .from("veiculos")
    .select("*, cliente:clientes(id, nome, telefone)")
    .eq("id", veiculoId)
    .maybeSingle();
  if (erroVeiculo) throw erroVeiculo;
  if (!veiculo) return null;

  const { data: ordens, error: erroOrdens } = await supabase
    .from("ordens_servico")
    .select(
      "*, cliente:clientes(nome), " +
        "itens:ordens_servico_itens(id, tipo, peca_id, descricao, quantidade, preco_unitario, desconto, " +
        "peca:pecas(prazo_garantia_dias))",
    )
    .eq("veiculo_id", veiculoId)
    .order("data_abertura", { ascending: false });
  if (erroOrdens) throw erroOrdens;

  return {
    veiculo: veiculo as unknown as VeiculoDaFicha,
    // Orçamento (#379) não é visita: aberto ou recusado, fica fora da
    // história do carro (linha do tempo, KM, total gasto, garantia).
    ordens: ((ordens ?? []) as unknown as OrdemDaFicha[]).filter(contaNosNumeros),
  };
}
