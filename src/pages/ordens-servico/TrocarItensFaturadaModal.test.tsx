// @vitest-environment jsdom
/**
 * Teste de TELA da troca de peça ou serviço em OS já faturada (#1145).
 *
 * As promessas: (1) trocar a peça pelo mesmo total chega no "antes e depois"
 * e manda a lista final certa, com o motivo; (2) total diferente não passa e
 * explica que mudar valor vem depois; (3) sem motivo não confirma; (4) estoque
 * que fica negativo pede a confirmação, e o aviso do banco (saldo velho na
 * tela) também.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { EstoqueNegativoNaTrocaError } from "@/lib/ordensServico";
import { TrocarItensFaturadaModal } from "./TrocarItensFaturadaModal";
import type { FuncionarioPublico } from "@/types/funcionario";
import type { OrdemServico } from "@/types/os";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const pecas = [
  { id: "p1", descricao: "PNEU 175/70 R13", preco_venda: 300 },
  { id: "p2", descricao: "PNEU 175/65 R14", preco_venda: 350 },
].map((p) => ({ ...p, ativo: true, sem_custo: false }) as unknown as PecaJanela);

const servicos = [{ id: "s1", descricao: "Balanceamento", preco_padrao: 50 }].map(
  (s) => ({ ...s, ativo: true }) as unknown as Servico,
);

const funcionarios = [{ id: "f1", nome: "Carlos" }] as unknown as FuncionarioPublico[];

function ordem(): OrdemServico {
  return {
    id: "os-1",
    numero: 12,
    loja_id: "loja-1",
    status: "faturada",
    data_fechamento: "2026-11-19T15:00:00.000Z",
    itens: [
      {
        id: "i1",
        ordem_servico_id: "os-1",
        tipo: "peca",
        peca_id: "p1",
        servico_id: null,
        tecnico_id: null,
        descricao: "PNEU 175/70 R13",
        quantidade: 2,
        preco_unitario: 300,
        desconto: 0,
      },
    ],
  } as unknown as OrdemServico;
}

function montar(saldo = new Map([["p1", 5], ["p2", 5]]), onConfirmar = vi.fn().mockResolvedValue(undefined)) {
  const resultado = renderizar(
    <TrocarItensFaturadaModal
      ordem={ordem()}
      pecas={pecas}
      servicos={servicos}
      funcionarios={funcionarios}
      saldoPorPeca={saldo}
      saldoCarregado
      onConfirmar={onConfirmar}
      onFechar={vi.fn()}
    />,
  );
  return { ...resultado, onConfirmar };
}

async function trocarPeloPneuCerto(user: ReturnType<typeof montar>["user"]) {
  await user.click(screen.getByDisplayValue("PNEU 175/70 R13"));
  await user.click(screen.getByRole("button", { name: "PNEU 175/65 R14" }));
}

describe("TrocarItensFaturadaModal", () => {
  it("troca a peça pelo mesmo total, mostra o antes e depois e manda a lista com o motivo", async () => {
    const { user, onConfirmar } = montar();
    await trocarPeloPneuCerto(user);
    // O preço cobrado fica (não vira o preço de cadastro da peça nova).
    expect(screen.getByLabelText("Preço unitário")).toHaveValue(300);

    await user.click(screen.getByRole("button", { name: "Conferir a troca" }));
    expect(screen.getByText("Sai")).toBeInTheDocument();
    expect(screen.getByText(/PNEU 175\/70 R13 \(2x\)/)).toBeInTheDocument();
    expect(screen.getByText(/PNEU 175\/65 R14 \(2x\)/)).toBeInTheDocument();
    expect(screen.getByText(/igual ao faturado/)).toBeInTheDocument();

    // Sem motivo não vai.
    await user.click(screen.getByRole("button", { name: "Confirmar troca" }));
    expect(onConfirmar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/Diga o motivo/);

    await user.type(screen.getByLabelText(/Motivo da troca/), "medida errada");
    await user.click(screen.getByRole("button", { name: "Confirmar troca" }));
    expect(onConfirmar).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "i1", tipo: "peca", peca_id: "p2", descricao: "PNEU 175/65 R14", quantidade: 2, preco_unitario: 300 })],
      "medida errada",
      false,
    );
  });

  it("total diferente não passa, e diz que mudar o valor vem numa próxima etapa", async () => {
    const { user } = montar();
    await trocarPeloPneuCerto(user);
    const preco = screen.getByLabelText("Preço unitário");
    await user.clear(preco);
    await user.type(preco, "350");

    expect(screen.getByRole("button", { name: "Conferir a troca" })).toBeDisabled();
    expect(screen.getByText(/mudar o valor vem numa próxima etapa/)).toBeInTheDocument();
  });

  it("sem mudança nenhuma não tem o que conferir", () => {
    montar();
    expect(screen.getByRole("button", { name: "Conferir a troca" })).toBeDisabled();
  });

  it("estoque que fica negativo pede a confirmação", async () => {
    const { user, onConfirmar } = montar(new Map([["p1", 5], ["p2", 1]]));
    await trocarPeloPneuCerto(user);
    await user.click(screen.getByRole("button", { name: "Conferir a troca" }));

    expect(screen.getByText(/PNEU 175\/65 R14 \(fica -1\)/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Motivo da troca/), "medida errada");
    await user.click(screen.getByRole("button", { name: "Confirmar troca" }));
    expect(onConfirmar).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText(/Sei disso/));
    await user.click(screen.getByRole("button", { name: "Confirmar troca" }));
    expect(onConfirmar).toHaveBeenCalledWith(expect.any(Array), "medida errada", true);
  });

  it("quando o banco avisa o estoque negativo (saldo velho na tela), pede a confirmação", async () => {
    const onConfirmar = vi
      .fn()
      .mockRejectedValueOnce(new EstoqueNegativoNaTrocaError("O estoque ficaria negativo: PNEU 175/65 R14."))
      .mockResolvedValue(undefined);
    const { user } = montar(undefined, onConfirmar);
    await trocarPeloPneuCerto(user);
    await user.click(screen.getByRole("button", { name: "Conferir a troca" }));
    await user.type(screen.getByLabelText(/Motivo da troca/), "medida errada");
    await user.click(screen.getByRole("button", { name: "Confirmar troca" }));

    expect(screen.getByLabelText(/Sei disso/)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Sei disso/));
    await user.click(screen.getByRole("button", { name: "Confirmar troca" }));
    expect(onConfirmar).toHaveBeenLastCalledWith(expect.any(Array), "medida errada", true);
  });
});
