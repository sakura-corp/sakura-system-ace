import { describe, expect, it } from "vitest";
import {
  contasVencendoAte,
  diasDesde,
  janelaDoMesAteODia,
  mesmaJanelaNoMesAnterior,
  metricasDoPeriodo,
  moduloQueFaltaAoCartao,
  movimentosDaJanela,
  rotuloDeIdade,
  valoresPorCartao,
  variacaoPercentual,
  variacoesPorCartao,
} from "./painelInicio";
import type { ContaPagar } from "@/types/contaPagar";
import type { MovimentoCaixa } from "@/types/caixa";

function conta(vencimento: string, valor: number, status: ContaPagar["status"] = "pendente") {
  return { vencimento, valor, status } as ContaPagar;
}

function entrada(data: Date, valor: number, ordemId?: string) {
  return {
    id: `mov-${data.getTime()}-${valor}`,
    data: data.toISOString(),
    tipo: "entrada",
    valor,
    ordem_servico_id: ordemId ?? null,
    ordem_servico: ordemId ? { id: ordemId, itens: [] } : null,
  } as unknown as MovimentoCaixa;
}

describe("contasVencendoAte", () => {
  // O bug que este cartão tinha: no dia 31 ele mostrava R$ 0,00 porque só
  // somava o mês corrente, com uma conta vencendo no dia seguinte.
  const hoje31DeJaneiro = new Date(2026, 0, 31);

  it("enxerga a conta que vence já no mês que vem", () => {
    const total = contasVencendoAte(
      [conta("2026-02-01", 3200), conta("2026-02-05", 890)],
      hoje31DeJaneiro,
    );
    expect(total).toBe(4090);
  });

  it("inclui conta já vencida, que é a mais urgente de todas", () => {
    expect(contasVencendoAte([conta("2025-12-10", 500)], hoje31DeJaneiro)).toBe(500);
  });

  it("ignora conta já paga", () => {
    expect(contasVencendoAte([conta("2026-02-01", 3200, "paga")], hoje31DeJaneiro)).toBe(0);
  });

  it("para no limite da janela", () => {
    // 31/01 + 15 dias = 15/02. A do dia 16 fica de fora.
    const contas = [conta("2026-02-15", 100), conta("2026-02-16", 999)];
    expect(contasVencendoAte(contas, hoje31DeJaneiro)).toBe(100);
  });
});

describe("janelas de comparação", () => {
  it("vai do dia 1º até o fim do dia de hoje", () => {
    const janela = janelaDoMesAteODia(new Date(2026, 8, 9, 14, 30));
    expect(janela.inicio).toEqual(new Date(2026, 8, 1));
    expect(janela.fim).toEqual(new Date(2026, 8, 9, 23, 59, 59, 999));
  });

  it("compara com a mesma fatia do mês anterior, não com o mês inteiro", () => {
    const janela = mesmaJanelaNoMesAnterior(new Date(2026, 8, 9));
    expect(janela.inicio).toEqual(new Date(2026, 7, 1));
    expect(janela.fim).toEqual(new Date(2026, 7, 9, 23, 59, 59, 999));
  });

  it("segura o dia no último do mês em vez de transbordar", () => {
    // 31 de março olhando pra fevereiro: 28, nunca "31 de fevereiro" (que o
    // JavaScript viraria em 3 de março, calado).
    const janela = mesmaJanelaNoMesAnterior(new Date(2026, 2, 31));
    expect(janela.fim.getMonth()).toBe(1);
    expect(janela.fim.getDate()).toBe(28);
  });

  it("segura no 29 em ano bissexto", () => {
    const janela = mesmaJanelaNoMesAnterior(new Date(2024, 2, 31));
    expect(janela.fim.getDate()).toBe(29);
  });

  it("atravessa a virada do ano", () => {
    const janela = mesmaJanelaNoMesAnterior(new Date(2026, 0, 10));
    expect(janela.inicio).toEqual(new Date(2025, 11, 1));
    expect(janela.fim.getFullYear()).toBe(2025);
    expect(janela.fim.getMonth()).toBe(11);
  });
});

describe("movimentosDaJanela e metricasDoPeriodo", () => {
  const janela = janelaDoMesAteODia(new Date(2026, 8, 9));

  it("deixa de fora o que está antes e depois da janela", () => {
    const dentro = entrada(new Date(2026, 8, 5, 10), 100);
    const antes = entrada(new Date(2026, 7, 31, 10), 999);
    const depois = entrada(new Date(2026, 8, 10, 10), 999);
    const filtrados = movimentosDaJanela([dentro, antes, depois], janela);
    expect(filtrados).toEqual([dentro]);
  });

  it("pega lançamento feito no fim da noite do último dia", () => {
    // O horário é de propósito: 22h no Brasil já é o dia seguinte em UTC, e
    // foi exatamente assim que uma OS sumiu da lista (seção 6, item 34).
    const tarde = entrada(new Date(2026, 8, 9, 22, 49), 100);
    expect(movimentosDaJanela([tarde], janela)).toHaveLength(1);
  });

  it("conta a OS uma vez só quando o pagamento foi dividido", () => {
    const metricas = metricasDoPeriodo(
      [
        entrada(new Date(2026, 8, 5, 10), 600, "os-1"),
        entrada(new Date(2026, 8, 5, 10, 1), 400, "os-1"),
      ],
      janela,
      () => 0,
    );
    expect(metricas.vendas).toBe(1000);
    expect(metricas.ticketMedio).toBe(1000);
  });
});

