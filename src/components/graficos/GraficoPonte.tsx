import { escalaLinear, marcasDoEixo } from "./escala";
import { AnelDeFoco, AreaDoGrafico, EixoX, EixoY, Grade, RotuloDireto } from "./partes";
import { COR, VAO_DO_ROTULO, comSinal, larguraDoTexto, quebrarEmLinhas } from "./tema";
import { useLargura } from "./useLargura";
import { useMarcasNavegaveis } from "./useMarcasNavegaveis";

export interface DegrauDaPonte {
  chave: string;
  /** Embaixo da barra: "Vendido", "Custo das peças e serviços", "Aluguel", "Sobrou". */
  rotulo: string;
  /** O valor escrito em cima da barra. Nos "menos", o tamanho do desconto (com ou sem sinal: sai "−" sempre). */
  valor: number;
  /** `total` = sai do zero (Vendido, Sobra das OS, Sobrou); `menos` = o que foi descontado. */
  tipo: "total" | "menos";
  /** Onde a barra começa e termina, em R$ (vêm prontos de `src/schemas/`). */
  de: number;
  ate: number;
}

const ALTURA = 264;
const TOPO_BASE = 28;
const ELEVACAO = 16; // quanto sobe o valor de uma barra sim, outra não, quando as faixas são estreitas
const BASE_2_LINHAS = 44;
const BASE_3_LINHAS = 58;

/**
 * "Quanto sobrou de verdade?" (#1086, bloco Do vendido ao que sobrou): a ponte
 * (cascata) Vendido → − custo → Sobra das OS → − despesas → Sobrou. Os totais
 * saem do zero; os "menos" (cinza claro) descem do ponto onde o anterior
 * parou, com um conector fino entre eles. O valor vai escrito em cima de cada
 * barra. O último total ("Sobrou") é laranja; negativo, vermelho com "−" e ▼.
 *
 * Só desenho: os degraus (e os `de`/`ate` de cada um) chegam prontos.
 */
