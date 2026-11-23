import { useEffect, useRef, useState } from "react";

const LARGURA_INICIAL = 640;
const LARGURA_MINIMA = 240;

/**
 * A largura do lugar onde o gráfico mora, acompanhando a janela: o desenho é
 * feito na largura de verdade (de 1024 a 1600), e nada rola de lado. Medida
 * com `ResizeObserver`; sem ele (testes), fica a inicial.
 *
 * O elemento do `ref` precisa ficar sempre montado (o observador liga uma vez)
 * e, dentro de um flex ou grid, ter `min-w-0`: sem isso ele nunca encolhe
 * abaixo do desenho que já está dentro, e o gráfico só cresce.
 */
export function useLargura<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(LARGURA_INICIAL);
  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || typeof ResizeObserver === "undefined") return;
    const medir = () => {
      const nova = Math.floor(elemento.getBoundingClientRect().width);
      if (nova > 0) setLargura(Math.max(LARGURA_MINIMA, nova));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);
  return [largura, ref] as const;
}
