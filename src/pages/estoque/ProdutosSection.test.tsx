// @vitest-environment jsdom
/**
 * Teste de TELA da lista de Produtos (#781): a margem sai no formato
 * brasileiro, com vírgula ("59,1%"), igual ao resto dos números do programa.
 * A conta é a de `margemSobreAVenda` (sobre a venda desde a #835); aqui se
 * confere como ela aparece na tabela.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";
import type { Peca } from "@/types/peca";

// O cadastro e o estoque inicial (#909): o resto de `@/lib/pecas` fica o de verdade.
const criarPeca = vi.fn();
const criarMovimento = vi.fn();
vi.mock("@/lib/pecas", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/pecas")>()),
  criarPeca: (...a: unknown[]) => criarPeca(...a),
}));
vi.mock("@/lib/estoque", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/estoque")>()),
  criarMovimento: (...a: unknown[]) => criarMovimento(...a),
}));

const { ProdutosSection } = await import("./ProdutosSection");

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// Os testes do #969 trocam o scrollIntoView (o jsdom não tem) por um espião;
// no fim de cada um, volta o que era.
const scrollIntoViewOriginal = Element.prototype.scrollIntoView;
afterEach(() => {
  Element.prototype.scrollIntoView = scrollIntoViewOriginal;
});

function umaPeca(extra: Partial<Peca>): Peca {
  return {
    id: "p-1",
    codigo_interno: null,
    codigo_barras: null,
    descricao: "PNEU 175/70 R13 PIRELLI",
    marca: null,
    modelo: null,
    aplicacao: null,
    unidade: "UN",
    preco_custo: null,
    preco_venda: null,
    ncm: "40111000",
    cest: "0100100",
    cfop_padrao: "5102",
    origem: "0",
    cst_ou_csosn: "500",
    aliquota_icms: null,
    categoria_id: null,
    prazo_garantia_dias: null,
    estoque_minimo: null,
    medida: null,
    indice_carga_velocidade: null,
    dot: null,
    ativo: true,
    criado_em: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

function montar(pecas: Peca[], onRecarregar = vi.fn().mockResolvedValue(undefined)) {
  return renderizar(
    <ProdutosSection
      pecas={pecas}
      categorias={[]}
      saldos={new Map()}
      regime="simples_nacional"
      lojaId="loja-1"
      onRecarregar={onRecarregar}
    />,
  );
}

describe("ProdutosSection — margem", () => {
  it("mostra a margem sobre a venda, com vírgula: custo 245, venda 389,90 → 37,2%", () => {
    montar([umaPeca({ preco_custo: 245, preco_venda: 389.9 })]);
    expect(screen.getByText("37,2%")).toBeTruthy();
    expect(screen.queryByText("37.2%")).toBeNull();
    // Sobre o custo (o "markup") daria 59,1%: não é o que a tela mostra.
    expect(screen.queryByText("59,1%")).toBeNull();
  });

  it("margem inteira não ganha casa decimal: custo 100, venda 200 → 50%", () => {
    montar([umaPeca({ preco_custo: 100, preco_venda: 200 })]);
    expect(screen.getByText("50%")).toBeTruthy();
  });

  it("sem custo, mostra o traço", () => {
    montar([umaPeca({ preco_custo: null, preco_venda: 150 })]);
    const linha = screen.getByText("PNEU 175/70 R13 PIRELLI").closest("tr")!;
    expect(linha.textContent).not.toContain("%");
  });
});

/**
 * #969: com a lista rolada, a canetinha abria o formulário lá no topo e a tela
 * não subia até ele: parecia que o clique não tinha feito nada. Ao abrir (editar
 * ou "+ Novo"), a tela rola até o formulário e o cursor vai pro primeiro campo.
 */
describe("ProdutosSection — abrir o formulário rola até ele (#969)", () => {
  const SELETOR_CAMPO =
    "input:not([type=hidden]):not(:disabled):not([readonly]), select:not(:disabled), textarea:not(:disabled)";

  it("a canetinha pede a rolagem e põe o foco no primeiro campo do formulário", async () => {
    const rolar = vi.fn();
    Element.prototype.scrollIntoView = rolar;
    const { user, container } = montar([umaPeca({ descricao: "PNEU 175/70 R13 PIRELLI" })]);

    await user.click(screen.getByRole("button", { name: /^Editar .*PNEU 175\/70 R13 PIRELLI/ }));

    const formulario = container.querySelector("form")!;
    expect(formulario).toBeTruthy();
    expect(document.activeElement).toBe(formulario.querySelector(SELETOR_CAMPO));
    expect(rolar).toHaveBeenCalled();
  });

  it("o \"+ Novo produto\" também", async () => {
    const rolar = vi.fn();
    Element.prototype.scrollIntoView = rolar;
    const { user, container } = montar([umaPeca({})]);

    await user.click(screen.getByRole("button", { name: "+ Novo produto" }));

    const formulario = container.querySelector("form")!;
    expect(document.activeElement).toBe(formulario.querySelector(SELETOR_CAMPO));
    expect(rolar).toHaveBeenCalled();
  });
});

