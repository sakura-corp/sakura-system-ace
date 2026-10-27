import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import { criarMovimentoCaixa } from "./caixa";
import { criarContaReceber } from "./contasReceber";
import { buscarDepositoPadraoId } from "./depositos";
import { mensagemDeErro } from "./errors";
import { somar } from "@/schemas/dinheiro";
import { idsDeFuncionarios, nomearFuncionarios } from "@/schemas/ordemServico";
import {
  baixaEstoqueAoLancarItem,
  contaNosNumeros,
  STATUS_DE_ORCAMENTO,
} from "@/schemas/orcamento";
import type { MotivoRecusa } from "@/schemas/orcamento";
import { FORMA_PAGAMENTO_LABEL, nomeDocumento } from "@/types/os";
import type {
  ItemOS,
  NovaOrdemServico,
  NovoItemOS,
  OrdemServico,
  PatchItemOS,
  PatchOrdemServico,
} from "@/types/os";

export interface PagamentoOrdem {
  formaPagamento: string;
  valor: number;
}

// Os nomes de vendedor e técnico NÃO vêm mais por join embutido aqui.
// Desde a migration 0056 (TR-04.3), `funcionarios` só responde a quem tem o
// módulo — e um join embutido devolveria `null` calado pro balconista,
// apagando o "técnico: Fulano" da OS e do documento de garantia dele. Os
// nomes passam a vir da view `funcionarios_publico`, numa consulta à parte
// que é costurada em `nomearFuncionarios()` logo abaixo.
const SELECT_ORDEM =
  "*, cliente:clientes_janela(nome), veiculo:veiculos_janela(placa, marca, modelo, cor, tipo), " +
  "criado_por:operadores!ordens_servico_criado_por_id_fkey(nome), " +
  "atualizado_por:operadores!ordens_servico_atualizado_por_id_fkey(nome), " +
  "itens:ordens_servico_itens(*)";

export async function listarOrdens(lojaId: string): Promise<OrdemServico[]> {
  // Por páginas: o Supabase corta em 1.000 linhas. `id` desempata aberturas iguais.
  const dados = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("ordens_servico")
      .select(SELECT_ORDEM)
      .eq("loja_id", lojaId)
      .order("data_abertura", { ascending: false })
      .order("id", { ascending: false })
      .range(de, ate),
  );
  const ordens = dados as unknown as OrdemServico[];
  return nomearFuncionarios(ordens, await buscarNomesDeFuncionarios(ordens));
}

/**
 * Só os orçamentos (abertos e recusados) da loja, filtrados no banco. A tela de
 * Orçamentos não precisa da loja inteira: `listarOrdens` trazia todas as OS com
 * itens a cada abertura e a cada aprovação.
 */
export async function listarOrcamentos(lojaId: string): Promise<OrdemServico[]> {
  const dados = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("ordens_servico")
      .select(SELECT_ORDEM)
      .eq("loja_id", lojaId)
      .in("status", [...STATUS_DE_ORCAMENTO])
      .order("data_abertura", { ascending: false })
      .order("id", { ascending: false })
      .range(de, ate),
  );
  const ordens = dados as unknown as OrdemServico[];
  return nomearFuncionarios(ordens, await buscarNomesDeFuncionarios(ordens));
}

export type OrdemParaKmDoVeiculo = Pick<
  OrdemServico,
  "id" | "veiculo_id" | "km_entrada" | "data_abertura" | "status"
>;

/**
 * As passagens de um veículo, só com o que o aviso de KM precisa (sem itens,
 * sem join). O formulário busca isto quando o veículo é escolhido, em vez de
 * receber a loja inteira.
 */
export async function listarOrdensDoVeiculo(veiculoId: string): Promise<OrdemParaKmDoVeiculo[]> {
  const dados = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("ordens_servico")
      .select("id, veiculo_id, km_entrada, data_abertura, status")
      .eq("veiculo_id", veiculoId)
      .order("data_abertura", { ascending: false })
      .order("id", { ascending: false })
      .range(de, ate),
  );
  return dados as unknown as OrdemParaKmDoVeiculo[];
}

