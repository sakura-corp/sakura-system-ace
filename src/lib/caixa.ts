import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import type { CustoDoBanco } from "@/schemas/metricasCaixa";
import type { MovimentoCaixa, NovoMovimentoCaixa } from "@/types/caixa";
import type { ItemParaVenda, StatusOS, TipoOrdem } from "@/types/os";

// A OS do lançamento vem pela janela `ordens_servico_caixa` (migration 0075,
// #367), e não da tabela: quem só tem o Caixa (ou Relações) não lê a OS
// inteira, e a janela traz só o que o Caixa, o Início e Relações usam — número,
// tipo (OS ou venda de balcão), nome do cliente e quantidade/preço/desconto
// dos itens. Nunca custo, descrição, veículo nem observação.
const SELECT_MOVIMENTO =
  "*, ordem_servico:ordens_servico_caixa(id, numero, tipo, status, cliente_nome, itens), " +
  "categoria:categorias_caixa(nome)";

/** A linha da janela `ordens_servico_caixa`, do jeito que o banco devolve. */
export interface LinhaOrdemDoCaixa {
  id: string;
  numero: number;
  tipo?: TipoOrdem;
  status?: StatusOS;
  cliente_nome: string | null;
  itens: ItemParaVenda[] | null;
}

type OrdemDoMovimento = NonNullable<MovimentoCaixa["ordem_servico"]>;

/**
 * Monta a OS do lançamento no formato que as telas já usam (`cliente: { nome }`),
 * a partir da linha da janela (`cliente_nome`). As contas de dinheiro não mudam:
 * os itens passam crus.
 */
export function ordemDoMovimentoDaJanela(linha: LinhaOrdemDoCaixa | null): OrdemDoMovimento | null {
  if (!linha) return null;
  return {
    id: linha.id,
    numero: linha.numero,
    ...(linha.tipo ? { tipo: linha.tipo } : {}),
    ...(linha.status ? { status: linha.status } : {}),
    cliente: linha.cliente_nome != null ? { nome: linha.cliente_nome } : null,
    itens: linha.itens ?? [],
  };
}

export function movimentoDaJanela(
  linha: Omit<MovimentoCaixa, "ordem_servico"> & { ordem_servico?: LinhaOrdemDoCaixa | null },
): MovimentoCaixa {
  return { ...linha, ordem_servico: ordemDoMovimentoDaJanela(linha.ordem_servico ?? null) };
}

export async function listarMovimentosCaixa(lojaId: string): Promise<MovimentoCaixa[]> {
  // Por páginas: o Supabase corta em 1.000 linhas. `id` desempata a ordem.
  const data = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("caixa_movimentos")
      .select(SELECT_MOVIMENTO)
      .eq("loja_id", lojaId)
      .order("data", { ascending: false })
      .order("id", { ascending: true })
      .range(de, ate),
  );
  return (data as unknown as Parameters<typeof movimentoDaJanela>[0][]).map(movimentoDaJanela);
}

// Uma OS pode ter mais de um lançamento de Caixa quando o faturamento foi
// dividido em mais de uma forma de pagamento (ex: metade Pix, metade
// cartão) — por isso retorna uma lista, não um único registro.
export async function listarMovimentosCaixaPorOrdem(
  ordemServicoId: string,
): Promise<MovimentoCaixa[]> {
  const { data, error } = await supabase
    .from("caixa_movimentos")
    .select("*")
    .eq("ordem_servico_id", ordemServicoId);

  if (error) throw error;
  return data as MovimentoCaixa[];
}

/**
 * Lança no Caixa e devolve o id do lançamento.
 *
 * O id é gerado AQUI, antes de gravar, e o insert não pede a linha de volta
 * — de propósito (migration 0062). Pedir de volta (`.select()`) faz o
 * Postgres passar também pela policy de LEITURA, e quem só tem Contas a
 * Pagar (ou a Receber) não "enxerga" o lançamento que acabou de criar: ele
 * só fica ligado à conta no passo seguinte. Com o `.select()`, pagar uma
 * conta daria erro de permissão pra essa pessoa.
 */
export async function criarMovimentoCaixa(
  movimento: NovoMovimentoCaixa,
  lojaId: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const { error } = await supabase
    .from("caixa_movimentos")
    .insert({ ...movimento, id, loja_id: lojaId });

  if (error) throw error;
  return id;
}

/**
 * Apaga um lançamento — e confere que apagou mesmo.
 *
 * Sem a conferência, um `delete` barrado pela RLS "roda sem erro" e apaga
 * zero linhas (§6 item 15), deixando o lançamento no Caixa enquanto a tela
 * diz que deu certo.
 */
export async function excluirMovimentoCaixa(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("caixa_movimentos")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if ((data?.length ?? 0) === 0) {
    throw new Error(
      "O lançamento do Caixa não foi apagado — confira se você tem permissão pra isso, ou peça a um administrador.",
    );
  }
}

/**
 * Grava a categoria escolhida num lote de lançamentos de uma vez.
 *
 * Confere quantas linhas voltaram do `update` porque, neste projeto, RLS sem
 * policy cobrindo o comando não dá erro nenhum — ela filtra a zero linhas, e
 * um `.update()` que "roda sem erro" sem mudar nada é indistinguível de ter
 * dado certo (PROJETO_STATUS.md, seção 6, item 15: foi exatamente assim que o
 * botão de excluir loja passou a não fazer nada, em silêncio). Desde a
 * migration 0062, alterar um lançamento exige o módulo Caixa no banco: quem
 * não tem cairia a zero linhas, e é esta checagem que transforma isso num
 * aviso em vez de um "salvo" que não salvou.
 */
export async function definirCategoriaDosMovimentos(
  ids: string[],
  categoriaId: string,
): Promise<void> {
  if (ids.length === 0) return;

  const { data, error } = await supabase
    .from("caixa_movimentos")
    .update({ categoria_id: categoriaId })
    .in("id", ids)
    .select("id");

  if (error) throw error;

  if ((data?.length ?? 0) !== ids.length) {
    throw new Error(
      `Só ${data?.length ?? 0} de ${ids.length} lançamentos foram atualizados. ` +
        "Recarregue a tela e tente de novo.",
    );
  }
}

// Custo de cada OS pronto do banco (função `custo_das_ordens`, migration
// 0073): peça, serviço e peça avulsa já somados. Substitui baixar o cadastro
// de peças só pra calcular lucro, o que quem não tem o módulo Estoque não pode
// (#366). `completo = false` quer dizer "tem peça avulsa sem custo informado".
const IDS_POR_CHAMADA = 500;

export async function buscarCustoDasOrdens(ids: string[]): Promise<CustoDoBanco> {
  const unicos = [...new Set(ids)];
  const custos: CustoDoBanco = new Map();
  // As levas vão ao mesmo tempo: uma loja com 10 mil OS seriam 20 idas e
  // voltas uma atrás da outra antes de a tela aparecer.
  const levas: string[][] = [];
  for (let i = 0; i < unicos.length; i += IDS_POR_CHAMADA) {
    levas.push(unicos.slice(i, i + IDS_POR_CHAMADA));
  }
  const respostas = await Promise.all(
    levas.map((leva) => supabase.rpc("custo_das_ordens", { p_ordens: leva })),
  );
  for (const { data, error } of respostas) {
    if (error) throw error;
    for (const linha of (data ?? []) as {
      ordem_servico_id: string;
      custo: number | string;
      custo_completo: boolean;
    }[]) {
      custos.set(linha.ordem_servico_id, {
        custo: Number(linha.custo),
        completo: linha.custo_completo,
      });
    }
  }
  return custos;
}
