import { describe, expect, it } from "vitest";
import { formatarQuantidade } from "./quantidade";

describe("formatarQuantidade (#721)", () => {
  it("inteiro sem vírgula, fração com no máximo 2 casas, milhar com ponto", () => {
    expect(formatarQuantidade(4)).toBe("4");
    expect(formatarQuantidade(4.5)).toBe("4,5");
    expect(formatarQuantidade(1234.256)).toBe("1.234,26");
    expect(formatarQuantidade(-2)).toBe("-2");
  });
});
