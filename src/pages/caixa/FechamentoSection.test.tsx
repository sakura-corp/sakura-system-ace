// @vitest-environment jsdom
/**
 * Teste de TELA do fechamento de caixa (item TR-06.4).
 *
 * As contas estão testadas em schemas/fechamentoCaixa.test.ts. O que só a
 * tela prova é a costura: o que ela MANDA pro banco é o mesmo que ela
 * MOSTROU — o esperado da tela, o contado digitado, o troco sugerido e o
 * momento do lançamento. É nessa costura que este projeto costuma errar
 * (a conta certa, usada com o campo errado — §6 item 62).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import { hojeLocal } from "@/lib/datas";
import type { MovimentoCaixa } from "@/types/caixa";
import type { FechamentoCaixa } from "@/types/fechamentoCaixa";

const fecharCaixa = vi.fn();
const desfazerFechamentoCaixa = vi.fn();
vi.mock("@/lib/fechamentoCaixa", () => ({
  fecharCaixa: (...a: unknown[]) => fecharCaixa(...a),
  desfazerFechamentoCaixa: (...a: unknown[]) => desfazerFechamentoCaixa(...a),
}));

// Resumo pro dono (#397): o WhatsApp, as OS, as contas e os modelos.
const abrirWhatsappSemNumero = vi.fn();
vi.mock("@/lib/whatsapp", () => ({
  abrirWhatsappSemNumero: (...a: unknown[]) => abrirWhatsappSemNumero(...a),
}));
const listarOrdens = vi.fn();
vi.mock("@/lib/ordensServico", () => ({ listarOrdens: (...a: unknown[]) => listarOrdens(...a) }));
const listarContasPagar = vi.fn();
vi.mock("@/lib/contasPagar", () => ({ listarContasPagar: (...a: unknown[]) => listarContasPagar(...a) }));
const listarModelosWhatsapp = vi.fn();
vi.mock("@/lib/modelosWhatsapp", async (original) => ({
  ...(await original<typeof import("@/lib/modelosWhatsapp")>()),
  listarModelosWhatsapp: (...a: unknown[]) => listarModelosWhatsapp(...a),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
let operador: Record<string, unknown> | null = { id: "op", admin: true, permissoes: [] };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: { id: "l", nome: "Loja Centro" } }),
}));

const { FechamentoSection } = await import("./FechamentoSection");
const { diferencaDoFechamento } = await import("@/schemas/fechamentoCaixa");

/** O texto que foi pro WhatsApp, com o espaço do "R$ " trocado por um comum. */
function textoAberto(): string {
  return String(abrirWhatsappSemNumero.mock.calls[0][0]).replace(/\u00a0/g, " ");
}

const hoje = hojeLocal();
const agora = new Date().toISOString();

function mov(id: string, tipo: "entrada" | "saida", valor: number, forma: string | null, data = agora): MovimentoCaixa {
  return { id, loja_id: "l", data, ordem_servico_id: null, tipo, forma_pagamento: forma, valor, descricao: null, categoria_id: null };
}

function fechamento(dados: Partial<FechamentoCaixa>): FechamentoCaixa {
  return {
    id: "f1",
    loja_id: "l",
    data: "2026-09-01",
    fundo_troco: 100,
    saldo_sistema: 500,
    valor_contado: 500,
    diferenca: 0,
    totais_por_forma: {},
    observacao: null,
    caixa_movimento_id: null,
    operador_id: null,
    criado_em: "2026-09-01T21:00:00Z",
    ...dados,
  };
}

/** #1090: o fechamento anda em 4 passos. Leva do passo 1 até o passo pedido. */
async function irAte(user: ReturnType<typeof renderizar>["user"], passo: "contar" | "pix" | "conferir") {
  await user.click(screen.getByRole("button", { name: "Contar a gaveta" }));
  if (passo === "contar") return;
  await user.click(screen.getByRole("button", { name: "Ver Pix e cartão" }));
  if (passo === "pix") return;
  await user.click(screen.getByRole("button", { name: "Conferir e fechar" }));
}

