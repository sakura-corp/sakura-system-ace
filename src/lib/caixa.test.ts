import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContaPagar } from "@/types/contaPagar";

// As duas mudanças do programa que a migration 0062 (o Caixa só com o
// módulo) exige. Sem elas, as portas estreitas do banco não bastariam:
//   1. lançar no Caixa NÃO pede a linha de volta — senão quem só tem Contas
//      a Pagar seria barrado ao pagar, porque ainda não "enxerga" a saída
//      que acabou de criar;
//   2. "desfazer pagamento" apaga o lançamento ANTES de desligá-lo da conta
//      — na ordem antiga, o `delete` apagava zero linhas pra essa pessoa e
//      a saída ficava órfã no Caixa.
// A outra metade (o banco deixando ou recusando) está em
// supabase/scripts/testar-caixa-permissao.sql.

type Chamada = { tabela: string; passos: string[]; dados?: unknown };
const chamadas: Chamada[] = [];
let linhasApagadas: { id: string }[] = [{ id: "mov-1" }];
let linhasLidas: unknown[] | null = null;

function construtor(tabela: string) {
  const chamada: Chamada = { tabela, passos: [] };
  chamadas.push(chamada);
  const resposta = () => {
    const apagou = chamada.passos.includes("delete");
    return { data: apagou ? linhasApagadas : linhasLidas, error: null };
  };
  const q = {
    insert(dados: unknown) {
      chamada.passos.push("insert");
      chamada.dados = dados;
      return q;
    },
    update(dados: unknown) {
      chamada.passos.push("update");
      chamada.dados = dados;
      return q;
    },
    delete() {
      chamada.passos.push("delete");
      return q;
    },
    select() {
      chamada.passos.push("select");
      return q;
    },
    eq() {
      chamada.passos.push("eq");
      return q;
    },
    then(ok: (v: unknown) => unknown, erro?: (e: unknown) => unknown) {
      return Promise.resolve(resposta()).then(ok, erro);
    },
  };
  return q;
}

vi.mock("./supabase", () => ({ supabase: { from: (t: string) => construtor(t) } }));

const { criarMovimentoCaixa, excluirMovimentoCaixa, listarMovimentosCaixaPorOrdem } = await import("./caixa");
const { desfazerPagamento, pagarConta } = await import("./contasPagar");

const LOJA = "00000000-0000-0000-0000-000000000001";

const conta = {
  id: "conta-1",
  loja_id: LOJA,
  descricao: "Internet",
  valor: 120,
  vencimento: "2026-09-10",
  categoria_id: null,
  recorrente: false,
  recorrente_ate: null,
  status: "paga",
  data_pagamento: "2026-09-10T12:00:00Z",
  caixa_movimento_id: "mov-1",
  operador_id: "op-1",
} as unknown as ContaPagar;

beforeEach(() => {
  chamadas.length = 0;
  linhasApagadas = [{ id: "mov-1" }];
});

describe("criarMovimentoCaixa", () => {
  it("gera o id antes de gravar e não pede a linha de volta", async () => {
    const id = await criarMovimentoCaixa(
      { ordem_servico_id: null, tipo: "saida", forma_pagamento: "pix", valor: 10, descricao: "x", categoria_id: null },
      LOJA,
    );

    const [insercao] = chamadas;
    expect(insercao.tabela).toBe("caixa_movimentos");
    expect(insercao.passos).toEqual(["insert"]);
    expect(insercao.dados).toMatchObject({ id, loja_id: LOJA, tipo: "saida" });
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("pagarConta", () => {
  it("liga a conta ao mesmo id que foi gravado no Caixa", async () => {
    await pagarConta({ conta: { ...conta, status: "pendente", caixa_movimento_id: null }, valorPago: 120, formaPagamento: "pix", operadorId: "op-1" });

    const [lancamento, ligacao] = chamadas;
    expect(lancamento.passos).toEqual(["insert"]);
    expect(ligacao.tabela).toBe("contas_pagar");
    expect(ligacao.dados).toMatchObject({
      status: "paga",
      caixa_movimento_id: (lancamento.dados as { id: string }).id,
    });
  });
});

describe("desfazerPagamento", () => {
  it("apaga o lançamento ANTES de voltar a conta pra pendente", async () => {
    await desfazerPagamento(conta);

    expect(chamadas.map((c) => `${c.tabela}:${c.passos[0]}`)).toEqual([
      "caixa_movimentos:delete",
      "contas_pagar:update",
    ]);
  });

  it("não desliga a conta se o Caixa não apagou nada", async () => {
    linhasApagadas = [];

    await expect(desfazerPagamento(conta)).rejects.toThrow(/não foi apagado/);
    expect(chamadas.some((c) => c.tabela === "contas_pagar")).toBe(false);
  });
});

describe("excluirMovimentoCaixa", () => {
  it("avisa quando o banco apagou zero linhas, em vez de fingir que deu certo", async () => {
    linhasApagadas = [];
    await expect(excluirMovimentoCaixa("mov-1")).rejects.toThrow(/permissão/);
  });
});

describe("listarMovimentosCaixaPorOrdem", () => {
  it("devolve só os PAGAMENTOS da OS: a devolução da correção (#1182) fica de fora", async () => {
    linhasLidas = [
      { id: "e1", tipo: "entrada", valor: 650, forma_pagamento: "pix", ordem_servico_id: "os-1" },
      { id: "s1", tipo: "saida", valor: 50, forma_pagamento: "dinheiro", ordem_servico_id: "os-1" },
    ];
    const movimentos = await listarMovimentosCaixaPorOrdem("os-1");
    expect(movimentos.map((m) => m.id)).toEqual(["e1"]);
  });
});
