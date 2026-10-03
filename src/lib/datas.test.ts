import { describe, expect, it } from "vitest";
import { dataCurta, diaLocal, diasEntre, hojeLocal, primeiroDiaDoMesLocal } from "./datas";

describe("diaLocal", () => {
  it("devolve o dia no formato YYYY-MM-DD", () => {
    expect(diaLocal("2026-09-02T14:00:00.000Z")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("usa o dia do fuso local, não o de UTC", () => {
    // 22h49 do dia 31/08 no Brasil já é 01/09 em UTC. Cortar o toISOString()
    // arquivaria isso no mês seguinte — foi o que motivou este arquivo.
    const fusoOriginal = process.env.TZ;
    process.env.TZ = "America/Sao_Paulo";
    try {
      const instante = "2026-09-01T01:49:00.000Z";
      expect(diaLocal(instante)).toBe("2026-08-31");
      expect(new Date(instante).toISOString().slice(0, 10)).toBe("2026-09-01");
    } finally {
      process.env.TZ = fusoOriginal;
    }
  });

  it("aceita tanto uma data quanto o texto dela", () => {
    const data = new Date("2026-09-02T14:00:00.000Z");
    expect(diaLocal(data)).toBe(diaLocal(data.toISOString()));
  });

  it("hojeLocal responde o dia de hoje", () => {
    expect(hojeLocal()).toBe(new Date().toLocaleDateString("sv-SE"));
  });

  it("primeiroDiaDoMesLocal cai sempre no dia 1º do mês de hoje", () => {
    expect(primeiroDiaDoMesLocal()).toBe(`${hojeLocal().slice(0, 7)}-01`);
  });
});

describe("diasEntre", () => {
  it("conta dias de calendário, nos dois sentidos", () => {
    expect(diasEntre("2026-09-01", "2026-09-27")).toBe(26);
    expect(diasEntre("2026-09-27", "2026-09-01")).toBe(-26);
    expect(diasEntre("2026-09-27", "2026-09-27")).toBe(0);
  });

  it("atravessa mês, ano e fevereiro de ano bissexto", () => {
    expect(diasEntre("2026-12-31", "2027-01-01")).toBe(1);
    expect(diasEntre("2028-02-28", "2028-03-01")).toBe(2);
  });

  it("não perde nem ganha um dia com o horário de verão", () => {
    // Em fuso com horário de verão, o dia da troca tem 23 ou 25 horas —
    // dividir por 24 sem arredondar daria 0,96 de dia.
    const fusoOriginal = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      expect(diasEntre("2026-03-07", "2026-03-09")).toBe(2);
      expect(diasEntre("2026-10-31", "2026-11-02")).toBe(2);
    } finally {
      process.env.TZ = fusoOriginal;
    }
  });
});

describe("dataCurta", () => {
  // Os instantes são montados na hora LOCAL, pra o teste valer igual nos
  // dois fusos em que a suíte roda (São Paulo e UTC).
  const instante = (ano: number, mes: number, dia: number, hora = 12, minuto = 0) =>
    new Date(ano, mes - 1, dia, hora, minuto).toISOString();

  it("do mesmo ano: só dia e mês", () => {
    expect(dataCurta(instante(2026, 10, 3), "2026-10-03")).toBe("03/10");
  });

  it("de outro ano: com o ano, pra não confundir", () => {
    expect(dataCurta(instante(2025, 12, 15), "2026-01-05")).toBe("15/12/2025");
  });

  it("às 23h30 continua no mesmo dia, mesmo que em UTC já seja o seguinte", () => {
    expect(dataCurta(instante(2026, 12, 31, 23, 30), "2026-12-31")).toBe("31/12");
  });
});
