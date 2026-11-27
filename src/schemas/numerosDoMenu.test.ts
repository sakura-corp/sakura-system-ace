import { describe, expect, it } from "vitest";
import { montarCentralDoDia, type EntradaCentralDoDia } from "./centralDoDia";
import { numerosDoMenu, type EntradaNumerosDoMenu } from "./numerosDoMenu";
import type { ContaPagar } from "@/types/contaPagar";
import type { ContaReceber } from "@/types/contaReceber";
import type { OrdemServico } from "@/types/os";

const HOJE = "2026-11-26";

function entrada(parcial: Partial<EntradaNumerosDoMenu> = {}): EntradaNumerosDoMenu {
  return { hoje: HOJE, orcamentos: [], ordens: [], contasPagar: [], contasReceber: [], ...parcial };
}

const orc = (id: string, validade: string | null, status = "orcamento") =>
  ({ id, status, validade }) as EntradaNumerosDoMenu["orcamentos"][number];
const os = (id: string, status: string, tipo = "os") =>
  ({ id, status, tipo }) as EntradaNumerosDoMenu["ordens"][number];
const pagar = (id: string, vencimento: string, status = "pendente") =>
  ({ id, status, vencimento }) as EntradaNumerosDoMenu["contasPagar"][number];
const receber = (id: string, vencimento: string, status = "pendente") =>
  ({ id, status, vencimento }) as EntradaNumerosDoMenu["contasReceber"][number];

describe("numerosDoMenu: Orçamentos", () => {
  it("vencido conta; hoje+2 conta; hoje+3 não; sem validade não; recusado não", () => {
    const r = numerosDoMenu(
      entrada({
        orcamentos: [
          orc("a", "2026-11-25"), // vencido
          orc("b", "2026-11-26"), // vence hoje
          orc("c", "2026-11-28"), // hoje+2
          orc("d", "2026-11-29"), // hoje+3: não
          orc("e", null), // sem validade: não
          orc("f", "2026-11-20", "recusado"), // outro status: não
        ],
      }),
    );
    expect(r.orcamentos?.quantos).toBe(3);
    expect(r.orcamentos?.cor).toBe("perigo");
    expect(r.orcamentos?.dica).toBe("3 orçamentos: 1 vencido e 2 vencendo");
  });

  it("só vencendo é atenção, no singular", () => {
    const r = numerosDoMenu(entrada({ orcamentos: [orc("a", "2026-11-27")] }));
    expect(r.orcamentos).toEqual({ quantos: 1, cor: "atencao", dica: "1 orçamento vencendo" });
  });

  it("só vencidos, no plural", () => {
    const r = numerosDoMenu(entrada({ orcamentos: [orc("a", "2026-11-01"), orc("b", "2026-11-02")] }));
    expect(r.orcamentos).toEqual({ quantos: 2, cor: "perigo", dica: "2 orçamentos vencidos" });
  });

  it("virada de mês: hoje+2 passando do fim do mês", () => {
    const r = numerosDoMenu(entrada({ hoje: "2026-11-29", orcamentos: [orc("a", "2026-12-01"), orc("b", "2026-12-02")] }));
    expect(r.orcamentos?.quantos).toBe(1);
  });

  it("nenhum: null", () => {
    expect(numerosDoMenu(entrada()).orcamentos).toBeNull();
  });
});

describe("numerosDoMenu: Ordens de Serviço", () => {
  it("concluída conta; venda de balcão e em andamento não", () => {
    const r = numerosDoMenu(
      entrada({
        ordens: [os("a", "concluida"), os("b", "concluida", "venda_balcao"), os("c", "em_andamento")],
      }),
    );
    expect(r.ordens_servico).toEqual({ quantos: 1, cor: "ok", dica: "1 OS pronta pra retirar" });
  });

  it("plural", () => {
    const r = numerosDoMenu(entrada({ ordens: [os("a", "concluida"), os("b", "concluida")] }));
    expect(r.ordens_servico?.dica).toBe("2 OS prontas pra retirar");
  });
});

