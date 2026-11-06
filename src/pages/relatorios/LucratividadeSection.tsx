import { useMemo, useState } from "react";
import { hojeLocal, primeiroDiaDoMesLocal } from "@/lib/datas";
import { lucratividadePorItem } from "@/schemas/lucratividade";
import { mapaCustoPecas, mapaCustoServicos } from "@/schemas/metricasCaixa";
import { TEXTO_CUSTO_NAO_INFORMADO } from "@/schemas/orcamento";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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

  return (
    <>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-corpo text-sakura-purple-dark/80">
          De:
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="rounded-lg border border-sakura-borda-campo px-3 py-1.5"
          />
        </label>
        <label className="flex items-center gap-2 text-corpo text-sakura-purple-dark/80">
          Até:
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="rounded-lg border border-sakura-borda-campo px-3 py-1.5"
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">{rotuloVendido}</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totalReceita)}
          </p>
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Custo do período</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totalCusto)}
          </p>
          {algumCustoNaoInformado && (
            <p className="text-rotulo text-sakura-muted">Inclui item com {TEXTO_CUSTO_NAO_INFORMADO}</p>
          )}
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Margem do período</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totalMargem)}
          </p>
          {algumCustoNaoInformado && (
            <p className="text-rotulo text-sakura-muted">Inclui item com {TEXTO_CUSTO_NAO_INFORMADO}</p>
          )}
        </div>
      </div>

      <p className="text-rotulo text-sakura-muted">
        Vendido conta as OS abertas no período, recebidas ou não. O &quot;Recebido no mês&quot; dos
        Gráficos e do Início é só o que já entrou no Caixa: a diferença são as OS ainda não
        recebidas.
      </p>

      {linhas.length === 0 ? (
        <p className="text-corpo text-sakura-muted">Nenhuma peça ou serviço vendido nesse período.</p>
      ) : (
        <section>
          <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">
            Margem por peça/serviço
          </h2>
          <div className="overflow-x-auto sakura-card">
            <table className="w-full text-left text-corpo">
              <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                <tr>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Qtd. vendida</th>
                  <th className="px-4 py-3 font-medium">Receita</th>
                  <th className="px-4 py-3 font-medium">Custo</th>
                  <th className="px-4 py-3 font-medium">Margem</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => (
                  <tr key={linha.descricao} className="border-t border-sakura-gray/20">
                    <td className="px-4 py-3">{linha.descricao}</td>
                    <td className="px-4 py-3">{linha.quantidade}</td>
                    <td className="px-4 py-3">{formatarMoeda(linha.receita)}</td>
                    {linha.custoNaoInformado ? (
                      <>
                        <td className="px-4 py-3 text-sakura-muted">{TEXTO_CUSTO_NAO_INFORMADO}</td>
                        <td className="px-4 py-3 text-sakura-muted">{TEXTO_CUSTO_NAO_INFORMADO}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">{formatarMoeda(linha.custo)}</td>
                        <td className="px-4 py-3 font-medium">{formatarMoeda(linha.margem)}</td>
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
