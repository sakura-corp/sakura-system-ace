import { z } from "zod";
import type {
  Cliente,
  NovoCliente,
  TipoVeiculo,
  VeiculoFormulario,
} from "@/types/cliente";

// Mesma ideia do schema de funcionário: formulário trabalha só com strings
// (inclusive ano/km_atual, que no banco são number | null) — a conversão pra
// NovoCliente/VeiculoFormulario acontece só na borda, em paraNovoCliente() e
// paraVeiculosPreenchidos().
export const veiculoFormSchema = z.object({
  id: z.string().optional(),
  placa: z.string(),
  marca: z.string(),
  modelo: z.string(),
  ano: z.string(),
  cor: z.string(),
  tipo: z.string(),
  km_atual: z.string(),
});

export const clienteFormSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipo_pessoa: z.enum(["fisica", "juridica"]),
  cpf_cnpj: z.string(),
  telefone: z.string(),
  email: z.string(),
  cep: z.string(),
  rua: z.string(),
  numero: z.string(),
  bairro: z.string(),
  cidade: z.string(),
  uf: z.string(),
  codigo_municipio: z.string(),
  data_nascimento: z.string(),
  nao_avisar: z.boolean(),
  veiculos: z.array(veiculoFormSchema),
});

export type ClienteFormValues = z.infer<typeof clienteFormSchema>;
export type VeiculoFormValues = ClienteFormValues["veiculos"][number];

export const veiculoFormVazio: VeiculoFormValues = {
  placa: "",
  marca: "",
  modelo: "",
  ano: "",
  cor: "",
  tipo: "",
  km_atual: "",
};

export function paraValoresFormulario(cliente?: Cliente): ClienteFormValues {
  return {
    nome: cliente?.nome ?? "",
    tipo_pessoa: cliente?.tipo_pessoa ?? "fisica",
    cpf_cnpj: cliente?.cpf_cnpj ?? "",
    telefone: cliente?.telefone ?? "",
    email: cliente?.email ?? "",
    cep: cliente?.cep ?? "",
    rua: cliente?.rua ?? "",
    numero: cliente?.numero ?? "",
    bairro: cliente?.bairro ?? "",
    cidade: cliente?.cidade ?? "",
    uf: cliente?.uf ?? "",
    codigo_municipio: cliente?.codigo_municipio ?? "",
    data_nascimento: cliente?.data_nascimento ?? "",
    nao_avisar: cliente?.nao_avisar ?? false,
    veiculos: cliente?.veiculos?.length
      ? cliente.veiculos.map((veiculo) => ({
          id: veiculo.id,
          placa: veiculo.placa,
          marca: veiculo.marca ?? "",
          modelo: veiculo.modelo ?? "",
          ano: veiculo.ano?.toString() ?? "",
          cor: veiculo.cor ?? "",
          tipo: veiculo.tipo ?? "",
          km_atual: veiculo.km_atual?.toString() ?? "",
        }))
      : [veiculoFormVazio],
  };
}

export function paraNovoCliente(valores: ClienteFormValues): NovoCliente {
  return {
    nome: valores.nome,
    tipo_pessoa: valores.tipo_pessoa,
    cpf_cnpj: valores.cpf_cnpj,
    telefone: valores.telefone,
    email: valores.email,
    cep: valores.cep,
    rua: valores.rua,
    numero: valores.numero,
    bairro: valores.bairro,
    cidade: valores.cidade,
    uf: valores.uf,
    codigo_municipio: valores.codigo_municipio || null,
    data_nascimento: valores.data_nascimento || null,
    nao_avisar: valores.nao_avisar,
  };
}

const paraNumeroOuNulo = (valor: string) => (valor.trim() === "" ? null : Number(valor));

// Um veículo entra no salvamento se tiver qualquer campo preenchido (não só a
// placa) — evita descartar em silêncio um carro que o operador já começou a
// cadastrar mas ainda não sabe a placa. Só a linha 100% vazia (o veículo em
// branco que todo formulário nasce com, ver veiculoFormVazio) é ignorada.
function veiculoTemAlgumDadoPreenchido(veiculo: ClienteFormValues["veiculos"][number]): boolean {
  return Boolean(
    veiculo.placa.trim() ||
      veiculo.marca.trim() ||
      veiculo.modelo.trim() ||
      veiculo.ano.trim() ||
      veiculo.cor.trim() ||
      veiculo.tipo.trim() ||
      veiculo.km_atual.trim(),
  );
}

export function paraVeiculosPreenchidos(
  veiculos: ClienteFormValues["veiculos"],
): VeiculoFormulario[] {
  return veiculos
    .filter(veiculoTemAlgumDadoPreenchido)
    .map((veiculo) => ({
      id: veiculo.id,
      placa: veiculo.placa,
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      ano: paraNumeroOuNulo(veiculo.ano),
      cor: veiculo.cor,
      tipo: (veiculo.tipo || null) as TipoVeiculo | null,
      km_atual: paraNumeroOuNulo(veiculo.km_atual),
    }));
}
