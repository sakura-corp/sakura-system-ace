import { useEffect, useMemo, useState } from "react";
import { listarCategorias } from "@/lib/categorias";
import { buscarConfiguracaoFiscal } from "@/lib/configuracoes";
import { mensagemDeErro } from "@/lib/errors";
import { registrarMovimento } from "@/lib/estoque";
import { buscarDadosFiscaisDasPecas, cadastrarPecaRapida } from "@/lib/pecas";
import { margemAPartirDoPreco, type PecaFormValues } from "@/schemas/peca";
import { csosnMaisUsado } from "@/schemas/tributacao";
import type { Categoria } from "@/types/categoria";
import type { RegimeTributario } from "@/types/configuracao";
import type { ItemOS } from "@/types/os";
import type { NovaPeca, Peca, PecaJanela } from "@/types/peca";
import { pecaSemCusto } from "@/schemas/avisosOrdemServico";
import { movimentoDeEstoqueInicial } from "@/schemas/estoque";

/**
 * O que o cadastro de peça já traz preenchido quando nasce de uma peça
 * avulsa do orçamento (#655): o nome digitado, o preço de venda e, se
 * alguém informou, o custo. O resto a pessoa completa no formulário.
 */
export function valoresIniciaisDaPecaAvulsa(
  item: Pick<ItemOS, "descricao" | "preco_unitario" | "custo_unitario">,
): Partial<PecaFormValues> {
  const venda = String(item.preco_unitario);
  const custo = item.custo_unitario != null ? String(item.custo_unitario) : "";
  return {
    descricao: item.descricao,
    preco_venda: venda,
    preco_custo: custo,
    margem: margemAPartirDoPreco(custo, venda),
  };
}

/**
 * O que o `PecaForm` pede além da peça: categorias, regime da loja e o
 * código de ICMS que a loja mais usa (busca ao montar a janela do cadastro).
 * Falhar não trava o cadastro: sem eles o formulário abre do mesmo jeito, só
 * sem as sugestões.
 */
export function useDadosParaCadastroDePeca(lojaId: string, pecas: PecaJanela[]) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [regime, setRegime] = useState<RegimeTributario | null>(null);
  // O CSOSN mais usado vem dos dados fiscais (a janela de peças não os traz).
  const [csosns, setCsosns] = useState<(string | null)[]>([]);

  // Chave estável: só refaz a busca se a lista de peças mudou de verdade.
  const idsDasPecas = useMemo(() => pecas.map((peca) => peca.id), [pecas]);

  useEffect(() => {
    let cancelado = false;
    Promise.all([listarCategorias(), buscarConfiguracaoFiscal(lojaId)])
      .then(([categoriasC, configFiscal]) => {
        if (cancelado) return;
        setCategorias(categoriasC);
        setRegime(configFiscal?.regime_tributario ?? null);
      })
      .catch((err) => console.error("Erro ao carregar os dados do cadastro de peça:", err));
    // À parte: se os dados fiscais falham, as categorias e o regime chegam
    // mesmo assim (só some a sugestão de CSOSN).
    buscarDadosFiscaisDasPecas(idsDasPecas)
      .then((fiscais) => {
        if (!cancelado) setCsosns(fiscais.map((f) => f.cst_ou_csosn));
      })
      .catch((err) => console.error("Erro ao carregar o CSOSN mais usado:", err));
    return () => {
      cancelado = true;
    };
  }, [lojaId, idsDasPecas]);

  const csosnSugerido = useMemo(() => csosnMaisUsado(csosns), [csosns]);

  return { categorias, regime, csosnSugerido };
}

/** Tira o ponto do fim do motivo, que vai entre parênteses no aviso ("(...loja). Lance"). */
export function semPontoFinal(texto: string): string {
  return texto.trim().replace(/\.+$/, "");
}

/** A peça criada e, se o estoque inicial não entrou, o aviso pra mostrar (#909). */
export interface PecaNovaCadastrada {
  peca: Peca & PecaJanela;
  avisoEstoqueInicial: string | null;
}

/**
 * Cadastra a peça nova e, se a pessoa informou uma quantidade em estoque,
 * lança a entrada inicial — o mesmo que o cadastro do Estoque faz ao salvar.
 *
 * Se a peça não foi criada, o erro sobe (nada ficou no cadastro). Se ela foi
 * criada e só a entrada falhou, devolve a peça com o aviso, em vez de lançar
 * o erro: senão a janela não fica sabendo da peça e um novo "Salvar" cria
 * outra igual (#909). O aviso não manda pra Movimentações: quem aprova o
 * orçamento pode não ter o módulo Estoque.
 */
export async function cadastrarPecaNova(
  peca: NovaPeca,
  quantidadeInicial: number | null,
  lojaId: string,
): Promise<PecaNovaCadastrada> {
  // Pela função do banco (devolve só o id) e sem `.select()` no movimento: quem
  // não tem o módulo Estoque pode cadastrar e lançar a entrada, mas não ler
  // de volta (#366).
  const id = await cadastrarPecaRapida(peca);
  const criada = {
    ...peca,
    id,
    criado_em: new Date().toISOString(),
    sem_custo: pecaSemCusto(peca.preco_custo),
  };
  const estoqueInicial = movimentoDeEstoqueInicial(id, quantidadeInicial);
  if (!estoqueInicial) return { peca: criada, avisoEstoqueInicial: null };
  try {
    await registrarMovimento(estoqueInicial, lojaId);
    return { peca: criada, avisoEstoqueInicial: null };
  } catch (err) {
    console.error("Erro ao lançar o estoque inicial da peça:", err);
    return {
      peca: criada,
      avisoEstoqueInicial:
        `Peça cadastrada, mas o estoque inicial não entrou (${semPontoFinal(mensagemDeErro(err))}). ` +
        "Peça a quem cuida do Estoque para lançar a entrada.",
    };
  }
}
