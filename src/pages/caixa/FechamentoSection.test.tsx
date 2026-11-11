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
import { renderizar, screen } from "@/testes/tela";
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
vi.mock("@/lib/modelosWhatsapp", async (original) => ({
  ...(await original<typeof import("@/lib/modelosWhatsapp")>()),
  listarModelosWhatsapp: async () => ({}),
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

beforeEach(() => {
  fecharCaixa.mockReset().mockResolvedValue("novo-id");
  desfazerFechamentoCaixa.mockReset().mockResolvedValue(undefined);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  abrirWhatsappSemNumero.mockReset().mockResolvedValue(undefined);
  listarOrdens.mockReset().mockResolvedValue([{ id: "o1", status: "em_andamento" }]);
  listarContasPagar.mockReset().mockResolvedValue([]);
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

    await user.type(screen.getByLabelText("Quanto tem na gaveta agora (contado)"), "200");
    expect(screen.getByText(/Faltam R\$ 30,00/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Fechar o caixa de/ }));

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
    await user.click(screen.getByRole("button", { name: /^Fechar o caixa de/ }));
    expect(fecharCaixa).not.toHaveBeenCalled();
    expect(screen.getByText(/Informe quanto tem na gaveta/)).toBeInTheDocument();
  });

  it("desistir na confirmação não fecha nada", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { user } = renderizar(
      <FechamentoSection lojaId="l" movimentos={[]} custoDasOrdens={new Map()} fechamentos={[]} podeDesfazer={false} onAtualizado={vi.fn()} />,
    );
    await user.type(screen.getByLabelText("Quanto tem na gaveta agora (contado)"), "0");
    await user.click(screen.getByRole("button", { name: /^Fechar o caixa de/ }));
    expect(fecharCaixa).not.toHaveBeenCalled();
  });

  it("avisa do lançamento sem forma de pagamento, que ficou fora da conta", () => {
    renderizar(
      <FechamentoSection
        lojaId="l"
        custoDasOrdens={new Map()}
        movimentos={[mov("a", "saida", 45, null)]}
        fechamentos={[]}
        podeDesfazer={false}
        onAtualizado={vi.fn()}
      />,
    );
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
});
