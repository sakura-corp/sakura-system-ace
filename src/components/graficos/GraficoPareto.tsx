import { Fragment } from "react";
import { CaixaDaDica } from "./partes";
import { COR } from "./tema";
import { useMarcasNavegaveis } from "./useMarcasNavegaveis";

export type LetraDaCurva = "A" | "B" | "C";

export interface GrupoDaCurva {
  letra: LetraDaCurva;
  /** A parte do total que o grupo faz, de 0 a 100. */
  parte: number;
  /** Quantos itens tem o grupo. */
  quantos: number;
}

export interface ItemDaCurva {
  chave: string;
  nome: string;
  letra: LetraDaCurva;
  /** O valor do item, em R$ (escrito curto ao lado da barra). */
  valor: number;
  /** A parte do total que o item faz, de 0 a 100 (o comprimento da barra). */
  parte: number;
  /** A soma das partes até ele, de 0 a 100 (escrita à direita). */
  acumulado: number;
}

/** As barras usam até 64% da coluna: o resto é do valor escrito na ponta. */
const ESPACO_DA_BARRA = 64;

/** O C mais apagado que o B: a ordem de importância sem precisar de outra cor. */
const FUNDO_DO_GRUPO: Record<LetraDaCurva, string> = {
  A: COR.destaque,
  B: COR.neutroForte,
  C: "color-mix(in srgb, var(--grafico-comparacao) 50%, transparent)",
};

/**
 * "O que não pode faltar?" (#1086, bloco Curva ABC): em cima, **uma** barra
 * dividida em A, B e C pela parte de cada grupo; embaixo, o Pareto deitado:
 * uma barra por item (a parte dele no total), do maior pro menor, com o
 * acumulado em número à direita e a linha "↑ aqui passa de 80%" separando o
 * grupo A do resto, com respiro. A letra vai num selo cinza; o laranja é só do
 * grupo A. Sem verde nem amarelo (a letra não é "bom" nem "ruim").
 *
 * Só desenho: grupos, partes e acumulados chegam prontos.
 */
export function GraficoPareto({
  grupos,
  itens,
  formatarCurto,
  limite = 80,
  textoDoCorte,
}: {
  grupos: readonly GrupoDaCurva[];
  itens: readonly ItemDaCurva[];
  formatarCurto: (valor: number) => string;
  /** Onde o grupo A termina (o corte da linha), em %. */
  limite?: number;
  /** O texto da linha do corte; sem dizer, "↑ aqui passa de 80%". */
  textoDoCorte?: string;
}) {
  const visiveis = grupos.filter((g) => g.parte > 0);
  const marcas = useMarcasNavegaveis(visiveis.length + itens.length);
  const maiorParte = Math.max(0, ...itens.map((i) => i.parte)) || 1;
  const corte = itens.findIndex((i) => i.letra !== "A");
  const pct = (n: number) => `${Math.round(n)}%`;

  const textoDoGrupo = (g: GrupoDaCurva) =>
    `Grupo ${g.letra}: ${g.quantos} ${g.quantos === 1 ? "item" : "itens"}, ${pct(g.parte)} do total`;
  const textoDoItem = (i: ItemDaCurva) =>
    `${i.nome} (${i.letra}): ${formatarCurto(i.valor)}, ${pct(i.parte)} do total; somando até aqui, ${pct(i.acumulado)}`;

  return (
    <div className="min-w-0">
      {/* A barra de cima: A, B e C lado a lado, pela parte de cada um. O texto
          vai embaixo, no fundo do cartão: em cima do cinza não se leria nos
          dois temas. */}
      <div className="flex h-8 w-full min-w-0 gap-0.5">
        {visiveis.map((g, k) => {
          const texto = textoDoGrupo(g);
          return (
            <div
              key={g.letra}
              {...marcas.propsDaMarca(k, texto)}
              data-grupo={g.letra}
              className="relative min-w-0 rounded-md focus-visible:ring-2 focus-visible:ring-acao-clara"
              style={{ width: `${g.parte}%`, background: FUNDO_DO_GRUPO[g.letra] }}
            >
              {marcas.ativa === k && <CaixaDaDica texto={texto} className="bottom-full left-0 mb-2" />}
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-2 flex w-full min-w-0 gap-0.5">
        {visiveis.map((g) => (
          <span
            key={g.letra}
            className="min-w-0 truncate text-meta tabular-nums"
            style={{ width: `${g.parte}%`, color: g.letra === "A" ? COR.destaqueTexto : COR.texto2 }}
          >
            <strong className="font-semibold">{g.letra}</strong>
            {g.parte >= 18 ? ` · ${g.quantos} ${g.quantos === 1 ? "item" : "itens"} · ${pct(g.parte)}` : ""}
          </span>
        ))}
      </div>

      {/* O Pareto deitado, item por item. */}
      <div
        aria-hidden="true"
        className="mt-6 grid grid-cols-[1.5rem_minmax(0,9rem)_minmax(0,1fr)_3.5rem] gap-x-3 pb-2 text-meta text-texto-2"
      >
        <span />
        <span>Item</span>
        <span>Parte do total</span>
        <span className="text-right">Somando</span>
      </div>
      <ul className="min-w-0">
        {itens.map((item, j) => {
          const indice = visiveis.length + j;
          const texto = textoDoItem(item);
          return (
            <Fragment key={item.chave}>
              {j === corte && corte > 0 && (
                <li
                  data-corte
                  aria-hidden="true"
                  className="my-4 flex items-center gap-3 text-meta font-semibold text-texto"
                >
                  <span className="h-0 flex-1 border-t border-dashed" style={{ borderColor: COR.texto2 }} />
                  {textoDoCorte ?? `↑ aqui passa de ${limite}%`}
                </li>
              )}
              <li className="grid min-h-10 grid-cols-[1.5rem_minmax(0,9rem)_minmax(0,1fr)_3.5rem] items-center gap-x-3 py-1">
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 w-6 items-center justify-center rounded-full bg-passar text-meta font-semibold text-texto-2"
                >
                  {item.letra}
                </span>
                <span className="line-clamp-2 text-corpo break-words text-texto">{item.nome}</span>
                <div
                  {...marcas.propsDaMarca(indice, texto)}
                  data-item={item.letra}
                  className="relative h-7 min-w-0 rounded-md focus-visible:ring-2 focus-visible:ring-acao-clara"
                >
                  <span
                    aria-hidden="true"
                    className="absolute top-1 bottom-1 left-0 rounded-[3px]"
                    style={{
                      width: `${Math.max(0.5, (item.parte / maiorParte) * ESPACO_DA_BARRA)}%`,
                      background: FUNDO_DO_GRUPO[item.letra],
                    }}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 -translate-y-1/2 pl-1 text-rotulo whitespace-nowrap tabular-nums text-texto"
                    style={{ left: `${(item.parte / maiorParte) * ESPACO_DA_BARRA}%` }}
                  >
                    {formatarCurto(item.valor)} · {pct(item.parte)}
                  </span>
                  {marcas.ativa === indice && <CaixaDaDica texto={texto} className="bottom-full left-0 mb-2" />}
                </div>
                <span aria-hidden="true" className="text-right text-rotulo font-semibold tabular-nums text-texto">
                  {pct(item.acumulado)}
                </span>
              </li>
            </Fragment>
          );
        })}
      </ul>
    </div>
  );
}
