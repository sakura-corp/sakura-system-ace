// @vitest-environment jsdom
/**
 * Tarefa #967: trocar de loja enquanto os dados da loja anterior ainda carregam.
 * A resposta atrasada da loja velha não pode encher a tela da loja nova (nem os
 * dados, nem o erro, nem o fim do "Carregando..."): quem salvasse em seguida
 * gravaria o dado de uma loja na outra.
 */
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";

const lojaA = { id: "loja-a", nome: "Loja A", cidade: "Cidade Teste" };
const lojaB = { id: "loja-b", nome: "Loja B", cidade: "Cidade Teste" };
const auth = vi.hoisted(() => ({ lojaAtual: null as unknown }));
const operador = { id: "op-1", nome: "Admin Teste", usuario: "admin", admin: true, ativo: true, permissoes: [] };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: auth.lojaAtual }),
}));

const m = vi.hoisted(() => ({
  buscarConfiguracaoFiscal: vi.fn(),
  buscarTextoGarantia: vi.fn(),
}));

vi.mock("@/lib/configuracoes", async (original) => ({
  ...(await original<object>()),
  listarJurosParcelas: vi.fn().mockResolvedValue([]),
  buscarConfiguracaoPainelInicio: vi.fn().mockResolvedValue([]),
  buscarConfiguracaoPix: vi.fn().mockResolvedValue(null),
  buscarLinkAvaliacao: vi.fn().mockResolvedValue(null),
  buscarConfiguracaoFiscal: m.buscarConfiguracaoFiscal,
  buscarTextoGarantia: m.buscarTextoGarantia,
}));
vi.mock("@/lib/operadores", async (original) => ({
  ...(await original<object>()),
  listarOperadores: vi.fn().mockResolvedValue([operador]),
}));
vi.mock("@/lib/lojas", async (original) => ({
  ...(await original<object>()),
  listarLojas: vi.fn().mockResolvedValue([lojaA, lojaB]),
  listarLojasDoOperador: vi.fn().mockResolvedValue([lojaA, lojaB]),
}));
vi.mock("@/lib/depositos", async (original) => ({
  ...(await original<object>()),
  listarDepositos: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/categorias", async (original) => ({
  ...(await original<object>()),
  listarCategorias: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/categoriasCaixa", async (original) => ({
  ...(await original<object>()),
  listarCategoriasCaixa: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/categoriasServico", async (original) => ({
  ...(await original<object>()),
  listarCategoriasServico: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/modelosWhatsapp", async (original) => ({
  ...(await original<object>()),
  listarModelosWhatsapp: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/computadores", async (original) => ({
  ...(await original<object>()),
  listarComputadores: vi.fn().mockResolvedValue([]),
}));

const { ConfiguracoesPage } = await import("./ConfiguracoesPage");

/** Uma resposta que só chega quando o teste mandar. */
function adiada<T>() {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: unknown) => void;
  const promessa = new Promise<T>((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.lojaAtual = lojaA;
  m.buscarConfiguracaoFiscal.mockResolvedValue(null);
});

/** O texto de garantia de cada loja chega quando o teste mandar. */
function prepararRespostas() {
  const a = adiada<string>();
  const b = adiada<string>();
  m.buscarTextoGarantia.mockImplementation((lojaId: string) =>
    lojaId === "loja-a" ? a.promessa : b.promessa,
  );
  return { a, b };
}

async function trocarPraLojaB(rerender: (ui: ReactElement) => void) {
  auth.lojaAtual = lojaB;
  rerender(<ConfiguracoesPage />);
  await waitFor(() => expect(m.buscarTextoGarantia).toHaveBeenCalledWith("loja-b"));
}

describe("Configurações: troca de loja no meio da carga", () => {
  it("a loja A chega depois da B: a tela mostra só os dados da B", async () => {
    const { a, b } = prepararRespostas();
    const { user, rerender } = renderizar(<ConfiguracoesPage />);
    await waitFor(() => expect(m.buscarTextoGarantia).toHaveBeenCalledWith("loja-a"));
    await trocarPraLojaB(rerender);

    b.resolver("Garantia da loja B");
    await user.click(await screen.findByText("Texto de garantia"));
    expect(await screen.findByDisplayValue("Garantia da loja B")).toBeInTheDocument();

    // A resposta atrasada da loja A chega por último.
    a.resolver("Garantia da loja A");
    await new Promise((r) => setTimeout(r, 30));
    // Fechar e abrir a seção: o formulário lê de novo o que a página guardou.
    await user.click(screen.getByText("Texto de garantia"));
    await user.click(screen.getByText("Texto de garantia"));
    expect(await screen.findByDisplayValue("Garantia da loja B")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Garantia da loja A")).not.toBeInTheDocument();
  });

  it("a loja A termina antes da B: a tela continua em 'Carregando...' até a B chegar", async () => {
    const { a, b } = prepararRespostas();
    const { rerender } = renderizar(<ConfiguracoesPage />);
    await waitFor(() => expect(m.buscarTextoGarantia).toHaveBeenCalledWith("loja-a"));
    await trocarPraLojaB(rerender);

    a.resolver("Garantia da loja A");
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
    expect(screen.queryByText("Texto de garantia")).not.toBeInTheDocument();

    b.resolver("Garantia da loja B");
    expect(await screen.findByText("Texto de garantia")).toBeInTheDocument();
  });

  it("o erro atrasado da loja A não aparece na tela da loja B", async () => {
    const { a, b } = prepararRespostas();
    const { rerender } = renderizar(<ConfiguracoesPage />);
    await waitFor(() => expect(m.buscarTextoGarantia).toHaveBeenCalledWith("loja-a"));
    await trocarPraLojaB(rerender);

    b.resolver("Garantia da loja B");
    expect(await screen.findByText("Texto de garantia")).toBeInTheDocument();

    vi.spyOn(console, "error").mockImplementation(() => {});
    a.rejeitar(new Error("Falha da loja A"));
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByText(/Falha da loja A/)).not.toBeInTheDocument();
    expect(screen.getByText("Texto de garantia")).toBeInTheDocument();
  });
});
