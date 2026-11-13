import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ItemOS, NovoItemOS, OrdemServico } from "@/types/os";

// #706: adicionar item, corrigir item e aprovar orçamento passaram a ser UMA
// chamada ao banco cada (funções da migration 0071), que trava a linha da OS e
// faz tudo numa transação. Aqui só se confere o que a lib manda e como ela
// reage à resposta; a regra em si (estoque, nome do documento, trava) é do banco
// e é provada em supabase/scripts/testar-*.sql. O `from` de mentira explode de
// propósito: se a lib voltar a ler a situação da ordem ou a gravar item/estoque
// por conta própria, o teste reprova.

const sb = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));
vi.mock("./supabase", () => ({ supabase: sb }));
vi.mock("./depositos", () => ({ buscarDepositoPadraoId: async () => "deposito-1" }));
const caixa = vi.hoisted(() => ({ criarMovimentoCaixa: vi.fn() }));
const receber = vi.hoisted(() => ({ criarContaReceber: vi.fn() }));
vi.mock("./caixa", () => caixa);
vi.mock("./contasReceber", () => receber);

const {
  adicionarItensOrdem,
  aprovarOrcamento,
  cadastrarPecaDoItem,
  editarItemOrdem,
  faturarOrdem,
  OrdemMudouError,
  registrarVendaBalcao,
  PecaNaoLigadaNaAprovacaoError,
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

const ordemAprovada = {
  id: "ordem-1",
  loja_id: "loja-1",
  numero: 18,
  status: "em_andamento",
} as unknown as OrdemServico;

beforeEach(() => {
  sb.rpc.mockReset();
  sb.from.mockReset();
  caixa.criarMovimentoCaixa.mockReset();
  receber.criarContaReceber.mockReset();
  sb.from.mockImplementation((tabela: string) => {
    throw new Error(`a lib não podia ler/gravar "${tabela}" direto`);
  });
});

describe("adicionarItensOrdem", () => {
  it("manda os itens numa chamada só ao banco, sem ler a situação nem gravar direto", async () => {
    sb.rpc.mockResolvedValue({ data: null, error: null });
    await adicionarItensOrdem("ordem-1", [pneu], "op-1");
    expect(sb.rpc).toHaveBeenCalledTimes(1);
    expect(sb.rpc).toHaveBeenCalledWith("adicionar_itens_ordem", {
      p_ordem: "ordem-1",
      p_itens: [pneu],
      p_operador: "op-1",
    });
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("erro do banco sobe pra tela", async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: "Esta ordem não foi encontrada" } });
    await expect(adicionarItensOrdem("ordem-1", [pneu], "op-1")).rejects.toMatchObject({
      message: "Esta ordem não foi encontrada",
    });
  });

  it("sem itens só marca quem mexeu na ordem, sem chamar a função dos itens", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    sb.from.mockImplementation(() => ({ update }));
    await adicionarItensOrdem("ordem-1", [], "op-1");
    expect(sb.rpc).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({ atualizado_por_id: "op-1" });
    expect(eq).toHaveBeenCalledWith("id", "ordem-1");
  });
});

// #803: "Cadastrar agora" na nota (#655) liga a peça avulsa ao cadastro numa
// chamada só (`cadastrar_peca_do_item`, migration 0079), que trava a OS, liga e,
// se já é OS, baixa. A regra (quando baixa, a trava, tudo ou nada) é provada em
// supabase/scripts/testar-cadastrar-peca-do-item.sql.
describe("cadastrarPecaDoItem", () => {
  it("manda o item, a peça e quem mexeu numa chamada só, sem ler a ordem nem gravar direto", async () => {
    sb.rpc.mockResolvedValue({ data: true, error: null });
    expect(await cadastrarPecaDoItem("item-1", "peca-nova", "op-1")).toBe(true);
    expect(sb.rpc).toHaveBeenCalledTimes(1);
    expect(sb.rpc).toHaveBeenCalledWith("cadastrar_peca_do_item", {
      p_item: "item-1",
      p_peca: "peca-nova",
      p_operador: "op-1",
    });
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("o banco diz que o item já não era avulso (outro computador ligou): devolve false", async () => {
    sb.rpc.mockResolvedValue({ data: false, error: null });
    expect(await cadastrarPecaDoItem("item-1", "peca-nova", "op-1")).toBe(false);
  });

  it("erro do banco (sem depósito ativo, por exemplo) sobe pra tela: nada foi ligado", async () => {
    sb.rpc.mockResolvedValue({
      data: null,
      error: { message: "Nenhum depósito ativo encontrado pra essa loja." },
    });
    await expect(cadastrarPecaDoItem("item-1", "peca-nova", "op-1")).rejects.toMatchObject({
      message: "Nenhum depósito ativo encontrado pra essa loja.",
    });
  });
});

describe("editarItemOrdem", () => {
  const item = { ...pneu, id: "item-1", ordem_servico_id: "ordem-1" } as unknown as ItemOS;

  it("manda o item e o patch numa chamada só, sem ler a ordem nem gravar direto", async () => {
    sb.rpc.mockResolvedValue({ data: null, error: null });
    const patch = { ...pneu, quantidade: 5 };
    await editarItemOrdem(item, patch, "op-1");
    expect(sb.rpc).toHaveBeenCalledTimes(1);
    expect(sb.rpc).toHaveBeenCalledWith("editar_item_ordem", {
      p_item: "item-1",
      p_patch: patch,
      p_operador: "op-1",
    });
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("erro do banco sobe pra tela", async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: "Este item não foi encontrado" } });
    await expect(editarItemOrdem(item, pneu, "op-1")).rejects.toMatchObject({
      message: "Este item não foi encontrado",
    });
  });
});

