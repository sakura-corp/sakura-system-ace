// @vitest-environment jsdom
/**
 * Os itens da OS pela busca única e pela tabela (#1087): o leitor, o "técnico
 * pra todos", o Tab da linha, o total grande e o lucro previsto do rodapé.
 * Valem pra OS e pro orçamento (é o mesmo formulário).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor, within } from "@/testes/tela";
import { OrdemServicoForm } from "./OrdemServicoForm";
import type { Cliente } from "@/types/cliente";
import type { Funcionario } from "@/types/funcionario";
import type { ItemOS, OrdemServico } from "@/types/os";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";

vi.mock("./FechamentoTab", () => ({ FechamentoTab: () => <div>aba fechamento</div> }));
const { operadorDoTeste, buscarCustoDasOrdens, listarPecas } = vi.hoisted(() => ({
  operadorDoTeste: { admin: false, permissoes: [] as string[] },
  buscarCustoDasOrdens: vi.fn(),
  listarPecas: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ operador: operadorDoTeste }) }));
vi.mock("@/lib/caixa", () => ({ buscarCustoDasOrdens }));
vi.mock("@/lib/pecas", () => ({ listarPecas }));

beforeEach(() => {
  localStorage.clear();
  operadorDoTeste.permissoes = [];
  buscarCustoDasOrdens.mockReset().mockResolvedValue(new Map());
  listarPecas.mockReset().mockResolvedValue([]);
});

const pecas = [
  { id: "peca-1", descricao: "PNEU 175/70 R14", codigo_interno: "PN175", codigo_barras: "7891111111111", preco_venda: 400, sem_custo: false },
  { id: "peca-2", descricao: "PASTILHA DE FREIO", codigo_interno: "PF01", codigo_barras: "7892222222222", preco_venda: 180, sem_custo: false },
].map((p) => ({ ...p, ativo: true }) as unknown as PecaJanela);

const servicos = [
  { id: "servico-1", descricao: "Alinhamento", codigo_interno: "AL01", preco_padrao: 60, custo: 20 },
].map((s) => ({ ...s, ativo: true }) as unknown as Servico);

const funcionarios = [
  { id: "func-1", loja_id: "loja-1", nome: "Carlos", cargo: "Mecânico", ativo: true },
  { id: "func-2", loja_id: "loja-1", nome: "Rafael", cargo: "Mecânico", ativo: true },
] as unknown as Funcionario[];

const clientes = [
  { id: "cliente-1", nome: "Maria da Silva", tipo_pessoa: "fisica", veiculos: [] },
] as unknown as Cliente[];

function ordemComPneus(): OrdemServico {
  const itens: ItemOS[] = [
    {
      id: "item-1", ordem_servico_id: "os-1", tipo: "peca", peca_id: "peca-1", servico_id: null,
      tecnico_id: null, descricao: "PNEU 175/70 R14", quantidade: 2, preco_unitario: 400, desconto: 0,
    },
  ];
  return {
    id: "os-1", numero: 12, loja_id: "loja-1", cliente_id: "cliente-1", veiculo_id: null,
    status: "em_andamento", km_entrada: null, descricao_problema: null, forma_pagamento: null,
    parcelas: 1, data_abertura: "2026-09-01T12:00:00.000Z", data_fechamento: null, vendedor_id: null,
    criado_por_id: null, atualizado_por_id: null, cliente: { nome: "Maria da Silva" }, itens,
  } as unknown as OrdemServico;
}

function montar(extra: Partial<Parameters<typeof OrdemServicoForm>[0]> = {}) {
  const onSalvarNova = vi.fn().mockResolvedValue(undefined);
  const resultado = renderizar(
    <OrdemServicoForm
      clientes={clientes}
      pecas={pecas}
      servicos={servicos}
      funcionarios={funcionarios}
      funcionarioAtualId="func-1"
      ordens={[]}
      saldoPorPeca={new Map([["peca-1", 10], ["peca-2", 10]])}
      saldoCarregado
      onSalvarNova={onSalvarNova}
      onSalvarEdicao={vi.fn().mockResolvedValue(undefined)}
      onEditarItem={vi.fn().mockResolvedValue(undefined)}
      onEncerrar={vi.fn().mockResolvedValue(undefined)}
      onCadastrarCliente={vi.fn()}
      onCadastrarVeiculo={vi.fn()}
      onCancelar={vi.fn()}
      {...extra}
    />,
  );
  return { ...resultado, onSalvarNova };
}

const busca = () => screen.getByRole("combobox", { name: "Buscar peça ou serviço" });
const linhas = () => screen.queryAllByRole("row").slice(1); // tira o cabeçalho
const rodape = () => document.querySelector("[data-rodape-da-os]") as HTMLElement;

describe("OrdemServicoForm — a busca única e a tabela de itens", () => {
  it("sem itens, a tabela diz como começar", () => {
    montar();
    expect(screen.getByText("Nenhum item ainda: busque uma peça ou serviço acima.")).toBeInTheDocument();
    expect(linhas()).toHaveLength(0);
  });

  it("digitar 'pneu' mostra peça e serviço juntos, cada um com a sua palavra", async () => {
    const { user } = montar({ servicos: [...servicos, { id: "servico-2", descricao: "Troca de pneu", codigo_interno: null, preco_padrao: 50, custo: 0, ativo: true } as unknown as Servico] });
    await user.type(busca(), "pneu");

    const lista = screen.getByRole("listbox");
    expect(within(lista).getByText("Peça")).toBeInTheDocument();
    expect(within(lista).getByText("Serviço")).toBeInTheDocument();
    expect(within(lista).getByText("PNEU 175/70 R14")).toBeInTheDocument();
    expect(within(lista).getByText("Troca de pneu")).toBeInTheDocument();
  });

  it("o leitor: o código de barras + Enter põe a peça na tabela, e o foco volta pra busca", async () => {
    const { user } = montar();
    await user.type(busca(), "7891111111111{Enter}");

    expect(linhas()).toHaveLength(1);
    expect(screen.getByLabelText(/Quantidade de PNEU/)).toHaveValue(1);
    expect(busca()).toHaveValue("");
    expect(busca()).toHaveFocus();

    // Passar de novo soma na mesma linha.
    await user.type(busca(), "7891111111111{Enter}");
    expect(linhas()).toHaveLength(1);
    expect(screen.getByLabelText(/Quantidade de PNEU/)).toHaveValue(2);
  });

  it("Enter numa busca ambígua não põe nada e pede pra escolher na lista", async () => {
    const { user } = montar({
      servicos: [
        ...servicos,
        { id: "servico-2", descricao: "Troca de pneu", codigo_interno: null, preco_padrao: 50, custo: 0, ativo: true } as unknown as Servico,
      ],
    });
    await user.type(busca(), "pneu{Enter}");

    expect(linhas()).toHaveLength(0);
    expect(screen.getByText(/Mais de um item parecido/)).toBeInTheDocument();
  });

  it("Tab na linha segue quantidade, preço, desconto e técnico", async () => {
    const { user } = montar();
    await user.type(busca(), "7891111111111{Enter}");

    await user.click(screen.getByLabelText(/Quantidade de PNEU/));
    await user.tab();
    expect(screen.getByLabelText(/Preço de PNEU/)).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText(/Desconto de PNEU/)).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("combobox", { name: "Técnico" })).toHaveFocus();
  });

  it("'Tirar da OS' está no ⋯ e desfaz o item sem janela nenhuma", async () => {
    const { user } = montar();
    await user.type(busca(), "7891111111111{Enter}");
    expect(linhas()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /Mais ações/ }));
    await user.click(screen.getByRole("menuitem", { name: "Tirar da OS" }));

    expect(linhas()).toHaveLength(0);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/Nenhum item ainda/)).toBeInTheDocument();
  });

  it("os itens já gravados aparecem na mesma tabela dos novos", async () => {
    const { user } = montar({ ordemExistente: ordemComPneus() });
    await user.type(busca(), "7892222222222{Enter}");

    expect(linhas()).toHaveLength(2);
    expect(within(rodape()).getByText(/Peças\s*R\$\s*980,00/)).toBeInTheDocument(); // 800 gravados + 180 novos
  });

  it("a busca recebe o foco ao abrir uma OS existente", () => {
    montar({ ordemExistente: ordemComPneus() });
    expect(busca()).toHaveFocus();
  });

  it("numa OS nova o foco não vai pra busca (a conversa começa pelo Cliente)", () => {
    montar();
    expect(busca()).not.toHaveFocus();
  });
});

describe("OrdemServicoForm — técnico pra todos", () => {
  it("escolher o técnico aplica nos 3 itens, e o item seguinte já vem com ele", async () => {
    const { user, onSalvarNova } = montar();
    await user.click(screen.getByDisplayValue("Selecione o cliente"));
    await user.click(screen.getByRole("button", { name: "Maria da Silva" }));
    await user.type(busca(), "7891111111111{Enter}");
    await user.type(busca(), "7892222222222{Enter}");
    await user.type(busca(), "alinhamento{Enter}");
    expect(linhas()).toHaveLength(3);
    // (O Vendedor lá em cima também é o Carlos: a conta é só dentro da tabela.)
    const tabela = screen.getByRole("table");
    expect(within(tabela).queryByDisplayValue("Carlos")).not.toBeInTheDocument();

    const paraTodos = screen.getByText("Técnico pra todos").closest("div") as HTMLElement;
    await user.click(within(paraTodos).getByRole("combobox"));
    await user.click(screen.getByRole("button", { name: "Carlos" }));

    expect(within(tabela).getAllByDisplayValue("Carlos")).toHaveLength(3);

    // O próximo item já nasce com ele, e dá pra trocar numa linha só.
    await user.type(busca(), "xyz");
    await user.click(screen.getByRole("option", { name: /Serviço sem cadastro: "xyz"/ }));
    expect(linhas()).toHaveLength(4);
    expect(within(tabela).getAllByDisplayValue("Carlos")).toHaveLength(4);
    await user.click(within(tabela).getAllByDisplayValue("Carlos")[0]);
    await user.click(screen.getByRole("button", { name: "Rafael" }));

    await user.click(screen.getByRole("button", { name: "Abrir ordem de serviço" }));
    const itens = onSalvarNova.mock.calls[0][1] as { tecnico_id: string | null }[];
    expect(itens.map((i) => i.tecnico_id).sort()).toEqual(["func-1", "func-1", "func-1", "func-2"]);
  });
});

describe("OrdemServicoForm — total grande e lucro previsto no rodapé", () => {
  const permitirCusto = () => {
    operadorDoTeste.permissoes = ["estoque"];
    listarPecas.mockResolvedValue([
      { id: "peca-1", preco_custo: 250 },
      { id: "peca-2", preco_custo: 100 },
    ]);
  };

  it("o total é o número grande e o lucro previsto vem de apoio, com a palavra", async () => {
    permitirCusto();
    const { user } = montar();
    await user.type(busca(), "7891111111111{Enter}"); // 400, custo 250
    await user.type(busca(), "alinhamento{Enter}"); // 60, custo 20

    const total = within(rodape()).getByText("Total previsto").parentElement as HTMLElement;
    expect(total).toHaveTextContent(/R\$\s*460,00/);
    expect(within(rodape()).getByText(/Peças\s*R\$\s*400,00/)).toBeInTheDocument();
    expect(within(rodape()).getByText(/Serviços\s*R\$\s*60,00/)).toBeInTheDocument();
    // 460 − (250 + 20) = 190
    await waitFor(() => expect(within(rodape()).getByText(/lucro previsto/)).toHaveTextContent(/▲.*R\$\s*190,00/));
  });

  it("prejuízo aparece com o sinal de menos e a seta pra baixo", async () => {
    operadorDoTeste.permissoes = ["estoque"];
    listarPecas.mockResolvedValue([{ id: "peca-1", preco_custo: 500 }]);
    const { user } = montar();
    await user.type(busca(), "7891111111111{Enter}"); // vende 400, custa 500

    await waitFor(() => expect(within(rodape()).getByText(/lucro previsto/)).toHaveTextContent(/▼.*−.*R\$\s*100,00/));
  });

  it("sem a permissão do Estoque, o lucro de uma peça 'aparece ao salvar'", async () => {
    const { user } = montar();
    await user.type(busca(), "7891111111111{Enter}");

    expect(within(rodape()).getByText(/lucro previsto: aparece ao salvar/)).toBeInTheDocument();
    expect(listarPecas).not.toHaveBeenCalled();
  });

  it("numa OS existente, o custo dos itens gravados vem do banco", async () => {
    buscarCustoDasOrdens.mockResolvedValue(new Map([["os-1", { custo: 500, completo: true }]]));
    montar({ ordemExistente: ordemComPneus() });

    expect(buscarCustoDasOrdens).toHaveBeenCalledWith(["os-1"]);
    // 800 de venda − 500 de custo = 300
    await waitFor(() => expect(within(rodape()).getByText(/lucro previsto/)).toHaveTextContent(/R\$\s*300,00/));
  });

  it("erro ao buscar o custo não derruba a tela: o lucro fica 'custo não informado'", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    buscarCustoDasOrdens.mockRejectedValue(new Error("sem rede"));
    montar({ ordemExistente: ordemComPneus() });

    await waitFor(() => expect(within(rodape()).getByText(/lucro previsto: custo não informado/)).toBeInTheDocument());
    expect(erro).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
  });

  it("só um botão laranja: o Encerrar OS é secundário e o Salvar do rodapé é o principal", () => {
    montar({ ordemExistente: ordemComPneus() });
    expect(screen.getByRole("button", { name: "Encerrar OS" }).className).not.toMatch(/bg-acao/);
    expect(screen.getByRole("button", { name: "Salvar alterações" }).className).toMatch(/bg-acao/);
  });
});
