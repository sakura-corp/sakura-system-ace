import { useEffect, useState } from "react";
import { Check, Plus, Repeat, Undo2 } from "lucide-react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Botao } from "@/components/Botao";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Selo } from "@/components/Selo";
import { Valor } from "@/components/Valor";
import { useAuth } from "@/contexts/AuthContext";
import { listarCategoriasCaixa } from "@/lib/categoriasCaixa";
import {
  criarContaPagar,
  desfazerPagamento,
  excluirContaPagar,
  listarContasPagar,
  pagarConta,
} from "@/lib/contasPagar";
import { avisar } from "@/lib/avisoQueSome";
import { diaBrasileiro, hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { ContaPagar, NovaContaPagar } from "@/types/contaPagar";
import { ContaPagarForm } from "./ContaPagarForm";
import { PagarContaModal } from "./PagarContaModal";
import { SeloDoVencimento } from "./SeloDoVencimento";
import { situacaoDoVencimento } from "./vencimento";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";
import { formatarMoeda, somar } from "@/schemas/dinheiro";
import { AvisoDeErro } from "@/components/Aviso";

export function ContasPagarPage() {
  const { operador, lojaAtual } = useAuth();
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [categorias, setCategorias] = useState<CategoriaCaixa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [contaPagando, setContaPagando] = useState<ContaPagar | null>(null);
  // Só a carga mais nova mexe na tela (#927).
  const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaAtual?.id);

  async function carregar() {
    const carga = comecar(lojaAtual?.id);
    if (!carga) {
      if (!lojaAtual) setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const [listaContas, listaCategorias] = await Promise.all([
        listarContasPagar(carga.lojaId),
        listarCategoriasCaixa(),
      ]);
      if (!carga.aindaEhAtual()) return;
      setContas(listaContas);
      setCategorias(listaCategorias);
      carga.gravou();
    } catch (err) {
      if (!carga.aindaEhAtual()) return;
      console.error("Erro ao carregar contas a pagar:", err);
      setErro(mensagemDeErro(err));
    } finally {
      if (carga.aindaEhAtual()) setCarregando(false);
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
    avisar(`Conta cadastrada: ${conta.descricao}`);
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
    avisar(`Conta paga: ${contaPagando.descricao}`);
    setContaPagando(null);
    await carregar();
  }

  async function handleExcluir(conta: ContaPagar) {
    if (!confirm(`Excluir a conta "${conta.descricao}"?`)) return;
    try {
      await excluirContaPagar(conta.id);
      avisar(`Conta excluída: ${conta.descricao}`);
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
      avisar(`Pagamento desfeito: ${conta.descricao}`);
      await carregar();
    } catch (err) {
      console.error("Erro ao desfazer pagamento:", err);
      setErro(mensagemDeErro(err));
    }
  }

  const hoje = hojeLocal();
  const pendentes = contas
    .filter((c) => c.status === "pendente")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const pagas = contas
    .filter((c) => c.status === "paga")
    .sort((a, b) => b.vencimento.localeCompare(a.vencimento));
  const totalPendente = somar(pendentes.map((c) => c.valor));
  // Só a contagem, pro selo ao lado de "Pendentes": nenhum valor novo.
  const quantasAtrasadas = pendentes.filter(
    (c) => situacaoDoVencimento(c.vencimento, hoje) === "atrasada",
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <BotaoVoltar />
          <div className="min-w-0">
            <h1 className="text-titulo font-semibold text-texto">Contas a Pagar</h1>
            <p className="text-corpo text-texto-2">
              Contas mensais (aluguel, etc.) com vencimento — diferente das Entradas/Saídas
              manuais do Caixa
            </p>
          </div>
        </div>
        {!mostrarFormulario && (
          <Botao variante="principal" icone={<Plus />} onClick={() => setMostrarFormulario(true)}>
            Nova conta
          </Botao>
        )}
      </header>

      {erro && (
        <AvisoDeErro>{erro}</AvisoDeErro>
      )}

      {mostrarFormulario && (
        <ContaPagarForm
          categorias={categorias}
          onSalvar={handleCadastrar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {!carregando && dadosSaoDaLoja && (
        <div className="max-w-sm">
          <CartaoNumero
            titulo="Total pendente"
            explicacao="A soma das contas que ainda não foram pagas, vencidas ou não. As pagas ficam de fora."
          >
            <Valor valor={totalPendente} />
          </CartaoNumero>
        </div>
      )}

      {carregando ? (
        <p className="text-corpo text-texto-2">Carregando...</p>
      ) : !dadosSaoDaLoja ? null : (
        <>
          <section>
            <h2 className="mb-3 flex flex-wrap items-center gap-2 text-corpo font-semibold text-texto">
              Pendentes
              {quantasAtrasadas > 0 && (
                <Selo
                  tipo="perigo"
                  palavra={quantasAtrasadas === 1 ? "1 atrasada" : `${quantasAtrasadas} atrasadas`}
                />
              )}
            </h2>
            {pendentes.length === 0 ? (
              <p className="text-corpo text-texto-2">Nenhuma conta pendente.</p>
            ) : (
              <div className="overflow-x-auto sakura-card">
                <table className="sakura-tabela">
                  <thead>
                    <tr>
                      <th>Vencimento</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th className="text-right">Valor</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendentes.map((conta) => (
                      <tr key={conta.id}>
                        <td className="whitespace-nowrap text-texto">
                          {diaBrasileiro(conta.vencimento)}
                        </td>
                        <td className="text-texto">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-medium [overflow-wrap:anywhere]">
                              {conta.descricao}
                            </span>
                            {conta.recorrente && (
                              <Selo tipo="neutro" palavra="Mensal" icone={Repeat} />
                            )}
                          </span>
                        </td>
                        <td className="text-texto-2">{conta.categoria?.nome ?? "—"}</td>
                        <td className="whitespace-nowrap text-right font-semibold text-texto">
                          {formatarMoeda(conta.valor)}
                        </td>
                        <td>
                          <SeloDoVencimento vencimento={conta.vencimento} hoje={hoje} />
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <Botao
                              tamanho="pequeno"
                              icone={<Check />}
                              aria-label={`Marcar como paga — a conta ${conta.descricao}`}
                              onClick={() => setContaPagando(conta)}
                            >
                              Marcar como paga
                            </Botao>
                            <AcoesDaLinha
                              descricao={`a conta ${conta.descricao}`}
                              acoes={[
                                {
                                  tipo: "menu",
                                  rotulo: "Excluir conta",
                                  perigosa: true,
                                  aoClicar: () => handleExcluir(conta),
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {pagas.length > 0 && (
            <section>
              <h2 className="mb-3 text-corpo font-semibold text-texto">Pagas recentemente</h2>
              <div className="overflow-x-auto sakura-card">
                <table className="sakura-tabela">
                  <thead>
                    <tr>
                      <th>Vencimento</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th className="text-right">Valor</th>
                      {/* Era "Pago em": o dia continua, dentro do selo. */}
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagas.map((conta) => (
                      <tr key={conta.id}>
                        <td className="whitespace-nowrap text-texto-2">
                          {diaBrasileiro(conta.vencimento)}
                        </td>
                        <td className="text-texto [overflow-wrap:anywhere]">{conta.descricao}</td>
                        <td className="text-texto-2">{conta.categoria?.nome ?? "—"}</td>
                        <td className="whitespace-nowrap text-right font-semibold text-texto">
                          {formatarMoeda(conta.valor)}
                        </td>
                        <td>
                          {/* `data_pagamento` é data COM hora (timestamptz): o
                              `new Date` está certo aqui (#1005, "ficam como estão"). */}
                          <Selo
                            tipo="ok"
                            palavra={
                              conta.data_pagamento
                                ? `Paga em ${new Date(conta.data_pagamento).toLocaleDateString("pt-BR")}`
                                : "Paga"
                            }
                          />
                        </td>
                        <td className="text-right">
                          {/* Fantasma, e não escondido nos três pontos: é a
                              única ação da linha, e desfazer um engano não
                              pode dar trabalho de achar. */}
                          <Botao
                            variante="fantasma"
                            tamanho="pequeno"
                            icone={<Undo2 />}
                            aria-label={`Desfazer pagamento — a conta ${conta.descricao}`}
                            onClick={() => handleDesfazerPagamento(conta)}
                          >
                            Desfazer pagamento
                          </Botao>
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
          hoje={hoje}
          onConfirmar={handleConfirmarPagamento}
          onFechar={() => setContaPagando(null)}
        />
      )}
    </div>
  );
}
