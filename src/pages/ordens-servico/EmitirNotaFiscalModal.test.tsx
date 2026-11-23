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
 * 8. A SEFAZ recusou o CPF/CNPJ do destinatário (#1112): a frase de balcão, o
 *    "Detalhe da SEFAZ" e o botão "Emitir sem identificar o cliente", que
 *    emite de novo sem o destinatário; rejeição de outra família continua
 *    como antes; "Copiar o erro" não leva nome nem documento do cliente.
 * 9. Nota já enviada nunca volta pro "Confirmar emissão": nem quando a
 *    consulta falha (EsperaVencidaError), nem quando a nota sai autorizada e
 *    o registro dela no sistema falha. A janela fica no "Conferir de novo",
 *    com a referência à mostra (achado na revisão da #1112).
 * 10. NFS-e: o valor e os serviços que foram na nota são guardados junto
 *    dela (#1142), o mesmo valor mandado à prefeitura; o "Registrar esta
 *    nota" por referência digitada não sabe o que foi mandado e não guarda.
 * 11. A NFS-e leva o resumo da OS na discriminação (uma linha por serviço) e
 *     o valor dos serviços não muda (#1040).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { reiniciarConexaoParaTeste } from "@/hooks/useConexao";
import { renderizar, screen, waitFor } from "@/testes/tela";
import type { OrdemServico } from "@/types/os";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";
import type { Peca } from "@/types/peca";

const buscarDadosFiscaisDasPecas = vi.fn();
const listarPecasJanela = vi.fn();
const cadastrarPecaRapida = vi.fn();
const cadastrarPecaDoItem = vi.fn();
const emitirNFCe = vi.fn();
const emitirNFSe = vi.fn();
const consultarNFCe = vi.fn();
const salvarArquivoEmitido = vi.fn();
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
    emitirNFSe: (...a: unknown[]) => emitirNFSe(...a),
    consultarNFCe: (...a: unknown[]) => consultarNFCe(...a),
    consultarNFSe: vi.fn(),
    baixarArquivoNota: vi.fn(),
    refPertenceAOrdem: real.refPertenceAOrdem,
    FocusNfeError: real.FocusNfeError,
    EsperaVencidaError: real.EsperaVencidaError,
  };
});
const registrarMovimento = vi.fn();
vi.mock("@/lib/estoque", () => ({ registrarMovimento: (...a: unknown[]) => registrarMovimento(...a) }));
vi.mock("@/lib/categorias", () => ({ listarCategorias: async () => [] }));
vi.mock("@/lib/caixa", () => ({ listarMovimentosCaixaPorOrdem: async () => [] }));
vi.mock("@/lib/notasFiscais", () => ({
  salvarArquivoEmitido: (...a: unknown[]) => salvarArquivoEmitido(...a),
}));
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
const { EsperaVencidaError } = await import("@/lib/focusNfe");

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
  reiniciarConexaoParaTeste();
  localStorage.clear();
  vi.clearAllMocks();
  // O `clearAllMocks` não desfaz um `mockRejectedValue` de um teste anterior.
  salvarArquivoEmitido.mockReset();
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

  // #909: a peça foi criada, mas o estoque inicial não entrou. Antes o erro
  // subia antes do `onCadastrada`: a janela não ligava a peça e um novo
  // "Salvar" criava outra igual. Agora liga, avisa e não trava a emissão.
  it("se só o estoque inicial falha, liga a peça criada, avisa e não cadastra duas vezes", async () => {
    cadastrarPecaRapida.mockResolvedValue("peca-nova");
    registrarMovimento.mockRejectedValue(new Error("Nenhum depósito ativo encontrado pra essa loja."));
    cadastrarPecaDoItem.mockResolvedValue(true);
    const { user, onItensMudaram } = montar([item("i2", "Palheta", null)]);

    await user.click(await screen.findByRole("button", { name: "Cadastrar agora" }));
    await preencherCadastro(user);
    await user.type(screen.getByLabelText("Qtde. estoque inicial", { exact: true }), "3");
    await user.click(screen.getByRole("button", { name: "Salvar peça" }));

    await waitFor(() => expect(cadastrarPecaDoItem).toHaveBeenCalledTimes(1));
    expect(cadastrarPecaDoItem.mock.calls[0]).toEqual(["i2", "peca-nova", "op"]);
    expect(onItensMudaram).toHaveBeenCalled();
    expect(
      await screen.findByText(
        "Palheta: Peça cadastrada, mas o estoque inicial não entrou (Nenhum depósito ativo encontrado pra essa loja). " +
          "Peça a quem cuida do Estoque para lançar a entrada.",
      ),
    ).toBeInTheDocument();
    expect(cadastrarPecaRapida).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(confirmar()).toBeEnabled());
  });

  // Revisão: ligar outra peça (aqui, a que já existe) apagava o aviso da anterior.
  it("ligar a próxima peça não apaga o aviso de estoque da anterior", async () => {
    listarPecasJanela.mockResolvedValue([pecaComNcm, palhetaDoCadastro]);
    cadastrarPecaRapida.mockResolvedValue("peca-nova");
    registrarMovimento.mockRejectedValue(new Error("sem internet"));
    cadastrarPecaDoItem.mockResolvedValue(true);
    const { user } = montar([item("i2", "Escova", null), item("i3", "Palheta", null)]);

    // A primeira: cadastra nova (sem parecida), com o estoque inicial falhando.
    const [primeiro] = await screen.findAllByRole("button", { name: "Cadastrar agora" });
    await user.click(primeiro);
    const campo = (rotulo: string) => screen.getByLabelText(rotulo, { exact: true }) as HTMLInputElement;
    await waitFor(() => expect(campo("Descrição *")).toHaveValue("Escova"));
    await user.type(campo("NCM *"), "40169300");
    await user.type(campo("C.E.S.T *"), "0100100");
    await user.type(campo("CFOP padrão *"), "5102");
    await user.selectOptions(screen.getByLabelText("Origem *"), "0");
    await user.type(campo("CST / CSOSN *"), "500");
    await user.type(campo("Qtde. estoque inicial"), "3");
    await user.click(screen.getByRole("button", { name: "Salvar peça" }));
    expect(await screen.findByText(/estoque inicial não entrou \(sem internet\)/)).toBeInTheDocument();

    // A segunda: liga a que já existe, pelo aviso de peça parecida.
    await waitFor(() => expect(cadastrarPecaDoItem).toHaveBeenCalledTimes(1));
    await user.click(await screen.findByRole("button", { name: "Cadastrar agora" }));
    await preencherCadastro(user);
    await user.click(screen.getByRole("button", { name: "Salvar peça" }));
    await user.click(await screen.findByRole("button", { name: /Abrir a que já existe/ }));
    await waitFor(() => expect(cadastrarPecaDoItem).toHaveBeenCalledTimes(2));

    expect(screen.getByText(/estoque inicial não entrou \(sem internet\)/)).toBeInTheDocument();
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

describe("EmitirNotaFiscalModal — sem internet (#374)", () => {
  it("offline: avisa perto do botão e o Confirmar emissão continua liberado", async () => {
    montar([item("i1", "Pneu 175/70 R13", "peca-1")]);
    expect(await screen.findByRole("button", { name: "Confirmar emissão" })).toBeEnabled();
    expect(screen.queryByText(/Sem internet a nota não sai/)).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByText(/Sem internet a nota não sai/)).toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
  });

  // Teste no PC (12/11): abrir a janela já sem internet não lê a configuração
  // da loja; não pode dizer "falta cadastrar o token" e precisa da frase.
  it("abrindo já sem internet: a frase aparece e não diz que falta o token", async () => {
    buscarConfiguracaoFiscal.mockRejectedValue(new TypeError("Failed to fetch"));
    montar([item("i1", "Pneu 175/70 R13", "peca-1")]);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(await screen.findByText(/Sem conexão com a internet/)).toBeInTheDocument();
    expect(screen.getByText(/Sem internet a nota não sai/)).toBeInTheDocument();
    expect(screen.queryByText(/Falta cadastrar o token/)).not.toBeInTheDocument();
    // As peças também não vieram: não dá pra dizer que falta cadastrar a peça.
    expect(screen.queryByText(/Esta nota não pode sair ainda/)).not.toBeInTheDocument();
  });
});

describe("EmitirNotaFiscalModal — resumo da OS na discriminação da NFS-e (#1040)", () => {
  const servico = (id: string, descricao: string, quantidade: number, preco_unitario: number, desconto = 0) => ({
    id, ordem_servico_id: "os-1", tipo: "servico", peca_id: null, servico_id: "s1", tecnico_id: null,
    descricao, quantidade, preco_unitario, desconto, custo_unitario: null,
  });

  it("uma linha por serviço, com quantidade e valor; o valor dos serviços é o mesmo de antes", async () => {
    clienteDaOrdem.mockReturnValue({
      id: "c1", nome: "Maria", tipo_pessoa: "fisica", cpf_cnpj: "123.456.789-09", codigo_municipio: "3503208",
    });
    emitirNFSe.mockResolvedValue({ status: "autorizado", numero: "7", ref: "r1" });
    const { user } = renderizar(
      <EmitirNotaFiscalModal
        ordem={ordem([
          servico("s-1", "Alinhamento", 1, 80),
          servico("s-2", "Balanceamento", 4, 15, 10),
          item("i1", "Pneu 175/70 R13", "peca-1"),
        ])}
        tipoNota="NFS-e"
        onFechar={vi.fn()}
        onEmitido={vi.fn()}
        onItensMudaram={vi.fn()}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Confirmar emissão" }));
    await waitFor(() => expect(emitirNFSe).toHaveBeenCalledTimes(1));
    const dados = emitirNFSe.mock.calls[0][0];
    expect(dados.discriminacao).toBe("Alinhamento - R$ 80,00\n4 x Balanceamento - R$ 50,00");
    expect(dados.valorServicos).toBe(130);
  });
});

describe("EmitirNotaFiscalModal — SEFAZ não reconheceu o destinatário (#1112)", () => {
  // A mensagem real de 17/11 com um CNPJ de exemplo (o repositório é público).
  // CNPJ de exemplo com os dígitos certos (o cadastro "certo" do caso de 17/11).
  const CNPJ = "11.222.333/0001-81";
  const MENSAGEM = `Rejeição: CNPJ ${CNPJ} do destinatário não cadastrado na Receita Federal`;
  const recusada = {
    status: "erro_autorizacao",
    status_sefaz: "999",
    mensagem_sefaz: MENSAGEM,
    ref: "os51-nfce-1763400000000",
  };
  const clientePJ = {
    id: "c1", nome: "Transportes Exemplo Ltda", tipo_pessoa: "juridica", cpf_cnpj: CNPJ,
  };
  const botaoSemCliente = () =>
    screen.queryByRole("button", { name: "Emitir sem identificar o cliente" });
  const fraseCnpj = /A SEFAZ ainda não reconhece o CNPJ deste cliente/;

  async function recusarPeloDestinatario(preco = 80) {
    clienteDaOrdem.mockReturnValue(clientePJ);
    emitirNFCe.mockResolvedValueOnce(recusada);
    const tela = montar([item("i1", "Pneu 175/70 R13", "peca-1", preco)]);
    await tela.user.click(await screen.findByRole("button", { name: "Confirmar emissão" }));
    await screen.findByText(fraseCnpj);
    return tela;
  }

  it("mostra a frase, o Detalhe da SEFAZ, o aviso de ambiente e o botão novo no lugar do de antes", async () => {
    await recusarPeloDestinatario();

    expect(screen.getByText("Detalhe da SEFAZ")).toBeInTheDocument();
    expect(screen.getByText(MENSAGEM)).toBeInTheDocument();
    expect(screen.getByText(/Ambiente de homologação/)).toBeInTheDocument();
    expect(botaoSemCliente()).toBeEnabled();
    expect(
      screen.getByText(/A nota sai como consumidor não identificado\. Ela vale normalmente/),
    ).toBeInTheDocument();
    // O "Confirmar emissão" só repetiria a recusa, e o link da nota que "já
    // saiu na Focus" não tem nada a ver com o caso.
    expect(screen.queryByRole("button", { name: "Confirmar emissão" })).not.toBeInTheDocument();
    expect(screen.queryByText(/A nota já saiu na Focus NFe/)).not.toBeInTheDocument();
    // Um botão laranja só.
    expect(document.querySelectorAll("button.bg-acao")).toHaveLength(1);
  });

  it("clicar emite sem destinatário, com os mesmos itens, e termina como uma emissão normal", async () => {
    const { user, onEmitido } = await recusarPeloDestinatario();
    emitirNFCe.mockResolvedValueOnce({ status: "autorizado", numero: "11", ref: "os51-nfce-2" });

    await user.click(botaoSemCliente()!);

    expect(await screen.findByText(/NFC-e emitida com sucesso — número 11/)).toBeInTheDocument();
    expect(emitirNFCe).toHaveBeenCalledTimes(2);
    const [primeira, segunda] = emitirNFCe.mock.calls;
    expect(primeira[1]?.semDestinatario ?? false).toBe(false);
    expect(segunda[1]).toEqual({ semDestinatario: true });
    expect(segunda[0].itens).toEqual(primeira[0].itens);
    expect(segunda[0].pagamentos).toEqual(primeira[0].pagamentos);
    expect(onEmitido).toHaveBeenCalledTimes(1);
  });

  it("clicar 2 vezes não emite 2 notas: o botão trava enquanto emite", async () => {
    const { user } = await recusarPeloDestinatario();
    let liberar: (v: unknown) => void = () => {};
    emitirNFCe.mockReturnValueOnce(new Promise((r) => (liberar = r)));

    await user.click(botaoSemCliente()!);
    const emitindo = await screen.findByRole("button", { name: "Emitindo..." });
    expect(emitindo).toBeDisabled();
    await user.click(emitindo);
    expect(emitirNFCe).toHaveBeenCalledTimes(2);

    await act(async () => liberar({ status: "autorizado", numero: "12", ref: "os51-nfce-3" }));
    expect(await screen.findByText(/NFC-e emitida com sucesso/)).toBeInTheDocument();
  });

  it("cliente PJ: aponta pra NF-e (modelo 55)", async () => {
    await recusarPeloDestinatario();
    expect(screen.getByText(/o documento certo é a NF-e \(modelo 55\)/)).toBeInTheDocument();
  });

  it("acima do limite da UF, o aviso do limite aparece junto do botão novo", async () => {
    await recusarPeloDestinatario(10500);
    expect(screen.getByText(/R\$ 10\.000 ou mais: sem o cliente identificado, a SEFAZ também deve recusar/)).toBeInTheDocument();
    // O "cadastre o documento" do aviso de sempre não serve: o documento foi recusado.
    expect(screen.queryByText(/cadastre o documento/)).not.toBeInTheDocument();
    expect(botaoSemCliente()).toBeEnabled();
  });

  it("abaixo do limite, sem o aviso do limite", async () => {
    await recusarPeloDestinatario(80);
    expect(screen.queryByText(/R\$ 10\.000 ou mais/)).not.toBeInTheDocument();
  });

  it("pessoa física: a frase do CPF, sem a parte da empresa nem a da NF-e", async () => {
    clienteDaOrdem.mockReturnValue({
      id: "c1", nome: "Maria", tipo_pessoa: "fisica", cpf_cnpj: "123.456.789-09",
    });
    emitirNFCe.mockResolvedValueOnce({
      status: "erro_autorizacao", mensagem_sefaz: "Rejeição: CPF do destinatário inválido",
    });
    const { user } = montar([item("i1", "Pneu 175/70 R13", "peca-1")]);
    await user.click(await screen.findByRole("button", { name: "Confirmar emissão" }));

    expect(await screen.findByText(/A SEFAZ não reconheceu o CPF deste cliente/)).toBeInTheDocument();
    expect(botaoSemCliente()).toBeEnabled();
    expect(screen.queryByText(/modelo 55/)).not.toBeInTheDocument();
  });

  it("\"Copiar o erro\" leva a mensagem, o código e a referência, sem o nome nem o CNPJ", async () => {
    const { user } = await recusarPeloDestinatario();

    await user.click(screen.getByRole("button", { name: "Copiar o erro" }));

    const copiado = await navigator.clipboard.readText();
    expect(copiado).toContain("do destinatário não cadastrado na Receita Federal");
    expect(copiado).toContain("999");
    expect(copiado).toContain("os51-nfce-1763400000000");
    expect(copiado).not.toContain(CNPJ);
    expect(copiado).not.toContain("11222333000181");
    expect(copiado).not.toMatch(/Transportes Exemplo/i);
    expect(await screen.findByText(/Copiado/)).toBeInTheDocument();
  });

  // Revisão do PR: a nota que já foi SEM o documento não pode cair na frase
  // de novo — o botão repetiria a mesma nota e a mesma recusa, em ciclo.
  it("cliente sem documento na nota: a recusa aparece crua, sem a frase nem o botão novo", async () => {
    clienteDaOrdem.mockReturnValue({ id: "c1", nome: "Maria", tipo_pessoa: "fisica", cpf_cnpj: null });
    emitirNFCe.mockResolvedValueOnce({
      status: "erro_autorizacao",
      mensagem_sefaz: "Rejeição: Não informado CPF/CNPJ do destinatário para NFC-e acima do limite",
    });
    const { user } = montar([item("i1", "Pneu 175/70 R13", "peca-1")]);
    await user.click(await screen.findByRole("button", { name: "Confirmar emissão" }));

    expect(await screen.findByText(/Não informado CPF\/CNPJ do destinatário/)).toBeInTheDocument();
    expect(screen.queryByText(/A SEFAZ não reconheceu/)).not.toBeInTheDocument();
    expect(botaoSemCliente()).not.toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
  });

  it("recusada de novo depois do 'sem identificar': mostra a recusa crua, sem oferecer o mesmo botão", async () => {
    const { user } = await recusarPeloDestinatario();
    emitirNFCe.mockResolvedValueOnce({
      status: "erro_autorizacao",
      mensagem_sefaz: "Rejeição: CNPJ do destinatário inválido",
    });

    await user.click(botaoSemCliente()!);

    expect(await screen.findByText("Rejeição: CNPJ do destinatário inválido")).toBeInTheDocument();
    expect(screen.queryByText(fraseCnpj)).not.toBeInTheDocument();
    expect(botaoSemCliente()).not.toBeInTheDocument();
  });

  it("erro passageiro no 'sem identificar' (ex.: internet): a recusa e o botão novo continuam", async () => {
    const { user } = await recusarPeloDestinatario();
    buscarDadosFiscaisDasPecas.mockRejectedValueOnce(new Error("O servidor não respondeu"));

    await user.click(botaoSemCliente()!);

    expect(await screen.findByText(/O servidor não respondeu/)).toBeInTheDocument();
    expect(screen.getByText(fraseCnpj)).toBeInTheDocument();
    expect(botaoSemCliente()).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Confirmar emissão" })).not.toBeInTheDocument();
  });

  it("CNPJ com o dígito errado no cadastro: manda corrigir em vez de falar de empresa nova", async () => {
    clienteDaOrdem.mockReturnValue({ ...clientePJ, cpf_cnpj: "12.345.678/0001-99" });
    emitirNFCe.mockResolvedValueOnce({
      status: "erro_autorizacao", mensagem_sefaz: "Rejeição: CNPJ do destinatário inválido",
    });
    const { user } = montar([item("i1", "Pneu 175/70 R13", "peca-1")]);
    await user.click(await screen.findByRole("button", { name: "Confirmar emissão" }));

    expect(await screen.findByText(/O CNPJ no cadastro deste cliente tem um número errado/)).toBeInTheDocument();
    expect(screen.queryByText(fraseCnpj)).not.toBeInTheDocument();
    expect(botaoSemCliente()).toBeEnabled();
  });

  // Revisão de 20/11: a nota "sem identificar" saiu, mas o registro falhou.
  // O que vale agora é o "Conferir de novo" (#1122), não a recusa de antes.
  it("sem identificar autorizada e o registro falha: a faixa da recusa some, fica o Conferir de novo", async () => {
    const { user } = await recusarPeloDestinatario();
    emitirNFCe.mockResolvedValueOnce({ status: "autorizado", numero: "11", ref: "os51-nfce-2" });
    salvarArquivoEmitido.mockRejectedValueOnce(new Error("Failed to fetch"));

    await user.click(botaoSemCliente()!);

    expect(await screen.findByRole("button", { name: "Conferir de novo" })).toBeInTheDocument();
    expect(screen.queryByText(fraseCnpj)).not.toBeInTheDocument();
    expect(botaoSemCliente()).not.toBeInTheDocument();
  });

  it("rejeição de outra família continua como hoje: mensagem crua e Confirmar emissão", async () => {
    clienteDaOrdem.mockReturnValue(clientePJ);
    emitirNFCe.mockResolvedValueOnce({
      status: "erro_autorizacao",
      mensagem_sefaz: "Rejeição: CSOSN incompatível na operação com Não Contribuinte [nItem:1]",
    });
    const { user } = montar([item("i1", "Pneu 175/70 R13", "peca-1")]);
    await user.click(await screen.findByRole("button", { name: "Confirmar emissão" }));

    expect(await screen.findByText(/CSOSN incompatível/)).toBeInTheDocument();
    expect(screen.queryByText(fraseCnpj)).not.toBeInTheDocument();
    expect(botaoSemCliente()).not.toBeInTheDocument();
    expect(screen.queryByText("Detalhe da SEFAZ")).not.toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
    expect(screen.getByText(/A nota já saiu na Focus NFe/)).toBeInTheDocument();
  });
});

describe("EmitirNotaFiscalModal — nota já enviada nunca volta pro emitir (nota dupla)", () => {
  const REF = "os51-nfce-1795000000000";
  const autorizada = { status: "autorizado", numero: "10", ref: REF, caminho_xml_nota_fiscal: "/x.xml" };
  const pneu = () => [item("i1", "Pneu 175/70 R13", "peca-1")];

  it("consulta que falhou depois do envio: Conferir de novo, com a referência, e sem o emitir", async () => {
    emitirNFCe.mockRejectedValue(
      new EsperaVencidaError("Não consegui conferir se a nota saiu — não emita de novo.", REF),
    );
    const { user } = montar(pneu());
    await user.click(await screen.findByRole("button", { name: "Confirmar emissão" }));

    expect(await screen.findByRole("button", { name: "Conferir de novo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar emissão" })).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(REF))).toBeInTheDocument();
  });

  it("nota autorizada que não foi registrada: Conferir de novo registra, sem emitir outra", async () => {
    emitirNFCe.mockResolvedValue(autorizada);
    salvarArquivoEmitido.mockRejectedValueOnce(new Error("Failed to fetch")).mockResolvedValue(undefined);
    consultarNFCe.mockResolvedValue(autorizada);
    const { user, onEmitido } = montar(pneu());
    await user.click(await screen.findByRole("button", { name: "Confirmar emissão" }));

    const conferir = await screen.findByRole("button", { name: "Conferir de novo" });
    expect(screen.queryByRole("button", { name: "Confirmar emissão" })).not.toBeInTheDocument();
    expect(screen.getByText(/autorizada.*não emita de novo/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(REF))).toBeInTheDocument();
    expect(onEmitido).not.toHaveBeenCalled();

    await user.click(conferir);
    await waitFor(() => expect(onEmitido).toHaveBeenCalledTimes(1));
    expect(salvarArquivoEmitido).toHaveBeenCalledTimes(2);
    expect(consultarNFCe).toHaveBeenCalledWith(REF, "loja-1");
    expect(emitirNFCe).toHaveBeenCalledTimes(1);
  });

  it("registrar pela referência e o registro falha: fica no Conferir de novo, sem o emitir", async () => {
    consultarNFCe.mockResolvedValue(autorizada);
    salvarArquivoEmitido.mockRejectedValue(new Error("Failed to fetch"));
    const { user } = montar(pneu());
    await user.click(await screen.findByRole("button", { name: /já saiu na Focus NFe/ }));
    await user.type(screen.getByPlaceholderText(/os51-nfce-/), REF);
    await user.click(screen.getByRole("button", { name: "Registrar esta nota" }));

    expect(await screen.findByRole("button", { name: "Conferir de novo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar emissão" })).not.toBeInTheDocument();
    expect(emitirNFCe).not.toHaveBeenCalled();
  });
});

