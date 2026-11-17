import { supabase } from "./supabase";

// O contato da contabilidade da loja (#383, migration 0085): pra quem o
// pacote do mês é mandado. Uma linha por loja; a linha só existe quando o
// contato serve pra alguma coisa (nome e, pelo menos, WhatsApp ou e-mail).

export interface ContatoContabilidade {
  nome: string;
  /** Só os dígitos, com DDD (10 a 13); `null` = sem WhatsApp. */
  whatsapp: string | null;
  /** `null` = sem e-mail. */
  email: string | null;
}

/** O contato da contabilidade da loja; `null` = a loja não cadastrou. */
export async function buscarContatoContabilidade(lojaId: string): Promise<ContatoContabilidade | null> {
  const { data, error } = await supabase
    .from("configuracoes_contabilidade")
    .select("nome, whatsapp, email")
    .eq("loja_id", lojaId)
    .maybeSingle();

  if (error) throw error;
  return (data as ContatoContabilidade | null) || null;
}

/**
 * Salva o contato. Limpa o que veio da tela (espaço nas pontas; o WhatsApp
 * vira só dígitos; vazio vira `null`). Contato que não serve — `null`, sem
 * nome, ou sem WhatsApp e sem e-mail — apaga a linha da loja.
 */
export async function salvarContatoContabilidade(
  lojaId: string,
  contato: ContatoContabilidade | null,
): Promise<void> {
  const nome = contato?.nome.trim() || "";
  const whatsapp = (contato?.whatsapp || "").replace(/\D/g, "") || null;
  const email = contato?.email?.trim() || null;

  if (nome === "" || (whatsapp === null && email === null)) {
    const { error } = await supabase.from("configuracoes_contabilidade").delete().eq("loja_id", lojaId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("configuracoes_contabilidade")
    .upsert(
      { loja_id: lojaId, nome, whatsapp, email, atualizado_em: new Date().toISOString() },
      { onConflict: "loja_id" },
    );
  if (error) throw error;
}
