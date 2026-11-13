// @vitest-environment jsdom
/**
 * Teste de TELA: o aviso do estoque inicial que não entrou (#909) com a tela
 * de Estoque de verdade em volta da seção de Produtos.
 *
 * Achado da revisão da Sofia (11/11): depois de salvar, a seção chama o
 * `carregar` do `EstoquePage`, que mostra "Carregando..." no lugar dela. A
 * seção sai da tela e volta zerada, e um aviso guardado nela some antes de
 * alguém ver. O teste do `ProdutosSection` sozinho não pegava isso, porque o
 * `onRecarregar` dele é simulado e não desmonta nada.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";
import type { Peca } from "@/types/peca";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ lojaAtual: { id: "l1", nome: "Matriz" }, operador: { id: "op", admin: false } }),
}));
const listarPecas = vi.fn();
const criarPeca = vi.fn();
vi.mock("@/lib/pecas", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/pecas")>()),
  listarPecas: (...a: unknown[]) => listarPecas(...a),
  criarPeca: (...a: unknown[]) => criarPeca(...a),
}));
const criarMovimento = vi.fn();
vi.mock("@/lib/estoque", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/estoque")>()),
  listarMovimentos: vi.fn().mockResolvedValue([]),
  criarMovimento: (...a: unknown[]) => criarMovimento(...a),
}));
vi.mock("@/lib/categorias", () => ({ listarCategorias: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/depositos", () => ({ listarDepositos: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/configuracoes", () => ({ buscarConfiguracaoFiscal: vi.fn().mockResolvedValue(null) }));
vi.mock("@/components/BotaoVoltar", () => ({ BotaoVoltar: () => null }));

const { EstoquePage } = await import("./EstoquePage");

function umaPeca(extra: Partial<Peca>): Peca {
  return {
    id: "p1",
    descricao: "Pneu 175/70 R13",
    codigo_barras: null,
    codigo_interno: null,
    medida: null,
    ativo: true,
    estoque_minimo: 0,
    preco_venda: 100,
    preco_custo: 50,
    categoria_id: null,
    criado_em: "2026-01-01T00:00:00Z",
    ...extra,
  } as unknown as Peca;
}

const AVISO =
  "Peça cadastrada, mas o estoque inicial não entrou (Nenhum depósito ativo encontrado pra essa loja). " +
  "Lance a entrada em Estoque → Movimentações.";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  // A lista demora um pouco, como na internet de verdade: sem isso o React
  // junta o "Carregando..." e a volta da lista num desenho só, a seção nunca
  // sai da tela e o teste passaria mesmo com o defeito.
  listarPecas.mockImplementation(
    () => new Promise((resolver) => setTimeout(() => resolver([umaPeca({})]), 30)),
  );
  criarPeca.mockResolvedValue(umaPeca({ id: "p-nova", descricao: "TESTE 909 Palheta" }));
});

async function cadastrarNova(user: ReturnType<typeof renderizar>["user"]) {
  const campo = (rotulo: string) => screen.getByLabelText(rotulo, { exact: true });
  await user.click(await screen.findByRole("button", { name: "+ Novo produto" }));
  await user.type(campo("Descrição *"), "TESTE 909 Palheta");
  await user.type(campo("NCM *"), "40169300");
  await user.type(campo("C.E.S.T *"), "0100100");
  await user.type(campo("CFOP padrão *"), "5102");
  await user.selectOptions(screen.getByLabelText("Origem *"), "0");
  await user.type(campo("CST / CSOSN *"), "500");
  await user.type(campo("Qtde. estoque inicial"), "3");
  await user.click(screen.getByRole("button", { name: "Salvar peça" }));
}

describe("EstoquePage — o aviso do estoque inicial sobrevive à recarga (#909)", () => {
  it("a peça foi criada e o estoque inicial falhou: depois da recarga, o aviso continua na tela", async () => {
    criarMovimento.mockRejectedValue(new Error("Nenhum depósito ativo encontrado pra essa loja."));
    const { user, container } = renderizar(<EstoquePage />);

    await cadastrarNova(user);

    // A recarga de verdade aconteceu (a lista foi pedida de novo) e acabou.
    await waitFor(() => expect(listarPecas).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText("Carregando...")).toBeNull());
    expect(screen.getByText(AVISO)).toBeInTheDocument();
    expect(container.querySelector("form")).toBeNull();
    expect(criarPeca).toHaveBeenCalledTimes(1);
  });

  it("o próximo cadastro que dá certo tira o aviso antigo", async () => {
    criarMovimento.mockRejectedValueOnce(new Error("Nenhum depósito ativo encontrado pra essa loja."));
    criarMovimento.mockResolvedValue(undefined);
    const { user } = renderizar(<EstoquePage />);

    await cadastrarNova(user);
    expect(await screen.findByText(AVISO)).toBeInTheDocument();

    await cadastrarNova(user);
    await waitFor(() => expect(listarPecas).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.queryByText("Carregando...")).toBeNull());
    expect(screen.queryByText(AVISO)).toBeNull();
  });
});
