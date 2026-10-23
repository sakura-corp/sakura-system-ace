import { describe, expect, it } from "vitest";
import { podeAbrirNoNavegador } from "./linkExterno";

describe("podeAbrirNoNavegador", () => {
  it("abre o link do documento oficial da NFS-e no portal do Giap", () => {
    // O link real que vem na confirmação de Araraquara (#773).
    expect(podeAbrirNoNavegador("https://araraquara.giap.com.br/ords/pma/f?p=616:116")).toBe(true);
    // Outra prefeitura que também usa o Giap.
    expect(podeAbrirNoNavegador("https://outracidade.giap.com.br/ords/x")).toBe(true);
  });

  it("recusa qualquer outro site", () => {
    expect(podeAbrirNoNavegador("https://exemplo.test/")).toBe(false);
    expect(podeAbrirNoNavegador("https://giap.com.br.ladrao.test/")).toBe(false);
    expect(podeAbrirNoNavegador("https://ladraogiap.com.br/")).toBe(false);
    expect(podeAbrirNoNavegador("https://araraquara.giap.com.br@ladrao.test/")).toBe(false);
  });

  it("recusa o portal fora de https", () => {
    expect(podeAbrirNoNavegador("http://araraquara.giap.com.br/ords/pma/f?p=616:116")).toBe(false);
    expect(podeAbrirNoNavegador("file:///C:/Windows/System32/calc.exe")).toBe(false);
    expect(podeAbrirNoNavegador("javascript:alert(1)")).toBe(false);
  });

  it("recusa o que nem é endereço", () => {
    expect(podeAbrirNoNavegador("")).toBe(false);
    expect(podeAbrirNoNavegador("araraquara.giap.com.br")).toBe(false);
  });
});
