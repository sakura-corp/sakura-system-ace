import { describe, expect, it } from "vitest";
import {
  buscarPecasDaVenda,
  incluirPeca,
  lucroPrevistoDaVenda,
  paraItensDaVenda,
  pecaDoEnter,
  podeReceberDepois,
  totalDaVenda,
  vendaBalcaoFormSchema,
  vendaVazia,
  type ItemVendaValues,
} from "./vendaBalcao";
import { lucroDaOrdem } from "./orcamento";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";

function peca(sobrescrever: Partial<Parameters<typeof incluirPeca>[1]> = {}) {
  return {
    id: "palheta",
    descricao: 'Palheta 20"',
    codigo_interno: "PAL20",
    codigo_barras: "7891234567890",
    marca: "Bosch",
    modelo: null,
    medida: null,
    preco_venda: 35,
    ...sobrescrever,
  };
}

const bateria = peca({
  id: "bateria",
  descricao: "Bateria 60Ah",
  codigo_interno: "BAT60",
  codigo_barras: "7890000000001",
  marca: "Moura",
  preco_venda: 520,
});

describe("vendaVazia", () => {
  it("começa no Consumidor, sem peça, com quem está logado como vendedor", () => {
    expect(vendaVazia("func-1")).toEqual({
      cliente_id: CLIENTE_CONSUMIDOR_ID,
      vendedor_id: "func-1",
      origem: "",
      origem_detalhe: "",
      itens: [],
    });
  });
});

describe("incluirPeca", () => {
  it("põe a peça com quantidade 1 e o preço de venda do cadastro", () => {
    expect(incluirPeca([], peca())).toEqual([
      { peca_id: "palheta", descricao: 'Palheta 20"', quantidade: "1", preco_unitario: "35", desconto: "" },
    ]);
  });

  it("passar o leitor de novo na mesma peça soma 1, em vez de criar outra linha", () => {
    const duas = incluirPeca(incluirPeca([], peca()), peca());
    expect(duas).toHaveLength(1);
    expect(duas[0].quantidade).toBe("2");
  });

  it("não mexe nas outras linhas nem no preço já corrigido à mão", () => {
    const itens = incluirPeca(incluirPeca([], peca()), bateria);
    itens[0] = { ...itens[0], preco_unitario: "30" };
    const depois = incluirPeca(itens, peca());
    expect(depois.map((i) => [i.peca_id, i.quantidade, i.preco_unitario])).toEqual([
      ["palheta", "2", "30"],
      ["bateria", "1", "520"],
    ]);
  });

  it("peça sem preço de venda entra com o campo em branco, não com zero", () => {
    expect(incluirPeca([], peca({ preco_venda: null }))[0].preco_unitario).toBe("");
  });
});

describe("pecaDoEnter", () => {
  const catalogo = [peca(), bateria];

  it("o código de barras exato entra direto (é o leitor)", () => {
    expect(pecaDoEnter(catalogo, "7890000000001")?.id).toBe("bateria");
  });

  it("uma peça só na busca também entra", () => {
    expect(pecaDoEnter(catalogo, "moura")?.id).toBe("bateria");
  });

  it("com mais de uma parecida, não chuta nenhuma", () => {
    expect(pecaDoEnter(catalogo, "7")).toBeNull();
  });

  it("busca vazia não põe nada", () => {
    expect(pecaDoEnter(catalogo, "  ")).toBeNull();
  });
});

describe("buscarPecasDaVenda", () => {
  it("acha por nome sem acento e respeita o limite", () => {
    const muitas = Array.from({ length: 12 }, (_, i) => peca({ id: `p${i}` }));
    expect(buscarPecasDaVenda(muitas, "PALHETA")).toHaveLength(8);
    expect(buscarPecasDaVenda(muitas, "palheta", 3)).toHaveLength(3);
  });

  it("sem nada digitado, a lista fica fechada", () => {
    expect(buscarPecasDaVenda([peca()], "")).toEqual([]);
  });
});

