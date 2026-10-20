// @vitest-environment jsdom
/**
 * Teste de TELA do filtro "clientes que sumiram" (FN-11, tarefa #455).
 *
 * As contas (última visita, total gasto, quem conta como sumido) estão em
 * schemas/clientesSumidos.test.ts. O que só a tela prova é a costura: que o
 * filtro mostra quem a conta diz, na ordem de quem mais gastou; que o total
 * some pra quem não pode ver valores; e que o botão abre o WhatsApp com a
 * mensagem certa e registra a abertura, como os outros botões.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import type { Cliente } from "@/types/cliente";
import type { Operador } from "@/types/operador";
import type { OrdemDoCliente } from "@/schemas/clientesSumidos";

const listarClientes = vi.fn();
const listarOrdensFaturadasDosClientes = vi.fn();
const listarModelosWhatsapp = vi.fn();
const ultimasMensagensPorReferencia = vi.fn();
const registrarMensagemAberta = vi.fn();
const abrirConversaWhatsapp = vi.fn();

vi.mock("@/lib/clientes", () => ({
  listarClientes: () => listarClientes(),
  criarCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  excluirCliente: vi.fn(),
}));
vi.mock("@/lib/clientesSumidos", () => ({
  listarOrdensFaturadasDosClientes: () => listarOrdensFaturadasDosClientes(),
}));
vi.mock("@/lib/modelosWhatsapp", async (original) => ({
  ...(await original<typeof import("@/lib/modelosWhatsapp")>()),
  listarModelosWhatsapp: (...a: unknown[]) => listarModelosWhatsapp(...a),
  ultimasMensagensPorReferencia: (...a: unknown[]) => ultimasMensagensPorReferencia(...a),
  registrarMensagemAberta: (...a: unknown[]) => registrarMensagemAberta(...a),
}));
vi.mock("@/lib/whatsapp", () => ({
  abrirConversaWhatsapp: (...a: unknown[]) => abrirConversaWhatsapp(...a),
}));
vi.mock("@/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: {} }));

const LOJA_A = { id: "loja-a", nome: "Loja Centro", cidade: null, uf: null, ativo: true, criado_em: "" };
const LOJA_B = { id: "loja-b", nome: "Loja Vila", cidade: null, uf: null, ativo: true, criado_em: "" };
let operador: Partial<Operador> = { id: "op", admin: true, permissoes: [] };
let lojaAtual = LOJA_A;
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual, lojasDisponiveis: [LOJA_A, LOJA_B] }),
}));

const { ClientesPage } = await import("./ClientesPage");

function diaHa(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(15, 0, 0, 0);
  return d.toISOString();
}

function cliente(id: string, nome: string, telefone: string | null): Cliente {
  return {
    id,
    nome,
    tipo_pessoa: "fisica",
    cpf_cnpj: null,
    telefone,
    email: null,
    cep: null,
    rua: null,
    numero: null,
    bairro: null,
    cidade: null,
    uf: null,
    codigo_municipio: null,
    data_nascimento: null,
    criado_em: "",
    veiculos: [],
  } as Cliente;
}

function ordem(
  id: string,
  clienteId: string,
  diasAtras: number,
  valor: number,
  servico: string,
): OrdemDoCliente {
  return {
    id,
    cliente_id: clienteId,
    status: "faturada",
    data_abertura: diaHa(diasAtras),
    data_fechamento: diaHa(diasAtras),
    veiculo: { placa: "ABC-1D23", marca: "Fiat", modelo: "Uno" },
    itens: [{ tipo: "servico", descricao: servico, quantidade: 1, preco_unitario: valor, desconto: 0 }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  operador = { id: "op", admin: true, permissoes: [] };
  lojaAtual = LOJA_A;
  listarClientes.mockResolvedValue([
    cliente("c1", "Cliente Pouco", "(16) 99000-0001"),
    cliente("c2", "Cliente Muito", "(16) 99000-0002"),
    cliente("c3", "Cliente Sempre", "(16) 99000-0003"),
    cliente("c4", "Cliente Novo", "(16) 99000-0004"),
  ]);
  listarOrdensFaturadasDosClientes.mockResolvedValue([
    ordem("o1", "c1", 300, 80, "Alinhamento"),
    ordem("o2", "c2", 250, 900, "Troca de pneus"),
    ordem("o3", "c3", 10, 5000, "Suspensão"),
  ]);
  listarModelosWhatsapp.mockResolvedValue({});
  ultimasMensagensPorReferencia.mockResolvedValue(new Map());
  registrarMensagemAberta.mockResolvedValue(undefined);
  abrirConversaWhatsapp.mockResolvedValue(undefined);
});

async function ligarFiltro() {
  const tela = renderizar(<ClientesPage />);
  await screen.findByText("Cliente Pouco");
  await tela.user.click(screen.getByRole("checkbox", { name: /sumiram/i }));
  await screen.findByRole("columnheader", { name: "Última visita" });
  return tela;
}

function nomesDasLinhas(): string[] {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((linha) => within(linha).getAllByRole("cell")[0].textContent ?? "");
}

describe("ClientesPage — clientes que sumiram", () => {
  it("mostra só quem não vem há mais de 6 meses, de quem mais gastou pra quem menos", async () => {
    await ligarFiltro();
    // c3 veio há 10 dias; c4 nunca veio: nenhum dos dois "sumiu".
    expect(nomesDasLinhas()).toEqual(["Cliente Muito", "Cliente Pouco"]);
    expect(screen.getByRole("spinbutton", { name: /meses/i })).toHaveValue(6);
    expect(screen.getByText("Troca de pneus")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*900,00/)).toBeInTheDocument();
  });

  it("o total gasto some pra quem não pode ver valores", async () => {
    operador = { id: "op", admin: false, permissoes: ["clientes"] };
    await ligarFiltro();
    expect(nomesDasLinhas()).toEqual(["Cliente Muito", "Cliente Pouco"]);
    expect(screen.queryByRole("columnheader", { name: /total gasto/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });

  it("quem tem Relações vê o total", async () => {
    operador = { id: "op", admin: false, permissoes: ["clientes", "relatorios"] };
    await ligarFiltro();
    expect(screen.getByRole("columnheader", { name: /total gasto/i })).toBeInTheDocument();
  });

  it("o botão abre o WhatsApp com a mensagem montada e registra a abertura", async () => {
    const { user } = await ligarFiltro();
    const linha = screen.getByText("Cliente Muito").closest("tr")!;
    await user.click(within(linha).getByRole("button", { name: /^chamar$/i }));

    expect(abrirConversaWhatsapp).toHaveBeenCalledWith(
      "(16) 99000-0002",
      "Oi Cliente Muito, tudo bem? Aqui é da Loja Centro.\n" +
        "Faz um tempinho que você não passa por aqui. Que tal dar uma olhada no Fiat Uno? " +
        "É só responder que a gente marca um horário.",
    );
    expect(registrarMensagemAberta).toHaveBeenCalledWith(
      "loja-a",
      "cliente_sumido",
      "c2",
      "(16) 99000-0002",
      "op",
    );
  });

  it("usa o texto que a loja editou em Configurações", async () => {
    listarModelosWhatsapp.mockResolvedValue({ cliente_sumido: "Volta, {cliente}! ({veiculo})" });
    const { user } = await ligarFiltro();
    const linha = screen.getByText("Cliente Pouco").closest("tr")!;
    await user.click(within(linha).getByRole("button", { name: /^chamar$/i }));
    expect(abrirConversaWhatsapp).toHaveBeenCalledWith("(16) 99000-0001", "Volta, Cliente Pouco! (Fiat Uno)");
  });

  it("mudar os meses muda quem aparece", async () => {
    const { user } = await ligarFiltro();
    const meses = screen.getByRole("spinbutton", { name: /meses/i });
    await user.clear(meses);
    await user.type(meses, "9");
    // Só o c1 (300 dias) passou de 9 meses.
    expect(nomesDasLinhas()).toEqual(["Cliente Pouco"]);
  });
});

describe("ClientesPage — trocar de loja com o filtro ligado", () => {
  it("passa a usar o texto e os 'chamado em' da loja nova", async () => {
    listarModelosWhatsapp.mockImplementation(async (lojaId: string) =>
      lojaId === "loja-b" ? { cliente_sumido: "Da Vila: {cliente}" } : { cliente_sumido: "Do Centro: {cliente}" },
    );
    ultimasMensagensPorReferencia.mockImplementation(async (lojaId: string) =>
      lojaId === "loja-a" ? new Map([["c2", "2026-10-01T15:00:00.000Z"]]) : new Map(),
    );
    const { user, rerender } = await ligarFiltro();
    expect(await screen.findByText(/chamado em/)).toBeInTheDocument();

    lojaAtual = LOJA_B;
    rerender(<ClientesPage />);
    // Os "chamado em" são de cada loja: os da Centro somem na Vila.
    await vi.waitFor(() => expect(screen.queryByText(/chamado em/)).not.toBeInTheDocument());

    const linha = screen.getByText("Cliente Muito").closest("tr")!;
    await user.click(within(linha).getByRole("button", { name: /^chamar$/i }));
    expect(abrirConversaWhatsapp).toHaveBeenCalledWith("(16) 99000-0002", "Da Vila: Cliente Muito");
    expect(registrarMensagemAberta).toHaveBeenCalledWith("loja-b", "cliente_sumido", "c2", "(16) 99000-0002", "op");
  });
});
