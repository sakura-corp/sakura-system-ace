/**
 * A OS abre em página própria (visual novo, #1087): a lista some da tela e,
 * ao voltar, precisa reaparecer no mesmo lugar. No app quem rola é a área do
 * conteúdo, não a janela, então guardamos a posição de QUEM rolou.
 */

export interface PosicaoDeRolagem {
  area: Element;
  topo: number;
}

/** O elemento mais próximo, acima de `elemento`, que rola (overflow auto/scroll). */
export function areaRolavelEmVolta(elemento: HTMLElement): Element {
  for (let pai = elemento.parentElement; pai; pai = pai.parentElement) {
    const { overflowY } = getComputedStyle(pai);
    if (overflowY === "auto" || overflowY === "scroll") return pai;
  }
  return document.scrollingElement ?? document.documentElement;
}

/**
 * Dado o alvo de um evento de rolagem, diz se ele é a área que rola em volta
 * de `raiz` (ou a página inteira) e devolve a posição; senão, null.
 */
export function posicaoDaRolagem(alvo: EventTarget | null, raiz: HTMLElement): PosicaoDeRolagem | null {
  if (alvo === document || alvo === window) {
    const pagina = document.scrollingElement ?? document.documentElement;
    return { area: pagina, topo: pagina.scrollTop };
  }
  if (alvo instanceof Element && alvo.contains(raiz)) {
    return { area: alvo, topo: alvo.scrollTop };
  }
  return null;
}

export function devolverRolagem(posicao: PosicaoDeRolagem | null): void {
  void posicao;
}

export function rolarParaOTopo(raiz: HTMLElement, guardada: PosicaoDeRolagem | null): void {
  (guardada?.area ?? areaRolavelEmVolta(raiz)).scrollTop = 0;
}
