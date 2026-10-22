import type { TipoVeiculo } from "@/types/cliente";
import type { MotivoRecusa } from "@/schemas/orcamento";

/**
 * "orcamento" e "recusado" são a etapa de orçamento da OS (#379, migration
 * 0065): moram na mesma tabela, mas não são venda — não baixam estoque, não
 * têm número de OS e não entram em conta nenhuma (ver `contaNosNumeros` em
 * `src/schemas/orcamento.ts`).
 */
export type StatusOS = "orcamento" | "recusado" | "em_andamento" | "concluida" | "faturada";

/**
 * "os" é a ordem de serviço de sempre; "venda_balcao" é a venda de peça no
 * balcão, sem veículo (migration 0064, item FN-09). As duas moram na mesma
 * tabela, de propósito: baixa de estoque, caixa, nota e garantia são as
 * mesmas. O que muda é a tela e onde cada uma aparece.
 */
export type TipoOrdem = "os" | "venda_balcao";

/**
 * `tipo` pode chegar ausente: banco anterior à migration 0064 não tem a
 * coluna. Ausente é OS — que é o que toda ordem era antes de a venda existir.
 */
export function ehVendaBalcao(ordem: { tipo?: TipoOrdem | null } | null | undefined): boolean {
  return ordem?.tipo === "venda_balcao";
}

export type TipoItemOS = "peca" | "servico";

export interface ItemOS {
  id: string;
  ordem_servico_id: string;
  tipo: TipoItemOS;
  peca_id: string | null;
  servico_id: string | null;
  tecnico_id: string | null;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  tecnico?: { nome: string } | null;
}

export type NovoItemOS = Omit<ItemOS, "id" | "ordem_servico_id" | "tecnico">;

// O que dá pra mudar num item que já está lançado na OS. É o mesmo conjunto
// de campos de um item novo — a diferença é que aqui o item já existe no
// banco (e, se for peça, já baixou estoque), então quem grava precisa
// comparar com o valor antigo pra acertar a diferença.
export type PatchItemOS = NovoItemOS;

export interface OrdemServico {
  id: string;
  /**
   * Número de OS. Nulo enquanto é orçamento (aberto ou recusado): o número
   * de OS só nasce na aprovação (migration 0065), e a OS segue a sequência
   * sem buraco. Pra mostrar, use `nomeDocumento`.
   */
  numero: number | null;
  loja_id: string;
  /** Ausente em banco anterior à migration 0064 — ver `ehVendaBalcao`. */
  tipo?: TipoOrdem;
  cliente_id: string;
  veiculo_id: string | null;
  status: StatusOS;
  km_entrada: number | null;
  descricao_problema: string | null;
  forma_pagamento: string | null;
  parcelas: number;
  data_abertura: string;
  data_fechamento: string | null;
  vendedor_id: string | null;
  criado_por_id: string | null;
  atualizado_por_id: string | null;
  cliente?: { nome: string };
  veiculo?: {
    placa: string;
    marca: string | null;
    modelo: string | null;
    cor: string | null;
    tipo: TipoVeiculo | null;
  } | null;
  vendedor?: { nome: string } | null;
  criado_por?: { nome: string } | null;
  atualizado_por?: { nome: string } | null;
  itens?: ItemOS[];
  // Orçamento (#379, migration 0065). Opcionais: banco anterior não tem as
  // colunas.
  /** Contador próprio dos orçamentos, por loja. Continua lá depois de aprovado. */
  numero_orcamento?: number | null;
  /** Dia de calendário ("AAAA-MM-DD") até quando o orçamento vale. */
  validade?: string | null;
  /** Quem aprovou, em texto livre ("o próprio, pelo telefone"). */
  aprovado_por?: string | null;
  aprovado_em?: string | null;
  motivo_recusa?: MotivoRecusa | null;
  recusado_em?: string | null;
  /** Quando o orçamento foi feito. Só na OS que nasceu de orçamento: na
   * aprovação, o banco guarda aqui a data antiga e põe a da aprovação em
   * `data_abertura`. */
  orcado_em?: string | null;
}

/** Ordem que já tem número de OS — toda ordem que não é orçamento. */
export type OrdemNumerada = OrdemServico & { numero: number };

