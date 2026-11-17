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
          <div className="relative z-[2] flex flex-wrap items-center justify-between gap-x-10 gap-y-6">
            <div className="min-w-0">
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
              <div aria-hidden="true">
                {/* 100 bolinhas = R$ 100 vendidos: as apagadas são o custo, as cheias o que fica. */}
                <div className="grid grid-cols-[repeat(10,14px)] gap-1.5">
                  {Array.from({ length: 100 }, (_, i) => (
                    <span
                      key={i}
                      className={`size-3.5 rounded-full ${i < 100 - bolinhasDaLoja ? "bg-texto/30" : "bg-texto"}`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex gap-5 text-rotulo text-texto-2">
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

        <div className="grid gap-4">
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
