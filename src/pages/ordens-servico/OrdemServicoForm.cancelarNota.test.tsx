// @vitest-environment jsdom
/**
 * Tarefa #1182: OS faturada com nota emitida. A faixa do "Corrigir a OS" ganha
 * o caminho: o gerente cancela a nota ali mesmo (janela que já existe) e a
 * página recarrega as notas pra faixa voltar ao normal.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { OrdemServico } from "@/types/os";

const { cancelarArquivoEmitido, listarArquivosDasOrdens } = vi.hoisted(() => ({
  cancelarArquivoEmitido: vi.fn(),
  // A trilha do fechamento (#1088) busca as notas da OS sozinha.
  listarArquivosDasOrdens: vi.fn(),
}));
vi.mock("@/lib/notasFiscais", () => ({ cancelarArquivoEmitido, listarArquivosDasOrdens }));
vi.mock("./FechamentoTab", () => ({ FechamentoTab: () => <div>aba fechamento</div> }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { admin: true, permissoes: [] } }),
}));
vi.mock("@/lib/caixa", () => ({ buscarCustoDasOrdens: vi.fn().mockResolvedValue(new Map()) }));
vi.mock("@/lib/pecas", () => ({ listarPecas: vi.fn().mockResolvedValue([]) }));

const { OrdemServicoForm } = await import("./OrdemServicoForm");

beforeEach(() => {
  localStorage.clear();
  cancelarArquivoEmitido.mockReset().mockResolvedValue(undefined);
  listarArquivosDasOrdens.mockReset().mockResolvedValue([]);
});

const ordem = {
  id: "os-1",
  numero: 12,
  loja_id: "loja-1",
  cliente_id: null,
  veiculo_id: null,
  status: "faturada",
  km_entrada: null,
  descricao_problema: null,
  forma_pagamento: "Pix",
  parcelas: 1,
  data_abertura: "2026-09-01T12:00:00.000Z",
  data_fechamento: "2026-09-02T12:00:00.000Z",
  cliente: { nome: "Maria" },
  itens: [],
} as unknown as OrdemServico;

const nota = { id: "n1", nome_arquivo: "NFCe-123", status: "autorizado" } as unknown as NotaFiscalArquivo;

function montar(extra: { gerente: boolean; onNotaCancelada?: () => void }) {
  return renderizar(
    <OrdemServicoForm
      clientes={[]}
      pecas={[]}
      servicos={[]}
      funcionarios={[]}
      funcionarioAtualId="func-1"
      ordens={[]}
      saldoPorPeca={new Map()}
      saldoCarregado
      ordemExistente={ordem}
      temNotaEmitida
      notaParaCancelar={nota}
      onTrocarItensFaturada={vi.fn()}
      onSalvarNova={vi.fn()}
      onSalvarEdicao={vi.fn()}
      onEditarItem={vi.fn()}
      onEncerrar={vi.fn()}
      onCadastrarCliente={vi.fn()}
      onCadastrarVeiculo={vi.fn()}
      onCancelar={vi.fn()}
      {...extra}
    />,
  );
}

describe("OrdemServicoForm — Cancelar a nota pela faixa do Corrigir a OS", () => {
  it("com nota emitida, o gerente vê 'Cancelar a nota' e ele abre a janela de cancelar", async () => {
    const { user } = montar({ gerente: true });
    await user.click(screen.getByRole("button", { name: "Cancelar a nota" }));
    expect(screen.getByText("Cancelar nota fiscal")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Corrigir a OS" })).not.toBeInTheDocument();
  });

  it("quem não é gerente não vê 'Cancelar a nota'", () => {
    montar({ gerente: false });
    expect(screen.queryByRole("button", { name: "Cancelar a nota" })).not.toBeInTheDocument();
  });

  it("depois de cancelada, avisa a página pra recarregar as notas", async () => {
    const onNotaCancelada = vi.fn();
    const { user } = montar({ gerente: true, onNotaCancelada });
    await user.click(screen.getByRole("button", { name: "Cancelar a nota" }));
    await user.type(screen.getByPlaceholderText(/nota emitida por engano, valor errado/), "nota emitida por engano");
    await user.click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    expect(cancelarArquivoEmitido).toHaveBeenCalledOnce();
    expect(onNotaCancelada).toHaveBeenCalledOnce();
  });

  it("depois de cancelada, a trilha da OS busca as notas de novo (não fica em 'nota feita')", async () => {
    const { user } = montar({ gerente: true });
    await vi.waitFor(() => expect(listarArquivosDasOrdens).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Cancelar a nota" }));
    await user.type(screen.getByPlaceholderText(/nota emitida por engano, valor errado/), "nota emitida por engano");
    await user.click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    await vi.waitFor(() => expect(listarArquivosDasOrdens).toHaveBeenCalledTimes(2));
  });
});
