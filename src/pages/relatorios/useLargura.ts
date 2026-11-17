import { useEffect, useRef, useState } from "react";

const LARGURA_INICIAL = 640;
const LARGURA_MINIMA = 420;

/**
 * A largura de um elemento, acompanhando a janela (os gráficos de Relações
 * ocupam a largura do cartão). Sem `ResizeObserver` (testes), fica a inicial.
 * O elemento do `ref` precisa ficar sempre montado: o observador liga uma vez.
 */
export function useLargura() {
  const ref = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(LARGURA_INICIAL);
  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || typeof ResizeObserver === "undefined") return;
    const medir = () => {
      const nova = Math.round(elemento.getBoundingClientRect().width);
      if (nova > 0) setLargura(Math.max(LARGURA_MINIMA, nova));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);
  return [largura, ref] as const;
}
