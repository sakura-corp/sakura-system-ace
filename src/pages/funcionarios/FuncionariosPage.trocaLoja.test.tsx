// @vitest-environment jsdom
/**
 * #927: trocar de loja enquanto uma carga anterior ainda busca. Só a carga mais
 * nova mexe na tela, e se a carga da loja nova der erro a tela não mostra os
 * dados da loja anterior. A página tem três cargas: os funcionários (aba
 * Cadastro), os dados de comissão e os pagamentos de comissão (aba Comissões).
 */
import type { ReactElement } from "react";
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { ComissaoFechamento } from "@/types/comissaoFechamento";
import type { Funcionario } from "@/types/funcionario";
import type { OrdemParaComissao } from "@/types/os";

const lojaA = { id: "loja-a", nome: "Loja A" };
const lojaB = { id: "loja-b", nome: "Loja B" };
const auth = vi.hoisted(() => ({ lojaAtual: null as unknown }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op", admin: true, permissoes: [] }, lojaAtual: auth.lojaAtual }),
}));

const m = vi.hoisted(() => ({
  listarFuncionarios: vi.fn(),
  listarOrdensParaComissoes: vi.fn(),
  listarComissoesPagas: vi.fn(),
}));
vi.mock("@/lib/funcionarios", () => ({ listarFuncionarios: m.listarFuncionarios }));
vi.mock("@/lib/ordensServico", () => ({ listarOrdensParaComissoes: m.listarOrdensParaComissoes }));
vi.mock("@/lib/comissoesFechamentos", () => ({ listarComissoesPagas: m.listarComissoesPagas }));
vi.mock("@/lib/pecas", () => ({ listarPecas: async () => [] }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/contasReceber", () => ({ listarContasReceber: async () => [] }));
// As seções só mostram o que a página entregou.
vi.mock("./FuncionariosSection", () => ({
  FuncionariosSection: ({ funcionarios }: { funcionarios: Funcionario[] }) => (
    <ul>{funcionarios.map((f) => <li key={f.id}>{f.nome}</li>)}</ul>
  ),
}));
vi.mock("./ComissoesSection", () => ({
  ComissoesSection: ({
    ordens,
    pagamentos,
  }: {
    ordens: OrdemParaComissao[];
    pagamentos: ComissaoFechamento[];
  }) => (
    <div>
      <ul>{ordens.map((o) => <li key={o.id}>{`OS ${o.id}`}</li>)}</ul>
      <ul>{pagamentos.map((p) => <li key={p.id}>{`Pagamento ${p.funcionario_nome}`}</li>)}</ul>
    </div>
  ),
}));

const { FuncionariosPage } = await import("./FuncionariosPage");

function adiada<T>() {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: unknown) => void;
  const promessa = new Promise<T>((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

const func = (id: string, nome: string) => ({ id, nome }) as unknown as Funcionario;
const os = (id: string) => ({ id }) as unknown as OrdemParaComissao;
const pagamento = (id: string, nome: string) => ({ id, funcionario_nome: nome }) as unknown as ComissaoFechamento;

/** Uma resposta adiada por loja: o que cada loja devolve chega quando o teste mandar. */
function porLoja<T>(mock: ReturnType<typeof vi.fn>) {
  const a = adiada<T>();
  const b = adiada<T>();
  mock.mockImplementation((loja: string) => (loja === "loja-a" ? a.promessa : b.promessa));
  return { a, b };
}

async function trocarPraB(rerender: (ui: ReactElement) => void, esperar: ReturnType<typeof vi.fn>) {
  auth.lojaAtual = lojaB;
  rerender(<FuncionariosPage />);
  await vi.waitFor(() => expect(esperar).toHaveBeenCalledWith("loja-b"));
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.lojaAtual = lojaA;
  vi.spyOn(console, "error").mockImplementation(() => {});
  m.listarFuncionarios.mockResolvedValue([]);
  m.listarOrdensParaComissoes.mockResolvedValue([]);
  m.listarComissoesPagas.mockResolvedValue([]);
});

describe("Funcionários (Cadastro): troca de loja no meio da carga (#927)", () => {
  it("a loja A chega depois da B: a tela fica com os funcionários da B", async () => {
    const { a, b } = porLoja<Funcionario[]>(m.listarFuncionarios);
    const { rerender } = renderizar(<FuncionariosPage />);
    await vi.waitFor(() => expect(m.listarFuncionarios).toHaveBeenCalledWith("loja-a"));
    await trocarPraB(rerender, m.listarFuncionarios);

    await act(async () => b.resolver([func("b", "Func da loja B")]));
    expect(await screen.findByText("Func da loja B")).toBeInTheDocument();

    await act(async () => {
      a.resolver([func("a", "Func da loja A")]);
      await a.promessa;
    });
    expect(screen.getByText("Func da loja B")).toBeInTheDocument();
    expect(screen.queryByText("Func da loja A")).not.toBeInTheDocument();
  });

  it("a loja A carregou e a carga da B dá erro: aparece o erro e não os funcionários da A", async () => {
    const { a, b } = porLoja<Funcionario[]>(m.listarFuncionarios);
    const { rerender } = renderizar(<FuncionariosPage />);
    await act(async () => a.resolver([func("a", "Func da loja A")]));
    expect(await screen.findByText("Func da loja A")).toBeInTheDocument();

    await trocarPraB(rerender, m.listarFuncionarios);
    await act(async () => b.rejeitar(new Error("Falha da loja B")));

    expect(await screen.findByText(/Falha da loja B/)).toBeInTheDocument();
    expect(screen.queryByText("Func da loja A")).not.toBeInTheDocument();
  });
});

describe("Funcionários (Comissões): troca de loja no meio da carga (#927)", () => {
  it("os dados de comissão da A chegam depois da B: a tela fica com os da B", async () => {
    const { a, b } = porLoja<OrdemParaComissao[]>(m.listarOrdensParaComissoes);
    const { user, rerender } = renderizar(<FuncionariosPage />);
    await user.click(screen.getByRole("button", { name: "Comissões" }));
    await vi.waitFor(() => expect(m.listarOrdensParaComissoes).toHaveBeenCalledWith("loja-a"));
    await trocarPraB(rerender, m.listarOrdensParaComissoes);

    await act(async () => b.resolver([os("da-b")]));
    expect(await screen.findByText("OS da-b")).toBeInTheDocument();

    await act(async () => {
      a.resolver([os("da-a")]);
      await a.promessa;
    });
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByText("OS da-b")).toBeInTheDocument();
    expect(screen.queryByText("OS da-a")).not.toBeInTheDocument();
  });

  it("os dados da A já estão na tela e a loja muda: a B é carregada e a tela fica com os da B", async () => {
    m.listarOrdensParaComissoes.mockImplementation(async (loja: string) => [os(loja === "loja-a" ? "da-a" : "da-b")]);
    const { user, rerender } = renderizar(<FuncionariosPage />);
    await user.click(screen.getByRole("button", { name: "Comissões" }));
    expect(await screen.findByText("OS da-a")).toBeInTheDocument();

    await trocarPraB(rerender, m.listarOrdensParaComissoes);

    expect(await screen.findByText("OS da-b")).toBeInTheDocument();
    expect(screen.queryByText("OS da-a")).not.toBeInTheDocument();
  });

  // Achado da revisão final: com os dados da A na tela, ir pra B e voltar pra
  // A antes de a B responder. A busca da B não pode continuar valendo.
  it("A → B → A com a B respondendo por último: a tela fica com os da A, sem 'Carregando...'", async () => {
    const b = adiada<OrdemParaComissao[]>();
    m.listarOrdensParaComissoes.mockImplementation(async (loja: string) =>
      loja === "loja-a" ? [os("da-a")] : b.promessa,
    );
    const { user, rerender } = renderizar(<FuncionariosPage />);
    await user.click(screen.getByRole("button", { name: "Comissões" }));
    expect(await screen.findByText("OS da-a")).toBeInTheDocument();

    await trocarPraB(rerender, m.listarOrdensParaComissoes);
    auth.lojaAtual = lojaA;
    rerender(<FuncionariosPage />);
    expect(await screen.findByText("OS da-a")).toBeInTheDocument();

    await act(async () => {
      b.resolver([os("da-b")]);
      await b.promessa;
    });
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByText("OS da-a")).toBeInTheDocument();
    expect(screen.queryByText("OS da-b")).not.toBeInTheDocument();
    expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
  });

  it("os pagamentos da A chegam depois da B: a tela fica com os da B", async () => {
    const { a, b } = porLoja<ComissaoFechamento[]>(m.listarComissoesPagas);
    const { user, rerender } = renderizar(<FuncionariosPage />);
    await user.click(screen.getByRole("button", { name: "Comissões" }));
    await vi.waitFor(() => expect(m.listarComissoesPagas).toHaveBeenCalledWith("loja-a"));
    await trocarPraB(rerender, m.listarComissoesPagas);

    await act(async () => b.resolver([pagamento("pb", "Pago na B")]));
    expect(await screen.findByText("Pagamento Pago na B")).toBeInTheDocument();

    await act(async () => {
      a.resolver([pagamento("pa", "Pago na A")]);
      await a.promessa;
    });
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByText("Pagamento Pago na B")).toBeInTheDocument();
    expect(screen.queryByText("Pagamento Pago na A")).not.toBeInTheDocument();
  });
});