/**
 * Quantos orçamentos esperam resposta, pro número ao lado de "Orçamentos" no
 * menu (#379). Só conta (`head: true`), não traz linha nenhuma: o menu pergunta
 * isso a cada troca de tela, e `listarOrdens` traria a loja inteira.
 */
export async function contarOrcamentosAbertosDaLoja(lojaId: string): Promise<number> {
  const { count, error } = await supabase
    .from("ordens_servico")
    .select("id", { count: "exact", head: true })
    .eq("loja_id", lojaId)
    .eq("status", "orcamento");
  if (error) throw error;
  return count ?? 0;
}

// Busca o nome de cada funcionário citado nestas ordens, e só deles. Devolve
// um mapa vazio quando não há ninguém a procurar, pra não gastar uma consulta
// numa loja que ainda não preenche técnico nem vendedor.
async function buscarNomesDeFuncionarios(
  ordens: OrdemServico[],
): Promise<Map<string, string>> {
  const ids = idsDeFuncionarios(ordens);
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("funcionarios_publico")
    .select("id, nome")
    .in("id", ids);

  if (error) throw error;
  return new Map((data as { id: string; nome: string }[]).map((f) => [f.id, f.nome]));
}

// Grava os itens e, se `baixarEstoque`, lança a saída das peças. Orçamento
// não baixa (#379): a peça só sai da prateleira na aprovação, que é a função
// `aprovar_orcamento` do banco (migration 0071, ver `aprovarOrcamento`).
async function inserirItens(
  ordemId: string,
  referencia: string,
  itens: NovoItemOS[],
  lojaId: string,
  baixarEstoque: boolean,
): Promise<void> {
  if (itens.length === 0) return;

  const { error: erroItens } = await supabase.from("ordens_servico_itens").insert(
    itens.map((item) => ({ ...item, ordem_servico_id: ordemId })),
  );
  if (erroItens) throw erroItens;

  if (baixarEstoque) await baixarEstoqueDasPecas(itens, referencia, lojaId);
}

// A saída de estoque das peças de uma ordem. Item de serviço e peça digitada
// à mão (sem cadastro) não mexem no estoque.
async function baixarEstoqueDasPecas(
  itens: Pick<NovoItemOS, "tipo" | "peca_id" | "quantidade">[],
  referencia: string,
  lojaId: string,
): Promise<void> {
  const itensPeca = itens.filter((item) => item.tipo === "peca" && item.peca_id);
  if (itensPeca.length > 0) {
    const depositoId = await buscarDepositoPadraoId(lojaId);
    const { error: erroEstoque } = await supabase.from("estoque_movimentos").insert(
      itensPeca.map((item) => ({
        peca_id: item.peca_id,
        deposito_id: depositoId,
        tipo: "saida" as const,
        quantidade: item.quantidade,
        motivo: "uso_em_os" as const,
        referencia,
        loja_id: lojaId,
      })),
    );
    if (erroEstoque) throw erroEstoque;
  }
}

export async function criarOrdem(
  ordem: NovaOrdemServico,
  itens: NovoItemOS[],
  operadorId: string,
  lojaId: string,
): Promise<OrdemServico> {
  const { data: ordemCriada, error: erroOrdem } = await supabase
    .from("ordens_servico")
    .insert({
      ...ordem,
      criado_por_id: operadorId,
      atualizado_por_id: operadorId,
      loja_id: lojaId,
    })
    .select()
    .single();

  if (erroOrdem) throw erroOrdem;

  const criada = ordemCriada as OrdemServico;
  await inserirItens(
    criada.id,
    nomeDocumento(criada),
    itens,
    lojaId,
    baixaEstoqueAoLancarItem(criada.status),
  );

  return criada;
}

