import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { CaixaDaDica, Legenda } from "./partes";
import { COR, comSinal } from "./tema";
import { useMarcasNavegaveis } from "./useMarcasNavegaveis";

export interface LinhaDoRanking {
  chave: string;
  nome: string;
  /** A Sobra das OS do item, em R$. Negativo = prejuízo (barra vermelha pra esquerda). */
  valor: number;
  /** "De cada R$ 100, sobra": de 0 a 100. `null` = sem custo pra calcular. */
  percentual: number | null;
  tipo: "peca" | "servico";
  /** Sem custo cadastrado: sem barra, com a palavra e a `acao` ao lado. */
  custoNaoInformado: boolean;
  /** O link pra resolver ("cadastre o custo da peça"). */
  acao?: ReactNode;
}

/** As barras usam até 70% da coluna: o resto é do valor escrito na ponta. */
const ESPACO_DA_BARRA = 70;

/**
 * "Quem me dá dinheiro?" (#1086, bloco O que me dá dinheiro): o ranking em
 * barras deitadas, do maior pro menor (a ordem vem pronta), com o nome e o
 * valor escritos. Ao lado, um ponto em "de cada R$ 100, sobra" (0 a 100), com
 * a média da loja tracejada; ponto cheio = serviço, vazado = peça (a legenda
 * diz em palavra). O primeiro (o que mais dá) é a barra laranja.
 *
 * - Prejuízo: a barra vai pra esquerda do zero, vermelha, com "−" e ▼.
 * - Custo não informado: sem barra; a palavra em amarelo e o link pra
 *   cadastrar o custo ao lado.
 *
 * Só desenho: os valores, a ordem e o percentual chegam prontos.
 */
