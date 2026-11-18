// @vitest-environment jsdom
/**
 * A peça `Chips` (visual da leva 8, #1133): a escolha por botões. Uma opção
 * só (forma de pagamento, Tudo/Entradas/Saídas) ou várias (os filtros).
 *
 * O que se prova aqui: o grupo tem nome; o escolhido é anunciado
 * (`aria-pressed`) e aparece também SEM a cor (o visto na frente); na escolha
 * única, clicar troca e clicar de novo no escolhido não apaga; na de várias,
 * clicar liga e desliga, na ordem das opções; o teclado (Tab + Espaço/Enter)
 * faz tudo; e opção desligada não responde.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { Chips } from "./Chips";

type Forma = "dinheiro" | "pix" | "cartao";
const FORMAS = [
  { valor: "dinheiro", nome: "Dinheiro" },
  { valor: "pix", nome: "Pix" },
  { valor: "cartao", nome: "Cartão" },
] as const;

function Unica({ aoMudar }: { aoMudar?: (v: Forma) => void }) {
  const [valor, setValor] = useState<Forma>("dinheiro");
  return (
    <Chips
      rotulo="Forma de pagamento"
      opcoes={FORMAS}
      valor={valor}
      aoEscolher={(v) => {
        setValor(v);
        aoMudar?.(v);
      }}
    />
  );
}

function Varias() {
  const [valor, setValor] = useState<Forma[]>([]);
  return (
    <>
      <Chips
        multipla
        rotulo="Formas aceitas"
        opcoes={FORMAS}
        valor={valor}
        aoEscolher={setValor}
      />
      <output>{valor.join(",")}</output>
    </>
  );
}

describe("Chips", () => {
  it("dá nome ao grupo e anuncia o escolhido", () => {
    renderizar(<Unica />);
    expect(screen.getByRole("group", { name: "Forma de pagamento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dinheiro" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Pix" })).toHaveAttribute("aria-pressed", "false");
  });

  it("mostra o escolhido também sem a cor: o visto só no escolhido", () => {
    renderizar(<Unica />);
    const escolhido = screen.getByRole("button", { name: "Dinheiro" });
    const outro = screen.getByRole("button", { name: "Pix" });
    expect(escolhido.querySelector("[data-visto]")).not.toBeNull();
    expect(outro.querySelector("[data-visto]")).toBeNull();
  });

  it("escolha única: o clique troca, e clicar de novo no escolhido não apaga", async () => {
    const aoMudar = vi.fn();
    const { user } = renderizar(<Unica aoMudar={aoMudar} />);
    await user.click(screen.getByRole("button", { name: "Pix" }));
    expect(screen.getByRole("button", { name: "Pix" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Dinheiro" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Pix" }).querySelector("[data-visto]")).not.toBeNull();

    aoMudar.mockClear();
    await user.click(screen.getByRole("button", { name: "Pix" }));
    expect(aoMudar).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Pix" })).toHaveAttribute("aria-pressed", "true");
  });

  it("várias: o clique liga e desliga, e a lista sai na ordem das opções", async () => {
    const { user } = renderizar(<Varias />);
    await user.click(screen.getByRole("button", { name: "Cartão" }));
    await user.click(screen.getByRole("button", { name: "Dinheiro" }));
    expect(screen.getByRole("status")).toHaveTextContent("dinheiro,cartao");
    expect(screen.getByRole("button", { name: "Cartão" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Cartão" }));
    expect(screen.getByRole("status")).toHaveTextContent(/^dinheiro$/);
    expect(screen.getByRole("button", { name: "Cartão" })).toHaveAttribute("aria-pressed", "false");
  });

  it("só no teclado: Tab chega às opções e Espaço ou Enter escolhe", async () => {
    const { user } = renderizar(<Unica />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Dinheiro" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Pix" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: "Pix" })).toHaveAttribute("aria-pressed", "true");
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Cartão" })).toHaveAttribute("aria-pressed", "true");
  });

  it("dentro de um formulário, escolher não envia o formulário", async () => {
    const enviar = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    const { user } = renderizar(
      <form onSubmit={enviar}>
        <Unica />
      </form>,
    );
    await user.click(screen.getByRole("button", { name: "Pix" }));
    expect(enviar).not.toHaveBeenCalled();
  });

  it("opção desligada não responde", async () => {
    const aoEscolher = vi.fn();
    const { user } = renderizar(
      <Chips
        rotulo="Forma de pagamento"
        opcoes={[
          { valor: "dinheiro", nome: "Dinheiro" },
          { valor: "pix", nome: "Pix", desligada: true },
        ]}
        valor="dinheiro"
        aoEscolher={aoEscolher}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Pix" }));
    expect(aoEscolher).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Pix" })).toBeDisabled();
  });
});