/**
 * Cria um orçamento (#379): uma ordem com status "orcamento", sem número de
 * OS (o banco dá o número do orçamento) e SEM baixar estoque. Se os itens
 * não gravam, o orçamento é apagado — não há estoque a desfazer, então
 * tentar de novo é seguro.
 *
 * `dados` é o mesmo da OS, sem `tipo` (orçamento no balcão está fora da
 * tarefa) nem `status`. `validade` é dia de calendário ("AAAA-MM-DD"); o
 * padrão é `validadePadrao()` de `src/schemas/orcamento.ts`.
 */
export async function criarOrcamento(
  dados: Omit<NovaOrdemServico, "tipo" | "status">,
  itens: NovoItemOS[],
  validade: string,
  operadorId: string,
  lojaId: string,
): Promise<OrdemServico> {
  const { data, error } = await supabase
    .from("ordens_servico")
    .insert({
      ...dados,
      status: "orcamento",
      validade,
      criado_por_id: operadorId,
      atualizado_por_id: operadorId,
      loja_id: lojaId,
    })
    .select()
    .single();
  if (error) throw error;
  const orcamento = data as OrdemServico;

  try {
    await inserirItens(orcamento.id, nomeDocumento(orcamento), itens, lojaId, false);
  } catch (erroItens) {
    const { error: erroDesfazer } = await supabase
      .from("ordens_servico")
      .delete()
      .eq("id", orcamento.id);
    if (erroDesfazer) console.error("Não deu pra desfazer o orçamento pela metade:", erroDesfazer);
    throw erroItens;
  }

  return orcamento;
}

const MENSAGEM_JA_RESPONDIDO =
  "Este orçamento já foi aprovado ou recusado (talvez em outro computador). Atualize a lista.";

/**
 * A OS foi aprovada (e já tem número), mas a baixa das peças não entrou. Desde
 * a #706 a aprovação e a baixa são uma transação só no banco, então
 * `aprovarOrcamento` não lança mais este erro quando a baixa falha (a
 * aprovação também não entra). A classe continua porque a tela a testa com
 * `instanceof` e o `PecaNaoLigadaNaAprovacaoError` herda dela: a reação certa
 * é NÃO aprovar de novo (nem dá: já não é orçamento).
 */
export class AprovadoSemEstoqueError extends Error {
  constructor(
    readonly ordem: OrdemServico,
    motivo: string,
  ) {
    super(
      `A ${nomeDocumento(ordem)} foi aprovada, mas a baixa das peças no estoque não entrou: ` +
        `${motivo}. Confira o estoque em Movimentações e lance a saída à mão.`,
    );
    this.name = "AprovadoSemEstoqueError";
  }
}

/**
 * A aprovação entrou e o estoque das peças ligadas baixou, mas alguma peça
 * avulsa não foi ligada ao cadastro (#655): ela ficou como peça digitada,
 * sem baixa. É um `AprovadoSemEstoqueError` pra tela tratar igual (a OS já
 * nasceu, não tentar de novo); só a mensagem muda.
 */
export class PecaNaoLigadaNaAprovacaoError extends AprovadoSemEstoqueError {
  constructor(ordem: OrdemServico, descricoes: string[]) {
    super(ordem, "");
    const lista = descricoes.map((d) => `"${d}"`).join(", ");
    this.message =
      descricoes.length === 1
        ? `A ${nomeDocumento(ordem)} foi aprovada, mas a peça ${lista} não foi ligada ao cadastro: ` +
          "ficou como peça digitada, sem baixa no estoque. As outras peças foram baixadas. " +
          "Se ela saiu do estoque, lance a saída à mão em Movimentações."
        : `A ${nomeDocumento(ordem)} foi aprovada, mas as peças ${lista} não foram ligadas ao cadastro: ` +
          "ficaram como peças digitadas, sem baixa no estoque. As outras peças foram baixadas. " +
          "Se elas saíram do estoque, lance a saída à mão em Movimentações.";
    this.name = "PecaNaoLigadaNaAprovacaoError";
  }
}