/** Guarda de tipo: a ordem já tem número de OS (não é orçamento). */
export function temNumeroDeOS(ordem: OrdemServico): ordem is OrdemNumerada {
  return ordem.numero !== null;
}

export interface NovaOrdemServico {
  cliente_id: string;
  veiculo_id: string | null;
  km_entrada: number | null;
  descricao_problema: string | null;
  vendedor_id: string | null;
  /**
   * Só a venda de balcão manda estes dois: ela é "venda_balcao" e já nasce
   * "concluida" (não existe "em andamento" numa venda de balcão). A OS de
   * sempre não manda nenhum — e assim continua funcionando num banco
   * anterior à migration 0064, que nem tem a coluna `tipo`.
   */
  tipo?: TipoOrdem;
  status?: StatusOS;
}

export type PatchOrdemServico = Partial<
  Pick<
    OrdemServico,
    | "cliente_id"
    | "veiculo_id"
    | "km_entrada"
    | "descricao_problema"
    | "vendedor_id"
    | "status"
    | "validade"
  >
>;

// Status em que a aba "Fechamento" (garantia + emissão de nota fiscal) fica
// disponível — usado tanto pelo form da OS (pra decidir se mostra a aba)
// quanto pela lista (pra decidir se mostra o atalho direto pra ela).
export const STATUS_COM_FECHAMENTO: StatusOS[] = ["concluida", "faturada"];

export const STATUS_LABEL: Record<StatusOS, string> = {
  orcamento: "Orçamento",
  recusado: "Recusado",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  faturada: "Faturada",
};

// Cores por status pra bater o olho rápido numa lista grande — "concluída"
// (esperando faturar) usa laranja de propósito, pra chamar mais atenção que
// as outras: é o estado que ainda exige uma ação (faturar).
export const STATUS_COR: Record<StatusOS, string> = {
  // Orçamento ainda não é trabalho na oficina: cinza, neutro (pedido da
  // tarefa #379). Recusado também — é só histórico.
  orcamento: "bg-slate-100 text-slate-700",
  recusado: "bg-slate-100 text-slate-700",
  em_andamento: "bg-amber-50 text-amber-800",
  concluida: "bg-orange-100 text-orange-800",
  faturada: "bg-emerald-50 text-emerald-700",
};

// Nome curto e amigável da OS pra exibir em qualquer lugar do app — nunca o
// UUID (`ordem.id`), que não tem nenhum sentido pra quem usa o sistema.
// Venda de balcão usa o MESMO contador de número (migration 0064), então o
// número sozinho já é único na loja; o tipo só troca a palavra.
export function nomeOrdem(numero: number, tipo?: TipoOrdem | null): string {
  return `${tipo === "venda_balcao" ? "Venda" : "OS"} ${numero}`;
}

/**
 * O nome que acompanha a etapa (#379): "Orçamento 45" enquanto é orçamento
 * (aberto ou recusado, sem número de OS); "OS 17" / "Venda 17" depois.
 * Prefira esta a `nomeOrdem` sempre que a ordem puder ser um orçamento.
 */
export function nomeDocumento(ordem: {
  status?: StatusOS;
  numero: number | null;
  numero_orcamento?: number | null;
  tipo?: TipoOrdem | null;
}): string {
  if (ordem.numero === null || ordem.status === "orcamento" || ordem.status === "recusado") {
    return `Orçamento ${ordem.numero_orcamento ?? ""}`.trim();
  }
  return nomeOrdem(ordem.numero, ordem.tipo);
}

export const FORMA_PAGAMENTO_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_debito: "Cartão de débito",
  cartao_credito: "Cartão de crédito",
};

// Só precisa dos três campos da conta — e aceitar só eles deixa quem busca
// uma versão enxuta do item (a ficha do veículo, por exemplo) usar a MESMA
// conta, em vez de escrever outra igual.
export function totalOrdem(
  itens: readonly Pick<ItemOS, "quantidade" | "preco_unitario" | "desconto">[],
): number {
  return itens.reduce(
    (total, item) => total + item.quantidade * item.preco_unitario - item.desconto,
    0,
  );
}

export function totalPorTipo(itens: ItemOS[], tipo: TipoItemOS): number {
  return itens
    .filter((item) => item.tipo === tipo)
    .reduce((total, item) => total + item.quantidade * item.preco_unitario - item.desconto, 0);
}
