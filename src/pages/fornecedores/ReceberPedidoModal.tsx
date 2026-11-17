import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import type { RecebimentoItem } from "@/lib/pedidosCompra";
import { AvisoDeErro } from "@/components/Aviso";
import { nomePedido, type PedidoCompra } from "@/types/pedidoCompra";

interface ReceberPedidoModalProps {
  pedido: PedidoCompra;
  onConfirmar: (recebimentos: RecebimentoItem[]) => Promise<void>;
  onFechar: () => void;
}

const ID_DO_FORMULARIO = "receber-pedido-formulario";

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
    <Modal
      titulo={`Receber ${nomePedido(pedido.numero)}`}
      onFechar={onFechar}
      // Os botões ficam no rodapé da janela, fora da parte que rola: num
      // pedido com muitos itens, "Confirmar recebimento" está sempre à vista.
      // O `form` liga o botão ao formulário de dentro.
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form={ID_DO_FORMULARIO} variante="principal" ocupado={isSubmitting}>
            {isSubmitting ? "Confirmando..." : "Confirmar recebimento"}
          </Botao>
        </>
      }
    >
      <form id={ID_DO_FORMULARIO} onSubmit={handleSubmit(aoConfirmar)} className="space-y-3 text-corpo">
        <p className="text-texto-2">
          Confira as quantidades que chegaram de verdade. O que você confirmar aqui já dá entrada
          no estoque automaticamente.
        </p>

        {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

        <div className="sakura-card overflow-x-auto">
          <table className="sakura-tabela">
            <thead>
              <tr>
                <th>Peça</th>
                <th className="text-right">Pedido</th>
                <th className="text-right">Já recebido</th>
                <th>Recebendo agora</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, index) => (
                <tr key={item.id}>
                  <td>{item.peca?.descricao ?? "—"}</td>
                  <td className="text-right">{item.quantidade_pedida}</td>
                  <td className="text-right">{item.quantidade_recebida}</td>
                  <td>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      aria-label={`Recebendo agora: ${item.peca?.descricao ?? "item"}`}
                      {...register(`quantidades.${index}.valor`)}
                      className="sakura-campo sakura-campo-filtro w-24!"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>
    </Modal>
  );
}