/**
 * O cliente aprovou o orçamento (#379): vira OS "em andamento", ganha o
 * próximo número de OS (o gatilho da migration 0065 dá) e as peças saem do
 * estoque — o ÚNICO lugar em que um orçamento baixa estoque.
 *
 * É UMA chamada ao banco (`aprovar_orcamento`, migration 0071, #706): ela
 * trava a linha da OS, confere que ainda é orçamento, aprova, grava os
 * vínculos e baixa as peças, tudo na mesma transação. Dois computadores
 * aprovando juntos: o segundo espera a trava, vê que já não é orçamento e
 * recebe o aviso, sem baixar nada. Item que outro computador acrescenta no
 * instante da aprovação entra na baixa ou espera a trava e baixa por conta
 * própria (já como OS): não escapa do estoque. As peças baixadas são as que
 * estão no banco nessa hora, não as que a tela tinha.
 *
 * Se a baixa falha (ex.: sem depósito ativo), a aprovação também não entra:
 * a OS continua orçamento e é só tentar de novo. O erro diz isso com todas as
 * letras, pra ninguém achar que a OS nasceu. Por isso o
 * `AprovadoSemEstoqueError` não é mais lançado daqui.
 *
 * `vinculos` (#655): as peças avulsas que ganham cadastro na aprovação
 * (caminhos "existente" e "cadastrar", ver `vinculosDaAprovacao`). O banco
 * grava o `peca_id` delas DEPOIS de a aprovação pegar a linha e ANTES da
 * baixa. Se um vínculo falha, a OS já existe: o item fica avulso (sem baixa,
 * coerente), a baixa das outras continua e o banco devolve a lista dos "não
 * ligados", que vira o `PecaNaoLigadaNaAprovacaoError` abaixo. As "sem
 * cadastro" ficam de fora e não baixam.
 */
export async function aprovarOrcamento(
  orcamento: Pick<OrdemServico, "id">,
  aprovadoPor: string,
  operadorId: string,
  vinculos: { itemId: string; pecaId: string }[] = [],
): Promise<OrdemServico> {
  const { data, error } = await supabase.rpc("aprovar_orcamento", {
    p_ordem: orcamento.id,
    // O trim daqui, e não o do banco: o `trim()` do Postgres só tira espaço,
    // não tab nem quebra de linha.
    p_aprovado_por: aprovadoPor.trim(),
    p_operador: operadorId,
    p_vinculos: vinculos.map((v) => ({ item_id: v.itemId, peca_id: v.pecaId })),
  });
  if (error) {
    throw new Error(`O orçamento não foi aprovado e continua orçamento: ${mensagemDeErro(error)}`);
  }
  // Null: já não era orçamento (outro computador respondeu antes). Nada mudou.
  if (!data) throw new Error(MENSAGEM_JA_RESPONDIDO);
  const resposta = data as {
    ordem: OrdemServico;
    nao_ligados?: { id: string; descricao: string }[];
  };

  const naoLigados = resposta.nao_ligados ?? [];
  if (naoLigados.length > 0) {
    throw new PecaNaoLigadaNaAprovacaoError(
      resposta.ordem,
      naoLigados.map((item) => item.descricao),
    );
  }

  return resposta.ordem;
}

/**
 * A peça avulsa ganhou cadastro depois da aprovação (#655) — o caminho da
 * nota: a NFC-e precisa do NCM, e a tela cadastra a peça ali. O item passa a
 * apontar pra peça e, se a ordem já é OS (`contaNosNumeros`), baixa o estoque
 * dele, igual ao "cadastrar" da aprovação. Em orçamento só vincula: a
 * aprovação é que baixa.
 *
 * Só pega o item se ele ainda for avulso: chamado duas vezes (clique duplo,
 * outro computador), a segunda não troca a peça nem baixa de novo.
 *
 * @returns se o item foi vinculado agora (false: já tinha peça)
 */
