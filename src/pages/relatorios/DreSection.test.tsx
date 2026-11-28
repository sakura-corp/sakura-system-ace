// @vitest-environment jsdom
/**
 * O DRE na tela (#388). A conta é de `montarDre` (testada em schemas/dre.test.ts):
 * aqui `montarDre` é de mentira, e o que se prova é o que a tela faz com o que
 * ela devolve (faixa, tabela, abrir e fechar, avisos, pé, imprimir) e a guarda
 * de troca de loja (#927): dado de outra loja nunca aparece.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dreDeExemplo, linha } from "@/testes/dreDeExemplo";
import { renderizar, screen, waitFor, within } from "@/testes/tela";
import type { Dre } from "@/schemas/dre";
import type { Operador } from "@/types/operador";

const carregarDadosDoDre = vi.fn();
const montarDre = vi.fn();
const buscarConfiguracaoFiscal = vi.fn();
const navegar = vi.fn();

vi.mock("@/lib/relatorios", () => ({ carregarDadosDoDre: (...a: unknown[]) => carregarDadosDoDre(...a) }));
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoFiscal: (...a: unknown[]) => buscarConfiguracaoFiscal(...a),
}));
vi.mock("@/schemas/dre", async (original) => ({
  ...(await original<typeof import("@/schemas/dre")>()),
  montarDre: (...a: unknown[]) => montarDre(...a),
}));
vi.mock("react-router-dom", async (original) => ({
  ...(await original<typeof import("react-router-dom")>()),
  useNavigate: () => navegar,
}));

const LOJA_A = { id: "loja-a", nome: "Loja Centro" };
const LOJA_B = { id: "loja-b", nome: "Loja Norte" };
let loja = LOJA_A;
let operador: Partial<Operador> = { id: "op", admin: true, permissoes: [] };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: loja }),
}));

const { DreSection } = await import("./DreSection");

const PROPS = { ordens: [], movimentos: [], pecas: [], servicos: [] };

function dados(nome: string) {
  return { categorias: [{ id: nome, nome, grupo: "despesas_operacionais" as const }], taxas: [] };
}

beforeEach(() => {
  loja = LOJA_A;
  operador = { id: "op", admin: true, permissoes: [] };
  navegar.mockReset();
  carregarDadosDoDre.mockReset().mockResolvedValue(dados("A"));
  buscarConfiguracaoFiscal.mockReset().mockResolvedValue(null);
  montarDre.mockReset().mockImplementation(() => dreDeExemplo());
});

async function pronto() {
  return screen.findByRole("table");
}

describe("DreSection", () => {
  it("lê os dados da loja atual e mostra o título, os meses e o total", async () => {
    renderizar(<DreSection {...PROPS} />);
    const tabela = await pronto();
    expect(carregarDadosDoDre).toHaveBeenCalledWith("loja-a");
    expect(screen.getByRole("heading", { name: "DRE" })).toBeInTheDocument();
    expect(screen.getByText("O resumo do dinheiro da loja, mês a mês")).toBeInTheDocument();
    const cabecalho = within(tabela).getAllByRole("columnheader").map((c) => c.textContent);
    expect(cabecalho).toEqual(["Linha", "out/26", "nov/26", "Total"]);
    expect(within(tabela).getByRole("row", { name: /Receita bruta/ })).toBeInTheDocument();
  });

  it("a primeira coluna fica fixa e os meses rolam de lado", async () => {
    renderizar(<DreSection {...PROPS} />);
    const tabela = await pronto();
    expect(tabela.closest(".overflow-x-auto")).not.toBeNull();
    const rotulo = within(tabela).getByRole("rowheader", { name: /Receita bruta/ });
    expect(rotulo.className).toMatch(/sticky left-0/);
    expect(rotulo.className).toMatch(/bg-cartao/);
  });

  it("sinais no rótulo, linha de resultado em negrito, % da receita embaixo e — sem receita", async () => {
    montarDre.mockImplementation(() =>
      dreDeExemplo({
        linhas: [
          linha("receita_bruta", "Receita bruta", "+", 1000),
          linha("resultado_mes", "Resultado do mês", "=", 300, [], { sobreReceita: null }),
        ],
      }),
    );
    renderizar(<DreSection {...PROPS} />);
    await pronto();
    expect(screen.getByRole("rowheader", { name: "(+) Receita bruta" })).toBeInTheDocument();
    const resultado = screen.getByRole("rowheader", { name: "(=) Resultado do mês" });
    expect(resultado.className).toMatch(/font-bold/);
    const linhaReceita = screen.getByRole("row", { name: /Receita bruta/ });
    expect(linhaReceita).toHaveTextContent(/R\$\s1\.000,00/);
    expect(linhaReceita).toHaveTextContent("10,0% da receita");
    expect(screen.getByRole("row", { name: /Resultado do mês/ })).not.toHaveTextContent("da receita");
  });

  it("abre e fecha o detalhe; o % do resultado bruto só aparece dentro do grupo de despesa", async () => {
    const { user } = renderizar(<DreSection {...PROPS} />);
    await pronto();
    const grupo = screen.getByRole("button", { name: /Despesas operacionais/ });
    expect(grupo).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/Pessoal/)).toBeNull();
    expect(screen.queryByText(/do resultado bruto/)).toBeNull();

    await user.click(grupo);
    expect(grupo).toHaveAttribute("aria-expanded", "true");
    const pessoal = screen.getByRole("row", { name: /Pessoal/ });
    expect(pessoal).toHaveTextContent("20,0% do resultado bruto");
    // A neta só aparece abrindo a filha.
    expect(screen.queryByText(/Salário <fixo>/)).toBeNull();
    await user.click(within(pessoal).getByRole("button"));
    expect(screen.getByText(/Salário <fixo>/)).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Salário/ })).toHaveTextContent("do resultado bruto");

    await user.click(grupo);
    expect(screen.queryByText(/Pessoal/)).toBeNull();
  });

  it("taxa da maquininha: 'não informadas' no lugar do valor, e '(parte não informada)' quando é parcial", async () => {
    montarDre.mockImplementation(() =>
      dreDeExemplo({
        linhas: [
          linha("taxa_maquininha", "Taxa da maquininha", "-", 0, [], { naoInformado: true }),
          linha("outra", "Outra", "-", 5, [], { parcial: true }),
        ],
      }),
    );
    renderizar(<DreSection {...PROPS} />);
    await pronto();
    const taxa = screen.getByRole("row", { name: /Taxa da maquininha/ });
    expect(taxa).toHaveTextContent("não informadas");
    expect(taxa).not.toHaveTextContent("R$");
    expect(screen.getByRole("row", { name: /Outra/ })).toHaveTextContent("(parte não informada)");
  });

  it("custo não informado: aviso curto", async () => {
    montarDre.mockImplementation(() => dreDeExemplo({ algumCustoNaoInformado: true }));
    renderizar(<DreSection {...PROPS} />);
    await pronto();
    expect(screen.getByText(/peça avulsa sem custo/)).toBeInTheDocument();
  });

  it("faixa de lançamentos sem grupo: o administrador clica em Classificar e vai às categorias de caixa", async () => {
    montarDre.mockImplementation(() => dreDeExemplo({ semGrupo: { quantidade: 3, total: 450 } }));
    const { user } = renderizar(<DreSection {...PROPS} />);
    await pronto();
    expect(screen.getByText(/R\$\s450,00 em 3 lançamentos ainda sem grupo: não entram no DRE\./)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Classificar" }));
    expect(navegar).toHaveBeenCalledWith("/configuracoes?secao=categorias-caixa");
  });

  it("faixa sem grupo, quem não administra: sem botão, pede a quem administra", async () => {
    operador = { id: "op", admin: false, permissoes: [] };
    montarDre.mockImplementation(() => dreDeExemplo({ semGrupo: { quantidade: 1, total: 20 } }));
    renderizar(<DreSection {...PROPS} />);
    await pronto();
    expect(screen.queryByRole("button", { name: "Classificar" })).toBeNull();
    expect(screen.getByText(/Peça a quem administra a loja pra classificar em Configurações → Categorias de caixa/)).toBeInTheDocument();
  });

  it("sem lançamento sem grupo, não há faixa; o pé traz a frase, o aviso e o total do que ficou fora", async () => {
    montarDre.mockImplementation(() => dreDeExemplo({ foraDoResultado: { quantidade: 2, total: 80 } }));
    renderizar(<DreSection {...PROPS} />);
    await pronto();
    expect(screen.queryByText(/ainda sem grupo/)).toBeNull();
    expect(screen.getByText(/A venda entra no mês em que a OS foi aberta/)).toBeInTheDocument();
    expect(screen.getByText(/Categorias em “Fora do resultado” não entram\./)).toHaveTextContent(/R\$\s80,00 em 2 lançamentos/);
  });

  it("faixa sem grupo explica os dois casos: categoria a classificar e lançamento sem categoria", async () => {
    montarDre.mockImplementation(() => dreDeExemplo({ semGrupo: { quantidade: 2, total: 30 } }));
    renderizar(<DreSection {...PROPS} />);
    await pronto();
    expect(screen.getByText(/ainda sem grupo/)).toHaveTextContent(/no Caixa, em “Categorizar agora”/);
  });

  it("devolução de OS corrigida aparece no pé, fora das despesas", async () => {
    montarDre.mockImplementation(() => dreDeExemplo({ devolucoesDeOs: { quantidade: 1, total: 80 } }));
    renderizar(<DreSection {...PROPS} />);
    await pronto();
    expect(screen.getByText(/Categorias em “Fora do resultado” não entram\./)).toHaveTextContent(
      /devoluções de OS corrigida \(R\$\s80,00\) também não são despesa/,
    );
  });

  it("taxa faltando dentro das Deduções: avisa na tela fechada", async () => {
    const base = dreDeExemplo();
    montarDre.mockImplementation(() => ({
      ...base,
      linhas: [
        base.linhas[0],
        linha("deducoes", "Deduções", "-", 0, [
          linha("taxa_maquininha", "Taxa da maquininha", "-", 10, [], { parcial: true }),
        ]),
        ...base.linhas.slice(2),
      ],
    }));
    renderizar(<DreSection {...PROPS} />);
    await pronto();
    expect(screen.getByText(/Falta a taxa da maquininha de parte das vendas no cartão/)).toBeInTheDocument();
  });

  it("sem taxa faltando, não há aviso de taxa", async () => {
    renderizar(<DreSection {...PROPS} />);
    await pronto();
    expect(screen.queryByText(/Falta a taxa da maquininha/)).toBeNull();
  });

  it("período maior que o máximo: avisa que ficaram só os meses mais novos", async () => {
    const { user } = renderizar(<DreSection {...PROPS} />);
    await pronto();
    expect(screen.queryByText(/no máximo 24 meses/)).toBeNull();
    const de = screen.getByLabelText("De");
    await user.clear(de);
    await user.type(de, "2020-01");
    expect(await screen.findByText(/no máximo 24 meses/)).toBeInTheDocument();
  });

  it("De depois de Até: avisa e mantém os números do período anterior", async () => {
    const { user } = renderizar(<DreSection {...PROPS} />);
    await pronto();
    const chamadas = montarDre.mock.calls.length;
    const de = screen.getByLabelText("De");
    await user.clear(de);
    await user.type(de, "2099-12");
    expect(screen.getByRole("alert")).toHaveTextContent("O mês De precisa ser antes do Até");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(montarDre.mock.calls.length).toBe(chamadas);
  });

  it("mudar o período refaz a conta com os meses novos", async () => {
    const { user } = renderizar(<DreSection {...PROPS} />);
    await pronto();
    const ate = screen.getByLabelText("Até");
    await user.clear(ate);
    await user.type(ate, "2026-12");
    await waitFor(() => {
      const meses = montarDre.mock.calls.at(-1)?.[0].meses as string[];
      expect(meses.at(-1)).toBe("2026-12");
    });
  });

  it("erro ao carregar: AvisoDeErro com a mensagem e botão de tentar de novo", async () => {
    carregarDadosDoDre.mockRejectedValueOnce(new Error("sem internet"));
    const { user } = renderizar(<DreSection {...PROPS} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Não deu pra carregar o DRE: .*sem internet/);
    expect(screen.queryByRole("table")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await pronto()).toBeInTheDocument();
  });

  it("se montarDre joga erro, só o DRE avisa", async () => {
    montarDre.mockImplementation(() => {
      throw new Error("conta quebrada");
    });
    renderizar(<DreSection {...PROPS} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Não deu pra montar o DRE: .*conta quebrada/);
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("imprimir: abre a pré-visualização com a loja e chama o print do documento", async () => {
    buscarConfiguracaoFiscal.mockResolvedValue({ nome_fantasia: "Pneus do Centro" });
    const { user } = renderizar(<DreSection {...PROPS} />);
    await pronto();
    await user.click(screen.getByRole("button", { name: /Imprimir \/ salvar em PDF/ }));
    const iframe = (await screen.findByTitle("Pré-visualização do DRE")) as HTMLIFrameElement;
    expect(iframe.getAttribute("srcdoc")).toContain("Pneus do Centro");
    expect(iframe.getAttribute("srcdoc")).toContain("A4 landscape");
    const print = vi.fn();
    Object.defineProperty(iframe, "contentWindow", { value: { print }, configurable: true });
    await user.click(screen.getByRole("button", { name: "Imprimir" }));
    expect(print).toHaveBeenCalledTimes(1);
  });
});

describe("DreSection: troca de loja (#927)", () => {
  it("a carga da loja antiga que termina depois não aparece", async () => {
    const pendentes: Record<string, (v: unknown) => void> = {};
    carregarDadosDoDre.mockImplementation(
      (id: string) => new Promise((resolve) => (pendentes[id] = resolve)),
    );
    const { rerender } = renderizar(<DreSection {...PROPS} />);
    await waitFor(() => expect(pendentes["loja-a"]).toBeDefined());

    loja = LOJA_B;
    rerender(<DreSection {...PROPS} />);
    await waitFor(() => expect(pendentes["loja-b"]).toBeDefined());

    pendentes["loja-b"](dados("B"));
    await pronto();
    pendentes["loja-a"](dados("A"));
    await new Promise((r) => setTimeout(r, 20));

    const ultima = montarDre.mock.calls.at(-1)?.[0] as { categorias: { nome: string }[] };
    expect(ultima.categorias.map((c) => c.nome)).toEqual(["B"]);
    for (const [entrada] of montarDre.mock.calls) {
      expect((entrada as { categorias: { nome: string }[] }).categorias.map((c) => c.nome)).not.toContain("A");
    }
  });

  it("se a carga da loja nova dá erro, os dados da anterior não ficam na tela", async () => {
    const { rerender } = renderizar(<DreSection {...PROPS} />);
    await pronto();
    montarDre.mockClear();
    carregarDadosDoDre.mockRejectedValue(new Error("falhou"));
    loja = LOJA_B;
    rerender(<DreSection {...PROPS} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("falhou");
    expect(screen.queryByRole("table")).toBeNull();
    for (const [entrada] of montarDre.mock.calls) {
      expect((entrada as { categorias: unknown[] }).categorias).toEqual([]);
    }
  });
});

// Só pra o TypeScript: o tipo do DRE de exemplo é o do contrato.
void (dreDeExemplo() satisfies Dre);
