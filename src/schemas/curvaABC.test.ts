import { describe, expect, it } from "vitest";
import { CORTES_ABC, classificarABC, contarPorLetra, curvasABC } from "./curvaABC";

// #390: a curva ABC. Os números são escolhidos pra se conferir de cabeça.

interface Linha {
  nome: string;
  valor: number;
}

const valorDe = (l: Linha) => l.valor;
const letras = (resultado: ReturnType<typeof classificarABC<Linha>>) =>
  resultado.linhas.map((l) => [l.linha.nome, l.letra]);

describe("classificarABC", () => {
  it("os cortes padrão são 80% e 95%, num lugar só", () => {
    expect(CORTES_ABC).toEqual({ A: 80, B: 95 });
  });

  it("um item com 80% vai sozinho pro A; o resto se divide entre B e C", () => {
    const resultado = classificarABC(
      [
        { nome: "pouco", valor: 4 },
        { nome: "grande", valor: 80 },
        { nome: "medio", valor: 10 },
        { nome: "outro", valor: 6 },
      ],
      valorDe,
    );
    // Do maior pro menor. Acumulado ANTES de cada: 0 → A; 80 → B; 90 → B;
    // 96 → C.
    expect(letras(resultado)).toEqual([
      ["grande", "A"],
      ["medio", "B"],
      ["outro", "B"],
      ["pouco", "C"],
    ]);
  });

  it("devolve a participação e a acumulada de cada linha, em %", () => {
    const resultado = classificarABC(
      [
        { nome: "a", valor: 50 },
        { nome: "b", valor: 30 },
        { nome: "c", valor: 20 },
      ],
      valorDe,
    );
    expect(resultado.total).toBe(100);
    expect(resultado.linhas.map((l) => [l.valor, l.participacao, l.acumulada])).toEqual([
      [50, 50, 50],
      [30, 30, 80],
      [20, 20, 100],
    ]);
  });

  it("a linha que passa do corte fica na letra de cima (o primeiro é sempre A)", () => {
    // 90% num item só: o A precisa de pelo menos um item.
    const resultado = classificarABC(
      [
        { nome: "quase-tudo", valor: 90 },
        { nome: "resto", valor: 10 },
      ],
      valorDe,
    );
    expect(letras(resultado)).toEqual([
      ["quase-tudo", "A"],
      ["resto", "B"],
    ]);
  });

  it("empate na fronteira: a ordem pelo nome decide, sempre a mesma", () => {
    // 60, 20, 20: "y" começa em 60% (A); "z" começa em 80% (B). Os dois
    // vendem igual: quem vem antes no nome fica em cima, em toda abertura.
    const linhas = [
      { nome: "z", valor: 20 },
      { nome: "x", valor: 60 },
      { nome: "y", valor: 20 },
    ];
    expect(letras(classificarABC(linhas, valorDe))).toEqual([
      ["x", "A"],
      ["y", "A"],
      ["z", "B"],
    ]);
    expect(letras(classificarABC([...linhas].reverse(), valorDe))).toEqual(
      letras(classificarABC(linhas, valorDe)),
    );
  });

  it("muitos de valor igual não vão todos pro A (100 clientes de R$ 30)", () => {
    const linhas = [
      { nome: "grande", valor: 500 },
      ...Array.from({ length: 100 }, (_, i) => ({ nome: `c${String(i).padStart(3, "0")}`, valor: 30 })),
    ];
    const contagem = contarPorLetra(classificarABC(linhas, valorDe));
    // Total 3500: o A para em 2800 (80%), o B em 3325 (95%).
    expect(contagem).toEqual({ A: 78, B: 18, C: 5 });
  });

  it("tudo igual: a curva corta pela ordem, e a última fecha em 100%", () => {
    const resultado = classificarABC(
      Array.from({ length: 20 }, (_, i) => ({ nome: `n${String(i).padStart(2, "0")}`, valor: 10 })),
      valorDe,
    );
    // Cada um tem 5%: começam em 0%, 5%, ..., 95%.
    expect(contarPorLetra(resultado)).toEqual({ A: 16, B: 3, C: 1 });
    expect(resultado.linhas.at(-1)?.acumulada).toBe(100);
  });

  it("lista vazia: nada, total zero", () => {
    const resultado = classificarABC<Linha>([], valorDe);
    expect(resultado.linhas).toEqual([]);
    expect(resultado.total).toBe(0);
    expect(contarPorLetra(resultado)).toEqual({ A: 0, B: 0, C: 0 });
  });

  it("um item só: A com 100%", () => {
    const resultado = classificarABC([{ nome: "só", valor: 42.5 }], valorDe);
    expect(resultado.linhas.map((l) => [l.letra, l.participacao, l.acumulada])).toEqual([
      ["A", 100, 100],
    ]);
  });

  it("valor zero, negativo ou fora da conta (null) vai pro C, no fim, sem entrar no acumulado", () => {
    const resultado = classificarABC(
      [
        { nome: "sem-custo", valor: Number.NaN },
        { nome: "prejuizo", valor: -10 },
        { nome: "bom", valor: 80 },
        { nome: "zero", valor: 0 },
        { nome: "ok", valor: 20 },
      ],
      (l) => (Number.isNaN(l.valor) ? null : l.valor),
    );
    expect(resultado.total).toBe(100);
    expect(
      resultado.linhas.map((l) => [l.linha.nome, l.letra, l.foraDaConta, l.acumulada]),
    ).toEqual([
      ["bom", "A", false, 80],
      ["ok", "B", false, 100],
      ["zero", "C", true, null],
      ["prejuizo", "C", true, null],
      ["sem-custo", "C", true, null],
    ]);
  });

  it("os cortes mudam a classificação (um lugar só pra ajustar)", () => {
    const linhas = [
      { nome: "a", valor: 80 },
      { nome: "b", valor: 15 },
      { nome: "c", valor: 5 },
    ];
    expect(letras(classificarABC(linhas, valorDe))).toEqual([
      ["a", "A"],
      ["b", "B"],
      ["c", "C"],
    ]);
    // Com o A indo até 95%, o "b" (que começa em 80%) sobe pro A.
    expect(letras(classificarABC(linhas, valorDe, { A: 95, B: 99 }))).toEqual([
      ["a", "A"],
      ["b", "A"],
      ["c", "B"],
    ]);
  });

  it("centavos: 0,1 + 0,2 não vira 0,30000000000000004 no total", () => {
    const resultado = classificarABC(
      [
        { nome: "a", valor: 0.1 },
        { nome: "b", valor: 0.2 },
      ],
      valorDe,
    );
    expect(resultado.total).toBe(0.3);
    expect(resultado.linhas.at(-1)?.acumulada).toBe(100);
  });

  it("contarPorLetra conta quantas linhas caíram em cada letra", () => {
    const resultado = classificarABC(
      [
        { nome: "grande", valor: 80 },
        { nome: "medio", valor: 10 },
        { nome: "outro", valor: 6 },
        { nome: "pouco", valor: 4 },
      ],
      valorDe,
    );
    expect(contarPorLetra(resultado)).toEqual({ A: 1, B: 2, C: 1 });
  });
});

