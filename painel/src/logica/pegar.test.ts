import { describe, expect, it } from "vitest";
import type { EstadoTarefa, Tarefa } from "../tipos";
import { depoisDaAcao, mesmoLogin, motivoPraNaoLargar, motivoPraNaoPegar } from "./pegar";

const t = (numero: number, estado: EstadoTarefa = "livre", resto: Partial<Tarefa> = {}): Tarefa => ({
  numero,
  titulo: `T${numero}`,
  url: `https://github.com/sakura-corp/x/issues/${numero}`,
  estado,
  ...resto,
});
const de = (login: string) => ({ login, avatar: "" });

describe("mesmoLogin", () => {
  it("não diferencia maiúscula; vazio e ausente nunca são iguais", () => {
    expect(mesmoLogin("Gustavo", "gustavo")).toBe(true);
    expect(mesmoLogin("ana", "bia")).toBe(false);
    expect(mesmoLogin("", "")).toBe(false);
    expect(mesmoLogin(undefined, undefined)).toBe(false);
    expect(mesmoLogin(null, "ana")).toBe(false);
    expect(mesmoLogin("ana", undefined)).toBe(false);
  });
});

describe("motivoPraNaoPegar", () => {
  it("tarefa livre, completa, sem dependência e sem outra na mão: pode", () => {
    const a = t(1);
    expect(motivoPraNaoPegar(a, [a, t(2, "livre")], "ana")).toBeNull();
  });

  it("1. sem login", () => {
    expect(motivoPraNaoPegar(t(1), [], undefined)).toBe("entre no painel pra pegar uma tarefa");
    expect(motivoPraNaoPegar(t(1), [], "")).toBe("entre no painel pra pegar uma tarefa");
  });

  it("2. sem tarefa", () => {
    expect(motivoPraNaoPegar(undefined, [], "ana")).toBe("esta tarefa não está numa leva aberta");
  });

  it("3. feita", () => {
    expect(motivoPraNaoPegar(t(5, "feita"), [], "ana")).toBe("a #5 já está feita");
    expect(motivoPraNaoPegar(t(5, "feita", { dono: de("ana") }), [], "ana")).toBe("a #5 já está feita");
  });

  it("4. já é do próprio login (maiúscula não importa)", () => {
    expect(motivoPraNaoPegar(t(5, "andamento", { dono: de("Ana") }), [], "ana")).toBe("a #5 já é sua");
  });

  it("5. dono de outra pessoa", () => {
    expect(motivoPraNaoPegar(t(5, "andamento", { dono: de("bia") }), [], "ana")).toBe("alguém pegou antes: a #5 é de bia");
  });

  it("6. revisão sem dono: já tem PR", () => {
    expect(motivoPraNaoPegar(t(5, "revisao"), [], "ana")).toBe("a #5 já tem um PR aberto");
  });

  it("7. incompleta", () => {
    expect(motivoPraNaoPegar(t(5, "livre", { incompleta: ["Chefe"] }), [], "ana")).toBe("a #5 está incompleta: falta coisa no cabeçalho");
    expect(motivoPraNaoPegar(t(5, "livre", { incompleta: [] }), [], "ana")).toBeNull();
  });

  it("8. espera dependência aberta, uma ou várias; número ruim é ignorado", () => {
    expect(motivoPraNaoPegar(t(5, "livre", { dependeDeAbertas: [7] }), [], "ana")).toBe("espera a #7");
    expect(motivoPraNaoPegar(t(5, "livre", { dependeDeAbertas: [7, 9] }), [], "ana")).toBe("espera a #7, #9");
    expect(motivoPraNaoPegar(t(5, "livre", { dependeDeAbertas: [0, -1, 2.5, 7] }), [], "ana")).toBe("espera a #7");
    expect(motivoPraNaoPegar(t(5, "livre", { dependeDeAbertas: [0, -1, 2.5] }), [], "ana")).toBeNull();
    expect(motivoPraNaoPegar(t(5, "livre", { dependeDeAbertas: [] }), [], "ana")).toBeNull();
  });

  it("9. já está com outra em andamento (a primeira achada; maiúscula não importa)", () => {
    const a = t(5);
    const leva = [a, t(3, "andamento", { dono: de("ANA") }), t(4, "andamento", { dono: de("ana") })];
    expect(motivoPraNaoPegar(a, leva, "ana")).toBe("você já está com a #3");
  });

  it("9. andamento de outra pessoa não impede", () => {
    const a = t(5);
    expect(motivoPraNaoPegar(a, [a, t(3, "andamento", { dono: de("bia") })], "ana")).toBeNull();
  });

  it("9. revisão própria (PR aberto) não impede pegar outra", () => {
    const a = t(5);
    expect(motivoPraNaoPegar(a, [a, t(3, "revisao", { dono: de("ana") })], "ana")).toBeNull();
  });

  it("9. a própria tarefa na lista não conta como 'outra'", () => {
    // livre mas ainda com o dono antigo na lista (lista velha): a regra 9 olha só números diferentes
    const a = t(5, "livre");
    expect(motivoPraNaoPegar(a, [{ ...a, estado: "andamento", dono: de("ana") }], "ana")).toBeNull();
  });

  it("a ordem: feita vence dono; dono vence incompleta; incompleta vence dependência", () => {
    expect(motivoPraNaoPegar(t(5, "feita", { dono: de("bia") }), [], "ana")).toBe("a #5 já está feita");
    expect(motivoPraNaoPegar(t(5, "andamento", { dono: de("bia"), incompleta: ["x"] }), [], "ana")).toContain("alguém pegou antes");
    expect(motivoPraNaoPegar(t(5, "livre", { incompleta: ["x"], dependeDeAbertas: [7] }), [], "ana")).toContain("incompleta");
    expect(motivoPraNaoPegar(t(5, "livre", { dependeDeAbertas: [7] }), [t(3, "andamento", { dono: de("ana") })], "ana")).toBe("espera a #7");
  });
});

