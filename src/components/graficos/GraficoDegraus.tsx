import { caminhoEmDegraus, escalaLinear, marcasDoEixo } from "./escala";
import { AnelDeFoco, AreaDoGrafico, EixoX, EixoY, Grade, Legenda, RotuloDireto } from "./partes";
import { COR, VAO_DO_ROTULO, comSinal, larguraDoTexto } from "./tema";
import { useLargura } from "./useLargura";
import { useMarcasNavegaveis } from "./useMarcasNavegaveis";

export interface DiaDoFluxo {
  chave: string;
  /** Embaixo, no eixo: "17/11". */
  rotulo: string;
  /** O que entra no dia (desenhado acima do zero). */
  entra: number;
  /** O que sai no dia, como número positivo (desenhado abaixo do zero). */
  sai: number;
  /** O saldo no fim do dia (já somado a partir do "quanto tenho hoje"). */
  saldo: number;
  /** O texto da dica; sem dizer, "17/11: entra R$ 1 mil · sai R$ 300 · Saldo R$ 4 mil". */
  dica?: string;
}

const ALTURA = 272;
const TOPO = 32;
const BASE = 28;

/**
 * "Vai faltar dinheiro? Quando?" (#1086, bloco Próximos 30 dias): o saldo dia a
 * dia em **degraus** laranja (o saldo não muda "aos poucos" entre um dia e
 * outro: muda de uma vez quando a conta entra ou sai), com colunas finas do
 * que entra (acima do zero) e do que sai (abaixo). O dia mais baixo vem
 * apontado com o valor, a data e o motivo, e o fim do período vem escrito.
 *
 * Só desenho: o saldo, o dia mais baixo e os textos chegam prontos.
 */
