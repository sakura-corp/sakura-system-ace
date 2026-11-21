import { describe, expect, it } from "vitest";
import { pastaDeDadosDoDesenvolvimento } from "./pastaDeDados";

// #1157: o `npm run dev` e o programa instalado dividiam a pasta de dados
// (conexao.json, canal, identidade do computador, logs). Trocar a conexão num
// trocava no outro.
describe("pastaDeDadosDoDesenvolvimento", () => {
  const PADRAO = "C:\\Users\\Loja\\AppData\\Roaming\\sakura-system-autocenter";

  it("no programa instalado não muda nada (nenhuma loja perde a conexão ao atualizar)", () => {
    expect(pastaDeDadosDoDesenvolvimento(PADRAO, true)).toBeNull();
  });

  it("no npm run dev usa uma pasta só dele, ao lado da do programa instalado", () => {
    expect(pastaDeDadosDoDesenvolvimento(PADRAO, false)).toBe(
      "C:\\Users\\Loja\\AppData\\Roaming\\sakura-system-autocenter-dev",
    );
  });

  it("nunca devolve a mesma pasta do programa instalado, nem com barra no fim", () => {
    expect(pastaDeDadosDoDesenvolvimento(`${PADRAO}\\`, false)).toBe(`${PADRAO}-dev`);
    expect(pastaDeDadosDoDesenvolvimento("/home/x/.config/sakura-system-autocenter/", false)).toBe(
      "/home/x/.config/sakura-system-autocenter-dev",
    );
  });
});
