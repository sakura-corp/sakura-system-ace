import { useEffect, useState } from "react";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { useAuth } from "@/contexts/AuthContext";
import { mensagemDeErro } from "@/lib/errors";
import {
  listarModelosWhatsapp,
  registrarMensagemAberta,
  textoDoModelo,
} from "@/lib/modelosWhatsapp";
import { preencherModelo } from "@/schemas/whatsapp";
import { cancelarPedido, criarPedido, receberItensPedido } from "@/lib/pedidosCompra";
import type { RecebimentoItem } from "@/lib/pedidosCompra";
import type { Deposito } from "@/types/deposito";
import type { Fornecedor } from "@/types/fornecedor";
import type { NovoItemPedidoCompra, NovoPedidoCompra, PedidoCompra } from "@/types/pedidoCompra";
import { nomePedido, STATUS_PEDIDO_COR, STATUS_PEDIDO_LABEL, totalPedido } from "@/types/pedidoCompra";
import type { Peca } from "@/types/peca";
import { ImportarNotaFiscalXmlModal } from "./ImportarNotaFiscalXmlModal";
import { PedidoCompraForm } from "./PedidoCompraForm";
import { ReceberPedidoModal } from "./ReceberPedidoModal";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";

interface PedidosCompraSectionProps {
  pedidos: PedidoCompra[];
  fornecedores: Fornecedor[];
  pecas: Peca[];
  depositos: Deposito[];
  lojaId: string;
  operadorId: string | null;
  onRecarregar: () => Promise<void>;
}

