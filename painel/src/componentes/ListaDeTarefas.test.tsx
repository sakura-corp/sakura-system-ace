import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Tarefa } from "../tipos";
import { ListaDeTarefas } from "./ListaDeTarefas";

const base: Tarefa = { numero: 20, titulo: "Tarefa de teste", url: "https://github.com/sakura-corp/sakura-system-ace/issues/20", estado: "livre", chefe: "frontend" };
const ELA = { login: "Fulana", avatar: "" };
const OUTRO = { login: "beltrano", avatar: "" };
type Opcoes = { login?: string | null; atual?: boolean; outras?: Tarefa[] };
// login padrão: "fulana"; null = sem login.
const html = (t: Partial<Tarefa>, o: Opcoes = {}) =>
  renderToString(
    <ListaDeTarefas
      tarefas={[{ ...base, ...t }, ...(o.outras ?? [])]}
      login={o.login === null ? undefined : (o.login ?? "fulana")}
      ehALevaAtual={o.atual ?? true}
    />,
  ).replace(/<!-- -->/g, "");
const temLinkDoClaude = (h: string) => h.includes("https://claude.ai/code");
const temCopiar = (h: string) => /<button[^>]*>Copiar texto/.test(h);
const temPegarLigado = (h: string) => /<button type="button" class="[^"]*">Pegar tarefa/.test(h);
const pegarDesligado = (h: string) => /<button[^>]*disabled=""[^>]*>Pegar tarefa/.test(h);
const temLargar = (h: string) => /<button[^>]*>Largar</.test(h);

describe("Cartão da tarefa: Pegar tarefa (#538)", () => {
  it("livre e pode pegar: 'Pegar tarefa' ligado, sem link do Claude e sem Copiar texto", () => {
    const h = html({});
    expect(temPegarLigado(h)).toBe(true);
    expect(pegarDesligado(h)).toBe(false);
    expect(h).toContain("Pegar tarefa<span class=\"sr-only\"> (tarefa #20)</span>");
    expect(temLinkDoClaude(h)).toBe(false);
    expect(temCopiar(h)).toBe(false);
    expect(temLargar(h)).toBe(false);
    expect(h).not.toContain("tarefa incompleta");
  });

  it("o botão mantém o alvo de toque (min-h-11) e a linha de aviso 'role=status' fica no cartão", () => {
    const h = html({});
    expect(/<button[^>]*class="([^"]*)"[^>]*>Pegar tarefa/.exec(h)?.[1]).toContain("min-h-11");
    expect(h).toMatch(/<p role="status" aria-live="polite"[^>]*><\/p>/);
  });

  it("livre com dependência aberta: Pegar desligado e 'espera a #7' à vista (sem opacity)", () => {
    const h = html({ dependeDeAbertas: [7] });
    expect(pegarDesligado(h)).toBe(true);
    expect(h).toContain(">espera a #7</p>");
    const classe = /<button[^>]*disabled=""[^>]*class="([^"]*)"/.exec(h)?.[1] ?? "";
    expect(classe).toContain("min-h-11");
    expect(classe.split(" ").filter((c) => /^(disabled:)?opacity-/.test(c))).toEqual([]);
    expect(h).not.toContain("Espera #");
    expect(temCopiar(h)).toBe(false);
    expect(temLinkDoClaude(h)).toBe(false);
  });

  it("várias dependências: 'espera a #7, #9'", () => {
    expect(html({ dependeDeAbertas: [7, 9] })).toContain("espera a #7, #9");
  });

  it("dependência vazia ou ausente: volta a poder pegar", () => {
    for (const dependeDeAbertas of [[], undefined]) {
      const h = html({ dependeDeAbertas });
      expect(temPegarLigado(h)).toBe(true);
      expect(h).not.toContain("espera a");
    }
  });

  it("já tem outra em andamento: desligado e 'você já está com a #11'", () => {
    const h = html({}, { outras: [{ ...base, numero: 11, estado: "andamento", dono: ELA }] });
    expect(h).toMatch(/<button[^>]*disabled=""[^>]*>Pegar tarefa/);
    expect(h).toContain(">você já está com a #11</p>");
  });

  it("outra em revisão não impede de pegar", () => {
    const h = html({}, { outras: [{ ...base, numero: 11, estado: "revisao", dono: ELA }] });
    expect(h).toMatch(/<button type="button" class="[^"]*">Pegar tarefa/);
  });

  it("leva que não é a atual: desligado e 'esta tarefa não está na leva atual'", () => {
    const h = html({}, { atual: false });
    expect(pegarDesligado(h)).toBe(true);
    expect(h).toContain(">esta tarefa não está na leva atual</p>");
  });

  it("sem login (modo de exemplo): desligado e 'entre no painel pra pegar uma tarefa'", () => {
    const h = html({}, { login: null });
    expect(pegarDesligado(h)).toBe(true);
    expect(h).toContain(">entre no painel pra pegar uma tarefa</p>");
  });

  it("o motivo fica fora do botão e o botão diz o número da tarefa só pro leitor de tela", () => {
    const h = html({ dependeDeAbertas: [7] });
    expect(h).toMatch(/<button[^>]*disabled=""[^>]*>Pegar tarefa<span class="sr-only"> \(tarefa #20\)<\/span><\/button>/);
    expect(h).toMatch(/<p class="[^"]*text-xs[^"]*text-texto-2[^"]*">espera a #7<\/p>/);
  });
});

