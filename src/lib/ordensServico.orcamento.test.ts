import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ItemOS, NovoItemOS, OrdemServico } from "@/types/os";

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
  adicionarItensOrdem,
  AprovadoSemEstoqueError,
  aprovarOrcamento,
  cadastrarPecaDoItem,
  criarOrcamento,
  criarOrdem,
  editarItemOrdem,
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

describe("aprovarOrcamento", () => {
  it("vira OS em andamento, com o próximo número de OS, e baixa as peças", async () => {
    const criado = await orcar();
    const aprovada = await aprovarOrcamento(criado, "o próprio, pelo telefone", "op-2");
    expect(aprovada).toMatchObject({
      status: "em_andamento",
      numero: 18,
      aprovado_por: "o próprio, pelo telefone",
      atualizado_por_id: "op-2",
    });
    expect(aprovada.aprovado_em).toBeTruthy();
    // Só a peça baixa; o serviço não.
    expect(estoque()).toEqual([
      expect.objectContaining({
        peca_id: "pneu",
        tipo: "saida",
        quantidade: 4,
        motivo: "uso_em_os",
        referencia: "OS 18",
        loja_id: "loja-1",
      }),
    ]);
  });

  it("aprovar duas vezes (dois computadores) não baixa o estoque duas vezes", async () => {
    const criado = await orcar();
    await aprovarOrcamento(criado, "Maria", "op-1");
    await expect(aprovarOrcamento(criado, "Maria", "op-2")).rejects.toThrow(
      /já foi aprovado ou recusado/,
    );
    expect(estoque()).toHaveLength(1);
    expect(ordem(criado.id).aprovado_por).toBe("Maria");
  });

  it("baixa o que está no banco na hora, não o que a tela tinha", async () => {
    const criado = await orcar();
    // Outro computador acrescentou uma peça depois que esta tela abriu.
    banco.ordens_servico_itens.push({
      id: "item-extra",
      ordem_servico_id: criado.id,
      ...pneu,
      peca_id: "valvula",
      quantidade: 4,
    });
    const telaVelha: OrdemServico = { ...criado, itens: [] };
    await aprovarOrcamento(telaVelha, "Maria", "op-1");
    expect(estoque().map((m) => m.peca_id).sort()).toEqual(["pneu", "valvula"]);
  });

  it("orçamento recusado não pode ser aprovado, e o estoque fica", async () => {
    const criado = await orcar();
    await recusarOrcamento(criado.id, "preco", "op-1");
    await expect(aprovarOrcamento(criado, "Maria", "op-1")).rejects.toThrow(
      /já foi aprovado ou recusado/,
    );
    expect(estoque()).toHaveLength(0);
    expect(ordem(criado.id).numero).toBeNull();
  });

  it("se o estoque não baixa, o erro diz que a OS foi aprovada e pra conferir o estoque", async () => {
    const criado = await orcar();
    falharEm.add("estoque_movimentos:insert");
    await expect(aprovarOrcamento(criado, "Maria", "op-1")).rejects.toThrow(
      /OS 18 foi aprovada.*estoque/s,
    );
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
    await aprovarOrcamento(criado, "Maria", "op-1");
    await expect(recusarOrcamento(criado.id, "preco", "op-1")).rejects.toThrow(
      /já foi aprovado ou recusado/,
    );
    expect(ordem(criado.id).status).toBe("em_andamento");
  });
});

