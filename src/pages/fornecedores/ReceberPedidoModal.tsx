import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import type { RecebimentoItem } from "@/lib/pedidosCompra";
import { nomePedido, type PedidoCompra } from "@/types/pedidoCompra";

interface ReceberPedidoModalProps {
  pedido: PedidoCompra;
  onConfirmar: (recebimentos: RecebimentoItem[]) => Promise<void>;
  onFechar: () => void;
}

const receberPedidoSchema = z.object({
  quantidades: z.array(z.object({ valor: z.string() })),
});

type ReceberPedidoValues = z.infer<typeof receberPedidoSchema>;

// Por padrão, cada campo já vem preenchido com o restante que falta chegar
// daquele item — confirmar direto assume "chegou tudo". Pra recebimento
// parcial, é só a usuária diminuir o número antes de confirmar.
export function ReceberPedidoModal({ pedido, onConfirmar, onFechar }: ReceberPedidoModalProps) {
  const [erro, setErro] = useState<string | null>(null);
  const itens = pedido.itens ?? [];

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ReceberPedidoValues>({
    resolver: zodResolver(receberPedidoSchema),
    defaultValues: {
      quantidades: itens.map((item) => ({
        valor: String(Math.max(item.quantidade_pedida - item.quantidade_recebida, 0)),
      })),
    },
  });

  async function aoConfirmar(valores: ReceberPedidoValues) {
    setErro(null);
    try {
      const recebimentos: RecebimentoItem[] = itens.map((item, index) => ({
        itemId: item.id,
        pecaId: item.peca_id,
        quantidadeRecebidaAgora: Math.max(Number(valores.quantidades[index]?.valor) || 0, 0),
      }));
      await onConfirmar(recebimentos);
    } catch (err) {
      console.error("Erro ao receber pedido:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <Modal titulo={`Receber ${nomePedido(pedido.numero)}`} onFechar={onFechar}>
      <form onSubmit={handleSubmit(aoConfirmar)} className="space-y-3 text-corpo">
        <p className="text-texto-2">
          Confira as quantidades que chegaram de verdade. O que você confirmar aqui já dá entrada
          no estoque automaticamente.
        </p>

        {erro && <p className="rounded-lg bg-perigo/[0.12] px-3 py-2 text-perigo">{erro}</p>}

        <div className="overflow-x-auto rounded-xl border border-linha">
          <table className="w-full text-left text-corpo">
            <thead className="bg-cartao text-texto">
              <tr>
                <th className="px-3 py-2 font-medium">Peça</th>
                <th className="px-3 py-2 font-medium">Pedido</th>
                <th className="px-3 py-2 font-medium">Já recebido</th>
                <th className="px-3 py-2 font-medium">Recebendo agora</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, index) => (
                <tr key={item.id} className="border-t border-linha">
                  <td className="px-3 py-2 text-texto">
                    {item.peca?.descricao ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-texto">{item.quantidade_pedida}</td>
                  <td className="px-3 py-2 text-texto">{item.quantidade_recebida}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      {...register(`quantidades.${index}.valor`)}
                      className="sakura-campo w-24"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onFechar}
            className="rounded-xl px-4 py-2 text-corpo font-medium text-texto-2 hover:bg-passar"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Confirmando..." : "Confirmar recebimento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