describe("Cartão da tarefa: quem já pegou (#538)", () => {
  it("o dono, em andamento: Começar, Copiar e Largar (maiúscula no login não importa)", () => {
    const h = html({ estado: "andamento", dono: ELA }, { login: "FULANA" });
    expect(temLinkDoClaude(h)).toBe(true);
    expect(temCopiar(h)).toBe(true);
    expect(temLargar(h)).toBe(true);
    expect(h).not.toContain("Pegar tarefa");
    expect(h).not.toContain("Largar mesmo?");
    expect(h).not.toContain("Sim, largar");
    const classe = /<button[^>]*class="([^"]*)"[^>]*>Largar</.exec(h)?.[1] ?? "";
    expect(classe).toContain("border-borda");
    expect(classe).toContain("min-h-11");
  });

  it("o dono, em revisão: Começar e Copiar, sem Largar", () => {
    const h = html({ estado: "revisao", dono: ELA });
    expect(temLinkDoClaude(h)).toBe(true);
    expect(temCopiar(h)).toBe(true);
    expect(temLargar(h)).toBe(false);
    expect(h).not.toContain("Pegar tarefa");
  });

  it("o dono com dependência aberta ainda vê o Começar (a dependência é de quem vai pegar)", () => {
    const h = html({ estado: "andamento", dono: ELA, dependeDeAbertas: [7] });
    expect(temLinkDoClaude(h)).toBe(true);
    expect(h).not.toContain("espera a");
  });

  it("dono é outra pessoa: nenhum botão (nem Pegar, nem Largar, nem Claude)", () => {
    for (const estado of ["andamento", "revisao"] as const) {
      const h = html({ estado, dono: OUTRO });
      expect(h).not.toContain("<button");
      expect(temLinkDoClaude(h)).toBe(false);
    }
  });

  it("tem dono e ninguém está logado: nenhum botão", () => {
    expect(html({ estado: "andamento", dono: ELA }, { login: null })).not.toContain("<button");
  });

  it("o dono ainda vê o Largar numa leva que não é a atual (largar não depende da leva)", () => {
    expect(temLargar(html({ estado: "andamento", dono: ELA }, { atual: false }))).toBe(true);
  });
});

describe("Cartão da tarefa: cabeçalho (#536)", () => {
  it("incompleta: 'tarefa incompleta', sem botões, e o que falta à vista (no celular não há dica de mouse)", () => {
    const h = html({ incompleta: ["Chefe", "Estimativa"] });
    expect(h).toContain("tarefa incompleta");
    expect(h).toContain(">No cabeçalho: Chefe; Estimativa</p>");
    expect(h).not.toMatch(/<[^>]*class="[^"]*sr-only[^"]*"[^>]*>[^<]*No cabeçalho/);
    expect(temLinkDoClaude(h)).toBe(false);
    expect(temCopiar(h)).toBe(false);
    expect(h).not.toContain("Espera");
    expect(h).not.toContain("Pegar tarefa");
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
