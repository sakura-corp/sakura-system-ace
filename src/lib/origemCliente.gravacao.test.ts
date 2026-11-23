import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NovaOrdemServico } from "@/types/os";

// "De onde veio" (#1021): o que cada lib manda gravar. Cliente (completo e
// rápido), OS, orçamento e venda de balcão levam `origem` e `origem_detalhe`
// pro banco. A herança (cliente sem origem pega a da OS) e a trava do
// Consumidor são do banco, provadas em supabase/scripts/testar-origem-do-cliente.sql.

const sb = vi.hoisted(() => ({
  inserts: [] as { tabela: string; dados: unknown }[],
  rpcs: [] as { nome: string; args: Record<string, unknown> }[],
}));

vi.mock("./supabase", () => ({
  supabase: {
    from: (tabela: string) => {
      const q: Record<string, unknown> = {};
      q.insert = (dados: unknown) => {
        sb.inserts.push({ tabela, dados });
        return q;
      };
      for (const metodo of ["select", "single", "eq", "delete", "update", "not", "upsert"]) {
        q[metodo] = () => q;
      }
      q.then = (ok: (v: unknown) => unknown, erro?: (e: unknown) => unknown) =>
        Promise.resolve({
          data: tabela === "ordens_servico" ? { id: "os-1", numero: 1, status: "em_andamento" } : { id: "c-1" },
          error: null,
        }).then(ok, erro);
      return q;
    },
    rpc: async (nome: string, args: Record<string, unknown>) => {
      sb.rpcs.push({ nome, args });
      return { data: { cliente_id: "c-1", veiculo_id: null }, error: null };
    },
  },
}));
vi.mock("./depositos", () => ({ buscarDepositoPadraoId: async () => "deposito-1" }));
vi.mock("./caixa", () => ({ criarMovimentoCaixa: async () => undefined }));
vi.mock("./contasReceber", () => ({ criarContaReceber: async () => undefined }));

const { criarOrdem, criarOrcamento, registrarVendaBalcao } = await import("./ordensServico");
const { criarCliente, cadastrarClienteRapido } = await import("./clientes");

beforeEach(() => {
  sb.inserts.length = 0;
  sb.rpcs.length = 0;
});

function gravadoEm(tabela: string) {
  return sb.inserts.find((i) => i.tabela === tabela)?.dados as Record<string, unknown>;
}

const ordem: NovaOrdemServico = {
  cliente_id: "c-1",
  veiculo_id: null,
  km_entrada: null,
  descricao_problema: null,
  vendedor_id: null,
  origem: "google",
  origem_detalhe: "IG-pneu-nov",
};

describe("a origem chega no banco", () => {
  it("na OS", async () => {
    await criarOrdem(ordem, [], "op-1", "loja-1");
    expect(gravadoEm("ordens_servico")).toMatchObject({ origem: "google", origem_detalhe: "IG-pneu-nov" });
  });

  it("no orçamento", async () => {
    await criarOrcamento(ordem, [], "2026-12-01", "op-1", "loja-1");
    expect(gravadoEm("ordens_servico")).toMatchObject({
      status: "orcamento",
      origem: "google",
      origem_detalhe: "IG-pneu-nov",
    });
  });

  it("na venda de balcão, mesmo no Consumidor (a origem fica na venda)", async () => {
    await registrarVendaBalcao(
      {
        cliente_id: "00000000-0000-0000-0000-00000000c000",
        vendedor_id: null,
        origem: "passou_na_frente",
        origem_detalhe: null,
      },
      [
        {
          tipo: "peca",
          peca_id: "p1",
          servico_id: null,
          tecnico_id: null,
          descricao: "Palheta",
          quantidade: 1,
          preco_unitario: 35,
          desconto: 0,
        },
      ],
      { pagamentos: [{ formaPagamento: "pix", valor: 35 }], parcelas: 1, previsaoRecebimento: null },
      "op-1",
      "loja-1",
    );
    expect(gravadoEm("ordens_servico")).toMatchObject({
      tipo: "venda_balcao",
      origem: "passou_na_frente",
      origem_detalhe: null,
    });
  });

  it("na venda sem origem: vai nula, e a venda grava igual", async () => {
    await registrarVendaBalcao(
      { cliente_id: "c-1", vendedor_id: null },
      [
        {
          tipo: "peca",
          peca_id: "p1",
          servico_id: null,
          tecnico_id: null,
          descricao: "Palheta",
          quantidade: 1,
          preco_unitario: 35,
          desconto: 0,
        },
      ],
      { pagamentos: [{ formaPagamento: "pix", valor: 35 }], parcelas: 1, previsaoRecebimento: null },
      "op-1",
      "loja-1",
    );
    expect(gravadoEm("ordens_servico")).toMatchObject({ origem: null, origem_detalhe: null });
  });

  it("no cadastro completo do cliente", async () => {
    await criarCliente(
      {
        nome: "Ana",
        tipo_pessoa: "fisica",
        cpf_cnpj: null,
        telefone: null,
        email: null,
        cep: null,
        rua: null,
        numero: null,
        bairro: null,
        cidade: null,
        uf: null,
        codigo_municipio: null,
        data_nascimento: null,
        origem: "indicacao",
        origem_detalhe: "Zé da padaria",
      },
      [],
    );
    expect(gravadoEm("clientes")).toMatchObject({ origem: "indicacao", origem_detalhe: "Zé da padaria" });
  });

  it("no cadastro rápido (OS, orçamento e venda), pela função do banco", async () => {
    await cadastrarClienteRapido(
      {
        nome: "Ana",
        telefone: null,
        tipo_pessoa: "fisica",
        cpf_cnpj: null,
        origem: "parceiro",
        origem_detalhe: "Auto Elétrica do Beto",
      },
      null,
    );
    expect(sb.rpcs[0]).toMatchObject({
      nome: "cadastrar_cliente_rapido",
      args: { p_cliente: { origem: "parceiro", origem_detalhe: "Auto Elétrica do Beto" } },
    });
  });

  it("no cadastro rápido sem origem: vai nula, e cadastra igual", async () => {
    await cadastrarClienteRapido({ nome: "Ana", telefone: null, tipo_pessoa: "fisica", cpf_cnpj: null }, null);
    expect(sb.rpcs[0].args.p_cliente).toMatchObject({ origem: null, origem_detalhe: null });
  });
});
