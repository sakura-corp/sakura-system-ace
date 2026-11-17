// @vitest-environment jsdom
/**
 * Teste de TELA da janela "Receber pedido" (tarefa 9 do visual novo, #990).
 *
 * O que ele guarda: os botões foram pro RODAPÉ da janela (fora do formulário,
 * ligados a ele pelo atributo `form`), e confirmar continua entregando
 * exatamente as quantidades digitadas, item por item. Receber pedido dá
 * entrada no estoque, então o que sai desta janela não pode mudar com a
 * aparência.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { PedidoCompra } from "@/types/pedidoCompra";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const { ReceberPedidoModal } = await import("./ReceberPedidoModal");

const PEDIDO: PedidoCompra = {
  id: "ped-1",
  numero: 34,
  loja_id: "loja-1",
  fornecedor_id: "f-1",
  status: "parcial",
  data_pedido: "2026-11-14",
  observacao: null,
  operador_id: null,
  criado_em: "2026-11-14T10:00:00.000Z",
  fornecedor: { nome: "Distribuidora Central" },
  itens: [
    {
      id: "item-1",
      pedido_id: "ped-1",
      peca_id: "peca-1",
      quantidade_pedida: 20,
      quantidade_recebida: 5,
      preco_unitario: 100,
      peca: { descricao: "Pneu 175/70 R14", unidade: "UN" },
    },
    {
      id: "item-2",
      pedido_id: "ped-1",
      peca_id: "peca-2",
      quantidade_pedida: 12,
      quantidade_recebida: 0,
      preco_unitario: 80,
      peca: { descricao: "Pneu 205/60 R16", unidade: "UN" },
    },
  ],
} as unknown as PedidoCompra;

describe("ReceberPedidoModal", () => {
  it("já vem com o que falta chegar e confirma item por item, sem mudar nenhuma quantidade", async () => {
    const onConfirmar = vi.fn().mockResolvedValue(undefined);
    const { user } = renderizar(
      <ReceberPedidoModal pedido={PEDIDO} onConfirmar={onConfirmar} onFechar={vi.fn()} />,
    );

    // O que falta chegar: 20 - 5 = 15 e 12 - 0 = 12.
    const primeiro = screen.getByLabelText("Recebendo agora: Pneu 175/70 R14");
    const segundo = screen.getByLabelText("Recebendo agora: Pneu 205/60 R16");
    expect(primeiro).toHaveValue(15);
    expect(segundo).toHaveValue(12);

    // Recebimento parcial: o segundo item chegou só 7.
    await user.clear(segundo);
    await user.type(segundo, "7");
    await user.click(screen.getByRole("button", { name: "Confirmar recebimento" }));

    expect(onConfirmar).toHaveBeenCalledTimes(1);
    expect(onConfirmar).toHaveBeenCalledWith([
      { itemId: "item-1", pecaId: "peca-1", quantidadeRecebidaAgora: 15 },
      { itemId: "item-2", pecaId: "peca-2", quantidadeRecebidaAgora: 7 },
    ]);
  });

  it("mostra o erro da gravação e deixa a janela aberta pra tentar de novo", async () => {
    const onConfirmar = vi.fn().mockRejectedValue(new Error("Falha de rede"));
    const onFechar = vi.fn();
    const { user } = renderizar(
      <ReceberPedidoModal pedido={PEDIDO} onConfirmar={onConfirmar} onFechar={onFechar} />,
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await user.click(screen.getByRole("button", { name: "Confirmar recebimento" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Falha de rede/);
    expect(onFechar).not.toHaveBeenCalled();
  });

  it("Cancelar fecha sem confirmar nada", async () => {
    const onConfirmar = vi.fn();
    const onFechar = vi.fn();
    const { user } = renderizar(
      <ReceberPedidoModal pedido={PEDIDO} onConfirmar={onConfirmar} onFechar={onFechar} />,
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onFechar).toHaveBeenCalledTimes(1);
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
