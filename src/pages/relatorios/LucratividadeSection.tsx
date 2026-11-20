import { ArrowUp, Info, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Explicacao } from "@/components/Explicacao";
import { Valor } from "@/components/Valor";
import { hojeLocal, primeiroDiaDoMesLocal } from "@/lib/datas";
import {
  deCadaCem,
  lucratividadePorItem,
  margemMediaComCusto,
  margemPercentual,
  pontosDoLucro,
} from "@/schemas/lucratividade";
import { mapaCustoPecas, mapaCustoServicos } from "@/schemas/metricasCaixa";
import { formatarMoeda, formatarPercentual } from "@/schemas/dinheiro";
import { TEXTO_CUSTO_NAO_INFORMADO } from "@/schemas/orcamento";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { FiltroDeDatas } from "./FiltroDeDatas";
import { GraficoDeBolhas } from "./GraficoDeBolhas";

interface LucratividadeSectionProps {
  ordens: OrdemServico[];
  pecas: Peca[];
  servicos: Servico[];
}

// A conta (e a regra de deixar orçamento de fora, #379) mora em
// `schemas/lucratividade.ts`; aqui é só ligar os fios.
export function LucratividadeSection({ ordens, pecas, servicos }: LucratividadeSectionProps) {
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMesLocal());
  const [dataFim, setDataFim] = useState(hojeLocal());

  const { linhas, totalReceita, totalCusto, totalMargem, algumCustoNaoInformado } = useMemo(
    () =>
      lucratividadePorItem({
        ordens,
        custoPeca: mapaCustoPecas(pecas),
        custoServico: mapaCustoServicos(servicos),
        nomePeca: new Map(pecas.map((peca) => [peca.id, peca.descricao])),
        nomeServico: new Map(servicos.map((servico) => [servico.id, servico.descricao])),
        de: dataInicio,
        ate: dataFim,
      }),
    [ordens, pecas, servicos, dataInicio, dataFim],
  );

  // #835: o total daqui conta as OS ABERTAS no período, recebidas ou não; o
  // "Recebido no mês" dos Gráficos e do Início conta o que entrou no Caixa.
  const ehOMesCorrente = dataInicio === primeiroDiaDoMesLocal() && dataFim === hojeLocal();
  const rotuloVendido = ehOMesCorrente ? "Vendido no mês" : "Vendido no período";

  // "De cada R$ 100 vendidos, R$ 42 ficam com a loja" (visual novo, 17/11):
  // só faz sentido com venda e margem entre 0 e 100%; fora disso o número
  // grande (vermelho, se for prejuízo) já diz tudo.
  const cem = deCadaCem(totalReceita, totalMargem);
  const bolinhasDaLoja = cem ? Math.round(cem.margem) : 0;
  const pontos = useMemo(() => pontosDoLucro(linhas), [linhas]);
  // A média de comparar item com item: só as linhas com custo (as do gráfico).
  const mediaDosItens = useMemo(() => margemMediaComCusto(linhas), [linhas]);

  const avisoDeCusto = (
    <span className="inline-flex items-center gap-1 text-rotulo font-medium text-atencao">
      <TriangleAlert aria-hidden="true" className="size-[13px] shrink-0" strokeWidth={2.25} />
      Inclui item com {TEXTO_CUSTO_NAO_INFORMADO}
    </span>
  );

  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <FiltroDeDatas
          de={dataInicio}
          ate={dataFim}
          aoMudarDe={setDataInicio}
          aoMudarAte={setDataFim}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        {/* O cartão de destaque (o da Central do dia): é a aba que tem que chamar atenção. */}
        <section
          aria-labelledby="margem-do-periodo-titulo"
          className="sakura-capa-central sakura-grao overflow-hidden rounded-[1.125rem] border border-linha p-8"
        >
          {/* A partir de 1280 (#1084) as bolinhas ficam ao lado do texto, sem
              descer: a frase quebra em duas linhas no lugar. De 1280 a 1535 as
              bolinhas têm 12 px (com 14 px, o número de cinco dígitos encostava
              nelas em 1280 com o menu aberto); a partir de 1536, 14 px. Abaixo
              de 1280 o cartão vira coluna, com as bolinhas de 10 px embaixo. */}
          <div className="relative z-[2] flex flex-col items-start gap-6 xl:flex-row xl:items-center xl:justify-between xl:gap-8">
            <div className="min-w-0 xl:flex-1">
              <div className="flex items-center gap-1.5">
                <h2 id="margem-do-periodo-titulo" className="text-rotulo font-medium text-texto-2">
                  Margem do período
                </h2>
                <Explicacao
                  titulo="Margem do período"
                  texto="O que sobrou: o vendido menos o custo das peças e dos serviços."
                />
              </div>
              <p className="mt-1 whitespace-nowrap font-titulo text-capa font-extrabold tracking-[-0.02em] tabular-nums">
                <Valor valor={totalMargem} />
              </p>
              {cem && (
                <p className="mt-3 text-subtitulo text-texto">
                  De cada <strong>R$ 100</strong> vendidos,{" "}
                  <strong>{formatarMoeda(cem.margem)}</strong> ficam com a loja.
                </p>
              )}
              {algumCustoNaoInformado && (
                <div className="mt-3 space-y-1">
                  {avisoDeCusto}
                  <p className="text-rotulo text-texto-2">
                    Item com {TEXTO_CUSTO_NAO_INFORMADO} conta como custo zero: a margem pode estar
                    maior que a real.
                  </p>
                </div>
              )}
            </div>
            {cem && (
              <div aria-hidden="true" className="shrink-0">
                {/* 100 bolinhas = R$ 100 vendidos: as apagadas são o custo, as cheias o que fica. */}
                <div className="grid grid-cols-[repeat(10,10px)] gap-1 xl:grid-cols-[repeat(10,12px)] 2xl:grid-cols-[repeat(10,14px)] 2xl:gap-1.5">
                  {Array.from({ length: 100 }, (_, i) => (
                    <span
                      key={i}
                      className={`size-2.5 rounded-full xl:size-3 2xl:size-3.5 ${i < 100 - bolinhasDaLoja ? "bg-texto/30" : "bg-texto"}`}
                    />
                  ))}
                </div>
                {/* Ao lado do texto, a legenda vai em duas linhas: numa linha só ela
                    é mais larga que as bolinhas e empurra o número (#1084). */}
                <div className="mt-3 flex gap-5 text-rotulo text-texto-2 xl:flex-col xl:gap-1">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-texto/30" />
                    Custo {formatarMoeda(cem.custo)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-texto" />
                    Margem {formatarMoeda(cem.margem)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* `content-start`: os dois cartões ficam do tamanho do conteúdo, em
            vez de esticar até a altura da capa e sobrar vazios (#1084). */}
        <div className="grid content-start gap-4">
          <CartaoNumero
            titulo={rotuloVendido}
            explicacao="O que as ordens de serviço abertas neste período somam, já recebidas ou não. Orçamento fica de fora."
          >
            <Valor valor={totalReceita} />
          </CartaoNumero>
          <CartaoNumero
            titulo="Custo do período"
            explicacao="O que as peças e os serviços dessas ordens custaram pra loja."
            variacao={algumCustoNaoInformado ? avisoDeCusto : undefined}
          >
            <Valor valor={totalCusto} />
          </CartaoNumero>
        </div>
      </div>

      <p className="flex items-start gap-2 text-rotulo text-texto-2">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          Vendido conta as OS abertas no período, recebidas ou não. O &quot;Recebido no mês&quot; dos
          Gráficos e do Início é só o que já entrou no Caixa: a diferença são as OS ainda não
          recebidas.
        </span>
      </p>

      {linhas.length > 0 && (
        <section className="sakura-card p-6" aria-labelledby="onde-esta-o-lucro-titulo">
          <div className="flex items-center gap-1.5">
            <h2 id="onde-esta-o-lucro-titulo" className="font-titulo text-subtitulo font-semibold text-texto">
              Onde está o lucro
            </h2>
            <Explicacao
              titulo="Onde está o lucro"
              texto="Cada bolha é uma peça ou serviço (as 12 de mais margem; o resto está na tabela). Mais à direita: vende mais. Mais alto: sobra mais de cada venda. Bolha maior: mais lucro em reais. Item com custo não informado fica de fora."
            />
          </div>
          <p className="mb-4 text-rotulo text-texto-2">
            Mais à direita: vende mais. Mais alto: sobra mais de cada venda. Bolha maior: mais lucro em reais.
          </p>
          <GraficoDeBolhas
            pontos={pontos}
            margemMedia={mediaDosItens}
            formatarValor={formatarMoeda}
            formatarPercentual={formatarPercentual}
          />
        </section>
      )}

      {linhas.length === 0 ? (
        <p className="text-corpo text-texto-2">Nenhuma peça ou serviço vendido nesse período.</p>
      ) : (
        <section aria-labelledby="margem-por-item-titulo">
          <h2
            id="margem-por-item-titulo"
            className="mb-3 font-titulo text-subtitulo font-semibold text-texto"
          >
            Margem por peça/serviço
          </h2>
          <div className="sakura-card overflow-hidden">
            <table className="sakura-tabela">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th className="text-right">Qtd. vendida</th>
                  <th className="text-right">Receita</th>
                  <th className="text-right">Custo</th>
                  <th className="text-right">Margem</th>
                  <th className="text-right">Margem %</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => (
                  <tr key={linha.descricao}>
                    <td>{linha.descricao}</td>
                    <td className="text-right">{linha.quantidade}</td>
                    <td className="text-right">
                      <Valor valor={linha.receita} />
                    </td>
                    {linha.custoNaoInformado ? (
                      <>
                        <td className="text-right text-texto-2">{TEXTO_CUSTO_NAO_INFORMADO}</td>
                        <td className="text-right text-texto-2">{TEXTO_CUSTO_NAO_INFORMADO}</td>
                      </>
                    ) : (
                      <>
                        <td className="text-right">
                          <Valor valor={linha.custo} />
                        </td>
                        <td className="text-right font-semibold">
                          <Valor valor={linha.margem} />
                        </td>
                      </>
                    )}
                    <td className="text-right">
                      <MargemPercentual linha={linha} media={mediaDosItens} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

/** A "Margem %" da linha: verde com seta quando passa da média da loja (cor e seta juntas, regra 4). */
function MargemPercentual({
  linha,
  media,
}: {
  linha: { receita: number; margem: number; custoNaoInformado: boolean };
  media: number | null;
}) {
  if (linha.custoNaoInformado) return <span className="text-texto-2">—</span>;
  const percentual = margemPercentual(linha.receita, linha.margem);
  if (percentual === null) return <span className="text-texto-2">—</span>;
  const acima = media !== null && percentual > media;
  return (
    <span
      className={`inline-flex items-center justify-end gap-1 tabular-nums ${acima ? "font-semibold text-ok" : "text-texto-2"}`}
      title={acima ? "Acima da margem média da loja no período" : undefined}
    >
      {acima && <ArrowUp aria-label="acima da média" className="size-[13px]" strokeWidth={2.5} />}
      {formatarPercentual(percentual)}
    </span>
  );
}
