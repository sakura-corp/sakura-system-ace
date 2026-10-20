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
    const h = html({ numero: 2, fase: "montando" });
    expect(h).toContain("esperando a aprovação da leva 1");
    expect(h).toContain("Uma tarefa");
    expect(html({ numero: 2, fase: "trabalhando" })).not.toContain("esperando a aprovação");
  });
});