// As três listas da tela, por venda ou por lucro, a partir do que a
// Lucratividade já calcula. A tela só mostra o que sai daqui.
describe("curvasABC", () => {
  const linha = (descricao: string, tipo: "peca" | "servico", receita: number, custo: number, custoNaoInformado = false) => ({
    descricao,
    tipo,
    quantidade: 1,
    receita,
    custo,
    margem: receita - custo,
    custoNaoInformado,
  });
  const cliente = (clienteId: string, nome: string, receita: number, custo: number, custoNaoInformado = false) => ({
    clienteId,
    nome,
    receita,
    custo,
    margem: receita - custo,
    custoNaoInformado,
  });
  const porItem = [
    linha("Pneu", "peca", 800, 600),
    linha("Farol", "peca", 500, 0, true),
    linha("Alinhamento", "servico", 80, 30),
    linha("Balanceamento", "servico", 40, 0),
  ];
  const porCliente = {
    linhas: [cliente("joao", "João", 880, 600), cliente("maria", "Maria", 40, 0)],
    consumidor: cliente("c", "Consumidor", 500, 0, true),
    totalReceita: 1420,
  };

  it("por venda: separa peças e serviços e soma o que entrou", () => {
    const curvas = curvasABC({ porItem, porCliente, criterio: "venda" });
    expect(curvas.pecas.linhas.map((l) => [l.linha.descricao, l.valor, l.letra])).toEqual([
      ["Pneu", 800, "A"],
      ["Farol", 500, "A"],
    ]);
    expect(curvas.servicos.linhas.map((l) => l.linha.descricao)).toEqual(["Alinhamento", "Balanceamento"]);
    expect(curvas.clientes.linhas.map((l) => l.linha.nome)).toEqual(["João", "Maria"]);
    expect(curvas.consumidor).toEqual({ valor: 500, custoNaoInformado: true });
    // Peças + serviços = clientes + Consumidor = o "Vendido no período".
    expect(curvas.pecas.total + curvas.servicos.total).toBe(1420);
    expect(curvas.clientes.total + (curvas.consumidor?.valor ?? 0)).toBe(1420);
  });

  it("por lucro: a linha sem custo informado vai pro C, fora da conta", () => {
    const curvas = curvasABC({ porItem, porCliente, criterio: "lucro" });
    expect(
      curvas.pecas.linhas.map((l) => [l.linha.descricao, l.valor, l.letra, l.foraDaConta]),
    ).toEqual([
      ["Pneu", 200, "A", false],
      ["Farol", null, "C", true],
    ]);
    expect(curvas.servicos.linhas.map((l) => [l.linha.descricao, l.valor])).toEqual([
      ["Alinhamento", 50],
      ["Balanceamento", 40],
    ]);
    // O Consumidor por lucro: sem custo informado, o lucro dele não vale.
    expect(curvas.consumidor).toEqual({ valor: null, custoNaoInformado: true });
  });

  it("sem venda de balcão, sem linha do Consumidor", () => {
    const curvas = curvasABC({
      porItem,
      porCliente: { ...porCliente, consumidor: null },
      criterio: "venda",
    });
    expect(curvas.consumidor).toBeNull();
  });
});