describe("totalDaVenda", () => {
  it("é quantidade × preço − desconto, somado", () => {
    const itens: ItemVendaValues[] = [
      { peca_id: "a", descricao: "a", quantidade: "2", preco_unitario: "35", desconto: "5" },
      { peca_id: "b", descricao: "b", quantidade: "1", preco_unitario: "520", desconto: "" },
    ];
    expect(totalDaVenda(itens)).toBe(585);
  });
});

describe("paraItensDaVenda", () => {
  it("vira item de peça da OS, com números de verdade", () => {
    const itens = paraItensDaVenda([
      { peca_id: "a", descricao: " Palheta ", quantidade: "2", preco_unitario: "35", desconto: "" },
    ]);
    expect(itens).toEqual([
      {
        tipo: "peca",
        peca_id: "a",
        servico_id: null,
        tecnico_id: null,
        descricao: "Palheta",
        quantidade: 2,
        preco_unitario: 35,
        desconto: 0,
      },
    ]);
  });

  it("linha com quantidade zero não vai pro banco", () => {
    expect(
      paraItensDaVenda([
        { peca_id: "a", descricao: "x", quantidade: "0", preco_unitario: "35", desconto: "" },
      ]),
    ).toEqual([]);
  });
});

describe("vendaBalcaoFormSchema", () => {
  const item = (s: Partial<ItemVendaValues> = {}): ItemVendaValues => ({
    peca_id: "a",
    descricao: "Palheta",
    quantidade: "1",
    preco_unitario: "35",
    desconto: "",
    ...s,
  });

  it("aceita uma venda normal", () => {
    expect(vendaBalcaoFormSchema.safeParse({ ...vendaVazia(""), itens: [item()] }).success).toBe(true);
  });

  it("recusa venda sem peça, explicando o que fazer", () => {
    const r = vendaBalcaoFormSchema.safeParse(vendaVazia(""));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/leitor/);
  });

  it("recusa quantidade zero e desconto maior que o item (a trava do banco, antes)", () => {
    const r = vendaBalcaoFormSchema.safeParse({
      ...vendaVazia(""),
      itens: [item({ quantidade: "0" }), item({ desconto: "40" })],
    });
    expect(r.success).toBe(false);
    const caminhos = r.error?.issues.map((i) => i.path.join("."));
    expect(caminhos).toEqual(["itens.0.quantidade", "itens.1.desconto"]);
  });
});

describe("podeReceberDepois", () => {
  it("no Consumidor, não — não há de quem cobrar", () => {
    expect(podeReceberDepois(CLIENTE_CONSUMIDOR_ID)).toBe(false);
  });

  it("com cliente de verdade, sim", () => {
    expect(podeReceberDepois("cliente-1")).toBe(true);
  });
});

describe("lucroPrevistoDaVenda", () => {
  const custoPeca = new Map([
    ["palheta", 20],
    ["bateria", 400],
  ]);
  // Palheta: 2 × 35 − 5 = 65, custo 40 → 25. Bateria: 520, custo 400 → 120.
  const itens: ItemVendaValues[] = [
    { ...incluirPeca(incluirPeca([], peca()), peca())[0], desconto: "5" },
    incluirPeca([], bateria)[0],
  ];

  it("é o lucro da ordem com os mesmos itens", () => {
    const lucro = lucroPrevistoDaVenda(itens, custoPeca);
    expect(lucro).toEqual({ lucro: 145, falta: null });
    expect(lucro.lucro).toBe(lucroDaOrdem(paraItensDaVenda(itens), custoPeca, new Map()).lucro);
  });

  it("quem não lê o custo das peças vê o lucro só ao salvar", () => {
    expect(lucroPrevistoDaVenda(itens, null)).toEqual({ lucro: null, falta: "aparece-ao-salvar" });
  });

  it("venda vazia dá lucro zero", () => {
    expect(lucroPrevistoDaVenda([], custoPeca)).toEqual({ lucro: 0, falta: null });
  });
});
