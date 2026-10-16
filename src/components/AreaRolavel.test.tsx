// @vitest-environment jsdom
//
// Precisa de DOM (padrão de notaFiscalXml.test.ts). O layout é simulado à mão.

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AreaRolavel } from "./AreaRolavel";

// O jsdom não calcula layout nem tem ResizeObserver: aqui as medidas e o aviso
// de "mudou de tamanho" são simulados à mão.
let observados: Element[] = [];
let avisar: () => void = () => {};
let alturaDoConteudo = 0;

beforeEach(() => {
  observados = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        avisar = callback;
      }
      observe(el: Element) {
        observados.push(el);
      }
      disconnect() {}
    },
  );
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 300,
  });
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => alturaDoConteudo,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
  delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
});

describe("AreaRolavel", () => {
  it("mostra a barrinha quando o conteúdo cresce e a tira quando encolhe, sem re-renderizar", () => {
    alturaDoConteudo = 200;
    render(
      <AreaRolavel>
        <div data-testid="filho">conteúdo</div>
      </AreaRolavel>,
    );
    expect(screen.queryByTestId("barra-rolagem-thumb")).toBeNull();
    // Só o conteúdo é observado também, não apenas o contêiner.
    expect(observados).toContain(screen.getByTestId("filho"));

    alturaDoConteudo = 900;
    act(() => avisar());
    expect(screen.getByTestId("barra-rolagem-thumb")).toBeTruthy();

    alturaDoConteudo = 200;
    act(() => avisar());
    expect(screen.queryByTestId("barra-rolagem-thumb")).toBeNull();
  });
});
