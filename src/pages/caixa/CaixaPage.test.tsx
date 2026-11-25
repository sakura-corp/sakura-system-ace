// @vitest-environment jsdom
/**
 * A página única do Caixa (#1089): sem abas, o dia escolhido na lista, o
 * lançamento numa janela, o fechamento e o cartão a receber em janelas.
 */
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import type { MovimentoCaixa } from "@/types/caixa";
import type { FechamentoCaixa } from "@/types/fechamentoCaixa";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    operador: { id: "op", admin: true, permissoes: [] },
    lojaAtual: { id: "l", nome: "Loja" },
  }),
}));

const dados = vi.hoisted(() => ({
  movimentos: [] as unknown[],
  fechamentos: [] as unknown[],
  criarMovimentoCaixa: vi.fn(),
}));
vi.mock("@/lib/caixa", () => ({
  listarMovimentosCaixa: async () => dados.movimentos,
  buscarCustoDasOrdens: async () => new Map(),
  criarMovimentoCaixa: dados.criarMovimentoCaixa,
}));
vi.mock("@/lib/categoriasCaixa", () => ({
  listarCategoriasCaixa: async () => [
    { id: "cat-e", nome: "Venda avulsa", tipo: "entrada", grupo: "a_classificar", criado_em: "" },
    { id: "cat-s", nome: "Material de limpeza", tipo: "saida", grupo: "a_classificar", criado_em: "" },
  ],
}));
vi.mock("@/lib/fechamentoCaixa", () => ({ listarFechamentosCaixa: async () => dados.fechamentos }));
vi.mock("./FechamentoSection", () => ({ FechamentoSection: () => <p>parte: fechamento</p> }));
vi.mock("./CartaoAReceberSection", () => ({
  CartaoAReceberSection: ({ lojaId }: { lojaId: string }) => <p>parte: cartão a receber {lojaId}</p>,
}));

const { CaixaPage } = await import("./CaixaPage");

const DIA = 24 * 60 * 60 * 1000;
const hoje = new Date().toISOString();
const antes = new Date(Date.now() - 3 * DIA).toISOString();
const diaDeAntes = new Date(Date.now() - 3 * DIA).toLocaleDateString("sv-SE");

function mov(id: string, tipo: "entrada" | "saida", valor: number, descricao: string, data = hoje): MovimentoCaixa {
  return {
    id, loja_id: "l", data, ordem_servico_id: null, tipo, forma_pagamento: "pix",
    valor, descricao, categoria_id: null,
  };
}

