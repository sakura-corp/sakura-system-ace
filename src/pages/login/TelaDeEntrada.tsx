import type { ReactNode } from "react";

/**
 * O molde das telas de entrada (visual novo, #990, tarefa 6): Login, conexão e
 * trocar a senha. Fundo de marca com o grão (que fica no bloco de fora, o que
 * não rola, senão sobe junto com o conteúdo numa janela baixa) e, no meio, o
 * cartão de vidro (`sakura-vidro`) que o filho desenha.
 */
export function TelaDeEntrada({ children }: { children: ReactNode }) {
  return (
    <div className="sakura-fundo-marca sakura-grao h-screen">
      <div className="tela-de-entrada-rola">{children}</div>
    </div>
  );
}
