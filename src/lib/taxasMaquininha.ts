import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import type { CalculoTaxa, FormaCartao, TaxaMaquininha } from "@/schemas/taxaMaquininha";

/**
 * A taxa da maquininha (#387): a tabela de cada loja
 * (`configuracoes_taxas_maquininha`, migration 0088), a taxa guardada em cada
 * recebimento em cartão (`caixa_taxas_cartao` + `caixa_cartao_a_receber`,
 * gravadas juntas pela função `registrar_taxa_do_cartao`) e a lista do
 * "Cartão a receber". A conta mora em `src/schemas/taxaMaquininha.ts`.
 *
 * Os erros do Supabase sobem como vieram; quem mostra pra pessoa passa por
 * `mensagemDeErro()`.
 */

const TABELA_DA_LOJA = "configuracoes_taxas_maquininha";

/** A tabela da loja. Em branco = lista vazia (nunca taxa zero inventada). */
export async function listarTaxasMaquininha(lojaId: string): Promise<TaxaMaquininha[]> {
  // No máximo 13 linhas por loja (débito, crédito à vista, 2x a 12x): cabe
  // numa resposta, sem paginar.
  const { data, error } = await supabase
    .from(TABELA_DA_LOJA)
    .select("forma, parcelas, taxa_percentual, prazo_dias, recebe_tudo_de_uma_vez")
    .eq("loja_id", lojaId);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((linha) => ({
    forma: linha.forma as FormaCartao,
    parcelas: Number(linha.parcelas),
    // `numeric` pode chegar como texto; a conta precisa de número.
    taxa_percentual: Number(linha.taxa_percentual),
    prazo_dias: Number(linha.prazo_dias),
    recebe_tudo_de_uma_vez: Boolean(linha.recebe_tudo_de_uma_vez),
  }));
}

/**
 * Troca a tabela da loja inteira pela que veio da tela: grava as linhas que
 * ficam e apaga as que a pessoa deixou em branco.
 *
 * Grava primeiro e apaga depois: se a gravação falhar, nada foi apagado. O
 * apagar confere com `.select()` quantas linhas saíram, porque um `delete`
 * barrado pela RLS "roda sem erro" e apaga zero (item 15 de
 * `docs/licoes.md`).
 */
export async function salvarTaxasMaquininha(
  lojaId: string,
  linhas: readonly TaxaMaquininha[],
): Promise<void> {
  const salvas = await listarTaxasMaquininha(lojaId);
  const fica = (t: Pick<TaxaMaquininha, "forma" | "parcelas">) =>
    linhas.some((l) => l.forma === t.forma && l.parcelas === t.parcelas);

  if (linhas.length > 0) {
    const agora = new Date().toISOString();
    const { error } = await supabase.from(TABELA_DA_LOJA).upsert(
      linhas.map((l) => ({
        loja_id: lojaId,
        forma: l.forma,
        parcelas: l.parcelas,
        taxa_percentual: l.taxa_percentual,
        prazo_dias: l.prazo_dias,
        recebe_tudo_de_uma_vez: l.recebe_tudo_de_uma_vez,
        atualizado_em: agora,
      })),
      { onConflict: "loja_id,forma,parcelas" },
    );
    if (error) throw error;
  }

  const saem = salvas.filter((t) => !fica(t));
  for (const forma of ["cartao_debito", "cartao_credito"] as const) {
    const parcelas = saem.filter((t) => t.forma === forma).map((t) => t.parcelas);
    if (parcelas.length === 0) continue;
    const { data, error } = await supabase
      .from(TABELA_DA_LOJA)
      .delete()
      .eq("loja_id", lojaId)
      .eq("forma", forma)
      .in("parcelas", parcelas)
      .select("forma, parcelas");
    if (error) throw error;
    if ((data?.length ?? 0) < parcelas.length) {
      throw new Error(
        "As taxas que você deixou em branco não foram apagadas. Só o administrador da loja muda as taxas da maquininha: confira com ele.",
      );
    }
  }
}