describe("motivoPraNaoLargar", () => {
  it("o dono, em andamento: pode (maiúscula não importa)", () => {
    expect(motivoPraNaoLargar(t(5, "andamento", { dono: de("Ana") }), "ana")).toBeNull();
  });
  it("sem login", () => {
    expect(motivoPraNaoLargar(t(5, "andamento", { dono: de("ana") }), undefined)).toBe("entre no painel pra largar uma tarefa");
  });
  it("sem tarefa", () => {
    expect(motivoPraNaoLargar(undefined, "ana")).toBe("não achei esta tarefa");
  });
  it("sem dono ou dono de outra pessoa", () => {
    expect(motivoPraNaoLargar(t(5, "andamento"), "ana")).toBe("só quem pegou a #5 pode largar");
    expect(motivoPraNaoLargar(t(5, "andamento", { dono: de("bia") }), "ana")).toBe("só quem pegou a #5 pode largar");
  });
  it("revisão, feita e livre com dono", () => {
    expect(motivoPraNaoLargar(t(5, "revisao", { dono: de("ana") }), "ana")).toBe("a #5 já tem um PR aberto: não dá pra largar");
    expect(motivoPraNaoLargar(t(5, "feita", { dono: de("ana") }), "ana")).toBe("a #5 já está feita");
    expect(motivoPraNaoLargar(t(5, "livre", { dono: de("ana") }), "ana")).toBe("a #5 não está com ninguém");
  });
});

describe("depoisDaAcao", () => {
  it("deu certo: sem aviso, recarrega", () => {
    expect(depoisDaAcao(5, { tipo: "ok" })).toEqual({ aviso: "", recarregar: true });
  });

  it("recusa: recarrega (o cartão não fica velho) e o motivo fica à vista", () => {
    expect(depoisDaAcao(5, { tipo: "recusado", motivo: "alguém pegou antes: a #5 é de ana" })).toEqual({
      aviso: "alguém pegou antes: a #5 é de ana",
      recarregar: true,
    });
  });

  it("recusa sem o número no motivo: o aviso ganha o número na frente", () => {
    expect(depoisDaAcao(5, { tipo: "recusado", motivo: "o GitHub não respondeu; tente de novo" }).aviso).toBe(
      "#5: o GitHub não respondeu; tente de novo",
    );
    // "#50" não é a #5: ganha o número na frente.
    expect(depoisDaAcao(5, { tipo: "recusado", motivo: "você já está com a #50" }).aviso).toBe("#5: você já está com a #50");
  });

  it("erro de conexão: mostra a mensagem e não recarrega (a busca falharia igual)", () => {
    expect(depoisDaAcao(5, { tipo: "erro", mensagem: "Sem conexão." })).toEqual({ aviso: "Sem conexão.", recarregar: false });
  });

  it("sessão acabou: avisa e recarrega (a página volta pro login)", () => {
    expect(depoisDaAcao(5, { tipo: "fora" })).toEqual({ aviso: "Sua sessão acabou. Entre de novo.", recarregar: true });
  });
});
