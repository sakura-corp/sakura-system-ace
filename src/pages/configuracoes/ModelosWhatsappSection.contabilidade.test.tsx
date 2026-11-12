// @vitest-environment jsdom
/** Tarefa #383: o bloco "Contato da contabilidade" em Configurações → WhatsApp. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";

const buscarContatoContabilidade = vi.fn();
const salvarContatoContabilidade = vi.fn();
vi.mock("@/lib/contabilidade", () => ({
  buscarContatoContabilidade: (...a: unknown[]) => buscarContatoContabilidade(...a),
  salvarContatoContabilidade: (...a: unknown[]) => salvarContatoContabilidade(...a),
}));
vi.mock("@/lib/configuracoes", () => ({ salvarLinkAvaliacao: vi.fn() }));
vi.mock("@/lib/modelosWhatsapp", async () => {
  const { modeloPorChave } = await import("@/schemas/whatsapp");
  return {
    salvarModeloWhatsapp: vi.fn(),
    textoDoModelo: (m: Record<string, string>, c: never) => m[c] ?? modeloPorChave(c).padrao,
  };
});

const { ModelosWhatsappSection } = await import("./ModelosWhatsappSection");

function montar(lojaId = "loja-a") {
  const props = { modelos: {}, linkAvaliacao: "", onSalvo: vi.fn().mockResolvedValue(undefined) };
  const r = renderizar(<ModelosWhatsappSection lojaId={lojaId} {...props} />);
  return { ...r, props };
}

beforeEach(() => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  buscarContatoContabilidade.mockReset();
  salvarContatoContabilidade.mockReset();
  buscarContatoContabilidade.mockResolvedValue(null);
  salvarContatoContabilidade.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Contato da contabilidade", () => {
  it("carga que falha trava os campos e os botões (salvar em branco não apaga o contato guardado)", async () => {
    buscarContatoContabilidade.mockRejectedValue(new Error("sem rede"));
    montar();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome da contabilidade")).toBeDisabled();
    expect(screen.getByLabelText("WhatsApp da contabilidade")).toBeDisabled();
    expect(screen.getByLabelText("E-mail da contabilidade")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salvar contato" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Apagar contato" })).toBeDisabled();
  });

  it("Apagar contato pergunta antes; dizendo não, nada é apagado", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    buscarContatoContabilidade.mockResolvedValue({ nome: "Marta", whatsapp: "11900000000", email: null });
    const { user } = montar();
    await screen.findByDisplayValue("Marta");
    await user.click(screen.getByRole("button", { name: "Apagar contato" }));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(salvarContatoContabilidade).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nome da contabilidade")).toHaveValue("Marta");
  });

  it("mostra o contato salvo da loja", async () => {
    buscarContatoContabilidade.mockResolvedValue({ nome: "Marta", whatsapp: "11900000000", email: null });
    montar();
    expect(await screen.findByDisplayValue("Marta")).toBeInTheDocument();
    expect(screen.getByDisplayValue("11900000000")).toBeInTheDocument();
    expect(buscarContatoContabilidade).toHaveBeenCalledWith("loja-a");
  });

  it("sem nome não salva e mostra o erro", async () => {
    const { user } = montar();
    await user.type(await screen.findByLabelText("WhatsApp da contabilidade"), "11900000000");
    await user.click(screen.getByRole("button", { name: "Salvar contato" }));
    expect(await screen.findByText("Informe o nome do contador ou do escritório.")).toBeInTheDocument();
    expect(salvarContatoContabilidade).not.toHaveBeenCalled();
  });

  it("sem WhatsApp e sem e-mail não salva", async () => {
    const { user } = montar();
    await user.type(await screen.findByLabelText("Nome da contabilidade"), "Marta");
    await user.click(screen.getByRole("button", { name: "Salvar contato" }));
    expect(await screen.findByText("Informe o WhatsApp ou o e-mail.")).toBeInTheDocument();
    expect(salvarContatoContabilidade).not.toHaveBeenCalled();
  });

  it("WhatsApp com poucos dígitos não salva", async () => {
    const { user } = montar();
    await user.type(await screen.findByLabelText("Nome da contabilidade"), "Marta");
    await user.type(screen.getByLabelText("WhatsApp da contabilidade"), "12345");
    await user.click(screen.getByRole("button", { name: "Salvar contato" }));
    expect(await screen.findByText(/de 10 a 13 números/)).toBeInTheDocument();
    expect(salvarContatoContabilidade).not.toHaveBeenCalled();
  });

  it("salva pela loja atual e avisa", async () => {
    const { user } = montar();
    await user.type(await screen.findByLabelText("Nome da contabilidade"), "Marta");
    await user.type(screen.getByLabelText("WhatsApp da contabilidade"), "(11) 90000-0000");
    await user.type(screen.getByLabelText("E-mail da contabilidade"), "marta@exemplo.com");
    await user.click(screen.getByRole("button", { name: "Salvar contato" }));
    await waitFor(() =>
      expect(salvarContatoContabilidade).toHaveBeenCalledWith("loja-a", {
        nome: "Marta",
        whatsapp: "(11) 90000-0000",
        email: "marta@exemplo.com",
      }),
    );
    expect(await screen.findByText("Contato salvo.")).toBeInTheDocument();
  });

  it("apagar o contato salva null e esvazia os campos", async () => {
    buscarContatoContabilidade.mockResolvedValue({ nome: "Marta", whatsapp: "11900000000", email: null });
    const { user } = montar();
    await screen.findByDisplayValue("Marta");
    await user.click(screen.getByRole("button", { name: "Apagar contato" }));
    await waitFor(() => expect(salvarContatoContabilidade).toHaveBeenCalledWith("loja-a", null));
    expect(screen.getByLabelText("Nome da contabilidade")).toHaveValue("");
  });

  it("esvaziar tudo e salvar também apaga", async () => {
    buscarContatoContabilidade.mockResolvedValue({ nome: "Marta", whatsapp: "11900000000", email: null });
    const { user } = montar();
    await screen.findByDisplayValue("Marta");
    await user.clear(screen.getByLabelText("Nome da contabilidade"));
    await user.clear(screen.getByLabelText("WhatsApp da contabilidade"));
    await user.click(screen.getByRole("button", { name: "Salvar contato" }));
    await waitFor(() => expect(salvarContatoContabilidade).toHaveBeenCalledWith("loja-a", null));
  });

  it("erro do banco aparece em português e não diz 'salvo'", async () => {
    salvarContatoContabilidade.mockRejectedValue(new Error("falha qualquer"));
    const { user } = montar();
    await user.type(await screen.findByLabelText("Nome da contabilidade"), "Marta");
    await user.type(screen.getByLabelText("E-mail da contabilidade"), "marta@exemplo.com");
    await user.click(screen.getByRole("button", { name: "Salvar contato" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Contato salvo.")).toBeNull();
  });

  it("trocar de loja recarrega o contato da outra", async () => {
    buscarContatoContabilidade.mockImplementation(async (id: string) =>
      id === "loja-a" ? { nome: "Marta", whatsapp: "11900000000", email: null } : null,
    );
    const { rerender, props } = montar("loja-a");
    await screen.findByDisplayValue("Marta");
    rerender(<ModelosWhatsappSection lojaId="loja-b" {...props} />);
    await waitFor(() => expect(buscarContatoContabilidade).toHaveBeenCalledWith("loja-b"));
    await waitFor(() => expect(screen.getByLabelText("Nome da contabilidade")).toHaveValue(""));
  });
});
