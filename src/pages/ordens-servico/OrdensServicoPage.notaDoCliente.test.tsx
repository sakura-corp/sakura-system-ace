// @vitest-environment jsdom
/**
 * A nota do cliente à mão depois de faturar (pedido da Sofia, 15/11; decidido
 * por ela em 16/11; visual novo, tarefa 7):
 *   • OS faturada que ainda falta nota: o próximo passo da linha é "Emitir
 *     nota", e o "Avisar" vai pro "Mais ações";
 *   • OS finalizada: "Nota do cliente" na própria linha (o molde de lista deixa
 *     UMA ação na linha, #1091) e o "Avisar" no "Mais ações"; a nota abre a
 *     janela de nota que já existe; com duas notas, escolhe-se qual.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { Operador } from "@/types/operador";

const faturarOrdem = vi.fn();

const PECA = { id: "i1", tipo: "peca", descricao: "Pneu", quantidade: 1, preco_unitario: 400, desconto: 0 };
const SERVICO = { id: "i2", tipo: "servico", descricao: "Alinhamento", quantidade: 1, preco_unitario: 200, desconto: 0 };
let itens: unknown[] = [PECA];
let notas: NotaFiscalArquivo[] = [];

function ordemAtual() {
  return {
    id: "os141",
    numero: 141,
    tipo: "os",
    status: "faturada",
    cliente_id: "c1",
    cliente: { nome: "Cliente Exemplo" },
    veiculo_id: "v1",
    veiculo: { placa: "ABC1D23" },
    data_abertura: "2026-11-02T10:00:00Z",
    parcelas: 1,
    itens,
  };
}

function nota(id: string, tipo: "nfe" | "nfse"): NotaFiscalArquivo {
  return {
    id,
    loja_id: "loja-a",
    tipo,
    competencia: "2026-11",
    nome_arquivo: `${id}.xml`,
    storage_path: `x/${id}.xml`,
    ordem_servico_id: "os141",
    operador_id: null,
    criado_em: "2026-11-02T10:00:00Z",
    origem: "automatica",
    numero: "1",
    chave_acesso: null,
    status: "autorizado",
    focus_nfe_ref: "ref",
  };
}

vi.mock("@/lib/clientes", () => ({
  listarClientesParaEscolha: async () => [
    { id: "c1", nome: "Cliente Exemplo", telefone: "(16) 99123-4567" },
  ],
  cadastrarClienteRapido: vi.fn(),
  cadastrarVeiculoRapido: vi.fn(),
}));
vi.mock("@/lib/ordensServico", () => ({
  listarOrdens: async () => [ordemAtual()],
  adicionarItensOrdem: vi.fn(),
  atualizarOrdem: vi.fn(),
  concluirOrdem: vi.fn(),
  criarOrdem: vi.fn(),
  editarItemOrdem: vi.fn(),
  faturarOrdem: (...a: unknown[]) => faturarOrdem(...a),
  registrarVendaBalcao: vi.fn(),
  VendaSemFaturamentoError: class extends Error {},
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/caixa", () => ({ buscarCustoDasOrdens: async () => new Map() }));
vi.mock("@/lib/pecas", () => ({ listarPecasJanela: async () => [] }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/funcionarios", () => ({ listarFuncionariosPublico: async () => [] }));
vi.mock("@/lib/configuracoes", () => ({
  // Os juros da loja: 3x no cartão = 5%.
  listarJurosParcelas: async () => [
    { loja_id: "loja-a", numero_parcelas: 2, juros_percentual: 3 },
    { loja_id: "loja-a", numero_parcelas: 3, juros_percentual: 5 },
  ],
  buscarTextoGarantia: async () => "",
  buscarConfiguracaoFiscal: async () => null,
  buscarConfiguracaoPix: async () => null,
  buscarLinkAvaliacao: async () => null,
}));
vi.mock("@/lib/notasFiscais", () => ({
  listarArquivosDasOrdens: async () => notas,
  buscarDanfeEmitida: async () => new Blob(["%PDF"], { type: "application/pdf" }),
}));
vi.mock("@/lib/estoque", () => ({ listarSaldos: async () => new Map() }));
vi.mock("@/lib/whatsapp", () => ({ abrirConversaWhatsapp: vi.fn() }));
vi.mock("@/lib/avisoQueSome", () => ({ avisar: vi.fn() }));
vi.mock("@/lib/modelosWhatsapp", async () => {
  const { modeloPorChave } = await import("@/schemas/whatsapp");
  return {
    listarModelosWhatsapp: async () => ({}),
    textoDoModelo: (m: Record<string, string>, c: never) => m[c] ?? modeloPorChave(c).padrao,
    registrarMensagemAberta: vi.fn(),
  };
});

const operador: Partial<Operador> = {
  id: "op",
  admin: false,
  permissoes: ["ordens_servico", "clientes"],
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: { id: "loja-a", nome: "Loja Centro" } }),
}));

const { OrdensServicoPage } = await import("./OrdensServicoPage");

beforeAll(() => {
  // O jsdom não tem o endereço de arquivo que a janela da nota usa pro PDF.
  URL.createObjectURL = () => "blob:pdf";
  URL.revokeObjectURL = () => undefined;
});
afterEach(cleanup);
beforeEach(() => {
  itens = [PECA];
  notas = [];
});

async function montar() {
  render(
    <MemoryRouter>
      <OrdensServicoPage />
    </MemoryRouter>,
  );
  await screen.findAllByText("Cliente Exemplo");
  return userEvent.setup();
}

describe("OrdensServicoPage — a nota do cliente à mão", () => {
  it("faturada sem a nota: 'Emitir nota' na linha, e o 'Avisar' no Mais ações", async () => {
    const user = await montar();
    expect(screen.getByRole("button", { name: "Emitir nota — OS 141" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Avisar/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Nota do cliente/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: /^Mais ações/ }));
    expect(screen.getByRole("menuitem", { name: "Avisar o cliente" })).toBeInTheDocument();
  });

  it("finalizada com uma nota: 'Nota do cliente' na linha e o 'Avisar' no Mais ações; a nota abre direto", async () => {
    notas = [nota("n1", "nfe")];
    const user = await montar();
    expect(screen.queryByRole("button", { name: "Emitir nota — OS 141" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Avisar/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: /^Mais ações/ }));
    expect(screen.getByRole("menuitem", { name: "Avisar o cliente" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Nota do cliente — OS 141" }));
    expect(await screen.findByRole("dialog", { name: "Nota do cliente" })).toBeInTheDocument();
  });

  it("finalizada com duas notas: escolhe a das peças ou a do serviço", async () => {
    itens = [PECA, SERVICO];
    notas = [nota("n1", "nfe"), nota("n2", "nfse")];
    const user = await montar();
    await user.click(screen.getByRole("button", { name: "Nota do cliente — OS 141" }));
    const escolha = screen.getByRole("dialog", { name: "Nota do cliente · OS 141" });
    expect(within(escolha).getByRole("button", { name: "Nota das peças (NFC-e)" })).toBeInTheDocument();
    await user.click(within(escolha).getByRole("button", { name: "Nota do serviço (NFS-e)" }));
    expect(await screen.findByRole("dialog", { name: "Nota do cliente" })).toBeInTheDocument();
  });

  it("nota cancelada não conta: volta a pedir 'Emitir nota'", async () => {
    notas = [{ ...nota("n1", "nfe"), status: "cancelado" }];
    await montar();
    expect(screen.getByRole("button", { name: "Emitir nota — OS 141" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Nota do cliente/ })).toBeNull();
  });
});
