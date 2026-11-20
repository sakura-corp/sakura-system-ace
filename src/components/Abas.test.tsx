// @vitest-environment jsdom
/**
 * A peça das abas (visual novo, #990): o teclado do padrão "abas" da
 * WAI-ARIA. Só a aba escolhida entra na ordem do Tab; as setas, Home e End
 * andam entre elas, escolhendo e dando o foco à nova. E a contagem entra no
 * fim do nome que o leitor de tela lê.
 */
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { Abas } from "./Abas";

type Valor = "a" | "b" | "c";
function Exemplo() {
  const [ativa, setAtiva] = useState<Valor>("a");
  return (
    <Abas
      rotulo="Exemplo"
      ativa={ativa}
      aoEscolher={setAtiva}
      abas={[
        { valor: "a", nome: "Primeira" },
        { valor: "b", nome: "Segunda" },
        { valor: "c", nome: "Terceira", conta: 7 },
      ]}
    />
  );
}

describe("Abas", () => {
  it("dá o nome à fileira e só a aba escolhida entra no Tab", () => {
    renderizar(<Exemplo />);
    expect(screen.getByRole("tablist", { name: "Exemplo" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Primeira" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Segunda" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tab", { name: "Terceira 7" })).toHaveAttribute("tabindex", "-1");
  });

  it("o clique escolhe a aba e ela passa a ser a do Tab", async () => {
    const { user } = renderizar(<Exemplo />);
    await user.click(screen.getByRole("tab", { name: "Segunda" }));
    expect(screen.getByRole("tab", { name: "Segunda" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Segunda" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Primeira" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Primeira" })).toHaveAttribute("tabindex", "-1");
  });

  it("as setas escolhem e levam o foco, dando a volta nas pontas; Home e End vão pras pontas", async () => {
    const { user } = renderizar(<Exemplo />);
    screen.getByRole("tab", { name: "Primeira" }).focus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Segunda" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Segunda" })).toHaveFocus();

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Terceira 7" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Terceira 7" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Primeira" })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Terceira 7" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Primeira" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Primeira" })).toHaveFocus();
  });

  it("dentro de um formulário, a aba não envia", async () => {
    let enviou = false;
    const { user } = renderizar(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviou = true;
        }}
      >
        <Exemplo />
      </form>,
    );
    await user.click(screen.getByRole("tab", { name: "Segunda" }));
    expect(enviou).toBe(false);
  });

  it("liga cada aba ao painel quando a tela pede", () => {
    renderizar(
      <Abas
        rotulo="Com painel"
        ativa="x"
        aoEscolher={() => {}}
        prefixoId="aba-teste"
        painel="painel-teste"
        abas={[{ valor: "x", nome: "Xis" }]}
      />,
    );
    const aba = screen.getByRole("tab", { name: "Xis" });
    expect(aba).toHaveAttribute("id", "aba-teste-x");
    expect(aba).toHaveAttribute("aria-controls", "painel-teste");
  });
});
