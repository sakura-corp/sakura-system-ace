import { useState } from "react";
import { abrirConversaWhatsapp } from "@/lib/whatsapp";
import { mensagemDeErro } from "@/lib/errors";
import { Botao, type TamanhoDoBotao } from "./Botao";

function IconeWhatsapp({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.41a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43l-.48-.01c-.16 0-.43.06-.65.31-.22.25-.85.84-.85 2.03 0 1.2.87 2.35.99 2.51.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.29Z" />
    </svg>
  );
}

/**
 * Abre o WhatsApp com a mensagem já escrita (item FN-03 do guia).
 *
 * O erro aparece no próprio botão, e não some calado: telefone sem DDD no
 * cadastro é o caso mais comum, e "cliquei e não aconteceu nada" é
 * exatamente o padrão de bug que este projeto já viu várias vezes
 * (PROJETO_STATUS.md, seção 6, itens 11 e 15).
 *
 * A aparência é a variante `whatsapp` do `Botao` (visual novo, #990): borda e
 * ícone verdes, sem fundo. Este componente só acrescenta o que é do WhatsApp:
 * abrir a conversa e mostrar o erro.
 */
export function BotaoWhatsapp({
  telefone,
  texto,
  rotulo = "WhatsApp",
  titulo,
  tamanho = "pequeno",
  aoAbrir,
}: {
  telefone: string | null | undefined;
  /** Montado por quem chama, a partir do modelo daquela loja. */
  texto: string;
  rotulo?: string;
  titulo?: string;
  /** "pequeno" (32 px) é o da linha de tabela, onde ele mais aparece. */
  tamanho?: TamanhoDoBotao;
  /** Chamado depois de abrir — é onde a abertura é registrada. */
  aoAbrir?: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState(false);

  async function handleClique() {
    setErro(null);
    setAbrindo(true);
    try {
      await abrirConversaWhatsapp(telefone, texto);
      aoAbrir?.();
    } catch (err) {
      console.error("Erro ao abrir o WhatsApp:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setAbrindo(false);
    }
  }

  return (
    <>
      <Botao
        variante="whatsapp"
        tamanho={tamanho}
        onClick={handleClique}
        ocupado={abrindo}
        title={titulo ?? "Abrir a conversa no WhatsApp com a mensagem pronta"}
        icone={<IconeWhatsapp />}
      >
        {rotulo}
      </Botao>
      {erro && <p className="mt-1 text-rotulo text-perigo">{erro}</p>}
    </>
  );
}
