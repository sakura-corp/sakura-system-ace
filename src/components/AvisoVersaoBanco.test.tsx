// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { situacaoDoEsquema } from "@/schemas/versaoEsquema";
import { AvisoVersaoBanco } from "./AvisoVersaoBanco";

afterEach(cleanup);

describe("AvisoVersaoBanco", () => {
  // #757: a 0069 sobe depois da 0.9.54, de propósito. Nesses dias a loja não
  // pode ver "o banco ainda não foi atualizado".
  it("não mostra a faixa quando só falta migration que espera os computadores", () => {
    const { container } = render(
      <AvisoVersaoBanco situacao={situacaoDoEsquema(68, 69, { 69: "0.9.54" })} />,
    );

    expect(container.textContent).toBe("");
  });

  it("mostra a faixa quando falta migration que o programa precisa", () => {
    const { container } = render(
      <AvisoVersaoBanco situacao={situacaoDoEsquema(67, 69, { 69: "0.9.54" })} />,
    );

    expect(container.textContent).toContain("0068, 0069");
  });
});
