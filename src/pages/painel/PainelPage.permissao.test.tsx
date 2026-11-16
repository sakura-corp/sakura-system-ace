// @vitest-environment jsdom
/**
 * Migration 0069: o cadastro de clientes só responde a quem tem o módulo
 * Clientes. O Início usa o cadastro só pros aniversários do calendário, então
 * quem não tem o módulo nem pergunta (e o calendário fica sem aniversários).
 */
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@/testes/tela";
import type { Operador } from "@/types/operador";

const listarClientes = vi.fn();
vi.mock("@/lib/clientes", () => ({ listarClientes: (...a: unknown[]) => listarClientes(...a) }));
const listarOrdens = vi.fn();
vi.mock("@/lib/ordensServico", () => ({ listarOrdens: (...a: unknown[]) => listarOrdens(...a) }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
let movimentosDoBanco: unknown[] = [];
vi.mock("@/lib/caixa", () => ({
  listarMovimentosCaixa: async () => movimentosDoBanco,
  buscarCustoDasOrdens: async () => new Map(),
}));
let contasDoBanco: unknown[] = [];
vi.mock("@/lib/contasPagar", () => ({ listarContasPagar: async () => contasDoBanco }));
vi.mock("@/lib/fechamentoCaixa", () => ({ listarFechamentosCaixa: async () => [] }));
const abrirWhatsappSemNumero = vi.fn();
vi.mock("@/lib/whatsapp", () => ({
  abrirWhatsappSemNumero: (...a: unknown[]) => abrirWhatsappSemNumero(...a),
  abrirConversaWhatsapp: vi.fn(),
}));
vi.mock("@/lib/modelosWhatsapp", async (original) => ({
  ...(await original<typeof import("@/lib/modelosWhatsapp")>()),
  listarModelosWhatsapp: async () => ({}),
  registrarMensagemAberta: vi.fn(),
}));
vi.mock("@/lib/pecas", () => ({ listarPecas: async () => [] }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoFiscal: async () => null,
  buscarConfiguracaoPainelInicio: async () => ["vendas_mes"],
  confirmarAliquotaCompetencia: vi.fn(),
}));

let operador: Partial<Operador> = {};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: { id: "loja-a", nome: "Loja Centro" } }),
}));

const { PainelPage } = await import("./PainelPage");

function montar() {
  return render(
    <MemoryRouter>
      <PainelPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  movimentosDoBanco = [];
  contasDoBanco = [];
  abrirWhatsappSemNumero.mockReset().mockResolvedValue(undefined);
  listarClientes.mockReset();
  listarClientes.mockResolvedValue([]);
  listarOrdens.mockReset();
  listarOrdens.mockResolvedValue([]);
});

describe("PainelPage — permissão pro cadastro de clientes", () => {
  it("NÃO chama listarClientes pra quem não tem o módulo Clientes", async () => {
    operador = { id: "op", admin: false, permissoes: ["ordens_servico"] };
    montar();
    await waitFor(() => expect(listarOrdens).toHaveBeenCalled());
    await screen.findByText(/Início|Painel|Calendário/i);
    expect(listarClientes).not.toHaveBeenCalled();
  });

  it("chama listarClientes pra quem tem o módulo Clientes", async () => {
    operador = { id: "op", admin: false, permissoes: ["clientes"] };
    montar();
    await waitFor(() => expect(listarClientes).toHaveBeenCalledTimes(1));
  });
});

// #367 (migration 0076): a OS só responde a quem tem o módulo Ordens de
// Serviço. Sem ele, o Início nem pede as OS e os dois blocos de OS somem
// (não ficam com "—"); o resto da tela continua.
describe("PainelPage — permissão pra OS", () => {
  it("sem o módulo OS: NÃO chama listarOrdens e os blocos 'OS abertas' e 'Veículos no pátio' somem", async () => {
    operador = { id: "op", admin: false, permissoes: ["clientes"] };
    montar();
    await waitFor(() => expect(listarClientes).toHaveBeenCalled());
    await screen.findByText(/Início|Painel|Calendário/i);
    expect(listarOrdens).not.toHaveBeenCalled();
    expect(screen.queryByText("OS abertas")).toBeNull();
    expect(screen.queryByText("Veículos no pátio")).toBeNull();
  });

  it("com o módulo OS: chama listarOrdens e mostra os dois blocos", async () => {
    operador = { id: "op", admin: false, permissoes: ["ordens_servico"] };
    montar();
    await waitFor(() => expect(listarOrdens).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("OS abertas")).toBeTruthy();
    expect(screen.getByText("Veículos no pátio")).toBeTruthy();
  });
});