describe("variacaoPercentual", () => {
  it("mede a diferença contra o período anterior", () => {
    expect(variacaoPercentual(1200, 1000)).toBeCloseTo(20);
    expect(variacaoPercentual(800, 1000)).toBeCloseTo(-20);
  });

  it("não inventa porcentagem quando não havia nada antes", () => {
    expect(variacaoPercentual(1000, 0)).toBeNull();
    expect(variacaoPercentual(0, 0)).toBeNull();
  });

  it("com base negativa, subir continua sendo subir", () => {
    // Mês passado deu prejuízo de 100, este mês deu lucro de 50: é melhora.
    expect(variacaoPercentual(50, -100)).toBeGreaterThan(0);
  });
});

describe("valoresPorCartao e variacoesPorCartao", () => {
  const metricas = { vendas: 1000, custos: 400, lucro: 600, ticketMedio: 250 };

  it("monta o valor de cada cartão", () => {
    const valores = valoresPorCartao(metricas, 3200);
    expect(valores.vendas_mes).toBe(1000);
    expect(valores.lucro_mes).toBe(600);
    expect(valores.contas_pagar_vencendo).toBe(3200);
  });

  it("não compara 'contas a pagar vencendo' com mês nenhum", () => {
    const variacoes = variacoesPorCartao(metricas, metricas);
    expect(variacoes.contas_pagar_vencendo).toBeNull();
    expect(variacoes.vendas_mes).toBe(0);
  });
});

describe("idade de uma OS", () => {
  const hoje = new Date(2026, 8, 9, 15, 0);

  it("conta dia de calendário, não hora corrida", () => {
    // Aberta às 23h de ontem: é 1 dia, mesmo tendo menos de 24 horas.
    expect(diasDesde(new Date(2026, 8, 8, 23, 0).toISOString(), hoje)).toBe(1);
  });

  it("conta zero pra hoje de manhã", () => {
    expect(diasDesde(new Date(2026, 8, 9, 8, 0).toISOString(), hoje)).toBe(0);
  });

  it("atravessa o mês", () => {
    expect(diasDesde(new Date(2026, 7, 30, 9, 0).toISOString(), hoje)).toBe(10);
  });

  it("escreve do jeito que alguém fala", () => {
    expect(rotuloDeIdade(0)).toBe("hoje");
    expect(rotuloDeIdade(1)).toBe("ontem");
    expect(rotuloDeIdade(3)).toBe("há 3 dias");
  });
});

// TR-04.1 (migrations 0061 e 0062): sem o módulo, o banco devolve zero
// linha, e zero linha somada seria um "R$ 0,00" com cara de verdade. O cartão
// tem que saber que falta o módulo — e só aquele cartão.
describe("moduloQueFaltaAoCartao", () => {
  const so = (...modulos: string[]) => (m: string) => modulos.includes(m);
  const tudo = () => true;
  const DE_DINHEIRO = ["vendas_mes", "custos_mes", "lucro_mes", "ticket_medio_mes"] as const;

  it("contas a pagar vencendo pede o módulo Contas a Pagar", () => {
    expect(moduloQueFaltaAoCartao("contas_pagar_vencendo", so("painel", "caixa"))).toBe("contas_pagar");
    expect(moduloQueFaltaAoCartao("contas_pagar_vencendo", so("painel", "contas_pagar"))).toBeNull();
  });

  it("os quatro cartões de dinheiro pedem o Caixa — sem ele, citam o Caixa", () => {
    for (const cartao of DE_DINHEIRO) {
      expect(moduloQueFaltaAoCartao(cartao, so("painel", "ordens_servico"))).toBe("caixa");
    }
  });

  it("Relações também abre os cartões de dinheiro (ele lê o Caixa inteiro)", () => {
    for (const cartao of DE_DINHEIRO) {
      expect(moduloQueFaltaAoCartao(cartao, so("painel", "relatorios"))).toBeNull();
      expect(moduloQueFaltaAoCartao(cartao, so("painel", "caixa"))).toBeNull();
    }
  });

  it("quem só tem OS ou contas NÃO abre os cartões de dinheiro", () => {
    // O banco mostra a eles só um PEDAÇO do Caixa (os lançamentos de OS, ou o
    // da própria conta). Somar um pedaço daria Vendas errada com cara de
    // certa — é exatamente o que o "—" existe pra evitar.
    for (const cartao of DE_DINHEIRO) {
      expect(moduloQueFaltaAoCartao(cartao, so("ordens_servico", "contas_pagar", "contas_receber"))).toBe("caixa");
    }
  });

  it("com todos os módulos (admin), não falta nada", () => {
    for (const cartao of [...DE_DINHEIRO, "contas_pagar_vencendo"] as const) {
      expect(moduloQueFaltaAoCartao(cartao, tudo)).toBeNull();
    }
  });
});
