import type { CurvaABC, LetraABC } from "@/schemas/curvaABC";
import { CORTES_ABC } from "@/schemas/curvaABC";
import { caminhoSuave } from "./curvaSuave";

/**
 * A curva da Curva ABC (Relações → Curva ABC, aprovada pela Sofia em
 * 17/11/2026, #990, no lugar da rosca): quanto do total os itens vão somando,
 * do maior pro menor. As faixas mostram onde termina o A (80%) e o B (95%), e
 * a frase "3 peças = 80,9%" diz o que a curva quer dizer.
 *
 * **Nenhuma conta aqui**: o acumulado de cada linha já vem pronto de
 * `schemas/curvaABC.ts`. As linhas fora da conta (venda zero, custo não
 * informado) não entram na curva, como não entram no acumulado.
 */

const LARGURA = 400;
const ALTURA = 220;
const FOLGA_ESQUERDA = 40;
const FOLGA_DIREITA = 16;
const FOLGA_TOPO = 12;
const FOLGA_BAIXO = 24;
/** Com mais pontos que isto, a curva fica sem as bolinhas (viraria um borrão). */
const PONTOS_COM_BOLINHA = 30;

const COR_DA_LETRA: Record<LetraABC, string> = {
  A: "var(--color-ok)",
  B: "var(--color-atencao)",
  C: "var(--color-texto-3)",
};

export function CurvaAcumulada<T>({
  curva,
  titulo,
  umItem,
  variosItens,
  contagem,
}: {
  curva: CurvaABC<T>;
  titulo: string;
  /** "peça", "serviço", "cliente". */
  umItem: string;
  /** "peças", "serviços", "clientes". */
  variosItens: string;
  contagem: Record<LetraABC, number>;
}) {
  const naConta = curva.linhas.filter((l) => !l.foraDaConta && l.acumulada !== null);
  const larguraUtil = LARGURA - FOLGA_ESQUERDA - FOLGA_DIREITA;
  const alturaUtil = ALTURA - FOLGA_TOPO - FOLGA_BAIXO;
  const xDo = (i: number) => FOLGA_ESQUERDA + (naConta.length === 0 ? 0 : (i / naConta.length) * larguraUtil);
  const yDo = (percentual: number) => FOLGA_TOPO + ((100 - percentual) / 100) * alturaUtil;
  const pontos = [[xDo(0), yDo(0)] as const, ...naConta.map((l, i) => [xDo(i + 1), yDo(l.acumulada ?? 0)] as const)];
  const caminho = caminhoSuave(pontos);
  const quantosA = naConta.filter((l) => l.letra === "A").length;
  const ultimoA = naConta[quantosA - 1];
  const frase =
    ultimoA && ultimoA.acumulada !== null
      ? `${quantosA} ${quantosA === 1 ? umItem : variosItens} = ${ultimoA.acumulada.toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}%`
      : null;
  const comBolinha = naConta.length <= PONTOS_COM_BOLINHA;

  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-rotulo text-texto-2">
        Quanto do total os itens somam, do maior pro menor
      </figcaption>
      <svg
        role="img"
        aria-label={`${titulo}: curva acumulada${frase ? `; ${frase} do total` : ""}`}
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        className="w-full"
      >
        <rect
          x={FOLGA_ESQUERDA}
          y={yDo(CORTES_ABC.A)}
          width={larguraUtil}
          height={yDo(0) - yDo(CORTES_ABC.A)}
          style={{ fill: "var(--color-ok)" }}
          fillOpacity={0.05}
        />
        <rect
          x={FOLGA_ESQUERDA}
          y={yDo(CORTES_ABC.B)}
          width={larguraUtil}
          height={yDo(CORTES_ABC.A) - yDo(CORTES_ABC.B)}
          style={{ fill: "var(--color-atencao)" }}
          fillOpacity={0.06}
        />
        {[CORTES_ABC.A, CORTES_ABC.B].map((corte) => (
          <g key={corte}>
            <line
              x1={FOLGA_ESQUERDA}
              x2={LARGURA - FOLGA_DIREITA}
              y1={yDo(corte)}
              y2={yDo(corte)}
              style={{ stroke: "var(--color-texto-2)" }}
              strokeOpacity={0.6}
              strokeDasharray="3 4"
            />
            <text x={FOLGA_ESQUERDA - 8} y={yDo(corte) + 4} textAnchor="end" fontSize={11} style={{ fill: "var(--color-texto-2)" }}>
              {corte}%
            </text>
          </g>
        ))}
        <text x={FOLGA_ESQUERDA - 8} y={yDo(0) + 4} textAnchor="end" fontSize={11} style={{ fill: "var(--color-texto-2)" }}>
          0
        </text>
        <line
          x1={FOLGA_ESQUERDA}
          x2={LARGURA - FOLGA_DIREITA}
          y1={yDo(0)}
          y2={yDo(0)}
          style={{ stroke: "var(--grafico-eixo)" }}
          strokeOpacity={0.5}
        />
        <text x={LARGURA - FOLGA_DIREITA - 4} y={yDo(CORTES_ABC.A) + 14} textAnchor="end" fontSize={11} fontWeight={600} style={{ fill: COR_DA_LETRA.A }}>
          A
        </text>
        <text x={LARGURA - FOLGA_DIREITA - 4} y={yDo(CORTES_ABC.B) + 11} textAnchor="end" fontSize={11} fontWeight={600} style={{ fill: COR_DA_LETRA.B }}>
          B
        </text>

        <path
          d={`${caminho} L${pontos[pontos.length - 1][0]} ${yDo(0)} L${pontos[0][0]} ${yDo(0)} Z`}
          style={{ fill: "var(--color-texto)" }}
          fillOpacity={0.06}
        />
        <path d={caminho} fill="none" style={{ stroke: "var(--color-texto-2)" }} strokeWidth={2} strokeLinecap="round" />
        {comBolinha &&
          naConta.map((l, i) => (
            <circle
              key={i}
              cx={xDo(i + 1)}
              cy={yDo(l.acumulada ?? 0)}
              r={4.5}
              style={{ fill: COR_DA_LETRA[l.letra], stroke: "var(--color-cartao)" }}
              strokeWidth={2}
            />
          ))}
        {frase && ultimoA && (
          <text
            x={Math.min(xDo(quantosA) + 10, LARGURA - FOLGA_DIREITA - 110)}
            y={yDo(ultimoA.acumulada ?? 0) + 20}
            fontSize={12}
            fontWeight={600}
            style={{ fill: "var(--color-texto)" }}
          >
            {frase}
          </text>
        )}
      </svg>
      {/* O que a rosca de antes mostrava: quantos itens em cada curva (palavra e cor juntas). */}
      <p className="mt-2 flex flex-wrap gap-x-4 text-rotulo text-texto-2">
        {(["A", "B", "C"] as const).map((letra) => (
          <span key={letra} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: COR_DA_LETRA[letra] }} />
            Curva {letra}: {contagem[letra]} {contagem[letra] === 1 ? "item" : "itens"}
          </span>
        ))}
      </p>
    </figure>
  );
}
