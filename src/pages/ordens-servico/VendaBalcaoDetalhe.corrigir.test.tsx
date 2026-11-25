// @vitest-environment jsdom
/**
 * Tarefa #1182: o botão "Corrigir a OS" também no detalhe da venda de balcão
 * faturada. Só gerente, só sem nota fiscal; abre a mesma janela.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { OrdemServico } from "@/types/os";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
const { cancelarArquivoEmitido } = vi.hoisted(() => ({ cancelarArquivoEmitido: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/notasFiscais", () => ({ cancelarArquivoEmitido }));
vi.mock("./FechamentoTab", () => ({ FechamentoTab: () => null }));

const { VendaBalcaoDetalhe } = await import("./VendaBalcaoDetalhe");

function venda(status: string): OrdemServico {
  return {
    id: "v1",
    numero: 7,
    loja_id: "loja-1",
    tipo: "venda_balcao",
    status,
    data_abertura: "2026-11-01T10:00:00Z",
    data_fechamento: "2026-11-01T10:30:00Z",
    cliente: { nome: "Maria" },
    itens: [
      {
        id: "i1",
        ordem_servico_id: "v1",
        tipo: "servico",
        peca_id: null,
        servico_id: null,
        tecnico_id: null,
        descricao: "Alinhamento",
        quantidade: 1,
        preco_unitario: 100,
        desconto: 0,
      },
    ],
  } as unknown as OrdemServico;
}

function montar(
  opcoes: {
    status?: string;
    gerente?: boolean;
    notas?: NotaFiscalArquivo[];
    onNotaCancelada?: () => void;
  } = {},
) {
  return renderizar(
    <VendaBalcaoDetalhe
      ordem={venda(opcoes.status ?? "faturada")}
      notas={opcoes.notas ?? []}
      onFaturar={() => {}}
      onVoltar={() => {}}
      correcao={{
        gerente: opcoes.gerente ?? true,
        pecas: [],
        servicos: [],
        funcionarios: [],
        saldoPorPeca: new Map(),
        saldoCarregado: true,
        buscarSituacao: () =>
          Promise.resolve({
            contaDoFaturamentoEmAberto: null,
            aReceberDeCorrecoes: 0,
            caixaDeHojeFechado: false,
            comissaoDoPeriodoPaga: false,
          }),
        onConfirmar: vi.fn().mockResolvedValue(undefined),
        onNotaCancelada: opcoes.onNotaCancelada,
      }}
    />,
  );
}

describe("VendaBalcaoDetalhe — Corrigir a OS", () => {
  it("o gerente vê o botão numa venda faturada e abre a janela 'Corrigir a Venda 7'", async () => {
    const { user } = montar();
    expect(
      screen.getByText("Precisa corrigir? Peça, serviço ou valor"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Corrigir a OS" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Corrigir a Venda 7")).toBeInTheDocument();
  });

  it("quem não é gerente não vê o botão, e lê por quê", () => {
    montar({ gerente: false });
    expect(screen.queryByRole("button", { name: "Corrigir a OS" })).toBeNull();
    expect(screen.getByText(/Só quem é gerente/)).toBeInTheDocument();
  });

  it("com nota fiscal emitida, nem o gerente corrige", () => {
    montar({
      notas: [
        { id: "n1", status: "autorizado" } as unknown as NotaFiscalArquivo,
      ],
    });
    expect(screen.queryByRole("button", { name: "Corrigir a OS" })).toBeNull();
    expect(
      screen.getByText(/a nota ficaria diferente da OS/),
    ).toBeInTheDocument();
  });

  it("venda não faturada não tem o botão", () => {
    montar({ status: "concluida" });
    expect(screen.queryByRole("button", { name: "Corrigir a OS" })).toBeNull();
  });
});

// Tarefa #1182: nota emitida ganha o caminho "Cancelar a nota" pra gerente.
describe("VendaBalcaoDetalhe — Cancelar a nota", () => {
  const nota = {
    id: "n1",
    nome_arquivo: "NFCe-7",
    status: "autorizado",
  } as unknown as NotaFiscalArquivo;

  it("o gerente vê 'Cancelar a nota', abre a janela e o callback de recarregar é chamado", async () => {
    const onNotaCancelada = vi.fn();
    const { user } = montar({ notas: [nota], onNotaCancelada });
    await user.click(screen.getByRole("button", { name: "Cancelar a nota" }));
    expect(screen.getByText("Cancelar nota fiscal")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox"), "nota emitida por engano");
    await user.click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    expect(cancelarArquivoEmitido).toHaveBeenCalledOnce();
    expect(onNotaCancelada).toHaveBeenCalledOnce();
  });

  it("quem não é gerente não vê 'Cancelar a nota'", () => {
    montar({ notas: [nota], gerente: false });
    expect(screen.queryByRole("button", { name: "Cancelar a nota" })).toBeNull();
  });
});
