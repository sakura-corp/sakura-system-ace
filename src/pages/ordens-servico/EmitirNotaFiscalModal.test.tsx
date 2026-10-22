// @vitest-environment jsdom
/**
 * Teste de TELA da emissão da NFC-e com peça avulsa (#655).
 *
 * Promessas guardadas aqui:
 * 1. Peça sem cadastro, ou cadastrada sem NCM, avisa na tela e TRAVA o
 *    "Confirmar emissão" — nenhuma nota sai com peça faltando.
 * 2. O botão "Cadastrar agora" cadastra a peça ali mesmo (nome e preço já
 *    preenchidos), liga ao item da OS e libera a emissão.
 * 3. Peça do cadastro com NCM: nada muda, emite como sempre.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";

const buscarPecasPorIds = vi.fn();
const listarPecas = vi.fn();
const criarPeca = vi.fn();
const cadastrarPecaDoItem = vi.fn();
const emitirNFCe = vi.fn();
vi.mock("@/lib/pecas", () => ({
  buscarPecasPorIds: (...a: unknown[]) => buscarPecasPorIds(...a),
  listarPecas: (...a: unknown[]) => listarPecas(...a),
  criarPeca: (...a: unknown[]) => criarPeca(...a),
}));
vi.mock("@/lib/ordensServico", () => ({
  cadastrarPecaDoItem: (...a: unknown[]) => cadastrarPecaDoItem(...a),
}));
vi.mock("@/lib/focusNfe", () => ({
  emitirNFCe: (...a: unknown[]) => emitirNFCe(...a),
  emitirNFSe: vi.fn(),
  consultarNFCe: vi.fn(),
  consultarNFSe: vi.fn(),
  baixarArquivoNota: vi.fn(),
  refPertenceAOrdem: vi.fn(),
  FocusNfeError: class extends Error {},
  EsperaVencidaError: class extends Error {},
}));
vi.mock("@/lib/estoque", () => ({ criarMovimento: vi.fn() }));
vi.mock("@/lib/categorias", () => ({ listarCategorias: async () => [] }));
vi.mock("@/lib/caixa", () => ({ listarMovimentosCaixaPorOrdem: async () => [] }));
vi.mock("@/lib/notasFiscais", () => ({ salvarArquivoEmitido: vi.fn() }));
vi.mock("@/lib/clientes", () => ({
  buscarClientePorId: async () => ({ id: "c1", nome: "Maria", tipo_pessoa: "fisica", cpf_cnpj: null }),
}));
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoFiscal: async () => ({
    loja_id: "loja-1",
    regime_tributario: "simples_nacional",
    focus_nfe_configurado: true,
    focus_nfe_ambiente: "homologacao",
  }),
  confirmarAliquotaCompetencia: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op" }, lojaAtual: { id: "loja-1" } }),
}));

const { EmitirNotaFiscalModal } = await import("./EmitirNotaFiscalModal");

const pecaComNcm = { id: "peca-1", descricao: "Pneu 175/70 R13", ncm: "40111000", cst_ou_csosn: "500" } as unknown as Peca;
const pecaSemNcm = { id: "peca-2", descricao: "Filtro", ncm: "", cst_ou_csosn: "500" } as unknown as Peca;

const item = (id: string, descricao: string, peca_id: string | null) => ({
  id, ordem_servico_id: "os-1", tipo: "peca", peca_id, servico_id: null, tecnico_id: null,
  descricao, quantidade: 1, preco_unitario: 80, desconto: 0, custo_unitario: null,
});

function ordem(itens: unknown[]): OrdemServico {
  return {
    id: "os-1", numero: 51, loja_id: "loja-1", cliente_id: "c1", status: "faturada",
    cliente: { nome: "Maria" }, itens,
  } as unknown as OrdemServico;
}

function montar(itens: unknown[]) {
  const onFechar = vi.fn();
  const onEmitido = vi.fn();
  const onItensMudaram = vi.fn();
  const resultado = renderizar(
    <EmitirNotaFiscalModal
      ordem={ordem(itens)}
      tipoNota="NFC-e"
      onFechar={onFechar}
      onEmitido={onEmitido}
      onItensMudaram={onItensMudaram}
    />,
  );
  return { ...resultado, onFechar, onEmitido, onItensMudaram };
}

const confirmar = () => screen.getByRole("button", { name: "Confirmar emissão" });

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  listarPecas.mockResolvedValue([pecaComNcm]);
  buscarPecasPorIds.mockImplementation(async (ids: string[]) =>
    [pecaComNcm, pecaSemNcm].filter((p) => ids.includes(p.id)),
  );
});

describe("EmitirNotaFiscalModal — peça que não pode sair na nota (#655)", () => {
  it("peça avulsa avisa por peça e trava o Confirmar emissão", async () => {
    montar([item("i1", "Pneu 175/70 R13", "peca-1"), item("i2", "Palheta", null)]);

    expect(await screen.findByText("Palheta")).toBeInTheDocument();
    expect(screen.getByText(/Essa peça precisa ser cadastrada pra sair na nota\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cadastrar agora" })).toBeInTheDocument();
    expect(confirmar()).toBeDisabled();
  });

  it("peça cadastrada sem NCM manda preencher o NCM e também trava", async () => {
    montar([item("i1", "Filtro", "peca-2")]);

    expect(await screen.findByText(/Essa peça está sem NCM no cadastro/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cadastrar agora" })).not.toBeInTheDocument();
    expect(confirmar()).toBeDisabled();
  });

  it("peça do cadastro com NCM: sem aviso, emite como sempre", async () => {
    emitirNFCe.mockResolvedValue({ status: "autorizado", numero: "10", ref: "r1" });
    const { user } = montar([item("i1", "Pneu 175/70 R13", "peca-1")]);

    await screen.findByRole("button", { name: "Confirmar emissão" });
    expect(screen.queryByText(/não pode sair ainda/)).not.toBeInTheDocument();
    expect(confirmar()).toBeEnabled();

    await user.click(confirmar());
    await waitFor(() => expect(emitirNFCe).toHaveBeenCalledTimes(1));
    expect(emitirNFCe.mock.calls[0][0].itens).toHaveLength(1);
  });

  it("Cadastrar agora abre o cadastro com nome e preço, liga a peça ao item e libera a emissão", async () => {
    criarPeca.mockResolvedValue({ id: "peca-nova", descricao: "Palheta", ncm: "40169300", cst_ou_csosn: "500" });
    cadastrarPecaDoItem.mockResolvedValue(true);
    const { user, onItensMudaram } = montar([item("i2", "Palheta", null)]);

    await user.click(await screen.findByRole("button", { name: "Cadastrar agora" }));

    const campo = (rotulo: string) => screen.getByLabelText(rotulo, { exact: true }) as HTMLInputElement;
    await waitFor(() => expect(campo("Descrição *")).toHaveValue("Palheta"));
    expect(campo("Preço final")).toHaveValue(80);

    await user.type(campo("NCM *"), "40169300");
    await user.type(campo("C.E.S.T *"), "0100100");
    await user.type(campo("CFOP padrão *"), "5102");
    await user.selectOptions(screen.getByLabelText("Origem *"), "0");
    await user.type(campo("CST / CSOSN *"), "500");
    await user.click(screen.getByRole("button", { name: "Salvar peça" }));

    await waitFor(() => expect(cadastrarPecaDoItem).toHaveBeenCalledTimes(1));
    const [itemLigado, pecaId, lojaId] = cadastrarPecaDoItem.mock.calls[0];
    expect(itemLigado).toMatchObject({ id: "i2" });
    expect(pecaId).toBe("peca-nova");
    expect(lojaId).toBe("loja-1");
    expect(onItensMudaram).toHaveBeenCalled();

    await waitFor(() => expect(confirmar()).toBeEnabled());
    expect(screen.queryByText(/não pode sair ainda/)).not.toBeInTheDocument();
  });

  it("peça que sumiu do cadastro na hora de emitir não é descartada calada: a nota não sai", async () => {
    // A tela carregou com a peça, mas na emissão ela já não vem (apagada em
    // outro computador). Antes, ela era largada e a nota saía com valor a menos.
    buscarPecasPorIds.mockResolvedValueOnce([pecaComNcm]).mockResolvedValue([]);
    const { user } = montar([item("i1", "Pneu 175/70 R13", "peca-1"), item("i3", "Amortecedor", "peca-1")]);

    await user.click(await screen.findByRole("button", { name: "Confirmar emissão" }));

    expect(await screen.findByText("Essa peça precisa ser cadastrada pra sair na nota.")).toBeInTheDocument();
    expect(emitirNFCe).not.toHaveBeenCalled();
  });
});