describe("numerosDoMenu: Contas a Pagar", () => {
  it("ontem, hoje, amanhã e hoje+3 contam; hoje+4 e paga não", () => {
    const r = numerosDoMenu(
      entrada({
        contasPagar: [
          pagar("a", "2026-11-25"),
          pagar("b", "2026-11-26"),
          pagar("c", "2026-11-27"), // amanhã
          pagar("d", "2026-11-29"), // hoje+3
          pagar("e", "2026-11-30"), // hoje+4: não
          pagar("f", "2026-11-20", "paga"),
        ],
      }),
    );
    expect(r.contas_pagar).toEqual({ quantos: 4, cor: "perigo", dica: "4 contas: 1 atrasada e 3 vencendo" });
  });

  it("virada de mês: hoje+3 passando do fim do mês", () => {
    const r = numerosDoMenu(
      entrada({ hoje: "2026-11-29", contasPagar: [pagar("a", "2026-12-02"), pagar("b", "2026-12-03")] }),
    );
    expect(r.contas_pagar).toEqual({ quantos: 1, cor: "atencao", dica: "1 conta vencendo" });
  });

  it("só vencendo é atenção", () => {
    const r = numerosDoMenu(entrada({ contasPagar: [pagar("a", "2026-11-26"), pagar("b", "2026-11-28")] }));
    expect(r.contas_pagar).toEqual({ quantos: 2, cor: "atencao", dica: "2 contas vencendo" });
  });

  it("só atrasada, singular", () => {
    const r = numerosDoMenu(entrada({ contasPagar: [pagar("a", "2026-11-01")] }));
    expect(r.contas_pagar).toEqual({ quantos: 1, cor: "perigo", dica: "1 conta atrasada" });
  });

  it("3 contas: 1 atrasada e 2 vencendo", () => {
    const r = numerosDoMenu(
      entrada({ contasPagar: [pagar("a", "2026-11-01"), pagar("b", "2026-11-26"), pagar("c", "2026-11-28")] }),
    );
    expect(r.contas_pagar?.dica).toBe("3 contas: 1 atrasada e 2 vencendo");
  });
});

describe("numerosDoMenu: Contas a Receber", () => {
  it("ontem conta; hoje não; recebida não", () => {
    const r = numerosDoMenu(
      entrada({
        contasReceber: [
          receber("a", "2026-11-25"),
          receber("b", "2026-11-26"),
          receber("c", "2026-11-01", "recebido"),
        ],
      }),
    );
    expect(r.contas_receber).toEqual({ quantos: 1, cor: "perigo", dica: "1 conta atrasada" });
  });

  it("plural", () => {
    const r = numerosDoMenu(entrada({ contasReceber: [receber("a", "2026-11-01"), receber("b", "2026-11-02")] }));
    expect(r.contas_receber?.dica).toBe("2 contas atrasadas");
  });
});

describe("o número do menu é igual ao da Central do dia", () => {
  it("OS, Receber e Pagar batem com as linhas da Central", () => {
    const ordens = [
      os("o1", "concluida"),
      os("o2", "concluida", "venda_balcao"),
      os("o3", "em_andamento"),
      os("o4", "concluida"),
    ];
    const contasReceber = [receber("r1", "2026-11-25"), receber("r2", "2026-11-26"), receber("r3", "2026-11-10", "recebido")].map((c) => ({ ...c, valor: 100, descricao: "d" }));
    const contasPagar = [
      pagar("p1", "2026-11-20"),
      pagar("p2", "2026-11-26"),
      pagar("p3", "2026-11-27"),
      pagar("p4", "2026-11-29"),
      pagar("p5", "2026-11-30"), // fora até da Central (hoje+4)
      pagar("p6", "2026-11-20", "paga"),
    ].map((c) => ({ ...c, valor: 100, descricao: "d" }));
    const central: EntradaCentralDoDia = {
      hoje: HOJE,
      notasComErro: [],
      movimentos: [],
      fechamentos: [],
      contasReceber: contasReceber as unknown as ContaReceber[],
      ordens: ordens.map((o) => ({ ...o, data_abertura: "2026-11-01T12:00:00Z" })) as unknown as OrdemServico[],
      contasPagar: contasPagar as unknown as ContaPagar[],
      pecas: [],
      saldos: new Map(),
    };
    const linhas = montarCentralDoDia(central, () => true);
    const n = numerosDoMenu(entrada({ ordens, contasReceber, contasPagar }));

    expect(n.ordens_servico?.quantos).toBe(linhas.filter((l) => l.tipo === "carro_pronto").length);
    expect(n.contas_receber?.quantos).toBe(linhas.filter((l) => l.tipo === "conta_receber_vencida").length);
    expect(n.contas_pagar?.quantos).toBe(linhas.filter((l) => l.tipo === "conta_pagar_vencendo").length);
    expect(n.contas_pagar?.quantos).toBe(4);
  });
});
