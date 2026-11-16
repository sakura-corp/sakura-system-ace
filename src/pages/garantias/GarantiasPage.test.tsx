// @vitest-environment jsdom
/**
 * Teste de TELA de Garantias (tarefa 8 do visual novo, #990).
 *
 * A conta do vencimento está em schemas/garantia.test.ts. O que só a tela
 * prova é a costura: o selo (com palavra, não só cor) de cada linha, as
 * abas que filtram, e a placa que só vira atalho pra quem pode abrir a ficha.
 */
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, userEvent, within } from "@/testes/tela";
import type { ItemGarantia } from "@/lib/garantias";
import type { Operador } from "@/types/operador";

const listarItensComGarantia = vi.fn();
vi.mock("@/lib/garantias", () => ({
  listarItensComGarantia: (...a: unknown[]) => listarItensComGarantia(...a),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

let operador: Partial<Operador> = { id: "op", admin: true, permissoes: [] };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ operador }) }));

const { GarantiasPage } = await import("./GarantiasPage");

function fechadaHa(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(15, 0, 0, 0);
  return d.toISOString();
}

function item(
  id: string,
  peca: string,
  diasDesdeFechar: number,
  prazo: number,
  placa: string | null,
): ItemGarantia {
  return {
    id,
    quantidade: 1,
    peca: { descricao: peca, prazo_garantia_dias: prazo },
    ordem: {
      id: `os-${id}`,
      status: "faturada",
      data_fechamento: fechadaHa(diasDesdeFechar),
      cliente: { nome: `Cliente ${id}` },
      veiculo: placa ? { id: `v-${id}`, placa } : null,
    },
  };
}

function montar() {
  return render(
    <MemoryRouter>
      <GarantiasPage />
    </MemoryRouter>,
  );
}

describe("GarantiasPage", () => {
  beforeEach(() => {
    operador = { id: "op", admin: true, permissoes: [] };
    listarItensComGarantia.mockResolvedValue([
      item("1", "Bateria 60Ah", 10, 365, "RTA-4B71"), // no prazo
      item("2", "Pastilha de freio", 400, 90, "QNS-1D02"), // vencida
      item("3", "Pneu 175/70", 5, 180, null), // no prazo, sem veículo
    ]);
  });

  it("cada linha tem um selo com a palavra: 'Dentro do prazo' ou 'Vencida'", async () => {
    montar();
    expect(await screen.findByText("Bateria 60Ah")).toBeInTheDocument();
    const linhaNoPrazo = screen.getByText("Bateria 60Ah").closest("tr")!;
    expect(within(linhaNoPrazo).getByText("Dentro do prazo").closest("[data-selo]")).toHaveAttribute(
      "data-selo",
      "ok",
    );
    const linhaVencida = screen.getByText("Pastilha de freio").closest("tr")!;
    expect(within(linhaVencida).getByText("Vencida").closest("[data-selo]")).toHaveAttribute(
      "data-selo",
      "perigo",
    );
  });

  it("as abas contam e filtram", async () => {
    montar();
    await screen.findByText("Bateria 60Ah");
    expect(screen.getByRole("tab", { name: "Todos (3)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Dentro do prazo (2)" })).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("tab", { name: "Vencida (1)" }));
    expect(screen.getByRole("tab", { name: "Vencida (1)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Pastilha de freio")).toBeInTheDocument();
    expect(screen.queryByText("Bateria 60Ah")).not.toBeInTheDocument();
  });

  it("a placa é um botão (a ficha do veículo) pra quem tem Clientes ou Ordens de Serviço", async () => {
    operador = { id: "op", admin: false, permissoes: ["garantias", "ordens_servico"] };
    montar();
    expect(await screen.findByRole("button", { name: "RTA-4B71" })).toBeInTheDocument();
    // Sem veículo na OS: um traço, nunca um botão vazio.
    const semVeiculo = screen.getByText("Pneu 175/70").closest("tr")!;
    expect(within(semVeiculo).queryByRole("button")).not.toBeInTheDocument();
    expect(within(semVeiculo).getByText("—", { selector: "td" })).toBeInTheDocument();
  });

  it("quem só tem Garantias vê a placa como texto, sem atalho que daria 'sem permissão'", async () => {
    operador = { id: "op", admin: false, permissoes: ["garantias"] };
    montar();
    await screen.findByText("Bateria 60Ah");
    expect(screen.queryByRole("button", { name: "RTA-4B71" })).not.toBeInTheDocument();
    expect(screen.getByText("RTA-4B71")).toBeInTheDocument();
  });

  it("sem nenhuma garantia: explica onde se define o prazo", async () => {
    listarItensComGarantia.mockResolvedValue([]);
    montar();
    expect(await screen.findByText(/Defina o prazo de garantia no cadastro do produto/)).toBeInTheDocument();
  });

  it("erro ao carregar: a faixa de erro fica na tela, com o aviso de alerta", async () => {
    listarItensComGarantia.mockRejectedValue(new Error("falhou de vez"));
    montar();
    expect(await screen.findByRole("alert")).toHaveTextContent(/falhou de vez|erro/i);
  });
});
