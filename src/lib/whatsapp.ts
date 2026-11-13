import { montarUrlWhatsapp, telefoneParaWhatsapp } from "@/schemas/whatsapp";

/**
 * Abre uma conversa no WhatsApp com a mensagem já escrita.
 *
 * Quem abre de verdade é o processo principal do Electron (`shell.openExternal`),
 * que confere DE NOVO que a URL é do `wa.me` antes de entregar pro sistema
 * operacional — a tela não tem como abrir nada fora dela, e URL montada com
 * dado do banco é justamente o caso que o checklist de segurança do Electron
 * alerta (item 15).
 *
 * Fora do Electron (o app também roda num navegador comum quando as telas do
 * catálogo são geradas) cai num `window.open`, que é inofensivo ali.
 */
export async function abrirConversaWhatsapp(
  telefone: string | null | undefined,
  texto: string,
): Promise<void> {
  const numero = telefoneParaWhatsapp(telefone);
  if (!numero) {
    throw new Error(
      "Este cadastro está sem um telefone que dê pra usar no WhatsApp. " +
        "Confira se o número tem DDD (ex: (16) 99123-4567).",
    );
  }

  await abrirUrl(montarUrlWhatsapp(numero, texto));
}

/**
 * Abre o WhatsApp com a mensagem pronta e SEM número: a pessoa escolhe o
 * contato (#397, o resumo pro dono — o programa não guarda o telefone dele).
 */
export async function abrirWhatsappSemNumero(texto: string): Promise<void> {
  await abrirUrl(montarUrlWhatsapp(null, texto));
}

async function abrirUrl(url: string): Promise<void> {
  const ponte = typeof window !== "undefined" ? window.sakuraApp?.abrirWhatsapp : undefined;
  if (ponte) {
    const abriu = await ponte(url);
    if (!abriu) throw new Error("Não foi possível abrir o WhatsApp neste computador.");
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
