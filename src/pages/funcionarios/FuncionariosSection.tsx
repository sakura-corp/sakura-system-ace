import { useState } from "react";
import { mensagemDeErro } from "@/lib/errors";
import { atualizarFuncionario, criarFuncionario } from "@/lib/funcionarios";
import type { Funcionario, NovoFuncionario, NovoFuncionarioFilho } from "@/types/funcionario";
import { FuncionarioForm } from "./FuncionarioForm";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";

interface FuncionariosSectionProps {
  funcionarios: Funcionario[];
  lojaId: string;
  onRecarregar: () => Promise<void>;
}

export function FuncionariosSection({
  funcionarios,
  lojaId,
  onRecarregar,
}: FuncionariosSectionProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<"novo" | Funcionario | null>(null);

  async function handleSalvar(funcionario: NovoFuncionario, filhos: NovoFuncionarioFilho[]) {
    if (formulario && formulario !== "novo") {
      await atualizarFuncionario(formulario.id, funcionario, filhos);
    } else {
      await criarFuncionario(funcionario, lojaId, filhos);
    }
    setFormulario(null);
    await onRecarregar();
  }

  async function handleAlternarStatus(funcionario: Funcionario) {
    try {
      await atualizarFuncionario(funcionario.id, { ativo: !funcionario.ativo });
      await onRecarregar();
    } catch (err) {
      console.error("Erro ao atualizar status do funcionário:", err);
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
            + Novo funcionário
          </button>
        </div>
      )}

      {formulario && (
        <FuncionarioForm
          funcionarioExistente={formulario === "novo" ? undefined : formulario}
          onSalvar={handleSalvar}
          onCancelar={() => setFormulario(null)}
        />
      )}

      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>}

      {funcionarios.length === 0 ? (
        <p className="text-corpo text-sakura-muted">Nenhum funcionário cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="w-full text-left text-corpo">
            <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Cargo</th>
                <th className="px-4 py-3 font-medium">Login</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {funcionarios.map((funcionario) => (
                <tr key={funcionario.id} className="border-t border-sakura-gray/20">
                  <td className="px-4 py-3">{funcionario.nome}</td>
                  <td className="px-4 py-3">{funcionario.cargo || "—"}</td>
                  <td className="px-4 py-3">
                    {funcionario.operador?.usuario ? `@${funcionario.operador.usuario}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-rotulo font-medium ${
                        funcionario.ativo
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-sakura-gray/20 text-sakura-muted"
                      }`}
                    >
                      {funcionario.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AcoesDaLinha
                      descricao={`o funcionário ${funcionario.nome}`}
                      acoes={[
                        { tipo: "editar", aoClicar: () => setFormulario(funcionario) },
                        {
                          tipo: funcionario.ativo ? "inativar" : "reativar",
                          aoClicar: () => handleAlternarStatus(funcionario),
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
