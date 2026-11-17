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
 * 5. A peça cadastrada aqui é ligada ao item NA HORA (#720): se a pessoa fechar
 *    o orçamento, ou outro computador aprovar antes, ela não fica solta.
 */
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor, within } from "@/testes/tela";
import type { ItemOS } from "@/types/os";
import type { PecaJanela } from "@/types/peca";

const cadastrarPecaRapida = vi.fn();
const registrarMovimento = vi.fn();
vi.mock("@/lib/pecas", () => ({
  cadastrarPecaRapida: (...a: unknown[]) => cadastrarPecaRapida(...a),
  buscarDadosFiscaisDasPecas: async () => [],
}));
vi.mock("@/lib/estoque", () => ({ registrarMovimento: (...a: unknown[]) => registrarMovimento(...a) }));
vi.mock("@/lib/categorias", () => ({ listarCategorias: async () => [] }));
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoFiscal: async () => ({ regime_tributario: "simples_nacional" }),
}));
const cadastrarPecaDoItem = vi.fn();
vi.mock("@/lib/ordensServico", () => ({
  cadastrarPecaDoItem: (...a: unknown[]) => cadastrarPecaDoItem(...a),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op" }, lojaAtual: { id: "loja-1" } }),
}));

const { PecasAvulsasAprovacaoModal } = await import("./PecasAvulsasAprovacaoModal");
const { ESCOLHAS_VAZIAS } = await import("./escolhasAvulsas");
type EscolhasDaJanela = import("./escolhasAvulsas").EscolhasDaJanela;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  cadastrarPecaDoItem.mockResolvedValue(true);
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
] as unknown as PecaJanela[];

function montar(itens: ItemOS[], extra: { pecas?: PecaJanela[]; erro?: string | null } = {}) {
  const onConfirmar = vi.fn();
  const onFechar = vi.fn();
  const onItemLigado = vi.fn();
  // As escolhas moram em quem abre a janela (#720), como no formulário.
  function ComPai() {
    const [escolhas, setEscolhas] = useState<EscolhasDaJanela>(ESCOLHAS_VAZIAS);
    return (
      <PecasAvulsasAprovacaoModal
        itens={itens}
        pecas={extra.pecas ?? cadastro}
        lojaId="loja-1"
        escolhas={escolhas}
        onMudarEscolhas={setEscolhas}
        enviando={false}
        erro={extra.erro ?? null}
        onConfirmar={onConfirmar}
        onItemLigado={onItemLigado}
        onFechar={onFechar}
      />
    );
  }
  const resultado = renderizar(<ComPai />);
  return { ...resultado, onConfirmar, onFechar, onItemLigado };
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
    const bico = { id: "p-9", descricao: "Bico de válvula (exemplo)", codigo_interno: null, codigo_barras: null, medida: null } as unknown as PecaJanela;
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
    cadastrarPecaRapida.mockResolvedValue("p-nova");
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
    expect(cadastrarPecaRapida).toHaveBeenCalledWith(expect.objectContaining({ descricao: "Palheta 20 polegadas", preco_venda: 80 }));
    expect(aprovar()).toBeEnabled();

    await user.click(aprovar());
    expect(onConfirmar).toHaveBeenCalledWith([{ itemId: "i1", pecaId: "p-nova" }]);
  });

  // Revisão: duas linhas avulsas da mesma peça. Cadastrada na primeira, ela
  // tem que aparecer (como parecida) no "já tenho" da segunda — senão a
  // pessoa cadastra a mesma peça duas vezes.
  it("a peça cadastrada aqui entra na lista do 'já tenho' das outras linhas", async () => {
    cadastrarPecaRapida.mockResolvedValue("p-nova");
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

    expect(cadastrarPecaRapida).toHaveBeenCalledTimes(1);
    expect(onConfirmar).toHaveBeenCalledWith([
      { itemId: "i1", pecaId: "p-nova" },
      { itemId: "i3", pecaId: "p-nova" },
    ]);
  });
});

type Usuario = ReturnType<typeof montar>["user"];

/** Cadastra a peça da única linha avulsa pela janela de cadastro de verdade. */
async function cadastrarAPeca(user: Usuario, nome: string) {
  cadastrarPecaRapida.mockResolvedValue("p-nova");
  await user.click(secao(nome).getByRole("radio", { name: "Cadastrar agora" }));
  await user.click(screen.getByRole("button", { name: "Cadastrar a peça" }));
  const campo = (rotulo: string) => screen.getByLabelText(rotulo, { exact: true }) as HTMLInputElement;
  await waitFor(() => expect(campo("Descrição *")).toHaveValue(nome));
  await user.type(campo("NCM *"), "40169300");
  await user.type(campo("C.E.S.T *"), "0100100");
  await user.type(campo("CFOP padrão *"), "5102");
  await user.selectOptions(screen.getByLabelText("Origem *"), "0");
  await user.type(campo("CST / CSOSN *"), "500");
  await user.click(screen.getByRole("button", { name: "Salvar peça" }));
}

