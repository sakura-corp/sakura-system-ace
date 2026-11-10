import { supabase } from "./supabase";
import { buscarTudoEmPaginas } from "./paginacao";
import { mensagemDeErro } from "./errors";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";
import type { LoteImportacao, ResultadoDesfazerImportacao } from "@/types/cliente";
import type { CadastroExistente, ClienteParaImportar } from "@/schemas/importacaoClientes";

/** Quantas linhas vão ao banco por vez (o endereço não cresce, mas o corpo sim). */
const TAMANHO_DO_BLOCO = 500;

/** Quem já está cadastrado, pra conferir a planilha. Lê por páginas: o Supabase corta em 1.000. */
export async function carregarCadastroParaConferir(): Promise<CadastroExistente> {
  const [clientes, veiculos] = await Promise.all([
    buscarTudoEmPaginas((de, ate) =>
      supabase
        .from("clientes")
        .select("id, nome, cpf_cnpj")
        .neq("id", CLIENTE_CONSUMIDOR_ID)
        .order("id", { ascending: true })
        .range(de, ate),
    ),
    buscarTudoEmPaginas((de, ate) =>
      supabase.from("veiculos").select("id, placa").order("id", { ascending: true }).range(de, ate),
    ),
  ]);
  return {
    clientes: (clientes as { id: string; nome: string; cpf_cnpj: string | null }[]).map((c) => ({
      id: c.id,
      nome: c.nome,
      cpf_cnpj: c.cpf_cnpj,
    })),
    placas: (veiculos as { placa: string }[]).map((v) => v.placa),
  };
}

export interface ResultadoImportacao {
  loteId: string;
  clientesCriados: number;
  veiculosCriados: number;
  /** Tudo entrou, mas os números do lote não foram gravados (a lista de importações mostra 0). */
  avisoNumerosDoLote?: true;
}

/**
 * Grava o que a conferência aprovou, tudo ligado a um "lote" (pra dar pra
 * desfazer). Os ids dos clientes nascem aqui, no programa, pra ligar cada
 * veículo ao cliente certo sem depender da ordem da resposta do banco.
 */
export async function importarClientes(
  grupos: ClienteParaImportar[],
  info: { nomeArquivo: string; totalLinhas: number },
  aoAvancar?: (feitos: number, total: number) => void,
): Promise<ResultadoImportacao> {
  const { data: lote, error: erroLote } = await supabase
    .from("importacao_lotes")
    .insert({ tipo: "clientes", nome_arquivo: info.nomeArquivo, total_linhas: info.totalLinhas })
    .select("id")
    .single();
  if (erroLote) throw erroLote;
  const loteId = (lote as { id: string }).id;

  const novos = grupos
    .filter((g) => g.clienteExistenteId === null)
    .map((g) => ({ grupo: g, id: crypto.randomUUID() }));
  const veiculos = grupos.flatMap((g) => {
    const clienteId =
      g.clienteExistenteId ?? novos.find((n) => n.grupo === g)!.id;
    return g.veiculos.map((v) => ({ ...v, cliente_id: clienteId, importacao_lote_id: loteId }));
  });

  const total = novos.length + veiculos.length;
  let clientesCriados = 0;
  let veiculosCriados = 0;
  const avancar = () => aoAvancar?.(clientesCriados + veiculosCriados, total);
  avancar();

  try {
    for (let i = 0; i < novos.length; i += TAMANHO_DO_BLOCO) {
      const bloco = novos.slice(i, i + TAMANHO_DO_BLOCO).map((n) => ({
        ...n.grupo.cliente,
        id: n.id,
        importacao_lote_id: loteId,
      }));
      const { error } = await supabase.from("clientes").insert(bloco);
      if (error) throw error;
      clientesCriados += bloco.length;
      avancar();
    }
    for (let i = 0; i < veiculos.length; i += TAMANHO_DO_BLOCO) {
      const bloco = veiculos.slice(i, i + TAMANHO_DO_BLOCO);
      const { error } = await supabase.from("veiculos").insert(bloco);
      if (error) throw error;
      veiculosCriados += bloco.length;
      avancar();
    }
  } catch (err) {
    // O que já entrou fica no lote: o número dele é gravado pra a lista de
    // importações mostrar a verdade, e a pessoa pode desfazer.
    await supabase
      .from("importacao_lotes")
      .update({ clientes_criados: clientesCriados, veiculos_criados: veiculosCriados })
      .eq("id", loteId);
    throw new Error(
      `A importação parou no meio (${mensagemDeErro(err)}). ` +
        `O que já entrou (${clientesCriados} cliente(s) e ${veiculosCriados} veículo(s)) ficou guardado nesta importação: ` +
        "dá pra desfazer pela lista de importações anteriores.",
    );
  }

  const { error: erroFinal } = await supabase
    .from("importacao_lotes")
    .update({ clientes_criados: clientesCriados, veiculos_criados: veiculosCriados })
    .eq("id", loteId);
  // Tudo já entrou: falhar aqui faria a tela oferecer "Confirmar" de novo e
  // duplicar. Então devolve o resultado, com o aviso.
  if (erroFinal) {
    console.error("Erro ao gravar os números do lote:", erroFinal);
    return { loteId, clientesCriados, veiculosCriados, avisoNumerosDoLote: true };
  }

  return { loteId, clientesCriados, veiculosCriados };
}

export async function listarLotesImportacao(): Promise<LoteImportacao[]> {
  const { data, error } = await supabase
    .from("importacao_lotes")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LoteImportacao[];
}

export async function desfazerImportacao(loteId: string): Promise<ResultadoDesfazerImportacao> {
  const { data, error } = await supabase.rpc("desfazer_importacao", { p_lote: loteId });
  if (error) throw error;
  return data as ResultadoDesfazerImportacao;
}
