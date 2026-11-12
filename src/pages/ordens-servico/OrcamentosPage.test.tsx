// @vitest-environment jsdom
/**
 * Teste de TELA da lista de orçamentos (#379): o que a Sofia decidiu aparece
 * na tela e as ações chamam a lib certa.
 */
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, userEvent, within } from "@/testes/tela";
import type { OrdemServico } from "@/types/os";

const aprovarOrcamento = vi.fn();
const recusarOrcamento = vi.fn();
const listarOrcamentos = vi.fn();
const listarOrdens = vi.fn();
const listarOrdensDoVeiculo = vi.fn();
vi.mock("@/lib/ordensServico", () => ({
  listarOrcamentos: (...a: unknown[]) => listarOrcamentos(...a),
  listarOrdens: (...a: unknown[]) => listarOrdens(...a),
  listarOrdensDoVeiculo: (...a: unknown[]) => listarOrdensDoVeiculo(...a),
  aprovarOrcamento: (...a: unknown[]) => aprovarOrcamento(...a),
  recusarOrcamento: (...a: unknown[]) => recusarOrcamento(...a),
  criarOrcamento: vi.fn(),
  atualizarOrdem: vi.fn(),
  adicionarItensOrdem: vi.fn(),
  editarItemOrdem: vi.fn(),
  cadastrarPecaDoItem: (...a: unknown[]) => cadastrarPecaDoItem(...a),
  AprovadoSemEstoqueError: class extends Error {},
}));
const cadastrarPecaDoItem = vi.fn();
// O cadastro de peça inteiro vira um botão: aqui só importa o que a tela faz
// com a peça que ele devolve.
vi.mock("./CadastroPecaAvulsaModal", () => ({
  CadastroPecaAvulsaModal: ({ onCadastrada }: { onCadastrada: (peca: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onCadastrada({ id: "p-nova", descricao: "Palheta nova", codigo_interno: null, codigo_barras: null, medida: null })
      }
    >
      Salvar peça de mentira
    </button>
  ),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/clientes", () => ({
  listarClientesParaEscolha: async () => [
    { id: "c1", nome: "Maria da Silva", telefone: "(16) 99123-4567", veiculos: [] },
  ],
  cadastrarClienteRapido: vi.fn(),
  cadastrarVeiculoRapido: vi.fn(),
}));
vi.mock("@/lib/pecas", () => ({
  listarPecasJanela: async () => [{ id: "p-1", descricao: "Palheta 20 pol", codigo_interno: null, codigo_barras: null, medida: null }],
}));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/funcionarios", () => ({ listarFuncionariosPublico: async () => [] }));
vi.mock("@/lib/estoque", () => ({
  listarSaldos: async () => new Map(),
}));
vi.mock("@/lib/modelosWhatsapp", () => ({
  listarModelosWhatsapp: async () => ({}),
  textoDoModelo: () => "Olá, {cliente}! Orçamento {numero}",
  registrarMensagemAberta: vi.fn(),
}));
let operadorAtual: { id: string; admin: boolean; permissoes: string[] } = {
  id: "op",
  admin: true,
  permissoes: [],
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    operador: operadorAtual,
    lojaAtual: { id: "loja-a", nome: "Loja Centro" },
  }),
}));

const { OrcamentosPage } = await import("./OrcamentosPage");

function ordem(extra: Partial<OrdemServico>): OrdemServico {
  return {
    id: "x",
    numero: null,
    loja_id: "loja-a",
    cliente_id: "c1",
    veiculo_id: null,
    status: "orcamento",
    data_abertura: "2026-10-20T15:00:00.000Z",
    cliente: { nome: "Maria da Silva" },
    veiculo: null,
    itens: [
      { id: "i1", tipo: "servico", descricao: "Alinhamento", quantidade: 1, preco_unitario: 100, desconto: 0 },
    ],
    ...extra,
  } as unknown as OrdemServico;
}

const noPrazo = ordem({ id: "o1", numero_orcamento: 1, validade: "2099-01-01" });
const vencido = ordem({ id: "o2", numero_orcamento: 2, validade: "2020-01-01", cliente: { nome: "João Vencido" } as never });
const recusado = ordem({ id: "o3", numero_orcamento: 3, status: "recusado", validade: "2099-01-01", cliente: { nome: "Ana Recusada" } as never });

function LocalAtual() {
  const l = useLocation();
  return <p data-testid="local">{l.pathname + JSON.stringify(l.state)}</p>;
}

function montar() {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/orcamentos"]}>
      <Routes>
        <Route path="/orcamentos" element={<OrcamentosPage />} />
        <Route path="*" element={<LocalAtual />} />
      </Routes>
    </MemoryRouter>,
  );
  return user;
}

beforeEach(() => {
  operadorAtual = { id: "op", admin: true, permissoes: [] };
  localStorage.clear();
  vi.clearAllMocks();
  listarOrcamentos.mockResolvedValue([noPrazo, vencido, recusado]);
  listarOrdensDoVeiculo.mockResolvedValue([]);
});

