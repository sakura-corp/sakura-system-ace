import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";
import type {
  Cliente,
  NovoCliente,
  Veiculo,
  VeiculoFormulario,
} from "@/types/cliente";

// O cliente "Consumidor" da venda de balcão (migration 0064) fica de fora de
// propósito: esta lista alimenta o cadastro de Clientes e toda caixinha de
// "escolha o cliente" do app, e ele não é uma pessoa pra ser editada nem
// escolhida numa OS — ver `CLIENTE_CONSUMIDOR_ID`. A venda de balcão o
// oferece pela própria constante.
export async function listarClientes(): Promise<Cliente[]> {
  // Por páginas: o Supabase corta em 1.000 linhas. `id` desempata nomes iguais.
  const clientes = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("clientes")
      .select("*, veiculos(*)")
      .neq("id", CLIENTE_CONSUMIDOR_ID)
      .order("nome", { ascending: true })
      .order("id", { ascending: true })
      .range(de, ate),
  );
  return clientes as unknown as Cliente[];
}

export async function criarCliente(
  cliente: NovoCliente,
  veiculos: VeiculoFormulario[],
): Promise<Cliente> {
  const { data: clienteCriado, error: erroCliente } = await supabase
    .from("clientes")
    .insert(cliente)
    .select()
    .single();

  if (erroCliente) throw erroCliente;

  if (veiculos.length > 0) {
    // Todo veículo do formulário (mesmo num cliente novo) tem o hidden input
    // de `id` registrado (ver VeiculosFields.tsx) — sem `id` de banco ainda,
    // ele manda "" em vez de undefined. `...veiculo` espalharia esse `id: ""`
    // pro insert e o Postgres recusa string vazia numa coluna uuid, mesmo
    // aqui sendo sempre um veículo novo. Mesmo cuidado já aplicado em
    // atualizarCliente() pros veículos novos adicionados na edição.
    const { error: erroVeiculos } = await supabase.from("veiculos").insert(
      veiculos.map((veiculo) => ({
        placa: veiculo.placa,
        marca: veiculo.marca,
        modelo: veiculo.modelo,
        ano: veiculo.ano,
        cor: veiculo.cor,
        tipo: veiculo.tipo,
        km_atual: veiculo.km_atual,
        cliente_id: clienteCriado.id,
      })),
    );
    if (erroVeiculos) throw erroVeiculos;
  }

  return clienteCriado as Cliente;
}

export async function atualizarCliente(
  id: string,
  cliente: NovoCliente,
  veiculos: VeiculoFormulario[],
): Promise<void> {
  const { error: erroCliente } = await supabase
    .from("clientes")
    .update(cliente)
    .eq("id", id);
  if (erroCliente) throw erroCliente;

  const veiculosExistentes = veiculos.filter((veiculo) => Boolean(veiculo.id));
  const veiculosNovos = veiculos.filter((veiculo) => !veiculo.id);

  const idsParaManter = veiculosExistentes.map((veiculo) => veiculo.id as string);

  const exclusao = supabase.from("veiculos").delete().eq("cliente_id", id);
  const { error: erroExclusao } =
    idsParaManter.length > 0
      ? await exclusao.not("id", "in", `(${idsParaManter.join(",")})`)
      : await exclusao;
  if (erroExclusao) throw erroExclusao;

  if (veiculosExistentes.length > 0) {
    const { error: erroAtualizacao } = await supabase
      .from("veiculos")
      .upsert(veiculosExistentes.map((veiculo) => ({ ...veiculo, cliente_id: id })));
    if (erroAtualizacao) throw erroAtualizacao;
  }

  // Veículo novo não tem `id` ainda — não pode ir no upsert acima (o hidden
  // input do formulário manda "" em vez de undefined pra esse campo, e o
  // Postgres recusa "" numa coluna uuid); precisa de um insert à parte, sem a
  // chave `id`, pra o banco gerar o UUID sozinho.
  if (veiculosNovos.length > 0) {
    const { error: erroInsercao } = await supabase.from("veiculos").insert(
      veiculosNovos.map((veiculo) => ({
        placa: veiculo.placa,
        marca: veiculo.marca,
        modelo: veiculo.modelo,
        ano: veiculo.ano,
        cor: veiculo.cor,
        tipo: veiculo.tipo,
        km_atual: veiculo.km_atual,
        cliente_id: id,
      })),
    );
    if (erroInsercao) throw erroInsercao;
  }
}

export async function excluirCliente(id: string): Promise<void> {
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw error;
}

/** O que a janela estreita (migration 0068) deixa ver de um veículo. */
const COLUNAS_DA_JANELA_DO_VEICULO = "id, cliente_id, placa, marca, modelo, cor, tipo";

