import { useId } from "react";

/**
 * O fio de gráfico dos cartões de número do Início (#990, tarefa 4): uma
 * linha pequena, sem eixo, com a área embaixo esmaecida e a ponta marcada. É
 * enfeite que informa a tendência de relance; o número do cartão é quem diz o
 * valor, por isso o fio é escondido de leitor de tela.
 *
 * Recebe os valores já prontos (um por dia, de `schemas/serieDoMes.ts`):
 * **conta nenhuma é feita aqui**, só o desenho. Com menos de 2 pontos não
 * desenha nada (quem chama decide quando mostrar).
 *
 * O movimento (tarefa 5): a linha é desenhada da esquerda pra direita em 0,9 s,
 * só com CSS (`stroke-dashoffset`; as classes `fio-*` estão no bloco "tarefa 5:
 * o movimento" do `globals.css`). `pathLength={1}` faz o traço medir 1 em
 * qualquer tamanho de fio. Sem animação (ou com "reduzir movimento"), o fio
 * aparece inteiro.
 *
 * A cor é a do laranja de letra do tema (`text-acao-clara`, que no tema claro
 * é a versão mais escura), pra aparecer nos dois temas.
 */

const LARGURA = 120;
const ALTURA = 44;
const MARGEM = 4;

/** Os pontos (x, y) do fio, com o menor valor embaixo e o maior em cima. */
function pontosDoFio(valores: readonly number[]): { x: number; y: number }[] {
  const menor = Math.min(...valores);
  const maior = Math.max(...valores);
  const faixa = maior - menor;
  const passo = valores.length > 1 ? (LARGURA - MARGEM * 2) / (valores.length - 1) : 0;
  return valores.map((valor, i) => ({
    x: MARGEM + i * passo,
    // Tudo igual: uma linha reta no meio, não colada na borda.
    y: faixa === 0 ? ALTURA / 2 : MARGEM + (1 - (valor - menor) / faixa) * (ALTURA - MARGEM * 2),
  }));
}

export function FioDeGrafico({
  valores,
  className = "",
}: {
  valores: readonly number[];
  className?: string;
}) {
  const idDoDegrade = useId();
  if (valores.length < 2) return null;

  const pontos = pontosDoFio(valores);
  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const ultimo = pontos[pontos.length - 1];
  const area = `${linha} L${ultimo.x.toFixed(1)} ${ALTURA} L${pontos[0].x.toFixed(1)} ${ALTURA} Z`;

  return (
    <svg
      data-fio-de-grafico
      aria-hidden="true"
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      className={`text-acao-clara ${className}`.trim()}
    >
      <defs>
        <linearGradient id={idDoDegrade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.32" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="fio-area" d={area} fill={`url(#${idDoDegrade})`} />
      <path
        className="fio-linha"
        pathLength={1}
        d={linha}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="fio-ponta" cx={ultimo.x} cy={ultimo.y} r="3.2" fill="currentColor" />
    </svg>
  );
}
