import { describe, expect, it } from "vitest";
import type {
  CotacaoParaSugestao,
  MovimentoParaConsumo,
  PecaParaSugestao,
  PedidoParaSugestao,
} from "./estoque";
import {
  acharPorCodigoExato,
  agruparPorFornecedor,
  consumoPorDiaDasPecas,
  lerQuantidadeDigitada,
  lerSaldo,
  montarSugestaoCompra,
  movimentoDeEstoqueInicial,
  pecaCasaComBusca,
  precisaComprar,
  totalDaLinha,
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

function peca(id: string, extra: Partial<PecaParaSugestao> = {}): PecaParaSugestao {
  return { id, descricao: `Peça ${id}`, unidade: "un", estoque_minimo: null, ativo: true, ...extra };
}

/** `quantidade` vendida hoje: em 90 dias, dá `quantidade / 90` por dia. */
function vendaDeHoje(pecaId: string, quantidade: number): MovimentoParaConsumo {
  return { peca_id: pecaId, tipo: "saida", motivo: "venda", quantidade, criado_em: meioDia(HOJE) };
}

function sugestao(dados: {
  pecas: PecaParaSugestao[];
  saldos?: Record<string, number>;
  movimentos?: MovimentoParaConsumo[];
  cotacoes?: CotacaoParaSugestao[];
  pedidos?: PedidoParaSugestao[];
}) {
  return montarSugestaoCompra({
    pecas: dados.pecas,
    saldos: new Map(Object.entries(dados.saldos ?? {})),
    movimentos: dados.movimentos ?? [],
    cotacoes: dados.cotacoes ?? [],
    pedidos: dados.pedidos ?? [],
    hoje: HOJE,
  });
}

describe("montarSugestaoCompra — quem entra e quanto", () => {
  it("peça sem histórico de saída entra pelo mínimo, sem ritmo e sem dias restantes", () => {
    const [linha, ...resto] = sugestao({
      pecas: [peca("p1", { estoque_minimo: 4 }), peca("p2")],
      saldos: { p1: 1, p2: 0 },
    });
    // p2: zerada, mas sem mínimo e sem saída nenhuma — nada diz que falta.
    expect(resto).toEqual([]);
    expect(linha).toMatchObject({
      peca_id: "p1",
      saldo: 1,
      estoque_minimo: 4,
      consumoPorDia: 0,
      diasRestantes: null,
      jaPedido: 0,
      quantidadeSugerida: 3,
    });
  });

  it("saldo negativo fica fora, mesmo com mínimo e com saída", () => {
    expect(
      sugestao({
        pecas: [peca("p1", { estoque_minimo: 4 })],
        saldos: { p1: -2 },
        movimentos: [vendaDeHoje("p1", 90)],
      }),
    ).toEqual([]);
  });

  it("peça inativa fica fora", () => {
    expect(
      sugestao({ pecas: [peca("p1", { estoque_minimo: 4, ativo: false })], saldos: { p1: 0 } }),
    ).toEqual([]);
  });

  it("peça sem mínimo só entra pelo ritmo de saída", () => {
    const linhas = sugestao({
      pecas: [peca("rapida"), peca("lenta")],
      saldos: { rapida: 5, lenta: 5 },
      // rápida: 45 em 90 dias = 0,5/dia → 5 dão 10 dias (< 15, entra)
      // lenta:   9 em 90 dias = 0,1/dia → 5 dão 50 dias (fica fora)
      movimentos: [vendaDeHoje("rapida", 45), vendaDeHoje("lenta", 9)],
    });
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      peca_id: "rapida",
      consumoPorDia: 0.5,
      diasRestantes: 10,
      // alvo = 0 + 0,5 × 15 = 7,5; faltam 2,5 → 3
      quantidadeSugerida: 3,
    });
  });

  it("peça que não está no mapa de saldos conta como saldo zero", () => {
    const [linha] = sugestao({ pecas: [peca("p1", { estoque_minimo: 2 })] });
    expect(linha).toMatchObject({ saldo: 0, quantidadeSugerida: 2 });
  });

  it("cauda de ponto flutuante não vira uma unidade a mais", () => {
    // 186 / 90 × 15 = 31 na conta, mas 31.000000000000004 no computador:
    // sem o arredondamento antes do ceil, sugeriria 32.
    const [linha] = sugestao({ pecas: [peca("p1")], movimentos: [vendaDeHoje("p1", 186)] });
    expect(linha.quantidadeSugerida).toBe(31);
  });
});

