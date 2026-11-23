import { escalaLinear, marcasDoEixo } from "./escala";
import { AnelDeFoco, AreaDoGrafico, EixoX, EixoY, Grade, LinhaDeReferencia, RotuloDireto } from "./partes";
import { COR, VAO_DO_ROTULO, larguraDoTexto } from "./tema";
import { useLargura } from "./useLargura";
import { useMarcasNavegaveis } from "./useMarcasNavegaveis";

export interface ColunaDoDia {
  chave: string;
  /** Embaixo da coluna, 1ª linha: o dia da semana ("seg"), ou o mês ("nov"). */
  rotulo: string;
  /** 2ª linha: o dia ("17"). */
  sub?: string;
  /** O vendido do dia. `null` ou 0 = dia sem venda: aparece, com "—". */
  valor: number | null;
  /** O texto da dica; sem dizer, "seg 17: R$ 2,6 mil". */
  dica?: string;
}

const ALTURA = 232;
const TOPO = 24;
const BASE_DOS_ROTULOS = 40;

/**
 * "Hoje está bom?" (#1086, bloco Dia a dia): uma coluna por dia, do zero pra
 * cima. O dia sem venda **aparece** (com "—"), não some; a coluna de hoje
 * (`destacar`) é laranja e o resto cinza; a média tracejada tem o valor
 * escrito à direita, fora das barras.
 *
 * Só desenho: os valores, a média e os textos chegam prontos.
 */
export function GraficoColunasPorDia({
  colunas,
  destacar,
  media,
  formatarCurto,
}: {
  colunas: readonly ColunaDoDia[];
  /** O índice da coluna em laranja (hoje). */
  destacar?: number;
  /** A média (do dia aberto), com o nome dela ("média"). Sem isto, sem linha. */
  media?: { valor: number; rotulo?: string } | null;
  /** "R$ 2,6 mil": o valor curto, pronto. */
  formatarCurto: (valor: number) => string;
}) {
  const [largura, medidor] = useLargura();
  const marcas = useMarcasNavegaveis(colunas.length);

  const valores = colunas.map((c) => c.valor ?? 0);
  const eixo = marcasDoEixo(Math.min(0, ...valores), Math.max(0, ...valores, media?.valor ?? 0), 4);
  const esquerda = Math.max(...eixo.map((m) => larguraDoTexto(formatarCurto(m)))) + 12;
  const rotuloDaMedia = media ? [media.rotulo ?? "média", formatarCurto(media.valor)] : null;
  const direita = rotuloDaMedia ? Math.max(...rotuloDaMedia.map(larguraDoTexto)) + 12 : 8;
  const x0 = esquerda;
  const x1 = Math.max(x0 + 40, largura - direita);
  const yBase = ALTURA - BASE_DOS_ROTULOS;
  const y = escalaLinear([eixo[0], eixo[eixo.length - 1]], [yBase, TOPO]);

  const n = Math.max(1, colunas.length);
  const banda = (x1 - x0) / n;
  const larguraDaColuna = Math.max(2, Math.min(40, banda * 0.62));
  const centro = (i: number) => x0 + banda * i + banda / 2;
  // Rótulo embaixo só onde cabe (um a cada `passo`); o de hoje sempre.
  const passo = Math.max(1, Math.ceil(34 / banda));
  const mostraRotulo = (i: number) =>
    i === destacar || (i % passo === 0 && (destacar === undefined || Math.abs(i - destacar) >= passo));

  const textoDaDica = (c: ColunaDoDia) =>
    c.dica ?? `${c.rotulo}${c.sub ? ` ${c.sub}` : ""}: ${c.valor ? formatarCurto(c.valor) : "sem venda"}`;

  const ativa = marcas.ativa !== null ? colunas[marcas.ativa] : undefined;
  const dica =
    ativa && marcas.ativa !== null
      ? { x: centro(marcas.ativa), y: y(Math.max(0, ativa.valor ?? 0)), texto: textoDaDica(ativa) }
      : null;

  return (
    <AreaDoGrafico medidor={medidor} largura={largura} altura={ALTURA} dica={dica}>
      <Grade marcas={eixo} y={y} x0={x0} x1={x1} />
      <EixoY marcas={eixo} y={y} x={x0} formatar={formatarCurto} />

      {colunas.map((c, i) => {
        const valor = c.valor ?? 0;
        const vazio = !c.valor;
        const ehHoje = i === destacar;
        const topo = Math.min(y(valor), y(0));
        const altura = Math.abs(y(valor) - y(0));
        const xc = centro(i);
        return (
          <g key={c.chave} {...marcas.propsDaMarca(i, textoDaDica(c))}>
            {/* A área de passar o mouse é a faixa inteira do dia, não só a coluna. */}
            <rect x={x0 + banda * i} y={TOPO} width={banda} height={yBase - TOPO} fill="transparent" />
            {vazio ? (
              <RotuloDireto x={xc} y={y(0) - VAO_DO_ROTULO} ancora="middle" base="auto" cor={COR.texto2}>
                —
              </RotuloDireto>
            ) : (
              <rect
                x={xc - larguraDaColuna / 2}
                y={topo}
                width={larguraDaColuna}
                height={Math.max(1, altura)}
                rx={Math.min(3, larguraDaColuna / 4)}
                style={{ fill: ehHoje ? COR.destaque : COR.neutro }}
                fillOpacity={ehHoje || marcas.ativa === i ? 1 : 0.55}
              />
            )}
            {ehHoje && !vazio && (
              <RotuloDireto x={xc} y={topo - VAO_DO_ROTULO} ancora="middle" base="auto" cor={COR.destaqueTexto} forte>
                {formatarCurto(valor)}
              </RotuloDireto>
            )}
            {marcas.foco === i && (
              <AnelDeFoco
                x={xc - Math.max(larguraDaColuna, 12) / 2}
                y={vazio ? y(0) - 18 : topo}
                largura={Math.max(larguraDaColuna, 12)}
                altura={vazio ? 18 : Math.max(1, altura)}
              />
            )}
          </g>
        );
      })}

      {media && rotuloDaMedia && (
        <LinhaDeReferencia x0={x0} x1={x1} y={y(media.valor)} rotulo={rotuloDaMedia} />
      )}

      <EixoX
        y={yBase + 8}
        rotulos={colunas.flatMap((c, i) =>
          mostraRotulo(i)
            ? [{ chave: c.chave, x: centro(i), linhas: c.sub ? [c.rotulo, c.sub] : [c.rotulo], destaque: i === destacar }]
            : [],
        )}
      />
    </AreaDoGrafico>
  );
}
