// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aplicarTemaGuardado, definirTema, lerTema, ouvirTema } from "./tema";

describe("o tema do programa (escuro ou claro), guardado neste computador", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.tema;
  });
  afterEach(() => vi.restoreAllMocks());

  it("sem nada guardado, é o escuro", () => {
    expect(lerTema()).toBe("escuro");
    aplicarTemaGuardado();
    expect(document.documentElement.dataset.tema).toBe("escuro");
  });

  it("a escolha vai pro <html> na hora e fica guardada pra próxima vez que abrir", () => {
    definirTema("claro");
    expect(document.documentElement.dataset.tema).toBe("claro");

    delete document.documentElement.dataset.tema; // o programa fechou e abriu
    expect(lerTema()).toBe("claro");
    aplicarTemaGuardado();
    expect(document.documentElement.dataset.tema).toBe("claro");
  });

  it("valor estranho guardado (versão antiga, alguém mexeu) cai no escuro", () => {
    window.localStorage.setItem("sakura.tema", "rosa");
    expect(lerTema()).toBe("escuro");
  });

  it("avisa quem está ouvindo (a logo troca junto), e para de avisar quando pedem", () => {
    const ouvinte = vi.fn();
    const parar = ouvirTema(ouvinte);
    definirTema("claro");
    expect(ouvinte).toHaveBeenCalledTimes(1);
    parar();
    definirTema("escuro");
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it("computador que não deixa guardar: o tema troca assim mesmo, só não é lembrado", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("cheio");
    });
    expect(() => definirTema("claro")).not.toThrow();
    expect(document.documentElement.dataset.tema).toBe("claro");
  });
});
