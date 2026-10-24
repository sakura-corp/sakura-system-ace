import { describe, expect, it } from "vitest";
import { lerCabecalho } from "./cabecalho";

const completo = (extra: Partial<Record<"chefe" | "ajudantes" | "estimativa" | "depende" | "filhas", string>> = {}) => {
  const c = { chefe: "frontend", ajudantes: "tester (conferir o Pronto quando)", estimativa: "5 h", depende: "#536", filhas: "não", ...extra };
  return `Chefe: ${c.chefe}\nAjudantes: ${c.ajudantes}\nEstimativa: ${c.estimativa}\nDepende de: ${c.depende}\nSessões filhas: ${c.filhas}\n\n## Pra que serve\nTexto.`;
};

describe("lerCabecalho", () => {
  it("cabeçalho completo não falta nada", () => {
    expect(lerCabecalho(completo(), { etiquetaChefe: "frontend" })).toEqual({
      chefe: "frontend",
      ajudantes: "tester (conferir o Pronto quando)",
      estimativaHoras: 5,
      dependeDe: [536],
      sessoesFilhas: false,
      falta: [],
    });
  });

  it("Depende de: nada (qualquer caixa) vira lista vazia", () => {
    for (const v of ["nada", "Nada", "NADA"]) {
      const r = lerCabecalho(completo({ depende: v }));
      expect(r.dependeDe).toEqual([]);
      expect(r.falta).toEqual([]);
    }
  });

  it("vários números, sem repetir", () => {
    const r = lerCabecalho(completo({ depende: "#12, #7,#12 , #536" }));
    expect(r.dependeDe).toEqual([12, 7, 536]);
    expect(r.falta).toEqual([]);
  });

  it("linha faltando entra em falta", () => {
    const r = lerCabecalho("Chefe: frontend\nAjudantes: nenhum\nDepende de: nada\nSessões filhas: sim\n");
    expect(r.falta).toEqual(["falta a linha Estimativa"]);
  });

  it("ordem trocada entra em falta", () => {
    const r = lerCabecalho("Ajudantes: nenhum\nChefe: frontend\nEstimativa: 2 h\nDepende de: nada\nSessões filhas: sim\n");
    expect(r.falta).toContain("as linhas do cabeçalho estão fora de ordem");
  });

  it.each([
    ["texto", "abc"],
    ["#0", "#0"],
    ["#1,5", "#1,5"],
    ["negativo", "#-3"],
    ["enorme", "#99999999999"],
    ["sem #", "536"],
  ])("número estranho no Depende de (%s) não entra na lista e vai pra falta", (_nome, valor) => {
    const r = lerCabecalho(completo({ depende: valor }));
    expect(r.dependeDe).not.toContain(0);
    expect(r.dependeDe).not.toContain(5);
    expect(r.dependeDe).not.toContain(-3);
    expect(r.dependeDe.every((n) => n > 0 && n < 1_000_000)).toBe(true);
    expect(r.falta.length).toBe(1);
  });

  it("#1,5 mantém só o #1 e acusa o 5", () => {
    const r = lerCabecalho(completo({ depende: "#1,5" }));
    expect(r.dependeDe).toEqual([1]);
    expect(r.falta).toHaveLength(1);
  });

  it("Depende de vazio entra em falta", () => {
    const r = lerCabecalho(completo({ depende: "" }));
    expect(r.dependeDe).toEqual([]);
    expect(r.falta).toEqual(["a linha Depende de está vazia"]);
  });

  it("chefe desconhecido entra em falta e não vira chefe", () => {
    const r = lerCabecalho(completo({ chefe: "cozinha" }), { etiquetaChefe: "frontend" });
    expect(r.chefe).toBeUndefined();
    expect(r.falta).toEqual(["a linha Chefe não tem um chefe conhecido"]);
  });

  it("Chefe diferente da etiqueta entra em falta", () => {
    const r = lerCabecalho(completo({ chefe: "backend" }), { etiquetaChefe: "frontend" });
    expect(r.chefe).toBe("backend");
    expect(r.falta).toEqual(["a linha Chefe e a etiqueta chefe: não dizem o mesmo"]);
  });

  it("etiqueta ausente (passada vazia) entra em falta; sem o 2º parâmetro não confere", () => {
    expect(lerCabecalho(completo(), { etiquetaChefe: undefined }).falta).toEqual(["a linha Chefe e a etiqueta chefe: não dizem o mesmo"]);
    expect(lerCabecalho(completo(), { etiquetaChefe: "" }).falta).toEqual(["a linha Chefe e a etiqueta chefe: não dizem o mesmo"]);
    expect(lerCabecalho(completo()).falta).toEqual([]);
  });

  it("o cabeçalho só vale no começo: Chefe mais pra baixo é ignorado", () => {
    const r = lerCabecalho("## Pra que serve\nChefe: frontend\n\nChefe: frontend\nAjudantes: x\nEstimativa: 1 h\nDepende de: nada\nSessões filhas: sim");
    expect(r.chefe).toBeUndefined();
    expect(r.falta).toHaveLength(5);
  });

  it("linhas em branco no começo são ignoradas, mas o cabeçalho acaba na primeira linha em branco", () => {
    expect(lerCabecalho("\n\n" + completo(), { etiquetaChefe: "frontend" }).falta).toEqual([]);
    const r = lerCabecalho("Chefe: frontend\nAjudantes: x\n\nEstimativa: 1 h\nDepende de: nada\nSessões filhas: sim");
    expect(r.falta).toEqual(["falta a linha Estimativa", "falta a linha Depende de", "falta a linha Sessões filhas"]);
  });

  it("texto null, undefined ou vazio não lança erro e acusa as 5 linhas", () => {
    for (const t of [null, undefined, "", "   \n  "]) {
      const r = lerCabecalho(t);
      expect(r.dependeDe).toEqual([]);
      expect(r.falta).toHaveLength(5);
    }
  });

  it("negrito, marcador e maiúsculas são aceitos", () => {
    const r = lerCabecalho(
      "**Chefe**: Frontend\n- AJUDANTES: tester\n**Estimativa:** 2 h\n__Depende de__: NADA\nSESSÕES FILHAS: SIM\n",
      { etiquetaChefe: "frontend" },
    );
    expect(r).toEqual({ chefe: "frontend", ajudantes: "tester", estimativaHoras: 2, dependeDe: [], sessoesFilhas: true, falta: [] });
  });

  it("Sessões filhas com e sem acento; outra coisa entra em falta", () => {
    expect(lerCabecalho("Chefe: tester\nAjudantes: a\nEstimativa: 1 h\nDepende de: nada\nSessoes filhas: Nao").sessoesFilhas).toBe(false);
    expect(lerCabecalho(completo({ filhas: "NÃO" })).sessoesFilhas).toBe(false);
    expect(lerCabecalho(completo({ filhas: "Sim" })).sessoesFilhas).toBe(true);
    const r = lerCabecalho(completo({ filhas: "talvez" }));
    expect(r.sessoesFilhas).toBeUndefined();
    expect(r.falta).toHaveLength(1);
  });

  it("estimativa sem número entra em falta; ajudantes vazio também", () => {
    const r = lerCabecalho(completo({ estimativa: "muito", ajudantes: "" }));
    expect(r.estimativaHoras).toBeUndefined();
    expect(r.falta).toHaveLength(2);
  });

  it("ajudantes é cortado em 200 caracteres", () => {
    const r = lerCabecalho(completo({ ajudantes: "a".repeat(500) }));
    expect(r.ajudantes).toHaveLength(200);
  });

  it("acento guardado separado da letra (NFD, como vem de cópia no Mac) é lido igual", () => {
    const r = lerCabecalho(completo().normalize("NFD"), { etiquetaChefe: "frontend" });
    expect(r.falta).toEqual([]);
    expect(r.sessoesFilhas).toBe(false);
  });

  it("linha Ajudantes inteira em negrito não deixa ** no fim", () => {
    const r = lerCabecalho(completo().replace(/^Ajudantes: (.*)$/m, "**Ajudantes: $1**"));
    expect(r.ajudantes).toBe("tester (conferir o Pronto quando)");
  });

  describe("Reservada pra (Sofia, 24/10): linha opcional, só um selinho", () => {
    const comLinha = (linha: string) => completo().replace("Sessões filhas: não\n", `Sessões filhas: não\nPrioridade: 1\n${linha}\n`);

    it("é lida, junto com a Prioridade, e o cabeçalho continua completo", () => {
      const r = lerCabecalho(comLinha("Reservada pra: Tiago, pelo celular"), { etiquetaChefe: "frontend" });
      expect(r.reservadaPra).toBe("Tiago, pelo celular");
      expect(r.prioridade).toBe(1);
      expect(r.falta).toEqual([]);
      expect(lerCabecalho(comLinha("**Reservada pra:** Tiago")).reservadaPra).toBe("Tiago");
    });

    it("sem a linha, vazia ou só símbolos: sem reserva, e nada vai pra falta", () => {
      for (const texto of [completo(), comLinha("Reservada pra:"), comLinha("Reservada pra: ***"), comLinha("Reservada pra: 12")]) {
        const r = lerCabecalho(texto, { etiquetaChefe: "frontend" });
        expect(r.reservadaPra).toBeUndefined();
        expect(r.falta).toEqual([]);
      }
    });

    it("corta em 40 caracteres e tira os símbolos de formatação", () => {
      expect(lerCabecalho(comLinha(`Reservada pra: <b>${"a".repeat(60)}</b>`)).reservadaPra).toBe(`b${"a".repeat(39)}`);
    });
  });

  describe("Prioridade (#776): linha opcional, aviso e nunca tranca", () => {
    const comPrioridade = (linha: string) => completo().replace("Sessões filhas: não\n", `Sessões filhas: não\n${linha}\n`);

    it("Prioridade: N (inteiro ≥ 1) é lida, e o cabeçalho continua completo", () => {
      const r = lerCabecalho(comPrioridade("Prioridade: 1"), { etiquetaChefe: "frontend" });
      expect(r.prioridade).toBe(1);
      expect(r.falta).toEqual([]);
      expect(lerCabecalho(comPrioridade("**Prioridade:** 12")).prioridade).toBe(12);
      expect(lerCabecalho(comPrioridade("- prioridade: 3")).prioridade).toBe(3);
    });

    it("sem a linha: sem prioridade, e nada vai pra falta", () => {
      const r = lerCabecalho(completo(), { etiquetaChefe: "frontend" });
      expect(r.prioridade).toBeUndefined();
      expect("prioridade" in r).toBe(false);
      expect(r.falta).toEqual([]);
    });

    it.each(["alta", "0", "-1", "1,5", "1.5", "2 ou 3", "", "1º", "9999999"])(
      "escrita errada (Prioridade: %s) é ignorada e a tarefa NÃO fica incompleta",
      (valor) => {
        const r = lerCabecalho(comPrioridade(`Prioridade: ${valor}`), { etiquetaChefe: "frontend" });
        expect(r.prioridade).toBeUndefined();
        expect(r.falta).toEqual([]);
      },
    );

    it("depois da linha Second brain também vale; e a ordem das cinco linhas não muda por causa dela", () => {
      const r = lerCabecalho(comPrioridade("Second brain: não precisa\nPrioridade: 2"), { etiquetaChefe: "frontend" });
      expect(r.prioridade).toBe(2);
      expect(r.falta).toEqual([]);
      // Prioridade no meio das cinco não mexe na conferência de ordem.
      const meio = completo().replace("Estimativa:", "Prioridade: 4\nEstimativa:");
      expect(lerCabecalho(meio).falta).toEqual([]);
    });

    it("Prioridade fora do cabeçalho (depois da linha em branco) não vale", () => {
      expect(lerCabecalho(completo() + "\nPrioridade: 1").prioridade).toBeUndefined();
    });
  });
});