export async function cadastrarPecaDoItem(
  item: ItemOS,
  pecaId: string,
  lojaId: string,
  ordem: OrdemServico,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("ordens_servico_itens")
    .update({ peca_id: pecaId })
    .eq("id", item.id)
    .eq("ordem_servico_id", ordem.id)
    .eq("tipo", "peca")
    .is("peca_id", null)
    .select();
  if (error) throw error;
  const vinculados = (data ?? []) as Pick<NovoItemOS, "tipo" | "peca_id" | "quantidade">[];
  if (vinculados.length === 0) return false;

  // Baixa o item como está no banco agora (quantidade de lá), não o da tela.
  // Daqui pra frente o item JÁ está ligado: se a baixa falhar, o erro diz
  // isso, pra ninguém cadastrar a peça de novo achando que não entrou.
  if (contaNosNumeros(ordem)) {
    try {
      await baixarEstoqueDasPecas(vinculados, nomeDocumento(ordem), lojaId);
    } catch (erroEstoque) {
      throw new PecaLigadaSemEstoqueError(ordem, mensagemDeErro(erroEstoque));
    }
  }
  return true;
}

/**
 * A peça foi ligada ao item da OS, mas a baixa no estoque não entrou. Como no
 * `AprovadoSemEstoqueError`, a reação certa é NÃO tentar de novo (o item já
 * tem a peça) e lançar a saída à mão em Movimentações.
 */
export class PecaLigadaSemEstoqueError extends Error {
  constructor(
    readonly ordem: OrdemServico,
    motivo: string,
  ) {
    super(
      `A peça foi ligada à ${nomeDocumento(ordem)}, mas a baixa no estoque não entrou: ` +
        `${motivo}. Lance a saída à mão em Movimentações.`,
    );
    this.name = "PecaLigadaSemEstoqueError";
  }
}

/**
 * O cliente não quis (#379). Motivo é opcional (um clique). Como na
 * aprovação, só pega a linha se ela ainda for orçamento.
 */
export async function recusarOrcamento(
  id: string,
  motivo: MotivoRecusa | null,
  operadorId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("ordens_servico")
    .update({
      status: "recusado",
      motivo_recusa: motivo,
      recusado_em: new Date().toISOString(),
      atualizado_por_id: operadorId,
    })
    .eq("id", id)
    .eq("status", "orcamento")
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(MENSAGEM_JA_RESPONDIDO);
}

export async function atualizarOrdem(
  id: string,
  patch: PatchOrdemServico,
  operadorId: string,
): Promise<void> {
  const { error } = await supabase
    .from("ordens_servico")
    .update({ ...patch, atualizado_por_id: operadorId })
    .eq("id", id);

  if (error) throw error;
}

// Só acrescenta itens novos numa OS (ou orçamento) já existente — corrigir
// um item já salvo é outro caminho, `editarItemOrdem()` logo abaixo. Em
// orçamento não baixa estoque; quem decide é o status no banco, dentro da
// função `adicionar_itens_ordem` (migration 0071, #706): ela trava a linha da
// OS, grava os itens, baixa as peças se já for OS e marca quem mexeu, tudo
// numa transação. Assim, aprovar em outro computador no mesmo instante não
// deixa item sem baixa. A loja do estoque é a da própria ordem, no banco.
// OS já faturada o banco recusa (outro computador pode ter faturado com a
// tela aberta aqui).
export async function adicionarItensOrdem(
  ordemId: string,
  itens: NovoItemOS[],
  operadorId: string,
): Promise<void> {
  if (itens.length === 0) {
    await atualizarOrdem(ordemId, {}, operadorId);
    return;
  }
  const { error } = await supabase.rpc("adicionar_itens_ordem", {
    p_ordem: ordemId,
    p_itens: itens,
    p_operador: operadorId,
  });
  if (error) throw error;
}

