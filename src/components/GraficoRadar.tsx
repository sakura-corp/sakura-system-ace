import { useState } from "react";

export interface EixoGraficoRadar {
  chave: string;
  nome: string;
  atual: number;
  anterior: number;
}

interface TooltipState {
  x: number;
  y: number;
  eixo: string;
  serie: string;
  valor: string;
}

interface GraficoRadarProps {
  eixos: EixoGraficoRadar[];
  rotuloAtual?: string;
  rotuloAnterior?: string;
  formatarValor?: (valor: number) => string;
}

const TAMANHO = 260;
const CENTRO = TAMANHO / 2;
const RAIO = 88;
const ANEIS = [0.25, 0.5, 0.75, 1];

function ponto(angulo: number, raio: number): { x: number; y: number } {
  return {
    x: CENTRO + raio * Math.cos(angulo),
    y: CENTRO + raio * Math.sin(angulo),
  };
}

export function GraficoRadar({
  eixos,
  rotuloAtual = "Este período",
  rotuloAnterior = "Período anterior",
  formatarValor = (v) => v.toLocaleString("pt-BR"),
}: GraficoRadarProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  if (eixos.length < 3) {
    return (
      <p className="text-corpo text-sakura-muted">
        Precisa de pelo menos 3 métricas pra montar o gráfico de radar.
      </p>
    );
  }

  const n = eixos.length;
  const anguloPasso = (2 * Math.PI) / n;
  const anguloInicial = -Math.PI / 2;

  const escalas = eixos.map((eixo) => Math.max(eixo.atual, eixo.anterior, 1) * 1.15);

  const pontosAtual = eixos.map((eixo, i) => {
    const angulo = anguloInicial + i * anguloPasso;
    const raio = (eixo.atual / escalas[i]) * RAIO;
    return ponto(angulo, raio);
  });
  const pontosAnterior = eixos.map((eixo, i) => {
    const angulo = anguloInicial + i * anguloPasso;
    const raio = (eixo.anterior / escalas[i]) * RAIO;
    return ponto(angulo, raio);
  });

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-rotulo text-sakura-purple-dark/90">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-sakura-purple-dark" />
          {rotuloAtual}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-sakura-gray" />
          {rotuloAnterior}
        </span>
      </div>

      <svg viewBox={`0 0 ${TAMANHO} ${TAMANHO}`} className="mx-auto" style={{ height: TAMANHO, maxWidth: TAMANHO }}>
        {ANEIS.map((fracao) => (
          <polygon
            key={fracao}
            points={Array.from({ length: n }, (_, i) =>
              ponto(anguloInicial + i * anguloPasso, RAIO * fracao),
            )
              .map((p) => `${p.x},${p.y}`)
              .join(" ")}
            fill="none"
            style={{ stroke: "var(--grafico-grade)" }}
            strokeWidth={1}
          />
        ))}

        {eixos.map((eixo, i) => {
          const angulo = anguloInicial + i * anguloPasso;
          const ponta = ponto(angulo, RAIO);
          const rotulo = ponto(angulo, RAIO + 22);
          return (
            <g key={eixo.chave}>
              <line x1={CENTRO} y1={CENTRO} x2={ponta.x} y2={ponta.y} style={{ stroke: "var(--grafico-grade)" }} strokeWidth={1} />
              <text
                x={rotulo.x}
                y={rotulo.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-sakura-muted"
                fontSize={11}
              >
                {eixo.nome}
              </text>
            </g>
          );
        })}

        <polygon
          points={pontosAnterior.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          style={{ stroke: "var(--grafico-comparacao)" }}
          strokeWidth={2}
          strokeDasharray="4 3"
        />

        <polygon
          points={pontosAtual.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="#4a3aa7"
          fillOpacity={0.12}
          stroke="#4a3aa7"
          strokeWidth={2}
        />

        {pontosAtual.map((p, i) => (
          <circle
            key={eixos[i].chave}
            cx={p.x}
            cy={p.y}
            r={4.5}
            fill="#4a3aa7"
            stroke="#fff"
            strokeWidth={2}
            onMouseEnter={(e) => {
              const rect = (e.currentTarget as SVGCircleElement).getBoundingClientRect();
              const container = (e.currentTarget as SVGCircleElement)
                .closest("svg")!
                .parentElement!.getBoundingClientRect();
              setTooltip({
                x: rect.left - container.left + rect.width / 2,
                y: rect.top - container.top,
                eixo: eixos[i].nome,
                serie: rotuloAtual,
                valor: formatarValor(eixos[i].atual),
              });
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
        {pontosAnterior.map((p, i) => (
          <circle
            key={`${eixos[i].chave}-anterior`}
            cx={p.x}
            cy={p.y}
            r={4}
            style={{ fill: "var(--grafico-comparacao)" }}
            stroke="#fff"
            strokeWidth={2}
            onMouseEnter={(e) => {
              const rect = (e.currentTarget as SVGCircleElement).getBoundingClientRect();
              const container = (e.currentTarget as SVGCircleElement)
                .closest("svg")!
                .parentElement!.getBoundingClientRect();
              setTooltip({
                x: rect.left - container.left + rect.width / 2,
                y: rect.top - container.top,
                eixo: eixos[i].nome,
                serie: rotuloAnterior,
                valor: formatarValor(eixos[i].anterior),
              });
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-sakura-gray/30 bg-sakura-pink-soft px-2.5 py-1.5 text-rotulo text-texto shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
        >
          <p className="font-medium">{tooltip.eixo}</p>
          <p className="text-texto/90">
            {tooltip.serie}: {tooltip.valor}
          </p>
        </div>
      )}
    </div>
  );
}
