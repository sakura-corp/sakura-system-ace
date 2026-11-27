// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { ErroDeCarga } from "./ErroDeCarga";

describe("ErroDeCarga (#1017)", () => {
  it("mostra a mensagem como alerta e o 'Tentar de novo' chama quem recarrega", async () => {
    const tentarDeNovo = vi.fn();
    const tela = renderizar(<ErroDeCarga mensagem="Sem conexão com a internet." tentarDeNovo={tentarDeNovo} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Sem conexão com a internet.");
    await tela.user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(tentarDeNovo).toHaveBeenCalledTimes(1);
  });
});
