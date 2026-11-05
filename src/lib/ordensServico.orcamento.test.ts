import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NovoItemOS, OrdemServico } from "@/types/os";

// Orçamento como etapa da OS (#379). A regra que mais custa se quebrar: a
// peça só sai do estoque quando o cliente APROVA — nunca ao orçar, nunca duas
// vezes. O Supabase aqui é um banco de mentira, em memória, que imita o que
// importa do de verdade: o filtro do update (`.eq("status", "orcamento")`) e
// o gatilho de número da migration 0065 (orçamento ganha `numero_orcamento`;
// o número de OS só nasce na aprovação).

type Linha = Record<string, unknown>;
const banco: Record<string, Linha[]> = {};
const falharEm = new Set<string>();
let proximoId = 1;
// Simula outro computador agindo no meio: roda uma vez, logo antes da
// próxima gravação (insert/update/delete) em qualquer tabela.
let antesDaProximaGravacao: (() => void) | null = null;

function proximoNumero(tabela: Linha[], loja: unknown, campo: string): number {
  const usados = tabela.filter((l) => l.loja_id === loja).map((l) => Number(l[campo] ?? 0));
  return Math.max(0, ...usados) + 1;
}

// O gatilho da migration 0065, do jeito que a lib enxerga.
function gatilhoNumero(linha: Linha, tabela: Linha[]) {
  const orcamento = linha.status === "orcamento" || linha.status === "recusado";
  if (orcamento) {
    linha.numero = null;
    linha.numero_orcamento ??= proximoNumero(tabela, linha.loja_id, "numero_orcamento");
  } else if (linha.numero == null) {
    linha.numero = proximoNumero(tabela, linha.loja_id, "numero");
  }
}

function construtor(tabela: string) {
  banco[tabela] ??= [];
  const linhas = banco[tabela];
  let operacao: "select" | "insert" | "update" | "delete" = "select";
  let dados: unknown;
  const filtros: [string, unknown][] = [];
  let modo: "lista" | "single" | "maybe" = "lista";

  function executar() {
    if (operacao !== "select" && antesDaProximaGravacao) {
      const outroComputador = antesDaProximaGravacao;
      antesDaProximaGravacao = null;
      outroComputador();
    }
    if (falharEm.has(`${tabela}:${operacao}`)) {
      return { data: null, error: { message: `falhou ${tabela}:${operacao}` } };
    }
    const casa = (l: Linha) => filtros.every(([c, v]) => l[c] === v);
    let resultado: Linha[] = [];
    if (operacao === "insert") {
      const novas = (Array.isArray(dados) ? dados : [dados]) as Linha[];
      for (const nova of novas) {
        const linha: Linha = { id: `id-${proximoId++}`, ...nova };
        if (tabela === "ordens_servico") {
          linha.status ??= "em_andamento";
          gatilhoNumero(linha, linhas);
        }
        linhas.push(linha);
        resultado.push(linha);
      }
    } else if (operacao === "update") {
      resultado = linhas.filter(casa);
      for (const linha of resultado) {
        Object.assign(linha, dados);
        if (tabela === "ordens_servico") gatilhoNumero(linha, linhas);
      }
    } else if (operacao === "delete") {
      resultado = linhas.filter(casa);
      banco[tabela] = linhas.filter((l) => !casa(l));
    } else {
      resultado = linhas.filter(casa);
    }
    const copia = resultado.map((l) => ({ ...l }));
    if (modo === "single") {
      return copia.length === 1
        ? { data: copia[0], error: null }
        : { data: null, error: { message: "nenhuma linha" } };
    }
    if (modo === "maybe") return { data: copia[0] ?? null, error: null };
    return { data: copia, error: null };
  }

  const q = {
    insert(d: unknown) {
      operacao = "insert";
      dados = d;
      return q;
    },
    update(d: unknown) {
      operacao = "update";
      dados = d;
      return q;
    },
    delete() {
      operacao = "delete";
      return q;
    },
    select() {
      return q;
    },
    eq(coluna: string, valor: unknown) {
      filtros.push([coluna, valor]);
      return q;
    },
    // `.is("coluna", null)`: aqui só se usa com null, que casa com `===`.
    is(coluna: string, valor: unknown) {
      filtros.push([coluna, valor]);
      return q;
    },
    single() {
      modo = "single";
      return q;
    },
    maybeSingle() {
      modo = "maybe";
      return q;
    },
    then(ok: (v: unknown) => unknown, erro?: (e: unknown) => unknown) {
      return Promise.resolve(executar()).then(ok, erro);
    },
  };
  return q;
}

vi.mock("./supabase", () => ({ supabase: { from: (t: string) => construtor(t) } }));
vi.mock("./depositos", () => ({ buscarDepositoPadraoId: async () => "deposito-1" }));
const caixa = vi.hoisted(() => ({ lancamentos: [] as unknown[] }));
vi.mock("./caixa", () => ({
  criarMovimentoCaixa: async (mov: unknown) => {
    caixa.lancamentos.push(mov);
  },
}));
vi.mock("./contasReceber", () => ({ criarContaReceber: async () => undefined }));

