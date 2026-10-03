import { useEffect, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useAuth } from "@/contexts/AuthContext";
import { listarCategoriasCaixa } from "@/lib/categoriasCaixa";
import {
  criarContaPagar,
  desfazerPagamento,
  excluirContaPagar,
  listarContasPagar,
  pagarConta,
} from "@/lib/contasPagar";
import { mensagemDeErro } from "@/lib/errors";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { ContaPagar, NovaContaPagar } from "@/types/contaPagar";
import { ContaPagarForm } from "./ContaPagarForm";
import { PagarContaModal } from "./PagarContaModal";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(
    hoje.getDate(),
  ).padStart(2, "0")}`;
}

export function ContasPagarPage() {
  const { operador, lojaAtual } = useAuth();
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [categorias, setCategorias] = useState<CategoriaCaixa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [contaPagando, setContaPagando] = useState<ContaPagar | null>(null);

  async function carregar() {
    if (!lojaAtual) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const [listaContas, listaCategorias] = await Promise.all([
        listarContasPagar(lojaAtual.id),
        listarCategoriasCaixa(),
      ]);
      setContas(listaContas);
      setCategorias(listaCategorias);
    } catch (err) {
      console.error("Erro ao carregar contas a pagar:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  async function handleCadastrar(conta: NovaContaPagar) {
    if (!lojaAtual) return;
    await criarContaPagar(conta, lojaAtual.id);
    setMostrarFormulario(false);
    await carregar();
  }

  async function handleConfirmarPagamento(valorPago: number, formaPagamento: string) {
    if (!contaPagando || !operador) return;
    await pagarConta({
      conta: contaPagando,
      valorPago,
      formaPagamento,
      operadorId: operador.id,
    });
    setContaPagando(null);
    await carregar();
  }

  async function handleExcluir(conta: ContaPagar) {
    if (!confirm(`Excluir a conta "${conta.descricao}"?`)) return;
    try {
      await excluirContaPagar(conta.id);
      await carregar();
    } catch (err) {
      console.error("Erro ao excluir conta a pagar:", err);
      setErro(mensagemDeErro(err));
    }
  }

  async function handleDesfazerPagamento(conta: ContaPagar) {
    if (
      !confirm(
        `Desfazer o pagamento de "${conta.descricao}"? A conta volta a ficar pendente e a Saída lançada no Caixa será removida.`,
      )
    )
      return;
    try {
      await desfazerPagamento(conta);
      await carregar();
    } catch (err) {
      console.error("Erro ao desfazer pagamento:", err);
      setErro(mensagemDeErro(err));
    }
  }

  const hoje = hojeIso();
  const pendentes = contas
    .filter((c) => c.status === "pendente")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const pagas = contas
    .filter((c) => c.status === "paga")
    .sort((a, b) => b.vencimento.localeCompare(a.vencimento));
  const totalPendente = pendentes.reduce((soma, c) => soma + c.valor, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BotaoVoltar />
          <div>
            <h1 className="text-titulo font-semibold text-sakura-purple-dark">Contas a Pagar</h1>
            <p className="text-corpo text-sakura-muted">
              Contas mensais (aluguel, etc.) com vencimento — diferente das Entradas/Saídas
              manuais do Caixa
            </p>
          </div>
        </div>
        {!mostrarFormulario && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90"
          >
            + Nova conta
          </button>
        )}
      </header>

      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>}

      {mostrarFormulario && (
        <ContaPagarForm
          categorias={categorias}
          onSalvar={handleCadastrar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {!carregando && (
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Total pendente</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totalPendente)}
          </p>
        </div>
      )}

      {carregando ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">Pendentes</h2>
            {pendentes.length === 0 ? (
              <p className="text-corpo text-sakura-muted">Nenhuma conta pendente.</p>
            ) : (
              <div className="overflow-x-auto sakura-card">
                <table className="w-full text-left text-corpo">
                  <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                    <tr>
                      <th className="px-4 py-3 font-medium">Vencimento</th>
                      <th className="px-4 py-3 font-medium">Descrição</th>
                      <th className="px-4 py-3 font-medium">Categoria</th>
                      <th className="px-4 py-3 font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {pendentes.map((conta) => {
                      const vencida = conta.vencimento < hoje;
                      return (
                        <tr key={conta.id} className="border-t border-sakura-gray/20">
                          <td className="px-4 py-3">
                            {new Date(conta.vencimento).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-3">
                            {conta.descricao}
                            {conta.recorrente && (
                              <span className="ml-2 rounded-full bg-sakura-pink-soft px-2 py-0.5 text-rotulo text-sakura-purple-dark/90">
                                mensal
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">{conta.categoria?.nome ?? "—"}</td>
                          <td className="px-4 py-3 font-medium">{formatarMoeda(conta.valor)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-rotulo font-medium ${
                                vencida
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {vencida ? "Vencida" : "Pendente"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <AcoesDaLinha
                              descricao={`a conta ${conta.descricao}`}
                              acoes={[
                                {
                                  tipo: "texto",
                                  rotulo: "Marcar como paga",
                                  aoClicar: () => setContaPagando(conta),
                                },
                                {
                                  tipo: "menu",
                                  rotulo: "Excluir conta",
                                  perigosa: true,
                                  aoClicar: () => handleExcluir(conta),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {pagas.length > 0 && (
            <section>
              <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">
                Pagas recentemente
              </h2>
              <div className="overflow-x-auto sakura-card">
                <table className="w-full text-left text-corpo">
                  <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                    <tr>
                      <th className="px-4 py-3 font-medium">Vencimento</th>
                      <th className="px-4 py-3 font-medium">Descrição</th>
                      <th className="px-4 py-3 font-medium">Categoria</th>
                      <th className="px-4 py-3 font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium">Pago em</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {pagas.map((conta) => (
                      <tr key={conta.id} className="border-t border-sakura-gray/20">
                        <td className="px-4 py-3">
                          {new Date(conta.vencimento).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3">{conta.descricao}</td>
                        <td className="px-4 py-3">{conta.categoria?.nome ?? "—"}</td>
                        <td className="px-4 py-3 font-medium">{formatarMoeda(conta.valor)}</td>
                        <td className="px-4 py-3">
                          {conta.data_pagamento
                            ? new Date(conta.data_pagamento).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDesfazerPagamento(conta)}
                            className="text-rotulo font-medium text-sakura-purple hover:underline"
                          >
                            Desfazer pagamento
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {contaPagando && (
        <PagarContaModal
          conta={contaPagando}
          onConfirmar={handleConfirmarPagamento}
          onFechar={() => setContaPagando(null)}
        />
      )}
    </div>
  );
}
