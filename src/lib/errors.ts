import { MENSAGEM_PERCENTUAL_TRIBUTOS_SIMPLES } from "@/schemas/percentualTributosSimples";

/**
 * A frase em português de cada trava do banco (migrations 0058 a 0060).
 *
 * Sem isto, quem esbarra numa trava lê "new row for relation ... violates
 * check constraint ...", que não diz o que fazer (item TR-02.6 do guia). O
 * nome da trava é a chave — por isso toda trava nova tem nome explícito
 * `ck_<tabela>_<regra>`, e ganha uma linha aqui.
 */
export const MENSAGEM_DA_TRAVA: Record<string, string> = {
  // Orçamento (#379, migration 0065).
  ck_ordens_servico_numero_orcamento:
    "Orçamento não tem número de OS, e OS não volta a ser orçamento. Atualize a tela e confira.",
  ck_ordens_servico_numero_orcamento_obrigatorio:
    "O orçamento ficou sem número de orçamento. Atualize a tela e tente de novo.",
  ck_ordens_servico_motivo_recusa:
    "Motivo de recusa inválido: escolha um da lista (preço, prazo, outro lugar, desistiu ou outro).",
  // Esta vem do gatilho (um CHECK não vê o status de antes), com a mesma frase de um CHECK.
  ck_ordens_servico_transicao_orcamento:
    "Orçamento só pode ser aprovado ou recusado, e recusado não muda mais. Atualize a tela e confira.",
  ck_ordens_servico_itens_preco: "O preço do item não pode ser negativo.",
  ck_ordens_servico_itens_desconto:
    "O desconto do item não pode ser negativo nem maior que o valor do item (quantidade × preço).",
  ck_ordens_servico_itens_custo: "O custo do item não pode ser negativo.",
  ck_pecas_preco_custo: "O preço de custo não pode ser negativo.",
  ck_pecas_preco_venda: "O preço de venda não pode ser negativo.",
  ck_pecas_prazo_garantia: "O prazo de garantia não pode ser negativo.",
  ck_pecas_aliquota_icms: "A alíquota de ICMS precisa estar entre 0 e 100%.",
  ck_servicos_preco_padrao: "O preço do serviço não pode ser negativo.",
  ck_servicos_custo: "O custo do serviço não pode ser negativo.",
  ck_contas_pagar_valor: "O valor da conta não pode ser negativo.",
  ck_contas_receber_valor: "O valor a receber não pode ser negativo.",
  ck_pedidos_compra_itens_preco: "O preço do item do pedido não pode ser negativo.",
  ck_pedidos_compra_itens_recebida: "A quantidade recebida não pode ser negativa.",
  ck_ordens_servico_datas:
    "A data de fechamento ficou antes da abertura da OS. Confira a data e a hora deste computador.",
  ck_juros_percentual: "O juro de parcelamento precisa estar entre 0 e 100%.",
  ck_config_fiscal_aliquota_iss: "A alíquota de ISS precisa estar entre 0 e 10%.",
  ck_config_fiscal_cnpj: "O CNPJ da loja está incompleto — ele tem 14 caracteres.",
  // Migration 0078 (#866).
  ck_config_fiscal_percentual_tributos_simples: MENSAGEM_PERCENTUAL_TRIBUTOS_SIMPLES,
  // Migration 0081 (#456): os limites do código do Pix (BR Code).
  ck_config_pix_chave: "A chave Pix não pode ficar em branco nem passar de 77 letras.",
  ck_config_pix_nome_recebedor: "O nome de quem recebe o Pix não pode ficar em branco nem passar de 25 letras.",
  ck_config_pix_cidade_recebedor: "A cidade de quem recebe o Pix não pode ficar em branco nem passar de 15 letras.",
  ck_clientes_cnpj_juridica:
    "O CNPJ está incompleto — ele tem 14 caracteres. Complete ou deixe o campo em branco.",
  ck_fechamentos_caixa_valores: "O valor contado e o troco não podem ser negativos.",
  ck_comissoes_fechamentos_valores:
    "O valor pago não pode ser negativo, e o fim do período não pode vir antes do início.",
  // Migration 0063 (computadores). Quem grava é o próprio programa, a cada
  // login — estas frases só aparecem se algo muito estranho chegar ao banco.
  ck_computadores_versao: "A versão do programa informada por este computador não está no formato 0.9.43.",
  ck_computadores_canal: 'O canal de atualização deste computador precisa ser "normal" ou "teste".',
  ck_computadores_tamanhos: "O nome ou o apelido do computador está comprido demais (apelido: até 60 letras).",
  // Migration 0064 (venda de balcão). Quem grava o tipo é o próprio programa.
  ck_ordens_servico_tipo: 'O tipo da ordem precisa ser "os" ou "venda_balcao".',
};

/** A frase da trava, se a mensagem do banco for de uma trava conhecida. */
export function traduzirTrava(mensagem: string): string | null {
  const casou = /violates check constraint "([^"]+)"/.exec(mensagem);
  return casou ? (MENSAGEM_DA_TRAVA[casou[1]] ?? null) : null;
}

/**
 * O banco recusou por PERMISSÃO (RLS), desde que a permissão de módulo passou
 * a ser conferida lá também (TR-04.1, migrations 0056 e 0061).
 *
 * Só a recusa de GRAVAR chega aqui como erro: a de LER não dá erro nenhum, só
 * devolve zero linha (§6 item 15) — é por isso que as telas conferem a
 * permissão antes de pedir, em vez de contar com esta frase.
 */
