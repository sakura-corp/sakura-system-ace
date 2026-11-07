// @vitest-environment jsdom
/** Tarefa #459: o campo "Link de avaliação no Google" em Configurações. */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";

const salvarLinkAvaliacao = vi.fn();
vi.mock("@/lib/configuracoes", () => ({
  salvarLinkAvaliacao: (...a: unknown[]) => salvarLinkAvaliacao(...a),
}));
vi.mock("@/lib/modelosWhatsapp", async () => {
  const { modeloPorChave } = await import("@/schemas/whatsapp");
  return {
    salvarModeloWhatsapp: vi.fn(),
    textoDoModelo: (m: Record<string, string>, c: never) => m[c] ?? modeloPorChave(c).padrao,
  };
});

const { ModelosWhatsappSection } = await import("./ModelosWhatsappSection");

function montar(linkAvaliacao = "") {
  const onSalvo = vi.fn().mockResolvedValue(undefined);
  const r = renderizar(
    <ModelosWhatsappSection
      modelos={{}}
      lojaId="loja-a"
      linkAvaliacao={linkAvaliacao}
      onSalvo={onSalvo}
    />,
  );
  return { ...r, onSalvo };
}

describe("Link de avaliação no Google", () => {
  it("http:// mostra o erro e NÃO salva", async () => {
    salvarLinkAvaliacao.mockReset();
    const { user } = montar();
    await user.type(screen.getByLabelText("Link de avaliação no Google"), "http://x");
    await user.click(screen.getByRole("button", { name: "Salvar link" }));
    expect(await screen.findByText("O link precisa começar com https://")).toBeInTheDocument();
    expect(salvarLinkAvaliacao).not.toHaveBeenCalled();
  });

  it("https:// salva e avisa", async () => {
    salvarLinkAvaliacao.mockReset();
    salvarLinkAvaliacao.mockResolvedValue(undefined);
    const { user, onSalvo } = montar();
    await user.type(screen.getByLabelText("Link de avaliação no Google"), "https://g.page/r/x/review");
    await user.click(screen.getByRole("button", { name: "Salvar link" }));
    await waitFor(() =>
      expect(salvarLinkAvaliacao).toHaveBeenCalledWith("loja-a", "https://g.page/r/x/review"),
    );
    expect(await screen.findByText("Link salvo.")).toBeInTheDocument();
    expect(onSalvo).toHaveBeenCalled();
  });

  it("vazio apaga o link (salva null)", async () => {
    salvarLinkAvaliacao.mockReset();
    salvarLinkAvaliacao.mockResolvedValue(undefined);
    const { user } = montar("https://g.page/r/x/review");
    await user.clear(screen.getByLabelText("Link de avaliação no Google"));
    await user.click(screen.getByRole("button", { name: "Salvar link" }));
    await waitFor(() => expect(salvarLinkAvaliacao).toHaveBeenCalledWith("loja-a", null));
  });

  it("o modelo novo aparece na lista", () => {
    montar();
    expect(screen.getByText("Pedir avaliação no Google")).toBeInTheDocument();
  });
});
