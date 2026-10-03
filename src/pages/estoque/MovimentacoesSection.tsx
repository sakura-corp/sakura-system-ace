import { useState } from "react";
import { Combobox } from "@/components/Combobox";
import { criarMovimento } from "@/lib/estoque";
import type { Deposito } from "@/types/deposito";
import type { MovimentoEstoque, NovoMovimentoEstoque } from "@/types/estoque";
import type { Peca } from "@/types/peca";
import { MovimentoForm } from "./MovimentoForm";

interface MovimentacoesSectionProps {
  pecas: Peca[];
  movimentos: MovimentoEstoque[];
  depositos: Deposito[];
  lojaId: string;
  onRecarregar: () => Promise<void>;
}

const motivoLabel: Record<string, string> = {
  compra: "Compra",
  venda: "Venda",
  ajuste: "Ajuste manual",
  uso_em_os: "Uso em OS",
};

export function MovimentacoesSection({
  pecas,
  movimentos,
  depositos,
  lojaId,
  onRecarregar,
}: MovimentacoesSectionProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroPecaId, setFiltroPecaId] = useState("");

  async function handleSalvar(movimento: NovoMovimentoEstoque) {
    await criarMovimento(movimento, lojaId);
    await onRecarregar();
  }

  const movimentosFiltrados = filtroPecaId
    ? movimentos.filter((m) => m.peca_id === filtroPecaId)
    : movimentos;

  return (
    <div className="space-y-6">
      {pecas.length === 0 ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          Cadastre ao menos um produto na aba "Produtos" antes de registrar
          movimentações de estoque.
        </p>
      ) : (
        !mostrarFormulario && (
          <div className="flex justify-end">
            <button
              onClick={() => setMostrarFormulario(true)}
              className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90"
            >
              + Registrar movimentação
            </button>
          </div>
        )
      )}

      {mostrarFormulario && (
        <MovimentoForm
          pecas={pecas}
          depositos={depositos}
          onSalvar={handleSalvar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-corpo font-semibold text-sakura-purple-dark">
            Histórico de movimentações
          </h2>
          {movimentos.length > 0 && (
            <label className="flex items-center gap-2 text-corpo">
              <span className="text-sakura-purple-dark/80">Produto</span>
              <Combobox
                className="w-56"
                opcoes={pecas.map((peca) => ({ valor: peca.id, rotulo: peca.descricao }))}
                valor={filtroPecaId}
                onMudar={setFiltroPecaId}
                opcaoVazia="Todos"
                placeholder="Todos"
              />
            </label>
          )}
        </div>

        {movimentosFiltrados.length === 0 ? (
          <p className="text-corpo text-sakura-muted">
            {movimentos.length === 0
              ? "Nenhuma movimentação registrada ainda."
              : "Nenhuma movimentação para este produto."}
          </p>
        ) : (
          <div className="overflow-x-auto sakura-card">
            <table className="w-full text-left text-corpo">
              <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Depósito</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Quantidade</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Referência</th>
                </tr>
              </thead>
              <tbody>
                {movimentosFiltrados.map((movimento) => {
                  const peca = pecas.find((p) => p.id === movimento.peca_id);
                  const deposito = depositos.find((d) => d.id === movimento.deposito_id);
                  return (
                    <tr key={movimento.id} className="border-t border-sakura-gray/20">
                      <td className="px-4 py-3">
                        {new Date(movimento.criado_em).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">{peca?.descricao ?? "—"}</td>
                      <td className="px-4 py-3">{deposito?.nome ?? "—"}</td>
                      <td className="px-4 py-3">
                        {movimento.tipo === "entrada" ? "Entrada" : "Saída"}
                      </td>
                      <td className="px-4 py-3">{movimento.quantidade}</td>
                      <td className="px-4 py-3">{motivoLabel[movimento.motivo]}</td>
                      <td className="px-4 py-3">{movimento.referencia || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
