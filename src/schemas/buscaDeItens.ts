import {
  acharPorCodigoExato,
  pecaCasaComBusca,
  pecaComecaComBusca,
  type PecaBuscavel,
} from "./estoque";
import { itemFormVazio, paraDisplayNumero, type ItemFormValues } from "./ordemServico";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";

/**
 * A busca única da OS (#1087): um campo só pra achar peça E serviço, em vez
 * de escolher o tipo primeiro e procurar depois. O leitor de código de
 * barras também entra por aqui (ele digita o código e aperta Enter).
 *
 * Mora aqui, e não na tela, pelo motivo de sempre: o que entra na OS (e com
 * qual quantidade) é o tipo de coisa que dá pra errar em silêncio, e a tela
 * da OS e a do orçamento precisam da mesma regra.
 *
 * A comparação de texto (sem acento, sem maiúscula) é a da busca de
 * Produtos (`pecaCasaComBusca` e `acharPorCodigoExato`, em `estoque.ts`):
 * o serviço passa por elas com cara de peça, sem marca, modelo nem medida.
 */

export type ResultadoDaBusca =
  | {
      tipo: "peca";
      id: string;
      descricao: string;
      preco: number | null;
      codigo: string | null;
      unidade: string | null;
    }
  | { tipo: "servico"; id: string; descricao: string; preco: number | null; codigo: string | null };

/** O serviço com cara de peça, pra usar a mesma busca da lista de Produtos. */
function servicoBuscavel(servico: Servico): PecaBuscavel {
  return {
    descricao: servico.descricao,
    codigo_interno: servico.codigo_interno,
    codigo_barras: null,
    marca: null,
    modelo: null,
    medida: null,
  };
}

function resultadoDaPeca(peca: PecaJanela): ResultadoDaBusca {
  return {
    tipo: "peca",
    id: peca.id,
    descricao: peca.descricao,
    preco: peca.preco_venda,
    codigo: peca.codigo_interno ?? peca.codigo_barras,
    unidade: peca.unidade,
  };
}

function resultadoDoServico(servico: Servico): ResultadoDaBusca {
  return {
    tipo: "servico",
    id: servico.id,
    descricao: servico.descricao,
    preco: servico.preco_padrao,
    codigo: servico.codigo_interno,
  };
}

/**
 * 0 = código exato; 1 = descrição, código, marca, modelo ou medida começa
 * com o termo (inclusive medida sem barras, #1180); 2 = o resto. Só decide
 * a ORDEM: o que entra na lista é sempre decidido por `pecaCasaComBusca`.
 */
function posicao(item: PecaBuscavel, termo: string): number {
  if (acharPorCodigoExato([item], termo)) return 0;
  return pecaComecaComBusca(item, termo) ? 1 : 2;
}

/**
 * Peças e serviços ATIVOS que casam com o termo, juntos, no máximo `limite`.
 * Ordem: código exato primeiro, depois quem começa com o termo, depois o
 * resto — dentro de cada grupo, peças antes de serviços, na ordem em que
 * vieram. Termo vazio não mostra nada (a lista só aparece digitando).
 */
export function buscarNoCatalogo(
  pecas: PecaJanela[],
  servicos: Servico[],
  termo: string,
  limite = 8,
): ResultadoDaBusca[] {
  if (termo.trim() === "") return [];

  const achados: { resultado: ResultadoDaBusca; posicao: number }[] = [];
  for (const peca of pecas) {
    if (peca.ativo && pecaCasaComBusca(peca, termo)) {
      achados.push({ resultado: resultadoDaPeca(peca), posicao: posicao(peca, termo) });
    }
  }
  for (const servico of servicos) {
    const buscavel = servicoBuscavel(servico);
    if (servico.ativo && pecaCasaComBusca(buscavel, termo)) {
      achados.push({ resultado: resultadoDoServico(servico), posicao: posicao(buscavel, termo) });
    }
  }

  // `sort` é estável: dentro do mesmo grupo, fica a ordem de chegada.
  return achados
    .sort((a, b) => a.posicao - b.posicao)
    .slice(0, limite)
    .map((achado) => achado.resultado);
}

