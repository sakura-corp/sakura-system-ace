import { describe, expect, it } from "vitest";
import {
  acharPorCodigoExato,
  consumoPorDiaDasPecas,
  lerSaldo,
  movimentoDeEstoqueInicial,
  pecaCasaComBusca,
  precisaComprar,
} from "./estoque";

describe("lerSaldo", () => {
  it("trata saldo negativo como erro de lançamento, não como pouco estoque", () => {
    expect(lerSaldo(-3, null).situacao).toBe("negativo");
    // Nem mesmo com mínimo cadastrado o negativo vira "abaixo do mínimo":
    // comprar não conserta um lançamento errado.
    expect(lerSaldo(-3, 10).situacao).toBe("negativo");
    expect(lerSaldo(-3, 10).faltam).toBeNull();
  });

  it("mostra saldo zerado mesmo sem mínimo cadastrado", () => {
    expect(lerSaldo(0, null).situacao).toBe("zerado");
    expect(lerSaldo(0, null).faltam).toBeNull();
  });

  it("com mínimo cadastrado, o zerado já diz quanto comprar", () => {
    expect(lerSaldo(0, 4)).toEqual({ situacao: "zerado", faltam: 4 });
  });

  it("saldo IGUAL ao mínimo já avisa — o mínimo é o ponto de comprar", () => {
    expect(lerSaldo(2, 2)).toEqual({ situacao: "abaixo_do_minimo", faltam: 0 });
  });

  it("abaixo do mínimo diz quantas faltam pra voltar ao mínimo", () => {
    expect(lerSaldo(1, 5)).toEqual({ situacao: "abaixo_do_minimo", faltam: 4 });
  });

  it("acima do mínimo é normal", () => {
    expect(lerSaldo(10, 5)).toEqual({ situacao: "normal", faltam: null });
  });

  it("peça SEM mínimo cadastrado nunca vira aviso", () => {
    // O catálogo inteiro nasce sem mínimo (migration 0051 não faz backfill).
    // Se `null` virasse zero, todo produto com saldo 1 acusaria alarme no dia
    // em que a coluna nascesse.
    expect(lerSaldo(1, null).situacao).toBe("normal");
    expect(lerSaldo(9999, null).situacao).toBe("normal");
  });

  it("mínimo ZERO é um mínimo de verdade, diferente de não ter mínimo", () => {
    // "não pode faltar nenhuma": com saldo 1 está acima de zero, tudo bem.
    expect(lerSaldo(1, 0).situacao).toBe("normal");
    // mas o zerado com mínimo zero continua sendo zerado, sem "faltam".
    expect(lerSaldo(0, 0)).toEqual({ situacao: "zerado", faltam: null });
  });

  it("aceita quantidade fracionada (a coluna é numeric(12,2))", () => {
    expect(lerSaldo(1.5, 2)).toEqual({ situacao: "abaixo_do_minimo", faltam: 0.5 });
  });
});

describe("precisaComprar", () => {
  it("pega abaixo do mínimo e zerado COM mínimo", () => {
    expect(precisaComprar(1, 5)).toBe(true);
    expect(precisaComprar(0, 5)).toBe(true);
  });

  it("não pega o que está normal, nem o zerado sem mínimo, nem o negativo", () => {
    expect(precisaComprar(10, 5)).toBe(false);
    expect(precisaComprar(0, null)).toBe(false);
    expect(precisaComprar(-2, 5)).toBe(false);
  });
});

describe("pecaCasaComBusca", () => {
  const peca = {
    descricao: "PNEU ARO 14 SUSPENSÃO",
    codigo_interno: "REF-77",
    codigo_barras: "7891234567890",
    marca: "Pirelli",
    modelo: "P400",
    medida: "175/70 R14",
  };

  it("acha por descrição, referência, código de barras, marca e modelo", () => {
    for (const termo of ["pneu", "REF-77", "789123", "pirelli", "p400"]) {
      expect(pecaCasaComBusca(peca, termo)).toBe(true);
    }
  });

  it("acha pela medida do pneu — a pergunta do balcão", () => {
    expect(pecaCasaComBusca(peca, "175/70")).toBe(true);
    expect(pecaCasaComBusca(peca, "175/70 R14")).toBe(true);
  });

  it("ignora acento e maiúscula", () => {
    expect(pecaCasaComBusca(peca, "suspensao")).toBe(true);
    expect(pecaCasaComBusca(peca, "SuSpEnSÃo")).toBe(true);
  });

  it("busca vazia deixa tudo passar", () => {
    expect(pecaCasaComBusca(peca, "   ")).toBe(true);
  });

  it("não casa com o que não está lá", () => {
    expect(pecaCasaComBusca(peca, "amortecedor")).toBe(false);
  });

  it("aguenta peça com todos os campos opcionais vazios", () => {
    const vazia = {
      descricao: "X",
      codigo_interno: null,
      codigo_barras: null,
      marca: null,
      modelo: null,
      medida: null,
    };
    expect(pecaCasaComBusca(vazia, "x")).toBe(true);
    expect(pecaCasaComBusca(vazia, "y")).toBe(false);
  });
});

