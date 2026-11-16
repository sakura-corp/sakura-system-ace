// @vitest-environment jsdom
/**
 * A janela "Ver veículos" da lista de Clientes (tarefa 8 do visual novo, #990):
 * cada carro com a placa (que é o atalho pra ficha) e um "Ver ficha" ao lado.
 * O carro sem placa aparece pela marca e modelo, sem uma placa vazia.
 */
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { screen, userEvent, within } from "@/testes/tela";
import type { Cliente } from "@/types/cliente";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const { VeiculosDoClienteModal } = await import("./VeiculosDoClienteModal");

function Local() {
  return <p>Rota: {useLocation().pathname}</p>;
}

const cliente = {
  id: "c1",
  nome: "Camila Rocha",
  veiculos: [
    { id: "v1", placa: "MJU-9F44", marca: "Fiat", modelo: "Uno", ano: 2015, cor: "branco" },
    { id: "v2", placa: " ", marca: "Honda", modelo: "Fit", ano: null, cor: null },
  ],
} as unknown as Cliente;

function montar() {
  return render(
    <MemoryRouter initialEntries={["/clientes"]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <VeiculosDoClienteModal cliente={cliente} onFechar={() => {}} />
              <Local />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("VeiculosDoClienteModal", () => {
  it("mostra a placa como atalho e o detalhe do carro", () => {
    montar();
    expect(screen.getByRole("button", { name: "MJU-9F44" })).toBeInTheDocument();
    expect(screen.getByText("Fiat Uno · 2015 · branco")).toBeInTheDocument();
  });

  it("carro sem placa: 'sem placa' e a marca e o modelo, sem placa vazia", () => {
    montar();
    const linha = screen.getByText("Honda Fit").closest("li")!;
    expect(within(linha).getByText("sem placa")).toBeInTheDocument();
    expect(within(linha).queryByRole("button", { name: "" })).not.toBeInTheDocument();
  });

  it("'Ver ficha' leva pra ficha daquele carro", async () => {
    montar();
    await userEvent.setup().click(screen.getByRole("button", { name: "Ver ficha do veículo Honda Fit" }));
    expect(screen.getByText("Rota: /veiculos/v2")).toBeInTheDocument();
  });

  it("a placa também leva pra ficha", async () => {
    montar();
    await userEvent.setup().click(screen.getByRole("button", { name: "MJU-9F44" }));
    expect(screen.getByText("Rota: /veiculos/v1")).toBeInTheDocument();
  });
});
