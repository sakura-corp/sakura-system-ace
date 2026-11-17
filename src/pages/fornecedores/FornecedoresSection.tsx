import { useState } from "react";
import { mensagemDeErro } from "@/lib/errors";
import { useRolarAteOFormulario } from "@/hooks/useRolarAteOFormulario";
import {
  atualizarFornecedor,
  atualizarStatusFornecedor,
  criarFornecedor,
  excluirFornecedor,
} from "@/lib/fornecedores";
import type { Fornecedor, NovoFornecedor } from "@/types/fornecedor";
import { FornecedorForm } from "./FornecedorForm";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";
import { Botao } from "@/components/Botao";
import { Selo } from "@/components/Selo";
import { AvisoDeErro } from "@/components/Aviso";

interface FornecedoresSectionProps {
  fornecedores: Fornecedor[];
  onRecarregar: () => Promise<void>;
}

export function FornecedoresSection({ fornecedores, onRecarregar }: FornecedoresSectionProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<"novo" | Fornecedor | null>(null);
  const caixaDoFormulario = useRolarAteOFormulario(
    formulario === "novo" ? "novo" : (formulario?.id ?? null),
  );

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
          <Botao variante="principal" onClick={() => setFormulario("novo")}>
            + Novo fornecedor
          </Botao>
        </div>
      )}

      {formulario && (
        <div ref={caixaDoFormulario} className="scroll-mt-4">
          {/* key: a lista fica na tela com o formulário aberto, e sem ela trocar
              de canetinha mantinha os valores do anterior (defaultValues só
              valem na montagem); salvar gravava esses dados no outro (#969). */}
          <FornecedorForm
            key={formulario === "novo" ? "novo" : formulario.id}
            fornecedorExistente={formulario === "novo" ? undefined : formulario}
            onSalvar={handleSalvar}
            onCancelar={() => setFormulario(null)}
          />
        </div>
      )}

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      {fornecedores.length === 0 ? (
        <p className="text-corpo text-texto-2">Nenhum fornecedor cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="sakura-tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CNPJ</th>
                <th>Telefone</th>
                <th>Cidade/UF</th>
                <th>Status</th>
                <th className="relative">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {fornecedores.map((fornecedor) => (
                <tr key={fornecedor.id}>
                  <td className="font-medium">{fornecedor.nome}</td>
                  <td className="whitespace-nowrap text-texto-2">{fornecedor.cnpj || "—"}</td>
                  <td className="whitespace-nowrap text-texto-2">{fornecedor.telefone || "—"}</td>
                  <td className="text-texto-2">
                    {fornecedor.cidade ? `${fornecedor.cidade}/${fornecedor.uf ?? ""}` : "—"}
                  </td>
                  <td>
                    <Selo
                      tipo={fornecedor.ativo ? "ok" : "neutro"}
                      palavra={fornecedor.ativo ? "Ativo" : "Inativo"}
                    />
                  </td>
                  <td className="text-right">
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
