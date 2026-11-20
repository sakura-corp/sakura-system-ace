import { useState } from "react";
import type { PontoDoLucro } from "@/schemas/lucratividade";
import { useLargura } from "./useLargura";

/**
 * "Onde está o lucro" (Relações → Lucratividade, aprovado pela Sofia em
 * 17/11/2026, #990): uma bolha por peça ou serviço. Mais à direita, vende
 * mais (receita); mais alto, sobra mais de cada venda (margem %); bolha
 * maior, mais lucro em reais. A linha tracejada é a margem média da loja.
 *
 * Mostra o que a tabela sozinha esconde: o que vende pouco mas tem margem alta
 * ("vale oferecer mais") e o que vende muito mas sobra pouco ("conferir o
 * preço"). A de mais lucro em reais é a laranja (uma cor de destaque); os
 * nomes vão escritos nas maiores, e o resto aparece passando o mouse.
 *
 * **Nenhuma conta de dinheiro é feita aqui**: os pontos chegam prontos de
 * `pontosDoLucro` (`schemas/lucratividade.ts`), já limitados a 12.
 */

const ALTURA = 340;
const FOLGA_ESQUERDA = 48;
const FOLGA_DIREITA = 24;
const FOLGA_TOPO = 24;
const FOLGA_BAIXO = 32;
const RAIO_MIN = 8;
const RAIO_MAX = 34;
/** Quantas bolhas ganham o nome escrito (as de mais lucro); as outras, só no mouse. */
const NOMES_ESCRITOS = 6;

function arredondarTeto(valor: number): number {
  if (valor <= 0) return 1;
  const grandeza = 10 ** Math.floor(Math.log10(valor));
  return Math.ceil(valor / grandeza) * grandeza;
}

interface Dica {
  x: number;
  y: number;
  ponto: PontoDoLucro;
}

