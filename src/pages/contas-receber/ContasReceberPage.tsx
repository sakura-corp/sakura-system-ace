import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { useAuth } from "@/contexts/AuthContext";
import { listarClientes } from "@/lib/clientes";
import { criarContaReceber, listarContasReceber, receberConta } from "@/lib/contasReceber";
import { mensagemDeErro } from "@/lib/errors";
import {
  listarModelosWhatsapp,
  registrarMensagemAberta,
  textoDoModelo,
  ultimasMensagensPorReferencia,
} from "@/lib/modelosWhatsapp";
import { preencherModelo } from "@/schemas/whatsapp";
import type { Cliente } from "@/types/cliente";
import type { ContaReceber, NovaContaReceber } from "@/types/contaReceber";
import { ContaReceberForm } from "./ContaReceberForm";
import { ReceberContaModal } from "./ReceberContaModal";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(
    hoje.getDate(),
  ).padStart(2, "0")}`;
}

export function ContasReceberPage() {
  const { operador, lojaAtual } = useAuth();
  const navigate = useNavigate();
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [contaRecebendo, setContaRecebendo] = useState<ContaReceber | null>(null);
  const [modelosWhatsapp, setModelosWhatsapp] = useState<Record<string, string>>({});
  // Quando cada conta teve a última cobrança ABERTA no WhatsApp. Responde a
  // pergunta que hoje mora só na memória de quem cobrou: "já falei com essa
  // pessoa?". Ver a tabela `whatsapp_mensagens` na migration 0052.
  const [ultimasCobrancas, setUltimasCobrancas] = useState<Map<string, string>>(new Map());

  async function carregar() {
    if (!lojaAtual) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const [listaContas, listaClientes, modelos, cobrancas] = await Promise.all([
        listarContasReceber(lojaAtual.id),
        listarClientes(),
        listarModelosWhatsapp(lojaAtual.id),
        ultimasMensagensPorReferencia(lojaAtual.id, "cobranca"),
      ]);
      setContas(listaContas);
      setClientes(listaClientes);
      setModelosWhatsapp(modelos);
      setUltimasCobrancas(cobrancas);
    } catch (err) {
      console.error("Erro ao carregar contas a receber:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  async function handleCadastrar(conta: NovaContaReceber) {
    if (!lojaAtual) return;
    await criarContaReceber(conta, lojaAtual.id);
    setMostrarFormulario(false);
    await carregar();
  }

  async function handleConfirmarRecebimento(valorRecebido: number, formaPagamento: string) {
    if (!contaRecebendo || !operador) return;
    await receberConta({
      conta: contaRecebendo,
      valorRecebido,
      formaPagamento,
      operadorId: operador.id,
    });
    setContaRecebendo(null);
    await carregar();
  }

  const hoje = hojeIso();
  const pendentes = contas
    .filter((c) => c.status === "pendente")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const recebidas = contas
    .filter((c) => c.status === "recebido")
    .sort((a, b) => b.vencimento.localeCompare(a.vencimento));
  const totalPendente = pendentes.reduce((soma, c) => soma + c.valor, 0);

  function textoDaCobranca(conta: ContaReceber): string {
    return preencherModelo(textoDoModelo(modelosWhatsapp, "cobranca"), {
      cliente: conta.cliente?.nome,
      valor: formatarMoeda(conta.valor),
      vencimento: new Date(conta.vencimento).toLocaleDateString("pt-BR"),
      descricao: conta.descricao,
      loja: lojaAtual?.nome,
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BotaoVoltar />
          <div>
            <h1 className="text-titulo font-semibold text-sakura-purple-dark">Contas a Receber</h1>
            <p className="text-corpo text-sakura-muted">
              Criadas sozinhas ao faturar uma OS escolhendo "a receber" — ou lançadas à mão,
              pra cobrança que não passou por OS
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
        <ContaReceberForm
          clientes={clientes}
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
              <p className="text-corpo text-sakura-muted">Nenhuma conta a receber pendente.</p>
            ) : (
              <div className="overflow-x-auto sakura-card">
                <table className="w-full text-left text-corpo">
                  <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                    <tr>
                      <th className="px-4 py-3 font-medium">Previsão</th>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Descrição</th>
                      <th className="px-4 py-3 font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {pendentes.map((conta) => {
                      const vencida = conta.vencimento < hoje;
                      const cliente = clientes.find((c) => c.id === conta.cliente_id);
                      const ultimaCobranca = ultimasCobrancas.get(conta.id);
                      return (
                        <tr
                          key={conta.id}
                          onClick={() =>
                            conta.ordem_servico_id &&
                            navigate("/ordens-servico", {
                              state: { abrirOrdemId: conta.ordem_servico_id },
                            })
                          }
                          className={`border-t border-sakura-gray/20 ${
                            conta.ordem_servico_id
                              ? "cursor-pointer hover:bg-sakura-pink-soft/30"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            {new Date(conta.vencimento).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-3">{conta.cliente?.nome ?? "—"}</td>
                          <td className="px-4 py-3">{conta.descricao}</td>
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
                            {/* O clique no botão não pode abrir a OS junto: a
                                linha inteira é clicável. */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-end gap-2"
                            >
                              {ultimaCobranca && (
                                <span
                                  className="text-rotulo text-sakura-muted"
                                  title="O sistema só sabe que a conversa foi aberta — se a mensagem foi mesmo enviada, só você sabe."
                                >
                                  cobrado em {new Date(ultimaCobranca).toLocaleDateString("pt-BR")}
                                </span>
                              )}
                              <BotaoWhatsapp
                                telefone={cliente?.telefone}
                                texto={textoDaCobranca(conta)}
                                rotulo="Cobrar"
                                titulo="Abrir a conversa no WhatsApp com a cobrança pronta"
                                aoAbrir={() => {
                                  if (!lojaAtual) return;
                                  registrarMensagemAberta(
                                    lojaAtual.id,
                                    "cobranca",
                                    conta.id,
                                    cliente?.telefone ?? null,
                                    operador?.id ?? null,
                                  ).then(carregar);
                                }}
                              />
                              <button
                                onClick={() => setContaRecebendo(conta)}
                                className="h-8 rounded-full bg-sakura-purple px-3 text-rotulo font-medium text-white hover:opacity-90"
                              >
                                Marcar como recebido
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {recebidas.length > 0 && (
            <section>
              <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">
                Recebidas recentemente
              </h2>
              <div className="overflow-x-auto sakura-card">
                <table className="w-full text-left text-corpo">
                  <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                    <tr>
                      <th className="px-4 py-3 font-medium">Previsão</th>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Descrição</th>
                      <th className="px-4 py-3 font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium">Recebido em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recebidas.map((conta) => (
                      <tr key={conta.id} className="border-t border-sakura-gray/20">
                        <td className="px-4 py-3">
                          {new Date(conta.vencimento).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3">{conta.cliente?.nome ?? "—"}</td>
                        <td className="px-4 py-3">{conta.descricao}</td>
                        <td className="px-4 py-3 font-medium">{formatarMoeda(conta.valor)}</td>
                        <td className="px-4 py-3">
                          {conta.data_recebimento
                            ? new Date(conta.data_recebimento).toLocaleDateString("pt-BR")
                            : "—"}
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

      {contaRecebendo && (
        <ReceberContaModal
          conta={contaRecebendo}
          onConfirmar={handleConfirmarRecebimento}
          onFechar={() => setContaRecebendo(null)}
        />
      )}
    </div>
  );
}
