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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import type { Cliente } from "@/types/cliente";
import type { Operador } from "@/types/operador";
import type { OrdemDoCliente } from "@/schemas/clientesSumidos";

// Os testes do #969 trocam o scrollIntoView (o jsdom não tem) por um espião;
// no fim de cada um, volta o que era.
const scrollIntoViewOriginal = Element.prototype.scrollIntoView;
afterEach(() => {
  Element.prototype.scrollIntoView = scrollIntoViewOriginal;
});

const listarClientes = vi.fn();
const listarClientesPagina = vi.fn();
const excluirCliente = vi.fn();
const listarOrdensFaturadasDosClientes = vi.fn();
const listarModelosWhatsapp = vi.fn();
const ultimasMensagensPorReferencia = vi.fn();
const registrarMensagemAberta = vi.fn();
const abrirConversaWhatsapp = vi.fn();

vi.mock("@/lib/clientes", () => ({
  COLUNAS_DA_LISTA_DE_CLIENTES: ["nome", "cidade"],
  listarClientes: () => listarClientes(),
  listarClientesPagina: (...a: unknown[]) => listarClientesPagina(...a),
  criarCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  excluirCliente: (...a: unknown[]) => excluirCliente(...a),
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
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

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

interface PedidoDaPagina {
  de: number;
  ate: number;
  ordem: { coluna: "nome" | "cidade"; crescente: boolean };
  busca: string;
}

/**
 * O banco de mentira da lista por página: ordena e corta a tabela INTEIRA,
 * como o Postgres faria. O que o teste prova é que a tela mostra o que ele
 * devolveu, na ordem dele.
 */
function bancoComOsClientes(todos: Cliente[]) {
  return async ({ de, ate, ordem: o, busca }: PedidoDaPagina) => {
    const achados = todos.filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()));
    const ordenados = [...achados].sort(
      (a, b) => (a[o.coluna] ?? "").localeCompare(b[o.coluna] ?? "") * (o.crescente ? 1 : -1),
    );
    return { linhas: ordenados.slice(de, ate + 1), total: achados.length };
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  operador = { id: "op", admin: true, permissoes: [] };
  lojaAtual = LOJA_A;
  const quatro = [
    cliente("c1", "Cliente Pouco", "(16) 99000-0001"),
    cliente("c2", "Cliente Muito", "(16) 99000-0002"),
    cliente("c3", "Cliente Sempre", "(16) 99000-0003"),
    cliente("c4", "Cliente Novo", "(16) 99000-0004"),
  ];
  listarClientes.mockResolvedValue(quatro);
  listarClientesPagina.mockImplementation(bancoComOsClientes(quatro));
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

/**
 * #969: abrir o formulário (canetinha ou "+ Novo cliente") rola a tela até ele
 * e põe o cursor no primeiro campo. Antes, com a lista rolada, o formulário
 * abria fora da vista e parecia que o clique não tinha feito nada.
 */
describe("ClientesPage — abrir o formulário rola até ele (#969)", () => {
  it("a canetinha pede a rolagem e põe o foco no primeiro campo do formulário", async () => {
    const rolar = vi.fn();
    Element.prototype.scrollIntoView = rolar;
    const { user, container } = renderizar(<ClientesPage />);
    await user.click(await screen.findByRole("button", { name: /^Editar .*Cliente Pouco/ }));

    expect(container.querySelector("form")).toBeTruthy();
    // O cursor vai pro Nome (onde se digita), não pro "Pessoa física" que vem
    // antes dele: digitando ali, nada seria escrito.
    expect(document.activeElement).toBe(screen.getByDisplayValue("Cliente Pouco"));
    expect(rolar).toHaveBeenCalled();
  });

  it("o \"+ Novo cliente\" também", async () => {
    const rolar = vi.fn();
    Element.prototype.scrollIntoView = rolar;
    const { user, container } = renderizar(<ClientesPage />);
    await screen.findByText("Cliente Pouco");
    await user.click(screen.getByRole("button", { name: /^\+ Novo/ }));

    const formulario = container.querySelector("form")!;
    const foco = document.activeElement as HTMLInputElement;
    expect(formulario.contains(foco)).toBe(true);
    expect(foco.tagName).toBe("INPUT");
    expect(foco.type).toBe("text");
    expect(rolar).toHaveBeenCalled();
  });

  it("trocar de canetinha com o formulário aberto abre o outro, com os dados dele", async () => {
    // A tabela fica na tela com o formulário aberto (só o cartão dos "sumidos"
    // some). Sem a key, o formulário ficava com os dados do anterior, e salvar
    // gravava o cliente A por cima do B.
    Element.prototype.scrollIntoView = vi.fn();
    const { user } = renderizar(<ClientesPage />);
    await user.click(await screen.findByRole("button", { name: /^Editar .*Cliente Pouco/ }));
    await user.click(screen.getByRole("button", { name: /^Editar .*Cliente Muito/ }));

    expect(document.activeElement).toBe(screen.getByDisplayValue("Cliente Muito"));
    expect(screen.queryByDisplayValue("Cliente Pouco")).toBeNull();
  });
});

describe("ClientesPage — a lista por página (#373)", () => {
  // 120 clientes, cadastrados fora da ordem do alfabeto: "Teste 000" … "Teste 119".
  const CENTO_E_VINTE = Array.from({ length: 120 }, (_, i) => {
    const n = String((i * 37) % 120).padStart(3, "0");
    return cliente(`id-${n}`, `Teste ${n}`, null);
  });

  function nomesDaLista(): string[] {
    return screen
      .getAllByRole("row")
      .slice(1)
      .map((linha) => within(linha).getAllByRole("cell")[0].textContent ?? "");
  }

  beforeEach(() => {
    listarClientesPagina.mockImplementation(bancoComOsClientes(CENTO_E_VINTE));
  });

  it("mostra 50 por vez, e embaixo de quantos", async () => {
    renderizar(<ClientesPage />);
    await screen.findByText("Teste 000");
    expect(nomesDaLista()).toHaveLength(50);
    expect(screen.getByText("Mostrando 1 a 50 de 120")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    // A lista inteira não é mais baixada pra lista principal.
    expect(listarClientes).not.toHaveBeenCalled();
  });

  it("ordenar por Nome decrescente traz os últimos do alfabeto da tabela INTEIRA", async () => {
    const { user } = renderizar(<ClientesPage />);
    await screen.findByText("Teste 000");

    await user.click(screen.getByRole("button", { name: /^Nome/ }));

    await screen.findByText("Teste 119");
    const nomes = nomesDaLista();
    expect(nomes[0]).toBe("Teste 119");
    expect(nomes[49]).toBe("Teste 070");
    expect(screen.getByRole("columnheader", { name: /Nome/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    expect(listarClientesPagina).toHaveBeenLastCalledWith({
      de: 0,
      ate: 49,
      ordem: { coluna: "nome", crescente: false },
      busca: "",
    });
  });

  it("Próxima e Anterior andam pelas páginas, e o número embaixo acompanha", async () => {
    const { user } = renderizar(<ClientesPage />);
    await screen.findByText("Teste 000");

    await user.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Mostrando 51 a 100 de 120");
    expect(nomesDaLista()[0]).toBe("Teste 050");

    await user.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Mostrando 101 a 120 de 120");
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Anterior" }));
    await screen.findByText("Mostrando 51 a 100 de 120");
  });

  it("a busca vai pro banco e acha quem está em outra página", async () => {
    const { user } = renderizar(<ClientesPage />);
    await screen.findByText("Teste 000");
    expect(screen.queryByText("Teste 117")).not.toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Buscar cliente" }), "117");

    await screen.findByText("Teste 117");
    expect(nomesDaLista()).toEqual(["Teste 117"]);
    expect(screen.getByText("Mostrando 1 a 1 de 1")).toBeInTheDocument();
    expect(listarClientesPagina).toHaveBeenLastCalledWith(
      expect.objectContaining({ de: 0, busca: "117" }),
    );
  });

  it("busca sem resultado diz que não achou, e a busca continua na tela", async () => {
    const { user } = renderizar(<ClientesPage />);
    await screen.findByText("Teste 000");
    await user.type(screen.getByRole("searchbox", { name: "Buscar cliente" }), "zzz");
    await screen.findByText('Nenhum cliente encontrado com "zzz".');
    expect(screen.getByRole("searchbox", { name: "Buscar cliente" })).toHaveValue("zzz");
  });

  it("excluir um cliente da página 2 recarrega a página 2", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    excluirCliente.mockResolvedValue(undefined);
    const { user } = renderizar(<ClientesPage />);
    await screen.findByText("Teste 000");
    await user.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Mostrando 51 a 100 de 120");
    listarClientesPagina.mockClear();

    const linha = screen.getByText("Teste 050").closest("tr")!;
    await user.click(within(linha).getByRole("button", { name: /mais ações|ações/i }));
    await user.click(screen.getByRole("menuitem", { name: /excluir cliente/i }));

    await vi.waitFor(() => expect(excluirCliente).toHaveBeenCalledWith("id-050"));
    await vi.waitFor(() =>
      expect(listarClientesPagina).toHaveBeenCalledWith(expect.objectContaining({ de: 50, ate: 99 })),
    );
  });

  it("sem cliente nenhum, diz que não há cadastro e esconde a busca", async () => {
    listarClientesPagina.mockResolvedValue({ linhas: [], total: 0 });
    renderizar(<ClientesPage />);
    await screen.findByText("Nenhum cliente cadastrado ainda.");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});
