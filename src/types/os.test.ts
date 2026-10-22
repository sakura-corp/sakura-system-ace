import { describe, expect, it } from "vitest";
import {
  ehVendaBalcao,
  nomeDocumento,
  nomeOrdem,
  STATUS_COR,
  STATUS_LABEL,
  totalOrdem,
  totalPorTipo,
} from "./os";
import type { ItemOS } from "./os";

function item(sobrescreve: Partial<ItemOS>): ItemOS {
  return {
    id: "item-1",
    ordem_servico_id: "os-1",
    tipo: "peca",
    peca_id: null,
    servico_id: null,
    tecnico_id: null,
    descricao: "Item de teste",
    quantidade: 1,
    preco_unitario: 0,
    desconto: 0,
    ...sobrescreve,
  };
}

describe("totalOrdem", () => {
  it("soma quantidade x preço unitário de cada item, menos o desconto", () => {
    const itens = [
      item({ quantidade: 2, preco_unitario: 50, desconto: 0 }),
      item({ quantidade: 1, preco_unitario: 100, desconto: 10 }),
    ];
    // (2 * 50) + (1 * 100 - 10) = 100 + 90 = 190
    expect(totalOrdem(itens)).toBe(190);
  });

  it("devolve 0 pra lista vazia (OS sem item nenhum)", () => {
    expect(totalOrdem([])).toBe(0);
  });
});

describe("totalPorTipo", () => {
  it("soma só os itens do tipo pedido, ignorando o outro tipo", () => {
    const itens = [
      item({ tipo: "peca", quantidade: 1, preco_unitario: 100, desconto: 0 }),
      item({ tipo: "servico", quantidade: 1, preco_unitario: 50, desconto: 0 }),
      item({ tipo: "peca", quantidade: 2, preco_unitario: 20, desconto: 0 }),
    ];
    expect(totalPorTipo(itens, "peca")).toBe(140);
    expect(totalPorTipo(itens, "servico")).toBe(50);
  });
});

describe("nomeOrdem", () => {
  it("monta o nome curto da OS a partir do número sequencial", () => {
    expect(nomeOrdem(12)).toBe("OS 12");
  });

  it("venda de balcão usa o mesmo número, só troca a palavra", () => {
    expect(nomeOrdem(17, "venda_balcao")).toBe("Venda 17");
    expect(nomeOrdem(17, "os")).toBe("OS 17");
    // Banco anterior à migration 0064 não manda o tipo: é OS.
    expect(nomeOrdem(17, undefined)).toBe("OS 17");
    expect(nomeOrdem(17, null)).toBe("OS 17");
  });
});

describe("ehVendaBalcao", () => {
  it("só é venda quando o tipo diz — ausente (banco antigo) é OS", () => {
    expect(ehVendaBalcao({ tipo: "venda_balcao" })).toBe(true);
    expect(ehVendaBalcao({ tipo: "os" })).toBe(false);
    expect(ehVendaBalcao({})).toBe(false);
    expect(ehVendaBalcao(null)).toBe(false);
  });
});

// Orçamento (#379): não tem número de OS até ser aprovado — tem o seu
// próprio contador (`numero_orcamento`). O nome mostrado acompanha a etapa.
describe("nomeDocumento", () => {
  it("orçamento aberto ou recusado mostra o número do orçamento", () => {
    expect(nomeDocumento({ status: "orcamento", numero: null, numero_orcamento: 45 })).toBe(
      "Orçamento 45",
    );
    expect(nomeDocumento({ status: "recusado", numero: null, numero_orcamento: 46 })).toBe(
      "Orçamento 46",
    );
  });

  it("orçamento aprovado já é OS, com o número de OS", () => {
    expect(nomeDocumento({ status: "em_andamento", numero: 17, numero_orcamento: 45 })).toBe("OS 17");
  });

  it("OS e venda de balcão continuam como sempre", () => {
    expect(nomeDocumento({ status: "faturada", numero: 17 })).toBe("OS 17");
    expect(nomeDocumento({ status: "concluida", numero: 17, tipo: "venda_balcao" })).toBe("Venda 17");
  });
});

describe("STATUS_LABEL e STATUS_COR", () => {
  it("orçamento e recusado têm nome e cor neutra (cinza), como na tarefa", () => {
    expect(STATUS_LABEL.orcamento).toBe("Orçamento");
    expect(STATUS_LABEL.recusado).toBe("Recusado");
    expect(STATUS_COR.orcamento).toMatch(/slate|gray|zinc|neutral|stone/);
    expect(STATUS_COR.recusado).toMatch(/slate|gray|zinc|neutral|stone/);
  });
});