describe("aprovarOrcamento", () => {
  it("manda a aprovação e os vínculos (com os nomes do banco) numa chamada só e devolve a OS", async () => {
    sb.rpc.mockResolvedValue({ data: { ordem: ordemAprovada, nao_ligados: [] }, error: null });
    const aprovada = await aprovarOrcamento({ id: "ordem-1" }, "Maria", "op-2", [
      { itemId: "item-9", pecaId: "valvula" },
    ]);
    expect(aprovada).toBe(ordemAprovada);
    expect(sb.rpc).toHaveBeenCalledTimes(1);
    expect(sb.rpc).toHaveBeenCalledWith("aprovar_orcamento", {
      p_ordem: "ordem-1",
      p_aprovado_por: "Maria",
      p_operador: "op-2",
      p_vinculos: [{ item_id: "item-9", peca_id: "valvula" }],
    });
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("sem vínculos manda a lista vazia", async () => {
    sb.rpc.mockResolvedValue({ data: { ordem: ordemAprovada, nao_ligados: [] }, error: null });
    await aprovarOrcamento({ id: "ordem-1" }, "Maria", "op-2");
    expect(sb.rpc).toHaveBeenCalledWith(
      "aprovar_orcamento",
      expect.objectContaining({ p_vinculos: [] }),
    );
  });

  it("resposta nula (já aprovado ou recusado em outro computador) vira o aviso de já respondido", async () => {
    sb.rpc.mockResolvedValue({ data: null, error: null });
    await expect(aprovarOrcamento({ id: "ordem-1" }, "Maria", "op-2")).rejects.toThrow(
      /já foi aprovado ou recusado/,
    );
  });

  it("erro do banco diz que o orçamento NÃO foi aprovado (aprovação e baixa são uma transação)", async () => {
    sb.rpc.mockResolvedValue({
      data: null,
      error: { message: "Nenhum depósito ativo", code: "P0001" },
    });
    await expect(aprovarOrcamento({ id: "ordem-1" }, "Maria", "op-2")).rejects.toThrow(
      /^O orçamento não foi aprovado e continua orçamento: Nenhum depósito ativo/,
    );
  });

  it("erro sem código do Postgres (rede, tempo esgotado) sobe como veio: a aprovação pode ter entrado", async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: "TypeError: fetch failed", code: "" } });
    const erro = await aprovarOrcamento({ id: "ordem-1" }, "Maria", "op-2").catch((e: unknown) => e);
    expect(erro).toMatchObject({ message: "TypeError: fetch failed" });
    expect((erro as Error).message).not.toMatch(/continua orçamento/);
  });

  it("limpa o \"aprovado por\" antes de mandar (o trim do banco não tira tab nem quebra de linha)", async () => {
    sb.rpc.mockResolvedValue({ data: { ordem: ordemAprovada, nao_ligados: [] }, error: null });
    await aprovarOrcamento({ id: "ordem-1" }, " \tMaria\n", "op-2");
    expect(sb.rpc).toHaveBeenCalledWith(
      "aprovar_orcamento",
      expect.objectContaining({ p_aprovado_por: "Maria" }),
    );
  });

  it("peça que não ligou ao cadastro: erro com a descrição e a OS aprovada", async () => {
    sb.rpc.mockResolvedValue({
      data: {
        ordem: ordemAprovada,
        nao_ligados: [{ id: "item-9", descricao: "Válvula de bico" }],
      },
      error: null,
    });
    const erro = await aprovarOrcamento({ id: "ordem-1" }, "Maria", "op-2", [
      { itemId: "item-9", pecaId: "valvula" },
    ]).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(PecaNaoLigadaNaAprovacaoError);
    expect((erro as { ordem: OrdemServico }).ordem).toBe(ordemAprovada);
    expect((erro as Error).message).toMatch(/OS 18 foi aprovada.*"Válvula de bico".*não foi ligada/s);
  });
});