describe("montarSugestaoCompra — o que já está pedido", () => {
  const item = (pedida: number, recebida: number) => ({
    peca_id: "p1",
    quantidade_pedida: pedida,
    quantidade_recebida: recebida,
  });

  it("pedido pendente e parcial descontam o que falta chegar", () => {
    const [linha] = sugestao({
      pecas: [peca("p1", { estoque_minimo: 10 })],
      saldos: { p1: 0 },
      pedidos: [
        { status: "pendente", itens: [item(3, 0)] }, // faltam 3
        { status: "parcial", itens: [item(5, 2)] }, // faltam 3
      ],
    });
    expect(linha).toMatchObject({ jaPedido: 6, quantidadeSugerida: 4 });
  });

  it("recebido e cancelado não descontam", () => {
    const [linha] = sugestao({
      pecas: [peca("p1", { estoque_minimo: 10 })],
      saldos: { p1: 0 },
      pedidos: [
        { status: "recebido", itens: [item(10, 4)] }, // fechado com falta: não vem mais
        { status: "cancelado", itens: [item(7, 0)] },
      ],
    });
    expect(linha).toMatchObject({ jaPedido: 0, quantidadeSugerida: 10 });
  });

  it("item que chegou a mais não vira desconto negativo", () => {
    const [linha] = sugestao({
      pecas: [peca("p1", { estoque_minimo: 10 })],
      saldos: { p1: 0 },
      pedidos: [{ status: "parcial", itens: [item(2, 5), item(4, 1)] }],
    });
    expect(linha.jaPedido).toBe(3);
  });

  it("item de outra peça no mesmo pedido não desconta", () => {
    const [linha] = sugestao({
      pecas: [peca("p1", { estoque_minimo: 10 })],
      saldos: { p1: 0 },
      pedidos: [
        { status: "pendente", itens: [{ peca_id: "p2", quantidade_pedida: 8, quantidade_recebida: 0 }] },
      ],
    });
    expect(linha.jaPedido).toBe(0);
  });

  it("com tudo já pedido, a peça continua na lista com sugestão zero", () => {
    const [linha] = sugestao({
      pecas: [peca("p1", { estoque_minimo: 10 })],
      saldos: { p1: 2 },
      pedidos: [{ status: "pendente", itens: [item(12, 0)] }],
    });
    expect(linha).toMatchObject({ jaPedido: 12, quantidadeSugerida: 0 });
  });
});

function cotacao(
  pecaId: string,
  fornecedorId: string,
  nome: string,
  preco: number,
  dia: string,
): CotacaoParaSugestao {
  return { peca_id: pecaId, fornecedor_id: fornecedorId, fornecedor_nome: nome, preco, criado_em: meioDia(dia) };
}

describe("totalDaLinha", () => {
  it("fecha no centavo", () => {
    expect(totalDaLinha(3, 0.1)).toBe(0.3); // 0.30000000000000004 sem arredondar
    expect(totalDaLinha(3, 33.335)).toBe(100.01);
  });
});

describe("montarSugestaoCompra — fornecedor e preço", () => {
  const p1 = peca("p1", { estoque_minimo: 3 });

  it("peça sem cotação fica sem fornecedor, sem preço e sem total", () => {
    const [linha] = sugestao({
      pecas: [p1],
      saldos: { p1: 0 },
      cotacoes: [cotacao("outra", "f1", "Ana Pneus", 10, "2026-11-01")],
    });
    expect(linha).toMatchObject({ fornecedor: null, preco: null, total: null });
  });

  it("escolhe o mais barato e calcula o total", () => {
    const [linha] = sugestao({
      pecas: [p1],
      saldos: { p1: 0 },
      cotacoes: [
        cotacao("p1", "f1", "Ana Pneus", 120.5, "2026-11-01"),
        cotacao("p1", "f2", "Bruno Peças", 99.9, "2026-11-01"),
      ],
    });
    expect(linha).toMatchObject({
      fornecedor: { id: "f2", nome: "Bruno Peças" },
      preco: 99.9,
      total: 299.7,
    });
  });

  it("dois fornecedores com o mesmo preço: desempata pelo nome", () => {
    const [linha] = sugestao({
      pecas: [p1],
      saldos: { p1: 0 },
      cotacoes: [
        // o id "a" viria primeiro; o nome "Zeca" vem depois de "Ágata"
        cotacao("p1", "a", "Zeca Pneus", 50, "2026-11-01"),
        cotacao("p1", "b", "Ágata Distribuidora", 50, "2026-11-01"),
      ],
    });
    expect(linha.fornecedor).toEqual({ id: "b", nome: "Ágata Distribuidora" });
  });

  it("vale a última cotação de cada fornecedor, mesmo mais cara que uma antiga", () => {
    const [linha] = sugestao({
      pecas: [p1],
      saldos: { p1: 0 },
      cotacoes: [
        cotacao("p1", "f1", "Ana Pneus", 40, "2026-09-01"), // antiga, não vale mais
        cotacao("p1", "f1", "Ana Pneus", 80, "2026-11-01"),
        cotacao("p1", "f2", "Bruno Peças", 70, "2026-10-01"),
      ],
    });
    expect(linha).toMatchObject({ fornecedor: { id: "f2", nome: "Bruno Peças" }, preco: 70, total: 210 });
  });
});

