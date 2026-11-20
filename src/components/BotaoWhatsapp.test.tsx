// @vitest-environment jsdom
//
// O BotaoWhatsapp virou uma variante do Botao (#990, tarefa 2). Mudou a
// aparência; o que ele faz tem que ser o de antes: abrir a conversa, avisar
// quem chamou, e mostrar o erro no próprio botão em vez de sumir calado.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const abrirConversaWhatsapp = vi.fn();
vi.mock("@/lib/whatsapp", () => ({
  abrirConversaWhatsapp: (...args: unknown[]) => abrirConversaWhatsapp(...args),
}));

const { BotaoWhatsapp } = await import("./BotaoWhatsapp");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BotaoWhatsapp", () => {
  it("abre a conversa com o telefone e o texto, e avisa quem chamou", async () => {
    abrirConversaWhatsapp.mockResolvedValue(undefined);
    const aoAbrir = vi.fn();
    render(<BotaoWhatsapp telefone="16999990000" texto="Seu carro está pronto" rotulo="Avisar" aoAbrir={aoAbrir} />);

    fireEvent.click(screen.getByRole("button", { name: "Avisar" }));
    await waitFor(() => expect(aoAbrir).toHaveBeenCalledTimes(1));
    expect(abrirConversaWhatsapp).toHaveBeenCalledWith("16999990000", "Seu carro está pronto");
  });

  it("quando não abre, o motivo aparece embaixo do botão (telefone sem DDD é o caso comum)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    abrirConversaWhatsapp.mockRejectedValue(new Error("O telefone do cliente está sem DDD."));
    const aoAbrir = vi.fn();
    render(<BotaoWhatsapp telefone="99990000" texto="Oi" aoAbrir={aoAbrir} />);

    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(await screen.findByText("O telefone do cliente está sem DDD.")).toBeTruthy();
    expect(aoAbrir).not.toHaveBeenCalled();
  });

  it("é a variante de WhatsApp do Botao: borda verde, sem fundo cheio, 32 px na linha", () => {
    render(<BotaoWhatsapp telefone="16999990000" texto="Oi" />);
    const classes = screen.getByRole("button", { name: "WhatsApp" }).getAttribute("class")?.split(/\s+/) ?? [];
    expect(classes).toContain("border-zap/45");
    expect(classes).toContain("h-8");
    expect(classes.some((c) => /^bg-(zap|ok|emerald)/.test(c))).toBe(false);
  });

  // Da revisão de código do PR (15/11): o ícone tinha a cor verde escrita
  // nele, e continuava verde vivo com o botão desligado (abrindo a conversa).
  it("o ícone não tem cor própria: quem pinta é o botão, que sabe quando está desligado", () => {
    render(<BotaoWhatsapp telefone="16999990000" texto="Oi" />);
    const botao = screen.getByRole("button", { name: "WhatsApp" });
    expect(botao.querySelector("svg")?.getAttribute("class") ?? "").not.toMatch(/text-/);
    const classes = botao.getAttribute("class")?.split(/\s+/) ?? [];
    expect(classes).toContain("[&_svg]:text-zap");
    expect(classes).toContain("disabled:[&_svg]:text-texto-3");
  });
});
