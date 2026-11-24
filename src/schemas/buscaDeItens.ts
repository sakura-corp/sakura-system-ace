import { acharPorCodigoExato, pecaCasaComBusca, type PecaBuscavel } from "./estoque";
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

// Só pra decidir a ORDEM da lista ("começa com" antes de "contém"). O que
// entra na lista é sempre decidido pela busca de `estoque.ts`; se esta
// cópia um dia divergir de lá, muda só a ordem, nunca o que aparece.
function normalizar(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // tira acento
    .toLowerCase()
    .trim();
}

/** 0 = código exato; 1 = descrição ou código começa com o termo; 2 = o resto. */
function posicao(item: PecaBuscavel, termo: string): number {
  if (acharPorCodigoExato([item], termo)) return 0;
  const busca = normalizar(termo);
  const comeca = [item.descricao, item.codigo_interno, item.codigo_barras].some((campo) =>
    normalizar(campo).startsWith(busca),
  );
  return comeca ? 1 : 2;
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
