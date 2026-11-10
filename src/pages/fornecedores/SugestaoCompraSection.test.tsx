// @vitest-environment jsdom
/**
 * Teste de TELA da Sugestão de compra (#382, FN-07): a tabela, a quantidade
 * editável (o total da linha acompanha), o aviso de peça sem fornecedor e o
 * "Gerar pedidos" com confirmação na tela (sem window.confirm).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor, within } from "@/testes/tela";

const carregarDadosDaSugestao = vi.fn();
const gerarPedidosDaSugestao = vi.fn();
vi.mock("@/lib/sugestaoCompra", () => ({
  carregarDadosDaSugestao: (...a: unknown[]) => carregarDadosDaSugestao(...a),
  gerarPedidosDaSugestao: (...a: unknown[]) => gerarPedidosDaSugestao(...a),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const { SugestaoCompraSection } = await import("./SugestaoCompraSection");

// Sem movimento: as três entram só pelo mínimo. Quantidade = mínimo - saldo.
const DADOS = {
  pecas: [
    { id: "p1", descricao: "Pneu 175/70", unidade: "UN", estoque_minimo: 5, ativo: true },
    { id: "p2", descricao: "Filtro de óleo", unidade: "UN", estoque_minimo: 3, ativo: true },
    { id: "p3", descricao: "Peça sem cotação", unidade: "UN", estoque_minimo: 2, ativo: true },
  ],
  saldos: new Map([["p1", 1], ["p2", 0], ["p3", 0]]),
  movimentos: [],
  cotacoes: [
    { peca_id: "p1", fornecedor_id: "f1", fornecedor_nome: "Fornecedor A", preco: 100, criado_em: "2026-11-01T10:00:00Z" },
    { peca_id: "p2", fornecedor_id: "f2", fornecedor_nome: "Fornecedor B", preco: 20, criado_em: "2026-11-01T10:00:00Z" },
  ],
  pedidos: [],
};

function montar(onPedidosCriados = vi.fn()) {
  return {
    onPedidosCriados,
    ...renderizar(
      <SugestaoCompraSection lojaId="loja-1" operadorId="op-1" onPedidosCriados={onPedidosCriados} />,
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  carregarDadosDaSugestao.mockResolvedValue(DADOS);
});

describe("SugestaoCompraSection", () => {
  it("mostra o critério com o N dos dias e uma linha por peça", async () => {
    montar();
    expect(await screen.findByText("Pneu 175/70")).toBeInTheDocument();
    expect(
      screen.getByText(/no estoque mínimo ou que, no ritmo dos últimos 90 dias, acabam em menos de 15 dias/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Filtro de óleo")).toBeInTheDocument();
    expect(screen.getAllByText("sem cotação").length).toBe(1);
    expect(screen.getByLabelText("Quantidade de Pneu 175/70")).toHaveValue(4);
  });

  it("editar a quantidade recalcula o total da linha", async () => {
    const { user } = montar();
    const campo = await screen.findByLabelText("Quantidade de Pneu 175/70");
    const linha = screen.getByText("Pneu 175/70").closest("tr") as HTMLElement;
    expect(linha.textContent).toContain("400,00");
    await user.clear(campo);
    await user.type(campo, "7");
    expect(within(linha).getByText(/700,00/)).toBeInTheDocument();
  });

  it("lista vazia diz que nenhuma peça precisa de compra", async () => {
    carregarDadosDaSugestao.mockResolvedValue({ ...DADOS, pecas: [] });
    montar();
    expect(await screen.findByText("Nenhuma peça precisa de compra agora.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gerar pedidos" })).toBeDisabled();
  });

  it("avisa das peças que ficam de fora por falta de fornecedor", async () => {
    montar();
    expect(await screen.findByText(/1 peça fica fora dos pedidos/i)).toBeInTheDocument();
  });

  it("Gerar pedidos pede confirmação e cria um pedido por fornecedor, sem a peça sem fornecedor", async () => {
    gerarPedidosDaSugestao.mockResolvedValue({
      criados: [
        { fornecedorNome: "Fornecedor A", numero: 12 },
        { fornecedorNome: "Fornecedor B", numero: 13 },
      ],
      naoCriados: [],
      erro: null,
    });
    const confirmar = vi.spyOn(window, "confirm");
    const { user, onPedidosCriados } = montar();
    await user.click(await screen.findByRole("button", { name: "Gerar pedidos" }));

    // Nada foi criado ainda: primeiro a pergunta, na própria tela.
    expect(gerarPedidosDaSugestao).not.toHaveBeenCalled();
    const dialogo = await screen.findByRole("dialog");
    expect(dialogo.textContent).toContain("Vai criar 2 pedidos");
    expect(dialogo.textContent).toContain("Fornecedor A (1 item, R$");
    await user.click(within(dialogo).getByRole("button", { name: "Criar" }));

    await waitFor(() => expect(gerarPedidosDaSugestao).toHaveBeenCalledTimes(1));
    const [grupos, lojaId, operadorId] = gerarPedidosDaSugestao.mock.calls[0];
    expect(grupos.map((g: { fornecedor: { nome: string } }) => g.fornecedor.nome)).toEqual([
      "Fornecedor A",
      "Fornecedor B",
    ]);
    expect(grupos[0].itens).toEqual([
      { peca_id: "p1", descricao: "Pneu 175/70", quantidade: 4, preco: 100, total: 400 },
    ]);
    expect(lojaId).toBe("loja-1");
    expect(operadorId).toBe("op-1");
    expect(await screen.findByText(/Pedido 12 — Fornecedor A/)).toBeInTheDocument();
    expect(onPedidosCriados).toHaveBeenCalled();
    expect(confirmar).not.toHaveBeenCalled();
    // Recarregou a sugestão depois de criar.
    expect(carregarDadosDaSugestao).toHaveBeenCalledTimes(2);
  });

  it("se um pedido falhar, mostra quais foram criados, quais não e o erro", async () => {
    gerarPedidosDaSugestao.mockResolvedValue({
      criados: [{ fornecedorNome: "Fornecedor A", numero: 12 }],
      naoCriados: [{ fornecedorNome: "Fornecedor B" }],
      erro: "rede caiu",
    });
    const { user } = montar();
    await user.click(await screen.findByRole("button", { name: "Gerar pedidos" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Criar" }));
    expect(await screen.findByText(/Pedido 12 — Fornecedor A/)).toBeInTheDocument();
    expect(screen.getByText(/Não foi criado: Fornecedor B/)).toBeInTheDocument();
    expect(screen.getByText(/rede caiu/)).toBeInTheDocument();
  });
});
