// @vitest-environment jsdom
/**
 * Teste de TELA do perfil da peça (#1093): o saldo grande contra o mínimo, o
 * preço e a última saída de apoio, e as movimentações com "+" e "−" (nunca só
 * a cor). "Comprar" é o próximo passo quando falta.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import type { MovimentoEstoque } from "@/types/estoque";
import type { Peca } from "@/types/peca";

const excluirPeca = vi.fn();
vi.mock("@/lib/pecas", () => ({
  atualizarStatusPeca: vi.fn(),
  excluirPeca: (...a: unknown[]) => excluirPeca(...a),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const { PerfilDaPeca } = await import("./PerfilDaPeca");

const PECA = {
  id: "p1",
  descricao: "Filtro de óleo PSL55",
  codigo_interno: "FO-55",
  marca: "Tecfil",
  medida: null,
  unidade: "UN",
  preco_custo: 20,
  preco_venda: 40,
  estoque_minimo: 10,
  categoria_id: null,
  ativo: true,
} as unknown as Peca;

function mov(extra: Partial<MovimentoEstoque>): MovimentoEstoque {
  return {
    id: "m",
    loja_id: "l",
    deposito_id: "d1",
    peca_id: "p1",
    tipo: "saida",
    quantidade: 2,
    motivo: "uso_em_os",
    referencia: "OS 148",
    criado_em: "2025-11-20T10:00:00",
    ...extra,
  };
}

const MOVIMENTOS = [
  mov({ id: "s1" }),
  mov({ id: "e1", tipo: "entrada", motivo: "compra", quantidade: 5, referencia: null, criado_em: "2025-11-01T10:00:00" }),
];

function montar(extra: { saldo?: number; onComprar?: () => void } = {}) {
  const props = {
    peca: PECA,
    saldo: extra.saldo ?? 7,
    movimentos: MOVIMENTOS,
    depositos: [{ id: "d1", nome: "Loja" }] as never,
    categorias: [],
    onVoltar: vi.fn(),
    onEditar: vi.fn(),
    onComprar: extra.onComprar,
    onRecarregar: vi.fn().mockResolvedValue(undefined),
  };
  return { ...renderizar(<PerfilDaPeca {...props} />), props };
}

describe("PerfilDaPeca (#1093)", () => {
  it("o saldo é o número grande, contra o mínimo, com a palavra 'falta'", () => {
    montar();
    const saldo = screen.getByRole("group", { name: "Saldo" });
    expect(within(saldo).getByText("7")).toBeTruthy();
    expect(saldo.textContent).toContain("contra o mínimo de 10");
    expect(saldo.textContent).toContain("falta 3");
  });

  it("preço e última saída de apoio", () => {
    montar();
    expect(screen.getByRole("group", { name: "Preço de venda" }).textContent).toContain("40,00");
    expect(screen.getByRole("group", { name: "Última saída" }).textContent).toContain("20/11/2025");
  });

  it("as movimentações: entrada com '+', saída com '−'", () => {
    montar();
    const lista = screen.getByRole("list", { name: "Movimentações" });
    expect(lista.textContent).toContain("+5");
    expect(lista.textContent).toContain("−2");
    expect(within(lista).getByText("Compra")).toBeTruthy();
  });

  it("onde foi usada: a saída por OS, pelo número da OS", () => {
    montar();
    const usos = screen.getByRole("list", { name: "Onde foi usada" });
    expect(within(usos).getByText("OS 148")).toBeTruthy();
    expect(usos.textContent).not.toContain("+5");
  });

  it("faltando: 'Comprar' é o botão principal e leva à compra", async () => {
    const comprar = vi.fn();
    const { user } = montar({ onComprar: comprar });
    await user.click(screen.getByRole("button", { name: "Comprar" }));
    expect(comprar).toHaveBeenCalled();
  });

  it("folgado: o principal é 'Editar produto', sem 'Comprar'", async () => {
    const { user, props } = montar({ saldo: 30, onComprar: vi.fn() });
    expect(screen.queryByRole("button", { name: "Comprar" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Editar produto" }));
    expect(props.onEditar).toHaveBeenCalled();
  });

  it("excluir pergunta com o nome na janela do programa; cancelar não exclui", async () => {
    const { user } = montar();
    await user.click(screen.getByRole("button", { name: /^Mais ações/ }));
    await user.click(screen.getByRole("menuitem", { name: "Excluir produto" }));
    expect(await screen.findByRole("dialog", { name: "Excluir o produto Filtro de óleo PSL55?" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(excluirPeca).not.toHaveBeenCalled();
  });
});
