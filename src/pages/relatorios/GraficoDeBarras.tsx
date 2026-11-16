import { useEffect, useRef, useState } from "react";

/**
 * O gráfico de barras de Relações no visual novo (#990, tarefa 13).
 *
 * É o `components/GraficoBarras.tsx` de antes com três diferenças, todas de
 * aparência: as cores vêm do tema (`var(--color-…)`, então trocam sozinhas no
 * claro), a caixinha do mouse é a `dica` (branca com letra preta no escuro), e
 * o desenho ocupa a largura do cartão em vez de ficar num retângulo de 640 de
 * largura no meio. **Nenhuma conta é feita aqui**: os valores chegam prontos.
 * O original continua em `components/` (peça compartilhada, fora desta tarefa).
 */

export interface SerieDeBarras {
  chave: string;
  nome: string;
  /** Uma cor do tema, como `var(--color-info)`. */
  cor: string;
}

interface Dica {
  x: number;
  y: number;
  categoria: string;
  serie: string;
  cor: string;
  valor: string;
}

interface GraficoDeBarrasProps {
  series: SerieDeBarras[];
  categorias: string[];
  valores: Record<string, number[]>;
  formatarValor?: (valor: number) => string;
  /** O que o gráfico mostra, pro leitor de tela ("Vendas, custos e lucro por dia"). */
  descricao: string;
}

const ALTURA = 240;
const LARGURA_INICIAL = 640;
const LARGURA_MINIMA = 420;
const FOLGA_ESQUERDA = 56;
const FOLGA_INFERIOR = 28;
const FOLGA_SUPERIOR = 12;
const FOLGA_DIREITA = 12;
const ESPESSURA_MAX_BARRA = 28;
const GAP_BARRA = 3;

function arredondarTeto(valor: number): number {
  if (valor <= 0) return 1;
  const grandeza = 10 ** Math.floor(Math.log10(valor));
  return Math.ceil(valor / grandeza) * grandeza;
}

/** A largura do elemento, acompanhando a janela. Sem `ResizeObserver` (testes), fica a inicial. */
function useLargura(ref: React.RefObject<HTMLElement | null>): number {
  const [largura, setLargura] = useState(LARGURA_INICIAL);
  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || typeof ResizeObserver === "undefined") return;
    const medir = () => {
      const nova = Math.round(elemento.getBoundingClientRect().width);
      if (nova > 0) setLargura(Math.max(LARGURA_MINIMA, nova));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [ref]);
  return largura;
}

export function GraficoDeBarras({
  series,
  categorias,
  valores,
  formatarValor = (v) => v.toLocaleString("pt-BR"),
  descricao,
}: GraficoDeBarrasProps) {
  const [dica, setDica] = useState<Dica | null>(null);
  const raizRef = useRef<HTMLDivElement>(null);
  const largura = useLargura(raizRef);

  const alturaUtil = ALTURA - FOLGA_SUPERIOR - FOLGA_INFERIOR;
  const larguraUtil = largura - FOLGA_ESQUERDA - FOLGA_DIREITA;

  const maiorValor = Math.max(1, ...series.flatMap((s) => valores[s.chave] ?? []));
  const tetoEixo = arredondarTeto(maiorValor);
  const marcasEixo = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(tetoEixo * f));

  const larguraCategoria = categorias.length > 0 ? larguraUtil / categorias.length : 0;
  const larguraGrupo = larguraCategoria * 0.7;
  const larguraBarra = Math.min(
    ESPESSURA_MAX_BARRA,
    (larguraGrupo - GAP_BARRA * (series.length - 1)) / series.length,
  );

  // A raiz fica sempre montada (mesmo sem dados): o observador de largura liga
  // uma vez só, e se ela sumisse ele nunca ligaria quando os dados chegassem.
  if (categorias.length === 0) {
    return (
      <div ref={raizRef}>
        <p className="text-corpo text-texto-2">Sem dados suficientes pra montar o gráfico ainda.</p>
      </div>
    );
  }

  return (
    <div ref={raizRef} className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <span key={s.chave} className="flex items-center gap-1.5 text-rotulo text-texto-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: s.cor }} />
            {s.nome}
          </span>
        ))}
      </div>

      <svg
        role="img"
        aria-label={descricao}
        viewBox={`0 0 ${largura} ${ALTURA}`}
        className="w-full"
        style={{ height: ALTURA }}
      >
        {marcasEixo.map((marca, i) => {
          const y = FOLGA_SUPERIOR + alturaUtil - (marca / tetoEixo) * alturaUtil;
          return (
            <g key={i}>
              <line
                x1={FOLGA_ESQUERDA}
                x2={largura - FOLGA_DIREITA}
                y1={y}
                y2={y}
                style={{ stroke: "var(--grafico-grade)" }}
                strokeWidth={1}
              />
              <text
                x={FOLGA_ESQUERDA - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-texto-2"
                fontSize={11}
              >
                {marca.toLocaleString("pt-BR")}
              </text>
            </g>
          );
        })}

        <line
          x1={FOLGA_ESQUERDA}
          x2={largura - FOLGA_DIREITA}
          y1={FOLGA_SUPERIOR + alturaUtil}
          y2={FOLGA_SUPERIOR + alturaUtil}
          style={{ stroke: "var(--grafico-eixo)" }}
          strokeWidth={1}
        />

        {categorias.map((categoria, iCategoria) => {
          const larguraDasBarras = larguraBarra * series.length + GAP_BARRA * (series.length - 1);
          const inicioGrupo =
            FOLGA_ESQUERDA +
            iCategoria * larguraCategoria +
            (larguraCategoria - larguraDasBarras) / 2;

          return (
            <g key={categoria}>
              {series.map((s, iSerie) => {
                const valor = valores[s.chave]?.[iCategoria] ?? 0;
                const alturaBarra = (Math.max(valor, 0) / tetoEixo) * alturaUtil;
                const x = inicioGrupo + iSerie * (larguraBarra + GAP_BARRA);
                const y = FOLGA_SUPERIOR + alturaUtil - alturaBarra;

                return (
                  <rect
                    key={s.chave}
                    x={x}
                    y={y}
                    width={Math.max(larguraBarra, 1)}
                    height={Math.max(alturaBarra, 0)}
                    rx={3}
                    style={{ fill: s.cor }}
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
                      const container = raizRef.current?.getBoundingClientRect();
                      if (!container) return;
                      setDica({
                        x: rect.left - container.left + rect.width / 2,
                        y: rect.top - container.top,
                        categoria,
                        serie: s.nome,
                        cor: s.cor,
                        valor: formatarValor(valor),
                      });
                    }}
                    onMouseLeave={() => setDica(null)}
                  />
                );
              })}
              <text
                x={FOLGA_ESQUERDA + iCategoria * larguraCategoria + larguraCategoria / 2}
                y={ALTURA - 10}
                textAnchor="middle"
                className="fill-texto-2"
                fontSize={11}
              >
                {categoria}
              </text>
            </g>
          );
        })}
      </svg>

      {dica && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-dica px-2.5 py-1.5 text-rotulo text-sobre-dica shadow-[0_6px_20px_var(--sombra-forte)]"
          style={{ left: dica.x, top: dica.y - 6 }}
        >
          <p className="font-semibold">{dica.categoria}</p>
          <p className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: dica.cor }} />
            {dica.serie}: {dica.valor}
          </p>
        </div>
      )}
    </div>
  );
}
