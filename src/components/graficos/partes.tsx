import type { CSSProperties, ReactNode, Ref } from "react";
import { COR, VAO_DO_ROTULO } from "./tema";

/**
 * As peças de SVG que todos os gráficos de Relações usam (#1086): a grade, os
 * eixos, o rótulo direto, a linha de referência, o anel de foco e a dica.
 * Regras de cor e de letra: docs/referencia/visual-novo/README.md. As cores
 * estão em `tema.ts`.
 */

/** As letras dentro do SVG: as mesmas da escala `--text-*`, com algarismos em coluna. */
const LETRA_PEQUENA = "text-meta tabular-nums";
const LETRA_NORMAL = "text-rotulo tabular-nums";

/** Linhas horizontais finas, uma por marca do eixo y; a do zero, mais forte. */
export function Grade({
  marcas,
  y,
  x0,
  x1,
}: {
  marcas: readonly number[];
  y: (v: number) => number;
  x0: number;
  x1: number;
}) {
  return (
    <g aria-hidden="true">
      {marcas.map((m) => (
        <line
          key={m}
          data-zero={m === 0 ? "" : undefined}
          x1={x0}
          x2={x1}
          y1={y(m)}
          y2={y(m)}
          style={{ stroke: m === 0 ? COR.eixo : COR.grade }}
          strokeWidth={m === 0 ? 1.5 : 1}
          shapeRendering="crispEdges"
        />
      ))}
    </g>
  );
}

/** Os números do eixo y, à esquerda, com o nome do eixo em cima quando fizer sentido. */
export function EixoY({
  marcas,
  y,
  x,
  formatar,
  nome,
}: {
  marcas: readonly number[];
  y: (v: number) => number;
  /** Onde a grade começa (o texto termina 8 px antes, alinhado à direita). */
  x: number;
  formatar: (v: number) => string;
  nome?: string;
}) {
  return (
    <g aria-hidden="true">
      {nome && (
        <text x={0} y={y(marcas[marcas.length - 1] ?? 0) - 14} className={LETRA_PEQUENA} style={{ fill: COR.texto2 }}>
          {nome}
        </text>
      )}
      {marcas.map((m) => (
        <text
          key={m}
          x={x - VAO_DO_ROTULO * 2}
          y={y(m)}
          textAnchor="end"
          dominantBaseline="middle"
          className={LETRA_PEQUENA}
          style={{ fill: COR.texto2 }}
        >
          {formatar(m)}
        </text>
      ))}
    </g>
  );
}

export interface RotuloDoEixoX {
  chave: string;
  x: number;
  linhas: readonly string[];
  destaque?: boolean;
}

/** Os rótulos do eixo x (dias, nomes), embaixo; até 2 linhas cada. */
export function EixoX({
  rotulos,
  y,
  nome,
  xDoNome,
}: {
  rotulos: readonly RotuloDoEixoX[];
  /** A altura da primeira linha. */
  y: number;
  nome?: string;
  /** Onde o nome do eixo termina (à direita, embaixo dos rótulos). */
  xDoNome?: number;
}) {
  const linhasNoMaximo = Math.max(1, ...rotulos.map((r) => r.linhas.length));
  return (
    <g aria-hidden="true">
      {rotulos.map((r) => (
        <text
          key={r.chave}
          x={r.x}
          y={y}
          textAnchor="middle"
          dominantBaseline="hanging"
          className={LETRA_PEQUENA}
          style={{ fill: r.destaque ? COR.destaqueTexto : COR.texto2, fontWeight: r.destaque ? 600 : undefined }}
        >
          {r.linhas.map((linha, i) => (
            <tspan key={i} x={r.x} dy={i === 0 ? 0 : 15}>
              {linha}
            </tspan>
          ))}
        </text>
      ))}
      {nome && xDoNome !== undefined && (
        <text
          x={xDoNome}
          y={y + linhasNoMaximo * 15 + 4}
          textAnchor="end"
          dominantBaseline="hanging"
          className={LETRA_PEQUENA}
          style={{ fill: COR.texto2 }}
        >
          {nome}
        </text>
      )}
    </g>
  );
}

/**
 * O texto escrito no próprio dado (Tufte: rótulo direto, sem legenda pra
 * procurar), a 4 px da marca. Leva um "halo" da cor do cartão: se passar perto
 * de uma linha, a linha some atrás dele em vez de cortar a palavra.
 */
export function RotuloDireto({
  x,
  y,
  children,
  ancora = "start",
  cor = COR.texto,
  forte = false,
  base = "middle",
}: {
  x: number;
  y: number;
  children: ReactNode;
  ancora?: "start" | "middle" | "end";
  cor?: string;
  forte?: boolean;
  base?: "middle" | "auto" | "hanging";
}) {
  return (
    <text
      aria-hidden="true"
      x={x}
      y={y}
      textAnchor={ancora}
      dominantBaseline={base}
      className={LETRA_NORMAL}
      style={{
        fill: cor,
        fontWeight: forte ? 600 : 500,
        paintOrder: "stroke",
        stroke: COR.fundo,
        strokeWidth: 4,
        strokeLinejoin: "round",
      }}
    >
      {children}
    </text>
  );
}

