import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import { hojeLocal } from "./datas";
import {
  numerosDoMenu,
  type ChaveDoNumero,
  type EntradaNumerosDoMenu,
  type NumeroDoMenu,
} from "@/schemas/numerosDoMenu";

/**
 * A busca leve por trás dos números do menu (#1092): só as colunas que a conta
 * precisa, sem cliente, veículo nem itens. O menu pergunta isto a cada troca de
 * tela, então cada lista só é buscada se a pessoa tem o módulo dela.
 *
 * Cada busca é independente: uma que falha vira `undefined` naquela chave (o
 * número some) e as outras continuam. A conta em si mora em `schemas/`.
 */

export type NumerosDoMenu = Partial<Record<ChaveDoNumero, NumeroDoMenu | null>>;

/** Quais números a pessoa pode ver: "Orçamentos" é do módulo das OS. */
export interface ModulosDoMenu {
  ordens_servico: boolean;
  contas_pagar: boolean;
  contas_receber: boolean;
}

type Linha = object;

function buscar<T extends Linha>(
  tabela: string,
  colunas: string,
  lojaId: string,
  status: string,
): Promise<T[]> {
  return buscarTudoEmPaginas<T>(
    (de, ate) =>
      supabase
        .from(tabela)
        .select(colunas)
        .eq("loja_id", lojaId)
        .eq("status", status)
        .order("id")
        .range(de, ate) as unknown as PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  );
}

export async function buscarNumerosDoMenu(
  lojaId: string,
  modulos: ModulosDoMenu,
  hoje: string = hojeLocal(),
): Promise<NumerosDoMenu> {
  const vazio: never[] = [];
  const [orcamentos, ordens, pagar, receber] = await Promise.allSettled([
    modulos.ordens_servico
      ? buscar<EntradaNumerosDoMenu["orcamentos"][number]>(
          "ordens_servico", "id,status,validade", lojaId, "orcamento")
      : vazio,
    modulos.ordens_servico
      ? buscar<EntradaNumerosDoMenu["ordens"][number]>(
          "ordens_servico", "id,status,tipo", lojaId, "concluida")
      : vazio,
    modulos.contas_pagar
      ? buscar<EntradaNumerosDoMenu["contasPagar"][number]>(
          "contas_pagar", "id,status,vencimento", lojaId, "pendente")
      : vazio,
    modulos.contas_receber
      ? buscar<EntradaNumerosDoMenu["contasReceber"][number]>(
          "contas_receber", "id,status,vencimento", lojaId, "pendente")
      : vazio,
  ]);

  function lista<T>(r: PromiseSettledResult<T[]>, nome: string): T[] | null {
    if (r.status === "fulfilled") return r.value;
    console.error(`Erro ao buscar ${nome} pro número do menu:`, r.reason);
    return null;
  }
  const o = lista(orcamentos, "os orçamentos");
  const os = lista(ordens, "as OS prontas");
  const cp = lista(pagar, "as contas a pagar");
  const cr = lista(receber, "as contas a receber");

  const contas = numerosDoMenu({
    hoje,
    orcamentos: o ?? [],
    ordens: os ?? [],
    contasPagar: cp ?? [],
    contasReceber: cr ?? [],
  });
  // Busca que falhou: o número daquela chave não aparece (nem zero nem velho).
  return {
    ...(o && modulos.ordens_servico ? { orcamentos: contas.orcamentos } : {}),
    ...(os && modulos.ordens_servico ? { ordens_servico: contas.ordens_servico } : {}),
    ...(cp && modulos.contas_pagar ? { contas_pagar: contas.contas_pagar } : {}),
    ...(cr && modulos.contas_receber ? { contas_receber: contas.contas_receber } : {}),
  };
}