describe("itens lançados depois", () => {
  it("acrescentar peça num orçamento não baixa estoque", async () => {
    const criado = await orcar();
    await adicionarItensOrdem(criado.id, [{ ...pneu, peca_id: "valvula" }], "op-1", "loja-1");
    expect(estoque()).toHaveLength(0);
  });

  it("acrescentar peça numa OS baixa estoque, como sempre", async () => {
    await adicionarItensOrdem("os-17", [pneu], "op-1", "loja-1");
    expect(estoque()).toEqual([
      expect.objectContaining({ peca_id: "pneu", quantidade: 4, referencia: "OS 17" }),
    ]);
  });

  it("se a tela ainda acha que é orçamento mas já foi aprovado, baixa (vale o banco)", async () => {
    const criado = await orcar();
    await aprovarOrcamento(criado, "Maria", "op-1");
    await adicionarItensOrdem(criado.id, [{ ...pneu, peca_id: "valvula" }], "op-1", "loja-1");
    expect(estoque().map((m) => m.peca_id)).toEqual(["pneu", "valvula"]);
  });

  it("corrigir a quantidade de uma peça do orçamento não mexe no estoque", async () => {
    const criado = await orcar();
    const item = banco.ordens_servico_itens.find((l) => l.peca_id === "pneu") as unknown as ItemOS;
    await editarItemOrdem(item, { ...pneu, quantidade: 2 }, "op-1", "loja-1");
    expect(estoque()).toHaveLength(0);
    expect(banco.ordens_servico_itens.find((l) => l.id === item.id)?.quantidade).toBe(2);
    // E na aprovação baixa a quantidade corrigida.
    await aprovarOrcamento(criado, "Maria", "op-1");
    expect(estoque()).toEqual([expect.objectContaining({ peca_id: "pneu", quantidade: 2 })]);
  });

  it("corrigir a quantidade numa OS lança a diferença, como sempre", async () => {
    const criada = await criarOrdem(dados, [pneu], "op-1", "loja-1");
    const item = banco.ordens_servico_itens.find(
      (l) => l.ordem_servico_id === criada.id,
    ) as unknown as ItemOS;
    await editarItemOrdem(item, { ...pneu, quantidade: 5 }, "op-1", "loja-1");
    expect(estoque()).toEqual([
      expect.objectContaining({ quantidade: 4, referencia: "OS 18" }),
      expect.objectContaining({ quantidade: 1, referencia: "OS 18 (correção de item)" }),
    ]);
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

// Peça digitada sem cadastro (#655). Na aprovação, cada avulsa tem um caminho:
// "existente" e "cadastrar" ganham peca_id e baixam estoque; "sem cadastro"
// fica avulsa e não baixa nada.
describe("aprovarOrcamento com peça avulsa", () => {
  const valvulaAvulsa: NovoItemOS = {
    ...pneu,
    peca_id: null,
    descricao: "Válvula de bico",
    quantidade: 4,
    preco_unitario: 15,
    custo_unitario: 6,
  };
  const itemAvulso = (ordemId: string) =>
    banco.ordens_servico_itens.find(
      (l) => l.ordem_servico_id === ordemId && l.descricao === "Válvula de bico",
    )!;

  async function orcarComAvulsa() {
    const criado = await criarOrcamento(dados, [pneu, valvulaAvulsa], "2026-10-29", "op-1", "loja-1");
    return { criado, itemId: itemAvulso(criado.id).id as string };
  }

  it("existente: o item passa a ser aquela peça e baixa o estoque", async () => {
    const { criado, itemId } = await orcarComAvulsa();
    await aprovarOrcamento(criado, "Maria", "op-1", [{ itemId, pecaId: "valvula" }]);
    expect(itemAvulso(criado.id).peca_id).toBe("valvula");
    expect(estoque().map((m) => [m.peca_id, m.quantidade, m.referencia])).toEqual([
      ["pneu", 4, "OS 18"],
      ["valvula", 4, "OS 18"],
    ]);
  });

  it("cadastrar: o item passa a ser a peça recém-cadastrada e baixa o estoque", async () => {
    const { criado, itemId } = await orcarComAvulsa();
    await aprovarOrcamento(criado, "Maria", "op-1", [{ itemId, pecaId: "peca-nova" }]);
    expect(itemAvulso(criado.id).peca_id).toBe("peca-nova");
    expect(estoque().map((m) => m.peca_id)).toEqual(["pneu", "peca-nova"]);
  });

  it("sem cadastro: fica avulsa (peca_id nulo, custo guardado) e não baixa nada", async () => {
    const { criado } = await orcarComAvulsa();
    await aprovarOrcamento(criado, "Maria", "op-1", []);
    expect(itemAvulso(criado.id)).toMatchObject({ peca_id: null, custo_unitario: 6 });
    expect(estoque().map((m) => m.peca_id)).toEqual(["pneu"]);
  });

  it("vínculo não troca a peça de um item que já é do cadastro, nem mexe em outra ordem", async () => {
    const { criado } = await orcarComAvulsa();
    const outro = await orcarComAvulsa();
    const itemPneu = banco.ordens_servico_itens.find(
      (l) => l.ordem_servico_id === criado.id && l.peca_id === "pneu",
    )!;
    await aprovarOrcamento(criado, "Maria", "op-1", [
      { itemId: itemPneu.id as string, pecaId: "outra" },
      { itemId: outro.itemId, pecaId: "valvula" },
    ]);
    expect(itemPneu.peca_id).toBe("pneu");
    expect(itemAvulso(outro.criado.id).peca_id).toBeNull();
    expect(estoque().map((m) => m.peca_id)).toEqual(["pneu"]);
  });

  it("orçamento já respondido (outro computador): não grava vínculo nenhum", async () => {
    const { criado, itemId } = await orcarComAvulsa();
    await aprovarOrcamento(criado, "Maria", "op-1", []);
    await expect(
      aprovarOrcamento(criado, "Maria", "op-2", [{ itemId, pecaId: "valvula" }]),
    ).rejects.toThrow(/já foi aprovado ou recusado/);
    expect(itemAvulso(criado.id).peca_id).toBeNull();
  });

  // A corrida: entre a tela abrir e a gravação, outro computador aprova. O
  // vínculo só pode ser gravado DEPOIS que esta aprovação pegou a linha —
  // senão o item ganha peca_id numa OS cuja baixa (a do outro) já passou, e
  // a peça nunca sai do estoque.
  it("outro computador aprova logo antes da gravação: nenhum vínculo é gravado", async () => {
    const { criado, itemId } = await orcarComAvulsa();
    antesDaProximaGravacao = () => {
      Object.assign(ordem(criado.id), { status: "em_andamento", aprovado_por: "João" });
    };
    await expect(
      aprovarOrcamento(criado, "Maria", "op-2", [{ itemId, pecaId: "valvula" }]),
    ).rejects.toThrow(/já foi aprovado ou recusado/);
    expect(itemAvulso(criado.id).peca_id).toBeNull();
    expect(ordem(criado.id).aprovado_por).toBe("João");
    expect(estoque()).toHaveLength(0);
  });

  // O vínculo vem depois da aprovação: se ele falha, a OS já existe. O item
  // fica avulso (sem baixa, coerente), as outras peças baixam, e o erro diz
  // qual peça não foi ligada.
  it("se o vínculo não grava, a OS fica aprovada, o item avulso, e o erro diz qual peça", async () => {
    const { criado, itemId } = await orcarComAvulsa();
    falharEm.add("ordens_servico_itens:update");
    const erro = await aprovarOrcamento(criado, "Maria", "op-1", [{ itemId, pecaId: "valvula" }]).catch(
      (e: unknown) => e,
    );
    expect(erro).toBeInstanceOf(AprovadoSemEstoqueError);
    expect((erro as Error).message).toMatch(/OS 18 foi aprovada.*"Válvula de bico".*não foi ligada/s);
    expect(ordem(criado.id).status).toBe("em_andamento");
    expect(itemAvulso(criado.id).peca_id).toBeNull();
    expect(estoque().map((m) => m.peca_id)).toEqual(["pneu"]);
  });
});

describe("corrigir peça avulsa numa OS (#655)", () => {
  it("mudar quantidade e custo de uma avulsa 'sem cadastro' não mexe no estoque", async () => {
    const avulsa: NovoItemOS = { ...pneu, peca_id: null, descricao: "Válvula", custo_unitario: 6 };
    const criado = await criarOrcamento(dados, [pneu, avulsa], "2026-10-29", "op-1", "loja-1");
    await aprovarOrcamento(criado, "Maria", "op-1", []);
    const item = banco.ordens_servico_itens.find(
      (l) => l.ordem_servico_id === criado.id && l.descricao === "Válvula",
    ) as unknown as ItemOS;
    await editarItemOrdem(item, { ...avulsa, quantidade: 6, custo_unitario: 7 }, "op-1", "loja-1");
    expect(estoque().map((m) => m.peca_id)).toEqual(["pneu"]);
    expect(banco.ordens_servico_itens.find((l) => l.id === item.id)).toMatchObject({
      quantidade: 6,
      custo_unitario: 7,
      peca_id: null,
    });
  });
});

// O caminho da nota (#655): a OS já aprovada com uma peça "sem cadastro" vai
// emitir NFC-e, e a tela cadastra a peça ali. O item ganha a peça e, como já é
// OS, baixa o estoque — igual ao "cadastrar" da aprovação.
describe("cadastrarPecaDoItem", () => {
  const valvulaAvulsa: NovoItemOS = {
    ...pneu,
    peca_id: null,
    descricao: "Válvula de bico",
    quantidade: 4,
    preco_unitario: 15,
  };
  const itemAvulso = (ordemId: string) =>
    banco.ordens_servico_itens.find(
      (l) => l.ordem_servico_id === ordemId && l.descricao === "Válvula de bico",
    ) as unknown as ItemOS;

  async function osComAvulsa() {
    const criado = await criarOrcamento(dados, [pneu, valvulaAvulsa], "2026-10-29", "op-1", "loja-1");
    const aprovada = await aprovarOrcamento(criado, "Maria", "op-1", []);
    return { aprovada, item: { ...itemAvulso(criado.id) } };
  }

  it("OS: o item ganha a peça e baixa o estoque, com o nome da OS", async () => {
    const { aprovada, item } = await osComAvulsa();
    expect(await cadastrarPecaDoItem(item, "peca-nova", "loja-1", aprovada)).toBe(true);
    expect(itemAvulso(aprovada.id).peca_id).toBe("peca-nova");
    expect(estoque().map((m) => [m.peca_id, m.quantidade, m.tipo, m.referencia])).toEqual([
      ["pneu", 4, "saida", "OS 18"],
      ["peca-nova", 4, "saida", "OS 18"],
    ]);
  });

  it("baixa a quantidade que está no banco, não a da tela", async () => {
    const { aprovada, item } = await osComAvulsa();
    await cadastrarPecaDoItem({ ...item, quantidade: 1 }, "peca-nova", "loja-1", aprovada);
    expect(estoque().find((m) => m.peca_id === "peca-nova")?.quantidade).toBe(4);
  });

  it("duas vezes (clique duplo, outro computador): não troca a peça nem baixa de novo", async () => {
    const { aprovada, item } = await osComAvulsa();
    await cadastrarPecaDoItem(item, "peca-nova", "loja-1", aprovada);
    expect(await cadastrarPecaDoItem(item, "outra", "loja-1", aprovada)).toBe(false);
    expect(itemAvulso(aprovada.id).peca_id).toBe("peca-nova");
    expect(estoque().filter((m) => m.peca_id !== "pneu")).toHaveLength(1);
  });

  it("em orçamento: o item ganha a peça, mas não baixa (só a aprovação baixa)", async () => {
    const criado = await criarOrcamento(dados, [valvulaAvulsa], "2026-10-29", "op-1", "loja-1");
    const item = { ...itemAvulso(criado.id) };
    await cadastrarPecaDoItem(item, "peca-nova", "loja-1", criado);
    expect(itemAvulso(criado.id).peca_id).toBe("peca-nova");
    expect(estoque()).toHaveLength(0);
  });

  it("item de serviço nunca ganha peça (nem pela aprovação, nem pela nota)", async () => {
    const criado = await criarOrcamento(dados, [alinhamento], "2026-10-29", "op-1", "loja-1");
    const servico = banco.ordens_servico_itens.find(
      (l) => l.ordem_servico_id === criado.id,
    ) as unknown as ItemOS;
    await aprovarOrcamento(criado, "Maria", "op-1", [{ itemId: servico.id, pecaId: "pneu" }]);
    const aprovada = ordem(criado.id) as unknown as OrdemServico;
    expect(await cadastrarPecaDoItem(servico, "pneu", "loja-1", aprovada)).toBe(false);
    expect(servico.peca_id).toBeNull();
    expect(estoque()).toHaveLength(0);
  });

  it("se o item não grava, não baixa nada", async () => {
    const { aprovada, item } = await osComAvulsa();
    falharEm.add("ordens_servico_itens:update");
    await expect(cadastrarPecaDoItem(item, "peca-nova", "loja-1", aprovada)).rejects.toBeTruthy();
    expect(estoque().map((m) => m.peca_id)).toEqual(["pneu"]);
  });
});