// #397: o botão "Resumo pro dono" só pra quem tem Caixa ou Relações (a mesma
// regra dos cartões de dinheiro). Linha que a pessoa não pode ver sai do texto.
describe("PainelPage — resumo pro dono", () => {
  const hoje = new Date();
  const agora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 30).toISOString();

  it("sem Caixa e sem Relações: o botão não aparece", async () => {
    operador = { id: "op", admin: false, permissoes: ["ordens_servico", "contas_pagar"] };
    montar();
    await waitFor(() => expect(listarOrdens).toHaveBeenCalled());
    await screen.findByText("OS abertas");
    expect(screen.queryByText("Resumo pro dono:")).toBeNull();
    expect(screen.queryByRole("button", { name: "Este mês" })).toBeNull();
  });

  it("só com Caixa: aparece, e o texto vem sem contas a pagar e sem OS", async () => {
    operador = { id: "op", admin: false, permissoes: ["caixa"] };
    movimentosDoBanco = [
      { id: "m1", loja_id: "loja-a", data: agora, ordem_servico_id: null, tipo: "entrada", forma_pagamento: "pix", valor: 250, descricao: null, categoria_id: null },
    ];
    const { getByRole } = montar();
    const botao = await waitFor(() => getByRole("button", { name: "Este mês" }));
    botao.click();
    await waitFor(() => expect(abrirWhatsappSemNumero).toHaveBeenCalledTimes(1));
    const texto = String(abrirWhatsappSemNumero.mock.calls[0][0]).replace(/\u00a0/g, " ");
    expect(texto).toContain("Loja Centro");
    expect(texto).toContain("este mês");
    expect(texto).toContain("Recebido: R$ 250,00");
    expect(texto).not.toMatch(/Contas a pagar|OS abertas|Fechamento do caixa/);
  });

  it("com Relações também aparece, e Hoje usa os números do dia", async () => {
    operador = { id: "op", admin: false, permissoes: ["relatorios"] };
    // Um lançamento de hoje e um de outro dia do mês (no dia 1º, um do mês
    // passado): "Hoje" só pode somar o de hoje.
    const outroDia =
      hoje.getDate() > 1
        ? new Date(hoje.getFullYear(), hoje.getMonth(), 1, 12)
        : new Date(hoje.getFullYear(), hoje.getMonth() - 1, 15, 12);
    movimentosDoBanco = [
      { id: "m1", loja_id: "loja-a", data: agora, ordem_servico_id: null, tipo: "entrada", forma_pagamento: "pix", valor: 40, descricao: null, categoria_id: null },
      { id: "m2", loja_id: "loja-a", data: outroDia.toISOString(), ordem_servico_id: null, tipo: "entrada", forma_pagamento: "pix", valor: 1000, descricao: null, categoria_id: null },
    ];
    const { getByRole } = montar();
    const botao = await waitFor(() => getByRole("button", { name: "Hoje" }));
    botao.click();
    await waitFor(() => expect(abrirWhatsappSemNumero).toHaveBeenCalledTimes(1));
    const texto = String(abrirWhatsappSemNumero.mock.calls[0][0]).replace(/\u00a0/g, " ");
    expect(texto).toMatch(/hoje \(\d{2}\/\d{2}\/\d{4}\)/);
    expect(texto).toContain("Recebido: R$ 40,00");
  });

  it("busca os dados de novo na hora do clique (o Início não recarrega sozinho)", async () => {
    operador = { id: "op", admin: false, permissoes: ["caixa"] };
    movimentosDoBanco = [];
    const { getByRole } = montar();
    const botao = await waitFor(() => getByRole("button", { name: "Hoje" }));
    // Uma venda feita em outro computador depois que o Início abriu.
    movimentosDoBanco = [
      { id: "m9", loja_id: "loja-a", data: agora, ordem_servico_id: null, tipo: "entrada", forma_pagamento: "pix", valor: 77, descricao: null, categoria_id: null },
    ];
    botao.click();
    await waitFor(() => expect(abrirWhatsappSemNumero).toHaveBeenCalledTimes(1));
    expect(String(abrirWhatsappSemNumero.mock.calls[0][0]).replace(/\u00a0/g, " ")).toContain("Recebido: R$ 77,00");
  });
});