/**
 * Uma linha tracejada horizontal (a média) com o rótulo ao lado, fora das
 * barras: quem chama reserva o espaço do rótulo à direita.
 */
export function LinhaDeReferencia({
  x0,
  x1,
  y,
  rotulo,
  xDoRotulo,
}: {
  x0: number;
  x1: number;
  y: number;
  /** Uma ou duas linhas ("média", "R$ 1,2 mil"); a última vai em negrito. */
  rotulo?: readonly string[];
  /** Onde o rótulo começa; sem dizer, 8 px depois do fim da linha. */
  xDoRotulo?: number;
}) {
  const xr = xDoRotulo ?? x1 + VAO_DO_ROTULO * 2;
  return (
    <g aria-hidden="true" data-linha-de-referencia>
      <line
        x1={x0}
        x2={x1}
        y1={y}
        y2={y}
        style={{ stroke: COR.texto }}
        strokeOpacity={0.7}
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      {rotulo && (
        <text
          x={xr}
          y={y - (rotulo.length - 1) * 7.5}
          dominantBaseline="middle"
          className={LETRA_PEQUENA}
          style={{ fill: COR.texto }}
        >
          {rotulo.map((linha, i) => (
            <tspan key={i} x={xr} dy={i === 0 ? 0 : 15} style={{ fontWeight: i === rotulo.length - 1 ? 600 : 400 }}>
              {linha}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}

/** O anel de foco (laranja claro) em volta da marca que está com o foco do teclado. */
export function AnelDeFoco({ x, y, largura, altura }: { x: number; y: number; largura: number; altura: number }) {
  return (
    <rect
      aria-hidden="true"
      data-anel-de-foco
      x={x - 3}
      y={y - 3}
      width={Math.max(0, largura) + 6}
      height={Math.max(0, altura) + 6}
      rx={6}
      fill="none"
      style={{ stroke: COR.foco }}
      strokeWidth={2}
      pointerEvents="none"
    />
  );
}

/** A caixinha da dica, a mesma da `Dica` do programa (clara, letra escura). */
export function CaixaDaDica({
  texto,
  style,
  className = "",
}: {
  texto: string;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      role="tooltip"
      style={style}
      className={`pointer-events-none absolute z-10 w-max max-w-[16rem] rounded-lg bg-dica px-2.5 py-1.5 text-rotulo font-semibold text-sobre-dica tabular-nums shadow-[0_10px_24px_var(--sombra-forte)] ${className}`.trim()}
    >
      {texto}
    </div>
  );
}

/**
 * A dica do gráfico em SVG: HTML por cima do desenho, no ponto (x, y). Fica em
 * cima do ponto; perto do topo, embaixo. Perto das bordas, encosta pro lado de
 * dentro: nunca sai do cartão.
 */
export function DicaDoGrafico({ x, y, largura, texto }: { x: number; y: number; largura: number; texto: string }) {
  const embaixo = y < 56;
  const lado = x < 96 ? "0" : x > largura - 96 ? "-100%" : "-50%";
  return (
    <CaixaDaDica
      texto={texto}
      style={{
        left: x,
        top: y,
        transform: `translate(${lado}, ${embaixo ? "12px" : "calc(-100% - 12px)"})`,
      }}
    />
  );
}

/**
 * O lugar do desenho: o `ref` do `useLargura` mede a largura, o SVG é feito
 * nela (nada rola de lado) e a dica fica por cima. A entrada é uma só e sutil
 * (aparecer em 0,32 s), e nenhuma com "reduzir movimento" (`motion-safe`).
 */
export function AreaDoGrafico({
  medidor,
  largura,
  altura,
  dica,
  children,
  depois,
}: {
  medidor: Ref<HTMLDivElement>;
  largura: number;
  altura: number;
  dica: { x: number; y: number; texto: string } | null;
  children: ReactNode;
  /** HTML depois do SVG (uma legenda em palavras). */
  depois?: ReactNode;
}) {
  return (
    <div ref={medidor} className="relative w-full min-w-0">
      <svg
        width={largura}
        height={altura}
        viewBox={`0 0 ${largura} ${altura}`}
        className="block max-w-full overflow-visible motion-safe:animate-[sakura-fio-aparece_0.32s_var(--ease-suave)_backwards]"
      >
        {children}
      </svg>
      {dica && <DicaDoGrafico x={dica.x} y={dica.y} largura={largura} texto={dica.texto} />}
      {depois}
    </div>
  );
}

/** Uma legenda em palavras, embaixo do desenho: a marca e o que ela quer dizer. */
export function Legenda({ itens }: { itens: readonly { chave: string; marca: ReactNode; texto: string }[] }) {
  return (
    <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-meta text-texto-2">
      {itens.map((item) => (
        <li key={item.chave} className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-flex">
            {item.marca}
          </span>
          {item.texto}
        </li>
      ))}
    </ul>
  );
}
