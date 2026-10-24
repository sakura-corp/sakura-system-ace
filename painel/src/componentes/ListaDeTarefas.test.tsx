import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Tarefa } from "../tipos";
import { ListaDeTarefas } from "./ListaDeTarefas";

const base: Tarefa = { numero: 20, titulo: "Tarefa de teste", url: "https://github.com/sakura-corp/sakura-system-ace/issues/20", estado: "livre", chefe: "frontend" };
const ELA = { login: "Fulana", avatar: "" };
const OUTRO = { login: "beltrano", avatar: "" };
type Opcoes = { login?: string | null; aberta?: boolean; outras?: Tarefa[] };
// login padrão: "fulana"; null = sem login.
const html = (t: Partial<Tarefa>, o: Opcoes = {}) =>
  renderToString(
    <ListaDeTarefas
      tarefas={[{ ...base, ...t }, ...(o.outras ?? [])]}
      login={o.login === null ? undefined : (o.login ?? "fulana")}
      levaAberta={o.aberta ?? true}
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
    // O aviso da ação: região viva, vazia, que recebe o foco quando aparece (tabindex -1).
    expect(h).toMatch(/<p tabindex="-1" role="status" aria-live="polite"[^>]*><\/p>/);
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

  it("leva que não está aberta: desligado e 'esta tarefa não está numa leva aberta'", () => {
    const h = html({}, { aberta: false });
    expect(pegarDesligado(h)).toBe(true);
    expect(h).toContain(">esta tarefa não está numa leva aberta</p>");
  });

  it("sem login (modo de exemplo): desligado e 'entre no painel pra pegar uma tarefa'", () => {
    const h = html({}, { login: null });
    expect(pegarDesligado(h)).toBe(true);
    expect(h).toContain(">entre no painel pra pegar uma tarefa</p>");
  });

  it("o botão desligado aponta pro motivo (aria-describedby), pro leitor de tela ler os dois juntos", () => {
    const h = html({ dependeDeAbertas: [7] });
    expect(h).toMatch(/<button[^>]*disabled=""[^>]*aria-describedby="motivo-20"/);
    expect(h).toContain('<p id="motivo-20"');
  });

  it("o motivo fica fora do botão e o botão diz o número da tarefa só pro leitor de tela", () => {
    const h = html({ dependeDeAbertas: [7] });
    expect(h).toMatch(/<button[^>]*disabled=""[^>]*>Pegar tarefa<span class="sr-only"> \(tarefa #20\)<\/span><\/button>/);
    expect(h).toMatch(/<p id="motivo-20" class="[^"]*text-xs[^"]*text-texto-2[^"]*">espera a #7<\/p>/);
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

  it("o dono ainda vê o Largar numa leva que não está aberta (largar não depende da leva)", () => {
    expect(temLargar(html({ estado: "andamento", dono: ELA }, { aberta: false }))).toBe(true);
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

describe("Lista da leva: a dica do celular (#547)", () => {
  const DICA = /No celular, se o texto não aparecer, abra pelo navegador ou use Copiar texto\./g;
  it("aparece uma vez só, mesmo com duas tarefas de quem olha", () => {
    const h = html({ estado: "andamento", dono: ELA }, { outras: [{ ...base, numero: 21, estado: "revisao", dono: ELA }] });
    expect((h.match(/Começar com o Claude/g) ?? []).length).toBe(2);
    expect((h.match(DICA) ?? []).length).toBe(1);
  });

  it("não aparece quando ninguém da lista é de quem olha", () => {
    expect(html({ estado: "andamento", dono: OUTRO })).not.toMatch(DICA);
    expect(html({})).not.toMatch(DICA);
  });
});

describe("Lista da leva: a coluna Quem (#547)", () => {
  it("em andamento sem dono continua dizendo 'sem responsável'", () => {
    expect(html({ estado: "andamento" })).toContain("sem responsável");
  });
});

describe("Tarefa de projeto secundário (#731)", () => {
  const minha = { dono: ELA, estado: "andamento" as const };
  const linkDoBotao = (h: string) => decodeURIComponent(/href="(https:\/\/claude\.ai\/code[^"]*)"/.exec(h)![1].replace(/&amp;/g, "&"));

  it("o botão do Claude aponta pro repositório do projeto, e o da SSACE continua igual", () => {
    const h = html({ ...minha, repositorio: "ar-condicionado", url: "https://github.com/sakura-corp/ar-condicionado/issues/20" });
    expect(linkDoBotao(h)).toContain("repositories=sakura-corp/ar-condicionado");
    expect(linkDoBotao(h)).toContain("https://github.com/sakura-corp/ar-condicionado/issues/20");
    expect(linkDoBotao(html(minha))).toContain("repositories=sakura-corp/sakura-system-ace");
  });

  it("nome de repositório estranho: sem botão do Claude", () => {
    expect(temLinkDoClaude(html({ ...minha, repositorio: "../x" }))).toBe(false);
  });
});

describe("Lista da leva: o selinho Reservada pra (Sofia, 24/10)", () => {
  const t = (numero: number, extra: Partial<Tarefa> = {}): Tarefa => ({ ...base, numero, url: `https://github.com/sakura-corp/sakura-system-ace/issues/${numero}`, ...extra });
  const lista = (tarefas: Tarefa[]) => renderToString(<ListaDeTarefas tarefas={tarefas} login="fulana" levaAberta />).replace(/<!-- -->/g, "");

  it("mostra pra quem a tarefa está reservada, e o Pegar tarefa continua lá", () => {
    const h = lista([t(70, { reservadaPra: "Tiago, pelo celular" })]);
    expect(h).toContain("pra Tiago, pelo celular");
    expect(h).toContain("Pegar tarefa");
  });

  it("sem a reserva, nenhum selinho", () => {
    expect(lista([t(71)])).not.toContain("reservada");
  });
});

describe("Lista da leva: ordem de prioridade (#776)", () => {
  const t = (numero: number, extra: Partial<Tarefa> = {}): Tarefa => ({ ...base, numero, url: `https://github.com/sakura-corp/sakura-system-ace/issues/${numero}`, ...extra });
  const lista = (tarefas: Tarefa[], login: string | undefined = "fulana") =>
    renderToString(<ListaDeTarefas tarefas={tarefas} login={login} levaAberta />).replace(/<!-- -->/g, "");
  /** Os números na ordem em que aparecem na lista. */
  const ordem = (h: string) => [...h.matchAll(/tabular-nums text-texto-2 \[grid-area:n\][^"]*">#(\d+)</g)].map((m) => Number(m[1]));
  const titulo = (h: string) => /<h2 id="titulo-das-tarefas"[^>]*>(.*?)<\/h2>/.exec(h)![1].replace(/<[^>]+>/g, "");

  it("com prioridade: dentro do grupo, 1º, 2º, 3º (e não a ordem do número)", () => {
    const h = lista([t(30, { prioridade: 3 }), t(31, { prioridade: 1 }), t(32, { prioridade: 2 })]);
    expect(ordem(h)).toEqual([31, 32, 30]);
  });

  it("sem prioridade vai pro fim do grupo, pela ordem do número da issue", () => {
    const h = lista([t(45), t(40, { prioridade: 2 }), t(41), t(44, { prioridade: 1 })]);
    expect(ordem(h)).toEqual([44, 40, 41, 45]);
  });

  it("empate na prioridade: pela ordem do número", () => {
    expect(ordem(lista([t(52, { prioridade: 1 }), t(50, { prioridade: 1 }), t(51, { prioridade: 1 })]))).toEqual([50, 51, 52]);
  });

  it("continua agrupada por estado: a prioridade só ordena dentro de cada grupo", () => {
    const h = lista([
      t(60, { prioridade: 1, estado: "feita" }),
      t(61, { prioridade: 2 }),
      t(62, { prioridade: 3, estado: "andamento", dono: OUTRO }),
      t(63, { prioridade: 1 }),
    ]);
    expect(ordem(h)).toEqual([62, 63, 61, 60]);
  });

  it("selinho 1º, 2º só na tarefa com prioridade", () => {
    const h = lista([t(70, { prioridade: 1 }), t(71, { prioridade: 2 }), t(72)]);
    expect(h).toMatch(/>1º<span class="sr-only"> de prioridade<\/span>/);
    expect(h).toMatch(/>2º<span class="sr-only"> de prioridade<\/span>/);
    expect((h.match(/de prioridade<\/span>/g) ?? []).length).toBe(2);
  });

  it("título: 'Tarefas (N), em ordem de prioridade' quando alguma tem prioridade; sem nenhuma, o de antes", () => {
    expect(titulo(lista([t(80, { prioridade: 1 }), t(81)]))).toBe("Tarefas (2), em ordem de prioridade");
    expect(titulo(lista([t(80), t(81)]))).toBe("Tarefas (2)");
  });

  it("a 1ª continua podendo ser pega como antes, sem aviso", () => {
    const h = lista([t(90, { prioridade: 1 }), t(91, { prioridade: 3 })]);
    expect(h).toMatch(/<button type="button" class="[^"]*">Pegar tarefa<span class="sr-only"> \(tarefa #90\)/);
    expect(h).not.toMatch(/id="prioridade-90"/);
  });

  it("a 3ª também pode ser pega (botão ligado), com o aviso curto de que a #90 (1º) está livre", () => {
    const h = lista([t(90, { prioridade: 1 }), t(91, { prioridade: 3 }), t(92)]);
    // Ligado (sem disabled) e apontando pro aviso, pro leitor de tela ler os dois juntos.
    expect(h).toMatch(/<button type="button" aria-describedby="prioridade-91" class="[^"]*">Pegar tarefa<span class="sr-only"> \(tarefa #91\)/);
    expect(h).toMatch(/<p id="prioridade-91" class="[^"]*">a #90 \(1º\) tem prioridade maior e está livre<\/p>/);
    // Sem prioridade: o aviso aponta a de prioridade mais alta livre.
    expect(h).toMatch(/<p id="prioridade-92" class="[^"]*">a #90 \(1º\) tem prioridade maior e está livre<\/p>/);
  });

  it("sem aviso quando a de prioridade maior não está livre pra quem olha (já pega, incompleta ou esperando)", () => {
    for (const extra of [{ estado: "andamento" as const, dono: OUTRO }, { incompleta: ["Chefe"] }, { dependeDeAbertas: [7] }]) {
      const h = lista([t(90, { prioridade: 1, ...extra }), t(91, { prioridade: 3 })]);
      expect(h).toMatch(/<button type="button" class="[^"]*">Pegar tarefa<span class="sr-only"> \(tarefa #91\)/);
      expect(h).not.toContain("tem prioridade maior");
    }
  });

  it("empate não avisa: as duas com 1º", () => {
    expect(lista([t(90, { prioridade: 1 }), t(91, { prioridade: 1 })])).not.toContain("tem prioridade maior");
  });
});