describe("PecasAvulsasAprovacaoModal — a peça cadastrada liga ao item na hora (#720)", () => {
  it("cadastrar liga a peça ao item logo depois de ela nascer, sem esperar a aprovação", async () => {
    const { user, onItemLigado, onConfirmar } = montar([palheta], { pecas: [] });

    await cadastrarAPeca(user, "Palheta 20 polegadas");

    await waitFor(() => expect(cadastrarPecaDoItem).toHaveBeenCalledTimes(1));
    expect(cadastrarPecaDoItem.mock.calls[0]).toEqual(["i1", "p-nova", "op"]);
    await waitFor(() => expect(onItemLigado).toHaveBeenCalledWith("i1"));
    expect(screen.queryByText(/ficou no cadastro/)).not.toBeInTheDocument();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("o banco devolve false (ligado em outro computador): avisa que a peça cadastrada ficou no cadastro", async () => {
    cadastrarPecaDoItem.mockResolvedValue(false);
    const { user, onItemLigado } = montar([palheta], { pecas: [] });

    await cadastrarAPeca(user, "Palheta 20 polegadas");

    expect(
      await screen.findByText(
        /já tinha sido ligado a uma peça.*A peça que você cadastrou ficou no cadastro: se ela sobrou, inative em Estoque\./,
      ),
    ).toBeInTheDocument();
    // O item já não é avulso: quem abriu a janela recarrega o orçamento.
    expect(onItemLigado).toHaveBeenCalledWith("i1");
  });

  it("ligar dá erro: avisa, e a peça continua como caminho pra aprovação ligar", async () => {
    cadastrarPecaDoItem.mockRejectedValue(new Error("sem internet"));
    const { user, onItemLigado, onConfirmar } = montar([palheta], { pecas: [] });

    await cadastrarAPeca(user, "Palheta 20 polegadas");

    expect(await screen.findByText(/A peça foi cadastrada, mas não foi ligada ao item agora: sem internet/)).toBeInTheDocument();
    expect(onItemLigado).not.toHaveBeenCalled();
    expect(screen.getByText("Peça cadastrada: Palheta 20 polegadas")).toBeInTheDocument();
    await user.click(aprovar());
    expect(onConfirmar).toHaveBeenCalledWith([{ itemId: "i1", pecaId: "p-nova" }]);
  });

  // Revisão: um "ligando" só, pra duas ligações ao mesmo tempo, liberava o
  // Aprovar quando a primeira acabava, com a segunda ainda no banco.
  it("duas peças ligando ao mesmo tempo: o Aprovar espera as duas", async () => {
    let terminarPrimeira!: (v: boolean) => void;
    let terminarSegunda!: (v: boolean) => void;
    cadastrarPecaDoItem
      .mockImplementationOnce(() => new Promise<boolean>((r) => (terminarPrimeira = r)))
      .mockImplementationOnce(() => new Promise<boolean>((r) => (terminarSegunda = r)));
    const { user } = montar([palheta, filtro], { pecas: [] });

    await cadastrarAPeca(user, "Palheta 20 polegadas");
    await cadastrarAPeca(user, "Filtro de óleo PSL55");
    await waitFor(() => expect(cadastrarPecaDoItem).toHaveBeenCalledTimes(2));
    expect(aprovar()).toBeDisabled();

    terminarPrimeira(true);
    await waitFor(() => expect(cadastrarPecaDoItem).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 50));
    expect(aprovar()).toBeDisabled();

    terminarSegunda(true);
    await waitFor(() => expect(aprovar()).toBeEnabled());
  });

  it("sem peça avulsa sobrando, diz que pode aprovar e aprova sem vínculo", async () => {
    const { user, onConfirmar } = montar([]);

    expect(screen.getByText(/Não sobrou nenhuma peça sem cadastro/)).toBeInTheDocument();
    await user.click(aprovar());
    expect(onConfirmar).toHaveBeenCalledWith([]);
  });
});

/** Preenche a janela de cadastro aberta, com a quantidade de estoque inicial. */
async function preencherComEstoque(user: Usuario, nome: string) {
  const campo = (rotulo: string) => screen.getByLabelText(rotulo, { exact: true }) as HTMLInputElement;
  await waitFor(() => expect(campo("Descrição *")).toHaveValue(nome));
  await user.type(campo("NCM *"), "40169300");
  await user.type(campo("C.E.S.T *"), "0100100");
  await user.type(campo("CFOP padrão *"), "5102");
  await user.selectOptions(screen.getByLabelText("Origem *"), "0");
  await user.type(campo("CST / CSOSN *"), "500");
  await user.type(campo("Qtde. estoque inicial"), "3");
  await user.click(screen.getByRole("button", { name: "Salvar peça" }));
}

const AVISO_PALHETA =
  "Palheta 20 polegadas: Peça cadastrada, mas o estoque inicial não entrou " +
  "(Nenhum depósito ativo encontrado pra essa loja). Peça a quem cuida do Estoque para lançar a entrada.";

// #909: a peça foi criada, mas o estoque inicial não entrou. A peça fica como
// o caminho do item (sem cadastrar outra), e a janela avisa, sem travar o Aprovar.
describe("PecasAvulsasAprovacaoModal — estoque inicial que não entra (#909)", () => {
  it("liga a peça criada, avisa e não cadastra duas vezes", async () => {
    cadastrarPecaRapida.mockResolvedValue("p-nova");
    registrarMovimento.mockRejectedValue(new Error("Nenhum depósito ativo encontrado pra essa loja."));
    const { user, onConfirmar, onItemLigado } = montar([palheta], { pecas: [] });

    await user.click(secao("Palheta 20 polegadas").getByRole("radio", { name: "Cadastrar agora" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar a peça" }));
    await preencherComEstoque(user, "Palheta 20 polegadas");

    expect(await screen.findByText("Peça cadastrada: Palheta 20 polegadas")).toBeInTheDocument();
    expect(screen.getByText(AVISO_PALHETA)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar peça" })).not.toBeInTheDocument();
    expect(cadastrarPecaRapida).toHaveBeenCalledTimes(1);
    // A peça é ligada ao item na hora (#720), mesmo sem o estoque inicial.
    await waitFor(() => expect(onItemLigado).toHaveBeenCalledWith("i1"));
    expect(cadastrarPecaDoItem.mock.calls[0]).toEqual(["i1", "p-nova", "op"]);

    // Aviso, nunca tranca: aprova normalmente com a peça criada.
    await waitFor(() => expect(aprovar()).toBeEnabled());
    await user.click(aprovar());
    expect(onConfirmar).toHaveBeenCalledWith([{ itemId: "i1", pecaId: "p-nova" }]);
  });

  // Junção com o #720: ligada a peça, quem abriu a janela tira o item da
  // lista. O aviso não pode ir embora junto com a linha do item.
  it("o item sai da lista depois de ligado, e o aviso continua na janela", async () => {
    cadastrarPecaRapida.mockResolvedValue("p-nova");
    registrarMovimento.mockRejectedValue(new Error("Nenhum depósito ativo encontrado pra essa loja."));
    function ComPaiQueTiraOLigado() {
      const [itens, setItens] = useState<ItemOS[]>([palheta]);
      const [escolhas, setEscolhas] = useState<EscolhasDaJanela>(ESCOLHAS_VAZIAS);
      return (
        <PecasAvulsasAprovacaoModal
          itens={itens}
          pecas={[]}
          lojaId="loja-1"
          escolhas={escolhas}
          onMudarEscolhas={setEscolhas}
          enviando={false}
          erro={null}
          onConfirmar={vi.fn()}
          onItemLigado={async (itemId) => setItens((lista) => lista.filter((item) => item.id !== itemId))}
          onFechar={vi.fn()}
        />
      );
    }
    const { user } = renderizar(<ComPaiQueTiraOLigado />);

    await user.click(secao("Palheta 20 polegadas").getByRole("radio", { name: "Cadastrar agora" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar a peça" }));
    await preencherComEstoque(user, "Palheta 20 polegadas");

    await waitFor(() => expect(screen.queryByRole("group", { name: "Palheta 20 polegadas" })).toBeNull());
    expect(screen.getByText(AVISO_PALHETA)).toBeInTheDocument();
    expect(cadastrarPecaRapida).toHaveBeenCalledTimes(1);
  });
});

describe("PecasAvulsasAprovacaoModal — um aviso por peça (#909, revisão)", () => {
  it("cadastrar a segunda peça sem problema não apaga o aviso da primeira", async () => {
    cadastrarPecaRapida.mockResolvedValueOnce("p-nova").mockResolvedValueOnce("p-outra");
    registrarMovimento.mockRejectedValueOnce(new Error("sem internet")).mockResolvedValue(undefined);
    const { user } = montar([palheta, filtro], { pecas: [] });

    async function cadastrar(nome: string) {
      await user.click(secao(nome).getByRole("radio", { name: "Cadastrar agora" }));
      await user.click(secao(nome).getByRole("button", { name: "Cadastrar a peça" }));
      await preencherComEstoque(user, nome);
      await screen.findByText(`Peça cadastrada: ${nome}`);
    }

    await cadastrar("Palheta 20 polegadas");
    await cadastrar("Filtro de óleo PSL55");

    expect(screen.getByText(/^Palheta 20 polegadas: .*estoque inicial não entrou \(sem internet\)/)).toBeInTheDocument();
    expect(screen.queryByText(/^Filtro de óleo PSL55: .*estoque inicial não entrou/)).not.toBeInTheDocument();
  });
});

describe("PecasAvulsasAprovacaoModal — erro da aprovação", () => {
  it("mostra o erro dentro da janela", () => {
    montar([palheta], { erro: "A OS 9 foi aprovada, mas a baixa não entrou" });
    expect(screen.getByText(/foi aprovada, mas a baixa não entrou/)).toBeInTheDocument();
  });
});
