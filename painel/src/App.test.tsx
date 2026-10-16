import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("mostra a leva de exemplo: contador, grupos, aviso de uma por vez e o Financeiro desativado", () => {
    const html = renderToString(<App />).replace(/<!-- -->/g, "");
    expect(html).toContain("Leva 0");
    expect(html).toContain("1 de 8 tarefas feitas");
    expect(html).toContain("bruno-exemplo está com 2 tarefas em andamento");
    expect(html).toContain("em breve, depende do banco próprio da Sakura");
    expect(html).toContain('target="_blank"');
  });
});
