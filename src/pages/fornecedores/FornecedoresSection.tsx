import { useState } from "react";
import { mensagemDeErro } from "@/lib/errors";
import {
  atualizarFornecedor,
  atualizarStatusFornecedor,
  criarFornecedor,
  excluirFornecedor,
} from "@/lib/fornecedores";
import type { Fornecedor, NovoFornecedor } from "@/types/fornecedor";
import { FornecedorForm } from "./FornecedorForm";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";

interface FornecedoresSectionProps {
  fornecedores: Fornecedor[];
  onRecarregar: () => Promise<void>;
}

export function FornecedoresSection({ fornecedores, onRecarregar }: FornecedoresSectionProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<"novo" | Fornecedor | null>(null);

  async function handleSalvar(fornecedor: NovoFornecedor) {
    if (formulario && formulario !== "novo") {
      await atualizarFornecedor(formulario.id, fornecedor);
    } else {
      await criarFornecedor(fornecedor);
    }
    setFormulario(null);
    await onRecarregar();
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir este fornecedor?")) return;
    try {
      await excluirFornecedor(id);
      await onRecarregar();
    } catch (err) {
      console.error("Erro ao excluir fornecedor:", err);
      const mensagem = mensagemDeErro(err);
      setErro(
        mensagem.includes("pedidos_compra")
          ? "Não é possível excluir esse fornecedor porque ele já tem Pedidos de Compra vinculados."
          : mensagem,
      );
    }
  }

  async function handleAlternarStatus(fornecedor: Fornecedor) {
    try {
      await atualizarStatusFornecedor(fornecedor.id, !fornecedor.ativo);
      await onRecarregar();
    } catch (err) {
      console.error("Erro ao atualizar status do fornecedor:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <div className="space-y-6">
      {!formulario && (
        <div className="flex justify-end">
          <button
            onClick={() => setFormulario("novo")}
            className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90"
          >
            + Novo fornecedor
          </button>
        </div>
      )}

      {formulario && (
        <FornecedorForm
          fornecedorExistente={formulario === "novo" ? undefined : formulario}
          onSalvar={handleSalvar}
          onCancelar={() => setFormulario(null)}
        />
      )}

      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>}

      {fornecedores.length === 0 ? (
        <p className="text-corpo text-sakura-muted">Nenhum fornecedor cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="w-full text-left text-corpo">
            <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">CNPJ</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Cidade/UF</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {fornecedores.map((fornecedor) => (
                <tr key={fornecedor.id} className="border-t border-sakura-gray/20">
                  <td className="px-4 py-3">{fornecedor.nome}</td>
                  <td className="px-4 py-3">{fornecedor.cnpj || "—"}</td>
                  <td className="px-4 py-3">{fornecedor.telefone || "—"}</td>
                  <td className="px-4 py-3">
                    {fornecedor.cidade ? `${fornecedor.cidade}/${fornecedor.uf ?? ""}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-rotulo font-medium ${
                        fornecedor.ativo
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-sakura-gray/20 text-sakura-muted"
                      }`}
                    >
                      {fornecedor.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AcoesDaLinha
                      descricao={`o fornecedor ${fornecedor.nome}`}
                      acoes={[
                        { tipo: "editar", aoClicar: () => setFormulario(fornecedor) },
                        {
                          tipo: fornecedor.ativo ? "inativar" : "reativar",
                          aoClicar: () => handleAlternarStatus(fornecedor),
                        },
                        {
                          tipo: "menu",
                          rotulo: "Excluir fornecedor",
                          perigosa: true,
                          aoClicar: () => handleExcluir(fornecedor.id),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
