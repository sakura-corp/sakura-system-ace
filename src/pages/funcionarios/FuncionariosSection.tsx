import { useState } from "react";
import { mensagemDeErro } from "@/lib/errors";
import { atualizarFuncionario, criarFuncionario } from "@/lib/funcionarios";
import type { Funcionario, NovoFuncionario, NovoFuncionarioFilho } from "@/types/funcionario";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";
import { Botao } from "@/components/Botao";
import { Selo } from "@/components/Selo";
import { Aviso } from "@/components/Aviso";
import { FuncionarioForm } from "./FuncionarioForm";

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
          <Botao variante="principal" onClick={() => setFormulario("novo")}>
            + Novo funcionário
          </Botao>
        </div>
      )}

      {formulario && (
        <FuncionarioForm
          funcionarioExistente={formulario === "novo" ? undefined : formulario}
          onSalvar={handleSalvar}
          onCancelar={() => setFormulario(null)}
        />
      )}

      {erro && <Aviso tipo="perigo" role="alert">{erro}</Aviso>}

      {funcionarios.length === 0 ? (
        <p className="text-corpo text-texto-2">Nenhum funcionário cadastrado ainda.</p>
      ) : (
        <div className="sakura-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="sakura-tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Cargo</th>
                  <th>Login</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.map((funcionario) => (
                  <tr key={funcionario.id}>
                    <td className="font-medium text-texto">{funcionario.nome}</td>
                    <td>{funcionario.cargo || <span className="text-texto-2">—</span>}</td>
                    <td>
                      {funcionario.operador?.usuario ? (
                        `@${funcionario.operador.usuario}`
                      ) : (
                        <span className="text-texto-2">—</span>
                      )}
                    </td>
                    <td>
                      {funcionario.ativo ? (
                        <Selo tipo="ok" palavra="Ativo" />
                      ) : (
                        <Selo tipo="neutro" palavra="Inativo" />
                      )}
                    </td>
                    <td className="text-right">
                      {/* O próximo passo à vista ("Editar"); inativar e reativar
                          vão pro botão de três pontos (regra da tabela). */}
                      <AcoesDaLinha
                        descricao={`o funcionário ${funcionario.nome}`}
                        acoes={[
                          { tipo: "texto", rotulo: "Editar", aoClicar: () => setFormulario(funcionario) },
                          {
                            tipo: "menu",
                            rotulo: funcionario.ativo ? "Inativar" : "Reativar",
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
        </div>
      )}
    </div>
  );
}