/**
 * Guarda a taxa de UM recebimento em cartão (um lançamento do Caixa) e as
 * datas em que ele cai, numa chamada só ao banco (as duas tabelas entram
 * juntas ou nenhuma). Não mexe no lançamento.
 */
export async function registrarTaxaDoCartao(
  movimentoId: string,
  calculo: Extract<CalculoTaxa, { informada: true }>,
): Promise<void> {
  // Sem `.select()` de volta: quem fatura grava, mas pode não ter leitura.
  const { error } = await supabase.rpc("registrar_taxa_do_cartao", {
    p_movimento: movimentoId,
    p_forma: calculo.forma,
    p_parcelas: calculo.parcelas,
    p_taxa_percentual: calculo.taxaPercentual,
    p_prazo_dias: calculo.prazoDias,
    p_recebe_tudo_de_uma_vez: calculo.recebeTudoDeUmaVez,
    p_valor_bruto: calculo.valorBruto,
    p_valor_taxa: calculo.valorTaxa,
    p_valor_liquido: calculo.valorLiquido,
    p_recebimentos: calculo.recebimentos.map((r) => ({
      numero: r.numero,
      data_prevista: r.dataPrevista,
      valor: r.valor,
    })),
  });
  if (error) throw error;
}

/** Uma linha do "Cartão a receber": uma parcela da maquininha que ainda vai cair. */
export interface RecebivelCartao {
  id: string;
  movimento_id: string;
  /** Qual parcela é (1, 2, 3…). */
  numero: number;
  /** "AAAA-MM-DD". */
  data_prevista: string;
  valor: number;
  forma: FormaCartao | null;
  /** As parcelas da venda no cartão. */
  parcelas: number | null;
  /** Quantas datas a venda tem: as parcelas, ou 1 quando a loja recebe tudo de uma vez. */
  total_parcelas: number | null;
  /** A descrição do lançamento do Caixa ("Faturamento da OS 18"); vazia se a pessoa não lê o Caixa. */
  descricao: string | null;
}

interface LinhaDoBanco {
  id: string;
  movimento_id: string;
  numero: number | string;
  data_prevista: string;
  valor: number | string;
  taxa: {
    forma: FormaCartao;
    parcelas: number | string;
    recebe_tudo_de_uma_vez: boolean;
    movimento: { descricao: string | null } | null;
  } | null;
}

/**
 * O que vai cair do cartão a partir de `aPartirDe` ("AAAA-MM-DD"), em ordem
 * de data. Só leitura: não vira conta a receber nem lançamento.
 */
export async function listarCartaoAReceber(
  lojaId: string,
  aPartirDe: string,
): Promise<RecebivelCartao[]> {
  const linhas = await buscarTudoEmPaginas<LinhaDoBanco>((de, ate) =>
    supabase
      .from("caixa_cartao_a_receber")
      .select(
        "id, movimento_id, numero, data_prevista, valor, " +
          "taxa:caixa_taxas_cartao(forma, parcelas, recebe_tudo_de_uma_vez, movimento:caixa_movimentos(descricao))",
      )
      .eq("loja_id", lojaId)
      .gte("data_prevista", aPartirDe)
      .order("data_prevista")
      .order("id")
      .range(de, ate)
      .then((r) => ({ data: r.data as unknown as LinhaDoBanco[] | null, error: r.error })),
  );
  return linhas.map((l) => {
    const parcelas = l.taxa ? Number(l.taxa.parcelas) : null;
    return {
      id: l.id,
      movimento_id: l.movimento_id,
      numero: Number(l.numero),
      data_prevista: l.data_prevista,
      valor: Number(l.valor),
      forma: l.taxa?.forma ?? null,
      parcelas,
      total_parcelas: l.taxa ? (l.taxa.recebe_tudo_de_uma_vez ? 1 : parcelas) : null,
      descricao: l.taxa?.movimento?.descricao ?? null,
    };
  });
}
