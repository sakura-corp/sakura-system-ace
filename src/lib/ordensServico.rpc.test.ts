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
vi.mock("./caixa", () => ({ criarMovimentoCaixa: async () => undefined }));
vi.mock("./contasReceber", () => ({ criarContaReceber: async () => undefined }));

const { adicionarItensOrdem, aprovarOrcamento, editarItemOrdem, PecaNaoLigadaNaAprovacaoError } =
  await import("./ordensServico");

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
    sb.rpc.mockResolvedValue({ data: null, error: { message: "Nenhum depósito ativo" } });
    await expect(aprovarOrcamento({ id: "ordem-1" }, "Maria", "op-2")).rejects.toThrow(
      /^O orçamento não foi aprovado e continua orçamento: Nenhum depósito ativo/,
    );
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