export const MENSAGEM_SEM_PERMISSAO =
  "Você não tem permissão pra fazer isso. Peça a um administrador pra liberar o módulo no seu cadastro (Configurações → Operadores).";

/**
 * Dois computadores se travaram um esperando o outro (deadlock, código 40P01
 * do Postgres): o banco desfaz um dos dois por inteiro e o outro segue. Raro
 * (ex.: juntar peças enquanto outra tela mexe nas mesmas peças), mas a frase
 * do Postgres vinha em inglês (#803).
 */
export const MENSAGEM_TRAVAMENTO_MUTUO =
  "Outro computador estava mexendo nas mesmas informações ao mesmo tempo, e este pedido não foi gravado. Atualize a tela e tente de novo.";

/**
 * O programa pediu uma coluna ou view que o banco desta empresa ainda não tem: a
 * versão nova chegou antes da migration (a ordem certa é o banco primeiro,
 * mas migration com `versao-minima-do-programa` faz o contrário de
 * propósito — ex.: criar orçamento antes da 0065). Sem isto, a tela mostrava
 * o inglês técnico do PostgREST.
 */
export const MENSAGEM_BANCO_DESATUALIZADO =
  "O banco desta empresa ainda não foi atualizado pra esta versão do programa, então isto ainda não funciona. Avise quem cuida do sistema.";

/**
 * Colunas e views novas do banco (da 0065 em diante). Só elas viram o aviso de
 * banco desatualizado: uma coluna ou tabela qualquer que falta é erro de
 * programação (nome errado), e mandar "atualizar o banco" ali só esconderia o
 * defeito.
 *
 * Migration nova que acrescenta coluna ou cria view entra aqui: o teste em
 * `errors.test.ts` lê `supabase/migrations/` e reprova se faltar.
 */
export const OBJETOS_NOVOS_DO_BANCO = [
  // 0065 (orçamento): colunas de ordens_servico.
  "numero_orcamento",
  "validade",
  "aprovado_por",
  "aprovado_em",
  "motivo_recusa",
  "recusado_em",
  "orcado_em",
  // 0066 (peça avulsa): coluna de ordens_servico_itens.
  "custo_unitario",
  // 0068 (clientes por janela): views.
  "clientes_janela",
  "veiculos_janela",
  // 0073 (peças por janela): views.
  "pecas_janela",
  "estoque_saldos",
  // 0075 (OS por janela): views.
  "ordens_servico_caixa",
  "ordens_servico_comissoes",
  "ordens_servico_garantias",
  "ordens_servico_notas",
  "ordens_servico_clientes",
  // 0078 (percentual dos tributos do Simples): coluna de configuracoes_fiscais_loja.
  "percentual_tributos_simples",
] as const;

/**
 * O nome da coluna, tabela ou view que falta, do jeito do PostgREST ou do
 * Postgres; null se não é esse erro.
 */
function objetoQueFalta(mensagem: string): string | null {
  const colunaDoPostgrest = /Could not find the '([^']+)' column/.exec(mensagem);
  if (colunaDoPostgrest) return colunaDoPostgrest[1];
  // "column ordens_servico.validade does not exist" ou
  // 'column "validade" of relation "ordens_servico" does not exist'
  const colunaDoPostgres = /column "?(?:[\w]+\.)?([\w]+)"?(?: of relation "[^"]+")? does not exist/.exec(mensagem);
  if (colunaDoPostgres) return colunaDoPostgres[1];
  // "Could not find the table 'public.clientes_janela' in the schema cache"
  const tabelaDoPostgrest = /Could not find the table '(?:[\w]+\.)?([\w]+)'/.exec(mensagem);
  if (tabelaDoPostgrest) return tabelaDoPostgrest[1];
  // 'relation "clientes_janela" does not exist' (ou "public.clientes_janela")
  const tabelaDoPostgres = /relation "(?:[\w]+\.)?([\w]+)" does not exist/.exec(mensagem);
  return tabelaDoPostgres ? tabelaDoPostgres[1] : null;
}

function traduzir(mensagem: string): string {
  if (/violates row-level security policy/.test(mensagem)) return MENSAGEM_SEM_PERMISSAO;
  if (/\bdeadlock detected\b/.test(mensagem)) return MENSAGEM_TRAVAMENTO_MUTUO;
  const objeto = objetoQueFalta(mensagem);
  if (objeto && (OBJETOS_NOVOS_DO_BANCO as readonly string[]).includes(objeto)) {
    return MENSAGEM_BANCO_DESATUALIZADO;
  }
  return traduzirTrava(mensagem) ?? mensagem;
}

export function mensagemDeErro(erro: unknown): string {
  // Pelo código, que não depende do idioma do banco nem de quem embrulhou a frase.
  if (erro && typeof erro === "object" && (erro as { code?: unknown }).code === "40P01") {
    return MENSAGEM_TRAVAMENTO_MUTUO;
  }
  if (erro && typeof erro === "object" && "message" in erro) {
    const mensagem = (erro as { message?: unknown }).message;
    if (typeof mensagem === "string" && mensagem.length > 0) return traduzir(mensagem);
  }
  if (erro instanceof Error) return traduzir(erro.message);
  return "Erro desconhecido ao salvar. Se continuar, mande um print desta mensagem pra quem cuida do sistema.";
}