function fechamentoDeHoje(): FechamentoCaixa {
  return {
    id: "f1", loja_id: "l", data: new Date().toLocaleDateString("sv-SE"), fundo_troco: 0,
    saldo_sistema: 0, valor_contado: 0, diferenca: 0, totais_por_forma: {}, observacao: null,
    caixa_movimento_id: null, operador_id: null, criado_em: new Date().toISOString(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dados.movimentos = [];
  dados.fechamentos = [];
  dados.criarMovimentoCaixa.mockResolvedValue(undefined);
});

describe("Caixa: uma página só", () => {
  it("não tem abas", async () => {
    renderizar(<CaixaPage />);
    expect(await screen.findByText("Saldo do dia")).toBeInTheDocument();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("a lista mostra só o dia escolhido, nunca todo o período", async () => {
    dados.movimentos = [
      mov("1", "entrada", 100, "Sucata de hoje"),
      mov("2", "saida", 30, "Lanche de hoje"),
      mov("3", "entrada", 999, "Sucata antiga", antes),
    ];
    const { user } = renderizar(<CaixaPage />);
    const tabela = await screen.findByRole("table");
    expect(within(tabela).getByText("Sucata de hoje")).toBeInTheDocument();
    expect(within(tabela).getByText("Lanche de hoje")).toBeInTheDocument();
    expect(within(tabela).queryByText("Sucata antiga")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Saídas" }));
    expect(within(screen.getByRole("table")).getByText("Lanche de hoje")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).queryByText("Sucata de hoje")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tudo" }));
    fireEvent.change(screen.getByLabelText("Dia"), { target: { value: diaDeAntes } });
    expect(within(screen.getByRole("table")).getByText("Sucata antiga")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).queryByText("Sucata de hoje")).not.toBeInTheDocument();
  });

  it("sem lançamento: diz 'Nenhum lançamento hoje' e o botão abre a janela", async () => {
    const { user } = renderizar(<CaixaPage />);
    expect(await screen.findByText("Nenhum lançamento hoje")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lançar agora" }));
    expect(screen.getByRole("dialog", { name: "Novo lançamento" })).toBeInTheDocument();
  });

  it("lançar com 'Dinheiro' escolhido grava a chave dinheiro e fecha a janela", async () => {
    const { user } = renderizar(<CaixaPage />);
    await user.click(await screen.findByRole("button", { name: "Novo lançamento" }));
    const janela = screen.getByRole("dialog", { name: "Novo lançamento" });
    expect(within(janela).getByRole("button", { name: "Dinheiro" })).toHaveAttribute("aria-pressed", "true");

    await user.type(within(janela).getByLabelText("Valor"), "25");
    await user.click(within(janela).getByRole("button", { name: "Pix" }));
    await user.click(within(janela).getByRole("button", { name: "Dinheiro" }));
    await user.click(within(janela).getByRole("combobox", { name: /Categoria/ }));
    await user.click(within(janela).getByRole("button", { name: "Venda avulsa" }));
    await user.click(within(janela).getByRole("button", { name: "Registrar lançamento" }));

    await vi.waitFor(() => expect(dados.criarMovimentoCaixa).toHaveBeenCalledTimes(1));
    expect(dados.criarMovimentoCaixa.mock.calls[0][0]).toMatchObject({
      tipo: "entrada", valor: 25, forma_pagamento: "dinheiro", categoria_id: "cat-e",
    });
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("com o caixa de hoje fechado, lançar pede a janela do programa, não o confirm()", async () => {
    dados.fechamentos = [fechamentoDeHoje()];
    const confirmar = vi.spyOn(window, "confirm");
    const { user } = renderizar(<CaixaPage />);
    await user.click(await screen.findByRole("button", { name: "Novo lançamento" }));

    const pergunta = screen.getByRole("dialog", { name: /Lançar depois do fechamento/ });
    expect(confirmar).not.toHaveBeenCalled();
    await user.click(within(pergunta).getByRole("button", { name: "Lançar mesmo assim" }));
    expect(screen.getByRole("dialog", { name: "Novo lançamento" })).toBeInTheDocument();
  });

  it("'Fechar o caixa de hoje' abre o fechamento, e 'Cartão a receber' abre a lista", async () => {
    const { user } = renderizar(<CaixaPage />);
    await user.click(await screen.findByRole("button", { name: "Fechar o caixa de hoje" }));
    expect(screen.getByRole("dialog", { name: "Fechamento do caixa" })).toBeInTheDocument();
    expect(screen.getByText("parte: fechamento")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fechar" }));

    await user.click(screen.getByRole("button", { name: "Cartão a receber" }));
    expect(await screen.findByText("parte: cartão a receber l")).toBeInTheDocument();
  });

  it("caixa de hoje já fechado: mostra 'Fechado às' e 'Ver o fechamento', sem o laranja", async () => {
    dados.fechamentos = [fechamentoDeHoje()];
    renderizar(<CaixaPage />);
    expect(await screen.findByText(/Fechado às \d\d:\d\d/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver o fechamento" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fechar o caixa de hoje" })).not.toBeInTheDocument();
  });
});

// Os achados da revisão final (#1089), cada um visto reprovar antes do conserto.
describe("Caixa: o que a revisão pegou", () => {
  async function preencherEGuardar(user: ReturnType<typeof renderizar>["user"], cliques = 1) {
    const janela = screen.getByRole("dialog", { name: "Novo lançamento" });
    await user.type(within(janela).getByLabelText("Valor"), "25");
    await user.click(within(janela).getByRole("combobox", { name: /Categoria/ }));
    await user.click(within(janela).getByRole("button", { name: "Venda avulsa" }));
    const registrar = within(janela).getByRole("button", { name: "Registrar lançamento" });
    for (let i = 0; i < cliques; i++) fireEvent.click(registrar);
  }

  it("a descrição do lançamento com categoria aparece embaixo, e o sem categoria ganha o selo", async () => {
    dados.movimentos = [
      { ...mov("1", "saida", 800, "Pagamento: Aluguel de novembro"), categoria_id: "c", categoria: { nome: "Aluguel" } },
      mov("2", "entrada", 10, "Sucata"),
    ];
    renderizar(<CaixaPage />);
    const tabela = await screen.findByRole("table");
    expect(within(tabela).getByText("Aluguel")).toBeInTheDocument();
    expect(within(tabela).getByText("Pagamento: Aluguel de novembro")).toBeInTheDocument();
    expect(within(tabela).getByText("Sem categoria")).toBeInTheDocument();
  });

  it("olhando outro dia, não oferece 'Ver o fechamento' (a janela abriria o dia de hoje)", async () => {
    renderizar(<CaixaPage />);
    await screen.findByRole("button", { name: "Fechar o caixa de hoje" });
    fireEvent.change(screen.getByLabelText("Dia"), { target: { value: diaDeAntes } });
    expect(screen.queryByRole("button", { name: "Ver o fechamento" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fechar o caixa de hoje" })).not.toBeInTheDocument();
  });

  it("lançar olhando outro dia volta pra hoje, onde o lançamento entrou", async () => {
    const { user } = renderizar(<CaixaPage />);
    await screen.findByText("Nenhum lançamento hoje");
    fireEvent.change(screen.getByLabelText("Dia"), { target: { value: diaDeAntes } });
    expect(screen.getByText("Nenhum lançamento neste dia")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Novo lançamento" }));
    await preencherEGuardar(user);
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Dia")).toHaveValue(new Date().toLocaleDateString("sv-SE"));
  });

  it("clique duplo em 'Registrar lançamento' grava uma vez só", async () => {
    let terminar!: () => void;
    dados.criarMovimentoCaixa.mockImplementation(() => new Promise<void>((r) => (terminar = r)));
    const { user } = renderizar(<CaixaPage />);
    await user.click(await screen.findByRole("button", { name: "Novo lançamento" }));
    await preencherEGuardar(user, 2);
    await vi.waitFor(() => expect(dados.criarMovimentoCaixa).toHaveBeenCalled());
    terminar();
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(dados.criarMovimentoCaixa).toHaveBeenCalledTimes(1);
  });

  it("enquanto grava, Cancelar não fecha a janela (o erro do banco precisa aparecer nela)", async () => {
    let falhar!: (e: Error) => void;
    dados.criarMovimentoCaixa.mockImplementation(() => new Promise<void>((_, rej) => (falhar = rej)));
    const { user } = renderizar(<CaixaPage />);
    await user.click(await screen.findByRole("button", { name: "Novo lançamento" }));
    await preencherEGuardar(user);
    await vi.waitFor(() => expect(dados.criarMovimentoCaixa).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    falhar(new Error("sem conexão com o banco"));
    expect(await screen.findByText(/sem conexão com o banco/)).toBeInTheDocument();
  });

  it("'Cancelar' na pergunta de lançar depois do fechamento não abre a janela", async () => {
    dados.fechamentos = [fechamentoDeHoje()];
    const { user } = renderizar(<CaixaPage />);
    await user.click(await screen.findByRole("button", { name: "Novo lançamento" }));
    const pergunta = screen.getByRole("dialog", { name: /Lançar depois do fechamento/ });
    await user.click(within(pergunta).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
