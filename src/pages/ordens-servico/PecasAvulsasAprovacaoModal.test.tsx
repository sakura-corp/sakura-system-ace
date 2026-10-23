// @vitest-environment jsdom
/**
 * Teste de TELA da janela de aprovação com peça sem cadastro (#655).
 *
 * Promessas guardadas aqui:
 * 1. "Aprovar orçamento" fica travado até CADA peça avulsa ter um caminho.
 * 2. Cada caminho manda o vínculo certo: "já tenho" e "cadastrar agora"
 *    mandam a peça; "seguir sem cadastro" não manda nada.
 * 3. As parecidas com o que foi digitado vêm no topo da lista.
 * 4. "Cadastrar agora" abre o cadastro com nome e preço (e custo) já
 *    preenchidos e, ao salvar, guarda a peça nova como caminho.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor, within } from "@/testes/tela";
import type { ItemOS } from "@/types/os";
import type { Peca } from "@/types/peca";

const criarPeca = vi.fn();
const criarMovimento = vi.fn();
vi.mock("@/lib/pecas", () => ({ criarPeca: (...a: unknown[]) => criarPeca(...a) }));
vi.mock("@/lib/estoque", () => ({ criarMovimento: (...a: unknown[]) => criarMovimento(...a) }));
vi.mock("@/lib/categorias", () => ({ listarCategorias: async () => [] }));
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoFiscal: async () => ({ regime_tributario: "simples_nacional" }),
}));

const { PecasAvulsasAprovacaoModal } = await import("./PecasAvulsasAprovacaoModal");

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function avulsa(id: string, descricao: string, extra: Partial<ItemOS> = {}): ItemOS {
  return {
    id,
    tipo: "peca",
    peca_id: null,
    servico_id: null,
    descricao,
    quantidade: 2,
    preco_unitario: 80,
    desconto: 0,
    custo_unitario: null,
    ...extra,
  } as unknown as ItemOS;
}

const palheta = avulsa("i1", "Palheta 20 polegadas");
const filtro = avulsa("i2", "Filtro de óleo PSL55");

const cadastro = [
  { id: "p-1", descricao: "Amortecedor dianteiro", codigo_interno: null, codigo_barras: null, medida: null },
  { id: "p-2", descricao: "Palheta 20 polegadas Bosch", codigo_interno: null, codigo_barras: null, medida: null },
  { id: "p-3", descricao: "Palheta 20 polegadas", codigo_interno: null, codigo_barras: null, medida: null },
] as unknown as Peca[];

function montar(itens: ItemOS[], extra: { pecas?: Peca[]; erro?: string | null } = {}) {
  const onConfirmar = vi.fn();
  const onFechar = vi.fn();
  const resultado = renderizar(
    <PecasAvulsasAprovacaoModal
      itens={itens}
      pecas={extra.pecas ?? cadastro}
      lojaId="loja-1"
      enviando={false}
      erro={extra.erro ?? null}
      onConfirmar={onConfirmar}
      onFechar={onFechar}
    />,
  );
  return { ...resultado, onConfirmar, onFechar };
}

const aprovar = () => screen.getByRole("button", { name: "Aprovar orçamento" });
const secao = (nome: string) => within(screen.getByRole("group", { name: nome }));

describe("PecasAvulsasAprovacaoModal — o Aprovar só libera sem ponta solta", () => {
  it("fica travado até cada peça avulsa ter um caminho", async () => {
    const { user, onConfirmar } = montar([palheta, filtro]);

    expect(aprovar()).toBeDisabled();
    expect(screen.getByText("Faltam 2 peças para escolher o que fazer.")).toBeInTheDocument();

    await user.click(secao("Palheta 20 polegadas").getByRole("radio", { name: "Seguir sem cadastro" }));
    expect(aprovar()).toBeDisabled();
    expect(screen.getByText("Falta escolher o que fazer com 1 peça.")).toBeInTheDocument();

    // "Já tenho" sem escolher a peça ainda é ponta solta.
    await user.click(secao("Filtro de óleo PSL55").getByRole("radio", { name: "É uma peça que já tenho" }));
    expect(aprovar()).toBeDisabled();

    await user.click(screen.getByDisplayValue("Escolha a peça do cadastro"));
    await user.click(screen.getByRole("button", { name: "Amortecedor dianteiro" }));
    expect(aprovar()).toBeEnabled();
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});

describe("PecasAvulsasAprovacaoModal — os caminhos mandam o vínculo certo", () => {
  it("'já tenho' manda a peça escolhida; 'sem cadastro' não manda nada", async () => {
    const { user, onConfirmar } = montar([palheta, filtro]);

    await user.click(secao("Palheta 20 polegadas").getByRole("radio", { name: "É uma peça que já tenho" }));
    await user.click(screen.getByDisplayValue("Escolha a peça do cadastro"));
    await user.click(screen.getByRole("button", { name: "Amortecedor dianteiro" }));
    await user.click(secao("Filtro de óleo PSL55").getByRole("radio", { name: "Seguir sem cadastro" }));
    await user.click(aprovar());

    expect(onConfirmar).toHaveBeenCalledWith([{ itemId: "i1", pecaId: "p-1" }]);
  });

  it("só 'seguir sem cadastro': aprova mandando lista vazia", async () => {
    const { user, onConfirmar } = montar([palheta]);

    await user.click(secao("Palheta 20 polegadas").getByRole("radio", { name: "Seguir sem cadastro" }));
    await user.click(aprovar());

    expect(onConfirmar).toHaveBeenCalledWith([]);
  });

  it("as parecidas com o que foi digitado vêm no topo da lista", async () => {
    const { user } = montar([palheta]);

    await user.click(secao("Palheta 20 polegadas").getByRole("radio", { name: "É uma peça que já tenho" }));
    await user.click(screen.getByDisplayValue("Escolha a peça do cadastro"));

    const opcoes = screen.getAllByRole("button").map((b) => b.textContent);
    const iPalheta = opcoes.indexOf("Palheta 20 polegadas (parecida)");
    const iAmortecedor = opcoes.indexOf("Amortecedor dianteiro");
    expect(iPalheta).toBeGreaterThan(-1);
    expect(iPalheta).toBeLessThan(iAmortecedor);
  });

  it("o bico de válvula do T12 é parecida, mesmo com o nome um pouco diferente (#741)", async () => {
    const bico = { id: "p-9", descricao: "Bico de válvula (exemplo)", codigo_interno: null, codigo_barras: null, medida: null } as unknown as Peca;
    const { user } = montar([avulsa("i9", "Bico de valvula cromado")], { pecas: [...cadastro, bico] });

    await user.click(secao("Bico de valvula cromado").getByRole("radio", { name: "É uma peça que já tenho" }));
    expect(screen.getByText(/As que parecem com “Bico de valvula cromado” estão no topo da lista\./)).toBeInTheDocument();
    await user.click(screen.getByDisplayValue("Escolha a peça do cadastro"));
    const opcoes = screen.getAllByRole("button").map((b) => b.textContent);
    expect(opcoes.indexOf("Bico de válvula (exemplo) (parecida)")).toBeGreaterThan(-1);
    expect(opcoes.indexOf("Bico de válvula (exemplo) (parecida)")).toBeLessThan(opcoes.indexOf("Amortecedor dianteiro"));
  });
});

describe("PecasAvulsasAprovacaoModal — cadastrar agora", () => {
  it("abre o cadastro com nome, preço e custo preenchidos; ao salvar, a peça nova vira o vínculo", async () => {
    criarPeca.mockResolvedValue({ id: "p-nova", descricao: "Palheta 20 polegadas" });
    const { user, onConfirmar } = montar([avulsa("i1", "Palheta 20 polegadas", { custo_unitario: 35 })], {
      pecas: [],
    });

    await user.click(secao("Palheta 20 polegadas").getByRole("radio", { name: "Cadastrar agora" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar a peça" }));
    expect(aprovar()).toBeDisabled();

    const campo = (rotulo: string) => screen.getByLabelText(rotulo, { exact: true }) as HTMLInputElement;
    await waitFor(() => expect(campo("Descrição *")).toHaveValue("Palheta 20 polegadas"));
    expect(campo("Preço final")).toHaveValue(80);
    expect(campo("Aquisição (custo)")).toHaveValue(35);

    await user.type(campo("NCM *"), "40169300");
    await user.type(campo("C.E.S.T *"), "0100100");
    await user.type(campo("CFOP padrão *"), "5102");
    await user.selectOptions(screen.getByLabelText("Origem *"), "0");
    await user.type(campo("CST / CSOSN *"), "500");
    await user.click(screen.getByRole("button", { name: "Salvar peça" }));

    expect(await screen.findByText("Peça cadastrada: Palheta 20 polegadas")).toBeInTheDocument();
    expect(criarPeca).toHaveBeenCalledWith(expect.objectContaining({ descricao: "Palheta 20 polegadas", preco_venda: 80 }));
    expect(aprovar()).toBeEnabled();

    await user.click(aprovar());
    expect(onConfirmar).toHaveBeenCalledWith([{ itemId: "i1", pecaId: "p-nova" }]);
  });

  // Revisão: duas linhas avulsas da mesma peça. Cadastrada na primeira, ela
  // tem que aparecer (como parecida) no "já tenho" da segunda — senão a
  // pessoa cadastra a mesma peça duas vezes.
  it("a peça cadastrada aqui entra na lista do 'já tenho' das outras linhas", async () => {
    criarPeca.mockResolvedValue({
      id: "p-nova", descricao: "Palheta 20 polegadas", codigo_interno: null, codigo_barras: null, medida: null,
    });
    const primeira = avulsa("i1", "Palheta 20 polegadas");
    const segunda = avulsa("i3", "Palheta 20 polegadas ", { quantidade: 1 });
    const { user, onConfirmar } = montar([primeira, segunda], { pecas: [] });

    const [secaoPrimeira, secaoSegunda] = screen.getAllByRole("group").map((g) => within(g));
    await user.click(secaoPrimeira.getByRole("radio", { name: "Cadastrar agora" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar a peça" }));
    const campo = (rotulo: string) => screen.getByLabelText(rotulo, { exact: true }) as HTMLInputElement;
    await waitFor(() => expect(campo("Descrição *")).toHaveValue("Palheta 20 polegadas"));
    await user.type(campo("NCM *"), "40169300");
    await user.type(campo("C.E.S.T *"), "0100100");
    await user.type(campo("CFOP padrão *"), "5102");
    await user.selectOptions(screen.getByLabelText("Origem *"), "0");
    await user.type(campo("CST / CSOSN *"), "500");
    await user.click(screen.getByRole("button", { name: "Salvar peça" }));
    await screen.findByText("Peça cadastrada: Palheta 20 polegadas");

    await user.click(secaoSegunda.getByRole("radio", { name: "É uma peça que já tenho" }));
    await user.click(screen.getByDisplayValue("Escolha a peça do cadastro"));
    await user.click(screen.getByRole("button", { name: "Palheta 20 polegadas (parecida)" }));
    await user.click(aprovar());

    expect(criarPeca).toHaveBeenCalledTimes(1);
    expect(onConfirmar).toHaveBeenCalledWith([
      { itemId: "i1", pecaId: "p-nova" },
      { itemId: "i3", pecaId: "p-nova" },
    ]);
  });
});

describe("PecasAvulsasAprovacaoModal — erro da aprovação", () => {
  it("mostra o erro dentro da janela", () => {
    montar([palheta], { erro: "A OS 9 foi aprovada, mas a baixa não entrou" });
    expect(screen.getByText(/foi aprovada, mas a baixa não entrou/)).toBeInTheDocument();
  });
});
