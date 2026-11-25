import { describe, expect, it } from "vitest";
import { servicoCasaComBusca } from "./buscaDeServico";

const OLEO = { descricao: "Troca de Óleo", codigo_interno: "SV-OLEO-01" };

describe("servicoCasaComBusca", () => {
  it("acha pelo nome, sem diferenciar maiúscula nem acento", () => {
    expect(servicoCasaComBusca(OLEO, "oleo")).toBe(true);
    expect(servicoCasaComBusca(OLEO, "TROCA")).toBe(true);
  });
  it("acha pelo código interno", () => {
    expect(servicoCasaComBusca(OLEO, "sv-oleo")).toBe(true);
  });
  it("busca vazia deixa tudo; busca sem relação tira", () => {
    expect(servicoCasaComBusca(OLEO, "  ")).toBe(true);
    expect(servicoCasaComBusca(OLEO, "alinhamento")).toBe(false);
    expect(servicoCasaComBusca({ descricao: "Alinhamento", codigo_interno: null }, "null")).toBe(false);
  });
});
