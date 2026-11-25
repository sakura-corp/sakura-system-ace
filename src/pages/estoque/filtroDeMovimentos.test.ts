import { describe, expect, it } from "vitest";
import { filtrarMovimentos } from "./filtroDeMovimentos";
import type { MovimentoEstoque } from "@/types/estoque";

function mov(extra: Partial<MovimentoEstoque>): MovimentoEstoque {
  return {
    id: "m",
    loja_id: "l",
    deposito_id: "d",
    peca_id: "a",
    tipo: "saida",
    quantidade: 1,
    motivo: "uso_em_os",
    referencia: null,
    criado_em: "2026-11-10T15:00:00",
    ...extra,
  };
}

const LISTA = [
  mov({ id: "e1", tipo: "entrada", motivo: "compra", criado_em: "2026-11-01T10:00:00" }),
  mov({ id: "s1", tipo: "saida", criado_em: "2026-11-10T23:30:00" }),
  mov({ id: "s2", tipo: "saida", peca_id: "b", criado_em: "2026-11-20T08:00:00" }),
];
const ids = (l: MovimentoEstoque[]) => l.map((m) => m.id);

describe("filtrarMovimentos (#1093)", () => {
  it("Tudo, sem datas: devolve tudo", () => {
    expect(ids(filtrarMovimentos(LISTA, { tipo: "tudo", de: "", ate: "", pecaId: "" }))).toEqual(["e1", "s1", "s2"]);
  });

  it("Entradas / Saídas", () => {
    expect(ids(filtrarMovimentos(LISTA, { tipo: "entrada", de: "", ate: "", pecaId: "" }))).toEqual(["e1"]);
    expect(ids(filtrarMovimentos(LISTA, { tipo: "saida", de: "", ate: "", pecaId: "" }))).toEqual(["s1", "s2"]);
  });

  it("por data: o dia é o do calendário local, com as duas pontas incluídas", () => {
    // 23h30 do dia 10 continua sendo dia 10 (nada de UTC).
    expect(ids(filtrarMovimentos(LISTA, { tipo: "tudo", de: "2026-11-10", ate: "2026-11-10", pecaId: "" }))).toEqual(["s1"]);
    expect(ids(filtrarMovimentos(LISTA, { tipo: "tudo", de: "2026-11-02", ate: "", pecaId: "" }))).toEqual(["s1", "s2"]);
    expect(ids(filtrarMovimentos(LISTA, { tipo: "tudo", de: "", ate: "2026-11-10", pecaId: "" }))).toEqual(["e1", "s1"]);
  });

  it("Saídas + uma data + um produto, juntos", () => {
    expect(
      ids(filtrarMovimentos(LISTA, { tipo: "saida", de: "2026-11-01", ate: "2026-11-30", pecaId: "b" })),
    ).toEqual(["s2"]);
  });
});
