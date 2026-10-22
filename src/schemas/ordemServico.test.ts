import { describe, expect, it } from "vitest";
import {
  problemaDoItem,
  idsDeFuncionarios,
  itemExistenteFormSchema,
  itemFormVazio,
  nomearFuncionarios,
  ordemServicoFormSchema,
  paraItensValidos,
  paraPatchItem,
  paraValoresItemExistente,
  totaisDaOrdem,
  type ItemFormValues,
} from "./ordemServico";
import type { ItemOS, OrdemServico } from "@/types/os";

function itemLancado(
  tipo: "peca" | "servico",
  quantidade: number,
  precoUnitario: number,
  desconto = 0,
): ItemOS {
  return {
    id: crypto.randomUUID(),
    ordem_servico_id: "os-1",
    tipo,
    peca_id: tipo === "peca" ? "p1" : null,
    servico_id: tipo === "servico" ? "s1" : null,
    tecnico_id: null,
    descricao: tipo,
    quantidade,
    preco_unitario: precoUnitario,
    desconto,
  };
}

function itemDigitado(
  tipo: "peca" | "servico",
  quantidade: string,
  precoUnitario: string,
  desconto = "",
): ItemFormValues {
  return { ...itemFormVazio, tipo, quantidade, preco_unitario: precoUnitario, desconto };
}

describe("totaisDaOrdem", () => {
  it("é tudo zero numa OS em branco", () => {
    expect(totaisDaOrdem([], [])).toEqual({ pecas: 0, servicos: 0, total: 0 });
  });

  it("separa peça de serviço", () => {
    const totais = totaisDaOrdem(
      [itemLancado("peca", 2, 150), itemLancado("servico", 1, 60)],
      [],
    );
    expect(totais).toEqual({ pecas: 300, servicos: 60, total: 360 });
  });

  it("soma o que já está lançado com o que está sendo digitado agora", () => {
    const totais = totaisDaOrdem(
      [itemLancado("peca", 1, 200)],
      [itemDigitado("peca", "2", "50"), itemDigitado("servico", "1", "80")],
    );
    expect(totais).toEqual({ pecas: 300, servicos: 80, total: 380 });
  });

  it("desconta o desconto dos dois lados", () => {
    const totais = totaisDaOrdem(
      [itemLancado("peca", 1, 100, 10)],
      [itemDigitado("servico", "1", "100", "25")],
    );
    expect(totais).toEqual({ pecas: 90, servicos: 75, total: 165 });
  });

  it("ignora linha em branco do formulário (campo vazio não vira NaN)", () => {
    const totais = totaisDaOrdem([itemLancado("peca", 1, 100)], [{ ...itemFormVazio }]);
    expect(totais).toEqual({ pecas: 100, servicos: 0, total: 100 });
  });

  it("o total é sempre peças + serviços, sem uma terceira conta que possa divergir", () => {
    const totais = totaisDaOrdem(
      [itemLancado("peca", 3, 33.33), itemLancado("servico", 2, 11.11)],
      [itemDigitado("peca", "1", "0.01")],
    );
    expect(totais.total).toBe(totais.pecas + totais.servicos);
  });
});

// ---------------------------------------------------------------------------
// Costura do nome de vendedor e técnico (TR-04.3)
// ---------------------------------------------------------------------------
// O que estas duas funções protegem: antes da migration 0056 os nomes vinham
// por join embutido em `funcionarios`, e aquela tabela passou a exigir a
// permissão do módulo. Join embutido em tabela fechada não dá erro — devolve
// `null` calado. Estes testes são o "alguém fica sabendo" dessa troca.

function ordemCom(
  vendedorId: string | null,
  tecnicoIds: (string | null)[] = [],
): OrdemServico {
  return {
    id: crypto.randomUUID(),
    numero: 1,
    loja_id: "loja",
    cliente_id: "cliente",
    veiculo_id: null,
    status: "em_andamento",
    km_entrada: null,
    descricao_problema: null,
    forma_pagamento: null,
    parcelas: 1,
    data_abertura: "2026-09-18T12:00:00Z",
    data_fechamento: null,
    vendedor_id: vendedorId,
    criado_por_id: null,
    atualizado_por_id: null,
    itens: tecnicoIds.map((tecnicoId) => ({
      id: crypto.randomUUID(),
      ordem_servico_id: "os",
      tipo: "servico" as const,
      peca_id: null,
      servico_id: null,
      tecnico_id: tecnicoId,
      descricao: "Serviço",
      quantidade: 1,
      preco_unitario: 10,
      desconto: 0,
    })),
  };
}

