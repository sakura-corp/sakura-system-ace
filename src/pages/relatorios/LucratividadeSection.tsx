import { useMemo, useState } from "react";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function primeiroDiaDoMes(): string {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toLocaleDateString("sv-SE");
}

function hojeStr(): string {
  return new Date().toLocaleDateString("sv-SE");
}

// `data_abertura` vem do banco em UTC — pegar o "dia" com `.slice(0, 10)`
// pegaria o dia em UTC, não no fuso local. No Brasil (UTC-3), uma OS aberta
// depois das ~21h vira "amanhã" em UTC e sumiria do filtro de período (que é
// calculado em hora local). Ver mesmo bug/correção em OrdensServicoPage.tsx.
function paraDataLocal(dataIso: string): string {
  return new Date(dataIso).toLocaleDateString("sv-SE");
}

interface LinhaLucro {
  descricao: string;
  quantidade: number;
  receita: number;
  custo: number;
  margem: number;
}

interface LucratividadeSectionProps {
  ordens: OrdemServico[];
  pecas: Peca[];
  servicos: Servico[];
}

export function LucratividadeSection({ ordens, pecas, servicos }: LucratividadeSectionProps) {
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMes());
  const [dataFim, setDataFim] = useState(hojeStr());

  const custoPorPeca = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const peca of pecas) mapa.set(peca.id, peca.preco_custo ?? 0);
    return mapa;
  }, [pecas]);

  const custoPorServico = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const servico of servicos) mapa.set(servico.id, servico.custo ?? 0);
    return mapa;
  }, [servicos]);

  const linhas = useMemo(() => {
    const mapa = new Map<string, LinhaLucro>();

    for (const ordem of ordens) {
      const dia = paraDataLocal(ordem.data_abertura);
      if (dia < dataInicio || dia > dataFim) continue;

      for (const item of ordem.itens ?? []) {
        const receita = item.quantidade * item.preco_unitario - item.desconto;
        const custoUnitario =
          item.tipo === "peca"
            ? custoPorPeca.get(item.peca_id ?? "") ?? 0
            : custoPorServico.get(item.servico_id ?? "") ?? 0;
        const custo = item.quantidade * custoUnitario;

        const existente = mapa.get(item.descricao) ?? {
          descricao: item.descricao,
          quantidade: 0,
          receita: 0,
          custo: 0,
          margem: 0,
        };
        existente.quantidade += item.quantidade;
        existente.receita += receita;
        existente.custo += custo;
        existente.margem += receita - custo;
        mapa.set(item.descricao, existente);
      }
    }

    return [...mapa.values()].sort((a, b) => b.margem - a.margem);
  }, [ordens, custoPorPeca, custoPorServico, dataInicio, dataFim]);

  const totalReceita = linhas.reduce((total, l) => total + l.receita, 0);
  const totalCusto = linhas.reduce((total, l) => total + l.custo, 0);
  const totalMargem = linhas.reduce((total, l) => total + l.margem, 0);

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
          <p className="text-rotulo text-sakura-muted">Receita do período</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totalReceita)}
          </p>
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Custo do período</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totalCusto)}
          </p>
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Margem do período</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totalMargem)}
          </p>
        </div>
      </div>

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
                    <td className="px-4 py-3">{formatarMoeda(linha.custo)}</td>
                    <td className="px-4 py-3 font-medium">{formatarMoeda(linha.margem)}</td>
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
