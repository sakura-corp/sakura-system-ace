// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { guardarMenuEncolhido, lerMenuEncolhido } from "./menuLateral";

describe("o menu aberto ou encolhido, guardado neste computador", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("sem nada guardado, o menu começa aberto", () => {
    expect(lerMenuEncolhido()).toBe(false);
  });

  it("a escolha fica guardada pra próxima vez que o programa abrir", () => {
    guardarMenuEncolhido(true);
    expect(lerMenuEncolhido()).toBe(true);
    guardarMenuEncolhido(false);
    expect(lerMenuEncolhido()).toBe(false);
  });

  it("valor estranho guardado cai no aberto", () => {
    window.localStorage.setItem("sakura.menu", "metade");
    expect(lerMenuEncolhido()).toBe(false);
  });

  it("computador que não deixa ler nem guardar: aberto, e sem quebrar", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(lerMenuEncolhido()).toBe(false);
    expect(() => guardarMenuEncolhido(true)).not.toThrow();
  });
});