describe("idsDeFuncionarios", () => {
  it("junta vendedor da OS e técnico do item, sem repetir", () => {
    const ids = idsDeFuncionarios([ordemCom("ana", ["bia", "ana"]), ordemCom("bia", ["bia"])]);
    expect([...ids].sort()).toEqual(["ana", "bia"]);
  });

  it("devolve lista vazia quando ninguém foi preenchido, pra não gastar consulta", () => {
    expect(idsDeFuncionarios([ordemCom(null, [null, null])])).toEqual([]);
  });
});

describe("nomearFuncionarios", () => {
  const nomes = new Map([
    ["ana", "Ana Souza"],
    ["bia", "Bia Lima"],
  ]);

  it("põe o nome no vendedor da OS e no técnico de cada item", () => {
    const [ordem] = nomearFuncionarios([ordemCom("ana", ["bia"])], nomes);
    expect(ordem.vendedor).toEqual({ nome: "Ana Souza" });
    expect(ordem.itens?.[0].tecnico).toEqual({ nome: "Bia Lima" });
  });

  it("id sem nome vira null, nunca um objeto com texto vazio", () => {
    // Acontece de verdade: funcionário de outra loja não vem na view pública.
    // A tela sabe mostrar o travessão pra `null`; pra `{ nome: "" }` ela
    // mostraria "técnico: " e ninguém entenderia.
    const [ordem] = nomearFuncionarios([ordemCom("zé", ["zé"])], nomes);
    expect(ordem.vendedor).toBeNull();
    expect(ordem.itens?.[0].tecnico).toBeNull();
  });

  it("item sem técnico continua sem técnico", () => {
    const [ordem] = nomearFuncionarios([ordemCom(null, [null])], nomes);
    expect(ordem.itens?.[0].tecnico).toBeNull();
  });

  it("não perde nenhum outro campo da ordem nem do item", () => {
    const original = ordemCom("ana", ["bia"]);
    const [ordem] = nomearFuncionarios([original], nomes);
    expect(ordem.numero).toBe(original.numero);
    expect(ordem.itens?.[0].preco_unitario).toBe(10);
    expect(ordem.itens).toHaveLength(1);
  });
});

describe("problemaDoItem", () => {
  it("aceita o item comum, o de graça e o desconto que zera a linha", () => {
    expect(problemaDoItem({ quantidade: 2, preco_unitario: 150, desconto: 30 })).toBeNull();
    expect(problemaDoItem({ quantidade: 1, preco_unitario: 0, desconto: 0 })).toBeNull();
    expect(problemaDoItem({ quantidade: 2, preco_unitario: 10, desconto: 20 })).toBeNull();
    // 0.1 × 3 dá 0.30000000000000004 em ponto flutuante — não pode virar "desconto maior"
    expect(problemaDoItem({ quantidade: 3, preco_unitario: 0.1, desconto: 0.3 })).toBeNull();
  });

  it("recusa preço negativo, desconto negativo e desconto maior que a linha", () => {
    expect(problemaDoItem({ quantidade: 1, preco_unitario: -1, desconto: 0 })).toMatch(/preço/);
    expect(problemaDoItem({ quantidade: 1, preco_unitario: 10, desconto: -1 })).toMatch(/negativo/);
    expect(problemaDoItem({ quantidade: 1, preco_unitario: 10, desconto: 10.01 })).toMatch(/maior que o valor do item/);
  });
});