// Corrige um item já lançado numa OS (preço digitado errado, quantidade
// trocada, peça errada). Só faz sentido enquanto a OS ainda não foi
// faturada: depois do faturamento o pagamento já entrou no Caixa com o total
// antigo, e mexer no item deixaria os dois discordando — quem chama precisa
// garantir isso antes (a tela já esconde o botão), e o banco recusa se outro
// computador faturou com a tela aberta aqui.
//
// Uma chamada só (`editar_item_ordem`, migration 0071, #706): o banco trava a
// OS, relê o item (o original é o do banco, não o da tela), grava e lança só a
// DIFERENÇA de estoque (mudou a quantidade, trocou a peça, virou serviço, ou o
// contrário; some sozinha quando só o preço muda). Em orçamento (#379) nada de
// estoque: a aprovação baixa o que estiver gravado nessa hora. Se o estoque
// falha, a correção do item também não grava. `itemOriginal.id` é o que vale;
// a loja do estoque é a da própria ordem, no banco.
export async function editarItemOrdem(
  itemOriginal: ItemOS,
  patch: PatchItemOS,
  operadorId: string,
): Promise<void> {
  const { error } = await supabase.rpc("editar_item_ordem", {
    p_item: itemOriginal.id,
    p_patch: patch,
    p_operador: operadorId,
  });
  if (error) throw error;
}

/**
 * A venda de balcão foi gravada (e já baixou o estoque), mas o pagamento não
 * entrou. É um erro à parte porque pede uma reação diferente de qualquer
 * outro: NÃO registrar a venda de novo — isso baixaria o estoque duas vezes.
 * O certo é faturar a que já existe, pela lista de vendas.
 */
export class VendaSemFaturamentoError extends Error {
  constructor(
    readonly ordem: OrdemServico,
    motivo: string,
  ) {
    super(
      `A ${nomeDocumento(ordem)} foi registrada e já baixou o estoque, mas o ` +
        `pagamento não foi lançado: ${motivo}. Ela está em "Vendas de balcão" com o botão ` +
        `Faturar — fature por lá, não registre a venda de novo.`,
    );
    this.name = "VendaSemFaturamentoError";
  }
}

export interface DadosVendaBalcao {
  cliente_id: string;
  vendedor_id: string | null;
}

export interface PagamentoDaVenda {
  pagamentos: PagamentoOrdem[];
  parcelas: number;
  previsaoRecebimento: string | null;
}

/**
 * Registra e fatura uma venda de balcão num passo só (item FN-09).
 *
 * Por baixo é uma ordem de serviço `tipo = 'venda_balcao'` que já nasce
 * concluída — e é por isso que estoque, caixa, contas a receber e nota fiscal
 * funcionam sem uma linha nova: são os mesmos `inserirItens` e
 * `faturarOrdem` da OS.
 *
 * O que muda é o cuidado com a falha pela metade, que aqui custaria mais que
 * numa OS: a venda é feita com o cliente no balcão, e o reflexo de quem vê
 * um erro é clicar de novo. Então:
 *   • falhou ANTES de o pagamento entrar (a venda ou os itens não gravaram) →
 *     a venda é desfeita inteira, e tentar de novo é seguro;
 *   • falhou NO pagamento → a venda fica, e o erro diz pra faturar a que já
 *     existe (`VendaSemFaturamentoError`), nunca pra registrar outra.
 */
export async function registrarVendaBalcao(
  venda: DadosVendaBalcao,
  itens: NovoItemOS[],
  pagamento: PagamentoDaVenda,
  operadorId: string,
  lojaId: string,
): Promise<OrdemServico> {
  if (itens.length === 0) throw new Error("A venda não tem nenhuma peça.");

  const { data, error } = await supabase
    .from("ordens_servico")
    .insert({
      cliente_id: venda.cliente_id,
      vendedor_id: venda.vendedor_id,
      veiculo_id: null,
      km_entrada: null,
      descricao_problema: null,
      tipo: "venda_balcao",
      status: "concluida",
      criado_por_id: operadorId,
      atualizado_por_id: operadorId,
      loja_id: lojaId,
    })
    .select()
    .single();
  if (error) throw error;
  const ordem = data as OrdemServico;

  try {
    await inserirItens(ordem.id, nomeDocumento(ordem), itens, lojaId, true);
  } catch (erroItens) {
    // Os itens entram antes da baixa de estoque (ver `inserirItens`), então
    // apagar a venda aqui leva os itens junto (cascata) e não deixa estoque
    // mexido. Se nem apagar der, o erro original é o que importa mostrar.
    const { error: erroDesfazer } = await supabase
      .from("ordens_servico")
      .delete()
      .eq("id", ordem.id);
    if (erroDesfazer) console.error("Não deu pra desfazer a venda pela metade:", erroDesfazer);
    throw erroItens;
  }

  try {
    await faturarOrdem(
      ordem,
      pagamento.pagamentos,
      pagamento.parcelas,
      pagamento.previsaoRecebimento,
    );
  } catch (erroPagamento) {
    throw new VendaSemFaturamentoError(ordem, mensagemDeErro(erroPagamento));
  }

  return ordem;
}

