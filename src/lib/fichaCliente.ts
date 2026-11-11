import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import { ordemDaFichaDaJanela, type LinhaOrdemDaFicha } from "./veiculos";
import type { ContaDaFicha, OrdemDaFichaDoCliente } from "@/schemas/fichaCliente";
import { contaNosNumeros } from "@/schemas/orcamento";

/**
 * O que cada parte da ficha do cliente pode ler, pelos módulos de quem está
 * na tela (#393). A tela calcula com `temPermissao` e passa pra cá.
 */
export interface PermissoesDaFichaDoCliente {
  /** Módulo Clientes: o cadastro inteiro (telefone) e os carros. */
  clientes: boolean;
  /** Módulo Ordens de Serviço: as OS com a forma de pagamento e as parcelas. */
  ordens: boolean;
  /** Módulo Contas a Receber: o que ele deve e o que já pagou de conta. */
  contasReceber: boolean;
}

export interface FichaDoCliente {
  cliente: { id: string; nome: string; telefone: string | null };
  veiculos: { id: string; placa: string }[];
  /** As OS e vendas dele (sem orçamento), de todas as lojas que a pessoa alcança. */
  ordens: OrdemDaFichaDoCliente[];
  /**
   * As contas a receber dele, ou `null` quando a pessoa não tem o módulo e a
   * consulta NEM FOI FEITA. `null` não é "não deve nada": a tela mostra "—".
   */
  contas: ContaDaFicha[] | null;
}

/**
 * Tudo que a ficha do cliente mostra. Devolve `null` quando o cliente não
 * existe (link velho, cliente excluído).
 *
 * NÃO filtra pela loja ativa, de propósito, como a ficha do veículo
 * (`buscarFichaDoVeiculo`): "ele deve alguma coisa?" vale pra empresa toda
 * (decidido pela Sofia em 10/11/2026, item 3 da #393). Quem limita o que cada
 * operador enxerga é o banco: ele só vê as OS e as contas das lojas a que tem
 * acesso.
 *
 * Cada consulta só acontece se a pessoa tem o módulo dela — perguntar o que a
 * RLS barra devolve vazio sem erro, e vazio viraria "R$ 0,00" na tela, como se
 * fosse verdade:
 *   - o cliente e os carros: com Clientes, pelas tabelas; sem, pelas janelas
 *     estreitas (`clientes_janela`, `veiculos_janela`, migration 0068), que
 *     não trazem o telefone;
 *   - as OS: com Ordens de Serviço, pela tabela (traz a forma de pagamento e
 *     as parcelas); só com Clientes, pela janela `ordens_servico_clientes`
 *     (migration 0075), que não traz;
 *   - as contas a receber: só com Contas a Receber.
 */
export async function buscarFichaDoCliente(
  clienteId: string,
  pode: PermissoesDaFichaDoCliente,
): Promise<FichaDoCliente | null> {
  const [cliente, veiculos, ordens, contas] = await Promise.all([
    buscarCliente(clienteId, pode.clientes),
    buscarVeiculos(clienteId, pode.clientes),
    pode.ordens || pode.clientes ? buscarOrdens(clienteId, pode.ordens) : Promise.resolve([]),
    pode.contasReceber ? buscarContas(clienteId) : Promise.resolve(null),
  ]);
  if (!cliente) return null;

  const placaPorVeiculo = new Map(veiculos.map((v) => [v.id, v.placa]));
  return {
    cliente,
    veiculos,
    ordens: ordens.map((ordem) => ({
      ...ordem,
      placa: ordem.placa ?? (ordem.veiculo_id ? placaPorVeiculo.get(ordem.veiculo_id) ?? null : null),
    })),
    contas,
  };
}

async function buscarCliente(
  clienteId: string,
  podeVerCadastro: boolean,
): Promise<FichaDoCliente["cliente"] | null> {
  const { data, error } = podeVerCadastro
    ? await supabase.from("clientes").select("id, nome, telefone").eq("id", clienteId).maybeSingle()
    : await supabase.from("clientes_janela").select("id, nome").eq("id", clienteId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const linha = data as { id: string; nome: string; telefone?: string | null };
  return { id: linha.id, nome: linha.nome, telefone: linha.telefone ?? null };
}

async function buscarVeiculos(clienteId: string, podeVerCadastro: boolean) {
  const linhas = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from(podeVerCadastro ? "veiculos" : "veiculos_janela")
      .select("id, placa")
      .eq("cliente_id", clienteId)
      .order("placa", { ascending: true })
      .order("id", { ascending: true })
      .range(de, ate),
  );
  return linhas as unknown as { id: string; placa: string }[];
}

const COLUNAS_DA_OS =
  "id, loja_id, numero, tipo, status, data_abertura, data_fechamento, cliente_id, veiculo_id, " +
  "km_entrada, forma_pagamento, parcelas, veiculo:veiculos_janela(placa), " +
  "itens:ordens_servico_itens(id, tipo, peca_id, descricao, quantidade, preco_unitario, desconto)";

const COLUNAS_DA_JANELA =
  "id, loja_id, numero, tipo, status, data_abertura, data_fechamento, cliente_id, cliente_nome, " +
  "veiculo_id, veiculo_placa, km_entrada, itens";

async function buscarOrdens(
  clienteId: string,
  podeVerOS: boolean,
): Promise<OrdemDaFichaDoCliente[]> {
  // Por páginas (#498): o Supabase corta em 1.000 linhas. `id` desempata
  // aberturas iguais.
  const linhas = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from(podeVerOS ? "ordens_servico" : "ordens_servico_clientes")
      .select(podeVerOS ? COLUNAS_DA_OS : COLUNAS_DA_JANELA)
      .eq("cliente_id", clienteId)
      .order("data_abertura", { ascending: false })
      .order("id", { ascending: false })
      .range(de, ate),
  );

  // A placa vem pela `veiculos_janela` (0068), que abre com Clientes ou OS:
  // assim a OS antiga de um carro que hoje é de outro cliente continua
  // mostrando a placa, igual à janela de OS (que faz o mesmo `join`).
  const ordens: OrdemDaFichaDoCliente[] = podeVerOS
    ? (linhas as unknown as (OrdemDaFichaDoCliente & { veiculo?: { placa: string } | null })[]).map(
        ({ veiculo, ...ordem }) => ({ ...ordem, placa: veiculo?.placa ?? null }),
      )
    : (linhas as unknown as (LinhaOrdemDaFicha & { veiculo_id: string | null; veiculo_placa: string | null })[]).map(
        ({ veiculo_placa: placa, ...linha }) => ({
          ...ordemDaFichaDaJanela(linha),
          veiculo_id: linha.veiculo_id,
          placa,
        }),
      );
  // Orçamento (#379) não é compra. A janela já tira; a tabela, não.
  return ordens.filter(contaNosNumeros);
}

async function buscarContas(clienteId: string): Promise<ContaDaFicha[]> {
  const linhas = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("contas_receber")
      .select("id, loja_id, ordem_servico_id, descricao, valor, vencimento, status, data_recebimento")
      .eq("cliente_id", clienteId)
      .order("vencimento", { ascending: true })
      .order("id", { ascending: true })
      .range(de, ate),
  );
  return linhas as unknown as ContaDaFicha[];
}
