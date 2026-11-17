import { useId, useState, type ReactNode } from "react";
import { caminhoSuave } from "./curvaSuave";
import { useLargura } from "./useLargura";

/**
 * O gráfico de Relações → Gráficos no visual novo (aprovado pela Sofia em
 * 17/11/2026, #990, depois de recusar as barras): **uma linha curva por
 * série**, uma embaixo da outra, todas na **mesma escala** e com os dias
 * alinhados. Assim dá pra comparar sem cruzar três linhas no mesmo desenho
 * (a primeira proposta, "muito confusa").
 *
 * - A linha é cinza, com uma sombra leve embaixo; só o **ponto de agora** (o
 *   último) é laranja, com o valor escrito ao lado (uma cor de destaque).
 * - Abaixo de zero (prejuízo) a linha fica vermelha e o valor vem escrito: a
 *   cor sozinha não avisa (regra 4). O pedaço negativo tem altura limitada,
 *   pra um mês de folha e aluguel não achatar o resto.
 * - Passar o mouse num dia mostra a `dica` com o valor daquele dia.
 *
 * **Nenhuma conta de dinheiro é feita aqui**: os valores e os totais chegam
 * prontos (`schemas/graficosVendas.ts`); o desenho só divide pelo maior.
 */

export interface LinhaDoGrafico {
  chave: string;
  nome: string;
  valores: readonly number[];
  /** O que fica à esquerda: o total do período e, se houver, a margem. */
  resumo: ReactNode;
}

const ALTURA_POSITIVA = 104;
const ALTURA_NEGATIVA_MAX = 36;
const FOLGA_TOPO = 24;
const ALTURA_DO_EIXO = 24;

interface Dica {
  x: number;
  y: number;
  categoria: string;
  serie: string;
  valor: string;
}