const {
  criarOrcamento,
  faturarOrdem,
  recusarOrcamento,
} = await import("./ordensServico");

const pneu: NovoItemOS = {
  tipo: "peca",
  peca_id: "pneu",
  servico_id: null,
  tecnico_id: null,
  descricao: "Pneu 175/70 R13",
  quantidade: 4,
  preco_unitario: 300,
  desconto: 0,
};
const alinhamento: NovoItemOS = {
  tipo: "servico",
  peca_id: null,
  servico_id: "alinhamento",
  tecnico_id: null,
  descricao: "Alinhamento",
  quantidade: 1,
  preco_unitario: 80,
  desconto: 0,
};
const dados = {
  cliente_id: "cliente-1",
  veiculo_id: "veiculo-1",
  km_entrada: 50_000,
  descricao_problema: "Trocar os quatro pneus",
  vendedor_id: null,
};

const estoque = () => banco.estoque_movimentos ?? [];
const ordem = (id: string) => banco.ordens_servico.find((l) => l.id === id)!;

// A aprovação de verdade é uma função do banco (`aprovar_orcamento`, #706) e
// tem teste próprio (ordensServico.rpc.test.ts e o script SQL). Aqui ela só
// prepara o cenário: a OS já aprovada, com número e a peça baixada.
function aprovarNoBanco(id: string): OrdemServico {
  const linha = ordem(id);
  Object.assign(linha, { status: "em_andamento", aprovado_por: "Maria" });
  gatilhoNumero(linha, banco.ordens_servico);
  for (const item of banco.ordens_servico_itens.filter((i) => i.ordem_servico_id === id)) {
    if (item.tipo === "peca" && item.peca_id) {
      (banco.estoque_movimentos ??= []).push({
        peca_id: item.peca_id,
        tipo: "saida",
        quantidade: item.quantidade,
        referencia: `OS ${linha.numero}`,
      });
    }
  }
  return { ...linha } as unknown as OrdemServico;
}

function orcar() {
  return criarOrcamento(dados, [pneu, alinhamento], "2026-10-29", "op-1", "loja-1");
}

beforeEach(() => {
  for (const tabela of Object.keys(banco)) delete banco[tabela];
  // Uma OS 17 já existe na loja: o orçamento aprovado tem que virar a 18.
  banco.ordens_servico = [{ id: "os-17", loja_id: "loja-1", numero: 17, status: "faturada" }];
  falharEm.clear();
  antesDaProximaGravacao = null;
  caixa.lancamentos.length = 0;
  proximoId = 1;
});

describe("criarOrcamento", () => {
  it("grava como orçamento, com validade e os itens, e NÃO mexe no estoque", async () => {
    const criado = await orcar();
    expect(criado).toMatchObject({ status: "orcamento", validade: "2026-10-29", numero: null });
    expect(criado.numero_orcamento).toBe(1);
    expect(banco.ordens_servico_itens).toHaveLength(2);
    expect(estoque()).toHaveLength(0);
  });

  it("se os itens não gravam, o orçamento é desfeito (tentar de novo é seguro)", async () => {
    falharEm.add("ordens_servico_itens:insert");
    await expect(orcar()).rejects.toBeTruthy();
    expect(banco.ordens_servico.filter((l) => l.status === "orcamento")).toHaveLength(0);
  });
});

describe("recusarOrcamento", () => {
  it("marca como recusado, com o motivo e a hora", async () => {
    const criado = await orcar();
    await recusarOrcamento(criado.id, "outro_lugar", "op-2");
    expect(ordem(criado.id)).toMatchObject({
      status: "recusado",
      motivo_recusa: "outro_lugar",
      atualizado_por_id: "op-2",
    });
    expect(ordem(criado.id).recusado_em).toBeTruthy();
  });

  it("motivo é opcional", async () => {
    const criado = await orcar();
    await recusarOrcamento(criado.id, null, "op-1");
    expect(ordem(criado.id)).toMatchObject({ status: "recusado", motivo_recusa: null });
  });

  it("não recusa o que já virou OS", async () => {
    const criado = await orcar();
    aprovarNoBanco(criado.id);
    await expect(recusarOrcamento(criado.id, "preco", "op-1")).rejects.toThrow(
      /já foi aprovado ou recusado/,
    );
    expect(ordem(criado.id).status).toBe("em_andamento");
  });
});

describe("faturarOrdem", () => {
  it("orçamento não é faturado (não entra no caixa)", async () => {
    const criado = await orcar();
    await expect(
      faturarOrdem(criado, [{ formaPagamento: "pix", valor: 1280 }], 1, null),
    ).rejects.toThrow(/orçamento/i);
    expect(caixa.lancamentos).toHaveLength(0);
    expect(ordem(criado.id).status).toBe("orcamento");
  });
});

// "Cadastrar agora" na nota (cadastrarPecaDoItem) virou uma função do banco
// (#803, migration 0077): o que a lib manda está em ordensServico.rpc.test.ts e
// a regra (baixa só em OS, a quantidade do banco, a trava, tudo ou nada) em
// supabase/scripts/testar-cadastrar-peca-do-item.sql.