// Marca a OS como "concluída" — usado pelo botão "Encerrar OS", que já leva
// direto pra tela de faturamento em seguida.
export async function concluirOrdem(id: string, operadorId: string): Promise<void> {
  await atualizarOrdem(id, { status: "concluida" }, operadorId);
}

export async function faturarOrdem(
  ordem: OrdemServico,
  pagamentos: PagamentoOrdem[],
  parcelas: number,
  previsaoRecebimento: string | null,
): Promise<void> {
  // Orçamento não é venda (#379): não entra no caixa nem em contas a
  // receber. Aprovar antes faz dele uma OS.
  if (!contaNosNumeros(ordem)) {
    throw new Error("Orçamento não é faturado: aprove o orçamento antes (ele vira OS).");
  }

  // Fecha no centavo: cada pagamento já vem arredondado, mas somar em ponto
  // flutuante ainda deixa cauda (0.1 + 0.2 dá 0.30000000000000004) — e esse
  // valor vai pro banco, em Contas a Receber.
  const valorTotal = somar(pagamentos.map((p) => p.valor));
  // Resumo legível pra exibir em qualquer lugar (garantia, lista de OS) —
  // uma forma só continua mostrando só ela; duas ou mais aparecem juntas
  // (ex: "Pix + Cartão de crédito").
  const formaPagamentoResumo = [...new Set(pagamentos.map((p) => p.formaPagamento))]
    .map((forma) => FORMA_PAGAMENTO_LABEL[forma] ?? forma)
    .join(" + ");

  const { error: erroOrdem } = await supabase
    .from("ordens_servico")
    .update({
      status: "faturada",
      forma_pagamento: formaPagamentoResumo,
      parcelas,
      data_fechamento: new Date().toISOString(),
    })
    .eq("id", ordem.id);

  if (erroOrdem) throw erroOrdem;

  // Sem previsão de recebimento = cliente já pagou na hora, lança a Entrada
  // no Caixa direto (comportamento de sempre) — um lançamento por forma de
  // pagamento usada, pra cobrir o caso de pagamento dividido (ex: metade
  // Pix, metade cartão). Com previsão = cliente ainda vai pagar depois; em
  // vez de lançar a Entrada agora, cria uma conta a receber pendente — o
  // Caixa só recebe o lançamento quando ela for marcada como recebida de
  // verdade (Contas a Receber).
  if (!previsaoRecebimento) {
    for (const pagamento of pagamentos) {
      await criarMovimentoCaixa(
        {
          ordem_servico_id: ordem.id,
          tipo: "entrada",
          forma_pagamento: pagamento.formaPagamento,
          valor: pagamento.valor,
          descricao: `Faturamento da ${nomeDocumento(ordem)}`,
          categoria_id: null,
        },
        ordem.loja_id,
      );
    }
  } else {
    await criarContaReceber(
      {
        cliente_id: ordem.cliente_id,
        ordem_servico_id: ordem.id,
        descricao: `Faturamento da ${nomeDocumento(ordem)}`,
        valor: valorTotal,
        vencimento: previsaoRecebimento,
      },
      ordem.loja_id,
    );
  }
}