export function GraficoEmLinhas({
  categorias,
  linhas,
  rotuloDoAtual,
  formatarValor,
  descricao,
}: {
  categorias: readonly string[];
  linhas: readonly LinhaDoGrafico[];
  /** Como chamar o último ponto no eixo ("Hoje"); sem isto, a própria categoria. */
  rotuloDoAtual?: string;
  formatarValor: (valor: number) => string;
  /** O que o gráfico mostra, pro leitor de tela. */
  descricao: string;
}) {
  const id = useId();
  const [larguraMedida, raizRef] = useLargura();
  const [dica, setDica] = useState<Dica | null>(null);

  // A raiz fica sempre montada (mesmo sem dados): o observador de largura liga
  // uma vez só, e se ela trocasse ele nunca ligaria quando os dados chegassem.
  if (categorias.length === 0) {
    return (
      <div ref={raizRef}>
        <p className="text-corpo text-texto-2">Sem dados suficientes pra montar o gráfico ainda.</p>
      </div>
    );
  }

  // A coluna do resumo (200 px) e o espaço entre ela e o desenho (24 px).
  const largura = Math.max(240, larguraMedida - 224);
  const n = categorias.length;
  const coluna = largura / n;
  const xDo = (i: number) => coluna * i + coluna / 2;
  // Mesma escala pra todas as linhas: o maior valor positivo de qualquer uma.
  const teto = Math.max(1, ...linhas.flatMap((l) => l.valores));
  const alturaDo = (valor: number) => (valor / teto) * (ALTURA_POSITIVA - 8);
  const ultimo = n - 1;

  return (
    <div ref={raizRef} className="relative" role="group" aria-label={descricao}>
      {linhas.map((linha) => {
        const temNegativo = linha.valores.some((v) => v < 0);
        const base = FOLGA_TOPO + ALTURA_POSITIVA;
        const altura = base + (temNegativo ? ALTURA_NEGATIVA_MAX + 24 : 4);
        const yDo = (v: number) => (v >= 0 ? base - alturaDo(v) : base + Math.min(ALTURA_NEGATIVA_MAX, alturaDo(-v)));
        const pontos = linha.valores.map((v, i) => [xDo(i), yDo(v)] as const);
        const caminho = caminhoSuave(pontos);
        const idSombra = `${id}-${linha.chave}-sombra`;
        const idCima = `${id}-${linha.chave}-cima`;
        const idBaixo = `${id}-${linha.chave}-baixo`;
        const valorAtual = linha.valores[ultimo] ?? 0;
        const [xAtual, yAtual] = pontos[ultimo];
        return (
          <div
            key={linha.chave}
            data-linha-do-grafico={linha.chave}
            className="grid grid-cols-[200px_1fr] items-center gap-6 border-t border-linha py-5 first:border-t-0 first:pt-0"
          >
            <div className="min-w-0">{linha.resumo}</div>
            <svg
              role="img"
              aria-label={`${linha.nome}: ${formatarValor(valorAtual)} em ${rotuloDoAtual ?? categorias[ultimo]}`}
              viewBox={`0 0 ${largura} ${altura}`}
              className="w-full overflow-visible"
              style={{ height: altura }}
            >
              <defs>
                <linearGradient id={idSombra} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="var(--color-texto)" stopOpacity={0.14} />
                  <stop offset="1" stopColor="var(--color-texto)" stopOpacity={0} />
                </linearGradient>
                <clipPath id={idCima}>
                  <rect x={-8} y={-40} width={largura + 16} height={base + 40 + 2} />
                </clipPath>
                <clipPath id={idBaixo}>
                  <rect x={-8} y={base + 2} width={largura + 16} height={ALTURA_NEGATIVA_MAX + 40} />
                </clipPath>
              </defs>
              <line x1={0} x2={largura} y1={base} y2={base} style={{ stroke: "var(--grafico-eixo)" }} strokeOpacity={0.5} />
              <path
                d={`${caminho} L${xAtual} ${base} L${pontos[0][0]} ${base} Z`}
                fill={`url(#${idSombra})`}
                clipPath={`url(#${idCima})`}
              />
              <path
                d={caminho}
                fill="none"
                style={{ stroke: "var(--color-texto)" }}
                strokeOpacity={0.7}
                strokeWidth={2}
                strokeLinecap="round"
                clipPath={`url(#${idCima})`}
              />
              {temNegativo && (
                <path
                  d={caminho}
                  fill="none"
                  style={{ stroke: "var(--color-perigo)" }}
                  strokeWidth={2}
                  strokeLinecap="round"
                  clipPath={`url(#${idBaixo})`}
                />
              )}
              {linha.valores.map((v, i) =>
                v < 0 && i !== ultimo ? (
                  <g key={i}>
                    <circle cx={pontos[i][0]} cy={pontos[i][1]} r={4} style={{ fill: "var(--color-perigo)" }} />
                    <text
                      x={pontos[i][0]}
                      y={pontos[i][1] + 20}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      style={{ fill: "var(--color-perigo)" }}
                    >
                      ▼ {formatarValor(v)}
                    </text>
                  </g>
                ) : null,
              )}
              {/* O ponto de agora: a única cor forte do gráfico. */}
              <line
                x1={xAtual}
                x2={xAtual}
                y1={yAtual}
                y2={base}
                style={{ stroke: "var(--color-acao)" }}
                strokeOpacity={0.5}
                strokeDasharray="2 3"
              />
              <circle cx={xAtual} cy={yAtual} r={9} style={{ fill: "var(--color-acao)" }} fillOpacity={0.2} />
              <circle
                cx={xAtual}
                cy={yAtual}
                r={4.5}
                style={{ fill: valorAtual < 0 ? "var(--color-perigo)" : "var(--color-acao)" }}
              />
              <text
                x={xAtual - 14}
                y={valorAtual < 0 ? yAtual + 4 : yAtual - 12}
                textAnchor="end"
                fontSize={12}
                fontWeight={600}
                style={{ fill: valorAtual < 0 ? "var(--color-perigo)" : "var(--color-texto)" }}
              >
                {valorAtual < 0 ? "▼ " : ""}
                {formatarValor(valorAtual)}
              </text>
              {/* As faixas invisíveis de cada dia: é nelas que o mouse acha o valor. */}
              {linha.valores.map((v, i) => (
                <rect
                  key={i}
                  data-dia={categorias[i]}
                  x={coluna * i}
                  y={0}
                  width={coluna}
                  height={altura}
                  fill="transparent"
                  onMouseEnter={(e) => {
                    // Medido do próprio desenho, não da linha: assim o espaço em
                    // cima dela e a centralização não deslocam a dica.
                    const desenho = (e.currentTarget as SVGRectElement).ownerSVGElement?.getBoundingClientRect();
                    const raiz = raizRef.current?.getBoundingClientRect();
                    if (!desenho || !raiz) return;
                    setDica({
                      x: desenho.left - raiz.left + pontos[i][0],
                      y: desenho.top - raiz.top + pontos[i][1],
                      categoria: i === ultimo && rotuloDoAtual ? rotuloDoAtual : categorias[i],
                      serie: linha.nome,
                      valor: formatarValor(v),
                    });
                  }}
                  onMouseLeave={() => setDica(null)}
                />
              ))}
            </svg>
          </div>
        );
      })}

      {/* O eixo dos dias, uma vez só, embaixo de todas as linhas. */}
      <div className="grid grid-cols-[200px_1fr] gap-6" aria-hidden="true">
        <span />
        <svg viewBox={`0 0 ${largura} ${ALTURA_DO_EIXO}`} className="w-full overflow-visible" style={{ height: ALTURA_DO_EIXO }}>
          {categorias.map((categoria, i) => (
            <text
              key={categoria}
              x={xDo(i)}
              y={14}
              textAnchor="middle"
              fontSize={11}
              fontWeight={i === ultimo ? 600 : 400}
              style={{ fill: i === ultimo ? "var(--color-texto)" : "var(--color-texto-2)" }}
            >
              {i === ultimo && rotuloDoAtual ? rotuloDoAtual : categoria}
            </text>
          ))}
        </svg>
      </div>

      {dica && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-dica px-2.5 py-1.5 text-rotulo text-sobre-dica shadow-[0_6px_20px_var(--sombra-forte)]"
          style={{ left: dica.x, top: dica.y - 10 }}
        >
          <p className="font-semibold">{dica.categoria}</p>
          <p>
            {dica.serie}: {dica.valor}
          </p>
        </div>
      )}
    </div>
  );
}