export function GraficoDegraus({
  dias,
  maisBaixo,
  fim,
  nomeDoSaldo = "Saldo",
  formatarCurto,
}: {
  dias: readonly DiaDoFluxo[];
  /** O dia mais baixo: o índice dele e o texto ("− R$ 1,2 mil em 24/11: aluguel"). */
  maisBaixo?: { indice: number; texto: string } | null;
  /** O fim do período, escrito na ponta ("R$ 3,4 mil em 22/12"). */
  fim?: string;
  /** "Saldo", ou "Falta cobrir" enquanto não há o "quanto tenho hoje". */
  nomeDoSaldo?: string;
  formatarCurto: (valor: number) => string;
}) {
  const [largura, medidor] = useLargura();
  const marcas = useMarcasNavegaveis(dias.length);

  const valores = dias.flatMap((d) => [d.saldo, d.entra, -Math.abs(d.sai)]);
  const eixo = marcasDoEixo(Math.min(0, ...valores), Math.max(0, ...valores), 5);
  const esquerda = Math.max(...eixo.map((m) => larguraDoTexto(formatarCurto(m)))) + 12;
  const x0 = esquerda;
  const x1 = Math.max(x0 + 80, largura - 8);
  const yBase = ALTURA - BASE;
  const y = escalaLinear([eixo[0], eixo[eixo.length - 1]], [yBase - 8, TOPO]);

  const n = Math.max(1, dias.length);
  const banda = (x1 - x0) / n;
  const larguraDaColuna = Math.max(2, Math.min(10, banda * 0.45));
  const inicio = (i: number) => x0 + banda * i;
  const centro = (i: number) => inicio(i) + banda / 2;

  // O degrau de cada dia vai do começo ao fim da faixa dele.
  const pontos = dias.map((d, i) => ({ x: inicio(i), y: y(d.saldo) }));
  if (dias.length > 0) pontos.push({ x: inicio(dias.length), y: y(dias[dias.length - 1].saldo) });

  const passo = Math.max(1, Math.ceil(48 / banda));
  const textoDaDica = (d: DiaDoFluxo) =>
    d.dica ??
    `${d.rotulo}: entra ${formatarCurto(d.entra)} · sai ${formatarCurto(Math.abs(d.sai))} · ${nomeDoSaldo} ${comSinal(d.saldo, formatarCurto)}`;

  const ativa = marcas.ativa !== null ? dias[marcas.ativa] : undefined;
  const dica =
    ativa && marcas.ativa !== null
      ? { x: centro(marcas.ativa), y: y(Math.max(ativa.saldo, ativa.entra, 0)), texto: textoDaDica(ativa) }
      : null;

  const baixo = maisBaixo && dias[maisBaixo.indice] ? { ...maisBaixo, dia: dias[maisBaixo.indice] } : null;
  const ultimo = dias[dias.length - 1];
  // O texto do mais baixo: embaixo do ponto se couber, senão em cima; e do
  // lado de dentro do gráfico.
  const xBaixo = baixo ? centro(baixo.indice) : 0;
  const yBaixo = baixo ? y(baixo.dia.saldo) : 0;
  const baixoEmbaixo = yBaixo + 24 < yBase - 8;
  const baixoNaEsquerda = xBaixo > x0 + (x1 - x0) * 0.6;

  return (
    <AreaDoGrafico
      medidor={medidor}
      largura={largura}
      altura={ALTURA}
      dica={dica}
      depois={
        <Legenda
          itens={[
            {
              chave: "saldo",
              marca: <span className="block h-0.5 w-4 rounded-full" style={{ background: COR.destaque }} />,
              texto: nomeDoSaldo,
            },
            {
              chave: "entra",
              marca: <span className="block h-3 w-1.5 rounded-sm" style={{ background: COR.neutroForte }} />,
              texto: "entra (acima do zero)",
            },
            {
              chave: "sai",
              marca: <span className="block h-3 w-1.5 rounded-sm" style={{ background: COR.neutro, opacity: 0.6 }} />,
              texto: "sai (abaixo do zero)",
            },
          ]}
        />
      }
    >
      <Grade marcas={eixo} y={y} x0={x0} x1={x1} />
      <EixoY marcas={eixo} y={y} x={x0} formatar={formatarCurto} />

      {dias.map((d, i) => {
        const xc = centro(i);
        const sai = Math.abs(d.sai);
        return (
          <g key={d.chave} {...marcas.propsDaMarca(i, textoDaDica(d))}>
            <rect x={inicio(i)} y={TOPO} width={banda} height={yBase - TOPO} fill="transparent" />
            {d.entra > 0 && (
              <rect
                data-entra
                x={xc - larguraDaColuna / 2}
                y={y(d.entra)}
                width={larguraDaColuna}
                height={Math.max(1, y(0) - y(d.entra))}
                rx={1}
                style={{ fill: COR.neutroForte }}
                fillOpacity={marcas.ativa === i ? 1 : 0.75}
              />
            )}
            {sai > 0 && (
              <rect
                data-sai
                x={xc - larguraDaColuna / 2}
                y={y(0)}
                width={larguraDaColuna}
                height={Math.max(1, y(-sai) - y(0))}
                rx={1}
                style={{ fill: COR.neutro }}
                fillOpacity={marcas.ativa === i ? 0.9 : 0.5}
              />
            )}
            {marcas.foco === i && (
              <AnelDeFoco x={inicio(i) + 1} y={TOPO} largura={Math.max(2, banda - 2)} altura={yBase - 8 - TOPO} />
            )}
          </g>
        );
      })}

      {pontos.length > 0 && (
        <path
          data-linha="saldo"
          d={caminhoEmDegraus(pontos)}
          fill="none"
          style={{ stroke: COR.destaque }}
          strokeWidth={2.5}
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}

      {baixo && (
        <g aria-hidden="true" pointerEvents="none">
          <circle
            cx={xBaixo}
            cy={yBaixo}
            r={5}
            style={{ fill: baixo.dia.saldo < 0 ? COR.perigo : COR.destaque, stroke: COR.fundo }}
            strokeWidth={2}
          />
          <RotuloDireto
            x={baixoNaEsquerda ? xBaixo - VAO_DO_ROTULO * 2 : xBaixo + VAO_DO_ROTULO * 2}
            y={baixoEmbaixo ? yBaixo + 16 : yBaixo - 16}
            ancora={baixoNaEsquerda ? "end" : "start"}
            cor={baixo.dia.saldo < 0 ? COR.perigo : COR.texto}
            forte
          >
            {baixo.texto}
          </RotuloDireto>
        </g>
      )}

      {fim && ultimo && (!baixo || baixo.indice !== dias.length - 1) && (
        <RotuloDireto x={x1} y={y(ultimo.saldo) - 12} ancora="end" base="auto" cor={COR.destaqueTexto} forte>
          {fim}
        </RotuloDireto>
      )}

      <EixoX
        y={yBase + 4}
        rotulos={dias.flatMap((d, i) =>
          i % passo === 0 || i === dias.length - 1
            ? i !== dias.length - 1 && dias.length - 1 - i < passo
              ? []
              : [{ chave: d.chave, x: centro(i), linhas: [d.rotulo] }]
            : [],
        )}
      />
    </AreaDoGrafico>
  );
}
