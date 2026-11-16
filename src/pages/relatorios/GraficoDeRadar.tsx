import { useState } from "react";

/**
 * O gráfico de radar de Relações no visual novo (#990, tarefa 13): o
 * `components/GraficoRadar.tsx` de antes, com o roxo trocado pelo laranja (o
 * período de agora) e pelo cinza tracejado (o anterior), as bolinhas com a
 * borda na cor do cartão (a branca fixa gritava no tema claro) e a caixinha
 * do mouse na `dica`. **Nenhuma conta é feita aqui.** O original continua em
 * `components/` (peça compartilhada, fora desta tarefa).
 */

export interface EixoDeRadar {
  chave: string;
  nome: string;
  atual: number;
  anterior: number;
}

interface Dica {
  x: number;
  y: number;
  eixo: string;
  serie: string;
  valor: string;
}

interface GraficoDeRadarProps {
  eixos: EixoDeRadar[];
  rotuloAtual?: string;
  rotuloAnterior?: string;
  formatarValor?: (valor: number) => string;
  /** O que o gráfico mostra, pro leitor de tela. */
  descricao: string;
}

const TAMANHO = 260;
const CENTRO = TAMANHO / 2;
const RAIO = 88;
const ANEIS = [0.25, 0.5, 0.75, 1];
// O laranja do botão (igual nos dois temas): com 3,2:1 no cartão branco passa
// dos 3:1 que um desenho pede, e o claro não precisa de outro tom.
const COR_ATUAL = "var(--color-acao)";

function ponto(angulo: number, raio: number): { x: number; y: number } {
  return {
    x: CENTRO + raio * Math.cos(angulo),
    y: CENTRO + raio * Math.sin(angulo),
  };
}

export function GraficoDeRadar({
  eixos,
  rotuloAtual = "Este período",
  rotuloAnterior = "Período anterior",
  formatarValor = (v) => v.toLocaleString("pt-BR"),
  descricao,
}: GraficoDeRadarProps) {
  const [dica, setDica] = useState<Dica | null>(null);

  if (eixos.length < 3) {
    return (
      <p className="text-corpo text-texto-2">
        Precisa de pelo menos 3 métricas pra montar o gráfico de radar.
      </p>
    );
  }

  const n = eixos.length;
  const anguloPasso = (2 * Math.PI) / n;
  const anguloInicial = -Math.PI / 2;

  const escalas = eixos.map((eixo) => Math.max(eixo.atual, eixo.anterior, 1) * 1.15);

  const pontosAtual = eixos.map((eixo, i) =>
    ponto(anguloInicial + i * anguloPasso, (eixo.atual / escalas[i]) * RAIO),
  );
  const pontosAnterior = eixos.map((eixo, i) =>
    ponto(anguloInicial + i * anguloPasso, (eixo.anterior / escalas[i]) * RAIO),
  );

  function mostrar(e: React.MouseEvent<SVGCircleElement>, eixo: string, serie: string, valor: number) {
    const rect = e.currentTarget.getBoundingClientRect();
    const container = e.currentTarget.closest("svg")!.parentElement!.getBoundingClientRect();
    setDica({
      x: rect.left - container.left + rect.width / 2,
      y: rect.top - container.top,
      eixo,
      serie,
      valor: formatarValor(valor),
    });
  }

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-rotulo text-texto-2">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: COR_ATUAL }} />
          {rotuloAtual}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0 w-4 border-t-2 border-dashed"
            style={{ borderColor: "var(--grafico-comparacao)" }}
          />
          {rotuloAnterior}
        </span>
      </div>

      <svg
        role="img"
        aria-label={descricao}
        viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}
        className="mx-auto"
        style={{ height: TAMANHO, maxWidth: TAMANHO }}
      >
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
              <line
                x1={CENTRO}
                y1={CENTRO}
                x2={ponta.x}
                y2={ponta.y}
                style={{ stroke: "var(--grafico-grade)" }}
                strokeWidth={1}
              />
              <text
                x={rotulo.x}
                y={rotulo.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-texto-2"
                fontSize={12}
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
          fillOpacity={0.14}
          strokeWidth={2}
          style={{ fill: COR_ATUAL, stroke: COR_ATUAL }}
        />

        {pontosAtual.map((p, i) => (
          <circle
            key={eixos[i].chave}
            cx={p.x}
            cy={p.y}
            r={4.5}
            strokeWidth={2}
            style={{ fill: COR_ATUAL, stroke: "var(--color-cartao)" }}
            onMouseEnter={(e) => mostrar(e, eixos[i].nome, rotuloAtual, eixos[i].atual)}
            onMouseLeave={() => setDica(null)}
          />
        ))}
        {pontosAnterior.map((p, i) => (
          <circle
            key={`${eixos[i].chave}-anterior`}
            cx={p.x}
            cy={p.y}
            r={4}
            strokeWidth={2}
            style={{ fill: "var(--grafico-comparacao)", stroke: "var(--color-cartao)" }}
            onMouseEnter={(e) => mostrar(e, eixos[i].nome, rotuloAnterior, eixos[i].anterior)}
            onMouseLeave={() => setDica(null)}
          />
        ))}
      </svg>

      {dica && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-dica px-2.5 py-1.5 text-rotulo text-sobre-dica shadow-[0_6px_20px_var(--sombra-forte)]"
          style={{ left: dica.x, top: dica.y - 6 }}
        >
          <p className="font-semibold">{dica.eixo}</p>
          <p>
            {dica.serie}: {dica.valor}
          </p>
        </div>
      )}
    </div>
  );
}
