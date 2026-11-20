// @vitest-environment jsdom
/**
 * Visual novo, tarefa 7 (#990): o Faturar abre numa JANELA, por cima da lista.
 * O que este arquivo guarda:
 *   1. a janela grava exatamente o mesmo de antes: a mesma função
 *      (`faturarOrdem`), com a mesma OS, as mesmas formas, valores e parcelas
 *      (metade no Pix, metade no cartão em 3x com os juros da loja);
 *   2. deu certo: a janela fecha e sai o aviso "OS 148 faturada";
 *   3. deu errado: a janela NÃO fecha, o erro aparece dentro dela, do lado do
 *      botão, e nenhum aviso de sucesso sai.
 */
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { Operador } from "@/types/operador";

const faturarOrdem = vi.fn();
const avisar = vi.fn();

const ORDEM = {
  id: "os148",
  numero: 148,
  tipo: "os",
  status: "em_andamento",
  cliente_id: "c1",
  cliente: { nome: "Cliente Exemplo" },
  veiculo_id: "v1",
  veiculo: { placa: "ABC1D23" },
  data_abertura: "2026-11-02T10:00:00Z",
  parcelas: 1,
  // R$ 1.000,00: 2 peças de R$ 400 + 1 serviço de R$ 200.
  itens: [
    { id: "i1", tipo: "peca", descricao: "Pneu", quantidade: 2, preco_unitario: 400, desconto: 0 },
    { id: "i2", tipo: "servico", descricao: "Alinhamento", quantidade: 1, preco_unitario: 200, desconto: 0 },
  ],
};

vi.mock("@/lib/clientes", () => ({
  listarClientesParaEscolha: async () => [
    { id: "c1", nome: "Cliente Exemplo", telefone: "(16) 99123-4567" },
  ],
  cadastrarClienteRapido: vi.fn(),
  cadastrarVeiculoRapido: vi.fn(),
}));
vi.mock("@/lib/ordensServico", () => ({
  listarOrdens: async () => [ORDEM],
  adicionarItensOrdem: vi.fn(),
  atualizarOrdem: vi.fn(),
  concluirOrdem: vi.fn(),
  criarOrdem: vi.fn(),
  editarItemOrdem: vi.fn(),
  faturarOrdem: (...a: unknown[]) => faturarOrdem(...a),
  registrarVendaBalcao: vi.fn(),
  VendaSemFaturamentoError: class extends Error {},
  OrdemMudouError: class OrdemMudouError extends Error {},
}));
vi.mock("@/lib/avisoQueSome", () => ({ avisar: (texto: string) => avisar(texto) }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/caixa", () => ({ buscarCustoDasOrdens: async () => new Map() }));
vi.mock("@/lib/pecas", () => ({ listarPecasJanela: async () => [] }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/funcionarios", () => ({ listarFuncionariosPublico: async () => [] }));
vi.mock("@/lib/configuracoes", () => ({
  // Os juros da loja: 3x no cartão = 5%.
  listarJurosParcelas: async () => [
    { loja_id: "loja-a", numero_parcelas: 2, juros_percentual: 3 },
    { loja_id: "loja-a", numero_parcelas: 3, juros_percentual: 5 },
  ],
  buscarTextoGarantia: async () => "",
  buscarConfiguracaoFiscal: async () => null,
  buscarConfiguracaoPix: async () => null,
  buscarLinkAvaliacao: async () => null,
}));
vi.mock("@/lib/notasFiscais", () => ({ listarArquivosDasOrdens: async () => [] }));
vi.mock("@/lib/estoque", () => ({ listarSaldos: async () => new Map() }));
vi.mock("@/lib/whatsapp", () => ({ abrirConversaWhatsapp: vi.fn() }));
vi.mock("@/lib/modelosWhatsapp", async () => {
  const { modeloPorChave } = await import("@/schemas/whatsapp");
  return {
    listarModelosWhatsapp: async () => ({}),
    textoDoModelo: (m: Record<string, string>, c: never) => m[c] ?? modeloPorChave(c).padrao,
    registrarMensagemAberta: vi.fn(),
  };
});

const operador: Partial<Operador> = {
  id: "op",
  admin: false,
  permissoes: ["ordens_servico", "clientes"],
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: { id: "loja-a", nome: "Loja Centro" } }),
}));

