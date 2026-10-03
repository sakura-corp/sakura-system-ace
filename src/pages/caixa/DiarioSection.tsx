import { useMemo, useState } from "react";
import {
  lucroPorMovimento,
  mapaCustoPecas,
  mapaCustoServicos,
  resumirMovimentos,
} from "@/schemas/metricasCaixa";
import { Valor } from "@/components/Valor";
import { lancamentosDepoisDoFechamento } from "@/schemas/fechamentoCaixa";
import type { FechamentoCaixa } from "@/types/fechamentoCaixa";
import { nomeOrdem } from "@/types/os";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { MovimentoCaixa, NovoMovimentoCaixa } from "@/types/caixa";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { CaixaForm } from "./CaixaForm";

interface DiarioSectionProps {
  movimentos: MovimentoCaixa[];
  pecas: Peca[];
  servicos: Servico[];
  categorias: CategoriaCaixa[];
  fechamentos?: FechamentoCaixa[];
  onSalvar: (movimento: NovoMovimentoCaixa) => Promise<void>;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function paraDataLocal(dataIso: string): string {
  return new Date(dataIso).toLocaleDateString("sv-SE");
}

export function DiarioSection({
  movimentos,
  pecas,
  servicos,
  categorias,
  fechamentos = [],
  onSalvar,
}: DiarioSectionProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [dataFiltro, setDataFiltro] = useState(() => paraDataLocal(new Date().toISOString()));

  async function handleSalvar(movimento: NovoMovimentoCaixa) {
    await onSalvar(movimento);
    setMostrarFormulario(false);
  }

  const custoPorPeca = useMemo(() => mapaCustoPecas(pecas), [pecas]);
  const custoPorServico = useMemo(() => mapaCustoServicos(servicos), [servicos]);

  const movimentosDoDia = useMemo(
    () => movimentos.filter((m) => paraDataLocal(m.data) === dataFiltro),
    [movimentos, dataFiltro],
  );

  const resumo = useMemo(
    () => resumirMovimentos(movimentosDoDia, custoPorPeca, custoPorServico),
    [movimentosDoDia, custoPorPeca, custoPorServico],
  );
  const entradas = resumo.entradas;
  const saidas = resumo.saidas;

  const porFormaPagamento = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const m of movimentosDoDia) {
      if (m.tipo !== "entrada") continue;
      const forma = m.forma_pagamento || "Não informado";
      mapa.set(forma, (mapa.get(forma) ?? 0) + m.valor);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [movimentosDoDia]);

  // Lucro de cada linha: numa OS paga em duas formas, o lucro da OS é
  // repartido entre os lançamentos — antes cada linha mostrava o lucro
  // cheio da OS e o total do dia contava esse lucro duas vezes.
  const lucrosPorMovimento = useMemo(
    () => lucroPorMovimento(movimentosDoDia, custoPorPeca, custoPorServico),
    [movimentosDoDia, custoPorPeca, custoPorServico],
  );

  const totalLucro = resumo.lucro;

  const fechamentoDoDia = fechamentos.find((f) => f.data === dataFiltro) ?? null;
  const idsDepoisDoFechamento = useMemo(
    () => new Set(lancamentosDepoisDoFechamento(movimentosDoDia, fechamentoDoDia).map((m) => m.id)),
    [movimentosDoDia, fechamentoDoDia],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-corpo text-sakura-purple-dark/80">
          Dia:
          <input
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            className="rounded-lg border border-sakura-borda-campo px-3 py-1.5"
          />
        </label>
        {!mostrarFormulario && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90"
          >
            + Lançamento manual
          </button>
        )}
      </div>

      {mostrarFormulario && (
        <CaixaForm
          categorias={categorias}
          onSalvar={handleSalvar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Entradas do dia</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(entradas)}
          </p>
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Saídas do dia</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(saidas)}
          </p>
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Saldo do dia</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(entradas - saidas)}
          </p>
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Lucro do dia</p>
          {/* Dia de prejuízo existe (o lucro desconta custo de aquisição e as
              saídas lançadas à mão) e precisa parecer prejuízo — daí o
              <Valor>, o mesmo dos cartões do Início. */}
          <p>
            <Valor valor={totalLucro} className="text-destaque font-semibold" />
          </p>
        </div>
      </div>

      {porFormaPagamento.length > 0 && (
        <section>
          <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">
            Formas de recebimento
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {porFormaPagamento.map(([forma, valor]) => (
              <div key={forma} className="sakura-card px-4 py-3">
                <p className="text-rotulo text-sakura-muted">{forma}</p>
                <p className="text-destaque font-semibold text-sakura-purple-dark">
                  {formatarMoeda(valor)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {movimentosDoDia.length === 0 ? (
        <p className="text-corpo text-sakura-muted">Nenhuma movimentação neste dia.</p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="w-full text-left text-corpo">
            <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
              <tr>
                <th className="px-4 py-3 font-medium">Horário</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Forma de pagamento</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Lucro</th>
              </tr>
            </thead>
            <tbody>
              {movimentosDoDia.map((m) => {
                const lucro = lucrosPorMovimento.get(m.id) ?? null;
                return (
                  <tr key={m.id} className="border-t border-sakura-gray/20">
                    <td className="px-4 py-3">
                      {new Date(m.data).toLocaleTimeString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      {m.ordem_servico_id
                        ? m.ordem_servico?.numero
                          ? nomeOrdem(m.ordem_servico.numero, m.ordem_servico.tipo)
                          : "OS"
                        : m.categoria?.nome || m.descricao || "Lançamento manual"}
                      {idsDepoisDoFechamento.has(m.id) && (
                        <span
                          className="ml-2 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-meta text-amber-800"
                          title="Entrou depois de o caixa do dia ser fechado — não estava na gaveta quando ela foi contada."
                        >
                          depois do fechamento
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{m.ordem_servico?.cliente?.nome ?? "—"}</td>
                    <td className="px-4 py-3">{m.forma_pagamento || "—"}</td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        m.tipo === "saida" ? "text-red-700" : ""
                      }`}
                    >
                      {m.tipo === "saida" ? "− " : ""}
                      {formatarMoeda(m.valor)}
                    </td>
                    <td className="px-4 py-3">
                      {lucro !== null ? <Valor valor={lucro} classeDeCor="" /> : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-sakura-gray/30 bg-sakura-pink-soft/50 font-semibold text-sakura-purple-dark">
                <td className="px-4 py-3" colSpan={4}>
                  Total do dia
                </td>
                <td className="px-4 py-3">
                  <Valor valor={entradas - saidas} classeDeCor="" />
                </td>
                <td className="px-4 py-3">
                  <Valor valor={totalLucro} classeDeCor="" />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