/** O último clique: "Fechar o caixa de…" e o "Fechar caixa" da janela do programa. */
async function fecharEConfirmar(user: ReturnType<typeof renderizar>["user"]) {
  await user.click(screen.getByRole("button", { name: /^Fechar o caixa de/ }));
  const janela = screen.getByRole("dialog", { name: /^Fechar o caixa de/ });
  await user.click(within(janela).getByRole("button", { name: "Fechar caixa" }));
}

beforeEach(() => {
  fecharCaixa.mockReset().mockResolvedValue("novo-id");
  desfazerFechamentoCaixa.mockReset().mockResolvedValue(undefined);
  // #1090: o Caixa não usa mais o confirm() do navegador. Se alguém chamar,
  // o teste "nenhum confirm()" pega.
  window.confirm = vi.fn(() => {
    throw new Error("confirm() do navegador no Caixa");
  });
  abrirWhatsappSemNumero.mockReset().mockResolvedValue(undefined);
  listarOrdens.mockReset().mockResolvedValue([{ id: "o1", status: "em_andamento" }]);
  listarContasPagar.mockReset().mockResolvedValue([]);
  listarModelosWhatsapp.mockReset().mockResolvedValue({});
  operador = { id: "op", admin: true, permissoes: [] };
});

describe("FechamentoSection", () => {
  it("manda pro banco exatamente o que mostrou: esperado, contado e troco sugerido", async () => {
    const onAtualizado = vi.fn().mockResolvedValue(undefined);
    const { user } = renderizar(
      <FechamentoSection
        lojaId="l"
        custoDasOrdens={new Map()}
        movimentos={[
          mov("a", "entrada", 150, "dinheiro"),
          mov("b", "saida", 20, "dinheiro"),
          mov("c", "entrada", 999, "pix"),
        ]}
        // o fechamento anterior deixa o troco de R$ 100 sugerido
        fechamentos={[fechamento({ data: "2020-01-01", fundo_troco: 100 })]}
        podeDesfazer={false}
        onAtualizado={onAtualizado}
      />,
    );

    // 100 + 150 − 20; o Pix fica de fora
    expect(screen.getByText("R$ 230,00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("100")).toBeInTheDocument();

    await irAte(user, "contar");
    await user.type(screen.getByLabelText("Quanto tem na gaveta agora (contado)"), "200");
    expect(screen.getByText(/Faltam R\$ 30,00/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver Pix e cartão" }));
    await user.click(screen.getByRole("button", { name: "Conferir e fechar" }));
    await fecharEConfirmar(user);

    expect(fecharCaixa).toHaveBeenCalledTimes(1);
    expect(fecharCaixa.mock.calls[0][0]).toMatchObject({
      lojaId: "l",
      data: hoje,
      fundoTroco: 100,
      esperado: 230,
      contado: 200,
      momento: null,
      totais: { dinheiro: 130, pix: 999 },
    });
    expect(onAtualizado).toHaveBeenCalled();
  });

  it("não fecha sem o valor contado", async () => {
    const { user } = renderizar(
      <FechamentoSection lojaId="l" movimentos={[]} custoDasOrdens={new Map()} fechamentos={[]} podeDesfazer={false} onAtualizado={vi.fn()} />,
    );
    // #1090: sem o contado, o passo 2 não deixa seguir (e o "Fechar" nem aparece).
    await irAte(user, "contar");
    await user.click(screen.getByRole("button", { name: "Ver Pix e cartão" }));
    expect(fecharCaixa).not.toHaveBeenCalled();
    expect(screen.getByText(/Informe quanto tem na gaveta/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Fechar o caixa de/ })).not.toBeInTheDocument();
  });

  it("desistir na confirmação não fecha nada", async () => {
    const { user } = renderizar(
      <FechamentoSection lojaId="l" movimentos={[]} custoDasOrdens={new Map()} fechamentos={[]} podeDesfazer={false} onAtualizado={vi.fn()} />,
    );
    await irAte(user, "contar");
    await user.type(screen.getByLabelText("Quanto tem na gaveta agora (contado)"), "0");
    await user.click(screen.getByRole("button", { name: "Ver Pix e cartão" }));
    await user.click(screen.getByRole("button", { name: "Conferir e fechar" }));
    await user.click(screen.getByRole("button", { name: /^Fechar o caixa de/ }));
    await user.click(within(screen.getByRole("dialog", { name: /^Fechar o caixa de/ })).getByRole("button", { name: "Cancelar" }));
    expect(fecharCaixa).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("avisa do lançamento sem forma de pagamento, que ficou fora da conta", async () => {
    const { user } = renderizar(
      <FechamentoSection
        lojaId="l"
        custoDasOrdens={new Map()}
        movimentos={[mov("a", "saida", 45, null)]}
        fechamentos={[]}
        podeDesfazer={false}
        onAtualizado={vi.fn()}
      />,
    );
    // #1090: o aviso fica no passo de contar, ao lado da diferença que ele explica.
    await irAte(user, "contar");
    expect(screen.getByText(/sem forma de pagamento/)).toBeInTheDocument();
  });

  it("dia fechado: mostra o que faltou, marca o que entrou depois, e só admin vê o desfazer", () => {
    const fechado = fechamento({
      data: hoje,
      saldo_sistema: 845,
      valor_contado: 832.5,
      diferenca: -12.5,
      caixa_movimento_id: "quebra",
      criado_em: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    const props = {
      lojaId: "l",
      custoDasOrdens: new Map(),
      movimentos: [mov("quebra", "saida", 12.5, "dinheiro"), mov("tarde", "entrada", 70, "dinheiro")],
      fechamentos: [fechado],
      onAtualizado: vi.fn(),
    };
    const { unmount } = renderizar(<FechamentoSection {...props} podeDesfazer={false} />);
    expect(screen.getByText("Faltou")).toBeInTheDocument();
    expect(screen.getByText(/1 lançamento entrou depois do fechamento/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desfazer fechamento" })).not.toBeInTheDocument();
    unmount();

    renderizar(<FechamentoSection {...props} podeDesfazer />);
    expect(screen.getByRole("button", { name: "Desfazer fechamento" })).toBeInTheDocument();
  });

  it("resumo pro dono: só depois de fechar, e a diferença é a da tela, com o sinal certo", async () => {
    const fechado = fechamento({ data: hoje, saldo_sistema: 845, valor_contado: 832.5, diferenca: -12.5 });
    const { user } = renderizar(
      <FechamentoSection
        lojaId="l"
        custoDasOrdens={new Map()}
        movimentos={[mov("a", "entrada", 150, "dinheiro")]}
        fechamentos={[fechado]}
        podeDesfazer={false}
        onAtualizado={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Resumo pro dono" }));
    expect(abrirWhatsappSemNumero).toHaveBeenCalledTimes(1);
    const texto = textoAberto();
    expect(diferencaDoFechamento(845, 832.5)).toBe(-12.5);
    expect(texto).toContain("Fechamento do caixa: faltaram R$ 12,50");
    expect(texto).toContain("Recebido: R$ 150,00");
    expect(texto).toContain("OS abertas: 1");
    expect(texto).toContain("Loja Centro");
  });

  it("resumo pro dono: sobra sai como sobra", async () => {
    const fechado = fechamento({ data: hoje, saldo_sistema: 100, valor_contado: 105, diferenca: 5 });
    const { user } = renderizar(
      <FechamentoSection lojaId="l" custoDasOrdens={new Map()} movimentos={[]} fechamentos={[fechado]} podeDesfazer={false} onAtualizado={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "Resumo pro dono" }));
    expect(textoAberto()).toContain("Fechamento do caixa: sobraram R$ 5,00");
  });

  it("resumo pro dono: não aparece antes de fechar o dia", () => {
    renderizar(
      <FechamentoSection lojaId="l" custoDasOrdens={new Map()} movimentos={[]} fechamentos={[]} podeDesfazer={false} onAtualizado={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "Resumo pro dono" })).not.toBeInTheDocument();
  });

  it("resumo pro dono: só com Caixa, sem buscar OS nem contas, e as duas linhas somem", async () => {
    operador = { id: "op", admin: false, permissoes: ["caixa"] };
    const fechado = fechamento({ data: hoje, saldo_sistema: 100, valor_contado: 100, diferenca: 0 });
    const { user } = renderizar(
      <FechamentoSection lojaId="l" custoDasOrdens={new Map()} movimentos={[]} fechamentos={[fechado]} podeDesfazer={false} onAtualizado={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "Resumo pro dono" }));
    const texto = textoAberto();
    expect(listarOrdens).not.toHaveBeenCalled();
    expect(listarContasPagar).not.toHaveBeenCalled();
    expect(texto).not.toMatch(/OS abertas|Contas a pagar/);
    expect(texto).toContain("Fechamento do caixa: bateu certinho");
  });

  it("resumo pro dono: usa o texto que a loja editou em Configurações", async () => {
    listarModelosWhatsapp.mockResolvedValue({ resumo_dono: "Chefe, {periodo}: {diferenca_caixa}" });
    const fechado = fechamento({ data: hoje, saldo_sistema: 100, valor_contado: 90, diferenca: -10 });
    const { user } = renderizar(
      <FechamentoSection lojaId="l" custoDasOrdens={new Map()} movimentos={[]} fechamentos={[fechado]} podeDesfazer={false} onAtualizado={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "Resumo pro dono" }));
    expect(listarModelosWhatsapp).toHaveBeenCalledWith("l");
    expect(textoAberto()).toMatch(/^Chefe, hoje \(\d{2}\/\d{2}\/\d{4}\): faltaram R\$ 10,00$/);
  });

  it("histórico (visual novo): cada dia diz Faltou/Sobrou/Bateu, e a soma é saldo com sinal, sem 'Faltaram'", () => {
    const dias = [
      fechamento({ id: "a", data: "2026-09-03", saldo_sistema: 500, valor_contado: 450, diferenca: -50 }),
      fechamento({ id: "b", data: "2026-09-02", saldo_sistema: 300, valor_contado: 320, diferenca: 20 }),
      fechamento({ id: "c", data: "2026-09-01", diferenca: 0 }),
    ];
    renderizar(
      <FechamentoSection lojaId="l" custoDasOrdens={new Map()} movimentos={[]} fechamentos={dias} podeDesfazer={false} onAtualizado={vi.fn()} />,
    );
    const rodape = screen.getByText(/Soma das diferenças destes 3 dias/).closest("tr")!;
    const texto = (el: Element) => el.textContent!.replace(/\u00a0/g, " ");
    // Faltou 50 num dia e sobrou 20 noutro: o saldo é −30, mostrado como
    // número com sinal. "Faltaram R$ 30,00" faria parecer que faltou 30 no total.
    expect(texto(rodape)).toContain("−R$ 30,00");
    expect(texto(rodape)).not.toMatch(/Faltaram|Sobraram/);
    const linhas = screen.getAllByRole("row");
    expect(texto(linhas.find((l) => l.textContent!.includes("03/09/2026"))!)).toContain("Faltou R$ 50,00");
    expect(texto(linhas.find((l) => l.textContent!.includes("02/09/2026"))!)).toContain("Sobrou R$ 20,00");
    expect(texto(linhas.find((l) => l.textContent!.includes("01/09/2026"))!)).toContain("Bateu");
  });

  it("a região que anuncia a diferença já está na tela antes do primeiro número", async () => {
    const { user, container } = renderizar(
      <FechamentoSection lojaId="l" custoDasOrdens={new Map()} movimentos={[]} fechamentos={[]} podeDesfazer={false} onAtualizado={vi.fn()} />,
    );
    await irAte(user, "contar");
    const regiao = container.querySelector('[aria-live="polite"]');
    expect(regiao).not.toBeNull();
    expect(regiao!.textContent).toBe("");
    await user.type(screen.getByLabelText("Quanto tem na gaveta agora (contado)"), "0");
    expect(container.querySelector('[aria-live="polite"]')).toBe(regiao);
    expect(regiao!.textContent).toContain("Bateu certinho");
  });

  // ------------------------------------------------------------ #1090
  it("os 4 passos têm nome, e a trilha diz em qual se está", async () => {
    const { user } = renderizar(
      <FechamentoSection lojaId="l" custoDasOrdens={new Map()} movimentos={[]} fechamentos={[]} podeDesfazer={false} onAtualizado={vi.fn()} />,
    );
    const trilha = screen.getByRole("list", { name: "Fechar o caixa" });
    const passos = within(trilha).getAllByRole("listitem");
    expect(passos.map((p) => p.textContent!.replace(/^\d?Passo \d: /, "").replace(/ \(feito.*$/, ""))).toEqual([
      "Troco da manhã",
      "Contar a gaveta",
      "Pix e cartão",
      "Conferir e fechar",
    ]);
    expect(passos[0]).toHaveAttribute("aria-current", "step");
    await irAte(user, "contar");
    expect(within(trilha).getAllByRole("listitem")[1]).toHaveAttribute("aria-current", "step");
    // o passo feito vira botão pra voltar nele
    await user.click(within(trilha).getByRole("button", { name: /Troco da manhã/ }));
    expect(screen.getByLabelText("Troco que já estava na gaveta ao abrir")).toBeInTheDocument();
  });

  it("Enter no troco já leva pro passo de contar", async () => {
    const { user } = renderizar(
      <FechamentoSection lojaId="l" custoDasOrdens={new Map()} movimentos={[]} fechamentos={[]} podeDesfazer={false} onAtualizado={vi.fn()} />,
    );
    await user.type(screen.getByLabelText("Troco que já estava na gaveta ao abrir"), "50{Enter}");
    expect(screen.getByLabelText("Quanto tem na gaveta agora (contado)")).toBeInTheDocument();
  });

  it("primeiro fechamento: pede o troco ao abrir; com fechamento anterior, não", () => {
    const props = { lojaId: "l", custoDasOrdens: new Map(), movimentos: [], podeDesfazer: false, onAtualizado: vi.fn() };
    const { unmount } = renderizar(<FechamentoSection {...props} fechamentos={[]} />);
    expect(screen.getByText(/diga quanto tinha na gaveta ao abrir/)).toBeInTheDocument();
    unmount();

    renderizar(<FechamentoSection {...props} fechamentos={[fechamento({ data: "2020-01-01", fundo_troco: 80 })]} />);
    expect(screen.queryByText(/diga quanto tinha na gaveta ao abrir/)).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("80")).toBeInTheDocument();
  });

  it("ajuda pra contar as notas: a soma vai pro contado, a diferença sai em palavras, e é ela que vai pro banco", async () => {
    const { user } = renderizar(
      <FechamentoSection
        lojaId="l"
        custoDasOrdens={new Map()}
        movimentos={[mov("a", "entrada", 130, "dinheiro")]}
        fechamentos={[fechamento({ data: "2020-01-01", fundo_troco: 100 })]}
        podeDesfazer={false}
        onAtualizado={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    await irAte(user, "contar");
    await user.click(screen.getByRole("button", { name: "Ajuda pra contar as notas" }));
    await user.type(screen.getByLabelText("Notas de R$ 100"), "2");
    await user.type(screen.getByLabelText("Notas de R$ 20"), "1");
    await user.type(screen.getByLabelText("Moedas (o valor)"), "0,50");
    // 100 + 130 = 230 esperado; contado 220,50
    expect(screen.getByLabelText("Quanto tem na gaveta agora (contado)")).toHaveValue(220.5);
    expect(screen.getByText(/Faltam R\$ 9,50/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver Pix e cartão" }));
    await user.click(screen.getByRole("button", { name: "Conferir e fechar" }));
    await fecharEConfirmar(user);
    expect(fecharCaixa.mock.calls[0][0]).toMatchObject({ esperado: 230, contado: 220.5 });
  });

  it("sobra em amarelo com a palavra, e o que acontece com ela", async () => {
    const { user } = renderizar(
      <FechamentoSection lojaId="l" custoDasOrdens={new Map()} movimentos={[]} fechamentos={[]} podeDesfazer={false} onAtualizado={vi.fn()} />,
    );
    await irAte(user, "contar");
    await user.type(screen.getByLabelText("Quanto tem na gaveta agora (contado)"), "5");
    expect(screen.getByText(/^Sobram R\$\s5,00$/)).toBeInTheDocument();
    expect(screen.getByText(/vira uma Entrada "Sobra de caixa"/)).toBeInTheDocument();
  });

  it("desfazer o fechamento pergunta na janela do programa, com o dia no título", async () => {
    const fechado = fechamento({ data: hoje, diferenca: -12.5, caixa_movimento_id: "quebra" });
    const { user } = renderizar(
      <FechamentoSection lojaId="l" custoDasOrdens={new Map()} movimentos={[]} fechamentos={[fechado]} podeDesfazer onAtualizado={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "Desfazer fechamento" }));
    let janela = screen.getByRole("dialog", { name: /^Desfazer o fechamento de \d{2}\/\d{2}\/\d{4}\?$/ });
    expect(within(janela).getByText(/quebra de caixa/)).toBeInTheDocument();
    await user.click(within(janela).getByRole("button", { name: "Cancelar" }));
    expect(desfazerFechamentoCaixa).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Desfazer fechamento" }));
    janela = screen.getByRole("dialog", { name: /^Desfazer o fechamento de/ });
    await user.click(within(janela).getByRole("button", { name: "Desfazer fechamento" }));
    expect(desfazerFechamentoCaixa).toHaveBeenCalledWith("f1");
  });

  it("nenhum confirm() do navegador: fechar e desfazer passam só pela janela do programa", async () => {
    const { user } = renderizar(
      <FechamentoSection lojaId="l" custoDasOrdens={new Map()} movimentos={[]} fechamentos={[]} podeDesfazer={false} onAtualizado={vi.fn()} />,
    );
    await irAte(user, "contar");
    await user.type(screen.getByLabelText("Quanto tem na gaveta agora (contado)"), "0");
    await user.click(screen.getByRole("button", { name: "Ver Pix e cartão" }));
    await user.click(screen.getByRole("button", { name: "Conferir e fechar" }));
    await fecharEConfirmar(user);
    expect(window.confirm).not.toHaveBeenCalled();
    expect(fecharCaixa).toHaveBeenCalledTimes(1);
  });

  it("avisa quem está em volta quando há valor digitado (pro Esc perguntar antes de fechar)", async () => {
    const aoMudarRascunho = vi.fn();
    const { user, unmount } = renderizar(
      <FechamentoSection
        lojaId="l"
        custoDasOrdens={new Map()}
        movimentos={[]}
        fechamentos={[]}
        podeDesfazer={false}
        onAtualizado={vi.fn()}
        aoMudarRascunho={aoMudarRascunho}
      />,
    );
    expect(aoMudarRascunho).not.toHaveBeenLastCalledWith(true);
    await irAte(user, "contar");
    await user.type(screen.getByLabelText("Quanto tem na gaveta agora (contado)"), "10");
    expect(aoMudarRascunho).toHaveBeenLastCalledWith(true);
    unmount();
    expect(aoMudarRascunho).toHaveBeenLastCalledWith(false);
  });
});
