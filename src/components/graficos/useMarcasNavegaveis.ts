import { useRef, useState, type KeyboardEvent } from "react";

/**
 * A dica dos gráficos com mouse **e** teclado (#1086, "Teclado e leitor de
 * tela"). Cada marca (barra, ponto, coluna, dia) é uma parada, mas o gráfico
 * inteiro é **uma parada só do Tab** (foco "itinerante"): só uma marca tem
 * `tabIndex=0`; dali, as setas passam de marca em marca, Home e End vão pra
 * primeira e a última, e o Esc fecha a dica. Sem isso, um mês de 31 colunas
 * seriam 31 Tabs pra passar pelo gráfico.
 *
 * Passar o mouse numa marca acende a mesma dica que o foco. Cada marca tem o
 * `aria-label` com o mesmo texto da dica, então o leitor de tela lê o mesmo
 * que o olho vê.
 *
 *     const marcas = useMarcasNavegaveis(dias.length);
 *     <rect {...marcas.propsDaMarca(i, "Seg, 17: R$ 2,6 mil")} … />
 *     marcas.ativa  // o índice com a dica aberta, ou null
 *     marcas.foco   // o índice com o foco do teclado (pra desenhar o anel)
 */
export function useMarcasNavegaveis(quantas: number) {
  const [ativa, setAtiva] = useState<number | null>(null);
  const [foco, setFoco] = useState<number | null>(null);
  const [parada, setParada] = useState(0);
  const elementos = useRef<(HTMLElement | SVGElement | null)[]>([]);

  // Se a lista encolheu (trocou o período), a parada não pode apontar pra fora.
  const paradaSegura = quantas === 0 ? -1 : Math.min(parada, quantas - 1);

  function irPara(indice: number) {
    if (quantas === 0) return;
    const alvo = Math.max(0, Math.min(quantas - 1, indice));
    setParada(alvo);
    elementos.current[alvo]?.focus();
  }

  function aoTeclar(indice: number, evento: KeyboardEvent) {
    switch (evento.key) {
      case "ArrowRight":
      case "ArrowDown":
        evento.preventDefault(); // senão a página rola junto
        irPara(indice + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        evento.preventDefault();
        irPara(indice - 1);
        break;
      case "Home":
        evento.preventDefault();
        irPara(0);
        break;
      case "End":
        evento.preventDefault();
        irPara(quantas - 1);
        break;
      case "Escape":
        if (ativa !== null) {
          // Usado: uma janela em volta (o "Ver todos") não fecha junto.
          evento.preventDefault();
          evento.stopPropagation();
          setAtiva(null);
        }
        break;
    }
  }

  function propsDaMarca(indice: number, texto: string) {
    return {
      ref: (elemento: HTMLElement | SVGElement | null) => {
        elementos.current[indice] = elemento;
      },
      tabIndex: indice === paradaSegura ? 0 : -1,
      role: "img" as const,
      "aria-label": texto,
      "data-marca": indice,
      "data-ativa": ativa === indice ? "" : undefined,
      onFocus: () => {
        setParada(indice);
        setFoco(indice);
        setAtiva(indice);
      },
      onBlur: () => {
        setFoco((atual) => (atual === indice ? null : atual));
        setAtiva((atual) => (atual === indice ? null : atual));
      },
      onMouseEnter: () => setAtiva(indice),
      onMouseLeave: () => setAtiva((atual) => (atual === indice && foco !== indice ? null : atual)),
      onKeyDown: (evento: KeyboardEvent) => aoTeclar(indice, evento),
      // O anel de foco é desenhado pelo gráfico (o contorno do navegador em
      // SVG sai torto); aqui só some o padrão.
      style: { outline: "none" },
    };
  }

  return { ativa, foco, propsDaMarca };
}
