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
 * 4. Sem o token do Focus NFe, o aviso das peças aparece junto com o do token (#742).
 * 5. NFC-e no limite da UF (R$ 10.000) sem o cliente identificado avisa, sem
 *    travar o botão (#881).
 * 6. Pessoa física sem CPF completo (11 números) avisa que a nota sai sem o
 *    nome dela, sem travar o botão; "Consumidor" e venda sem cliente não
 *    avisam (#950).
 * 7. Peça com o CFOP que não combina com o CSOSN (5102 + 500) avisa com o
 *    nome da peça, sem travar o botão (#968).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";
import type { OrdemServico } from "@/types/os";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";
import type { Peca } from "@/types/peca";

const buscarDadosFiscaisDasPecas = vi.fn();
const listarPecasJanela = vi.fn();
const cadastrarPecaRapida = vi.fn();
const cadastrarPecaDoItem = vi.fn();
const emitirNFCe = vi.fn();
vi.mock("@/lib/pecas", () => ({
  buscarDadosFiscaisDasPecas: (...a: unknown[]) => buscarDadosFiscaisDasPecas(...a),
  listarPecasJanela: (...a: unknown[]) => listarPecasJanela(...a),
  cadastrarPecaRapida: (...a: unknown[]) => cadastrarPecaRapida(...a),
}));
vi.mock("@/lib/ordensServico", () => ({
  cadastrarPecaDoItem: (...a: unknown[]) => cadastrarPecaDoItem(...a),
}));
vi.mock("@/lib/focusNfe", async () => {
  // As regras de verdade de "a nota sai identificada?" e do total da nota,
  // não cópias (#881).
  const real = await vi.importActual<typeof import("@/lib/focusNfe")>("@/lib/focusNfe");
  return {
    destinatarioIdentificadoNFCe: real.destinatarioIdentificadoNFCe,
    valorTotalNFCe: real.valorTotalNFCe,
    emitirNFCe: (...a: unknown[]) => emitirNFCe(...a),
    emitirNFSe: vi.fn(),
    consultarNFCe: vi.fn(),
    consultarNFSe: vi.fn(),
    baixarArquivoNota: vi.fn(),
    refPertenceAOrdem: vi.fn(),
    FocusNfeError: class extends Error {},
    EsperaVencidaError: class extends Error {},
  };
});
vi.mock("@/lib/estoque", () => ({ registrarMovimento: vi.fn() }));
vi.mock("@/lib/categorias", () => ({ listarCategorias: async () => [] }));
vi.mock("@/lib/caixa", () => ({ listarMovimentosCaixaPorOrdem: async () => [] }));
vi.mock("@/lib/notasFiscais", () => ({ salvarArquivoEmitido: vi.fn() }));
const clienteDaOrdem = vi.fn();
vi.mock("@/lib/clientes", () => ({
  buscarClienteEVeiculoDaOrdem: async () => ({ cliente: clienteDaOrdem(), veiculo: null }),
}));
const buscarConfiguracaoFiscal = vi.fn();
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoFiscal: (...a: unknown[]) => buscarConfiguracaoFiscal(...a),
  confirmarAliquotaCompetencia: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op" }, lojaAtual: { id: "loja-1" } }),
}));

const { EmitirNotaFiscalModal } = await import("./EmitirNotaFiscalModal");

const pecaComNcm = { id: "peca-1", descricao: "Pneu 175/70 R13", ncm: "40111000", cst_ou_csosn: "500" } as unknown as Peca;
const pecaSemNcm = { id: "peca-2", descricao: "Filtro", ncm: "", cst_ou_csosn: "500" } as unknown as Peca;

const pecaNova = { id: "peca-nova", descricao: "Palheta", ncm: "40169300", cst_ou_csosn: "500" } as unknown as Peca;
const palhetaDoCadastro = { id: "peca-3", descricao: "Palheta", ncm: "40169300", cst_ou_csosn: "500", ativo: true } as unknown as Peca;

const item = (id: string, descricao: string, peca_id: string | null, preco_unitario = 80) => ({
  id, ordem_servico_id: "os-1", tipo: "peca", peca_id, servico_id: null, tecnico_id: null,
  descricao, quantidade: 1, preco_unitario, desconto: 0, custo_unitario: null,
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

async function preencherCadastro(user: Awaited<ReturnType<typeof montar>>["user"]) {
  const campo = (rotulo: string) => screen.getByLabelText(rotulo, { exact: true }) as HTMLInputElement;
  await waitFor(() => expect(campo("Descrição *")).toHaveValue("Palheta"));
  await user.type(campo("NCM *"), "40169300");
  await user.type(campo("C.E.S.T *"), "0100100");
  await user.type(campo("CFOP padrão *"), "5102");
  await user.selectOptions(screen.getByLabelText("Origem *"), "0");
  await user.type(campo("CST / CSOSN *"), "500");
}

const confirmar = () => screen.getByRole("button", { name: "Confirmar emissão" });

const configuracao = (focus_nfe_configurado: boolean) => ({
  loja_id: "loja-1",
  regime_tributario: "simples_nacional",
  focus_nfe_configurado,
  focus_nfe_ambiente: "homologacao",
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  clienteDaOrdem.mockReturnValue({ id: "c1", nome: "Maria", tipo_pessoa: "fisica", cpf_cnpj: null });
  buscarConfiguracaoFiscal.mockResolvedValue(configuracao(true));
  listarPecasJanela.mockResolvedValue([pecaComNcm]);
  buscarDadosFiscaisDasPecas.mockImplementation(async (ids: string[]) =>
    [pecaComNcm, pecaSemNcm, pecaNova, palhetaDoCadastro].filter((p) => ids.includes(p.id)),
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

  it("sem o token do Focus NFe, a peça sem cadastro aparece junto com o aviso do token (#742)", async () => {
    buscarConfiguracaoFiscal.mockResolvedValue(configuracao(false));
    montar([item("i1", "Pneu 175/70 R13", "peca-1"), item("i2", "Palheta", null)]);

    expect(await screen.findByText(/Falta cadastrar o token do Focus NFe/)).toBeInTheDocument();
    expect(await screen.findByText("Esta nota não pode sair ainda.")).toBeInTheDocument();
    expect(screen.getByText("Palheta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cadastrar agora" })).toBeInTheDocument();
    // Sem o token, continua sem botão de emitir.
    expect(screen.queryByRole("button", { name: "Confirmar emissão" })).not.toBeInTheDocument();
  });

  it("sem o token e sem peça faltando: só o aviso do token, como antes", async () => {
    buscarConfiguracaoFiscal.mockResolvedValue(configuracao(false));
    montar([item("i1", "Pneu 175/70 R13", "peca-1")]);

    expect(await screen.findByText(/Falta cadastrar o token do Focus NFe/)).toBeInTheDocument();
    expect(screen.queryByText("Esta nota não pode sair ainda.")).not.toBeInTheDocument();
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

  // #720: o catálogo só serve ao cadastro da peça avulsa (aviso de parecida).
  // Sem peça avulsa, a janela não baixa a lista inteira à toa.
  it("sem peça avulsa, a janela não carrega o catálogo de peças", async () => {
    montar([item("i1", "Pneu 175/70 R13", "peca-1")]);
    await screen.findByRole("button", { name: "Confirmar emissão" });
    expect(listarPecasJanela).not.toHaveBeenCalled();
  });

  it("com peça avulsa, carrega o catálogo (pro aviso de peça parecida)", async () => {
    montar([item("i1", "Palheta", null)]);
    await screen.findByRole("button", { name: "Confirmar emissão" });
    expect(listarPecasJanela).toHaveBeenCalledTimes(1);
  });

  it("Cadastrar agora abre o cadastro com nome e preço, liga a peça ao item e libera a emissão", async () => {
    cadastrarPecaRapida.mockResolvedValue("peca-nova");
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
    expect(cadastrarPecaDoItem.mock.calls[0]).toEqual(["i2", "peca-nova", "op"]);
    expect(onItensMudaram).toHaveBeenCalled();

    await waitFor(() => expect(confirmar()).toBeEnabled());
    expect(screen.queryByText(/não pode sair ainda/)).not.toBeInTheDocument();
  });

  // Revisão: recarregar a OS ficava no mesmo try do vínculo, e uma falha
  // dele dizia "não entrou na OS" com a peça já ligada.
  it("se só o recarregar da OS falha, não diz que a peça não entrou", async () => {
    cadastrarPecaRapida.mockResolvedValue("peca-nova");
    cadastrarPecaDoItem.mockResolvedValue(true);
    const { user, onItensMudaram } = montar([item("i2", "Palheta", null)]);
    onItensMudaram.mockRejectedValue(new Error("sem internet"));

    await user.click(await screen.findByRole("button", { name: "Cadastrar agora" }));
    const campo = (rotulo: string) => screen.getByLabelText(rotulo, { exact: true }) as HTMLInputElement;
    await waitFor(() => expect(campo("Descrição *")).toHaveValue("Palheta"));
    await user.type(campo("NCM *"), "40169300");
    await user.type(campo("C.E.S.T *"), "0100100");
    await user.type(campo("CFOP padrão *"), "5102");
    await user.selectOptions(screen.getByLabelText("Origem *"), "0");
    await user.type(campo("CST / CSOSN *"), "500");
    await user.click(screen.getByRole("button", { name: "Salvar peça" }));

    expect(await screen.findByText(/A peça foi cadastrada e ligada à OS/)).toBeInTheDocument();
    expect(screen.queryByText(/não entrou na OS/)).not.toBeInTheDocument();
    await waitFor(() => expect(confirmar()).toBeEnabled());
  });

  // #803: ligar e baixar é tudo ou nada no banco. Se a baixa falha (sem
  // depósito ativo), a peça NÃO fica ligada: a tela diz isso e, no próximo
  // "Cadastrar agora", oferece a peça que acabou de entrar no cadastro (o
  // aviso de peça parecida), pra não cadastrar outra igual (PR #717, ponto 1).
  it("se o banco recusa, a peça não entra, a tela diz por quê e a nova vira a parecida", async () => {
    cadastrarPecaRapida.mockResolvedValue("peca-nova");
    cadastrarPecaDoItem.mockRejectedValueOnce(
      new Error("Nenhum depósito ativo encontrado pra essa loja."),
    );
    const { user, onItensMudaram } = montar([item("i2", "Palheta", null)]);

    await user.click(await screen.findByRole("button", { name: "Cadastrar agora" }));
    await preencherCadastro(user);
    await user.click(screen.getByRole("button", { name: "Salvar peça" }));

    expect(
      await screen.findByText(/cadastrada \(já está no cadastro\), mas não entrou na OS: Nenhum depósito ativo/),
    ).toBeInTheDocument();
    expect(onItensMudaram).not.toHaveBeenCalled();
    expect(confirmar()).toBeDisabled();

    cadastrarPecaDoItem.mockResolvedValue(true);
    await user.click(screen.getByRole("button", { name: "Cadastrar agora" }));
    await preencherCadastro(user);
    await user.click(screen.getByRole("button", { name: "Salvar peça" }));
    await user.click(await screen.findByRole("button", { name: /Abrir a que já existe/ }));

    await waitFor(() => expect(cadastrarPecaDoItem).toHaveBeenCalledTimes(2));
    expect(cadastrarPecaDoItem.mock.calls[1]).toEqual(["i2", "peca-nova", "op"]);
    expect(cadastrarPecaRapida).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(confirmar()).toBeEnabled());
  });

  // #720, caso (b): o item já tinha sido ligado em outro computador. A peça
  // que a pessoa ACABOU de cadastrar sobra no cadastro, e a tela tem que dizer.
  it("item já ligado em outro computador: diz que a peça recém-cadastrada ficou no cadastro", async () => {
    cadastrarPecaRapida.mockResolvedValue("peca-nova");
    cadastrarPecaDoItem.mockResolvedValue(false);
    const { user, onItensMudaram } = montar([item("i2", "Palheta", null)]);

    await user.click(await screen.findByRole("button", { name: "Cadastrar agora" }));
    await preencherCadastro(user);
    await user.click(screen.getByRole("button", { name: "Salvar peça" }));

    expect(
      await screen.findByText(
        /já tinha sido ligado a uma peça.*A peça que você cadastrou ficou no cadastro: se ela sobrou, inative em Estoque\./,
      ),
    ).toBeInTheDocument();
    expect(onItensMudaram).not.toHaveBeenCalled();
  });

  it("item já ligado, mas a peça escolhida já existia (parecida): não fala em peça que sobrou", async () => {
    listarPecasJanela.mockResolvedValue([pecaComNcm, palhetaDoCadastro]);
    cadastrarPecaDoItem.mockResolvedValue(false);
    const { user } = montar([item("i2", "Palheta", null)]);

    await user.click(await screen.findByRole("button", { name: "Cadastrar agora" }));
    await preencherCadastro(user);
    await user.click(screen.getByRole("button", { name: "Salvar peça" }));
    await user.click(await screen.findByRole("button", { name: /Abrir a que já existe/ }));

    expect(await screen.findByText(/já tinha sido ligado a uma peça/)).toBeInTheDocument();
    expect(screen.queryByText(/ficou no cadastro/)).not.toBeInTheDocument();
  });

  // Revisão da Sofia (PR #717), ponto 2: o aviso de peça parecida (#653) não
  // levava a lugar nenhum aqui, e o único jeito era cadastrar a duplicada.
  it("peça parecida: escolher a que já existe liga o item a ela, sem cadastrar outra", async () => {
    listarPecasJanela.mockResolvedValue([pecaComNcm, palhetaDoCadastro]);
    cadastrarPecaDoItem.mockResolvedValue(true);
    const { user, onItensMudaram } = montar([item("i2", "Palheta", null)]);

    await user.click(await screen.findByRole("button", { name: "Cadastrar agora" }));
    await preencherCadastro(user);
    await user.click(screen.getByRole("button", { name: "Salvar peça" }));
    await user.click(await screen.findByRole("button", { name: /Abrir a que já existe/ }));

    await waitFor(() => expect(cadastrarPecaDoItem).toHaveBeenCalledTimes(1));
    expect(cadastrarPecaDoItem.mock.calls[0][1]).toBe("peca-3");
    expect(cadastrarPecaRapida).not.toHaveBeenCalled();
    expect(onItensMudaram).toHaveBeenCalled();
    await waitFor(() => expect(confirmar()).toBeEnabled());
    expect(screen.queryByText(/não pode sair ainda/)).not.toBeInTheDocument();
  });

  it("peça que sumiu do cadastro na hora de emitir não é descartada calada: a nota não sai", async () => {
    // A tela carregou com a peça, mas na emissão ela já não vem (apagada em
    // outro computador). Antes, ela era largada e a nota saía com valor a menos.
    buscarDadosFiscaisDasPecas.mockResolvedValueOnce([pecaComNcm]).mockResolvedValue([]);
    const { user } = montar([item("i1", "Pneu 175/70 R13", "peca-1"), item("i3", "Amortecedor", "peca-1")]);

    await user.click(await screen.findByRole("button", { name: "Confirmar emissão" }));

    expect(await screen.findByText("Essa peça precisa ser cadastrada pra sair na nota.")).toBeInTheDocument();
    expect(emitirNFCe).not.toHaveBeenCalled();
  });
});

describe("EmitirNotaFiscalModal — limite da UF sem cliente identificado (#881)", () => {
  const avisoDoLimite = /R\$ 10\.000 ou mais e vai sair sem CPF\/CNPJ/;

  it("acima de R$ 10.000, cliente sem CPF: avisa e o botão continua liberado", async () => {
    montar([item("i1", "Pneu 175/70 R13", "peca-1", 12000)]);

    await screen.findByRole("button", { name: "Confirmar emissão" });
    expect(screen.getByText(avisoDoLimite)).toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
  });

  it("compara o total da nota (cada linha arredondada), não a soma crua", async () => {
    // 4.999,995 vira 5.000,00 em cada linha da nota: a nota é de 10.000,00.
    montar([
      item("i1", "Pneu 175/70 R13", "peca-1", 4999.995),
      item("i2", "Pneu 175/70 R13", "peca-1", 4999.995),
    ]);

    await screen.findByRole("button", { name: "Confirmar emissão" });
    expect(screen.getByText(avisoDoLimite)).toBeInTheDocument();
  });

  it("abaixo de R$ 10.000, cliente sem CPF: sem o aviso", async () => {
    montar([item("i1", "Pneu 175/70 R13", "peca-1", 9000)]);

    await screen.findByRole("button", { name: "Confirmar emissão" });
    expect(screen.queryByText(avisoDoLimite)).not.toBeInTheDocument();
  });

  it("acima de R$ 10.000, cliente com CPF: sem o aviso", async () => {
    clienteDaOrdem.mockReturnValue({
      id: "c1", nome: "Maria", tipo_pessoa: "fisica", cpf_cnpj: "123.456.789-09",
    });
    montar([item("i1", "Pneu 175/70 R13", "peca-1", 12000)]);

    await screen.findByRole("button", { name: "Confirmar emissão" });
    expect(screen.queryByText(avisoDoLimite)).not.toBeInTheDocument();
  });
});

describe("EmitirNotaFiscalModal — pessoa física sem CPF completo (#950)", () => {
  const avisoCpf = () => screen.queryByText(/sem o CPF completo no cadastro/);
  const avisoCnpj = () => screen.queryByText(/sem o CNPJ no cadastro/);
  const abrir = async () => {
    montar([item("i1", "Pneu 175/70 R13", "peca-1")]);
    await screen.findByRole("button", { name: "Confirmar emissão" });
  };

  it("sem CPF: avisa e não trava o botão", async () => {
    await abrir();
    expect(avisoCpf()).toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
  });

  it("CPF pela metade: avisa", async () => {
    clienteDaOrdem.mockReturnValue({ id: "c1", nome: "Maria", tipo_pessoa: "fisica", cpf_cnpj: "123.456" });
    await abrir();
    expect(avisoCpf()).toBeInTheDocument();
  });

  it("CPF com 11 números: sem aviso", async () => {
    clienteDaOrdem.mockReturnValue({ id: "c1", nome: "Maria", tipo_pessoa: "fisica", cpf_cnpj: "123.456.789-09" });
    await abrir();
    expect(avisoCpf()).not.toBeInTheDocument();
  });

  it("Consumidor: sem aviso de CPF", async () => {
    clienteDaOrdem.mockReturnValue({ id: CLIENTE_CONSUMIDOR_ID, nome: "Consumidor", tipo_pessoa: "fisica", cpf_cnpj: null });
    await abrir();
    expect(avisoCpf()).not.toBeInTheDocument();
  });

  it("pessoa jurídica sem CNPJ: avisa do CNPJ e não do CPF", async () => {
    clienteDaOrdem.mockReturnValue({ id: "c2", nome: "Oficina", tipo_pessoa: "juridica", cpf_cnpj: null });
    await abrir();
    expect(avisoCnpj()).toBeInTheDocument();
    expect(avisoCpf()).not.toBeInTheDocument();
  });

  it("venda sem cliente: sem aviso de CPF", async () => {
    clienteDaOrdem.mockReturnValue(null);
    await abrir();
    expect(avisoCpf()).not.toBeInTheDocument();
  });
});

describe("EmitirNotaFiscalModal — CFOP que não combina com o CSOSN (#968)", () => {
  const pecaCfopErrado = {
    id: "peca-cfop", descricao: "Pneu 185/65 R15", ncm: "40111000", cfop_padrao: "5102", cst_ou_csosn: "500",
  } as unknown as Peca;
  const pecaCfopCerto = {
    id: "peca-cfop-ok", descricao: "Pneu 195/55 R16", ncm: "40111000", cfop_padrao: "5.405", cst_ou_csosn: "500",
  } as unknown as Peca;

  beforeEach(() => {
    buscarDadosFiscaisDasPecas.mockImplementation(async (ids: string[]) =>
      [pecaCfopErrado, pecaCfopCerto].filter((p) => ids.includes(p.id)),
    );
  });

  it("peça com 5102 + CSOSN 500: avisa com o nome da peça e o botão continua liberado", async () => {
    montar([item("i1", "Pneu 185/65 R15", "peca-cfop")]);

    await screen.findByRole("button", { name: "Confirmar emissão" });
    expect(await screen.findByText("Pneu 185/65 R15")).toBeInTheDocument();
    expect(
      screen.getByText(/o CFOP 5102 não combina com o CSOSN 500 .*use 5405/),
    ).toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
  });

  it("peça com CSOSN 500 e sem CFOP: avisa, porque a nota sai com 5102", async () => {
    buscarDadosFiscaisDasPecas.mockResolvedValue([{ ...pecaCfopErrado, cfop_padrao: null }]);
    montar([item("i1", "Pneu 185/65 R15", "peca-cfop")]);

    await screen.findByRole("button", { name: "Confirmar emissão" });
    expect(
      await screen.findByText(/o CFOP 5102 não combina com o CSOSN 500 .*use 5405/),
    ).toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
  });

  it("peça com 5.405 + CSOSN 500: sem aviso do CFOP", async () => {
    montar([item("i1", "Pneu 195/55 R16", "peca-cfop-ok")]);

    await screen.findByRole("button", { name: "Confirmar emissão" });
    expect(screen.queryByText(/não combina com o CSOSN/)).not.toBeInTheDocument();
    expect(screen.queryByText(/código de ICMS ou o CFOP/)).not.toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
  });
});
