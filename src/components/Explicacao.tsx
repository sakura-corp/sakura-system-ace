import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Um "?" que explica, em uma frase, o que aquele número quer dizer.
 *
 * Nasceu por causa de uma história concreta: a definição de "lucro" deste
 * sistema já mudou uma vez (PROJETO_STATUS.md, seção 6, item 40 — antes o
 * cartão mostrava o faturamento quase inteiro como se fosse lucro) e o número
 * caiu bastante de um dia pro outro. Sem a definição à mão, quem olha conclui
 * que o negócio piorou, e não que a conta foi consertada.
 *
 * O painel é renderizado num portal pro `<body>`. Nasceu assim porque o
 * `sakura-card` era vidro (`backdrop-filter`), e `backdrop-filter` vira bloco
 * de contenção até pra `position: fixed`: o balão nascia recortado dentro do
 * cartão (o mesmo cuidado do menu de ações de linha, seção 6, item 51). O
 * cartão virou sólido no visual novo (#990), mas o portal continua valendo:
 * dentro de uma tabela com rolagem ou de uma janela, o balão seria cortado.
 */
export function Explicacao({ titulo, texto }: { titulo: string; texto: string }) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState({ top: 0, left: 0 });
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  const LARGURA = 260;

  function abrir() {
    const retangulo = botaoRef.current?.getBoundingClientRect();
    if (!retangulo) return;
    setPosicao({
      top: retangulo.bottom + 6,
      // Encostar na borda direita da tela deixaria o texto cortado.
      left: Math.max(8, Math.min(retangulo.left, window.innerWidth - LARGURA - 8)),
    });
    setAberto(true);
  }

  function fechar(devolverFoco = true) {
    setAberto(false);
    if (devolverFoco) botaoRef.current?.focus();
  }

  useEffect(() => {
    if (!aberto) return;

    function aoApontarFora(evento: MouseEvent) {
      const alvo = evento.target as Node;
      if (painelRef.current?.contains(alvo) || botaoRef.current?.contains(alvo)) return;
      fechar(false);
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        fechar();
      }
    }
    // A posição é calculada uma vez, na abertura: rolar a tela deixaria o
    // balão solto longe do "?". Fechar é mais honesto que mostrar torto.
    function aoMexerNaTela() {
      fechar(false);
    }

    document.addEventListener("mousedown", aoApontarFora);
    document.addEventListener("keydown", aoTeclar);
    window.addEventListener("resize", aoMexerNaTela);
    window.addEventListener("scroll", aoMexerNaTela, true);
    return () => {
      document.removeEventListener("mousedown", aoApontarFora);
      document.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("resize", aoMexerNaTela);
      window.removeEventListener("scroll", aoMexerNaTela, true);
    };
  }, [aberto]);

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        aria-expanded={aberto}
        aria-label={`O que é ${titulo}?`}
        // O balãozinho do mouse já entrega a explicação sem precisar clicar;
        // o painel existe pra quem usa teclado ou toque.
        title={texto}
        onClick={() => (aberto ? fechar(false) : abrir())}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-linha-forte text-meta font-bold text-texto-2 transition-colors hover:bg-passar hover:text-texto"
      >
        ?
      </button>

      {aberto &&
        createPortal(
          <div
            ref={painelRef}
            role="dialog"
            aria-label={`O que é ${titulo}`}
            style={{ top: posicao.top, left: posicao.left, width: LARGURA }}
            className="fixed z-[60] rounded-xl border border-linha-forte bg-passar p-3 shadow-[0_18px_40px_var(--sombra-forte)]"
          >
            <p className="text-rotulo font-semibold text-texto">{titulo}</p>
            <p className="mt-1 text-rotulo text-texto-2">{texto}</p>
          </div>,
          document.body,
        )}
    </>
  );
}
