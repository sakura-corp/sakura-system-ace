import { caminhoReto, escalaLinear, marcasDoEixo } from "./escala";
import { AnelDeFoco, AreaDoGrafico, EixoX, EixoY, Grade, RotuloDireto } from "./partes";
import { COR, VAO_DO_ROTULO, larguraDoTexto } from "./tema";
import { useLargura } from "./useLargura";
import { useMarcasNavegaveis } from "./useMarcasNavegaveis";

const ALTURA = 248;
const TOPO = 24;
const BASE = 48; // os dias e o nome do eixo

/**
 * "Estou melhor que o mês passado?" (#1086, bloco O mês até hoje): o vendido
 * somando dia a dia, em **linha reta** laranja, contra o mês anterior inteiro
 * em cinza. O nome de cada mês vai escrito na ponta da linha dele (sem
 * legenda), e a diferença "no mesmo dia do mês" vem escrita ao lado do ponto
 * de hoje. Sem o mês anterior (`anterior = null`, loja nova), a cinza some.
 *
 * Só desenho: os acumulados e o texto da diferença chegam prontos.
 */
export function GraficoMesAcumulado({
  atual,
  anterior,
  diasNoMes,
  nomeAtual,
  nomeAnterior = "",
  diferenca,
  formatarCurto,
}: {
  /** O vendido somado, um valor por dia, do dia 1 até hoje. */
  atual: readonly number[];
  /** O mês anterior inteiro, somado dia a dia. `null` = some a linha cinza. */
  anterior: readonly number[] | null;
  /** Quantos dias tem o mês (o eixo vai de 1 até aqui). */
  diasNoMes: number;
  /** "Novembro": escrito na ponta da linha laranja. */
  nomeAtual: string;
  /** "Outubro": escrito na ponta da linha cinza. */
  nomeAnterior?: string;
  /** "R$ 2 mil acima": escrito ao lado do ponto de hoje. */
  diferenca?: string;
  formatarCurto: (valor: number) => string;
}) {
  const [largura, medidor] = useLargura();
  const comAnterior = anterior && anterior.length > 0 ? anterior : null;
  const totalDeDias = Math.max(1, diasNoMes, atual.length, comAnterior?.length ?? 0);
  const marcas = useMarcasNavegaveis(Math.max(atual.length, comAnterior?.length ?? 0));

  const todos = [...atual, ...(comAnterior ?? [])];
  const eixo = marcasDoEixo(Math.min(0, ...todos), Math.max(0, ...todos), 4);
  const esquerda = Math.max(...eixo.map((m) => larguraDoTexto(formatarCurto(m)))) + 12;
  const direita = Math.max(larguraDoTexto(nomeAtual), comAnterior ? larguraDoTexto(nomeAnterior) : 0) + 16;
  const x0 = esquerda;
  const x1 = Math.max(x0 + 80, largura - direita);
  const yBase = ALTURA - BASE;
  const x = escalaLinear([1, totalDeDias], [x0, x1]);
  const y = escalaLinear([eixo[0], eixo[eixo.length - 1]], [yBase, TOPO]);

  const pontosAtual = atual.map((v, i) => ({ x: x(i + 1), y: y(v) }));
  const pontosAnterior = comAnterior?.map((v, i) => ({ x: x(i + 1), y: y(v) })) ?? [];
  const hoje = pontosAtual[pontosAtual.length - 1];
  const fimAnterior = pontosAnterior[pontosAnterior.length - 1];

  // Os dois nomes na ponta: se caírem um em cima do outro, afastam.
  let yNomeAtual = hoje?.y ?? 0;
  let yNomeAnterior = fimAnterior?.y ?? 0;
  const nomeAtualNaDireita = hoje ? hoje.x + VAO_DO_ROTULO * 2 + larguraDoTexto(nomeAtual) <= largura : false;
  if (hoje && fimAnterior && nomeAtualNaDireita && Math.abs(hoje.x - fimAnterior.x) < 80) {
    const vao = 16 - Math.abs(yNomeAtual - yNomeAnterior);
    if (vao > 0) {
      const sobe = yNomeAtual <= yNomeAnterior ? -1 : 1;
      yNomeAtual += (sobe * vao) / 2;
      yNomeAnterior -= (sobe * vao) / 2;
    }
  }

  const larguraDaFaixa = (x1 - x0) / Math.max(1, totalDeDias - 1);
  const passoDoEixo = larguraDaFaixa >= 18 ? 1 : 5;
  const diasDoEixo = Array.from({ length: totalDeDias }, (_, i) => i + 1).filter(
    (d) => d === 1 || d === totalDeDias || (d % passoDoEixo === 0 && totalDeDias - d >= 3),
  );

  const textoDaDica = (i: number) => {
    const partes = [`Dia ${i + 1}`];
    if (i < atual.length) partes.push(`${nomeAtual} ${formatarCurto(atual[i])}`);
    if (comAnterior && i < comAnterior.length) partes.push(`${nomeAnterior} ${formatarCurto(comAnterior[i])}`);
    return partes.join(" · ");
  };
  const quantasMarcas = Math.max(atual.length, comAnterior?.length ?? 0);
  const pontoDaMarca = (i: number) => pontosAtual[i] ?? pontosAnterior[i];
  const dica =
    marcas.ativa !== null && pontoDaMarca(marcas.ativa)
      ? { ...pontoDaMarca(marcas.ativa), texto: textoDaDica(marcas.ativa) }
      : null;

  return (
    <AreaDoGrafico medidor={medidor} largura={largura} altura={ALTURA} dica={dica}>
      <Grade marcas={eixo} y={y} x0={x0} x1={x1} />
      <EixoY marcas={eixo} y={y} x={x0} formatar={formatarCurto} />

      {marcas.ativa !== null && pontoDaMarca(marcas.ativa) && (
        <line
          aria-hidden="true"
          x1={pontoDaMarca(marcas.ativa).x}
          x2={pontoDaMarca(marcas.ativa).x}
          y1={TOPO}
          y2={yBase}
          style={{ stroke: COR.eixo }}
        />
      )}

      {pontosAnterior.length > 0 && (
        <path
          data-linha="anterior"
          d={caminhoReto(pontosAnterior)}
          fill="none"
          style={{ stroke: COR.neutro }}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {pontosAtual.length > 0 && (
        <path
          data-linha="atual"
          d={caminhoReto(pontosAtual)}
          fill="none"
          style={{ stroke: COR.destaque }}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {fimAnterior && (
        <RotuloDireto x={fimAnterior.x + VAO_DO_ROTULO * 2} y={yNomeAnterior} cor={COR.texto2}>
          {nomeAnterior}
        </RotuloDireto>
      )}
      {hoje && (
        <>
          <circle cx={hoje.x} cy={hoje.y} r={4.5} style={{ fill: COR.destaque, stroke: COR.fundo }} strokeWidth={2} />
          {nomeAtualNaDireita ? (
            <RotuloDireto x={hoje.x + VAO_DO_ROTULO * 2} y={yNomeAtual} cor={COR.destaqueTexto} forte>
              {nomeAtual}
            </RotuloDireto>
          ) : (
            <RotuloDireto x={hoje.x} y={hoje.y - 12} ancora="end" base="auto" cor={COR.destaqueTexto} forte>
              {nomeAtual}
            </RotuloDireto>
          )}
          {diferenca && (
            // A diferença fica do lado de dentro do gráfico, embaixo do ponto
            // (a linha de hoje sobe da esquerda: embaixo, à esquerda, está livre).
            <RotuloDireto
              x={hoje.x > (x0 + x1) / 2 ? hoje.x - VAO_DO_ROTULO * 2 : hoje.x + VAO_DO_ROTULO * 2}
              y={Math.min(yBase - 8, hoje.y + 20)}
              ancora={hoje.x > (x0 + x1) / 2 ? "end" : "start"}
              cor={COR.texto}
              forte
            >
              {diferenca}
            </RotuloDireto>
          )}
        </>
      )}

      {Array.from({ length: quantasMarcas }, (_, i) => {
        const p = pontoDaMarca(i);
        const xa = x0 + (i === 0 ? 0 : larguraDaFaixa * (i - 0.5));
        const xb = x0 + (i === totalDeDias - 1 ? larguraDaFaixa * i : larguraDaFaixa * (i + 0.5));
        return (
          <g key={i} {...marcas.propsDaMarca(i, textoDaDica(i))}>
            <rect x={xa} y={TOPO} width={Math.max(1, xb - xa)} height={yBase - TOPO} fill="transparent" />
            {marcas.ativa === i && p && (
              <circle cx={p.x} cy={p.y} r={4} style={{ fill: i < atual.length ? COR.destaque : COR.neutro }} />
            )}
            {marcas.foco === i && p && <AnelDeFoco x={p.x - 6} y={p.y - 6} largura={12} altura={12} />}
          </g>
        );
      })}

      <EixoX
        y={yBase + 8}
        rotulos={diasDoEixo.map((d) => ({ chave: String(d), x: x(d), linhas: [String(d)] }))}
        nome="dia do mês"
        xDoNome={x1}
      />
    </AreaDoGrafico>
  );
}
