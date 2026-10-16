import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface AreaRolavelProps {
  className?: string;
  children: ReactNode;
}

const ALTURA_MINIMA_THUMB = 32;
// Afasta o polegar do topo/base do container — sem isso ele encostava bem na
// quina arredondada do sakura-card e parecia "cortado" pela curva.
const MARGEM_TRILHO = 10;

/**
 * Substitui a barra de rolagem nativa do sistema por uma barrinha desenhada
 * pelo próprio app — a nativa (mesmo estilizada via ::-webkit-scrollbar) não
 * respeita as quinas arredondadas do sakura-card e sempre lê como um widget
 * do Windows, não como parte da interface.
 */
export function AreaRolavel({ className = "", children }: AreaRolavelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const arrastando = useRef(false);
  const arrastoInicialY = useRef(0);
  const arrastoInicialScroll = useRef(0);
  const [thumb, setThumb] = useState({ altura: 0, topo: 0, visivel: false });

  function atualizar() {
    const el = containerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 1) {
      setThumb({ altura: 0, topo: 0, visivel: false });
      return;
    }
    const trilho = Math.max(clientHeight - MARGEM_TRILHO * 2, 0);
    const altura = Math.min(
      Math.max((clientHeight / scrollHeight) * trilho, ALTURA_MINIMA_THUMB),
      trilho,
    );
    const maxTopo = trilho - altura;
    const topo = MARGEM_TRILHO + (scrollTop / (scrollHeight - clientHeight)) * maxTopo;
    setThumb({ altura, topo, visivel: true });
  }

  useEffect(() => {
    atualizar();
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(atualizar);
    observer.observe(el);
    // O contêiner tem altura fixa: quando o conteúdo cresce ou encolhe sozinho
    // (a lista carrega depois de trocar de tela), só o filho muda de medida.
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    window.addEventListener("resize", atualizar);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", atualizar);
    };
  }, [children]);

  useEffect(() => {
    function aoMover(e: PointerEvent) {
      const el = containerRef.current;
      if (!arrastando.current || !el) return;
      const { scrollHeight, clientHeight } = el;
      const trilho = Math.max(clientHeight - MARGEM_TRILHO * 2, 0);
      const altura = Math.min(
        Math.max((clientHeight / scrollHeight) * trilho, ALTURA_MINIMA_THUMB),
        trilho,
      );
      const maxTopo = trilho - altura;
      if (maxTopo <= 0) return;
      const deltaY = e.clientY - arrastoInicialY.current;
      const deltaScroll = (deltaY / maxTopo) * (scrollHeight - clientHeight);
      el.scrollTop = arrastoInicialScroll.current + deltaScroll;
    }
    function aoSoltar() {
      arrastando.current = false;
    }
    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
    return () => {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
    };
  }, []);

  function aoIniciarArrasto(e: React.PointerEvent) {
    e.preventDefault();
    arrastando.current = true;
    arrastoInicialY.current = e.clientY;
    arrastoInicialScroll.current = containerRef.current?.scrollTop ?? 0;
  }

  return (
    <div className="relative h-full min-h-0 flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={atualizar}
        className={`h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
      {thumb.visivel && (
        <div
          data-testid="barra-rolagem-thumb"
          onPointerDown={aoIniciarArrasto}
          className="absolute right-1 w-1.5 cursor-pointer rounded-full bg-sakura-purple-dark/35 transition-colors hover:bg-sakura-purple-dark/55"
          style={{ height: thumb.altura, top: thumb.topo }}
        />
      )}
    </div>
  );
}
