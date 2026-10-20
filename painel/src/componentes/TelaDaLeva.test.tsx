import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Tarefa } from "../tipos";
import { TelaDaLeva } from "./TelaDaLeva";

const tarefa: Tarefa = { numero: 9, titulo: "Uma tarefa", url: "https://github.com/sakura-corp/sakura-system-ace/issues/9", estado: "livre" };
const html = (props: Partial<Parameters<typeof TelaDaLeva>[0]>) =>
  renderToString(<TelaDaLeva nome="Leva 2" tarefas={[tarefa]} subtitulo="" {...props} />).replace(/<!-- -->/g, "");

describe("TelaDaLeva: as fases no topo (#645)", () => {
  it("com a fase: as cinco fases aparecem; sem a fase (a consulta falhou), não", () => {
    expect(html({ numero: 2, fase: "trabalhando" })).toContain('aria-label="Fases da leva 2"');
    expect(html({ numero: 2 })).not.toContain("Fases da leva");
  });
  it("em Montando: as tarefas aparecem, com o aviso de que a leva anterior ainda espera a aprovação", () => {
    const h = html({ numero: 2, fase: "montando", atual: 1 });
    expect(h).toContain("esperando a aprovação da leva 1");
    // A leva espera a atual (a mais antiga sem aprovação), que nem sempre é a de número anterior.
    expect(html({ numero: 3, fase: "montando", atual: 1 })).toContain("esperando a aprovação da leva 1.");
    expect(h).toContain("Uma tarefa");
    expect(html({ numero: 2, fase: "trabalhando" })).not.toContain("esperando a aprovação");
  });
});

describe("TelaDaLeva: a fase Testando (#646)", () => {
  it("em Testando: o aviso de leva congelada no topo e a busca da lista de testes; em outra fase, não", () => {
    const h = html({ numero: 2, fase: "testando" });
    expect(h).toContain("Leva congelada");
    expect(h).toContain("Buscando a lista de testes");
    // O aviso vem antes da lista de tarefas.
    expect(h.indexOf("Leva congelada")).toBeLessThan(h.indexOf("Uma tarefa"));
    for (const fase of ["montando", "trabalhando", "relatorio", "aprovada"] as const) {
      expect(html({ numero: 2, fase })).not.toContain("Leva congelada");
    }
    // Sem a fase (a consulta das levas falhou), também não.
    expect(html({ numero: 2 })).not.toContain("Leva congelada");
  });
});
