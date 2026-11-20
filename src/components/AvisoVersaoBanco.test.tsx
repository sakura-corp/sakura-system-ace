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

  // #725: migration entra só pelo botão "Atualizar o banco de todas as
  // empresas" (desde a 0055), nunca colada à mão. Quem lê a faixa é a loja.
  it("pede pra quem cuida do sistema atualizar, sem mandar colar arquivo no SQL Editor", () => {
    const { container } = render(<AvisoVersaoBanco situacao={situacaoDoEsquema(64, 67, {})} />);
    const texto = container.textContent ?? "";

    expect(texto).not.toMatch(/SQL Editor|New query|supabase\/migrations/i);
    expect(texto).toContain("Quem cuida do sistema precisa atualizar o banco desta empresa");
    expect(texto).toContain("faltam as atualizações 0065, 0066, 0067");
  });

  it("com uma atualização só, a frase fica no singular", () => {
    const { container } = render(<AvisoVersaoBanco situacao={situacaoDoEsquema(66, 67, {})} />);

    expect(container.textContent).toContain("falta a atualização 0067)");
  });

  it("não mexe no aviso de computador atrasado", () => {
    const { container } = render(<AvisoVersaoBanco situacao={situacaoDoEsquema(70, 69, {})} />);

    const texto = container.textContent ?? "";
    expect(texto).toContain(
      "Não é erro, e dá pra continuar trabalhando. Se tiver versão nova, o programa se atualiza " +
        "sozinho ao abrir. Se o aviso continuar depois de fechar e abrir, avise quem cuida do " +
        "sistema: a versão nova talvez ainda não tenha sido liberada.",
    );
    // O "feche e abra" sozinho não resolve quando a versão nova ainda não foi liberada (#865).
    expect(texto).not.toContain("Feche e abra o programa");
  });
});
