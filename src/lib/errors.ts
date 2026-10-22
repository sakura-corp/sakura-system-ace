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
 * O programa pediu uma coluna que o banco desta empresa ainda não tem: a
 * versão nova chegou antes da migration (a ordem certa é o banco primeiro,
 * mas migration com `versao-minima-do-programa` faz o contrário de
 * propósito — ex.: criar orçamento antes da 0065). Sem isto, a tela mostrava
 * o inglês técnico do PostgREST.
 */
export const MENSAGEM_BANCO_DESATUALIZADO =
  "O banco desta empresa ainda não foi atualizado pra esta versão do programa, então isto ainda não funciona. Avise quem cuida do sistema.";

function traduzir(mensagem: string): string {
  if (/violates row-level security policy/.test(mensagem)) return MENSAGEM_SEM_PERMISSAO;
  if (/Could not find the '[^']+' column|column [^ ]+ does not exist/.test(mensagem)) {
    return MENSAGEM_BANCO_DESATUALIZADO;
  }
  return traduzirTrava(mensagem) ?? mensagem;
}

export function mensagemDeErro(erro: unknown): string {
  if (erro && typeof erro === "object" && "message" in erro) {
    const mensagem = (erro as { message?: unknown }).message;
    if (typeof mensagem === "string" && mensagem.length > 0) return traduzir(mensagem);
  }
  if (erro instanceof Error) return traduzir(erro.message);
  return "Erro desconhecido ao salvar. Veja o console para mais detalhes.";
}
