// @vitest-environment jsdom
//
// A placa no visual novo (#990, tarefa 2): mudou a aparência (a faixa azul em
// cima, que lembra a placa Mercosul), não o que ela faz. O teste de que o
// clique abre a ficha sem disparar o clique da linha continua onde sempre
// esteve: src/pages/veiculos/FichaVeiculoPage.test.tsx.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { LinkPlaca } from "./LinkPlaca";

afterEach(cleanup);

function montar() {
  render(
    <MemoryRouter initialEntries={["/ordens-servico"]}>
      <Routes>
        <Route path="/ordens-servico" element={<LinkPlaca veiculoId="v1" placa="RTA-4B71" />} />
        <Route path="/veiculos/:id" element={<p>ficha aberta</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return screen.getByRole("button", { name: "RTA-4B71" });
}

describe("LinkPlaca", () => {
  it("continua sendo um botão com a placa escrita, e abre a ficha no clique", () => {
    const placa = montar();
    fireEvent.click(placa);
    expect(screen.getByText("ficha aberta")).toBeTruthy();
  });

  it("tem a faixa de cima, que é enfeite: o leitor de tela lê só a placa", () => {
    const placa = montar();
    const faixa = placa.querySelector("[data-faixa]");
    expect(faixa).not.toBeNull();
    expect(faixa?.getAttribute("aria-hidden")).toBe("true");
    expect(placa.textContent).toBe("RTA-4B71");
  });

  it("diz o que o clique faz, pra quem chega pelo teclado também", () => {
    const placa = montar();
    fireEvent.keyDown(document, { key: "Tab" });
    fireEvent.focus(placa);
    expect(screen.getByRole("tooltip").textContent).toBe("Abrir a ficha do veículo");
    // A dica do programa entrou no lugar da do navegador: as duas juntas
    // apareceriam uma em cima da outra.
    expect(placa.getAttribute("title")).toBeNull();
  });

  it("tem 32 px de altura: o alvo de clique das listas (TR-02.1)", () => {
    expect(montar().getAttribute("class")?.split(/\s+/)).toContain("h-8");
  });
});