describe("montarSugestaoCompra — ordem", () => {
  it("menos dias restantes primeiro, sem ritmo por último, empate pela descrição", () => {
    const linhas = sugestao({
      pecas: [
        peca("sem-ritmo-b", { descricao: "Bico", estoque_minimo: 2 }),
        peca("sem-ritmo-a", { descricao: "Água de bateria", estoque_minimo: 2 }),
        peca("dez", { descricao: "Pneu" }),
        peca("zero", { descricao: "Válvula" }),
        peca("dez-b", { descricao: "Amortecedor" }),
      ],
      saldos: { "sem-ritmo-b": 0, "sem-ritmo-a": 1, dez: 5, zero: 0, "dez-b": 5 },
      movimentos: [vendaDeHoje("dez", 45), vendaDeHoje("zero", 9), vendaDeHoje("dez-b", 45)],
    });
    expect(linhas.map((l) => l.peca_id)).toEqual(["zero", "dez-b", "dez", "sem-ritmo-a", "sem-ritmo-b"]);
  });
});

describe("agruparPorFornecedor", () => {
  const bruno = { id: "f2", nome: "Bruno Peças" };
  const ana = { id: "f1", nome: "Ana Pneus" };

  it("um grupo por fornecedor, em ordem de nome, itens na ordem de entrada", () => {
    const grupos = agruparPorFornecedor([
      { peca_id: "p1", descricao: "Pneu", quantidade: 4, fornecedor: bruno, preco: 300 },
      { peca_id: "p2", descricao: "Válvula", quantidade: 10, fornecedor: ana, preco: 2.5 },
      { peca_id: "p3", descricao: "Bico", quantidade: 3, fornecedor: bruno, preco: 0.1 },
    ]);
    expect(grupos).toEqual([
      {
        fornecedor: ana,
        itens: [{ peca_id: "p2", descricao: "Válvula", quantidade: 10, preco: 2.5, total: 25 }],
        total: 25,
      },
      {
        fornecedor: bruno,
        itens: [
          { peca_id: "p1", descricao: "Pneu", quantidade: 4, preco: 300, total: 1200 },
          { peca_id: "p3", descricao: "Bico", quantidade: 3, preco: 0.1, total: 0.3 },
        ],
        total: 1200.3,
      },
    ]);
  });

  it("deixa de fora item sem fornecedor, sem preço ou com quantidade zero", () => {
    const grupos = agruparPorFornecedor([
      { peca_id: "p1", descricao: "Sem fornecedor", quantidade: 4, fornecedor: null, preco: 10 },
      { peca_id: "p2", descricao: "Sem preço", quantidade: 4, fornecedor: ana, preco: null },
      { peca_id: "p3", descricao: "Já pedido", quantidade: 0, fornecedor: ana, preco: 10 },
      { peca_id: "p4", descricao: "Negativo", quantidade: -1, fornecedor: ana, preco: 10 },
      { peca_id: "p5", descricao: "Vai", quantidade: 1, fornecedor: ana, preco: 10 },
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].itens.map((i) => i.peca_id)).toEqual(["p5"]);
    expect(grupos[0].total).toBe(10);
  });

  it("o total do grupo fecha no centavo", () => {
    const [grupo] = agruparPorFornecedor([
      { peca_id: "p1", descricao: "A", quantidade: 1, fornecedor: ana, preco: 0.1 },
      { peca_id: "p2", descricao: "B", quantidade: 1, fornecedor: ana, preco: 0.2 },
    ]);
    expect(grupo.total).toBe(0.3); // 0.30000000000000004 numa soma direta
  });

  it("sem nada pra comprar, nenhum grupo", () => {
    expect(agruparPorFornecedor([])).toEqual([]);
  });
});

describe("lerQuantidadeDigitada (a caixa \"Comprar\" da Sugestão de compra)", () => {
  it("aceita inteiro e até 2 casas, com vírgula ou ponto (litro de óleo)", () => {
    expect(lerQuantidadeDigitada("7")).toBe(7);
    expect(lerQuantidadeDigitada("2,5")).toBe(2.5);
    expect(lerQuantidadeDigitada("2.25")).toBe(2.25);
    expect(lerQuantidadeDigitada(" 3 ")).toBe(3);
  });

  it("vazio vale 0: a pessoa apagou, a peça sai do pedido", () => {
    expect(lerQuantidadeDigitada("")).toBe(0);
  });

  it("negativo, 3 casas, texto e número que não cabe no banco são inválidos (null), nunca 0 calado", () => {
    expect(lerQuantidadeDigitada("-1")).toBeNull();
    expect(lerQuantidadeDigitada("1,234")).toBeNull();
    expect(lerQuantidadeDigitada("abc")).toBeNull();
    expect(lerQuantidadeDigitada("1e3")).toBeNull();
    expect(lerQuantidadeDigitada("10000000000")).toBeNull();
  });
});
