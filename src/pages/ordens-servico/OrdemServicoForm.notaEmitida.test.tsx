// @vitest-environment jsdom
/**
 * #1204 (teste da Sofia, 25/11): emitindo a nota pelo passo "Nota fiscal" da
 * trilha, a faixa da OS continuava oferecendo "Corrigir a OS" (que é só pra
 * OS sem nota) até fechar e abrir a OS de novo. Nesse intervalo dava pra
 * corrigir o valor de uma OS que já tinha nota.
 *
 * Logo depois de emitir, a faixa tem de trocar: sem "Corrigir a OS", com
 * "Cancelar a nota". O painel do fechamento é o de verdade; a janela da nota,
 * o banco e o WhatsApp são de mentira.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor, within } from "@/testes/tela";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { ItemOS, OrdemServico } from "@/types/os";

const { listarArquivosDasOrdens, cancelarArquivoEmitido } = vi.hoisted(() => ({
  listarArquivosDasOrdens: vi.fn(),
  cancelarArquivoEmitido: vi.fn(),
}));
vi.mock("@/lib/notasFiscais", () => ({ listarArquivosDasOrdens, cancelarArquivoEmitido }));
vi.mock("@/lib/avisoDaOrdem", () => ({ quandoAvisouCarroPronto: async () => null }));
vi.mock("@/lib/configuracoes", () => ({ buscarTextoGarantia: async () => "" }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op", admin: true, permissoes: [] }, lojaAtual: { id: "loja-1" } }),
}));
vi.mock("@/lib/caixa", () => ({ buscarCustoDasOrdens: async () => new Map() }));
vi.mock("@/lib/pecas", () => ({ listarPecas: async () => [] }));
// A janela da nota: o "OK" da emissão chama o onEmitido, como a de verdade.
vi.mock("./EmitirNotaFiscalModal", () => ({
  EmitirNotaFiscalModal: ({ tipoNota, onEmitido }: { tipoNota: string; onEmitido: () => void }) => (
    <div role="dialog" aria-label={`Emitir ${tipoNota}`}>
      <button type="button" onClick={onEmitido}>
        Nota autorizada
      </button>
    </div>
  ),
}));

const { OrdemServicoForm } = await import("./OrdemServicoForm");

const nfce = {
  id: "n-nfe", tipo: "nfe", status: "autorizado", origem: "automatica", ordem_servico_id: "os-1",
  nome_arquivo: "NFCe-1",
} as unknown as NotaFiscalArquivo;

beforeEach(() => {
  localStorage.clear();
  listarArquivosDasOrdens.mockReset().mockResolvedValue([]);
  cancelarArquivoEmitido.mockReset().mockResolvedValue(undefined);
});

const ordem = {
  id: "os-1", numero: 12, loja_id: "loja-1", cliente_id: null, veiculo_id: null, status: "faturada",
  km_entrada: null, descricao_problema: null, forma_pagamento: "Pix", parcelas: 1,
  data_abertura: "2026-09-01T12:00:00.000Z", data_fechamento: "2026-09-02T12:00:00.000Z",
  cliente: { nome: "Maria" },
  itens: [
    {
      id: "item-1", ordem_servico_id: "os-1", tipo: "peca", peca_id: "peca-1", servico_id: null,
      tecnico_id: null, descricao: "PNEU 175/70 R14", quantidade: 1, preco_unitario: 400, desconto: 0,
    },
  ] as unknown as ItemOS[],
} as unknown as OrdemServico;

function montar(extra: { onNotaCancelada?: () => void } = {}) {
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
      abaInicial="fechamento"
      gerente
      // A página ainda não sabe da nota nova (ela só busca de novo ao fechar a OS).
      temNotaEmitida={false}
      notaParaCancelar={undefined}
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

describe("OrdemServicoForm — a faixa depois de emitir a nota na OS (#1204)", () => {
  it("emitiu a NFC-e: some o 'Corrigir a OS' e aparece o 'Cancelar a nota', sem fechar a OS", async () => {
    const { user } = montar();
    const trilha = () => screen.getByRole("region", { name: "Fechar a OS" });
    await within(trilha()).findByText(/Passo 3 de 4/);

    // Antes de emitir: a faixa oferece corrigir (a OS ainda não tem nota).
    await user.click(within(trilha()).getByRole("button", { name: /Conferir peças e serviços.*voltar/ }));
    expect(screen.getByRole("button", { name: "Corrigir a OS" })).toBeInTheDocument();
    await user.click(within(trilha()).getByRole("button", { name: /Voltar pro passo atual/ }));

    // Emite a NFC-e pelo passo da nota.
    listarArquivosDasOrdens.mockResolvedValue([nfce]);
    await user.click(await screen.findByRole("button", { name: "Emitir NFC-e" }));
    await user.click(screen.getByRole("button", { name: "Nota autorizada" }));
    await within(trilha()).findByText(/Passo 4 de 4/);

    // De volta no passo 1, a faixa já trocou.
    await user.click(within(trilha()).getByRole("button", { name: /Conferir peças e serviços.*voltar/ }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Corrigir a OS" })).toBeNull());
    expect(screen.getByRole("button", { name: "Cancelar a nota" })).toBeInTheDocument();
  });

  // Achado da revisão: a faixa passou a confiar também nas notas da trilha.
  // Se elas não chegarem de novo depois de cancelar, a nota cancelada aqui
  // não pode seguir travando a OS nem ser oferecida pra cancelar de novo.
  it("cancelou a nota e a busca das notas falhou: a faixa não fica presa na nota cancelada", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    listarArquivosDasOrdens.mockResolvedValue([nfce]);
    const onNotaCancelada = vi.fn();
    const { user } = montar({ onNotaCancelada });
    const trilha = () => screen.getByRole("region", { name: "Fechar a OS" });
    await within(trilha()).findByText(/Passo 4 de 4/);
    await user.click(within(trilha()).getByRole("button", { name: /Conferir peças e serviços.*voltar/ }));

    listarArquivosDasOrdens.mockRejectedValue(new Error("sem rede"));
    await user.click(screen.getByRole("button", { name: "Cancelar a nota" }));
    await user.type(screen.getByPlaceholderText(/nota emitida por engano, valor errado/), "nota emitida por engano");
    await user.click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    expect(cancelarArquivoEmitido).toHaveBeenCalledOnce();
    expect(onNotaCancelada).toHaveBeenCalledOnce();

    await waitFor(() => expect(screen.queryByRole("button", { name: "Cancelar a nota" })).toBeNull());
    expect(screen.getByRole("button", { name: "Corrigir a OS" })).toBeInTheDocument();
  });
});
