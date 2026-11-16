import { Info, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Valor } from "@/components/Valor";
import { hojeLocal, primeiroDiaDoMesLocal } from "@/lib/datas";
import { lucratividadePorItem } from "@/schemas/lucratividade";
import { mapaCustoPecas, mapaCustoServicos } from "@/schemas/metricasCaixa";
import { TEXTO_CUSTO_NAO_INFORMADO } from "@/schemas/orcamento";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { FiltroDeDatas } from "./FiltroDeDatas";

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

      <div className="grid grid-cols-3 gap-4">
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
        <CartaoNumero
          titulo="Margem do período"
          explicacao="O que sobrou: o vendido menos o custo das peças e dos serviços."
          variacao={algumCustoNaoInformado ? avisoDeCusto : undefined}
        >
          <Valor valor={totalMargem} />
        </CartaoNumero>
      </div>

      <p className="flex items-start gap-2 text-rotulo text-texto-2">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          Vendido conta as OS abertas no período, recebidas ou não. O &quot;Recebido no mês&quot; dos
          Gráficos e do Início é só o que já entrou no Caixa: a diferença são as OS ainda não
          recebidas.
        </span>
      </p>

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
