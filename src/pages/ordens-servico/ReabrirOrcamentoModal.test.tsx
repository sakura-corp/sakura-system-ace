// @vitest-environment jsdom
/**
 * Teste de TELA da janela "Reabrir o Orçamento N?" (#1181).
 *
 * As promessas: (1) o motivo vem marcado em "Cliente voltou e aceitou" e a
 * validade em hoje + 7, e "Reabrir" manda o texto do histórico com a recusa
 * antiga; (2) "Outro" pede o texto; (3) "Já aprovar agora" pede quem aprovou e
 * manda junto; (4) com peça digitada sem cadastro a caixinha fica desligada;
 * (5) erro aparece na janela.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { validadePadrao } from "@/schemas/orcamento";
import { ReabrirOrcamentoModal } from "./ReabrirOrcamentoModal";
import type { OrdemServico } from "@/types/os";

function recusado(extra: Partial<OrdemServico> = {}): OrdemServico {
  return {
    id: "orc-1",
    numero: null,
    numero_orcamento: 7,
    loja_id: "loja-1",
    status: "recusado",
    motivo_recusa: "preco",
    recusado_em: "2026-11-23T14:00:00",
    validade: "2026-11-20",
    itens: [
      { id: "i1", tipo: "peca", peca_id: "p1", descricao: "Pneu", quantidade: 1, preco_unitario: 300, desconto: 0 },
    ],
    ...extra,
  } as unknown as OrdemServico;
}

function montar(ordem = recusado()) {
  const onConfirmar = vi.fn().mockResolvedValue(undefined);
  const onFechar = vi.fn();
  const r = renderizar(<ReabrirOrcamentoModal ordem={ordem} onConfirmar={onConfirmar} onFechar={onFechar} />);
  return { ...r, onConfirmar, onFechar };
}

describe("ReabrirOrcamentoModal", () => {
  it("título com o número, 'Cliente voltou' já marcado, validade hoje + 7, e Reabrir manda tudo", async () => {
    const { user, onConfirmar } = montar();

    expect(screen.getByRole("dialog", { name: "Reabrir o Orçamento 7?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cliente voltou e aceitou/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Nova validade")).toHaveValue(validadePadrao());

    await user.click(screen.getByRole("button", { name: "Reabrir" }));
    expect(onConfirmar).toHaveBeenCalledWith(
      "Cliente voltou e aceitou (tinha sido recusado em 23/11, motivo: Preço)",
      validadePadrao(),
      null,
    );
  });

  it("'Outro' abre o campo e não deixa reabrir sem o texto", async () => {
    const { user, onConfirmar } = montar();

    await user.click(screen.getByRole("button", { name: /^Outro/ }));
    await user.click(screen.getByRole("button", { name: "Reabrir" }));
    expect(onConfirmar).not.toHaveBeenCalled();
    expect(screen.getByText(/Escreva o motivo/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Qual o motivo?"), "pediu pra trocar a marca");
    await user.click(screen.getByRole("button", { name: "Reabrir" }));
    expect(onConfirmar).toHaveBeenCalledWith(
      "pediu pra trocar a marca (tinha sido recusado em 23/11, motivo: Preço)",
      validadePadrao(),
      null,
    );
  });

  it("'Já aprovar agora' pede quem aprovou e manda junto", async () => {
    const { user, onConfirmar } = montar();

    await user.click(screen.getByRole("checkbox", { name: /Já aprovar agora/ }));
    await user.click(screen.getByRole("button", { name: "Reabrir" }));
    expect(onConfirmar).not.toHaveBeenCalled();
    expect(screen.getByText(/Diga quem aprovou/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Quem aprovou?"), "o cliente, no balcão");
    await user.click(screen.getByRole("button", { name: "Reabrir" }));
    expect(onConfirmar).toHaveBeenCalledWith(expect.any(String), validadePadrao(), {
      aprovadoPor: "o cliente, no balcão",
    });
  });

  it("com peça digitada sem cadastro, a caixinha fica desligada e diz por quê", () => {
    montar(
      recusado({
        itens: [
          { id: "i1", tipo: "peca", peca_id: null, descricao: "Pneu digitado", quantidade: 1, preco_unitario: 300, desconto: 0 },
        ] as unknown as OrdemServico["itens"],
      }),
    );
    expect(screen.getByRole("checkbox", { name: /Já aprovar agora/ })).toBeDisabled();
    expect(screen.getByText(/peça digitada sem cadastro/)).toBeInTheDocument();
  });

  it("validade antes de hoje não passa", async () => {
    const { user, onConfirmar } = montar();
    const campo = screen.getByLabelText("Nova validade");
    await user.clear(campo);
    await user.type(campo, "2020-01-01");
    await user.click(screen.getByRole("button", { name: "Reabrir" }));
    expect(onConfirmar).not.toHaveBeenCalled();
    expect(screen.getByText(/não pode ser antes de hoje/)).toBeInTheDocument();
  });

  it("erro do banco aparece na janela, que continua aberta", async () => {
    const { user, onConfirmar, onFechar } = montar();
    onConfirmar.mockRejectedValue(new Error("Este orçamento não está recusado"));
    await user.click(screen.getByRole("button", { name: "Reabrir" }));
    expect(await screen.findByText(/Este orçamento não está recusado/)).toBeInTheDocument();
    expect(onFechar).not.toHaveBeenCalled();
  });
});
