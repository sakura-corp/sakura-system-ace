import { useState } from "react";

export interface SerieGraficoBarras {
  chave: string;
  nome: string;
  cor: string;
}

interface TooltipState {
  x: number;
  y: number;
  categoria: string;
  serie: string;
  cor: string;
  valor: string;
}

interface GraficoBarrasProps {
  series: SerieGraficoBarras[];
  categorias: string[];
  valores: Record<string, number[]>;
  formatarValor?: (valor: number) => string;
}

const ALTURA = 220;
const LARGURA = 640;
const MARGEM_ESQUERDA = 56;
const MARGEM_INFERIOR = 28;
const MARGEM_SUPERIOR = 12;
const MARGEM_DIREITA = 12;
const ESPESSURA_MAX_BARRA = 20;
const GAP_BARRA = 2;

function arredondarTeto(valor: number): number {
  if (valor <= 0) return 1;
  const grandeza = 10 ** Math.floor(Math.log10(valor));
  return Math.ceil(valor / grandeza) * grandeza;
}

export function GraficoBarras({
  series,
  categorias,
  valores,
  formatarValor = (v) => v.toLocaleString("pt-BR"),
}: GraficoBarrasProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const alturaUtil = ALTURA - MARGEM_SUPERIOR - MARGEM_INFERIOR;
  const larguraUtil = LARGURA - MARGEM_ESQUERDA - MARGEM_DIREITA;

  const maiorValor = Math.max(
    1,
    ...series.flatMap((s) => valores[s.chave] ?? []),
  );
  const tetoEixo = arredondarTeto(maiorValor);

  const marcasEixo = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(tetoEixo * f));

  const larguraCategoria = categorias.length > 0 ? larguraUtil / categorias.length : 0;
  const larguraGrupo = larguraCategoria * 0.7;
  const larguraBarra = Math.min(
    ESPESSURA_MAX_BARRA,
    (larguraGrupo - GAP_BARRA * (series.length - 1)) / series.length,
  );

  if (categorias.length === 0) {
    return <p className="text-corpo text-sakura-muted">Sem dados suficientes pra montar o gráfico ainda.</p>;
  }

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <span key={s.chave} className="flex items-center gap-1.5 text-rotulo text-sakura-purple-dark/90">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.cor }} />
            {s.nome}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="w-full" style={{ height: ALTURA }}>
        {marcasEixo.map((marca, i) => {
          const y = MARGEM_SUPERIOR + alturaUtil - (marca / tetoEixo) * alturaUtil;
          return (
            <g key={i}>
              <line
                x1={MARGEM_ESQUERDA}
                x2={LARGURA - MARGEM_DIREITA}
                y1={y}
                y2={y}
                style={{ stroke: "var(--grafico-grade)" }}
                strokeWidth={1}
              />
              <text
                x={MARGEM_ESQUERDA - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-sakura-muted"
                fontSize={10}
              >
                {marca.toLocaleString("pt-BR")}
              </text>
            </g>
          );
        })}

        <line
          x1={MARGEM_ESQUERDA}
          x2={LARGURA - MARGEM_DIREITA}
          y1={MARGEM_SUPERIOR + alturaUtil}
          y2={MARGEM_SUPERIOR + alturaUtil}
          style={{ stroke: "var(--grafico-eixo)" }}
          strokeWidth={1}
        />

        {categorias.map((categoria, iCategoria) => {
          const inicioGrupo =
            MARGEM_ESQUERDA +
            iCategoria * larguraCategoria +
            (larguraCategoria - larguraGrupo) / 2;

          return (
            <g key={categoria}>
              {series.map((s, iSerie) => {
                const valor = valores[s.chave]?.[iCategoria] ?? 0;
                const alturaBarra = (Math.max(valor, 0) / tetoEixo) * alturaUtil;
                const x = inicioGrupo + iSerie * (larguraBarra + GAP_BARRA);
                const y = MARGEM_SUPERIOR + alturaUtil - alturaBarra;

                return (
                  <rect
                    key={s.chave}
                    x={x}
                    y={y}
                    width={larguraBarra}
                    height={Math.max(alturaBarra, 0)}
                    rx={3}
                    fill={s.cor}
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
                      const container = (e.currentTarget as SVGRectElement).closest("svg")!
                        .parentElement!.getBoundingClientRect();
                      setTooltip({
                        x: rect.left - container.left + rect.width / 2,
                        y: rect.top - container.top,
                        categoria,
                        serie: s.nome,
                        cor: s.cor,
                        valor: formatarValor(valor),
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
              <text
                x={inicioGrupo + larguraGrupo / 2}
                y={ALTURA - 10}
                textAnchor="middle"
                className="fill-sakura-muted"
                fontSize={10}
              >
                {categoria}
              </text>
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-sakura-gray/30 bg-sakura-pink-soft px-2.5 py-1.5 text-rotulo text-texto shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
        >
          <p className="font-medium">{tooltip.categoria}</p>
          <p className="flex items-center gap-1.5 text-texto/90">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tooltip.cor }} />
            {tooltip.serie}: {tooltip.valor}
          </p>
        </div>
      )}
    </div>
  );
}
