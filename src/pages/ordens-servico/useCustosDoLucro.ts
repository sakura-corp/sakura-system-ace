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
 *
 * `calculando`: o custo ainda não chegou pra OS que está na tela (ou o das
 * peças ainda não veio). O custo guardado é sempre o DA OS em que foi buscado:
 * item corrigido recarrega a OS, e somar o total novo com o custo velho dava,
 * por um instante, um lucro que não existe (achado da revisão da #1087).
 */
export function useCustosDoLucro(ordemExistente?: OrdemServico): {
  custoDosExistentes: { custo: number; completo: boolean } | undefined;
  custoPeca: MapaCusto | null;
  calculando: boolean;
} {
  const { operador } = useAuth();
  const podeVerCusto = temPermissao(operador ?? null, "estoque");
  const ordemId = ordemExistente?.id;

  // O custo junto da OS (o objeto) em que ele foi buscado.
  const [doBanco, setDoBanco] = useState<{
    ordem: OrdemServico;
    custo: { custo: number; completo: boolean } | undefined;
  } | null>(null);
  const [pecasCarregadas, setPecasCarregadas] = useState<{
    custo: MapaCusto | null;
  } | null>(null);

  useEffect(() => {
    if (!ordemId || !ordemExistente) return;
    const ordem = ordemExistente;
    let cancelado = false;
    (async () => {
      try {
        const custos = await buscarCustoDasOrdens([ordemId]);
        if (!cancelado) setDoBanco({ ordem, custo: custos.get(ordemId) });
      } catch (err) {
        console.error("Erro ao buscar o custo dos itens da ordem de serviço:", err);
        if (!cancelado) setDoBanco({ ordem, custo: undefined });
      }
    })();
    return () => {
      cancelado = true;
    };
    // `ordemExistente` inteira: item corrigido recarrega a OS (objeto novo).
  }, [ordemId, ordemExistente]);

  useEffect(() => {
    if (!podeVerCusto) return;
    let cancelado = false;
    (async () => {
      try {
        const pecas = await listarPecas();
        if (!cancelado) setPecasCarregadas({ custo: mapaCustoPecas(pecas) });
      } catch (err) {
        console.error("Erro ao buscar o custo das peças:", err);
        if (!cancelado) setPecasCarregadas({ custo: null });
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [podeVerCusto]);

  const existentesEmDia = !ordemExistente || doBanco?.ordem === ordemExistente;
  const pecasEmDia = !podeVerCusto || pecasCarregadas !== null;
  return {
    custoDosExistentes: existentesEmDia && doBanco ? doBanco.custo : undefined,
    custoPeca: podeVerCusto ? (pecasCarregadas?.custo ?? null) : null,
    calculando: !existentesEmDia || !pecasEmDia,
  };
}
