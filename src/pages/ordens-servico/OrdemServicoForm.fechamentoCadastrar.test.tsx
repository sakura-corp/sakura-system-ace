// @vitest-environment jsdom
/**
 * Teste de TELA, a corrente inteira (#1130, passo 4): OS já faturada → aba
 * Fechamento → "Emitir NFC-e" → "Cadastrar agora" (peça avulsa) → "Salvar
 * peça". Foi aqui que a nota travou na loja: o formulário da peça era
 * desenhado dentro do `<form>` da OS e o "Salvar peça" não fazia nada visível.
 *
 * Diferente do `OrdemServicoForm.fechamento.test.tsx` (que troca a aba por um
 * formulário de mentira), aqui a aba, a janela da nota e o `PecaForm` são os
 * de verdade; só o banco e a Focus NFe são de mentira. A trava de `<form>`
 * dentro de `<form>` vem ligada pelo `@/testes/tela`: se a janela voltar pra
 * dentro do formulário da OS, os dois testes reprovam.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reiniciarConexaoParaTeste } from "@/hooks/useConexao";
import { renderizar, screen, waitFor, within } from "@/testes/tela";
import type { Cliente } from "@/types/cliente";
import type { Funcionario } from "@/types/funcionario";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";

const cadastrarPecaRapida = vi.fn();
const cadastrarPecaDoItem = vi.fn();
const buscarDadosFiscaisDasPecas = vi.fn();
// Se o cliente já foi avisado (o passo "garantia e avisar", #1088): aqui, nunca.
vi.mock("@/lib/avisoDaOrdem", () => ({ quandoAvisouCarroPronto: async () => null }));
vi.mock("@/lib/pecas", () => ({
  buscarDadosFiscaisDasPecas: (...a: unknown[]) => buscarDadosFiscaisDasPecas(...a),
  listarPecasJanela: async () => [],
  cadastrarPecaRapida: (...a: unknown[]) => cadastrarPecaRapida(...a),
}));
vi.mock("@/lib/ordensServico", () => ({
  cadastrarPecaDoItem: (...a: unknown[]) => cadastrarPecaDoItem(...a),
}));
vi.mock("@/lib/focusNfe", async () => {
  const real = await vi.importActual<typeof import("@/lib/focusNfe")>("@/lib/focusNfe");
  return {
    destinatarioIdentificadoNFCe: real.destinatarioIdentificadoNFCe,
    valorTotalNFCe: real.valorTotalNFCe,
    emitirNFCe: vi.fn(),
    emitirNFSe: vi.fn(),
    consultarNFCe: vi.fn(),
    consultarNFSe: vi.fn(),
    baixarArquivoNota: vi.fn(),
    refPertenceAOrdem: real.refPertenceAOrdem,
    FocusNfeError: real.FocusNfeError,
    EsperaVencidaError: real.EsperaVencidaError,
  };
});
vi.mock("@/lib/estoque", () => ({ registrarMovimento: vi.fn() }));
vi.mock("@/lib/categorias", () => ({ listarCategorias: async () => [] }));
vi.mock("@/lib/caixa", () => ({
  listarMovimentosCaixaPorOrdem: async () => [],
  buscarCustoDasOrdens: async () => new Map(),
}));
vi.mock("@/lib/notasFiscais", () => ({
  salvarArquivoEmitido: vi.fn(),
  listarArquivosDasOrdens: async () => [],
}));
vi.mock("@/lib/clientes", () => ({
  buscarClienteEVeiculoDaOrdem: async () => ({
    cliente: { id: "cliente-1", nome: "Maria da Silva", tipo_pessoa: "fisica", cpf_cnpj: null },
    veiculo: null,
  }),
}));
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoFiscal: async () => ({
    loja_id: "loja-1",
    regime_tributario: "simples_nacional",
    focus_nfe_configurado: true,
    focus_nfe_ambiente: "homologacao",
  }),
  confirmarAliquotaCompetencia: vi.fn(),
  buscarTextoGarantia: async () => "",
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op", admin: false, permissoes: [] }, lojaAtual: { id: "loja-1" } }),
}));

const { OrdemServicoForm } = await import("./OrdemServicoForm");

const palhetaCadastrada = {
  id: "peca-nova", descricao: "Palheta", ncm: "40169300", cst_ou_csosn: "500",
} as unknown as Peca;

beforeEach(() => {
  reiniciarConexaoParaTeste();
  localStorage.clear();
  vi.clearAllMocks();
  cadastrarPecaRapida.mockReset();
  buscarDadosFiscaisDasPecas.mockImplementation(async (ids: string[]) =>
    [palhetaCadastrada].filter((p) => ids.includes(p.id)),
  );
});

const funcionarios = [
  { id: "func-1", loja_id: "loja-1", nome: "Carlos", cargo: "Mecânico", ativo: true },
] as unknown as Funcionario[];

const clientes = [
  {
    id: "cliente-1",
    nome: "Maria da Silva",
    tipo_pessoa: "fisica",
    veiculos: [{ id: "veiculo-1", cliente_id: "cliente-1", placa: "ABC1D23", modelo: "Ka", km_atual: 82000 }],
  },
] as unknown as Cliente[];

// A OS do caso da loja: já faturada, com uma peça avulsa (digitada, sem cadastro).
const faturada = {
  id: "os-1",
  numero: 12,
  numero_orcamento: 7,
  loja_id: "loja-1",
  cliente_id: "cliente-1",
  veiculo_id: "veiculo-1",
  status: "faturada",
  km_entrada: 82000,
  descricao_problema: null,
  data_abertura: "2026-11-18T12:00:00.000Z",
  vendedor_id: null,
  cliente: { nome: "Maria da Silva" },
  itens: [
    {
      id: "item-1", ordem_servico_id: "os-1", tipo: "peca", peca_id: null, servico_id: null,
      tecnico_id: null, descricao: "Palheta", quantidade: 1, preco_unitario: 80, desconto: 0,
      custo_unitario: null,
    },
  ],
} as unknown as OrdemServico;

async function abrirCadastroDaPeca() {
  const onSalvarEdicao = vi.fn().mockResolvedValue(undefined);
  const resultado = renderizar(
    <OrdemServicoForm
      ordemExistente={faturada}
      abaInicial="fechamento"
      clientes={clientes}
      pecas={[]}
      servicos={[]}
      funcionarios={funcionarios}
      funcionarioAtualId="func-1"
      ordens={[]}
      saldoPorPeca={new Map()}
      saldoCarregado
      onSalvarNova={vi.fn()}
      onSalvarEdicao={onSalvarEdicao}
      onEditarItem={vi.fn().mockResolvedValue(undefined)}
      onEncerrar={vi.fn()}
      onCadastrarCliente={vi.fn()}
      onCadastrarVeiculo={vi.fn()}
      onCancelar={vi.fn()}
    />,
  );
  const { user } = resultado;

  await user.click(await screen.findByRole("button", { name: "Emitir NFC-e" }));
  await user.click(await screen.findByRole("button", { name: "Cadastrar agora" }));

  const campo = (rotulo: string) => screen.getByLabelText(rotulo, { exact: true }) as HTMLInputElement;
  await waitFor(() => expect(campo("Descrição *")).toHaveValue("Palheta"));
  await user.type(campo("NCM *"), "40169300");
  await user.type(campo("C.E.S.T *"), "0100100");
  await user.type(campo("CFOP padrão *"), "5102");
  await user.selectOptions(screen.getByLabelText("Origem *"), "0");
  await user.type(campo("CST / CSOSN *"), "500");

  return { ...resultado, onSalvarEdicao };
}

describe("OS faturada, aba Fechamento: Cadastrar agora → Salvar peça (#1130)", () => {
  it("o 'Salvar peça' salva a peça, liga ao item, e não envia a OS junto", async () => {
    cadastrarPecaRapida.mockResolvedValue("peca-nova");
    cadastrarPecaDoItem.mockResolvedValue(true);
    const { user, onSalvarEdicao } = await abrirCadastroDaPeca();

    await user.click(screen.getByRole("button", { name: "Salvar peça" }));

    await waitFor(() => expect(cadastrarPecaRapida).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(cadastrarPecaDoItem).toHaveBeenCalledWith("item-1", "peca-nova", "op"));
    expect(onSalvarEdicao).not.toHaveBeenCalled();
    // A janela do cadastro fechou e a nota ficou liberada.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Salvar peça" })).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar emissão" })).toBeEnabled());
  });

  it("se o banco recusa, o erro aparece junto do botão, nada fica mudo", async () => {
    cadastrarPecaRapida.mockRejectedValue(new Error("O banco recusou a peça"));
    const { user, onSalvarEdicao } = await abrirCadastroDaPeca();

    await user.click(screen.getByRole("button", { name: "Salvar peça" }));

    const rodape = screen.getByTestId("rodape-peca");
    expect(await within(rodape).findByRole("alert")).toHaveTextContent(/recusou a peça/);
    expect(onSalvarEdicao).not.toHaveBeenCalled();
  });
});
