import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";

/**
 * A dica do visual novo (#990): a caixinha clara que aparece ao passar o mouse
 * ou ao chegar pelo teclado. Regras: docs/referencia/visual-novo/README.md,
 * seção 6.
 *
 *     <Dica texto="Abrir a ficha do veículo">
 *       <button …>RTA-4B71</button>
 *     </Dica>
 *
 * Entra no lugar do `title` do navegador, que demora quase um segundo, não
 * aparece no teclado e não segue a aparência do programa. **Não use os dois no
 * mesmo elemento**: sairiam duas dicas, uma em cima da outra.
 *
 * A dica é um complemento, nunca o nome do botão: botão só com ícone continua
 * precisando do `aria-label` dele (o `Botao` com `soIcone` já exige).
 *
 * Fica num portal pro <body> pelo motivo de sempre: dentro de uma tabela com
 * rolagem ou de uma janela, ela nasceria cortada.
 */

/** Esperar o mouse PARAR: cruzar a tela não pode acender dica por dica. */
const ESPERA_PRA_ABRIR = 350;
/** Folga pra o mouse atravessar o vão entre o botão e a dica sem ela sumir. */
const ESPERA_PRA_FECHAR = 100;
const VAO = 8;
const MARGEM_DA_TELA = 8;

type Lado = "cima" | "direita";

export function Dica({
  texto,
  lado = "cima",
  children,
}: {
  texto: string;
  /** "direita" é pro menu encolhido, onde em cima taparia o item vizinho. */
  lado?: Lado;
  /** Um elemento só: o botão, o link ou o ícone que a dica explica. */
  children: ReactElement<{ "aria-describedby"?: string }>;
}) {
  const id = useId();
  const [aberta, setAberta] = useState(false);
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null);
  const envelopeRef = useRef<HTMLSpanElement>(null);
  const dicaRef = useRef<HTMLDivElement>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  // O clique do mouse dá foco no botão logo depois do pointerdown. Esse foco
  // não é "cheguei pelo teclado", e não deve acender a dica.
  const focoVeioDoClique = useRef(false);

  const temTexto = texto.trim() !== "";

  function limparRelogio() {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
  }

  function abrir(espera: number) {
    limparRelogio();
    if (!temTexto) return;
    if (espera === 0) setAberta(true);
    else relogio.current = setTimeout(() => setAberta(true), espera);
  }

  function fechar(espera = 0) {
    limparRelogio();
    if (espera === 0) setAberta(false);
    else relogio.current = setTimeout(() => setAberta(false), espera);
  }

  useEffect(() => limparRelogio, []);

  /**
   * Põe a dica no lugar, a partir do tamanho de verdade dela e de onde o alvo
   * está AGORA. Devolve `false` se o alvo não está mais à vista (rolou pra
   * fora da tela): aí não há onde pôr a dica.
   */
  function posicionar(): boolean {
    const alvo = envelopeRef.current?.firstElementChild?.getBoundingClientRect();
    const dica = dicaRef.current?.getBoundingClientRect();
    if (!alvo || !dica) return false;
    const foraDaVista =
      alvo.bottom < 0 || alvo.top > window.innerHeight || alvo.right < 0 || alvo.left > window.innerWidth;
    if (foraDaVista) return false;

    let top: number;
    let left: number;
    if (lado === "direita") {
      top = alvo.top + alvo.height / 2 - dica.height / 2;
      left = alvo.right + VAO;
    } else {
      top = alvo.top - dica.height - VAO;
      left = alvo.left + alvo.width / 2 - dica.width / 2;
      // Sem espaço em cima (primeira linha da tela): vai pra baixo.
      if (top < MARGEM_DA_TELA) top = alvo.bottom + VAO;
    }
    const maxLeft = window.innerWidth - dica.width - MARGEM_DA_TELA;
    const maxTop = window.innerHeight - dica.height - MARGEM_DA_TELA;
    setPosicao({
      top: Math.max(MARGEM_DA_TELA, Math.min(top, maxTop)),
      left: Math.max(MARGEM_DA_TELA, Math.min(left, maxLeft)),
    });
    return true;
  }

  // Sempre a versão mais nova da função, pros dois efeitos abaixo não
  // precisarem recriar os ouvintes a cada desenho.
  const posicionarRef = useRef(posicionar);
  posicionarRef.current = posicionar;

  // Medida depois de desenhada e antes de o navegador pintar (por isso o
  // layout effect): assim a dica não pisca num canto pra depois pular pro
  // lugar.
  useLayoutEffect(() => {
    if (!aberta) {
      setPosicao(null);
      return;
    }
    posicionarRef.current();
  }, [aberta, lado, texto]);

  useEffect(() => {
    if (!aberta) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberta(false);
    }
    // A tela rolou ou mudou de tamanho: a dica ACOMPANHA o alvo. Ela não pode
    // simplesmente fechar: chegar com o Tab num botão fora da vista faz a
    // tela rolar até ele, e a dica sumiria no instante em que apareceu (visto
    // ao fotografar a mostra das peças). Só fecha se o alvo saiu da vista.
    function aoMexerNaTela() {
      if (!posicionarRef.current()) setAberta(false);
    }
    document.addEventListener("keydown", aoTeclar);
    window.addEventListener("resize", aoMexerNaTela);
    window.addEventListener("scroll", aoMexerNaTela, true);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("resize", aoMexerNaTela);
      window.removeEventListener("scroll", aoMexerNaTela, true);
    };
  }, [aberta]);

  return (
    // `contents`: o envelope não tem caixa própria, então não muda o layout de
    // quem está dentro (célula de tabela, linha de botões).
    <span
      ref={envelopeRef}
      className="contents"
      onMouseEnter={() => abrir(ESPERA_PRA_ABRIR)}
      onMouseLeave={() => fechar(ESPERA_PRA_FECHAR)}
      onPointerDown={() => {
        focoVeioDoClique.current = true;
        fechar();
      }}
      onFocus={() => {
        if (focoVeioDoClique.current) {
          focoVeioDoClique.current = false;
          return;
        }
        abrir(0);
      }}
      onBlur={() => {
        focoVeioDoClique.current = false;
        fechar();
      }}
    >
      {aberta && temTexto ? cloneElement(children, { "aria-describedby": id }) : children}
      {aberta &&
        temTexto &&
        createPortal(
          <div
            ref={dicaRef}
            id={id}
            role="tooltip"
            style={{
              top: posicao?.top ?? 0,
              left: posicao?.left ?? 0,
              // Até a posição ser medida, existe mas não aparece.
              visibility: posicao ? "visible" : "hidden",
            }}
            className="fixed z-[80] max-w-[min(20rem,calc(100vw-1rem))] rounded-lg bg-dica px-2.5 py-1.5 text-rotulo font-semibold text-sobre-dica shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
          >
            {texto}
          </div>,
          document.body,
        )}
    </span>
  );
}