/**
 * #909: o cadastro cria a peça e DEPOIS lança o estoque inicial. Se só o
 * estoque inicial falha, a peça já existe: o formulário fecha e avisa, pra um
 * novo "Salvar" não criar uma segunda peça igual.
 */
describe("ProdutosSection — estoque inicial que não entra (#909)", () => {
  const campo = (rotulo: string) => screen.getByLabelText(rotulo, { exact: true }) as HTMLInputElement;

  async function cadastrarNova(user: ReturnType<typeof montar>["user"], quantidade: string | null) {
    await user.click(screen.getByRole("button", { name: "+ Novo produto" }));
    await user.type(campo("Descrição *"), "TESTE 909 Palheta");
    await user.type(campo("NCM *"), "40169300");
    await user.type(campo("C.E.S.T *"), "0100100");
    await user.type(campo("CFOP padrão *"), "5102");
    await user.selectOptions(screen.getByLabelText("Origem *"), "0");
    await user.type(campo("CST / CSOSN *"), "500");
    if (quantidade) await user.type(campo("Qtde. estoque inicial"), quantidade);
    await user.click(screen.getByRole("button", { name: "Salvar peça" }));
  }

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    criarPeca.mockResolvedValue(umaPeca({ id: "p-nova", descricao: "TESTE 909 Palheta" }));
  });

  it("a peça foi criada e só o estoque inicial falhou: fecha, avisa e não cria de novo", async () => {
    criarMovimento.mockRejectedValue(new Error("Nenhum depósito ativo encontrado pra essa loja."));
    const onRecarregar = vi.fn().mockResolvedValue(undefined);
    const { user, container } = montar([umaPeca({})], onRecarregar);

    await cadastrarNova(user, "3");

    expect(
      await screen.findByText(
        "Peça cadastrada, mas o estoque inicial não entrou (Nenhum depósito ativo encontrado pra essa loja). " +
          "Lance a entrada em Estoque → Movimentações.",
      ),
    ).toBeInTheDocument();
    expect(container.querySelector("form")).toBeNull();
    expect(criarPeca).toHaveBeenCalledTimes(1);
    expect(onRecarregar).toHaveBeenCalled();

    // Reabrir o "Novo produto" não traz a peça de volta (o rascunho foi limpo).
    await user.click(screen.getByRole("button", { name: "+ Novo produto" }));
    expect(campo("Descrição *")).toHaveValue("");
    expect(criarPeca).toHaveBeenCalledTimes(1);
  });

  // Revisão: se recarregar a lista falhava depois de criar, o erro subia, o
  // formulário (já fechado) não limpava o rascunho e reabrir trazia a peça.
  it("se só recarregar a lista falha, avisa e o rascunho não traz a peça de volta", async () => {
    criarMovimento.mockResolvedValue(undefined);
    const onRecarregar = vi.fn().mockRejectedValue(new Error("sem internet"));
    const { user, container } = montar([umaPeca({})], onRecarregar);

    await cadastrarNova(user, "3");

    expect(await screen.findByText(/A peça foi salva, mas a lista não recarregou \(sem internet\)/)).toBeInTheDocument();
    expect(container.querySelector("form")).toBeNull();
    await user.click(screen.getByRole("button", { name: "+ Novo produto" }));
    expect(campo("Descrição *")).toHaveValue("");
    expect(criarPeca).toHaveBeenCalledTimes(1);
  });

  it("com o estoque inicial entrando: fecha sem aviso, como sempre", async () => {
    criarMovimento.mockResolvedValue(undefined);
    const { user, container } = montar([umaPeca({})]);

    await cadastrarNova(user, "3");

    await waitFor(() => expect(container.querySelector("form")).toBeNull());
    expect(criarMovimento).toHaveBeenCalledWith(
      expect.objectContaining({ peca_id: "p-nova", quantidade: 3 }),
      "loja-1",
    );
    expect(screen.queryByText(/estoque inicial não entrou/)).toBeNull();
  });

  it("sem quantidade: não lança movimento e fecha sem aviso", async () => {
    const { user, container } = montar([umaPeca({})]);

    await cadastrarNova(user, null);

    await waitFor(() => expect(container.querySelector("form")).toBeNull());
    expect(criarMovimento).not.toHaveBeenCalled();
    expect(screen.queryByText(/estoque inicial não entrou/)).toBeNull();
  });

  it("se a própria peça não foi criada: o erro fica no formulário, que continua aberto", async () => {
    criarPeca.mockRejectedValue(new Error("sem internet"));
    const { user, container } = montar([umaPeca({})]);

    await cadastrarNova(user, "3");

    expect(await screen.findByText("sem internet")).toBeInTheDocument();
    expect(container.querySelector("form")).not.toBeNull();
    expect(criarMovimento).not.toHaveBeenCalled();
  });
});

describe("ProdutosSection — fechar o formulário continua como antes (#969)", () => {
  it("\"Cancelar\" devolve o cursor pra busca", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const { user } = montar([umaPeca({})]);
    await user.click(screen.getByRole("button", { name: /^Editar .*PNEU 175\/70 R13 PIRELLI/ }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("searchbox", { name: /Buscar/ })),
    );
  });
});
