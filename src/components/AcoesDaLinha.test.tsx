// @vitest-environment jsdom
/**
 * O menu "Mais ações" (`AcoesDaLinha`), que na tarefa 7 do visual novo (#990)
 * passou a guardar as ações da lista de OS que não são o próximo passo
 * ("Fechamento", "Avaliação"...). O balcão é operado no teclado: o menu tem de
 * abrir, andar e fechar sem mouse, senão "Fechamento" some pra quem não usa
 * mouse.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { Modal } from "./Modal";
import { AcoesDaLinha } from "./AcoesDaLinha";

function montar(aoFechamento = vi.fn(), aoAvaliacao = vi.fn()) {
  return renderizar(
    <AcoesDaLinha
      descricao="OS 148"
      acoes={[
        { tipo: "menu", rotulo: "Fechamento", aoClicar: aoFechamento },
        { tipo: "menu", rotulo: "Avaliação", aoClicar: aoAvaliacao },
        { tipo: "menu", rotulo: "Abrir a OS", aoClicar: vi.fn() },
      ]}
    />,
  );
}

const botaoMais = () => screen.getByRole("button", { name: "Mais ações — OS 148" });

describe("AcoesDaLinha, o menu Mais ações", () => {
  it("abre pelo teclado (Enter) com o foco no primeiro item", async () => {
    const { user } = montar();
    await user.tab();
    expect(botaoMais()).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(botaoMais()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Fechamento" })).toHaveFocus();
  });

  it("fecha com Esc e devolve o foco pro botão", async () => {
    const { user } = montar();
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(botaoMais()).toHaveFocus();
  });

  it("as setas andam pelos itens e dão a volta; Enter escolhe", async () => {
    const aoAvaliacao = vi.fn();
    const { user } = montar(vi.fn(), aoAvaliacao);
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Avaliação" })).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Fechamento" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Abrir a OS" })).toHaveFocus();
    await user.keyboard("{Home}{ArrowDown}{Enter}");
    expect(aoAvaliacao).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("dentro de uma janela, o Esc fecha só o menu, não a janela", async () => {
    const aoFecharJanela = vi.fn();
    const { user } = renderizar(
      <Modal titulo="Janela" onFechar={aoFecharJanela}>
        <AcoesDaLinha
          descricao="OS 148"
          acoes={[{ tipo: "menu", rotulo: "Fechamento", aoClicar: vi.fn() }]}
        />
      </Modal>,
    );
    await user.click(botaoMais());
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(aoFecharJanela).not.toHaveBeenCalled();
  });
});

describe("AcoesDaLinha, o Tab com o menu aberto", () => {
  it("fecha o menu e segue pro próximo da tela, depois do botão (não pro fim da página)", async () => {
    const { user } = renderizar(
      <div>
        <AcoesDaLinha
          descricao="OS 148"
          acoes={[{ tipo: "menu", rotulo: "Fechamento", aoClicar: vi.fn() }]}
        />
        <button type="button">Depois</button>
      </div>,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("menuitem", { name: "Fechamento" })).toHaveFocus();
    await user.tab();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Depois" })).toHaveFocus();
  });
});
