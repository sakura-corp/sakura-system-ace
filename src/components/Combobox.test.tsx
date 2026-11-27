// @vitest-environment jsdom
/**
 * O Enter no campo de lista (#1096, achado da revisão): com a lista aberta e
 * NADA digitado, o Enter escolhia a primeira opção da lista inteira. Quem
 * passava pelos campos com Enter (o balcão) trocava a marca do carro, "Ford"
 * virava "Fiat", sem perceber. Agora, sem digitar e sem andar pelas setas, o
 * Enter só fecha a lista e mantém o que estava.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { Combobox } from "./Combobox";

const OPCOES = ["Fiat", "Ford", "Volkswagen"].map((m) => ({ valor: m, rotulo: m }));

function Campo({ inicial, aoMudar }: { inicial: string; aoMudar: (v: string) => void }) {
  const [valor, setValor] = useState(inicial);
  return (
    <Combobox
      id="marca"
      opcoes={OPCOES}
      valor={valor}
      onMudar={(v) => {
        aoMudar(v);
        setValor(v);
      }}
      opcaoVazia="Sem marca"
      permitirLivre
    />
  );
}

function montar(inicial: string) {
  const aoMudar = vi.fn();
  const r = renderizar(<Campo inicial={inicial} aoMudar={aoMudar} />);
  return { ...r, aoMudar, campo: screen.getByRole("combobox") };
}

describe("Combobox — o Enter", () => {
  it("sem digitar nada, o Enter fecha a lista e NÃO troca o valor", async () => {
    const { user, aoMudar, campo } = montar("Ford");

    await user.click(campo);
    expect(campo).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Enter}");

    expect(aoMudar).not.toHaveBeenCalled();
    expect(campo).toHaveAttribute("aria-expanded", "false");
    expect(campo).toHaveValue("Ford");
  });

  it("andando pelas setas, o Enter escolhe a opção marcada", async () => {
    const { user, aoMudar, campo } = montar("Ford");

    await user.click(campo);
    // A 1ª posição é o "Sem marca"; uma seta pra baixo marca "Fiat".
    await user.keyboard("{ArrowDown}{Enter}");

    expect(aoMudar).toHaveBeenCalledWith("Fiat");
  });

  it("digitando, o Enter escolhe a primeira opção que bate", async () => {
    const { user, aoMudar, campo } = montar("");

    await user.click(campo);
    await user.keyboard("volks{Enter}");

    expect(aoMudar).toHaveBeenCalledWith("Volkswagen");
  });
});
