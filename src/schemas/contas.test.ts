/**
 * As contas das telas de Contas a Pagar e a Receber (#1094): a soma das
 * atrasadas (o número em destaque), o filtro por mês e o aviso de valor pago
 * diferente da conta. Contas de dinheiro: ficam aqui, fora da tela (item 49).
 */
import { describe, expect, it } from "vitest";
import {
  avisoDoValorDiferente,
  casaComABusca,
  contasDoMes,
  diferencaDoValor,
  mesDoDia,
  mesesParaEscolher,
  nomeDoMes,
  ordenarParaALista,
  resumoDasAtrasadas,
  resumoDoMes,
} from "./contas";

const HOJE = "2026-11-14";

/** O `formatarMoeda` põe um espaço que não quebra depois do "R$": aqui vira espaço comum, pra ler. */
const legivel = (texto: string | null) => texto?.replaceAll(String.fromCharCode(160), " ") ?? null;

function conta(vencimento: string, valor: number, status = "pendente") {
  return { vencimento, valor, status };
}

describe("resumoDasAtrasadas", () => {
  it("soma só as pendentes com vencimento antes de hoje, de qualquer mês", () => {
    const contas = [
      conta("2026-10-05", 100.1), // atrasada, outro mês
      conta("2026-11-13", 200.2), // atrasada
      conta("2026-11-14", 999), // vence hoje: ainda não está atrasada
      conta("2026-11-20", 999), // a vencer
      conta("2026-11-01", 999, "paga"), // paga não entra
      conta("2026-11-02", 999, "recebido"), // recebida não entra
    ];
    expect(resumoDasAtrasadas(contas, HOJE)).toEqual({ quantas: 2, total: 300.3 });
  });

  it("sem atrasada: zero contas e R$ 0,00", () => {
    expect(resumoDasAtrasadas([conta("2026-12-01", 50)], HOJE)).toEqual({ quantas: 0, total: 0 });
  });

  it("soma em centavos (0,1 + 0,2 dá 0,30, e não 0,30000000000000004)", () => {
    expect(resumoDasAtrasadas([conta("2026-01-01", 0.1), conta("2026-01-02", 0.2)], HOJE).total).toBe(0.3);
  });
});

describe("o mês", () => {
  it("mesDoDia pega o AAAA-MM do dia, sem passar por Date (sem fuso)", () => {
    expect(mesDoDia("2026-11-01")).toBe("2026-11");
    expect(mesDoDia("2026-12-31")).toBe("2026-12");
  });

  it("nomeDoMes escreve por extenso", () => {
    expect(nomeDoMes("2026-11")).toBe("novembro de 2026");
    expect(nomeDoMes("2027-01")).toBe("janeiro de 2027");
  });

  it("contasDoMes filtra pelo mês do vencimento; 'todos' devolve tudo", () => {
    const contas = [conta("2026-10-31", 1), conta("2026-11-01", 2), conta("2026-11-30", 3), conta("2026-12-01", 4)];
    expect(contasDoMes(contas, "2026-11").map((c) => c.valor)).toEqual([2, 3]);
    expect(contasDoMes(contas, "todos")).toHaveLength(4);
  });

  it("mesesParaEscolher: os meses que têm conta e o mês de hoje, do mais novo pro mais velho, sem repetir", () => {
    const contas = [conta("2026-09-10", 1), conta("2026-12-01", 1), conta("2026-09-20", 1)];
    expect(mesesParaEscolher(contas, HOJE)).toEqual(["2026-12", "2026-11", "2026-09"]);
  });

  it("mesesParaEscolher mantém o mês escolhido, mesmo sem conta nenhuma nele (achado da revisão)", () => {
    expect(mesesParaEscolher([], HOJE, "2026-10")).toEqual(["2026-11", "2026-10"]);
    expect(mesesParaEscolher([], HOJE, "todos")).toEqual(["2026-11"]);
  });

  it("resumoDoMes: o total do mês e o que falta (pago e recebido ficam fora do que falta)", () => {
    const contas = [
      conta("2026-11-02", 100),
      conta("2026-11-20", 50.5),
      conta("2026-11-03", 30, "paga"),
      conta("2026-10-30", 1000),
    ];
    expect(resumoDoMes(contas, "2026-11")).toEqual({ quantas: 3, total: 180.5, falta: 150.5 });
    expect(resumoDoMes(contas, "todos")).toEqual({ quantas: 4, total: 1180.5, falta: 1150.5 });
  });
});

describe("casaComABusca", () => {
  it("cada palavra tem de aparecer em algum texto, sem ligar pra acento e maiúscula", () => {
    expect(casaComABusca(["Conta de energia", "Energia elétrica"], "eletrica")).toBe(true);
    expect(casaComABusca(["Aluguel", null, "Imóvel"], "ALUGUEL imovel")).toBe(true);
    expect(casaComABusca(["Aluguel", "Imóvel"], "aluguel luz")).toBe(false);
    expect(casaComABusca(["Aluguel"], "   ")).toBe(true);
  });
});

describe("ordenarParaALista", () => {
  it("atrasadas primeiro (a mais velha em cima), depois as que vencem, depois as pagas (a mais nova em cima)", () => {
    const contas = [
      { id: "paga-velha", ...conta("2026-11-01", 1, "paga") },
      { id: "a-vencer", ...conta("2026-11-20", 1) },
      { id: "atrasada-nova", ...conta("2026-11-10", 1) },
      { id: "paga-nova", ...conta("2026-11-05", 1, "recebido") },
      { id: "hoje", ...conta("2026-11-14", 1) },
      { id: "atrasada-velha", ...conta("2026-11-02", 1) },
    ];
    expect(ordenarParaALista(contas, HOJE).map((c) => c.id)).toEqual([
      "atrasada-velha",
      "atrasada-nova",
      "hoje",
      "a-vencer",
      "paga-nova",
      "paga-velha",
    ]);
  });
});

describe("o valor pago diferente da conta (aviso, nunca tranca)", () => {
  it("a mais", () => {
    expect(diferencaDoValor(130, 100)).toEqual({ tipo: "a_mais", diferenca: 30 });
    expect(legivel(avisoDoValorDiferente(130, 100))).toBe("R$ 30,00 a mais que a conta");
  });

  it("a menos", () => {
    expect(diferencaDoValor(80, 100)).toEqual({ tipo: "a_menos", diferenca: 20 });
    expect(legivel(avisoDoValorDiferente(80, 100))).toBe("R$ 20,00 a menos que a conta");
  });

  it("igual: sem aviso", () => {
    expect(diferencaDoValor(100, 100)).toEqual({ tipo: "igual", diferenca: 0 });
    expect(avisoDoValorDiferente(100, 100)).toBeNull();
  });

  it("a conta é feita em centavos: 100,10 contra 100,00 é R$ 0,10, e 0,1 + 0,2 contra 0,3 é igual", () => {
    expect(legivel(avisoDoValorDiferente(100.1, 100))).toBe("R$ 0,10 a mais que a conta");
    expect(avisoDoValorDiferente(0.1 + 0.2, 0.3)).toBeNull();
  });

  it("campo vazio ou zero não avisa (quem reclama é a validação do campo)", () => {
    expect(avisoDoValorDiferente(0, 100)).toBeNull();
    expect(avisoDoValorDiferente(Number.NaN, 100)).toBeNull();
  });
});
