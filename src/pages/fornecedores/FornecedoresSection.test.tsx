// @vitest-environment jsdom
/**
 * Teste de TELA da lista de Fornecedores (#969): abrir o formulário (canetinha
 * ou "+ Novo") rola a tela até ele e põe o cursor no primeiro campo. Antes, com
 * a lista rolada, o formulário abria fora da vista e parecia que o clique não
 * tinha feito nada. O gancho é `hooks/useRolarAteOFormulario.ts`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { Fornecedor } from "@/types/fornecedor";

vi.mock("@/lib/fornecedores", () => ({
  criarFornecedor: vi.fn(),
  atualizarFornecedor: vi.fn(),
  atualizarStatusFornecedor: vi.fn(),
  excluirFornecedor: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const { FornecedoresSection } = await import("./FornecedoresSection");

const SELETOR_CAMPO =
  "input:not([type=hidden]):not(:disabled):not([readonly]), select:not(:disabled), textarea:not(:disabled)";

const DISTRIBUIDORA: Fornecedor = {
  id: "f-1",
  nome: "Distribuidora Exemplo",
  cnpj: null,
  telefone: null,
  email: null,
  cep: null,
  rua: null,
  numero: null,
  bairro: null,
  cidade: null,
  uf: null,
  ativo: true,
  criado_em: "2026-01-01T00:00:00.000Z",
};

let rolar: ReturnType<typeof vi.fn<(opcoes?: boolean | ScrollIntoViewOptions) => void>>;
beforeEach(() => {
  rolar = vi.fn<(opcoes?: boolean | ScrollIntoViewOptions) => void>();
  Element.prototype.scrollIntoView = rolar;
});

function montar() {
  return renderizar(
    <FornecedoresSection
      fornecedores={[DISTRIBUIDORA]}
      onRecarregar={vi.fn().mockResolvedValue(undefined)}
    />,
  );
}

describe("FornecedoresSection — abrir o formulário rola até ele (#969)", () => {
  it("a canetinha pede a rolagem e põe o foco no primeiro campo do formulário", async () => {
    const { user, container } = montar();
    await user.click(screen.getByRole("button", { name: /^Editar .*Distribuidora Exemplo/ }));

    const formulario = container.querySelector("form")!;
    expect(formulario).toBeTruthy();
    expect(document.activeElement).toBe(formulario.querySelector(SELETOR_CAMPO));
    expect(rolar).toHaveBeenCalled();
  });

  it("o \"+ Novo\" também", async () => {
    const { user, container } = montar();
    await user.click(screen.getByRole("button", { name: /^\+ Novo/ }));

    const formulario = container.querySelector("form")!;
    expect(document.activeElement).toBe(formulario.querySelector(SELETOR_CAMPO));
    expect(rolar).toHaveBeenCalled();
  });
});
