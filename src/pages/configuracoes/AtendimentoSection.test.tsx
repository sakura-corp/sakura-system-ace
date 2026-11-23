// @vitest-environment jsdom
/** Tarefa #1033: a seção "Atendimento e garantia dos serviços" em Configurações. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";

const buscarConfiguracaoAtendimento = vi.fn();
const salvarConfiguracaoAtendimento = vi.fn();
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoAtendimento: (...a: unknown[]) => buscarConfiguracaoAtendimento(...a),
  salvarConfiguracaoAtendimento: (...a: unknown[]) => salvarConfiguracaoAtendimento(...a),
}));

const { AtendimentoSection } = await import("./AtendimentoSection");

function montar(lojaId = "loja-a", podeEditar = true) {
  return renderizar(<AtendimentoSection key={lojaId} lojaId={lojaId} podeEditar={podeEditar} />);
}

beforeEach(() => {
  buscarConfiguracaoAtendimento.mockReset();
  salvarConfiguracaoAtendimento.mockReset();
  buscarConfiguracaoAtendimento.mockResolvedValue(null);
  salvarConfiguracaoAtendimento.mockResolvedValue(undefined);
});

describe("AtendimentoSection", () => {
  it("carrega e mostra o que a loja guardou", async () => {
    buscarConfiguracaoAtendimento.mockResolvedValue({
      loja_id: "loja-a",
      whatsapp: "16955500199",
      horario_funcionamento: "Seg a sex, 8h às 18h",
      garantia_servico_dias: 90,
    });
    montar();
    expect(await screen.findByDisplayValue("(16) 95550-0199")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Seg a sex, 8h às 18h")).toBeInTheDocument();
    expect(screen.getByLabelText("Garantia dos serviços (dias)")).toHaveValue("90");
    expect(buscarConfiguracaoAtendimento).toHaveBeenCalledWith("loja-a");
  });

  it("salva gravando só os dígitos do WhatsApp", async () => {
    const { user } = montar();
    await user.type(await screen.findByLabelText("WhatsApp da loja"), "(16) 95550-0199");
    await user.type(screen.getByLabelText("Garantia dos serviços (dias)"), "90");
    await user.click(screen.getByRole("button", { name: "Salvar atendimento" }));
    await waitFor(() =>
      expect(salvarConfiguracaoAtendimento).toHaveBeenCalledWith("loja-a", {
        whatsapp: "16955500199",
        horario_funcionamento: null,
        garantia_servico_dias: 90,
      }),
    );
    expect(await screen.findByText("Atendimento salvo.")).toBeInTheDocument();
  });

  it("WhatsApp curto não salva e mostra o erro", async () => {
    const { user } = montar();
    await user.type(await screen.findByLabelText("WhatsApp da loja"), "12345");
    await user.click(screen.getByRole("button", { name: "Salvar atendimento" }));
    expect(await screen.findByText(/de 10 a 13 números/)).toBeInTheDocument();
    expect(salvarConfiguracaoAtendimento).not.toHaveBeenCalled();
  });

  it("quem não é admin só vê: campos travados e sem botão de salvar", async () => {
    buscarConfiguracaoAtendimento.mockResolvedValue({
      loja_id: "loja-a", whatsapp: null, horario_funcionamento: "8h às 18h", garantia_servico_dias: null,
    });
    montar("loja-a", false);
    expect(await screen.findByDisplayValue("8h às 18h")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Salvar atendimento" })).not.toBeInTheDocument();
  });

  it("tabela que falta no banco mostra o aviso e trava os campos", async () => {
    buscarConfiguracaoAtendimento.mockRejectedValue({
      message: "Could not find the table 'public.configuracoes_atendimento' in the schema cache",
      code: "PGRST205",
    });
    montar();
    expect(await screen.findByText(/ainda não foi atualizado/)).toBeInTheDocument();
    expect(screen.getByLabelText("WhatsApp da loja")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Salvar atendimento" })).not.toBeInTheDocument();
  });

  it("trocar de loja busca a outra", async () => {
    const { rerender } = montar("loja-a");
    await waitFor(() => expect(buscarConfiguracaoAtendimento).toHaveBeenCalledWith("loja-a"));
    rerender(<AtendimentoSection key="loja-b" lojaId="loja-b" podeEditar />);
    await waitFor(() => expect(buscarConfiguracaoAtendimento).toHaveBeenCalledWith("loja-b"));
  });
});