export function GraficoDeBolhas({
  pontos,
  margemMedia,
  formatarValor,
  formatarPercentual,
}: {
  pontos: readonly PontoDoLucro[];
  /** A margem % da loja no período (a linha tracejada); `null` sem venda. */
  margemMedia: number | null;
  formatarValor: (valor: number) => string;
  formatarPercentual: (valor: number) => string;
}) {
  const [largura, raizRef] = useLargura();
  const [dica, setDica] = useState<Dica | null>(null);

  if (pontos.length === 0) {
    return (
      <div ref={raizRef}>
        <p className="text-corpo text-texto-2">Sem peça ou serviço com custo informado nesse período.</p>
      </div>
    );
  }

  const tetoX = arredondarTeto(Math.max(...pontos.map((p) => p.receita)));
  // O eixo da margem vai de 0 a 100%, e desce abaixo de zero só se alguma der prejuízo.
  const pisoY = Math.min(0, Math.floor(Math.min(...pontos.map((p) => p.percentual)) / 20) * 20);
  const tetoY = Math.max(20, Math.ceil(Math.max(...pontos.map((p) => p.percentual)) / 20) * 20);
  const larguraUtil = largura - FOLGA_ESQUERDA - FOLGA_DIREITA;
  const alturaUtil = ALTURA - FOLGA_TOPO - FOLGA_BAIXO;
  const xDo = (receita: number) => FOLGA_ESQUERDA + (receita / tetoX) * larguraUtil;
  const yDo = (percentual: number) => FOLGA_TOPO + ((tetoY - percentual) / (tetoY - pisoY)) * alturaUtil;
  // A área da bolha acompanha o peso (a raiz), senão a maior engole as outras.
  const raioDo = (p: PontoDoLucro) => RAIO_MIN + Math.sqrt(p.peso) * (RAIO_MAX - RAIO_MIN);
  const marcasY: number[] = [];
  for (let v = pisoY; v <= tetoY; v += 20) marcasY.push(v);
  const marcasX = [0, 0.25, 0.5, 0.75, 1].map((f) => tetoX * f);
  const yMedia = margemMedia === null ? null : yDo(Math.min(tetoY, Math.max(pisoY, margemMedia)));
  const meioX = xDo(tetoX / 2);
  // As grandes desenhadas primeiro e as pequenas por cima (todas com
  // transparência), pra nenhuma ficar escondida atrás de outra.
  const ordem = [...pontos].sort((a, b) => b.peso - a.peso);
  const destaque = pontos[0];
  // O nome vai escrito nas de mais lucro, mas só onde cabe: um nome por cima
  // de outro não se lê. Quem fica sem nome aparece passando o mouse.
  const cortar = (texto: string) => (texto.length > 28 ? `${texto.slice(0, 27)}…` : texto);
  // As bolhas também ocupam lugar: o nome de uma não pode cobrir outra.
  const caixaDaBolha = (p: PontoDoLucro) => {
    const r = raioDo(p);
    return { x0: xDo(p.receita) - r, x1: xDo(p.receita) + r, y0: yDo(p.percentual) - r, y1: yDo(p.percentual) + r };
  };
  const ocupados: { x0: number; x1: number; y0: number; y1: number; dono?: PontoDoLucro }[] = pontos.map((p) => ({
    ...caixaDaBolha(p),
    dono: p,
  }));
  const comNome = new Set<PontoDoLucro>();
  for (const p of ordem.slice(0, NOMES_ESCRITOS)) {
    const cx = xDo(p.receita);
    const cy = yDo(p.percentual);
    const r = raioDo(p);
    const larguraDoNome = Math.max(cortar(p.descricao).length, 18) * 6.6;
    const aDireita = cx < largura * 0.6;
    const caixa = aDireita
      ? { x0: cx + r + 4, x1: cx + r + 12 + larguraDoNome, y0: cy - 16, y1: cy + 20 }
      : { x0: cx - r - 12 - larguraDoNome, x1: cx - r - 4, y0: cy - 16, y1: cy + 20 };
    const bate = ocupados.some(
      (o) => o.dono !== p && caixa.x0 < o.x1 && caixa.x1 > o.x0 && caixa.y0 < o.y1 && caixa.y1 > o.y0,
    );
    if (!bate) {
      ocupados.push(caixa);
      comNome.add(p);
    }
  }

  return (
    <div ref={raizRef} className="relative">
      <svg
        role="img"
        aria-label={`Onde está o lucro: ${pontos
          .slice(0, 3)
          .map((p) => `${p.descricao}, ${formatarValor(p.margem)} de margem (${formatarPercentual(p.percentual)})`)
          .join("; ")}`}
        viewBox={`0 0 ${largura} ${ALTURA}`}
        className="w-full overflow-visible"
        style={{ height: ALTURA }}
      >
        {yMedia !== null && (
          <rect
            x={FOLGA_ESQUERDA}
            y={FOLGA_TOPO}
            width={meioX - FOLGA_ESQUERDA}
            height={Math.max(0, yMedia - FOLGA_TOPO)}
            style={{ fill: "var(--color-ok)" }}
            fillOpacity={0.05}
          />
        )}
        {marcasY.map((v) => (
          <g key={v}>
            <line
              x1={FOLGA_ESQUERDA}
              x2={largura - FOLGA_DIREITA}
              y1={yDo(v)}
              y2={yDo(v)}
              style={{ stroke: "var(--grafico-grade)" }}
              strokeOpacity={v === 0 ? 1 : 0.5}
            />
            <text x={FOLGA_ESQUERDA - 10} y={yDo(v) + 4} textAnchor="end" fontSize={11} style={{ fill: "var(--color-texto-2)" }}>
              {v}%
            </text>
          </g>
        ))}
        {marcasX.map((v, i) => (
          <text key={i} x={xDo(v)} y={ALTURA - 8} textAnchor="middle" fontSize={11} style={{ fill: "var(--color-texto-2)" }}>
            {v === 0 ? "0" : formatarValor(v).replace(/,00$/, "")}
          </text>
        ))}
        <line x1={meioX} x2={meioX} y1={FOLGA_TOPO} y2={ALTURA - FOLGA_BAIXO} style={{ stroke: "var(--grafico-grade)" }} strokeOpacity={0.5} />
        {yMedia !== null && margemMedia !== null && (
          <>
            <line
              x1={FOLGA_ESQUERDA}
              x2={largura - FOLGA_DIREITA}
              y1={yMedia}
              y2={yMedia}
              style={{ stroke: "var(--color-texto-2)" }}
              strokeDasharray="3 4"
            />
            <text x={largura - FOLGA_DIREITA} y={yMedia - 8} textAnchor="end" fontSize={11} style={{ fill: "var(--color-texto-2)" }}>
              média da loja · {formatarPercentual(margemMedia)}
            </text>
            <text x={FOLGA_ESQUERDA + 16} y={yMedia - 12} fontSize={12} fontWeight={600} style={{ fill: "var(--color-ok)" }}>
              Margem alta, vende pouco · vale oferecer mais
            </text>
          </>
        )}
        <text
          x={largura - FOLGA_DIREITA - 8}
          y={ALTURA - FOLGA_BAIXO - 10}
          textAnchor="end"
          fontSize={12}
          fontWeight={600}
          style={{ fill: "var(--color-texto-2)" }}
        >
          Vende muito, sobra menos · conferir o preço
        </text>

        {ordem.map((p, i) => {
          const cx = xDo(p.receita);
          const cy = yDo(p.percentual);
          const r = raioDo(p);
          const ehDestaque = p === destaque;
          const prejuizo = p.margem < 0;
          const cor = prejuizo ? "var(--color-perigo)" : ehDestaque ? "var(--color-acao)" : "var(--color-texto)";
          // O nome vai à direita da bolha, ou à esquerda quando ela está na metade de lá.
          const aDireita = cx < largura * 0.6;
          return (
            <g
              // Duas linhas podem ter o mesmo nome (peça do cadastro e avulsa): a posição desempata.
              key={`${i}:${p.descricao}`}
              data-bolha={p.descricao}
              onMouseEnter={() => setDica({ x: cx, y: cy - r, ponto: p })}
              onMouseLeave={() => setDica(null)}
            >
              <circle
                cx={cx}
                cy={cy}
                r={r}
                style={{ fill: cor, stroke: cor }}
                fillOpacity={ehDestaque || prejuizo ? 0.3 : 0.1}
                strokeOpacity={ehDestaque || prejuizo ? 1 : 0.4}
                strokeWidth={1.5}
              />
              {comNome.has(p) && (
                <>
                  <text
                    x={aDireita ? cx + r + 8 : cx - r - 8}
                    y={cy - 2}
                    textAnchor={aDireita ? "start" : "end"}
                    fontSize={12}
                    fontWeight={600}
                    style={{ fill: "var(--color-texto)" }}
                  >
                    {cortar(p.descricao)}
                  </text>
                  <text
                    x={aDireita ? cx + r + 8 : cx - r - 8}
                    y={cy + 14}
                    textAnchor={aDireita ? "start" : "end"}
                    fontSize={12}
                    style={{ fill: ehDestaque ? "var(--color-acao-clara)" : prejuizo ? "var(--color-perigo)" : "var(--color-texto-2)" }}
                  >
                    {formatarValor(p.margem)} · {formatarPercentual(p.percentual)}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {dica && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-dica px-2.5 py-1.5 text-rotulo text-sobre-dica shadow-[0_6px_20px_var(--sombra-forte)]"
          style={{ left: dica.x, top: dica.y - 6 }}
        >
          <p className="font-semibold">{dica.ponto.descricao}</p>
          <p>Vendeu {formatarValor(dica.ponto.receita)} ({dica.ponto.quantidade} un.)</p>
          <p>
            Sobrou {formatarValor(dica.ponto.margem)} · {formatarPercentual(dica.ponto.percentual)}
          </p>
        </div>
      )}
    </div>
  );
}