/**
 * Os clientes (com os veículos) pras caixinhas de "escolha o cliente" da OS,
 * do Orçamento e de Contas a Receber.
 *
 * Desde a migration 0069, o cadastro completo só responde a quem tem o
 * módulo Clientes. Quem não tem escolhe pela janela estreita: só o nome do
 * cliente e placa, marca, modelo, cor e tipo do veículo. O resto dos campos
 * volta `null` — a tela já trata cada um como "não preenchido". Quem tem o
 * módulo continua recebendo tudo (a OS usa o KM do carro, por exemplo).
 */
export async function listarClientesParaEscolha(podeVerCadastro: boolean): Promise<Cliente[]> {
  if (podeVerCadastro) return listarClientes();

  const linhas = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("clientes_janela")
      .select(`id, nome, veiculos:veiculos_janela(${COLUNAS_DA_JANELA_DO_VEICULO})`)
      .neq("id", CLIENTE_CONSUMIDOR_ID)
      .order("nome", { ascending: true })
      .order("id", { ascending: true })
      .range(de, ate),
  );
  return (linhas as unknown as ClienteDaJanela[]).map(clienteDaJanela);
}

interface ClienteDaJanela {
  id: string;
  nome: string;
  veiculos: Pick<Veiculo, "id" | "cliente_id" | "placa" | "marca" | "modelo" | "cor" | "tipo">[] | null;
}

function clienteDaJanela(linha: ClienteDaJanela): Cliente {
  return {
    id: linha.id,
    nome: linha.nome,
    tipo_pessoa: "fisica",
    cpf_cnpj: null,
    telefone: null,
    email: null,
    cep: null,
    rua: null,
    numero: null,
    bairro: null,
    cidade: null,
    uf: null,
    codigo_municipio: null,
    data_nascimento: null,
    criado_em: "",
    veiculos: (linha.veiculos ?? []).map((v) => ({ ...v, ano: null, km_atual: null, criado_em: "" })),
  };
}

function veiculoParaFuncao(veiculo: VeiculoFormulario) {
  return {
    placa: veiculo.placa,
    marca: veiculo.marca,
    modelo: veiculo.modelo,
    ano: veiculo.ano,
    cor: veiculo.cor,
    tipo: veiculo.tipo,
    km_atual: veiculo.km_atual,
  };
}

/**
 * O cadastro rápido de dentro da OS, do Orçamento e da venda de balcão.
 *
 * Vai por uma função do banco (migration 0068), e não por `criarCliente`,
 * porque quem tem OS pode não ter o módulo Clientes — e aí o insert direto
 * na tabela é recusado. A função grava só o que as janelinhas de cadastro
 * rápido pedem (nome, telefone, tipo e CPF/CNPJ, e um veículo) e devolve só
 * os ids.
 */
export async function cadastrarClienteRapido(
  cliente: Pick<NovoCliente, "nome" | "telefone" | "tipo_pessoa" | "cpf_cnpj">,
  veiculo: VeiculoFormulario | null,
): Promise<{ clienteId: string; veiculoId: string | null }> {
  const { data, error } = await supabase.rpc("cadastrar_cliente_rapido", {
    p_cliente: {
      nome: cliente.nome,
      telefone: cliente.telefone,
      tipo_pessoa: cliente.tipo_pessoa,
      cpf_cnpj: cliente.cpf_cnpj,
    },
    p_veiculo: veiculo ? veiculoParaFuncao(veiculo) : null,
  });
  if (error) throw error;
  const ids = data as { cliente_id: string; veiculo_id: string | null };
  return { clienteId: ids.cliente_id, veiculoId: ids.veiculo_id };
}

/** Um veículo a mais pra um cliente, pelo cadastro rápido da OS. Devolve o id. */
export async function cadastrarVeiculoRapido(
  clienteId: string,
  veiculo: VeiculoFormulario,
): Promise<string> {
  const { data, error } = await supabase.rpc("cadastrar_veiculo_rapido", {
    p_cliente_id: clienteId,
    p_veiculo: veiculoParaFuncao(veiculo),
  });
  if (error) throw error;
  return data as string;
}

/**
 * O cadastro do cliente e do veículo de UMA OS — pra nota fiscal (CPF/CNPJ e
 * endereço) e pra garantia impressa. Vem de uma função do banco (migration
 * 0068) que entrega só os dois daquela OS a quem tem o módulo OS, mesmo sem
 * o módulo Clientes.
 */
export async function buscarClienteEVeiculoDaOrdem(
  ordemId: string,
): Promise<{ cliente: Cliente | null; veiculo: Veiculo | null }> {
  const { data, error } = await supabase.rpc("cliente_e_veiculo_da_ordem", { p_ordem_id: ordemId });
  if (error) throw error;
  const dados = (data ?? {}) as { cliente?: Cliente | null; veiculo?: Veiculo | null };
  return { cliente: dados.cliente ?? null, veiculo: dados.veiculo ?? null };
}

export type { Veiculo };
