import { useEffect } from "react";

/**
 * Impede que um campo numérico mude de valor sem ninguém digitar nada.
 *
 * O Chromium (motor do Electron) tem duas portas pra isso num
 * `input[type=number]` que está selecionado:
 *
 * - **As setas ↑/↓ do teclado** somam/subtraem um "step". Como vários campos
 *   do app usam `step="0.01"` (preço, quantidade, alíquota), um toque na seta
 *   pra baixo num campo com "2" deixa "1.99" ali, em silêncio — e a seta pra
 *   baixo é o gesto natural de quem quer descer a tela do formulário. Foi
 *   assim que o estoque de um amortecedor ficou em "1.99 UN" (docs/licoes.md,
 *   item 41).
 * - **A rodinha do mouse**, com o cursor em cima do campo, faz o mesmo — mas
 *   só quando a tela não tem mais pra onde rolar (no topo, girando pra cima;
 *   no fim, girando pra baixo). No meio do formulário a rodinha rola a tela e
 *   o valor fica. Por isso a primeira investigação concluiu que "a rodinha
 *   não mexe": ela foi testada no meio. Achado pelo `npm run
 *   comparar:electron` em 03/10/2026.
 *
 * A setinha minúscula dentro do campo era uma terceira porta, fechada por CSS
 * em globals.css.
 *
 * Aqui as setas são bloqueadas, e a rodinha **tira a seleção do campo** em
 * vez de ser bloqueada: bloquear impediria também de rolar a tela com o
 * cursor em cima de um campo, e sem a seleção o Chromium não mexe mais no
 * número — a rolagem segue normal. Digitar continua igual. Aplicado uma única
 * vez, globalmente, mesmo padrão do useEnterParaProximoCampo e do
 * useLimparDataAoApagar.
 */
export function useNaoMexerNoNumeroSemDigitar() {
  useEffect(() => {
    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key !== "ArrowUp" && evento.key !== "ArrowDown") return;

      const alvo = evento.target;
      if (!(alvo instanceof HTMLInputElement) || alvo.type !== "number") return;

      evento.preventDefault();
    }

    function aoGirarRodinha(evento: WheelEvent) {
      const alvo = evento.target;
      if (!(alvo instanceof HTMLInputElement) || alvo.type !== "number") return;
      if (document.activeElement !== alvo) return;

      alvo.blur();
    }

    document.addEventListener("keydown", aoPressionarTecla);
    // `passive`: o aviso só tira a seleção, nunca cancela a rolagem.
    document.addEventListener("wheel", aoGirarRodinha, { passive: true });
    return () => {
      document.removeEventListener("keydown", aoPressionarTecla);
      document.removeEventListener("wheel", aoGirarRodinha);
    };
  }, []);
}