describe("ordemServicoFormSchema", () => {
  // Rascunho gravado pela versão anterior ao orçamento (#379) não tem
  // `validade`. Restaurado, ele não pode travar o "Salvar" da OS em silêncio
  // (o campo nem aparece na OS, então o erro não teria onde aparecer).
  it("aceita um rascunho antigo, sem validade, e completa com vazio", () => {
    const rascunhoAntigo = {
      cliente_id: "c1",
      veiculo_id: "",
      km_entrada: "",
      descricao_problema: "",
      vendedor_id: "",
      itens: [],
    };
    const resultado = ordemServicoFormSchema.safeParse(rascunhoAntigo);
    expect(resultado.success).toBe(true);
    expect(resultado.data?.validade).toBe("");
  });
});

// Peça digitada sem cadastro no orçamento (#655) tem um custo opcional. Ele só
// vai pro banco nesse item: nos outros a chave nem é mandada, pra OS comum
// continuar gravando num banco ainda sem a coluna (anterior à 0066).
describe("custo da peça avulsa", () => {
  const linha = (sobrescrever: Partial<ItemFormValues>): ItemFormValues => ({
    ...itemFormVazio,
    descricao: "Válvula",
    quantidade: "4",
    preco_unitario: "15",
    ...sobrescrever,
  });

  it("item novo começa com o custo vazio", () => {
    expect(itemFormVazio.custo_unitario).toBe("");
  });

  it("rascunho antigo, com item sem o campo, abre com custo vazio", () => {
    const itemAntigo: Partial<ItemFormValues> = linha({});
    delete itemAntigo.custo_unitario;
    const resultado = ordemServicoFormSchema.safeParse({
      cliente_id: "c1",
      veiculo_id: "",
      km_entrada: "",
      descricao_problema: "",
      vendedor_id: "",
      validade: "",
      itens: [itemAntigo],
    });
    expect(resultado.success).toBe(true);
    expect(resultado.data?.itens[0].custo_unitario).toBe("");
  });

  it("peça avulsa leva o custo (número, ou null se vazio)", () => {
    const [comCusto, semCusto] = paraItensValidos([
      linha({ custo_unitario: "6.5" }),
      linha({ custo_unitario: "" }),
    ]);
    expect(comCusto).toMatchObject({ peca_id: null, custo_unitario: 6.5 });
    expect(semCusto).toHaveProperty("custo_unitario", null);
  });

  it("peça do cadastro e serviço não mandam a chave, nem com algo digitado", () => {
    const [cadastrada, servico] = paraItensValidos([
      linha({ peca_id: "pneu", custo_unitario: "6.5" }),
      linha({ tipo: "servico", servico_id: "alinhamento", custo_unitario: "6.5" }),
    ]);
    expect(cadastrada).not.toHaveProperty("custo_unitario");
    expect(servico).not.toHaveProperty("custo_unitario");
  });

  it("corrigir um item: mesma regra", () => {
    expect(paraPatchItem(linha({ custo_unitario: "7" }))).toHaveProperty("custo_unitario", 7);
    expect(paraPatchItem(linha({ custo_unitario: " " }))).toHaveProperty("custo_unitario", null);
    expect(paraPatchItem(linha({ peca_id: "pneu", custo_unitario: "7" }))).not.toHaveProperty(
      "custo_unitario",
    );
  });

  it("abrir um item já lançado preenche o custo (vazio se não informado)", () => {
    const avulsa: ItemOS = { ...itemLancado("peca", 4, 15), peca_id: null, custo_unitario: 6.5 };
    expect(paraValoresItemExistente(avulsa).custo_unitario).toBe("6.5");
    expect(paraValoresItemExistente({ ...avulsa, custo_unitario: null }).custo_unitario).toBe("");
    expect(paraValoresItemExistente(itemLancado("peca", 1, 10)).custo_unitario).toBe("");
  });

  it("custo negativo é recusado, e o aviso aparece no campo do custo", () => {
    expect(
      problemaDoItem({ quantidade: 1, preco_unitario: 10, desconto: 0, custo_unitario: -1 }),
    ).toBe("O custo não pode ser negativo.");
    expect(
      problemaDoItem({ quantidade: 1, preco_unitario: 10, desconto: 0, custo_unitario: null }),
    ).toBeNull();
    const resultado = itemExistenteFormSchema.safeParse(linha({ custo_unitario: "-1" }));
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]).toMatchObject({
      message: "O custo não pode ser negativo.",
      path: ["custo_unitario"],
    });
  });
});
