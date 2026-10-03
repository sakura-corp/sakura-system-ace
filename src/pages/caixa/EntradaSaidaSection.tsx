import { useMemo, useState } from "react";
import {
  movimentosManuais,
  movimentosSemCategoria,
  resumirSemCategoria,
} from "@/schemas/caixa";
import { formatarMoeda } from "@/schemas/dinheiro";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { MovimentoCaixa, NovoMovimentoCaixa, TipoCaixa } from "@/types/caixa";
import { CaixaForm } from "./CaixaForm";
import { CategorizarSemCategoria } from "./CategorizarSemCategoria";

interface EntradaSaidaSectionProps {
  tipo: TipoCaixa;
  movimentos: MovimentoCaixa[];
  categorias: CategoriaCaixa[];
  onSalvar: (movimento: NovoMovimentoCaixa) => Promise<void>;
  /** Recarrega o caixa depois de mexer no histórico já gravado. */
  onAtualizado: () => Promise<void>;
}

export function EntradaSaidaSection({
  tipo,
  movimentos,
  categorias,
  onSalvar,
  onAtualizado,
}: EntradaSaidaSectionProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarCategorizar, setMostrarCategorizar] = useState(false);
  const rotulo = tipo === "entrada" ? "entrada" : "saída";

  const manuais = useMemo(() => movimentosManuais(movimentos, tipo), [movimentos, tipo]);

  const semCategoria = useMemo(
    () => movimentosSemCategoria(movimentos, tipo),
    [movimentos, tipo],
  );

  const resumoSemCategoria = useMemo(
    () => resumirSemCategoria(movimentos, tipo),
    [movimentos, tipo],
  );

  const categoriasDoTipo = useMemo(
    () => categorias.filter((c) => c.tipo === tipo),
    [categorias, tipo],
  );

  const total = manuais.reduce((soma, m) => soma + m.valor, 0);

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const m of manuais) {
      const nome = m.categoria?.nome ?? "Sem categoria";
      mapa.set(nome, (mapa.get(nome) ?? 0) + m.valor);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [manuais]);

  async function handleSalvar(movimento: NovoMovimentoCaixa) {
    await onSalvar(movimento);
    setMostrarFormulario(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-corpo text-sakura-muted">
          Lançamentos manuais de {rotulo} — não inclui faturamento de OS, que já aparece na
          aba Diário
        </p>
        {!mostrarFormulario && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90"
          >
            + Nova {rotulo}
          </button>
        )}
      </div>

      {mostrarFormulario && (
        <CaixaForm
          categorias={categorias}
          tipoInicial={tipo}
          tipoBloqueado
          onSalvar={handleSalvar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {resumoSemCategoria.quantidade > 0 && !mostrarCategorizar && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-950/40 px-4 py-3">
          <p className="text-corpo text-amber-200">
            {resumoSemCategoria.quantidade === 1
              ? "1 lançamento antigo está sem categoria"
              : `${resumoSemCategoria.quantidade} lançamentos antigos estão sem categoria`}
            , somando {formatarMoeda(resumoSemCategoria.total)} — eles ficam de fora do
            resumo por categoria.
          </p>
          <button
            onClick={() => setMostrarCategorizar(true)}
            disabled={categoriasDoTipo.length === 0}
            className="rounded-xl bg-sakura-purple px-4 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            Categorizar agora
          </button>
        </div>
      )}

      {mostrarCategorizar && (
        <CategorizarSemCategoria
          tipo={tipo}
          movimentos={semCategoria}
          categorias={categoriasDoTipo}
          onConcluir={async () => {
            await onAtualizado();
            setMostrarCategorizar(false);
          }}
          onCancelar={() => setMostrarCategorizar(false)}
        />
      )}

      <div className="sakura-card p-4">
        <p className="text-rotulo text-sakura-muted">Total de {rotulo}s (todo o período)</p>
        <p className="text-destaque font-semibold text-sakura-purple-dark">{formatarMoeda(total)}</p>
      </div>

      {porCategoria.length > 0 && (
        <section>
          <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">Por categoria</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {porCategoria.map(([nome, valor]) => (
              <div key={nome} className="sakura-card px-4 py-3">
                <p className="text-rotulo text-sakura-muted">{nome}</p>
                <p className="text-destaque font-semibold text-sakura-purple-dark">
                  {formatarMoeda(valor)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {manuais.length === 0 ? (
        <p className="text-corpo text-sakura-muted">Nenhum lançamento manual de {rotulo} ainda.</p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="w-full text-left text-corpo">
            <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Forma de pagamento</th>
                <th className="px-4 py-3 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {manuais.map((m) => (
                <tr key={m.id} className="border-t border-sakura-gray/20">
                  <td className="px-4 py-3">{new Date(m.data).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">{m.categoria?.nome ?? "—"}</td>
                  <td className="px-4 py-3">{m.descricao || "—"}</td>
                  <td className="px-4 py-3">{m.forma_pagamento || "—"}</td>
                  <td className="px-4 py-3 font-medium">{formatarMoeda(m.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
