import { useEffect, useMemo, useState } from "react";
import { listarCategorias } from "@/lib/categorias";
import { buscarConfiguracaoFiscal } from "@/lib/configuracoes";
import { criarMovimento } from "@/lib/estoque";
import { criarPeca } from "@/lib/pecas";
import { margemAPartirDoPreco, type PecaFormValues } from "@/schemas/peca";
import { csosnMaisUsado } from "@/schemas/tributacao";
import type { Categoria } from "@/types/categoria";
import type { RegimeTributario } from "@/types/configuracao";
import type { ItemOS } from "@/types/os";
import type { NovaPeca, Peca } from "@/types/peca";

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
 * código de ICMS que a loja mais usa. Só busca quando `ativo` (a janela que
 * vai mostrar o cadastro está aberta). Falhar não trava o cadastro: sem
 * eles o formulário abre do mesmo jeito, só sem as sugestões.
 */
export function useDadosParaCadastroDePeca(lojaId: string, pecas: Peca[], ativo: boolean) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [regime, setRegime] = useState<RegimeTributario | null>(null);

  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;
    Promise.all([listarCategorias(), buscarConfiguracaoFiscal(lojaId)])
      .then(([categoriasC, configFiscal]) => {
        if (cancelado) return;
        setCategorias(categoriasC);
        setRegime(configFiscal?.regime_tributario ?? null);
      })
      .catch((err) => console.error("Erro ao carregar os dados do cadastro de peça:", err));
    return () => {
      cancelado = true;
    };
  }, [ativo, lojaId]);

  const csosnSugerido = useMemo(
    () => csosnMaisUsado(pecas.map((peca) => peca.cst_ou_csosn)),
    [pecas],
  );

  return { categorias, regime, csosnSugerido };
}

/**
 * Cadastra a peça nova e, se a pessoa informou uma quantidade em estoque,
 * lança a entrada inicial — o mesmo que o cadastro do Estoque faz ao salvar.
 */
export async function cadastrarPecaNova(
  peca: NovaPeca,
  quantidadeInicial: number | null,
  lojaId: string,
): Promise<Peca> {
  const criada = await criarPeca(peca);
  if (quantidadeInicial && quantidadeInicial > 0) {
    await criarMovimento(
      {
        peca_id: criada.id,
        tipo: "entrada",
        quantidade: quantidadeInicial,
        motivo: "ajuste",
        referencia: "Estoque inicial (cadastro do produto)",
      },
      lojaId,
    );
  }
  return criada;
}
