// @vitest-environment jsdom
/**
 * Teste de TELA da abertura/edição de Ordem de Serviço (item TR-07.2 do guia).
 *
 * É o formulário mais carregado do app, e o que mais mexe em dinheiro antes de
 * o dinheiro existir: o que for lançado aqui vira baixa de estoque, total
 * faturado, lucro, comissão e item de nota fiscal. Três promessas concretas
 * ficam guardadas abaixo, e as três já foram quebradas de verdade:
 *
 * 1. **Depois de faturada, não se acrescenta item** (item 31 da seção 6) — o
 *    pagamento já entrou no Caixa com o total daquele momento, e a NFC-e
 *    somava os itens atuais: foi assim que saiu a rejeição "total dos
 *    pagamentos menor que o total da nota".
 * 2. **Trocar a peça escolhida preenche descrição e preço** — o `<select>` de
 *    tipo e os Comboboxes de peça/serviço são controlados na mão (`watch` +
 *    `setValue`, não `register`), justamente porque `register` não dá conta do
 *    valor-sentinela "serviço avulso" (seção 4 do PROJETO_STATUS).
 * 3. **Os avisos avisam e não trancam** (item 33 da seção 6): quantidade acima
 *    do saldo e peça sem preço de custo aparecem na tela, e o salvar continua
 *    funcionando.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { OrdemServicoForm } from "./OrdemServicoForm";
import type { Cliente } from "@/types/cliente";
import type { Funcionario } from "@/types/funcionario";
import type { ItemOS, OrdemServico } from "@/types/os";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";

// A aba Fechamento busca notas e caixa no banco; aqui só interessa o rodapé
// do formulário em volta dela (#781), então ela entra vazia.
vi.mock("./FechamentoTab", () => ({ FechamentoTab: () => <div>aba fechamento</div> }));
// O rodapé mostra o lucro previsto (#1087): o operador, o custo gravado e o custo das peças.
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
  { id: "peca-1", descricao: "PNEU 175/70 R14", preco_venda: 400, sem_custo: false },
  // Sem preço de custo: infla o lucro da OS e a comissão do vendedor, e é
  // exatamente o caso que o aviso existe pra pegar na hora do lançamento.
  { id: "peca-2", descricao: "PASTILHA DE FREIO", preco_venda: 180, sem_custo: true },
].map((p) => ({ ...p, ativo: true }) as unknown as PecaJanela);

const servicos = [
  { id: "servico-1", descricao: "Alinhamento", preco_padrao: 60, custo: 20 },
].map((s) => ({ ...s, ativo: true, criado_em: "2026-01-01T00:00:00.000Z" }) as unknown as Servico);

// `Funcionario` tem 30+ campos de RH (documentos, endereço, família) que este
// formulário não usa em nada — só nome e id. O `as unknown as` aqui é
// deliberado: preencher os 30 campos com dado inventado faria o teste parecer
// dizer algo sobre eles, e ainda quebraria a cada campo novo de RH.
const funcionarios = [
  { id: "func-1", loja_id: "loja-1", nome: "Carlos", cargo: "Mecânico", ativo: true },
] as unknown as Funcionario[];

const clientes = [
  {
    id: "cliente-1",
    nome: "Maria da Silva",
    tipo_pessoa: "fisica",
    veiculos: [
      { id: "veiculo-1", cliente_id: "cliente-1", placa: "ABC1D23", modelo: "Ka", km_atual: 82000 },
    ],
  },
] as unknown as Cliente[];

/** Saldo pequeno de propósito: 2 pneus, pra o aviso de estoque ter o que dizer. */
const saldoPorPeca = new Map<string, number>([
  ["peca-1", 2],
  ["peca-2", 10],
]);

function ordemFaturada(): OrdemServico {
  const itens: ItemOS[] = [
    {
      id: "item-1",
      ordem_servico_id: "os-1",
      tipo: "peca",
      peca_id: "peca-1",
      servico_id: null,
      tecnico_id: null,
      descricao: "PNEU 175/70 R14",
      quantidade: 2,
      preco_unitario: 400,
      desconto: 0,
    },
  ];
  return {
    id: "os-1",
    numero: 12,
    loja_id: "loja-1",
    cliente_id: "cliente-1",
    veiculo_id: "veiculo-1",
    status: "faturada",
    km_entrada: 82000,
    descricao_problema: null,
    forma_pagamento: "Pix",
    parcelas: 1,
    data_abertura: "2026-09-01T12:00:00.000Z",
    data_fechamento: "2026-09-02T12:00:00.000Z",
    vendedor_id: null,
    criado_por_id: null,
    atualizado_por_id: null,
    cliente: { nome: "Maria da Silva" },
    itens,
  } as unknown as OrdemServico;
}

