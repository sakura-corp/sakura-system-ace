import { supabase } from "./supabase";
import { modeloPorChave, type ChaveModeloWhatsapp } from "@/schemas/whatsapp";

/**
 * Os modelos de mensagem daquela loja (migration 0052). A linha só existe
 * depois que alguém edita o texto — enquanto não existir, vale o padrão de
 * `schemas/whatsapp.ts`, pra uma loja recém-instalada já conseguir mandar
 * mensagem sem configurar nada.
 */
export async function listarModelosWhatsapp(
  lojaId: string,
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("configuracoes_whatsapp")
    .select("chave, texto")
    .eq("loja_id", lojaId);

  if (error) throw error;

  const modelos: Record<string, string> = {};
  for (const linha of (data ?? []) as { chave: string; texto: string }[]) {
    modelos[linha.chave] = linha.texto;
  }
  return modelos;
}

export async function salvarModeloWhatsapp(
  lojaId: string,
  chave: ChaveModeloWhatsapp,
  texto: string,
): Promise<void> {
  const { error } = await supabase.from("configuracoes_whatsapp").upsert(
    { loja_id: lojaId, chave, texto, atualizado_em: new Date().toISOString() },
    { onConflict: "loja_id,chave" },
  );

  if (error) throw error;
}

/** O texto daquele modelo: o da loja, ou o padrão quando ela não editou. */
export function textoDoModelo(
  modelos: Record<string, string>,
  chave: ChaveModeloWhatsapp,
): string {
  return modelos[chave] ?? modeloPorChave(chave).padrao;
}

/**
 * Guarda que a conversa foi ABERTA — nunca que foi enviada: o sistema abre o
 * WhatsApp com o texto pronto e, dali em diante, quem decide é a pessoa.
 * Afirmar "enviada" seria uma mentira que um dia viraria decisão de cobrança.
 *
 * Falhar aqui NÃO pode atrapalhar quem está usando: a mensagem já abriu, e
 * derrubar a tela por causa do registro seria trocar o essencial pelo
 * acessório.
 */
export async function registrarMensagemAberta(
  lojaId: string,
  chave: ChaveModeloWhatsapp,
  referencia: string | null,
  destino: string | null,
  operadorId: string | null,
): Promise<void> {
  try {
    const { error } = await supabase.from("whatsapp_mensagens").insert({
      loja_id: lojaId,
      chave,
      referencia,
      destino,
      operador_id: operadorId,
    });
    if (error) throw error;
  } catch (err) {
    console.error("Não foi possível registrar a mensagem de WhatsApp:", err);
  }
}

/** Quando cada referência teve a última mensagem daquele tipo aberta. */
export async function ultimasMensagensPorReferencia(
  lojaId: string,
  chave: ChaveModeloWhatsapp,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .select("referencia, criado_em")
    .eq("loja_id", lojaId)
    .eq("chave", chave)
    .order("criado_em", { ascending: false });

  if (error) throw error;

  const ultimas = new Map<string, string>();
  for (const linha of (data ?? []) as { referencia: string | null; criado_em: string }[]) {
    // A consulta vem da mais recente pra mais antiga, então a primeira que
    // aparece de cada referência já é a última.
    if (linha.referencia && !ultimas.has(linha.referencia)) {
      ultimas.set(linha.referencia, linha.criado_em);
    }
  }
  return ultimas;
}