describe("EmitirNotaFiscalModal — NFS-e guarda o valor que foi na nota (#1142)", () => {
  const REF = "os51-nfse-1795000000000";
  const autorizada = { status: "autorizado", numero: "10", ref: REF, caminho_xml_nota_fiscal: "/x.xml" };
  const servico = (id: string, descricao: string, preco: number, quantidade = 1, desconto = 0) => ({
    ...item(id, descricao, null, preco),
    tipo: "servico",
    quantidade,
    desconto,
  });
  const itens = () => [
    servico("s1", "Alinhamento 3D", 120.1),
    servico("s2", "Balanceamento", 20.333, 4, 1.5),
    item("p1", "Pneu 175/70 R13", "peca-1", 300),
  ];

  function montarNfse() {
    clienteDaOrdem.mockReturnValue({ id: "c1", nome: "Maria", tipo_pessoa: "fisica", cpf_cnpj: null, codigo_municipio: "3503208" });
    return renderizar(
      <EmitirNotaFiscalModal ordem={ordem(itens())} tipoNota="NFS-e" onFechar={vi.fn()} onEmitido={vi.fn()} />,
    );
  }

  it("emitida: guarda o mesmo valor mandado à prefeitura, com os serviços (sem a peça)", async () => {
    emitirNFSe.mockResolvedValue(autorizada);
    salvarArquivoEmitido.mockResolvedValue(undefined);
    const { user } = montarNfse();
    await user.click(await screen.findByRole("button", { name: "Confirmar emissão" }));

    await waitFor(() => expect(salvarArquivoEmitido).toHaveBeenCalledTimes(1));
    const enviado = emitirNFSe.mock.calls[0][0] as { valorServicos: number };
    const { valores } = salvarArquivoEmitido.mock.calls[0][0] as {
      valores: { valorServicos: number; itens: { descricao: string }[] };
    };
    // 120,10 + (4 × 20,333 − 1,50) = 199,93
    expect(valores.valorServicos).toBe(199.93);
    expect(Math.round(enviado.valorServicos * 100)).toBe(19993);
    expect(valores.itens.map((i) => i.descricao)).toEqual(["Alinhamento 3D", "Balanceamento"]);
  });

  it("registrada pela referência digitada: não guarda valor nenhum, nem o de um envio recusado antes", async () => {
    emitirNFSe.mockRejectedValue(new Error("A prefeitura recusou a nota."));
    const { user } = montarNfse();
    await user.click(await screen.findByRole("button", { name: "Confirmar emissão" }));
    expect(await screen.findByText(/A prefeitura recusou a nota/)).toBeInTheDocument();
    const { consultarNFSe } = await import("@/lib/focusNfe");
    vi.mocked(consultarNFSe).mockResolvedValue(autorizada);
    salvarArquivoEmitido.mockResolvedValue(undefined);
    await user.click(await screen.findByRole("button", { name: /já saiu na Focus NFe/ }));
    await user.type(screen.getByPlaceholderText(/os51-nfse-/), REF);
    await user.click(screen.getByRole("button", { name: "Registrar esta nota" }));

    await waitFor(() => expect(salvarArquivoEmitido).toHaveBeenCalledTimes(1));
    expect((salvarArquivoEmitido.mock.calls[0][0] as { valores: unknown }).valores).toBeNull();
    expect(emitirNFSe).toHaveBeenCalledTimes(1);
  });
});