export function GraficoPonte({
  degraus,
  formatarCurto,
}: {
  degraus: readonly DegrauDaPonte[];
  formatarCurto: (valor: number) => string;
}) {
  const [largura, medidor] = useLargura();
  const marcas = useMarcasNavegaveis(degraus.length);

  const apertado = largura > 0 && degraus.length > 1 && (largura - 80) / degraus.length < 96;
  const TOPO = apertado ? TOPO_BASE + ELEVACAO : TOPO_BASE;

  const extremos = degraus.flatMap((d) => [d.de, d.ate]);
  const eixo = marcasDoEixo(Math.min(0, ...extremos), Math.max(0, ...extremos), 4);
  const esquerda = Math.max(...eixo.map((m) => larguraDoTexto(formatarCurto(m)))) + 12;
  const x0 = esquerda;
  const x1 = Math.max(x0 + 80, largura - 8);
  const yBase = ALTURA - (apertado ? BASE_3_LINHAS : BASE_2_LINHAS);
  // Com barra abaixo do zero, o valor dela vai escrito embaixo: reserva o lugar.
  const folgaEmbaixo = eixo[0] < 0 ? 24 : 8;
  const y = escalaLinear([eixo[0], eixo[eixo.length - 1]], [yBase - folgaEmbaixo, TOPO]);

  const n = Math.max(1, degraus.length);
  const banda = (x1 - x0) / n;
  const larguraDaBarra = Math.max(8, Math.min(64, banda * 0.64));
  const centro = (i: number) => x0 + banda * i + banda / 2;
  const ultimoTotal = degraus.reduce((achado, d, i) => (d.tipo === "total" ? i : achado), -1);

  const textoDoValor = (d: DegrauDaPonte, i: number) => {
    if (d.tipo === "menos") return `− ${formatarCurto(Math.abs(d.valor))}`;
    if (d.valor < 0) return `${comSinal(d.valor, formatarCurto)}${i === ultimoTotal ? " ▼" : ""}`;
    return formatarCurto(d.valor);
  };
  const corDaBarra = (d: DegrauDaPonte, i: number) => {
    if (i === ultimoTotal) return d.valor < 0 ? COR.perigo : COR.destaque;
    return d.tipo === "total" ? COR.neutroForte : COR.neutro;
  };

  // Onde cada valor é escrito (em cima da barra). Com faixas estreitas, dois valores vizinhos
  // podiam se tocar: da esquerda pra direita, o que encostaria no anterior sobe uma linha.
  const yDoValor: number[] = [];
  let anterior: { direita: number; y: number } | null = null;
  degraus.forEach((d, i) => {
    let yv = y(Math.max(d.de, d.ate)) - VAO_DO_ROTULO;
    const meia = larguraDoTexto(textoDoValor(d, i)) / 2;
    const esquerdaDoTexto = centro(i) - meia;
    if (apertado && anterior && esquerdaDoTexto < anterior.direita + 6 && Math.abs(yv - anterior.y) < 15) {
      yv = anterior.y - ELEVACAO;
    }
    yDoValor.push(yv);
    anterior = { direita: centro(i) + meia, y: yv };
  });

  const ativa = marcas.ativa !== null ? degraus[marcas.ativa] : undefined;
  const dica =
    ativa && marcas.ativa !== null
      ? {
          x: centro(marcas.ativa),
          y: y(Math.max(ativa.de, ativa.ate)),
          texto: `${ativa.rotulo}: ${textoDoValor(ativa, marcas.ativa)}`,
        }
      : null;

  return (
    <AreaDoGrafico medidor={medidor} largura={largura} altura={ALTURA} dica={dica}>
      <Grade marcas={eixo} y={y} x0={x0} x1={x1} />
      <EixoY marcas={eixo} y={y} x={x0} formatar={formatarCurto} />

      {/* Os conectores: do fim de uma barra ao começo da próxima, na altura onde ela parou. */}
      {degraus.slice(0, -1).map((d, i) => (
        <line
          key={`conector-${d.chave}`}
          aria-hidden="true"
          data-conector
          x1={centro(i) + larguraDaBarra / 2}
          x2={centro(i + 1) - larguraDaBarra / 2}
          y1={y(d.ate)}
          y2={y(d.ate)}
          style={{ stroke: COR.neutroForte }}
          strokeOpacity={0.6}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      ))}

      {degraus.map((d, i) => {
        const topo = y(Math.max(d.de, d.ate));
        const fundo = y(Math.min(d.de, d.ate));
        const xc = centro(i);
        const negativo = d.tipo === "total" && d.valor < 0;
        const corDoTexto = i === ultimoTotal ? (negativo ? COR.perigo : COR.destaqueTexto) : COR.texto;
        return (
          <g
            key={d.chave}
            data-degrau={d.tipo}
            {...marcas.propsDaMarca(i, `${d.rotulo}: ${textoDoValor(d, i)}`)}
          >
            <rect x={x0 + banda * i} y={TOPO - 20} width={banda} height={yBase - TOPO + 20} fill="transparent" />
            <rect
              x={xc - larguraDaBarra / 2}
              y={topo}
              width={larguraDaBarra}
              height={Math.max(1, fundo - topo)}
              rx={3}
              style={{ fill: corDaBarra(d, i) }}
              fillOpacity={d.tipo === "menos" && marcas.ativa !== i ? 0.6 : 1}
            />
            {negativo ? (
              <RotuloDireto x={xc} y={fundo + VAO_DO_ROTULO} ancora="middle" base="hanging" cor={corDoTexto} forte>
                {textoDoValor(d, i)}
              </RotuloDireto>
            ) : (
              <RotuloDireto x={xc} y={yDoValor[i]} ancora="middle" base="auto" cor={corDoTexto} forte={i === ultimoTotal}>
                {textoDoValor(d, i)}
              </RotuloDireto>
            )}
            {marcas.foco === i && (
              <AnelDeFoco x={xc - larguraDaBarra / 2} y={topo} largura={larguraDaBarra} altura={Math.max(1, fundo - topo)} />
            )}
          </g>
        );
      })}

      <EixoX
        y={yBase + 4}
        rotulos={degraus.map((d, i) => ({
          chave: d.chave,
          x: centro(i),
          linhas: quebrarEmLinhas(d.rotulo, banda / 6.5, apertado ? 3 : 2),
          destaque: i === ultimoTotal && d.valor >= 0,
        }))}
      />
    </AreaDoGrafico>
  );
}
