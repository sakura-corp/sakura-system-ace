import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NovoItemOS } from "@/types/os";

// A gravação da venda de balcão (item FN-09). O que se testa aqui é a falha
// pela metade, que é onde uma venda de balcão custaria caro: o cliente está
// no balcão e o reflexo de quem vê erro é clicar de novo.
//   • falhou antes do pagamento → a venda some inteira (tentar de novo é
//     seguro, e o estoque não foi mexido);
//   • falhou no pagamento → a venda FICA, e o erro diz pra faturar a que já
//     existe — registrar outra baixaria o estoque duas vezes.

type Chamada = { tabela: string; passos: string[]; dados?: unknown };
const chamadas: Chamada[] = [];
const falharEm = new Set<string>();

const vendaGravada = {
  id: "venda-1",
  numero: 17,
  tipo: "venda_balcao",
  loja_id: "loja-1",
  cliente_id: "consumidor",
  status: "concluida",
};

function construtor(tabela: string) {
  const chamada: Chamada = { tabela, passos: [] };
  chamadas.push(chamada);
  const resposta = () => {
    const chave = `${tabela}:${chamada.passos[0]}`;
    if (falharEm.has(chave)) return { data: null, error: { message: `falhou ${chave}` } };
    if (tabela === "ordens_servico" && chamada.passos.includes("single")) {
      return { data: vendaGravada, error: null };
    }
    return { data: null, error: null };
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
    single() {
      chamada.passos.push("single");
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

// Faturar é uma função do banco (#803): o fake só guarda o que a lib mandou.
const rpcs: { nome: string; args: Record<string, unknown> }[] = [];
vi.mock("./supabase", () => ({
  supabase: {
    from: (t: string) => construtor(t),
    rpc: async (nome: string, args: Record<string, unknown>) => {
      rpcs.push({ nome, args });
      return { data: null, error: null };
    },
  },
}));
vi.mock("./depositos", () => ({ buscarDepositoPadraoId: async () => "deposito-1" }));

const caixa = vi.hoisted(() => ({ lancamentos: [] as unknown[], falhar: false }));
vi.mock("./caixa", () => ({
  criarMovimentoCaixa: async (mov: unknown) => {
    if (caixa.falhar) throw new Error("sem rede");
    caixa.lancamentos.push(mov);
  },
}));
vi.mock("./contasReceber", () => ({ criarContaReceber: async () => undefined }));

const { registrarVendaBalcao, VendaSemFaturamentoError } = await import("./ordensServico");

const itens: NovoItemOS[] = [
  {
    tipo: "peca",
    peca_id: "palheta",
    servico_id: null,
    tecnico_id: null,
    descricao: "Palheta",
    quantidade: 2,
    preco_unitario: 35,
    desconto: 0,
  },
];
const pagamento = {
  pagamentos: [{ formaPagamento: "pix", valor: 70 }],
  parcelas: 1,
  previsaoRecebimento: null,
};

function registrar() {
  return registrarVendaBalcao(
    { cliente_id: "consumidor", vendedor_id: "func-1" },
    itens,
    pagamento,
    "op-1",
    "loja-1",
  );
}

beforeEach(() => {
  chamadas.length = 0;
  rpcs.length = 0;
  falharEm.clear();
  caixa.lancamentos.length = 0;
  caixa.falhar = false;
});

describe("registrarVendaBalcao", () => {
  it("grava a venda marcada como venda de balcão, já concluída e sem veículo", async () => {
    await registrar();
    const insert = chamadas.find((c) => c.tabela === "ordens_servico" && c.passos[0] === "insert");
    expect(insert?.dados).toMatchObject({
      tipo: "venda_balcao",
      status: "concluida",
      veiculo_id: null,
      cliente_id: "consumidor",
      vendedor_id: "func-1",
      loja_id: "loja-1",
    });
  });

  it("baixa o estoque com a referência da venda, não de uma OS", async () => {
    await registrar();
    const estoque = chamadas.find((c) => c.tabela === "estoque_movimentos");
    expect(estoque?.dados).toEqual([expect.objectContaining({ referencia: "Venda 17", quantidade: 2 })]);
  });

  it("fatura na hora: a entrada no caixa diz que é a Venda 17", async () => {
    await registrar();
    expect(caixa.lancamentos).toEqual([
      expect.objectContaining({ descricao: "Faturamento da Venda 17", valor: 70, ordem_servico_id: "venda-1" }),
    ]);
  });

  it("marca a venda como faturada pelo banco, mandando o total dos itens e o operador", async () => {
    await registrar();
    expect(rpcs).toEqual([
      {
        nome: "marcar_ordem_faturada",
        args: expect.objectContaining({ p_ordem: "venda-1", p_total_da_tela: 70, p_operador: "op-1" }),
      },
    ]);
  });

  it("se os itens não gravam, a venda é desfeita inteira", async () => {
    falharEm.add("ordens_servico_itens:insert");
    await expect(registrar()).rejects.toMatchObject({ message: "falhou ordens_servico_itens:insert" });
    const apagou = chamadas.find((c) => c.tabela === "ordens_servico" && c.passos[0] === "delete");
    expect(apagou).toBeDefined();
    expect(chamadas.some((c) => c.tabela === "estoque_movimentos")).toBe(false);
    expect(caixa.lancamentos).toHaveLength(0);
  });

  it("se a baixa de estoque falha, a venda também é desfeita (e não fatura)", async () => {
    falharEm.add("estoque_movimentos:insert");
    await expect(registrar()).rejects.toBeTruthy();
    expect(chamadas.some((c) => c.tabela === "ordens_servico" && c.passos[0] === "delete")).toBe(true);
    expect(caixa.lancamentos).toHaveLength(0);
  });

  it("se o pagamento falha, a venda FICA e o erro manda faturar a que existe", async () => {
    caixa.falhar = true;
    const erro = await registrar().catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(VendaSemFaturamentoError);
    expect((erro as Error).message).toMatch(/Venda 17 foi registrada/);
    expect((erro as Error).message).toMatch(/não registre a venda de novo/);
    expect(chamadas.some((c) => c.tabela === "ordens_servico" && c.passos[0] === "delete")).toBe(false);
  });

  it("recusa venda sem peça antes de gravar qualquer coisa", async () => {
    await expect(
      registrarVendaBalcao({ cliente_id: "c", vendedor_id: null }, [], pagamento, "op", "loja"),
    ).rejects.toThrow(/nenhuma peça/);
    expect(chamadas).toHaveLength(0);
  });
});