describe("OrcamentosPage", () => {
  it("sem o módulo Clientes, o botão de mandar pelo WhatsApp some (o telefone não chega pela janela)", async () => {
    operadorAtual = { id: "op", admin: false, permissoes: ["ordens_servico"] };
    montar();
    await screen.findByText("Orçamento 1");
    expect(screen.queryAllByTitle("Mandar o orçamento pelo WhatsApp")).toHaveLength(0);
  });

  it("com o módulo Clientes, o botão de mandar pelo WhatsApp continua", async () => {
    montar();
    await screen.findByText("Orçamento 1");
    expect(screen.queryAllByTitle("Mandar o orçamento pelo WhatsApp").length).toBeGreaterThan(0);
  });

  it("busca só os orçamentos da loja, nunca a lista inteira de OS", async () => {
    montar();
    await screen.findByText("Orçamento 1");

    expect(listarOrcamentos).toHaveBeenCalledWith("loja-a");
    expect(listarOrdens).not.toHaveBeenCalled();
  });

  it("lista só orçamentos abertos, com número, cliente e validade; vencido leva etiqueta", async () => {
    montar();

    expect(await screen.findByText("Orçamento 1")).toBeInTheDocument();
    expect(screen.getByText("Orçamento 2")).toBeInTheDocument();
    expect(screen.getByText("01/01/2099")).toBeInTheDocument();
    expect(screen.getAllByText("vencido")).toHaveLength(1);
    // Nem OS, nem recusado, na aba de abertos.
    expect(screen.queryByText("Ana Recusada")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Novo orçamento" })).toBeInTheDocument();
  });

  it("recusados ficam numa aba própria", async () => {
    const user = montar();
    await screen.findByText("Orçamento 1");

    await user.click(screen.getByRole("tab", { name: "Recusados (1)" }));

    expect(screen.getByText("Ana Recusada")).toBeInTheDocument();
    expect(screen.queryByText("Orçamento 1")).not.toBeInTheDocument();
  });

  it("aprovar chama aprovarOrcamento com quem aprovou e leva pra OS que nasceu", async () => {
    aprovarOrcamento.mockResolvedValue({ ...noPrazo, id: "o1", numero: 51, status: "em_andamento" });
    const user = montar();

    await user.click(await screen.findByText("Orçamento 1"));
    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    await user.type(screen.getByLabelText("Quem aprovou?"), "pelo telefone");
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));

    expect(aprovarOrcamento).toHaveBeenCalledWith(expect.objectContaining({ id: "o1" }), "pelo telefone", "op", []);
    expect(await screen.findByTestId("local")).toHaveTextContent('/ordens-servico{"abrirOrdemId":"o1"}');
  });

  it("orçamento com peça sem cadastro: a janela manda o vínculo da peça escolhida pro aprovarOrcamento (#655)", async () => {
    const comAvulsa = ordem({
      id: "o4",
      numero_orcamento: 4,
      validade: "2099-01-01",
      cliente: { nome: "Cliente da Palheta" } as never,
      itens: [
        { id: "i9", tipo: "peca", peca_id: null, descricao: "Palheta 20 polegadas", quantidade: 1, preco_unitario: 80, desconto: 0 },
      ] as never,
    });
    listarOrcamentos.mockResolvedValue([comAvulsa]);
    aprovarOrcamento.mockResolvedValue({ ...comAvulsa, numero: 52, status: "em_andamento" });
    const user = montar();

    await user.click(await screen.findByText("Orçamento 4"));
    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    await user.type(screen.getByLabelText("Quem aprovou?"), "pelo telefone");
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
    await user.click(screen.getByRole("radio", { name: "É uma peça que já tenho" }));
    await user.click(screen.getByDisplayValue("Escolha a peça do cadastro"));
    await user.click(screen.getByRole("button", { name: /^Palheta 20 pol/ }));
    await user.click(screen.getByRole("button", { name: "Aprovar orçamento" }));

    expect(aprovarOrcamento).toHaveBeenCalledWith(
      expect.objectContaining({ id: "o4" }),
      "pelo telefone",
      "op",
      [{ itemId: "i9", pecaId: "p-1" }],
    );
  });

  it("peça cadastrada na aprovação: liga na hora e o orçamento aberto recarrega já ligado (#720)", async () => {
    const avulsa = { id: "i9", tipo: "peca", peca_id: null, descricao: "Palheta 20 polegadas", quantidade: 1, preco_unitario: 80, desconto: 0 };
    const comAvulsa = ordem({
      id: "o4",
      numero_orcamento: 4,
      validade: "2099-01-01",
      itens: [avulsa] as never,
    });
    const ligado = { ...comAvulsa, itens: [{ ...avulsa, peca_id: "p-nova" }] } as unknown as OrdemServico;
    listarOrcamentos.mockResolvedValueOnce([comAvulsa]).mockResolvedValue([ligado]);
    cadastrarPecaDoItem.mockResolvedValue(true);
    aprovarOrcamento.mockResolvedValue({ ...ligado, numero: 53, status: "em_andamento" });
    const user = montar();

    await user.click(await screen.findByText("Orçamento 4"));
    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    await user.type(screen.getByLabelText("Quem aprovou?"), "pelo telefone");
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
    await user.click(screen.getByRole("radio", { name: "Cadastrar agora" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar a peça" }));
    await user.click(screen.getByRole("button", { name: "Salvar peça de mentira" }));

    expect(cadastrarPecaDoItem).toHaveBeenCalledWith("i9", "p-nova", "op");
    expect(await screen.findByText(/Não sobrou nenhuma peça sem cadastro/)).toBeInTheDocument();
    expect(listarOrcamentos).toHaveBeenCalledTimes(2);

    // Voltar e confirmar de novo: o orçamento recarregado já não tem peça
    // avulsa, então aprova direto, sem janela e sem vínculo.
    const janela = screen.getByRole("dialog", { name: "Peças sem cadastro" });
    await user.click(within(janela).getByRole("button", { name: "Voltar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
    expect(screen.queryByRole("dialog", { name: "Peças sem cadastro" })).not.toBeInTheDocument();
    expect(aprovarOrcamento).toHaveBeenCalledWith(expect.objectContaining({ id: "o4" }), "pelo telefone", "op", []);
  });

  // Revisão: fechar o orçamento enquanto o banco ligava a peça fazia ele
  // reabrir sozinho quando a resposta chegava.
  it("fechar o orçamento enquanto a peça liga não faz ele reabrir sozinho (#720)", async () => {
    const avulsa = { id: "i9", tipo: "peca", peca_id: null, descricao: "Palheta 20 polegadas", quantidade: 1, preco_unitario: 80, desconto: 0 };
    const comAvulsa = ordem({ id: "o4", numero_orcamento: 4, validade: "2099-01-01", itens: [avulsa] as never });
    listarOrcamentos.mockResolvedValue([comAvulsa]);
    let terminar!: (v: boolean) => void;
    cadastrarPecaDoItem.mockImplementation(() => new Promise<boolean>((r) => (terminar = r)));
    const user = montar();

    await user.click(await screen.findByText("Orçamento 4"));
    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    await user.type(screen.getByLabelText("Quem aprovou?"), "pelo telefone");
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
    await user.click(screen.getByRole("radio", { name: "Cadastrar agora" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar a peça" }));
    await user.click(screen.getByRole("button", { name: "Salvar peça de mentira" }));
    const janela = screen.getByRole("dialog", { name: "Peças sem cadastro" });
    await user.click(within(janela).getByRole("button", { name: "Voltar" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("button", { name: "Confirmar aprovação" })).not.toBeInTheDocument();

    terminar(true);
    await vi.waitFor(() => expect(listarOrcamentos).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("button", { name: "Confirmar aprovação" })).not.toBeInTheDocument();
    expect(screen.getByText("Orçamento 4")).toBeInTheDocument();
  });

  // Revisão: o carregar() da página não lança, então a falha do recarregar
  // ficava atrás da janela e ninguém via.
  it("ligou, mas o orçamento não recarregou: o aviso aparece dentro da janela (#720)", async () => {
    const avulsa = { id: "i9", tipo: "peca", peca_id: null, descricao: "Palheta 20 polegadas", quantidade: 1, preco_unitario: 80, desconto: 0 };
    const comAvulsa = ordem({ id: "o4", numero_orcamento: 4, validade: "2099-01-01", itens: [avulsa] as never });
    listarOrcamentos.mockResolvedValueOnce([comAvulsa]).mockRejectedValue(new Error("sem internet"));
    cadastrarPecaDoItem.mockResolvedValue(true);
    const user = montar();

    await user.click(await screen.findByText("Orçamento 4"));
    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    await user.type(screen.getByLabelText("Quem aprovou?"), "pelo telefone");
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
    await user.click(screen.getByRole("radio", { name: "Cadastrar agora" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar a peça" }));
    await user.click(screen.getByRole("button", { name: "Salvar peça de mentira" }));

    const janela = await screen.findByRole("dialog", { name: "Peças sem cadastro" });
    expect(
      await within(janela).findByText(/A peça foi cadastrada e ligada ao item, mas o orçamento não recarregou/),
    ).toBeInTheDocument();
  });

  it("recusar com motivo chama recusarOrcamento e some dos abertos", async () => {
    recusarOrcamento.mockResolvedValue(undefined);
    const user = montar();

    await user.click(await screen.findByText("Orçamento 1"));
    await user.selectOptions(screen.getByLabelText("Motivo da recusa (opcional)"), "prazo");
    await user.click(screen.getByRole("button", { name: "Recusar" }));

    expect(recusarOrcamento).toHaveBeenCalledWith("o1", "prazo", "op");
  });
});
