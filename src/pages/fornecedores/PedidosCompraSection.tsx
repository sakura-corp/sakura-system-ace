import { CircleX, FileUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Botao } from "@/components/Botao";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { Selo, type TipoDeSelo } from "@/components/Selo";
import { useAuth } from "@/contexts/AuthContext";
import { mensagemDeErro } from "@/lib/errors";
import { diaBrasileiro } from "@/lib/datas";
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
import { nomePedido, STATUS_PEDIDO_LABEL, totalPedido } from "@/types/pedidoCompra";
import type { StatusPedidoCompra } from "@/types/pedidoCompra";
import type { PecaJanela } from "@/types/peca";
import { temPermissao } from "@/types/operador";
import { ImportarNotaFiscalXmlModal } from "./ImportarNotaFiscalXmlModal";
import { PedidoCompraForm } from "./PedidoCompraForm";
import { ReceberPedidoModal } from "./ReceberPedidoModal";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";
import { AvisoDeAtencao, AvisoDeErro } from "@/components/Aviso";

interface PedidosCompraSectionProps {
  pedidos: PedidoCompra[];
  fornecedores: Fornecedor[];
  pecas: PecaJanela[];
  depositos: Deposito[];
  lojaId: string;
  operadorId: string | null;
  onRecarregar: () => Promise<void>;
}

// Cor, ícone e palavra (regra 4 do visual novo): "pendente" e "parcial" ainda
// pedem uma ação (receber o que falta), então não são verdes. O "parcial" é
// azul, "em andamento", pra não parecer igual ao "pendente".
const SELO_DO_PEDIDO: Record<StatusPedidoCompra, { tipo: TipoDeSelo; cancelado?: true }> = {
  pendente: { tipo: "atencao" },
  parcial: { tipo: "info" },
  recebido: { tipo: "ok" },
  cancelado: { tipo: "neutro", cancelado: true },
};

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
  const { lojaAtual, operador } = useAuth();
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
          <Botao icone={<FileUp />} onClick={() => setMostrarImportarXml(true)}>
            Importar XML de nota fiscal
          </Botao>
          <Botao
            variante="principal"
            onClick={() => setMostrarFormulario(true)}
            disabled={fornecedores.length === 0 || pecas.length === 0}
          >
            + Novo pedido
          </Botao>
        </div>
      )}

      {mostrarImportarXml && (
        <ImportarNotaFiscalXmlModal
          fornecedores={fornecedores}
          pecas={pecas}
          depositos={depositos}
          lojaId={lojaId}
          operadorId={operadorId}
          podeLancarContas={temPermissao(operador, "contas_pagar")}
          onFechar={() => setMostrarImportarXml(false)}
          onImportado={onRecarregar}
        />
      )}

      {fornecedores.length === 0 && (
        <AvisoDeAtencao>
          Cadastre ao menos um fornecedor na aba "Cadastro" antes de criar um pedido de compra.
        </AvisoDeAtencao>
      )}
      {fornecedores.length > 0 && pecas.length === 0 && (
        <AvisoDeAtencao>
          Cadastre ao menos um produto em Estoque → Produtos antes de criar um pedido de compra.
        </AvisoDeAtencao>
      )}

      {mostrarFormulario && (
        <PedidoCompraForm
          fornecedores={fornecedores}
          pecas={pecas}
          onSalvar={handleSalvar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      {pedidos.length === 0 ? (
        <p className="text-corpo text-texto-2">Nenhum pedido de compra registrado ainda.</p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="sakura-tabela">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Fornecedor</th>
                <th>Data</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th className="relative">
                  <span className="sr-only">Avisar o fornecedor</span>
                </th>
                <th className="relative">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => {
                const selo = SELO_DO_PEDIDO[pedido.status];
                const aberto = pedido.status === "pendente" || pedido.status === "parcial";
                return (
                  <tr key={pedido.id}>
                    <td className="whitespace-nowrap font-medium">{nomePedido(pedido.numero)}</td>
                    <td>{pedido.fornecedor?.nome ?? "—"}</td>
                    <td className="whitespace-nowrap text-texto-2">
                      {diaBrasileiro(pedido.data_pedido)}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      {formatarMoeda(totalPedido(pedido.itens ?? []))}
                    </td>
                    <td>
                      <Selo
                        tipo={selo.tipo}
                        palavra={STATUS_PEDIDO_LABEL[pedido.status]}
                        icone={selo.cancelado ? CircleX : undefined}
                      />
                    </td>
                    <td>
                      {/* Mandar o pedido pro fornecedor é o gesto seguinte a
                          criá-lo, e hoje era feito copiando item por item na
                          mão. Só faz sentido enquanto o pedido ainda não
                          chegou inteiro. */}
                      {aberto && (
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
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Na linha fica só o próximo passo; cancelar, que não
                            dá pra desfazer, vai pro menu de três pontos. */}
                        {aberto && (
                          <Botao
                            variante="principal"
                            tamanho="pequeno"
                            aria-label={`Receber — ${nomePedido(pedido.numero)}`}
                            onClick={() => setPedidoRecebendo(pedido)}
                          >
                            Receber
                          </Botao>
                        )}
                        <AcoesDaLinha
                          descricao={nomePedido(pedido.numero)}
                          acoes={
                            aberto
                              ? [
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
                      </div>
                    </td>
                  </tr>
                );
              })}
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
