import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { buscarCustoDasOrdens } from "@/lib/caixa";
import { listarPecas } from "@/lib/pecas";
import { mapaCustoPecas, type MapaCusto } from "@/schemas/metricasCaixa";
import { temPermissao } from "@/types/operador";
import type { OrdemServico } from "@/types/os";

/**
 * Os custos que o "lucro previsto" do rodapé da OS (e da venda de balcão)
 * precisa (#1087):
 *
 * - **Dos itens já gravados**: o banco calcula (`custo_das_ordens`), pela mesma
 *   conta do resto do programa. Refaz quando a OS aberta muda, porque corrigir
 *   um item recarrega a OS com os itens novos.
 * - **Das peças do cadastro**: o custo é do módulo Estoque. Quem não tem a
 *   permissão `estoque` não lê o custo (a janela de peças nunca o traz), então
 *   `custoPeca` fica `null` e o rodapé diz "aparece ao salvar".
 *
 * Erro ao buscar nunca derruba a tela: o lucro só fica "não informado".
 */
export function useCustosDoLucro(ordemExistente?: OrdemServico): {
  custoDosExistentes: { custo: number; completo: boolean } | undefined;
  custoPeca: MapaCusto | null;
} {
  const { operador } = useAuth();
  const podeVerCusto = temPermissao(operador ?? null, "estoque");
  const ordemId = ordemExistente?.id;

  const [custoDosExistentes, setCustoDosExistentes] = useState<
    { custo: number; completo: boolean } | undefined
  >(undefined);
  const [custoPeca, setCustoPeca] = useState<MapaCusto | null>(null);

  useEffect(() => {
    if (!ordemId) {
      setCustoDosExistentes(undefined);
      return;
    }
    let cancelado = false;
    (async () => {
      try {
        const custos = await buscarCustoDasOrdens([ordemId]);
        if (!cancelado) setCustoDosExistentes(custos.get(ordemId));
      } catch (err) {
        console.error("Erro ao buscar o custo dos itens da ordem de serviço:", err);
        if (!cancelado) setCustoDosExistentes(undefined);
      }
    })();
    return () => {
      cancelado = true;
    };
    // `ordemExistente` inteira: item corrigido recarrega a OS (objeto novo).
  }, [ordemId, ordemExistente]);

  useEffect(() => {
    if (!podeVerCusto) {
      setCustoPeca(null);
      return;
    }
    let cancelado = false;
    (async () => {
      try {
        const pecas = await listarPecas();
        if (!cancelado) setCustoPeca(mapaCustoPecas(pecas));
      } catch (err) {
        console.error("Erro ao buscar o custo das peças:", err);
        if (!cancelado) setCustoPeca(null);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [podeVerCusto]);

  return { custoDosExistentes, custoPeca };
}
