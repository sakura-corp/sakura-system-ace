// @vitest-environment jsdom
/**
 * A trava de `<form>` dentro de `<form>` nas telas principais (#1130, passo 3).
 *
 * Abre, uma por uma, cada janela com formulário que a OS e a venda de balcão
 * desenham, e confere que nenhuma ficou dentro do formulário da tela. A trava
 * em si (`@/testes/semFormDentroDeForm`) vem ligada pelo `@/testes/tela` e
 * reprova qualquer teste de tela; aqui ela é chamada também por extenso, pra
 * o motivo do teste ficar à vista.
 *
 * As janelas das outras telas principais já são abertas, com a trava
 * ligada, nos testes delas: a peça avulsa do orçamento
 * (`OrdemServicoForm.orcamento.test`, `.avulsas.test`, `OrcamentosPage.test`),
 * o cadastro de peça da aba Fechamento (`OrdemServicoForm.fechamentoCadastrar.test`),
 * o pagamento da venda de balcão (`VendaBalcaoForm.test`), a importação de
 * notas do estoque (`ImportarNotasFiscaisModal.test`), o recebimento e o XML
 * dos fornecedores (`ReceberPedidoModal.test`, `ImportarNotaFiscalXmlModal.test`)
 * e a importação de clientes (`ClientesPage.test`).
 *
 * Fora daqui (a trava não vê): "+ Novo fornecedor", "+ Novo pedido" e o
 * movimento do estoque não são abertos por teste nenhum. Hoje eles não abrem
 * janela com formulário por dentro (varredura de 20/11/2026); se um dia
 * abrirem, essa janela ganha um teste aqui.
 */
import { describe, expect, it, vi } from "vitest";
import { acharFormDentroDeForm } from "@/testes/semFormDentroDeForm";
import { renderizar, screen } from "@/testes/tela";
import type { Cliente } from "@/types/cliente";
import type { Funcionario } from "@/types/funcionario";
import type { OrdemServico } from "@/types/os";

// Se o cliente já foi avisado (o passo "garantia e avisar", #1088): aqui, nunca.
vi.mock("@/lib/avisoDaOrdem", () => ({ quandoAvisouCarroPronto: async () => null }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op", admin: false, permissoes: [] }, lojaAtual: { id: "loja-1" } }),
}));
// O rodapé busca o custo dos itens (lucro previsto, #1087); aqui o banco responde "sem custo".
vi.mock("@/lib/caixa", async (importar) => ({
  ...(await importar<typeof import("@/lib/caixa")>()),
  buscarCustoDasOrdens: async () => new Map(),
}));
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoPix: async () => null,
  buscarTextoGarantia: async () => "",
}));

const { OrdemServicoForm } = await import("./OrdemServicoForm");
const { VendaBalcaoForm } = await import("./VendaBalcaoForm");

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

function ordem(status: string): OrdemServico {
  return {
    id: "os-1",
    numero: 12,
    loja_id: "loja-1",
    cliente_id: "cliente-1",
    veiculo_id: "veiculo-1",
    status,
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
}

function montarOS(ordemExistente: OrdemServico) {
  return renderizar(
    <OrdemServicoForm
      ordemExistente={ordemExistente}
      clientes={clientes}
      pecas={[]}
      servicos={[]}
      funcionarios={funcionarios}
      funcionarioAtualId="func-1"
      ordens={[]}
      saldoPorPeca={new Map()}
      saldoCarregado
      gerente
      onSalvarNova={vi.fn()}
      onSalvarEdicao={vi.fn().mockResolvedValue(undefined)}
      onEditarItem={vi.fn().mockResolvedValue(undefined)}
      onTrocarItensFaturada={vi.fn().mockResolvedValue(undefined)}
      onEncerrar={vi.fn()}
      onCadastrarCliente={vi.fn()}
      onCadastrarVeiculo={vi.fn()}
      onCancelar={vi.fn()}
    />,
  );
}

/** A janela aberta tem formulário, e ele não está dentro de outro. */
function confereJanela() {
  const janela = screen.getByRole("dialog");
  expect(janela.querySelector("form")).not.toBeNull();
  expect(janela.closest("form")).toBeNull();
  expect(acharFormDentroDeForm()).toEqual([]);
}

/** Abre a lista de um campo de escolha (Combobox) e aciona a ação de baixo dela. */
async function acionarDaLista(
  user: ReturnType<typeof renderizar>["user"],
  campo: HTMLElement,
  acao: string,
) {
  await user.click(campo);
  await user.pointer({ keys: "[MouseLeft>]", target: screen.getByRole("button", { name: acao }) });
}

describe("nenhuma janela com formulário dentro do formulário da tela (#1130)", () => {
  it("OS: '+ Cadastrar cliente novo'", async () => {
    const { user } = montarOS(ordem("aberta"));
    await acionarDaLista(user, screen.getByRole("combobox", { name: /Cliente/ }), "+ Cadastrar cliente novo");
    confereJanela();
  });

  it("OS: '+ Cadastrar veículo novo'", async () => {
    const { user } = montarOS(ordem("aberta"));
    await acionarDaLista(user, screen.getByRole("combobox", { name: /Veículo/ }), "+ Cadastrar veículo novo");
    confereJanela();
  });

  it("OS faturada: 'Trocar peça ou serviço'", async () => {
    const { user } = montarOS(ordem("faturada"));
    await user.click(screen.getByRole("button", { name: "Trocar peça ou serviço" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // A janela da troca pode não ter <form> próprio; o que importa é não
    // estar dentro do da OS.
    expect(screen.getByRole("dialog").closest("form")).toBeNull();
    expect(acharFormDentroDeForm()).toEqual([]);
  });

  it("Venda de balcão: '+ Cadastrar cliente (CPF na nota)'", async () => {
    const { user } = renderizar(
      <VendaBalcaoForm
        clientes={clientes}
        pecas={[]}
        funcionarios={funcionarios}
        funcionarioAtualId="func-1"
        saldoPorPeca={new Map()}
        saldoCarregado
        jurosParcelas={[]}
        onRegistrar={vi.fn().mockResolvedValue(undefined)}
        onCadastrarCliente={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );
    await acionarDaLista(
      user,
      screen.getByRole("combobox", { name: /Cliente/ }),
      "+ Cadastrar cliente (CPF na nota)",
    );
    confereJanela();
  });
});