function IconeArquivo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M12 18v-6" />
      <path d="M9 15l3-3 3 3" />
    </svg>
  );
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PedidosCompraSection({
  pedidos,
  fornecedores,
  pecas,
  depositos,
  lojaId,
  operadorId,
  onRecarregar,
}: PedidosCompraSectionProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarImportarXml, setMostrarImportarXml] = useState(false);
  const [pedidoRecebendo, setPedidoRecebendo] = useState<PedidoCompra | null>(null);
  const { lojaAtual } = useAuth();
  const [modelosWhatsapp, setModelosWhatsapp] = useState<Record<string, string>>({});

  // Carregado aqui, e não junto do resto da página, pra não deixar mais lenta
  // a aba "Cadastro" de quem só veio cadastrar fornecedor — mesma ideia da
  // aba Comissões.
  useEffect(() => {
    let cancelado = false;
    listarModelosWhatsapp(lojaId)
      .then((modelos) => {
        if (!cancelado) setModelosWhatsapp(modelos);
      })
      // O botão continua funcionando com o texto padrão se isso falhar — não
      // vale derrubar a tela de pedidos por causa de um modelo de mensagem.
      .catch((err) => console.error("Erro ao carregar modelos de WhatsApp:", err));
    return () => {
      cancelado = true;
    };
  }, [lojaId]);

  function textoDoPedido(pedido: PedidoCompra): string {
    const itens = (pedido.itens ?? [])
      .map(
        (item) =>
          `- ${item.quantidade_pedida}${item.peca?.unidade ? ` ${item.peca.unidade}` : "x"} ${
            item.peca?.descricao ?? "item"
          }`,
      )
      .join("\n");
    return preencherModelo(textoDoModelo(modelosWhatsapp, "pedido_compra"), {
      fornecedor: pedido.fornecedor?.nome,
      pedido: nomePedido(pedido.numero),
      itens: itens || "—",
      loja: lojaAtual?.nome,
    });
  }

  async function handleSalvar(pedido: NovoPedidoCompra, itens: NovoItemPedidoCompra[]) {
    await criarPedido(pedido, itens, lojaId, operadorId);
    setMostrarFormulario(false);
    await onRecarregar();
  }

  async function handleReceber(recebimentos: RecebimentoItem[]) {
    if (!pedidoRecebendo) return;
    await receberItensPedido(pedidoRecebendo, recebimentos, lojaId);
    setPedidoRecebendo(null);
    await onRecarregar();
  }

  async function handleCancelar(pedido: PedidoCompra) {
    if (!confirm(`Cancelar ${nomePedido(pedido.numero)}? Isso não pode ser desfeito.`)) return;
    try {
      await cancelarPedido(pedido.id);
      await onRecarregar();
    } catch (err) {
      console.error("Erro ao cancelar pedido de compra:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <div className="space-y-6">
      {!mostrarFormulario && !mostrarImportarXml && (
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setMostrarImportarXml(true)}
            className="flex items-center gap-2 rounded-xl border border-sakura-purple/40 px-5 py-2.5 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10"
          >
            <IconeArquivo className="h-4 w-4" />
            Importar XML de nota fiscal
          </button>
          <button
            onClick={() => setMostrarFormulario(true)}
            disabled={fornecedores.length === 0 || pecas.length === 0}
            className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            + Novo pedido
          </button>
        </div>
      )}

      {mostrarImportarXml && (
        <ImportarNotaFiscalXmlModal
          fornecedores={fornecedores}
          pecas={pecas}
          depositos={depositos}
          lojaId={lojaId}
          operadorId={operadorId}
          onFechar={() => setMostrarImportarXml(false)}
          onImportado={onRecarregar}
        />
      )}

      {fornecedores.length === 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          Cadastre ao menos um fornecedor na aba "Cadastro" antes de criar um pedido de compra.
        </p>
      )}
      {fornecedores.length > 0 && pecas.length === 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          Cadastre ao menos um produto em Estoque → Produtos antes de criar um pedido de compra.
        </p>
      )}

      {mostrarFormulario && (
        <PedidoCompraForm
          fornecedores={fornecedores}
          pecas={pecas}
          onSalvar={handleSalvar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>}

      {pedidos.length === 0 ? (
        <p className="text-corpo text-sakura-muted">Nenhum pedido de compra registrado ainda.</p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="w-full text-left text-corpo">
            <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
              <tr>
                <th className="px-4 py-3 font-medium">Nº</th>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr key={pedido.id} className="border-t border-sakura-gray/20">
                  <td className="px-4 py-3 text-sakura-purple-dark">{nomePedido(pedido.numero)}</td>
                  <td className="px-4 py-3 text-sakura-purple-dark">
                    {pedido.fornecedor?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sakura-purple-dark">
                    {new Date(pedido.data_pedido).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-sakura-purple-dark">
                    {formatarMoeda(totalPedido(pedido.itens ?? []))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-rotulo font-medium ${STATUS_PEDIDO_COR[pedido.status]}`}
                    >
                      {STATUS_PEDIDO_LABEL[pedido.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {/* Mandar o pedido pro fornecedor é o gesto seguinte a
                        criá-lo, e hoje era feito copiando item por item na
                        mão. Só faz sentido enquanto o pedido ainda não
                        chegou inteiro. */}
                    {(pedido.status === "pendente" || pedido.status === "parcial") && (
                      <BotaoWhatsapp
                        telefone={
                          fornecedores.find((f) => f.id === pedido.fornecedor_id)?.telefone
                        }
                        texto={textoDoPedido(pedido)}
                        rotulo="Enviar"
                        titulo="Mandar este pedido pro fornecedor pelo WhatsApp"
                        aoAbrir={() =>
                          registrarMensagemAberta(
                            lojaId,
                            "pedido_compra",
                            pedido.id,
                            fornecedores.find((f) => f.id === pedido.fornecedor_id)?.telefone ??
                              null,
                            operadorId,
                          )
                        }
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AcoesDaLinha
                      descricao={nomePedido(pedido.numero)}
                      acoes={
                        pedido.status === "pendente" || pedido.status === "parcial"
                          ? [
                              {
                                tipo: "texto",
                                rotulo: "Receber",
                                aoClicar: () => setPedidoRecebendo(pedido),
                              },
                              {
                                tipo: "menu",
                                rotulo: "Cancelar pedido",
                                perigosa: true,
                                aoClicar: () => handleCancelar(pedido),
                              },
                            ]
                          : []
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pedidoRecebendo && (
        <ReceberPedidoModal
          pedido={pedidoRecebendo}
          onConfirmar={handleReceber}
          onFechar={() => setPedidoRecebendo(null)}
        />
      )}
    </div>
  );
}
