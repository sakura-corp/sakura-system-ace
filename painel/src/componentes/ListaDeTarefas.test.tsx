import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Tarefa } from "../tipos";
import { ListaDeTarefas } from "./ListaDeTarefas";

const base: Tarefa = { numero: 20, titulo: "Tarefa de teste", url: "https://github.com/sakura-corp/sakura-system-ace/issues/20", estado: "livre", chefe: "frontend" };
const html = (t: Partial<Tarefa>) => renderToString(<ListaDeTarefas tarefas={[{ ...base, ...t }]} />).replace(/<!-- -->/g, "");
const temLinkDoClaude = (h: string) => h.includes("https://claude.ai/code");
const temCopiar = (h: string) => /<button[^>]*>Copiar texto/.test(h);

describe("Cartão da tarefa: cabeçalho (#536)", () => {
  it("tarefa normal: link do Claude e Copiar texto, sem aviso", () => {
    const h = html({});
    expect(temLinkDoClaude(h)).toBe(true);
    expect(temCopiar(h)).toBe(true);
    expect(h).not.toContain("Espera");
    expect(h).not.toContain("tarefa incompleta");
  });

  it("dependência aberta: botão desligado 'Espera #N', sem Copiar texto e sem link do Claude", () => {
    const h = html({ dependeDeAbertas: [7] });
    expect(h).toMatch(/<button[^>]*disabled=""[^>]*>.*Espera #7/);
    expect(h).toContain("a tarefa #20 só pode começar quando #7 for fechada");
    const classe = /<button[^>]*disabled=""[^>]*class="([^"]*)"/.exec(h)?.[1] ?? "";
    expect(classe).toContain("min-h-11");
    expect(classe.split(" ").filter((c) => /^(disabled:)?opacity-/.test(c))).toEqual([]);
    expect(temCopiar(h)).toBe(false);
    expect(temLinkDoClaude(h)).toBe(false);
  });

  it("a mesma tarefa sem dependência aberta (vazia ou ausente): os dois botões voltam", () => {
    for (const dependeDeAbertas of [[], undefined]) {
      const h = html({ dependeDeAbertas });
      expect(temLinkDoClaude(h)).toBe(true);
      expect(temCopiar(h)).toBe(true);
      expect(h).not.toContain("Espera");
    }
  });

  it("várias dependências: 'Espera #7, #9'", () => {
    expect(html({ dependeDeAbertas: [7, 9] })).toContain("Espera #7, #9");
  });

  it("incompleta: 'tarefa incompleta', sem botões, e o que falta à vista (no celular não há dica de mouse)", () => {
    const h = html({ incompleta: ["Chefe", "Estimativa"] });
    expect(h).toContain("tarefa incompleta");
    expect(h).toContain(">No cabeçalho: Chefe; Estimativa</p>");
    expect(h).not.toMatch(/<[^>]*class="[^"]*sr-only[^"]*"[^>]*>[^<]*No cabeçalho/);
    expect(temLinkDoClaude(h)).toBe(false);
    expect(temCopiar(h)).toBe(false);
    expect(h).not.toContain("Espera");
  });

  it("incompleta e com dependência aberta: vale só 'tarefa incompleta'", () => {
    const h = html({ incompleta: ["Chefe"], dependeDeAbertas: [7] });
    expect(h).toContain("tarefa incompleta");
    expect(h).not.toContain("Espera");
    expect(h).not.toContain("<button");
  });

  it("tarefa feita: sem botões e sem aviso, mesmo com incompleta e dependência preenchidos", () => {
    const h = html({ estado: "feita", incompleta: ["Chefe"], dependeDeAbertas: [7] });
    expect(h).not.toContain("tarefa incompleta");
    expect(h).not.toContain("Espera");
    expect(h).not.toContain("<button");
    expect(temLinkDoClaude(h)).toBe(false);
  });

  it("chefe e ajudantes aparecem; somem quando faltam; quebram linha (min-w-0 e break-words)", () => {
    const h = html({ ajudantes: "tester (conferir o Pronto quando)" });
    expect(h).toContain("Chefe: frontend");
    expect(h).toContain("Ajudantes: tester (conferir o Pronto quando)");
    expect(h).toMatch(/<span class="[^"]*min-w-0[^"]*break-words[^"]*">Ajudantes:/);
    const sem = html({ chefe: undefined });
    expect(sem).not.toContain("Chefe:");
    expect(sem).not.toContain("Ajudantes:");
  });
});