const { OrdensServicoPage } = await import("./OrdensServicoPage");

afterEach(cleanup);
beforeEach(() => {
  faturarOrdem.mockReset();
  avisar.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

/** Abre a janela pela linha e preenche metade no Pix, metade no cartão em 3x. */
async function faturarMetadePixMetadeCartao3x() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <OrdensServicoPage />
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole("button", { name: "Faturar" }));
  const janela = screen.getByRole("dialog", { name: "Faturar OS 148" });
  await user.click(within(janela).getByRole("checkbox", { name: /Dividir em mais de uma forma/ }));
  await user.clear(within(janela).getByRole("spinbutton", { name: "Valor da forma 1" }));
  await user.type(within(janela).getByRole("spinbutton", { name: "Valor da forma 1" }), "500");
  await user.clear(within(janela).getByRole("spinbutton", { name: "Valor da forma 2" }));
  await user.type(within(janela).getByRole("spinbutton", { name: "Valor da forma 2" }), "500");
  await user.selectOptions(
    within(janela).getByRole("combobox", { name: "Parcelas da forma 2" }),
    "3",
  );
  // A conta que a pessoa vê embaixo, antes de confirmar.
  expect(within(janela).getByText(/Com os juros do cartão:\s*R\$\s*1\.025,00/)).toBeInTheDocument();
  await user.click(within(janela).getByRole("button", { name: "Confirmar faturamento" }));
  return janela;
}

describe("OrdensServicoPage — o Faturar em janela", () => {
  it("grava o mesmo de antes: a mesma OS, as mesmas formas, valores e parcelas", async () => {
    faturarOrdem.mockResolvedValue({ avisoTaxa: null });
    await faturarMetadePixMetadeCartao3x();
    await waitFor(() => expect(faturarOrdem).toHaveBeenCalledTimes(1));
    const [ordem, pagamentos, parcelas, previsao] = faturarOrdem.mock.calls[0];
    expect(ordem.id).toBe("os148");
    // 500 no Pix; 500 no cartão em 3x com 5% de juros = 525.
    expect(pagamentos).toEqual([
      { formaPagamento: "pix", valor: 500, parcelas: 1 },
      { formaPagamento: "cartao_credito", valor: 525, parcelas: 3 },
    ]);
    expect(parcelas).toBe(3);
    expect(previsao).toBeNull();
  });

  it("deu certo: a janela fecha e sai o aviso 'OS 148 faturada'", async () => {
    faturarOrdem.mockResolvedValue({ avisoTaxa: null });
    await faturarMetadePixMetadeCartao3x();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(avisar).toHaveBeenCalledWith("OS 148 faturada");
  });

  it("faturou, mas a taxa da maquininha não foi guardada (#387): a janela fecha, sai o 'faturada' e o aviso fica no topo", async () => {
    faturarOrdem.mockResolvedValue({
      avisoTaxa: "A venda foi faturada, mas a taxa da maquininha não foi guardada: sem rede",
    });
    await faturarMetadePixMetadeCartao3x();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(avisar).toHaveBeenCalledWith("OS 148 faturada");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A venda foi faturada, mas a taxa da maquininha não foi guardada: sem rede",
    );
  });

  it("deu errado: a janela fica aberta, com o erro dentro dela, e nenhum aviso de sucesso", async () => {
    faturarOrdem.mockRejectedValue(new Error("O caixa de hoje está fechado."));
    const janela = await faturarMetadePixMetadeCartao3x();
    const erro = await within(janela).findByRole("alert");
    expect(erro).toHaveTextContent("O caixa de hoje está fechado.");
    expect(screen.getByRole("dialog", { name: "Faturar OS 148" })).toBeInTheDocument();
    expect(avisar).not.toHaveBeenCalled();
    // O erro não some sozinho.
    await new Promise((r) => setTimeout(r, 50));
    expect(within(janela).getByRole("alert")).toBeInTheDocument();
  });
});