function montar(extra: Partial<Parameters<typeof OrdemServicoForm>[0]> = {}) {
  const onSalvarNova = vi.fn().mockResolvedValue(undefined);
  const onSalvarEdicao = vi.fn().mockResolvedValue(undefined);
  const resultado = renderizar(
    <OrdemServicoForm
      clientes={clientes}
      pecas={pecas}
      servicos={servicos}
      funcionarios={funcionarios}
      funcionarioAtualId="func-1"
      ordens={[]}
      saldoPorPeca={saldoPorPeca}
      saldoCarregado
      onSalvarNova={onSalvarNova}
      onSalvarEdicao={onSalvarEdicao}
      onEditarItem={vi.fn().mockResolvedValue(undefined)}
      onEncerrar={vi.fn().mockResolvedValue(undefined)}
      onCadastrarCliente={vi.fn()}
      onCadastrarVeiculo={vi.fn()}
      onCancelar={vi.fn()}
      {...extra}
    />,
  );
  return { ...resultado, onSalvarNova, onSalvarEdicao };
}

/** O campo da busca única de peça e serviço (#1087). */
const buscaDeItens = () => screen.getByRole("combobox", { name: "Buscar peça ou serviço" });

/** Lança um item pela busca: digita e aperta Enter (o que o leitor faz). */
const lancar = (user: ReturnType<typeof montar>["user"], termo: string) =>
  user.type(buscaDeItens(), `${termo}{Enter}`);

/**
 * Escolhe uma opção num Combobox. Não é um `<select>`: abre ao receber foco e
 * escolhe no `mousedown` (ver item 16 da seção 6 do PROJETO_STATUS), então o
 * gesto é clicar no campo e clicar no botão da opção.
 *
 * Os campos são achados pelo TEXTO QUE APARECE DENTRO DELES, e não por posição
 * na lista de `role="combobox"` — a posição muda conforme a OS ganha item, e um
 * teste que depende dela quebra por motivo errado.
 *
 * E é `getByDisplayValue`, não `getByPlaceholderText`, porque um `Combobox` com
 * `opcaoVazia` nunca chega a usar placeholder: enquanto nada está escolhido,
 * ele mostra o rótulo da opção vazia como VALOR do input ("Selecione a peça").
 */
async function escolherNoCombobox(
  user: ReturnType<typeof montar>["user"],
  vazio: string | RegExp,
  rotulo: string,
) {
  await user.click(screen.getAllByDisplayValue(vazio)[0]);
  await user.click(screen.getByRole("button", { name: rotulo }));
}

/** Uma OS nova nasce sem item nenhum: eles entram pela busca. */
const salvar = (user: ReturnType<typeof montar>["user"]) =>
  user.click(screen.getByRole("button", { name: /Abrir ordem de serviço|Salvar alterações/ }));

