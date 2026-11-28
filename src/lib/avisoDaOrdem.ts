import { supabase } from "./supabase";

/**
 * Quando o "carro pronto" desta OS foi aberto no WhatsApp pela última vez
 * (ou `null` se nunca foi). É o que diz se o passo "garantia e avisar" da
 * trilha da OS (#1088) já foi feito, sem coluna nova no banco: a tabela
 * `whatsapp_mensagens` já guarda cada mensagem aberta (migration 0052), com a
 * OS em `referencia`.
 *
 * "Aberta", não "enviada": o programa abre o WhatsApp com o texto pronto e,
 * dali em diante, quem decide é a pessoa (ver `registrarMensagemAberta`).
 */
export async function quandoAvisouCarroPronto(ordemId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .select("criado_em")
    .eq("chave", "carro_pronto")
    .eq("referencia", ordemId)
    .order("criado_em", { ascending: false })
    .limit(1);
  if (error) throw error;
  const linha = (data ?? [])[0] as { criado_em: string } | undefined;
  return linha?.criado_em ?? null;
}
