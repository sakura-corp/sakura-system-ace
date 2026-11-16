// @vitest-environment jsdom
/**
 * As abas da tela (tarefa 9, #990): o teclado do padrão "abas" da WAI-ARIA.
 * Só a aba escolhida entra na ordem do Tab; as setas, Home e End andam entre
 * elas, escolhendo e dando o foco à nova.
 */
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { AbasDaTela } from "./avisosEAbas";

type Aba = "a" | "b" | "c";
function Exemplo() {
  const [ativa, setAtiva] = useState<Aba>("a");
  return (
    <AbasDaTela
      rotulo="Exemplo"
      ativa={ativa}
      aoEscolher={setAtiva}
      abas={[
        ["a", "Primeira"],
        ["b", "Segunda"],
        ["c", "Terceira"],
      ]}
    />
  );
}

describe("AbasDaTela", () => {
  it("só a aba escolhida entra no Tab", () => {
    renderizar(<Exemplo />);
    expect(screen.getByRole("tab", { name: "Primeira" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Segunda" })).toHaveAttribute("tabindex", "-1");
  });

  it("as setas escolhem e levam o foco, dando a volta nas pontas; Home e End vão pras pontas", async () => {
    const { user } = renderizar(<Exemplo />);
    screen.getByRole("tab", { name: "Primeira" }).focus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Segunda" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Segunda" })).toHaveFocus();

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Terceira" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Primeira" })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Terceira" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Primeira" })).toHaveFocus();
  });

  it("o clique continua escolhendo a aba", async () => {
    const { user } = renderizar(<Exemplo />);
    await user.click(screen.getByRole("tab", { name: "Terceira" }));
    expect(screen.getByRole("tab", { name: "Terceira" })).toHaveAttribute("aria-selected", "true");
  });
});
