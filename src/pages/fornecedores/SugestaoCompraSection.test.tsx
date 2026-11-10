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
    expect(screen.getByLabelText("Quantidade de Pneu 175/70")).toHaveValue("4");
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
      comFalha: null,
      naoTentados: [],
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

  it("se um pedido falhar, mostra os criados, o que falhou (pode ter ficado gravado) e os não tentados", async () => {
    gerarPedidosDaSugestao.mockResolvedValue({
      criados: [{ fornecedorNome: "Fornecedor A", numero: 12 }],
      comFalha: { fornecedorNome: "Fornecedor B" },
      naoTentados: [{ fornecedorNome: "Fornecedor C" }],
      erro: "rede caiu",
    });
    const { user } = montar();
    await user.click(await screen.findByRole("button", { name: "Gerar pedidos" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Criar" }));
    expect(await screen.findByText(/Pedido 12 — Fornecedor A/)).toBeInTheDocument();
    expect(screen.getByText(/Fornecedor B: deu erro, e o pedido pode ter ficado gravado/)).toBeInTheDocument();
    expect(screen.getByText(/Não foram tentados: Fornecedor C/)).toBeInTheDocument();
    expect(screen.getByText(/rede caiu/)).toBeInTheDocument();
  });

  it("falha sem nenhum criado também recarrega a sugestão e a aba de pedidos (o pedido pode ter sido gravado)", async () => {
    gerarPedidosDaSugestao.mockResolvedValue({
      criados: [],
      comFalha: { fornecedorNome: "Fornecedor A" },
      naoTentados: [],
      erro: "rede caiu",
    });
    const { user, onPedidosCriados } = montar();
    await user.click(await screen.findByRole("button", { name: "Gerar pedidos" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Criar" }));
    await waitFor(() => expect(carregarDadosDaSugestao).toHaveBeenCalledTimes(2));
    expect(onPedidosCriados).toHaveBeenCalled();
  });

  it("enquanto recarrega depois de criar, o \"Gerar pedidos\" fica travado (senão cria de novo)", async () => {
    gerarPedidosDaSugestao.mockResolvedValue({
      criados: [{ fornecedorNome: "Fornecedor A", numero: 12 }],
      comFalha: null,
      naoTentados: [],
      erro: null,
    });
    const { user } = montar();
    const gerar = await screen.findByRole("button", { name: "Gerar pedidos" });
    let soltar: (v: unknown) => void = () => {};
    carregarDadosDaSugestao.mockReturnValueOnce(new Promise((r) => (soltar = r)));
    await user.click(gerar);
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Criar" }));
    await waitFor(() => expect(carregarDadosDaSugestao).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Gerar pedidos" })).toBeDisabled();
    soltar(DADOS);
    await waitFor(() => expect(screen.getByRole("button", { name: "Gerar pedidos" })).toBeEnabled());
  });

  it("quantidade inválida marca o campo e trava o Gerar pedidos; 2,5 (litro) vale", async () => {
    const { user } = montar();
    const campo = await screen.findByLabelText("Quantidade de Filtro de óleo");
    await user.clear(campo);
    await user.type(campo, "-1");
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/quantidade que não dá pra pedir/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerar pedidos" })).toBeDisabled();
    await user.clear(campo);
    await user.type(campo, "2,5");
    expect(campo).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByRole("button", { name: "Gerar pedidos" })).toBeEnabled();
    const linha = screen.getByText("Filtro de óleo").closest("tr") as HTMLElement;
    expect(within(linha).getByText(/50,00/)).toBeInTheDocument();
  });

  it("trocar de loja no meio da carga: a resposta da loja antiga não toma o lugar da nova", async () => {
    let soltarAntiga: (v: unknown) => void = () => {};
    carregarDadosDaSugestao
      .mockReturnValueOnce(new Promise((r) => (soltarAntiga = r)))
      .mockResolvedValueOnce({ ...DADOS, pecas: [DADOS.pecas[1]] });
    const { rerender } = montar();
    rerender(<SugestaoCompraSection lojaId="loja-2" operadorId="op-1" onPedidosCriados={vi.fn()} />);
    expect(await screen.findByText("Filtro de óleo")).toBeInTheDocument();
    soltarAntiga(DADOS);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText("Pneu 175/70")).toBeNull();
  });
});

describe("SugestaoCompraSection — revisão do #989", () => {
  const CRIADO = {
    criados: [{ fornecedorNome: "Fornecedor A", numero: 12 }],
    comFalha: null,
    naoTentados: [],
    erro: null,
  };

  it("se a recarga depois do Criar falhar, a lista velha sai da tela (sem \"Gerar pedidos\") e há \"Tentar de novo\"", async () => {
    gerarPedidosDaSugestao.mockResolvedValue(CRIADO);
    const { user } = montar();
    await user.click(await screen.findByRole("button", { name: "Gerar pedidos" }));
    carregarDadosDaSugestao.mockRejectedValueOnce(new Error("internet caiu"));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Criar" }));

    // Os criados continuam avisados; a lista antiga (com o "Já pedido" zerado) não.
    expect(await screen.findByText(/Pedido 12 — Fornecedor A/)).toBeInTheDocument();
    expect(screen.getByText(/internet caiu/)).toBeInTheDocument();
    expect(screen.queryByText("Pneu 175/70")).toBeNull();
    expect(screen.queryByRole("button", { name: "Gerar pedidos" })).toBeNull();
    expect(screen.queryByText(/já foi atualizada/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Pneu 175/70")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerar pedidos" })).toBeEnabled();
  });

  it("trocar de loja durante o Criar fecha a confirmação (não fica aberta com os grupos da loja nova)", async () => {
    let soltar: (v: unknown) => void = () => {};
    gerarPedidosDaSugestao.mockReturnValueOnce(new Promise((r) => (soltar = r)));
    const { user, rerender } = montar();
    await user.click(await screen.findByRole("button", { name: "Gerar pedidos" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Criar" }));
    rerender(<SugestaoCompraSection lojaId="loja-2" operadorId="op-1" onPedidosCriados={vi.fn()} />);
    // Espera a lista da loja nova chegar: é com ela na tela que a confirmação
    // (montada com os grupos da loja nova) não pode estar aberta.
    expect(await screen.findByText("Pneu 175/70")).toBeInTheDocument();
    soltar(CRIADO);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("o aviso de \"sem fornecedor\" não conta linha com quantidade 0", async () => {
    carregarDadosDaSugestao.mockResolvedValue({
      ...DADOS,
      // p3 sem cotação e com tudo já pedido: fica na lista com 0, mas não "fica fora" de nada.
      pedidos: [{ status: "pendente", itens: [{ peca_id: "p3", quantidade_pedida: 2, quantidade_recebida: 0 }] }],
    });
    montar();
    expect(await screen.findByText("Peça sem cotação")).toBeInTheDocument();
    expect(screen.queryByText(/fica fora dos pedidos/)).toBeNull();
  });
});
