export type TipoVeiculo = "hatch" | "sedan" | "suv" | "picape" | "moto";

export const TIPO_VEICULO_LABEL: Record<TipoVeiculo, string> = {
  hatch: "Hatch",
  sedan: "Sedã",
  suv: "SUV",
  picape: "Picape",
  moto: "Moto",
};

export interface Veiculo {
  id: string;
  cliente_id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  cor: string | null;
  tipo: TipoVeiculo | null;
  km_atual: number | null;
  criado_em: string;
}

export type TipoPessoa = "fisica" | "juridica";

/**
 * O cliente fixo "Consumidor" (migration 0064): é em nome dele que a venda
 * de balcão nasce quando quem compra não se identifica. UUID fixo, no mesmo
 * espírito da "Loja 1" — é assim que o programa o reconhece sem procurar pelo
 * nome.
 *
 * Três regras giram em volta dele, e as três existem pelo mesmo motivo — ele
 * não é uma pessoa, é "ninguém em particular":
 *   • ele NÃO aparece no cadastro de clientes nem nas listas de escolha
 *     (`listarClientes()` o deixa de fora), então ninguém o edita por engano;
 *   • a NFC-e NUNCA leva documento dele (`montarDestinatarioNFCe`), mesmo que
 *     alguém grave um CPF nele — senão toda venda anônima sairia no CPF
 *     dessa pessoa;
 *   • venda no nome dele não pode ficar "a receber depois": não há de quem
 *     cobrar.
 */
export const CLIENTE_CONSUMIDOR_ID = "00000000-0000-0000-0000-00000000c000";

export function ehConsumidor(clienteId: string | null | undefined): boolean {
  return clienteId === CLIENTE_CONSUMIDOR_ID;
}

export interface Cliente {
  id: string;
  nome: string;
  tipo_pessoa: TipoPessoa;
  cpf_cnpj: string | null;
  telefone: string | null;
  email: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  // Código IBGE do município — só usado na emissão de NFS-e (identifica o
  // tomador do serviço). Preenchido sozinho junto com o resto do endereço
  // quando o CEP é buscado, ver lib/viaCep.ts.
  codigo_municipio: string | null;
  data_nascimento: string | null;
  /** Pediu pra não receber lembrete de retorno (FN-06, #381): some da lista de retornos. */
  nao_avisar: boolean;
  criado_em: string;
  veiculos?: Veiculo[];
}

// `nao_avisar` é opcional na gravação pelo mesmo motivo dos intervalos do
// serviço: formulário sem o campo não manda a coluna (nem apaga, nem quebra
// num banco sem a migration 0084).
export type NovoCliente = Omit<Cliente, "id" | "criado_em" | "veiculos" | "nao_avisar"> &
  Partial<Pick<Cliente, "nao_avisar">>;
export type NovoVeiculo = Omit<Veiculo, "id" | "cliente_id" | "criado_em">;

// Usado no formulário: veículo já existente carrega o `id` (pra atualizar em
// vez de recriar e perder o vínculo com Ordens de Serviço antigas); veículo
// novo, adicionado na tela, ainda não tem.
export type VeiculoFormulario = NovoVeiculo & { id?: string };
