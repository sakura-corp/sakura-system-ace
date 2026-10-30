export interface JurosParcela {
  loja_id: string;
  numero_parcelas: number;
  juros_percentual: number;
}

export interface ConfiguracaoGarantia {
  loja_id: string;
  texto: string;
}

export type RegimeTributario = "simples_nacional" | "lucro_presumido" | "lucro_real";
export type AmbienteFocusNfe = "homologacao" | "producao";

export interface ConfiguracaoFiscalLoja {
  loja_id: string;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  regime_tributario: RegimeTributario | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  // O token da Focus NFe NÃO vem mais pra cá (item TR-04.2): ele mora no
  // cofre `segredos_fiscais_loja`, que nenhum operador lê, e quem usa é o
  // porteiro (Edge Function focus-nfe). A tela só fica sabendo SE a loja tem
  // token — é o que diz `focus_nfe_configurado`, que não é coluna da tabela,
  // é a resposta de `loja_tem_token_focus_nfe()`. Trocar o token é por
  // `definirTokenFocusNfe()` (lib/configuracoes.ts): dá pra escrever, nunca
  // ler de volta.
  focus_nfe_configurado: boolean;
  focus_nfe_ambiente: AmbienteFocusNfe;
  // Usados só na emissão de NFS-e (serviço) — NFC-e (peça) não precisa de
  // nenhum destes. codigo_municipio é o código IBGE da cidade da loja;
  // item_lista_servico é o código da LC 116/2003 (padrão "14.01" — manutenção
  // e conservação de veículos); codigo_tributario_municipio é específico da
  // prefeitura, só alguns municípios exigem; codigo_cnae vem do Cartão CNPJ
  // da empresa ("Atividade econômica principal") — algumas prefeituras
  // (Araraquara incluída) exigem esse campo pra autorizar a nota.
  codigo_municipio: string | null;
  item_lista_servico: string | null;
  aliquota_iss: number | null;
  codigo_tributario_municipio: string | null;
  codigo_cnae: string | null;
  // Lembrete da alíquota da competência (migration 0049, só NFS-e):
  // competencia_aliquota_confirmada é o mês (dia 1º) cuja alíquota já foi
  // cadastrada no portal da prefeitura — enquanto for diferente do mês
  // corrente, o Início avisa. aliquota_passo_a_passo é o caminho dentro do
  // portal, editável porque muda de município pra município (em branco, vale
  // o padrão de Araraquara em schemas/aliquotaCompetencia.ts).
  competencia_aliquota_confirmada: string | null;
  aliquota_passo_a_passo: string | null;
  atualizado_em: string;
}

export const REGIME_TRIBUTARIO_LABEL: Record<RegimeTributario, string> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
};

export type CartaoMetrica =
  | "vendas_mes"
  | "custos_mes"
  | "lucro_mes"
  | "ticket_medio_mes"
  | "contas_pagar_vencendo";

export const CARTAO_METRICA_LABEL: Record<CartaoMetrica, string> = {
  vendas_mes: "Recebido no mês",
  custos_mes: "Custos do mês",
  lucro_mes: "Lucro do mês",
  ticket_medio_mes: "Ticket médio do mês",
  contas_pagar_vencendo: "Contas a pagar vencendo",
};

/**
 * Quantos dias à frente o cartão "Contas a pagar vencendo" enxerga.
 *
 * Mora aqui, e não junto da conta em `schemas/painelInicio.ts`, porque a
 * explicação do cartão (logo abaixo) precisa citar esse número — e número
 * escrito duas vezes é número que uma hora diverge.
 */
export const DIAS_DE_CONTAS_VENCENDO = 15;

/**
 * O que cada cartão conta, em uma frase, pro "?" ao lado do título.
 *
 * Não é enfeite: a definição de "lucro" deste sistema já mudou uma vez
 * (PROJETO_STATUS.md, seção 6, item 40) e o número caiu bastante de um dia
 * pro outro. Sem a definição à mão, quem olha conclui que o negócio piorou.
 */
export const CARTAO_METRICA_DESCRICAO: Record<CartaoMetrica, string> = {
  vendas_mes:
    "Tudo que entrou no caixa do dia 1º até hoje: ordens de serviço faturadas mais as entradas lançadas à mão. OS aberta e ainda não recebida não entra (ela aparece no \"Vendido no mês\" da Lucratividade).",
  custos_mes:
    "O que a loja pagou pelas peças e pelos serviços vendidos no mês, mais as saídas lançadas à mão (aluguel, sucata, fornecedor).",
  lucro_mes:
    "O recebido no mês menos o custo das peças e serviços vendidos, menos as saídas lançadas no caixa.",
  ticket_medio_mes:
    "Quanto rendeu, em média, cada ordem de serviço faturada no mês — a média é por ordem, não por pagamento, então dividir em duas formas não muda o número. Venda de balcão não entra: ela conta nas vendas e no lucro, mas não é um carro atendido.",
  contas_pagar_vencendo: `Soma das contas ainda não pagas que vencem nos próximos ${DIAS_DE_CONTAS_VENCENDO} dias, já incluindo as que passaram do vencimento.`,
};

// Custos não entra no padrão de propósito — a usuária achou estranho mostrar
// algo "negativo" logo de cara no Início; continua disponível pra quem
// quiser escolher em Configurações → "Cartões do Início".
export const CARTOES_INICIO_PADRAO: CartaoMetrica[] = [
  "vendas_mes",
  "lucro_mes",
  "ticket_medio_mes",
];

export interface ConfiguracaoPainelInicio {
  loja_id: string;
  cartoes: CartaoMetrica[];
}