// #803 (caso 2): faturar passou a ser uma chamada ao banco que trava a OS e
// confere o total que a tela mostrou com o que está gravado.
describe("faturarOrdem", () => {
  const os = {
    id: "ordem-1",
    loja_id: "loja-1",
    cliente_id: "cli-1",
    numero: 18,
    status: "concluida",
    tipo: "os",
  } as unknown as OrdemServico;
  const pix = [{ formaPagamento: "pix" as const, valor: 1200 }];

  it("manda o total dos itens e o operador pra função do banco, sem gravar a ordem direto", async () => {
    sb.rpc.mockResolvedValue({ data: null, error: null });
    await faturarOrdem(os, pix, 1, null, "op-1", 1200);
    expect(sb.rpc).toHaveBeenCalledTimes(1);
    expect(sb.rpc).toHaveBeenCalledWith("marcar_ordem_faturada", {
      p_ordem: "ordem-1",
      p_forma_pagamento: "Pix",
      p_parcelas: 1,
      p_total_da_tela: 1200,
      p_operador: "op-1",
    });
    expect(sb.from).not.toHaveBeenCalled();
    expect(caixa.criarMovimentoCaixa).toHaveBeenCalledTimes(1);
  });

  it("fecha o total da tela no centavo", async () => {
    sb.rpc.mockResolvedValue({ data: null, error: null });
    await faturarOrdem(os, pix, 1, null, "op-1", 0.1 + 0.2);
    expect(sb.rpc.mock.calls[0][1].p_total_da_tela).toBe(0.3);
  });

  it("OS que mudou em outro computador: OrdemMudouError e nada de caixa nem conta a receber", async () => {
    sb.rpc.mockResolvedValue({
      data: null,
      error: { code: "SK803", message: "Esta OS mudou em outro computador." },
    });
    const erro = await faturarOrdem(os, pix, 1, null, "op-1", 1200).catch((e) => e);
    expect(erro).toBeInstanceOf(OrdemMudouError);
    expect(erro.name).toBe("OrdemMudouError");
    expect(erro.message).toMatch(/mudou em outro computador/);
    expect(erro.message).toMatch(/Nada foi cobrado/);
    expect(caixa.criarMovimentoCaixa).not.toHaveBeenCalled();
    expect(receber.criarContaReceber).not.toHaveBeenCalled();
    await expect(
      faturarOrdem(os, pix, 1, "2026-12-01", "op-1", 1200),
    ).rejects.toBeInstanceOf(OrdemMudouError);
    expect(receber.criarContaReceber).not.toHaveBeenCalled();
  });

  it("outro erro do banco sobe como veio e também não lança nada", async () => {
    const erroBanco = { code: "P0001", message: "Esta OS já foi faturada." };
    sb.rpc.mockResolvedValue({ data: null, error: erroBanco });
    await expect(faturarOrdem(os, pix, 1, null, "op-1", 1200)).rejects.toBe(erroBanco);
    expect(caixa.criarMovimentoCaixa).not.toHaveBeenCalled();
  });

  it("com previsão, cria a conta a receber só depois de o banco aceitar", async () => {
    const ordemDasChamadas: string[] = [];
    sb.rpc.mockImplementation(async () => {
      ordemDasChamadas.push("rpc");
      return { data: null, error: null };
    });
    receber.criarContaReceber.mockImplementation(async () => {
      ordemDasChamadas.push("receber");
    });
    await faturarOrdem(os, pix, 1, "2026-12-01", "op-1", 1200);
    expect(ordemDasChamadas).toEqual(["rpc", "receber"]);
    expect(receber.criarContaReceber).toHaveBeenCalledWith(
      expect.objectContaining({ ordem_servico_id: "ordem-1", valor: 1200, vencimento: "2026-12-01" }),
      "loja-1",
    );
    expect(caixa.criarMovimentoCaixa).not.toHaveBeenCalled();
  });
});

describe("registrarVendaBalcao", () => {
  it("fatura mandando o total dos itens da venda (a ordem nova não tem itens carregados)", async () => {
    const nova = { id: "venda-1", loja_id: "loja-1", cliente_id: "cli-1", numero: 5, tipo: "venda_balcao" };
    const single = vi.fn().mockResolvedValue({ data: nova, error: null });
    sb.from.mockImplementation(() => ({
      insert: () => ({ select: () => ({ single }) }),
    }));
    sb.rpc.mockResolvedValue({ data: null, error: null });
    await registrarVendaBalcao(
      { cliente_id: "cli-1", vendedor_id: null },
      [pneu],
      { pagamentos: [{ formaPagamento: "pix", valor: 1200 }], parcelas: 1, previsaoRecebimento: null },
      "op-1",
      "loja-1",
    );
    const fatura = sb.rpc.mock.calls.find((c) => c[0] === "marcar_ordem_faturada");
    expect(fatura?.[1]).toMatchObject({ p_ordem: "venda-1", p_total_da_tela: 1200, p_operador: "op-1" });
  });
});
