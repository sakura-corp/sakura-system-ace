// @vitest-environment jsdom
/**
 * Teste de TELA de Movimentações (#1093; #1079, item 23): o filtro Tudo /
 * Entradas / Saídas e por data.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import { renderizar, screen } from "@/testes/tela";
import type { MovimentoEstoque } from "@/types/estoque";
import type { Peca } from "@/types/peca";

vi.mock("@/lib/estoque", () => ({ criarMovimento: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const { MovimentacoesSection } = await import("./MovimentacoesSection");

const PECAS = [
  { id: "a", descricao: "Pneu entrou" },
  { id: "b", descricao: "Pneu saiu dia 10" },
  { id: "c", descricao: "Pneu saiu dia 20" },
] as unknown as Peca[];

const mov = (id: string, peca_id: string, tipo: "entrada" | "saida", criado_em: string): MovimentoEstoque => ({
  id,
  loja_id: "l",
  deposito_id: "d",
  peca_id,
  tipo,
  quantidade: 1,
  motivo: tipo === "entrada" ? "compra" : "uso_em_os",
  referencia: null,
  criado_em,
});

function montar() {
  return renderizar(
    <MovimentacoesSection
      pecas={PECAS}
      movimentos={[
        mov("1", "a", "entrada", "2026-11-05T10:00:00"),
        mov("2", "b", "saida", "2026-11-10T10:00:00"),
        mov("3", "c", "saida", "2026-11-20T10:00:00"),
      ]}
      depositos={[]}
      lojaId="l"
      onRecarregar={vi.fn()}
    />,
  );
}

describe("MovimentacoesSection — filtros (#1093)", () => {
  it("'Saídas' tira as entradas; uma data deixa só o dia", async () => {
    const { user } = montar();
    await user.click(screen.getByRole("button", { name: /Saídas/ }));
    expect(screen.queryByText("Pneu entrou")).toBeNull();
    expect(screen.getByText("Pneu saiu dia 10")).toBeTruthy();
    expect(screen.getByText("Pneu saiu dia 20")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-11-10" } });
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-11-10" } });
    expect(screen.getByText("Pneu saiu dia 10")).toBeTruthy();
    expect(screen.queryByText("Pneu saiu dia 20")).toBeNull();
  });

  it("'Entradas' mostra só a entrada, com o '+'", async () => {
    const { user } = montar();
    await user.click(screen.getByRole("button", { name: /Entradas/ }));
    expect(screen.getByText("Pneu entrou").closest("li")!.textContent).toContain("+1");
    expect(screen.queryByText("Pneu saiu dia 10")).toBeNull();
  });
});