export function GraficoRanking({
  linhas,
  media,
  formatarCurto,
  nomeDoValor = "Sobra das OS",
  nomeDoPercentual = "De cada R$ 100, sobra",
}: {
  linhas: readonly LinhaDoRanking[];
  /** A média da loja no "de cada R$ 100" (0 a 100). `null` = sem a linha. */
  media: number | null;
  formatarCurto: (valor: number) => string;
  nomeDoValor?: string;
  nomeDoPercentual?: string;
}) {
  const marcas = useMarcasNavegaveis(linhas.length);
  const comBarra = linhas.filter((l) => !l.custoNaoInformado);
  const menor = Math.min(0, ...comBarra.map((l) => l.valor));
  const maior = Math.max(0, ...comBarra.map((l) => l.valor));
  const faixa = maior - menor || 1;
  const zero = (-menor / faixa) * ESPACO_DA_BARRA;
  const porcento = (v: number) => (Math.abs(v) / faixa) * ESPACO_DA_BARRA;
  const limitar = (p: number) => Math.max(0, Math.min(100, p));
  const primeiraPositiva = linhas.findIndex((l) => !l.custoNaoInformado && l.valor > 0);

  const textoDaLinha = (l: LinhaDoRanking) => {
    const tipo = l.tipo === "servico" ? "serviço" : "peça";
    if (l.custoNaoInformado) return `${l.nome} (${tipo}): custo não informado`;
    const valor = l.valor < 0 ? `${comSinal(l.valor, formatarCurto)} ▼` : formatarCurto(l.valor);
    const parte = l.percentual === null ? "" : ` · de cada R$ 100, sobram R$ ${Math.round(l.percentual)}`;
    return `${l.nome} (${tipo}): ${valor}${parte}`;
  };

  return (
    <div className="min-w-0">
      <div
        aria-hidden="true"
        className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_minmax(7rem,10rem)] gap-x-4 pb-2 text-meta text-texto-2"
      >
        <span>Item</span>
        <span>{nomeDoValor}</span>
        <span>{nomeDoPercentual}</span>
      </div>
      <ul className="min-w-0">
        {linhas.map((l, i) => {
          const texto = textoDaLinha(l);
          const negativo = !l.custoNaoInformado && l.valor < 0;
          const corDaBarra = negativo ? COR.perigo : i === primeiraPositiva ? COR.destaque : COR.neutroForte;
          return (
            <li
              key={l.chave}
              className="grid min-h-10 grid-cols-[minmax(0,9rem)_minmax(0,1fr)_minmax(7rem,10rem)] items-center gap-x-4 py-1"
            >
              <span className="line-clamp-2 text-corpo break-words text-texto">{l.nome}</span>

              <div className="relative flex min-w-0 items-center gap-2">
                <div
                  {...marcas.propsDaMarca(i, texto)}
                  className="relative h-7 min-w-0 flex-1 rounded-md focus-visible:ring-2 focus-visible:ring-acao-clara"
                >
                  {l.custoNaoInformado ? (
                    <span className="flex h-full items-center gap-1 text-rotulo font-medium" style={{ color: COR.atencao }}>
                      <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                      custo não informado
                    </span>
                  ) : (
                    <>
                      <span
                        aria-hidden="true"
                        data-barra={negativo ? "negativa" : "positiva"}
                        className="absolute top-1 bottom-1 rounded-[3px]"
                        style={{
                          left: `${negativo ? zero - porcento(l.valor) : zero}%`,
                          width: `${Math.max(0.5, porcento(l.valor))}%`,
                          background: corDaBarra,
                        }}
                      />
                      <span
                        aria-hidden="true"
                        className="absolute top-1/2 -translate-y-1/2 pl-1 text-rotulo font-semibold whitespace-nowrap tabular-nums"
                        style={{
                          left: `${negativo ? zero : zero + porcento(l.valor)}%`,
                          color: negativo ? COR.perigo : COR.texto,
                        }}
                      >
                        {negativo ? `${comSinal(l.valor, formatarCurto)} ▼` : formatarCurto(l.valor)}
                      </span>
                      {menor < 0 && (
                        <span
                          aria-hidden="true"
                          className="absolute top-0 bottom-0 w-px"
                          style={{ left: `${zero}%`, background: COR.eixo }}
                        />
                      )}
                    </>
                  )}
                  {marcas.ativa === i && (
                    <CaixaDaDica texto={texto} className="bottom-full left-0 mb-2" />
                  )}
                </div>
                {l.custoNaoInformado && l.acao && <span className="shrink-0 text-rotulo">{l.acao}</span>}
              </div>

              <div aria-hidden="true" className="relative h-7 min-w-0">
                <span className="absolute top-1/2 right-0 left-0 h-px" style={{ background: COR.grade }} />
                {media !== null && (
                  <span
                    data-media
                    className="absolute top-0 bottom-0 border-l border-dashed"
                    style={{ left: `${limitar(media)}%`, borderColor: COR.texto2 }}
                  />
                )}
                {l.percentual !== null && !l.custoNaoInformado && (
                  <>
                    <span
                      data-ponto={l.tipo}
                      className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                      style={{
                        left: `${limitar(l.percentual)}%`,
                        borderColor: COR.texto,
                        background: l.tipo === "servico" ? COR.texto : COR.fundo,
                      }}
                    />
                    <span
                      className="absolute top-1/2 -translate-y-1/2 text-meta whitespace-nowrap tabular-nums text-texto-2"
                      style={
                        l.percentual > 70
                          ? { right: `calc(${100 - limitar(l.percentual)}% + 10px)` }
                          : { left: `calc(${limitar(l.percentual)}% + 10px)` }
                      }
                    >
                      R$ {Math.round(l.percentual)}
                    </span>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Legenda
        itens={[
          {
            chave: "servico",
            marca: <span className="block size-2.5 rounded-full border-2" style={{ borderColor: COR.texto, background: COR.texto }} />,
            texto: "serviço",
          },
          {
            chave: "peca",
            marca: <span className="block size-2.5 rounded-full border-2" style={{ borderColor: COR.texto, background: COR.fundo }} />,
            texto: "peça",
          },
          ...(media !== null
            ? [
                {
                  chave: "media",
                  marca: <span className="block h-3 border-l border-dashed" style={{ borderColor: COR.texto2 }} />,
                  texto: `média da loja: de cada R$ 100, sobram R$ ${Math.round(media)}`,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