/**
 * O que entra na OS com o Enter na busca. O leitor de código de barras se
 * comporta como um teclado que digita o código e aperta Enter, então:
 *   1. código de barras ou código interno EXATO de uma peça → ela;
 *   2. senão, código interno exato de um serviço → ele;
 *   3. senão, se a busca achou uma coisa só → ela;
 *   4. senão, nada (`null`): a lista fica aberta pra pessoa escolher.
 *
 * A peça vem primeiro de propósito: o leitor só lê peça, e um serviço com o
 * código no meio do nome não pode "roubar" o Enter. Código repetido (duas
 * peças com o mesmo) não entra: nunca chutar entre duas (mesma regra da
 * lista de Produtos e da venda de balcão). Inativo nunca entra.
 */
export function itemDoEnter(
  pecas: PecaJanela[],
  servicos: Servico[],
  termo: string,
): ResultadoDaBusca | null {
  if (termo.trim() === "") return null;

  const pecasAtivas = pecas.filter((peca) => peca.ativo);
  const peca = acharPorCodigoExato(pecasAtivas, termo);
  if (peca) return resultadoDaPeca(peca);

  const servicosAtivos = servicos
    .filter((servico) => servico.ativo)
    .map((servico) => ({ ...servicoBuscavel(servico), servico }));
  const servico = acharPorCodigoExato(servicosAtivos, termo);
  if (servico) return resultadoDoServico(servico.servico);

  const achados = buscarNoCatalogo(pecas, servicos, termo, 2);
  return achados.length === 1 ? achados[0] : null;
}

// Quantidade digitada → número; ilegível conta zero (mesma leitura de
// `paraNumero` em `ordemServico.ts` e `vendaBalcao.ts`).
function quantidadeDigitada(valor: string): number {
  const numero = Number(valor);
  return Number.isNaN(numero) ? 0 : numero;
}

/** A linha já é desta peça (ou deste serviço) do cadastro? */
function ehOMesmo(item: ItemFormValues, escolha: ResultadoDaBusca): boolean {
  if (escolha.tipo === "peca") return item.tipo === "peca" && item.peca_id === escolha.id;
  return item.tipo === "servico" && item.servico_id === escolha.id;
}

/**
 * Põe o escolhido nos itens NOVOS da OS. Se ele já está lá (mesma peça ou
 * mesmo serviço do cadastro, com o mesmo técnico), soma 1 na quantidade em vez de criar outra
 * linha: passar o leitor duas vezes no mesmo pneu é o jeito natural de
 * lançar dois (como `incluirPeca`, na venda de balcão). Senão, linha nova no
 * fim, com quantidade 1, o preço do cadastro (em branco se ele não tem) e o
 * técnico padrão.
 */
export function incluirNaOS(
  itens: ItemFormValues[],
  escolha: ResultadoDaBusca,
  tecnicoPadrao: string,
): ItemFormValues[] {
  // Só junta com a linha do MESMO técnico: a comissão é por técnico do item
  // (`schemas/comissoes.ts`), e somar no item de outro técnico tiraria a parte
  // de quem fez (achado da revisão da #1087).
  const indice = itens.findIndex(
    (item) => ehOMesmo(item, escolha) && item.tecnico_id === tecnicoPadrao,
  );
  if (indice >= 0) {
    return itens.map((item, i) =>
      i === indice ? { ...item, quantidade: String(quantidadeDigitada(item.quantidade) + 1) } : item,
    );
  }
  return [
    ...itens,
    {
      ...itemFormVazio,
      tipo: escolha.tipo,
      peca_id: escolha.tipo === "peca" ? escolha.id : "",
      servico_id: escolha.tipo === "servico" ? escolha.id : "",
      descricao: escolha.descricao,
      quantidade: "1",
      preco_unitario: paraDisplayNumero(escolha.preco ?? 0),
      tecnico_id: tecnicoPadrao,
    },
  ];
}

/**
 * Item sem cadastro, com o texto que a pessoa digitou na busca: serviço
 * avulso (sempre pode) ou peça avulsa (#655; só no orçamento, e quem decide
 * é a tela que chama). Sai sem id do cadastro, então nunca se junta com
 * outra linha: é sempre uma linha nova, que quem chama põe no fim da lista.
 */
export function itemAvulso(
  tipo: "peca" | "servico",
  descricao: string,
  tecnicoPadrao: string,
): ItemFormValues {
  return { ...itemFormVazio, tipo, descricao: descricao.trim(), tecnico_id: tecnicoPadrao };
}

/** "Técnico pra todos": o mesmo técnico em todas as linhas novas. */
export function aplicarTecnicoATodos(itens: ItemFormValues[], tecnicoId: string): ItemFormValues[] {
  return itens.map((item) => ({ ...item, tecnico_id: tecnicoId }));
}