describe("acharPorCodigoExato", () => {
  const base = { descricao: "", marca: null, modelo: null, medida: null };
  const pecas = [
    { ...base, id: "a", codigo_barras: "7891234567890", codigo_interno: "REF-1" },
    { ...base, id: "b", codigo_barras: "7899999999999", codigo_interno: "REF-2" },
    { ...base, id: "c", codigo_barras: "7899999999999", codigo_interno: "REF-3" },
  ];

  it("acha pelo código de barras exato (o que o leitor digita)", () => {
    expect(acharPorCodigoExato(pecas, "7891234567890")?.id).toBe("a");
  });

  it("acha também pela referência", () => {
    expect(acharPorCodigoExato(pecas, "ref-1")?.id).toBe("a");
  });

  it("não abre nada com correspondência só parcial", () => {
    // Abrir a peça errada é pior que não abrir nada.
    expect(acharPorCodigoExato(pecas, "789123")).toBeNull();
  });

  it("não escolhe sozinho quando duas peças têm o mesmo código", () => {
    expect(acharPorCodigoExato(pecas, "7899999999999")).toBeNull();
  });

  it("termo vazio não abre nada", () => {
    expect(acharPorCodigoExato(pecas, "")).toBeNull();
  });
});

describe("dado vindo de uma versão anterior à migration 0051", () => {
  it("trata coluna ausente (undefined) como 'sem mínimo', não como mínimo zero", () => {
    // Um app atualizado falando com um banco que ainda não rodou a 0051
    // recebe a peça SEM a chave `estoque_minimo`. `undefined !== null` é
    // verdadeiro, então uma comparação desatenta acusaria alarme em tudo.
    expect(lerSaldo(1, undefined).situacao).toBe("normal");
    expect(lerSaldo(0, undefined)).toEqual({ situacao: "zerado", faltam: null });
    expect(precisaComprar(0, undefined)).toBe(false);
  });
});

describe("movimentoDeEstoqueInicial (#720)", () => {
  it("com quantidade, é uma entrada de ajuste com a referência do cadastro", () => {
    expect(movimentoDeEstoqueInicial("p-1", 4)).toEqual({
      peca_id: "p-1",
      tipo: "entrada",
      quantidade: 4,
      motivo: "ajuste",
      referencia: "Estoque inicial (cadastro do produto)",
    });
  });

  it("vazio, zero ou negativo: não lança nada", () => {
    expect(movimentoDeEstoqueInicial("p-1", null)).toBeNull();
    expect(movimentoDeEstoqueInicial("p-1", 0)).toBeNull();
    expect(movimentoDeEstoqueInicial("p-1", -2)).toBeNull();
  });
});

// --- Sugestão de compra (#382, FN-07) --------------------------------------

// Meio-dia em São Paulo é o mesmo dia em UTC: o teste passa nos dois fusos
// (`npm run test:fusos`) sem depender de onde roda.
const meioDia = (dia: string) => `${dia}T12:00:00-03:00`;
const HOJE = "2026-11-10";

describe("consumoPorDiaDasPecas", () => {
  it("soma as saídas de venda e de uso em OS e divide pelos dias da janela", () => {
    const consumo = consumoPorDiaDasPecas(
      [
        { peca_id: "p1", tipo: "saida", motivo: "venda", quantidade: 6, criado_em: meioDia(HOJE) },
        { peca_id: "p1", tipo: "saida", motivo: "uso_em_os", quantidade: 3, criado_em: meioDia("2026-10-01") },
      ],
      HOJE,
    );
    expect(consumo.get("p1")).toBe(0.1); // 9 em 90 dias
  });

  it("ajuste e compra não são consumo", () => {
    const consumo = consumoPorDiaDasPecas(
      [
        { peca_id: "p1", tipo: "saida", motivo: "ajuste", quantidade: 50, criado_em: meioDia(HOJE) },
        { peca_id: "p1", tipo: "entrada", motivo: "compra", quantidade: 50, criado_em: meioDia(HOJE) },
        { peca_id: "p1", tipo: "saida", motivo: "venda", quantidade: 9, criado_em: meioDia(HOJE) },
      ],
      HOJE,
    );
    expect(consumo.get("p1")).toBe(0.1);
  });

  it("a janela de 90 dias conta hoje: o 90º dia (13/08) entra, o 91º (12/08) não", () => {
    const consumo = consumoPorDiaDasPecas(
      [
        { peca_id: "p1", tipo: "saida", motivo: "venda", quantidade: 9, criado_em: meioDia("2026-08-13") },
        { peca_id: "p2", tipo: "saida", motivo: "venda", quantidade: 9, criado_em: meioDia("2026-08-12") },
      ],
      HOJE,
    );
    expect(consumo.get("p1")).toBe(0.1);
    expect(consumo.get("p2") ?? 0).toBe(0);
  });

  it("movimento com dia depois de hoje fica fora", () => {
    const consumo = consumoPorDiaDasPecas(
      [{ peca_id: "p1", tipo: "saida", motivo: "venda", quantidade: 9, criado_em: meioDia("2026-11-11") }],
      HOJE,
    );
    expect(consumo.get("p1") ?? 0).toBe(0);
  });

  it("aceita outra janela", () => {
    const consumo = consumoPorDiaDasPecas(
      [{ peca_id: "p1", tipo: "saida", motivo: "venda", quantidade: 6, criado_em: meioDia("2026-11-01") }],
      HOJE,
      30,
    );
    expect(consumo.get("p1")).toBe(0.2);
  });
});