describe("OrdemServicoForm — a trava de item depois de faturada", () => {
  it("OS faturada não mostra a busca de item, e diz por quê", () => {
    montar({ ordemExistente: ordemFaturada() });

    expect(screen.queryByRole("combobox", { name: "Buscar peça ou serviço" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /adicionar item/ })).not.toBeInTheDocument();
    expect(screen.getByText(/já foi faturada/)).toBeInTheDocument();
    expect(screen.getByText(/mantendo o mesmo total/)).toBeInTheDocument();
  });

  // #1145: a troca de peça ou serviço com o total igual. O banco confere tudo
  // de novo; aqui é só quem vê o botão.
  it("o gerente vê o Trocar peça ou serviço numa OS faturada sem nota", async () => {
    const onTrocarItensFaturada = vi.fn().mockResolvedValue(undefined);
    const { user } = montar({ ordemExistente: ordemFaturada(), gerente: true, onTrocarItensFaturada });

    await user.click(screen.getByRole("button", { name: "Trocar peça ou serviço" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Continua sem o + adicionar item do caminho comum.
    expect(screen.getAllByRole("button", { name: /adicionar item/ })).toHaveLength(1);
  });

  it("quem não é gerente não vê o botão, e lê por quê", () => {
    montar({ ordemExistente: ordemFaturada(), gerente: false, onTrocarItensFaturada: vi.fn() });

    expect(screen.queryByRole("button", { name: "Trocar peça ou serviço" })).not.toBeInTheDocument();
    expect(screen.getByText(/Só quem é gerente/)).toBeInTheDocument();
  });

  it("com nota fiscal emitida, nem o gerente troca", () => {
    montar({
      ordemExistente: ordemFaturada(),
      gerente: true,
      temNotaEmitida: true,
      onTrocarItensFaturada: vi.fn(),
    });

    expect(screen.queryByRole("button", { name: "Trocar peça ou serviço" })).not.toBeInTheDocument();
    expect(screen.getByText(/a nota ficaria diferente da OS/)).toBeInTheDocument();
  });

  it("mostra o histórico das trocas com o motivo", () => {
    montar({
      ordemExistente: ordemFaturada(),
      gerente: true,
      onTrocarItensFaturada: vi.fn(),
      trocas: [
        {
          id: "t1",
          tipo: "troca",
          operador_nome: "Sofia",
          motivo: "medida errada",
          total: 800,
          criado_em: "2026-11-20T15:00:00.000Z",
          itens_antes: [
            { id: "item-1", tipo: "peca", peca_id: "peca-0", servico_id: null, tecnico_id: null,
              descricao: "PNEU 175/70 R13", quantidade: 2, preco_unitario: 400, desconto: 0 },
          ],
          itens_depois: [
            { id: "item-1", tipo: "peca", peca_id: "peca-1", servico_id: null, tecnico_id: null,
              descricao: "PNEU 175/70 R14", quantidade: 2, preco_unitario: 400, desconto: 0 },
          ],
        },
      ],
    });

    expect(screen.getByText("Histórico da OS")).toBeInTheDocument();
    expect(
      screen.getByText(/Troca · Sofia · saiu PNEU 175\/70 R13, entrou PNEU 175\/70 R14 · motivo: medida errada/),
    ).toBeInTheDocument();
  });

  it("OS só concluída AINDA deixa acrescentar item", () => {
    // A trava é só depois de faturada: enquanto o Caixa não foi gravado,
    // acrescentar peça esquecida é o fluxo normal do balcão.
    const concluida = { ...ordemFaturada(), status: "concluida" } as OrdemServico;
    montar({ ordemExistente: concluida });

    expect(buscaDeItens()).toBeInTheDocument();
  });

  it("OS com nota fiscal emitida deixa acrescentar, mas não corrigir o que já foi lançado", () => {
    // São travas diferentes: o que a nota congela é o item JÁ lançado, que é
    // o que está escrito nela.
    const concluida = { ...ordemFaturada(), status: "concluida" } as OrdemServico;
    montar({ ordemExistente: concluida, temNotaEmitida: true });

    expect(screen.getByText(/Cancele a nota em Notas Fiscais/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });
});

describe("OrdemServicoForm — lançar item", () => {
  it("lançar a peça pela busca preenche descrição e preço sozinho", async () => {
    const { user } = montar();

    await lancar(user, "PNEU");

    expect(screen.getByText("PNEU 175/70 R14")).toBeInTheDocument();
    expect(screen.getByLabelText(/Preço de PNEU/)).toHaveValue(400);
  });

  it("trocar o tipo pra Serviço (no item aberto) troca a lista de escolha, e o preço vem do catálogo", async () => {
    // O `<select>` de tipo é controlado na mão — é o caso do valor-sentinela
    // "serviço avulso" descrito na seção 4 do PROJETO_STATUS. Agora mora no
    // "Abrir o item" da linha (#1087).
    const { user } = montar();
    await lancar(user, "PNEU");
    await user.click(screen.getByRole("button", { name: /Abrir o item/ }));

    await user.selectOptions(screen.getByLabelText("Tipo"), "servico");
    await escolherNoCombobox(user, /Serviço avulso/, "Alinhamento");

    expect(screen.getByLabelText(/Preço de Alinhamento/)).toHaveValue(60);
  });

  it("o total do rodapé soma o que já estava lançado com o que está sendo digitado", async () => {
    // O rodapé é a única leitura do valor da OS antes de faturar. A OS de
    // teste já tem R$ 800 de peça; somando um alinhamento de R$ 60, precisa
    // dar R$ 860 — e separado por peças e serviços.
    const concluida = { ...ordemFaturada(), status: "concluida" } as OrdemServico;
    const { user } = montar({ ordemExistente: concluida });

    await lancar(user, "Alinhamento");

    expect(screen.getByText(/Peças\s*R\$\s*800,00/)).toBeInTheDocument();
    expect(screen.getByText(/Serviços\s*R\$\s*60,00/)).toBeInTheDocument();
    // O total é o número grande, com o rótulo em cima (#1087).
    const total = screen.getByText("Total geral").parentElement as HTMLElement;
    expect(total).toHaveTextContent(/R\$\s*860,00/);
  });
});

describe("OrdemServicoForm — os avisos avisam, e não trancam", () => {
  it("quantidade acima do saldo avisa, e o salvar continua funcionando", async () => {
    const { user, onSalvarNova } = montar();
    await escolherNoCombobox(user, "Selecione o cliente", "Maria da Silva");
    await lancar(user, "PNEU");

    const quantidade = screen.getByLabelText(/Quantidade de PNEU/);
    await user.clear(quantidade);
    await user.type(quantidade, "4"); // saldo é 2

    // Diz o saldo, quanto está sendo lançado e quanto vai faltar — um
    // "estoque insuficiente" genérico não ajudaria a decidir nada no balcão.
    expect(
      screen.getByText(/Saldo em estoque: 2\..*Lançando 4, o estoque fica negativo em 2\./),
    ).toBeInTheDocument();

    await salvar(user);
    expect(onSalvarNova).toHaveBeenCalledTimes(1);
  });

  it("peça sem preço de custo avisa na hora do lançamento", async () => {
    // Antes isso só aparecia depois, na tela de Comissões — quando o número
    // já estava errado e a OS já tinha sido paga. Desde a #366 o aviso vem do
    // `sem_custo` da janela (sim/não), sem a tela ler o custo.
    const { user } = montar();

    await lancar(user, "PASTILHA");

    expect(screen.getByText(/sem preço de custo cadastrado/)).toBeInTheDocument();
    expect(screen.getByText(/comissão/)).toBeInTheDocument();
  });

});

describe("OrdemServicoForm — item impossível (as travas da migration 0060)", () => {
  it("desconto maior que o item não chega no banco, e diz qual item e por quê", async () => {
    // O banco recusaria o item — mas a OS nova já teria sido criada sem ele.
    // Por isso a conferência é ANTES de gravar, e com a frase do problema.
    const { user, onSalvarNova } = montar();
    await escolherNoCombobox(user, "Selecione o cliente", "Maria da Silva");
    await lancar(user, "PNEU"); // 400,00

    await user.type(screen.getByLabelText(/Desconto de PNEU/), "500");
    await salvar(user);

    expect(onSalvarNova).not.toHaveBeenCalled();
    expect(screen.getByText(/Item "PNEU 175\/70 R14": O desconto não pode ser maior/)).toBeInTheDocument();
  });
});

describe("OrdemServicoForm — cliente e veículo", () => {
  it("não salva sem cliente", async () => {
    const { user, onSalvarNova } = montar();

    await salvar(user);

    expect(await screen.findByText("Selecione um cliente.")).toBeInTheDocument();
    expect(onSalvarNova).not.toHaveBeenCalled();
  });

  it("cliente com um veículo só já entra com o veículo escolhido", async () => {
    // Item TR-02.5: uma escolha a menos no gesto mais comum do balcão.
    const { user } = montar();

    await escolherNoCombobox(user, "Selecione o cliente", "Maria da Silva");

    // O campo de veículo passa a mostrar a placa do único carro dela, em vez
    // de continuar no "Sem veículo vinculado".
    expect(screen.queryByDisplayValue("Sem veículo vinculado")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue(/ABC1D23/)).toBeInTheDocument();
  });
});

describe("OrdemServicoForm — o rodapé no Fechamento (#781)", () => {
  // O Fechamento só mostra dados: "Cancelar" ali dava a impressão de desfazer
  // alguma coisa. O botão é o mesmo (fecha a OS aberta), só o nome muda.
  it("no Fechamento o botão do rodapé é Voltar; nos Detalhes continua Cancelar", async () => {
    const onCancelar = vi.fn();
    const { user } = montar({ ordemExistente: ordemFaturada(), abaInicial: "fechamento", onCancelar });
    expect(screen.getByText("aba fechamento")).toBeTruthy();
    expect(screen.queryByText("Cancelar", { selector: "button" })).toBeNull();
    await user.click(screen.getByText("Voltar", { selector: "button" }));
    expect(onCancelar).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Detalhes" }));
    expect(screen.getByText("Cancelar", { selector: "button" })).toBeTruthy();
    expect(screen.queryByText("Voltar", { selector: "button" })).toBeNull();
  });
});

/**
 * A barra fixa do rodapé (#781). Ela gruda no pé da janela pra o total ficar à
 * vista, e por isso o que estiver no pé da primeira tela fica atrás dela. A
 * promessa: o campo em que se está digitando nunca fica atrás, e no Fechamento
 * (que só mostra dados) ela nem gruda.
 *
 * O jsdom não desenha nada (toda medida dá zero), então a posição de cada
 * elemento é inventada aqui: a barra de 680 a 740, e o campo onde o teste mandar.
 */
describe("OrdemServicoForm — nada fica atrás da barra fixa (#781)", () => {
  const barra = () => document.querySelector("[data-rodape-da-os]") as HTMLElement;

  const scrollByOriginal = Element.prototype.scrollBy;
  afterEach(() => {
    vi.restoreAllMocks();
    Element.prototype.scrollBy = scrollByOriginal;
  });

  function posicionar(elemento: Element, top: number, bottom: number) {
    vi.spyOn(elemento, "getBoundingClientRect").mockReturnValue({
      top, bottom, left: 0, right: 100, width: 100, height: bottom - top, x: 0, y: top,
      toJSON: () => ({}),
    } as DOMRect);
  }

  // O jsdom não tem área rolável (nada tem altura), então quem rola é a
  // página: é ali que se espia quanto ela subiu.
  function espiarRolagem() {
    const rolar = vi.fn();
    Element.prototype.scrollBy = rolar as unknown as Element["scrollBy"];
    return rolar;
  }

  it("no Fechamento a barra não gruda; nos Detalhes, gruda", async () => {
    const { user } = montar({ ordemExistente: ordemFaturada(), abaInicial: "fechamento" });
    expect(barra().className).not.toMatch(/\bsticky\b/);
    await user.click(screen.getByRole("button", { name: "Detalhes" }));
    expect(barra().className).toMatch(/\bsticky\b/);
  });

  it("campo que recebe o cursor atrás da barra rola pra cima dela", async () => {
    const { user } = montar();
    posicionar(barra(), 680, 740);
    const km = document.querySelector('input[name="km_entrada"]') as HTMLInputElement;
    posicionar(km, 690, 730);
    const rolar = espiarRolagem();
    await user.click(km);
    // Sobe o que o campo invade a barra (730 - 680 = 50) mais um respiro.
    expect(rolar).toHaveBeenCalledWith({ top: 62 });
  });

  it("campo acima da barra não mexe na rolagem", async () => {
    const { user } = montar();
    posicionar(barra(), 680, 740);
    const km = document.querySelector('input[name="km_entrada"]') as HTMLInputElement;
    posicionar(km, 300, 340);
    const rolar = espiarRolagem();
    await user.click(km);
    expect(rolar).not.toHaveBeenCalled();
  });

  // Botão recebe o foco já no "apertar" do mouse: se a tela rolasse ali, o
  // "soltar" cairia em outro lugar e o clique se perdia (o "Remover" de um
  // item meio coberto não removia). Só campo de digitar rola. Desde a #1087 o
  // botão da linha é o "Abrir o item".
  it("botão meio coberto pela barra não rola ao receber o foco", async () => {
    const { user } = montar();
    await lancar(user, "PNEU");
    posicionar(barra(), 680, 740);
    const abrir = screen.getByRole("button", { name: /Abrir o item/ });
    posicionar(abrir, 670, 700);
    const rolar = espiarRolagem();
    await user.click(abrir);
    expect(rolar).not.toHaveBeenCalled();
  });

  // Desde a #1087 o item novo não recebe o cursor (ele volta pra busca, pra o
  // próximo item), então quem precisa subir quando nasce atrás da barra é a
  // própria busca.
  it("a busca de itens, se está atrás da barra, sobe ao receber o cursor", async () => {
    const { user } = montar();
    const busca = buscaDeItens();
    posicionar(barra(), 680, 740);
    posicionar(busca, 700, 730);
    const rolar = espiarRolagem();
    // A busca já abre com o foco (#1087): tira e devolve, como quem volta a ela.
    busca.blur();
    await user.click(busca);
    // A busca de 700 a 730 contra a barra em 680: sobe 62.
    expect(rolar).toHaveBeenCalledWith({ top: 62 });
    expect(busca).toHaveFocus();
  });
});
