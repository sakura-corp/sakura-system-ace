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
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";

// A aba Fechamento busca notas e caixa no banco; aqui só interessa o rodapé
// do formulário em volta dela (#781), então ela entra vazia.
vi.mock("./FechamentoTab", () => ({ FechamentoTab: () => <div>aba fechamento</div> }));

beforeEach(() => localStorage.clear());

const pecas = [
  { id: "peca-1", descricao: "PNEU 175/70 R14", preco_venda: 400, preco_custo: 260 },
  // Sem preço de custo: infla o lucro da OS e a comissão do vendedor, e é
  // exatamente o caso que o aviso existe pra pegar na hora do lançamento.
  { id: "peca-2", descricao: "PASTILHA DE FREIO", preco_venda: 180, preco_custo: null },
].map((p) => ({ ...p, ativo: true, criado_em: "2026-01-01T00:00:00.000Z" }) as unknown as Peca);

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

const adicionarItem = (user: ReturnType<typeof montar>["user"]) =>
  user.click(screen.getByRole("button", { name: /adicionar item/ }));

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

/**
 * O `<select>` de tipo (Peça/Serviço) da PRIMEIRA linha de item. É o único
 * `<select>` nativo do formulário, então dá pra achá-lo pelas opções que ele
 * tem — os outros "combobox" da tela são o componente `Combobox`, que é um
 * `<input>`.
 */
const tipoDoItem = () =>
  screen
    .getAllByRole("combobox")
    .filter((elemento) => elemento.tagName === "SELECT")[0] as HTMLSelectElement;

/** Uma OS nova já nasce com UMA linha de item em branco; uma OS existente, com nenhuma. */
const salvar = (user: ReturnType<typeof montar>["user"]) =>
  user.click(screen.getByRole("button", { name: /Abrir ordem de serviço|Salvar alterações/ }));

describe("OrdemServicoForm — a trava de item depois de faturada", () => {
  it("OS faturada não mostra o + adicionar item, e diz por quê", () => {
    montar({ ordemExistente: ordemFaturada() });

    expect(screen.queryByRole("button", { name: /adicionar item/ })).not.toBeInTheDocument();
    expect(screen.getByText(/já foi faturada/)).toBeInTheDocument();
    expect(screen.getByText(/abra uma OS nova/)).toBeInTheDocument();
  });

  it("OS só concluída AINDA deixa acrescentar item", () => {
    // A trava é só depois de faturada: enquanto o Caixa não foi gravado,
    // acrescentar peça esquecida é o fluxo normal do balcão.
    const concluida = { ...ordemFaturada(), status: "concluida" } as OrdemServico;
    montar({ ordemExistente: concluida });

    expect(screen.getByRole("button", { name: /adicionar item/ })).toBeInTheDocument();
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
  it("escolher a peça preenche descrição e preço sozinho", async () => {
    const { user } = montar();

    await escolherNoCombobox(user, "Selecione a peça", "PNEU 175/70 R14");

    expect(screen.getByLabelText(/Preço unitário/)).toHaveValue(400);
  });

  it("trocar o tipo pra Serviço troca a lista de escolha, e o preço vem do catálogo", async () => {
    // O `<select>` de tipo é controlado na mão — é o caso do valor-sentinela
    // "serviço avulso" descrito na seção 4 do PROJETO_STATUS.
    const { user } = montar();

    await user.selectOptions(tipoDoItem(), "servico");
    await escolherNoCombobox(user, /Serviço avulso/, "Alinhamento");

    expect(screen.getByLabelText(/Preço unitário/)).toHaveValue(60);
  });

  it("o total do rodapé soma o que já estava lançado com o que está sendo digitado", async () => {
    // O rodapé é a única leitura do valor da OS antes de faturar. A OS de
    // teste já tem R$ 800 de peça; somando um alinhamento de R$ 60, precisa
    // dar R$ 860 — e separado por peças e serviços.
    const concluida = { ...ordemFaturada(), status: "concluida" } as OrdemServico;
    const { user } = montar({ ordemExistente: concluida });
    await adicionarItem(user);

    await user.selectOptions(tipoDoItem(), "servico");
    await escolherNoCombobox(user, /Serviço avulso/, "Alinhamento");

    expect(screen.getByText(/Peças\s*R\$\s*800,00/)).toBeInTheDocument();
    expect(screen.getByText(/Serviços\s*R\$\s*60,00/)).toBeInTheDocument();
    expect(screen.getByText(/Total geral\s*R\$\s*860,00/)).toBeInTheDocument();
  });
});

describe("OrdemServicoForm — os avisos avisam, e não trancam", () => {
  it("quantidade acima do saldo avisa, e o salvar continua funcionando", async () => {
    const { user, onSalvarNova } = montar();
    await escolherNoCombobox(user, "Selecione o cliente", "Maria da Silva");
    await escolherNoCombobox(user, "Selecione a peça", "PNEU 175/70 R14");

    const quantidade = screen.getByLabelText(/Quantidade/);
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
    // já estava errado e a OS já tinha sido paga.
    const { user } = montar();

    await escolherNoCombobox(user, "Selecione a peça", "PASTILHA DE FREIO");

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
    await escolherNoCombobox(user, "Selecione a peça", "PNEU 175/70 R14"); // 400,00

    await user.type(screen.getByLabelText(/Desconto/), "500");
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

  it("o item recém-adicionado recebe o cursor e, se nasceu atrás da barra, sobe", async () => {
    const { user } = montar();
    const botao = screen.getByRole("button", { name: /adicionar item/ });
    // A barra de 680 a 740, o botão à vista (600 a 630), e o resto (o item
    // que vai nascer) atrás da barra, de 700 a 730.
    const rolar = espiarRolagem();
    const caixa = (top: number, bottom: number) =>
      ({ top, bottom, left: 0, right: 100, width: 100, height: bottom - top, x: 0, y: top,
         toJSON: () => ({}) }) as DOMRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.hasAttribute("data-rodape-da-os")) return caixa(680, 740);
      if (this === botao) return caixa(600, 630);
      return caixa(700, 730);
    });
    const antes = document.activeElement;
    await user.click(botao);
    const focado = document.activeElement as HTMLElement;
    expect(focado).not.toBe(antes);
    expect(focado).not.toBe(botao);
    // O campo novo nasceu de 700 a 730, contra a barra em 680: sobe 62.
    expect(rolar).toHaveBeenCalledWith({ top: 62 });
  });
});
