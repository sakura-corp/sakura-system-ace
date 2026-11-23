// @vitest-environment jsdom
/**
 * Relações numa página só (#1086) e os cuidados que vieram das abas antigas.
 *
 * A conta de cada bloco está em schemas/ e o desenho em
 * components/graficos/. O que só a página prova:
 * - o período lá em cima vale pra TODOS os blocos (trocar muda tudo);
 * - nenhum gráfico de dia, nem a Curva ABC, usa curva suave;
 * - as contas dos Próximos dias só são buscadas pra quem tem o módulo, e um
 *   erro nelas não apaga o resto nem vira "Sem acesso" (#389);
 * - período sem venda: frase + botão que volta pro mês.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hojeLocal } from "@/lib/datas";
import { periodoDoAtalho } from "@/schemas/relacoes";
import { renderizar, screen, within } from "@/testes/tela";
import type { Operador } from "@/types/operador";
import type { ItemOS, OrdemServico } from "@/types/os";

const listarContasPagar = vi.fn();
const listarContasReceber = vi.fn();
const listarMovimentosCaixa = vi.fn();
const listarOrdens = vi.fn();

vi.mock("@/lib/contasPagar", async (original) => ({
  ...(await original<typeof import("@/lib/contasPagar")>()),
  listarContasPagar: (...a: unknown[]) => listarContasPagar(...a),
}));
vi.mock("@/lib/contasReceber", () => ({
  listarContasReceber: (...a: unknown[]) => listarContasReceber(...a),
}));
vi.mock("@/lib/caixa", () => ({
  listarMovimentosCaixa: (...a: unknown[]) => listarMovimentosCaixa(...a),
  buscarCustoDasOrdens: async () => [],
}));
vi.mock("@/lib/ordensServico", () => ({ listarOrdens: (...a: unknown[]) => listarOrdens(...a) }));
vi.mock("@/lib/pecas", () => ({ listarPecas: async () => [] }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const LOJA = { id: "loja-a", nome: "Loja Centro", cidade: null, uf: null, ativo: true, criado_em: "" };
let operador: Partial<Operador> = { id: "op", admin: true, permissoes: [] };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: LOJA, lojasDisponiveis: [LOJA] }),
}));

const { RelatoriosPage } = await import("./RelatoriosPage");

function item(descricao: string, preco: number, custo: number): ItemOS {
  return {
    id: crypto.randomUUID(),
    ordem_servico_id: "os",
    tipo: "peca",
    peca_id: null,
    servico_id: null,
    tecnico_id: null,
    descricao,
    quantidade: 1,
    preco_unitario: preco,
    desconto: 0,
    custo_unitario: custo,
  };
}

function ordem(dia: string, cliente: string, itens: ItemOS[]): OrdemServico {
  return {
    id: crypto.randomUUID(),
    numero: 1,
    loja_id: "loja-a",
    cliente_id: cliente,
    cliente: { nome: cliente },
    veiculo_id: null,
    status: "faturada",
    km_entrada: null,
    descricao_problema: null,
    forma_pagamento: null,
    parcelas: 1,
    data_abertura: `${dia}T12:00:00`,
    data_fechamento: null,
    vendedor_id: null,
    criado_por_id: null,
    atualizado_por_id: null,
    itens,
  } as unknown as OrdemServico;
}

// Dois meses: este (Pneu, 1.000 vendidos, 400 de sobra) e o passado (Palheta, 200 e 150).
const MES_PASSADO = periodoDoAtalho("mes_passado", hojeLocal()).de.slice(0, 8) + "10";
const DOIS_MESES = [
  ordem(hojeLocal(), "João", [item("Pneu", 1000, 600)]),
  ordem(MES_PASSADO, "Maria", [item("Palheta", 200, 50)]),
];

beforeEach(() => {
  operador = { id: "op", admin: true, permissoes: [] };
  listarContasPagar.mockReset().mockResolvedValue([]);
  listarContasReceber.mockReset().mockResolvedValue([]);
  listarMovimentosCaixa.mockReset().mockResolvedValue([]);
  listarOrdens.mockReset().mockResolvedValue([]);
});

function cartao(nome: string): HTMLElement {
  return screen.getByText(nome, { selector: "p" }).closest("[data-cartao-numero]") as HTMLElement;
}

function chip(nome: string): HTMLElement {
  return within(screen.getByRole("group", { name: "Período" })).getByRole("button", { name: nome });
}

function bloco(id: string): HTMLElement {
  return document.getElementById(id) as HTMLElement;
}

describe("RelatoriosPage — o período único (#1086)", () => {
  it("começa em Este mês; trocar o período lá em cima muda o resumo e todos os blocos", async () => {
    listarOrdens.mockResolvedValue(DOIS_MESES);
    const { user } = renderizar(<RelatoriosPage />);
    await screen.findByRole("heading", { name: "Sobra das OS" });

    expect(chip("Este mês")).toHaveAttribute("aria-pressed", "true");
    expect(cartao("Vendido")).toHaveTextContent(/1\.000,00/);
    expect(screen.getByRole("heading", { name: "De R$ 1 mil vendidos, sobraram R$ 400" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Pneu é quem mais deu dinheiro: R\$ 400/ })).toBeInTheDocument();
    const tituloDoMes = within(bloco("o-mes-ate-hoje")).getByRole("heading").textContent;
    const tituloDoDia = within(bloco("dia-a-dia")).getByRole("heading").textContent;
    await user.click(within(bloco("curva-abc")).getByRole("button", { name: "Ver como tabela" }));
    expect(within(bloco("curva-abc")).getByRole("row", { name: /Pneu/ })).toBeInTheDocument();

    await user.click(chip("Mês passado"));

    expect(chip("Mês passado")).toHaveAttribute("aria-pressed", "true");
    expect(cartao("Vendido")).toHaveTextContent(/200,00/);
    expect(cartao("Vendido")).not.toHaveTextContent(/1\.000,00/);
    expect(screen.getByRole("heading", { name: "De R$ 200 vendidos, sobraram R$ 150" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Palheta é quem mais deu dinheiro: R\$ 150/ })).toBeInTheDocument();
    expect(within(bloco("o-mes-ate-hoje")).getByRole("heading").textContent).not.toBe(tituloDoMes);
    expect(within(bloco("dia-a-dia")).getByRole("heading").textContent).not.toBe(tituloDoDia);
    const abc = within(bloco("curva-abc"));
    expect(abc.getByRole("row", { name: /Palheta/ })).toBeInTheDocument();
    expect(abc.queryByRole("row", { name: /Pneu/ })).toBeNull();
  });

  it("a comparação com o mês anterior só aparece quando o período é um mês", async () => {
    listarOrdens.mockResolvedValue(DOIS_MESES);
    const { user } = renderizar(<RelatoriosPage />);
    await screen.findByRole("heading", { name: "Sobra das OS" });
    expect(cartao("Vendido")).toHaveTextContent(/contra/);

    await user.click(chip("Hoje"));
    expect(cartao("Vendido")).not.toHaveTextContent(/contra/);
  });

  it("Falta receber não compara com o mês anterior (o de lá já foi quase todo recebido)", async () => {
    listarOrdens.mockResolvedValue(DOIS_MESES);
    renderizar(<RelatoriosPage />);
    await screen.findByRole("heading", { name: "Sobra das OS" });
    expect(cartao("Vendido")).toHaveTextContent(/contra/);
    expect(cartao("Falta receber")).not.toHaveTextContent(/contra/);
  });

  it("De depois de Até: avisa ao lado das datas", async () => {
    listarOrdens.mockResolvedValue(DOIS_MESES);
    const { user } = renderizar(<RelatoriosPage />);
    await screen.findByRole("heading", { name: "Sobra das OS" });
    const de = screen.getByLabelText("De");
    await user.clear(de);
    await user.type(de, "2099-12-31");
    expect(screen.getByRole("alert")).toHaveTextContent("A data De precisa ser antes da Até");
  });

  it("período sem venda: a frase e o botão que volta pro mês", async () => {
    listarOrdens.mockResolvedValue([]);
    const { user } = renderizar(<RelatoriosPage />);
    expect(await screen.findByRole("heading", { name: "Nenhuma venda neste período" })).toBeInTheDocument();

    await user.click(chip("Hoje"));
    await user.click(screen.getByRole("button", { name: "Ver este mês" }));
    expect(chip("Este mês")).toHaveAttribute("aria-pressed", "true");
  });

  it("os botões Ir para estão no topo, e o Resumo pro dono mora aqui", async () => {
    listarOrdens.mockResolvedValue(DOIS_MESES);
    renderizar(<RelatoriosPage />);
    await screen.findByRole("heading", { name: "Sobra das OS" });
    const ir = within(screen.getByRole("navigation", { name: "Ir para" }));
    for (const nome of ["Resumo", "Por item", "Curva ABC", "Próximos 30 dias"]) {
      expect(ir.getByRole("button", { name: nome })).toBeInTheDocument();
    }
    expect(screen.getByText("Resumo pro dono:")).toBeInTheDocument();
  });
});

describe("RelatoriosPage — nada de curva suave", () => {
  it("os gráficos de dia e a Curva ABC só têm retas no desenho", async () => {
    listarOrdens.mockResolvedValue(DOIS_MESES);
    renderizar(<RelatoriosPage />);
    await screen.findByRole("heading", { name: "Sobra das OS" });
    for (const id of ["o-mes-ate-hoje", "dia-a-dia", "curva-abc", "proximos-30-dias"]) {
      const caminhos = Array.from(bloco(id).querySelectorAll("path")).map((p) => p.getAttribute("d") ?? "");
      for (const d of caminhos) expect(d, `${id}: ${d}`).not.toMatch(/[CcQqSsTtAa]/);
    }
  });
});

describe("RelatoriosPage — Próximos dias (#389)", () => {
  it("só com Relações: não busca as contas e mostra os dois 'Sem acesso'", async () => {
    operador = { id: "op", admin: false, permissoes: ["relatorios"] };
    renderizar(<RelatoriosPage />);

    expect(await screen.findByText("Sem acesso a Contas a Pagar")).toBeInTheDocument();
    expect(screen.getByText("Sem acesso a Contas a Receber")).toBeInTheDocument();
    expect(listarContasPagar).not.toHaveBeenCalled();
    expect(listarContasReceber).not.toHaveBeenCalled();
  });

  it("com Relações e Contas a Pagar: busca só as contas a pagar", async () => {
    operador = { id: "op", admin: false, permissoes: ["relatorios", "contas_pagar"] };
    renderizar(<RelatoriosPage />);

    expect(await screen.findByText("Sem acesso a Contas a Receber")).toBeInTheDocument();
    expect(screen.queryByText("Sem acesso a Contas a Pagar")).not.toBeInTheDocument();
    expect(listarContasPagar).toHaveBeenCalledWith("loja-a");
    expect(listarContasReceber).not.toHaveBeenCalled();
  });

  it("erro ao buscar as contas: diz que não carregou, sem 'Sem acesso', e o resto da página segue", async () => {
    listarContasPagar.mockRejectedValue(new Error("caiu a internet"));
    listarOrdens.mockResolvedValue(DOIS_MESES);
    renderizar(<RelatoriosPage />);

    expect(await screen.findByText(/Não deu pra carregar as contas: caiu a internet/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sobra das OS" })).toBeInTheDocument();
    expect(screen.queryByText(/Sem acesso/)).not.toBeInTheDocument();
  });

  it("erro ao carregar a página: diz o que fazer e deixa tentar de novo", async () => {
    listarOrdens.mockRejectedValueOnce(new Error("sem rede")).mockResolvedValue(DOIS_MESES);
    const { user } = renderizar(<RelatoriosPage />);
    expect(await screen.findByText(/Não deu pra carregar as relações: sem rede/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("heading", { name: "Sobra das OS" })).toBeInTheDocument();
  });
});
