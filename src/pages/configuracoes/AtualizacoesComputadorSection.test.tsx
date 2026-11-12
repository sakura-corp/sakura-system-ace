// @vitest-environment jsdom
/**
 * Aviso de falta de internet na seção de atualizações (#374): só texto,
 * o botão Salvar não é travado (aviso, nunca tranca).
 */
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { reiniciarConexaoParaTeste } from "@/hooks/useConexao";
import { renderizar, screen } from "@/testes/tela";
import { AtualizacoesComputadorSection } from "./AtualizacoesComputadorSection";

beforeEach(() => {
  reiniciarConexaoParaTeste();
  // A ponte do Electron, de mentira: sem ela a seção diz que só existe no programa instalado.
  (window as unknown as { sakuraApp: unknown }).sakuraApp = {
    canalAtualizacao: async () => "normal",
    definirCanalAtualizacao: async () => undefined,
  };
});

describe("AtualizacoesComputadorSection — sem internet (#374)", () => {
  it("offline: mostra a frase e o Salvar não é travado por ela", async () => {
    renderizar(<AtualizacoesComputadorSection />);
    await screen.findByRole("button", { name: "Salvar" });
    expect(screen.queryByText(/Sem internet o programa não procura atualização/)).not.toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText(/Sem internet o programa não procura atualização/)).toBeInTheDocument();
  });
});
