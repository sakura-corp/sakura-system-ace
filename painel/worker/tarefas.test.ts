import { describe, expect, it, vi } from "vitest";
import {
  MAXIMO_DE_DEPENDENCIAS,
  consultaDasDependencias,
  dependenciasDaLeva,
  estadosDaLeva,
  fechadasDaResposta,
  levaDosDados,
  levasDosDados,
  marcarDependenciasAbertas,
  numerosDeFora,
  resumoDasLevasDosDados,
  tarefaDaIssue,
  CONSULTA_DAS_LEVAS,
  CONSULTA_DO_RESUMO_DAS_LEVAS,
  type DadosDaLeva,
  type DadosDasLevas,
  type EtiquetaDoResumo,
  type TarefaDoResumo,
  type IssueDoGitHub,
  type PerguntarAoGitHub,
} from "./tarefas";
import type { RespostaDaLeva } from "../src/tipos";

const issue = (extra: Partial<IssueDoGitHub> = {}): IssueDoGitHub => ({
  number: 354,
  title: "Painel 6/8: As tarefas de verdade do GitHub",
  url: "https://github.com/sakura-corp/sakura-system-ace/issues/354",
  state: "OPEN",
  body: "Estimativa: 5 h\n\nTexto com ghp_coisa que não pode ir pra página",
  assignees: { nodes: [] },
  closedByPullRequestsReferences: { nodes: [] },
  ...extra,
});
const pr = (n: number, state: "OPEN" | "CLOSED" | "MERGED") => ({ url: `https://github.com/sakura-corp/sakura-system-ace/pull/${n}`, state });
const fulana = { login: "fulana", avatarUrl: "https://avatars.githubusercontent.com/u/1?s=40" };

describe("tarefaDaIssue", () => {
  it("livre: aberta, sem responsável, sem PR; lê a estimativa e não leva o texto", () => {
    const t = tarefaDaIssue(issue());
    expect(t).toMatchObject({ numero: 354, titulo: "Painel 6/8: As tarefas de verdade do GitHub", url: "https://github.com/sakura-corp/sakura-system-ace/issues/354", estado: "livre", estimativaHoras: 5 });
    // Este texto não tem o cabeçalho de 5 linhas: a tarefa vem incompleta (#536).
    expect(Object.keys(t).sort()).toEqual(["estado", "estimativaHoras", "incompleta", "numero", "titulo", "url"]);
    expect(JSON.stringify(t)).not.toContain("ghp_");
  });

  it("andamento: com responsável (login e foto); PR fechado sem mesclar não conta", () => {
    const t = tarefaDaIssue(issue({ assignees: { nodes: [fulana] }, closedByPullRequestsReferences: { nodes: [pr(1, "CLOSED")] } }));
    expect(t.estado).toBe("andamento");
    expect(t.dono).toEqual({ login: "fulana", avatar: fulana.avatarUrl });
    expect(t.prUrl).toBeUndefined();
  });

  it("revisão: com PR aberto que a fecha; o link é o do PR aberto", () => {
    const t = tarefaDaIssue(issue({ assignees: { nodes: [fulana] }, closedByPullRequestsReferences: { nodes: [pr(1, "CLOSED"), pr(2, "OPEN")] } }));
    expect(t.estado).toBe("revisao");
    expect(t.prUrl).toBe("https://github.com/sakura-corp/sakura-system-ace/pull/2");
  });

  it("feita: fechada; o link é o do PR mesclado", () => {
    const t = tarefaDaIssue(issue({ state: "CLOSED", assignees: { nodes: [fulana] }, closedByPullRequestsReferences: { nodes: [pr(3, "MERGED")] } }));
    expect(t.estado).toBe("feita");
    expect(t.prUrl).toBe("https://github.com/sakura-corp/sakura-system-ace/pull/3");
  });

  it("link de fora do GitHub da Sakura não passa: a issue vira o link pelo número, a foto some", () => {
    const t = tarefaDaIssue(issue({
      url: "https://mal.exemplo/354",
      assignees: { nodes: [{ login: "x", avatarUrl: "javascript:alert(1)" }] },
      closedByPullRequestsReferences: { nodes: [{ url: "https://mal.exemplo/pr", state: "OPEN" }] },
    }));
    expect(t.url).toBe("https://github.com/sakura-corp/sakura-system-ace/issues/354");
    expect(t.dono?.avatar).toBe("");
    expect(t.prUrl).toBeUndefined();
    expect(t.estado).toBe("revisao");
  });

  it("sem texto e sem a lista de PRs: livre, sem estimativa", () => {
    const t = tarefaDaIssue(issue({ body: null, closedByPullRequestsReferences: null }));
    expect(t.estado).toBe("livre");
    expect("estimativaHoras" in t).toBe(false);
  });
});

describe("etiqueta chefe:* (botão Começar com o Claude)", () => {
  const com = (...nomes: (string | null)[]) => issue({ labels: { nodes: nomes.map((name) => (name === null ? null : { name })) } });
  it("devolve só a função conhecida, ignorando as outras etiquetas", () => {
    expect(tarefaDaIssue(com("leva-0", null, "chefe:tester")).chefe).toBe("tester");
  });
  it("etiqueta desconhecida ou sem etiqueta: não tem chefe", () => {
    expect(tarefaDaIssue(com("chefe:gerente")).chefe).toBeUndefined();
    expect("chefe" in tarefaDaIssue(issue())).toBe(false);
    expect("chefe" in tarefaDaIssue(issue({ labels: null }))).toBe(false);
  });
});

describe("levasDosDados", () => {
  it("só as etiquetas leva-N, em ordem, com a fase, e a atual", () => {
    const dados = {
      repository: {
        labels: {
          nodes: [
            { name: "leva-1", issues: { totalCount: 0 }, fechadas: { totalCount: 2 } },
            { name: "leva-x", issues: { totalCount: 9 }, fechadas: { totalCount: 0 } },
            null,
            { name: "leva-0", issues: { totalCount: 4 }, fechadas: { totalCount: 1 } },
            { name: "sem-leva", issues: { totalCount: 9 }, fechadas: { totalCount: 0 } },
          ],
        },
      },
    };
    expect(levasDosDados(dados)).toEqual({
      levas: [
        { numero: 0, nome: "Leva 0", abertas: 4, fechadas: 1, fase: "aprovada", antesDasFases: true },
        { numero: 1, nome: "Leva 1", abertas: 0, fechadas: 2, fase: "testando" },
      ],
      atual: 1,
    });
  });
  it("sem repositório: nenhuma leva", () => {
    expect(levasDosDados({ repository: null })).toEqual({ levas: [], atual: null });
  });
});

describe("as fases das levas, lidas do GitHub (#644)", () => {
  type Etiqueta = { name: string; abertas: number; fechadas: number };
  const dados = (etiquetas: Etiqueta[], extra: { naMain?: string[]; prs?: string[][] } = {}): DadosDasLevas => ({
    repository: {
      labels: { nodes: etiquetas.map((e) => ({ name: e.name, issues: { totalCount: e.abertas }, fechadas: { totalCount: e.fechadas } })) },
      relatoriosNaMain: extra.naMain ? { entries: extra.naMain.map((name) => ({ name })) } : null,
      prsAbertos: { nodes: (extra.prs ?? []).map((caminhos) => ({ files: { nodes: caminhos.map((path) => ({ path })) } })) },
    },
  });
  const fases = (d: DadosDasLevas) => {
    const r = levasDosDados(d);
    return { atual: r.atual, fases: Object.fromEntries(r.levas.map((l) => [l.numero, l.fase])) };
  };

  it("leva 2 com tarefas enquanto a 1 espera aprovação: a atual continua a 1 e a 2 sai em Montando", () => {
    const d = dados(
      [{ name: "leva-0", abertas: 0, fechadas: 8 }, { name: "leva-1", abertas: 0, fechadas: 6 }, { name: "leva-2", abertas: 11, fechadas: 2 }],
      { naMain: ["README.md", "leva-1-testes.md"], prs: [["docs/relatorios/leva-1.md"]] },
    );
    expect(fases(d)).toEqual({ atual: 1, fases: { 0: "aprovada", 1: "relatorio", 2: "montando" } });
  });
  it("a 1 aprovada (o relatório na main): a 2 vira a atual, em Trabalhando", () => {
    const d = dados([{ name: "leva-1", abertas: 0, fechadas: 6 }, { name: "leva-2", abertas: 11, fechadas: 2 }], { naMain: ["leva-1.md"] });
    expect(fases(d)).toEqual({ atual: 2, fases: { 1: "aprovada", 2: "trabalhando" } });
  });
  it("o PR só com o leva-1-testes.md não põe a leva em Relatório; um PR de outra leva também não", () => {
    const d = dados([{ name: "leva-1", abertas: 0, fechadas: 6 }], { prs: [["docs/relatorios/leva-1-testes.md", "src/x.ts"], ["docs/relatorios/leva-7.md"]] });
    expect(fases(d).fases[1]).toBe("testando");
  });
  it("tarefa com `defeito` e sem `leva-N` não muda a fase: a etiqueta defeito não é leva", () => {
    const sem = dados([{ name: "leva-1", abertas: 0, fechadas: 6 }]);
    const com = dados([{ name: "leva-1", abertas: 0, fechadas: 6 }, { name: "defeito", abertas: 3, fechadas: 0 }]);
    expect(fases(com)).toEqual(fases(sem));
    expect(fases(com).fases).toEqual({ 1: "testando" });
  });
  it("um PR que só apaga o docs/relatorios/leva-N.md não põe a leva em Relatório", () => {
    const d = dados([{ name: "leva-1", abertas: 0, fechadas: 6 }]);
    d.repository!.prsAbertos = { nodes: [{ files: { nodes: [{ path: "docs/relatorios/leva-1.md", changeType: "DELETED" }] } }] };
    expect(fases(d).fases[1]).toBe("testando");
    d.repository!.prsAbertos = { nodes: [{ files: { nodes: [{ path: "docs/relatorios/leva-1.md", changeType: "ADDED" }] } }] };
    expect(fases(d).fases[1]).toBe("relatorio");
  });
  it("sem a pasta na main (null) e sem PR: nada aprovado além da leva 0", () => {
    const d = dados([{ name: "leva-0", abertas: 0, fechadas: 1 }, { name: "leva-1", abertas: 2, fechadas: 0 }]);
    expect(fases(d)).toEqual({ atual: 1, fases: { 0: "aprovada", 1: "trabalhando" } });
  });
  it("a consulta das levas traz os relatórios numa consulta só, sem o texto das tarefas", () => {
    expect(CONSULTA_DAS_LEVAS).toContain('object(expression: "main:docs/relatorios")');
    expect(CONSULTA_DAS_LEVAS).toContain("pullRequests(states: OPEN");
    expect(CONSULTA_DAS_LEVAS).not.toContain("body");
    expect(CONSULTA_DO_RESUMO_DAS_LEVAS).toContain('object(expression: "main:docs/relatorios")');
  });
});

describe("resumoDasLevasDosDados (#548)", () => {
  // Uma etiqueta no formato da consulta: `issues` = as abertas, `todas` = abertas e fechadas.
  const etiqueta = (name: string, nodes: (TarefaDoResumo | null)[], totalCount = nodes.length): EtiquetaDoResumo => ({
    name,
    issues: { totalCount: nodes.filter((n) => n?.state === "OPEN").length },
    todas: { totalCount, nodes },
  });
  const fechada = (closedAt: string | null, body: string | null = null): TarefaDoResumo => ({ state: "CLOSED", closedAt, body });
  const aberta = (body: string | null = null): TarefaDoResumo => ({ state: "OPEN", closedAt: null, body });
  const levas = (...nodes: (EtiquetaDoResumo | null)[]) => resumoDasLevasDosDados({ repository: { labels: { nodes } } }).levas;

  it("só as etiquetas leva-N, em ordem, e a atual", () => {
    const r = resumoDasLevasDosDados({
      repository: {
        labels: {
          nodes: [
            etiqueta("leva-1", [fechada("2026-10-01T10:00:00Z")]),
            etiqueta("leva-x", [aberta()]),
            null,
            etiqueta("leva-0", [aberta(), aberta(), aberta(), aberta()]),
            etiqueta("sem-leva", [aberta()]),
          ],
        },
      },
    });
    expect(r.levas.map((l) => [l.numero, l.nome, l.abertas, l.fase])).toEqual([[0, "Leva 0", 4, "aprovada"], [1, "Leva 1", 0, "testando"]]);
    expect(r.atual).toBe(1);
  });
  it("sem repositório: nenhuma leva", () => {
    expect(resumoDasLevasDosDados({ repository: null })).toEqual({ levas: [], atual: null });
  });
  it("total, feitas (fechada = feita) e a data = o maior closedAt, como veio", () => {
    const [leva] = levas(etiqueta("leva-2", [fechada("2026-10-05T12:00:00Z"), fechada("2026-10-09T08:30:00Z"), fechada("2026-10-07T23:59:00Z")]));
    expect(leva).toEqual({ numero: 2, nome: "Leva 2", abertas: 0, fechadas: 3, fase: "testando", total: 3, feitas: 3, horas: 0, terminouEm: "2026-10-09T08:30:00Z" });
  });
  it("leva com tarefa aberta não tem data, mesmo com fechadas", () => {
    const [leva] = levas(etiqueta("leva-3", [fechada("2026-10-05T12:00:00Z"), aberta()]));
    expect(leva.terminouEm).toBeNull();
    expect([leva.total, leva.feitas, leva.abertas]).toEqual([2, 1, 1]);
    // A contagem diz que tem aberta, mesmo que os nós que vieram estejam todos fechados: sem data.
    const contagem = { ...etiqueta("leva-4", [fechada("2026-10-05T12:00:00Z")]), issues: { totalCount: 1 } };
    expect(levas(contagem)[0].terminouEm).toBeNull();
  });
  it("as horas somam as estimativas; tarefa sem estimativa conta 0, nunca NaN", () => {
    const [leva] = levas(etiqueta("leva-5", [fechada("2026-10-05T12:00:00Z", "Estimativa: 0,1 h"), fechada("2026-10-06T12:00:00Z", "sem nada"), fechada("2026-10-07T12:00:00Z", null), fechada("2026-10-08T12:00:00Z", "Estimativa: 0.2 h")]));
    expect(leva.horas).toBe(0.3);
    expect(Number.isNaN(leva.horas)).toBe(false);
  });
  it("leva vazia: sem data e tudo zero", () => {
    expect(levas(etiqueta("leva-6", []))[0]).toEqual({ numero: 6, nome: "Leva 6", abertas: 0, fechadas: 0, fase: "montando", total: 0, feitas: 0, horas: 0, terminouEm: null });
  });
  it("closedAt nulo ou inválido não conta; nenhum válido = sem data", () => {
    expect(levas(etiqueta("leva-7", [fechada("não é data"), fechada("2026-10-02T00:00:00Z"), fechada(null)]))[0].terminouEm).toBe("2026-10-02T00:00:00Z");
    expect(levas(etiqueta("leva-8", [fechada(null), fechada("xx")]))[0].terminouEm).toBeNull();
  });
  it("cortada só quando o GitHub tem mais tarefas do que vieram; nós null são ignorados", () => {
    const [cortada] = levas(etiqueta("leva-9", [fechada("2026-10-02T00:00:00Z")], 150));
    expect(cortada.cortada).toBe(true);
    expect(cortada.total).toBe(150);
    const [inteira] = levas(etiqueta("leva-10", [fechada("2026-10-02T00:00:00Z"), null], 1));
    expect("cortada" in inteira).toBe(false);
    expect(inteira.terminouEm).toBe("2026-10-02T00:00:00Z");
  });
});

describe("levaDosDados", () => {
  it("monta as tarefas e diz se a leva passou de 100", () => {
    expect(levaDosDados(0, { repository: { issues: { totalCount: 1, nodes: [issue()] } } })).toMatchObject({ numero: 0, cortada: false, tarefas: [{ numero: 354 }] });
    expect(levaDosDados(0, { repository: { issues: { totalCount: 150, nodes: [issue(), null] } } })?.cortada).toBe(true);
    expect(levaDosDados(0, { repository: null })).toBeNull();
  });
});

// ---- O cabeçalho e o Depende de (#536) ----

/** O texto da issue com o cabeçalho de 5 linhas; `extra` troca uma linha, `null` tira ela. */
const corpo = (extra: Partial<Record<"chefe" | "ajudantes" | "estimativa" | "depende" | "filhas", string | null>> = {}) => {
  const c = { chefe: "backend", ajudantes: "tester (conferir)", estimativa: "4 h", depende: "nada", filhas: "não", ...extra };
  const linhas = [
    c.chefe === null ? null : `Chefe: ${c.chefe}`,
    c.ajudantes === null ? null : `Ajudantes: ${c.ajudantes}`,
    c.estimativa === null ? null : `Estimativa: ${c.estimativa}`,
    c.depende === null ? null : `Depende de: ${c.depende}`,
    c.filhas === null ? null : `Sessões filhas: ${c.filhas}`,
  ].filter((l) => l !== null);
  return `${linhas.join("\n")}\n\n## Pra que serve\nTexto MARCADOR_DO_CORPO_536 que não vai pra página.`;
};
/** Uma issue de leva com cabeçalho completo e etiqueta `chefe:backend`. */
const daLeva = (number: number, extra: Partial<IssueDoGitHub> = {}, cabecalho: Parameters<typeof corpo>[0] = {}): IssueDoGitHub =>
  issue({ number, url: `https://github.com/sakura-corp/sakura-system-ace/issues/${number}`, body: corpo(cabecalho), labels: { nodes: [{ name: "leva-1" }, { name: "chefe:backend" }] }, ...extra });
const leva = (...issues: IssueDoGitHub[]): DadosDaLeva => ({ repository: { issues: { totalCount: issues.length, nodes: issues } } });

describe("cabeçalho no cartão (#536)", () => {
  it("cabeçalho completo: chefe, ajudantes e estimativa chegam; não é incompleta; o texto não vai", () => {
    const t = tarefaDaIssue(daLeva(10));
    expect(t).toMatchObject({ chefe: "backend", ajudantes: "tester (conferir)", estimativaHoras: 4 });
    expect("incompleta" in t).toBe(false);
    expect(JSON.stringify(t)).not.toContain("MARCADOR_DO_CORPO_536");
  });

  it("linha faltando: incompleta diz qual", () => {
    expect(tarefaDaIssue(daLeva(10, {}, { ajudantes: null })).incompleta).toEqual(["falta a linha Ajudantes"]);
  });

  it("Chefe: diferente da etiqueta chefe: é incompleta", () => {
    expect(tarefaDaIssue(daLeva(10, {}, { chefe: "frontend" })).incompleta).toEqual(["a linha Chefe e a etiqueta chefe: não dizem o mesmo"]);
  });

  it("sem a etiqueta chefe: é incompleta (a conferência vale mesmo sem etiqueta)", () => {
    const t = tarefaDaIssue(daLeva(10, { labels: { nodes: [{ name: "leva-1" }] } }));
    expect(t.incompleta).toEqual(["a linha Chefe e a etiqueta chefe: não dizem o mesmo"]);
    expect(tarefaDaIssue(daLeva(10, { labels: null })).incompleta).toEqual(["a linha Chefe e a etiqueta chefe: não dizem o mesmo"]);
  });

  it("tarefa FEITA com cabeçalho ruim nunca vem incompleta", () => {
    for (const extra of [{ state: "CLOSED" as const }, { state: "CLOSED" as const, body: null }, { state: "CLOSED" as const, labels: null }]) {
      const t = tarefaDaIssue(daLeva(10, extra, { chefe: null, depende: "isso não" }));
      expect(t.estado).toBe("feita");
      expect("incompleta" in t).toBe(false);
    }
  });
});

describe("prioridade no cartão (#776)", () => {
  const comPrioridade = (n: number, linha: string) => {
    const i = daLeva(n);
    return { ...i, body: i.body!.replace("\n\n## Pra que serve", `\n${linha}\n\n## Pra que serve`) };
  };

  it("Prioridade: 2 chega na tarefa, e ela continua completa", () => {
    const t = tarefaDaIssue(comPrioridade(10, "Prioridade: 2"));
    expect(t.prioridade).toBe(2);
    expect("incompleta" in t).toBe(false);
  });

  it("sem a linha, ou escrita errada: sem prioridade e NÃO incompleta", () => {
    for (const t of [tarefaDaIssue(daLeva(10)), tarefaDaIssue(comPrioridade(10, "Prioridade: alta"))]) {
      expect("prioridade" in t).toBe(false);
      expect("incompleta" in t).toBe(false);
    }
  });

  it("projeto secundário também leva a prioridade", () => {
    const t = tarefaDaIssue(comPrioridade(10, "Prioridade: 1"), "ar-condicionado");
    expect(t).toMatchObject({ prioridade: 1, repositorio: "ar-condicionado" });
  });
});

describe("consultaDasDependencias (#536): só inteiros validados entram no texto", () => {
  it("monta um apelido d<N> por número, dentro de repository(owner:$dono, name:$nome)", () => {
    const q = consultaDasDependencias([7, 12]);
    expect(q).toContain("repository(owner: $dono, name: $nome)");
    expect(q).toContain("d7: issue(number: 7) { state stateReason }");
    expect(q).toContain("d12: issue(number: 12) { state stateReason }");
  });

  it("o que não é inteiro válido nunca entra (mesmo forçado direto na função)", () => {
    const sujos = [Number.NaN, 0, -4, 1.5, 1e3 + 0.5, 99999999999, Infinity, "1) { x } query { y" as unknown as number, "12abc" as unknown as number];
    const q = consultaDasDependencias([...sujos, 5]);
    expect(q.match(/issue\(number:/g)).toHaveLength(1);
    for (const ruim of ["{ x }", "query { y", "12abc", "-4", "99999999999", "NaN", "Infinity", "1.5"]) expect(q).not.toContain(ruim);
  });

  it("sem repetidos e no máximo 50", () => {
    const muitos = Array.from({ length: 80 }, (_, i) => i + 1);
    const q = consultaDasDependencias([3, 3, 3, ...muitos]);
    expect(q.match(/issue\(number:/g)).toHaveLength(MAXIMO_DE_DEPENDENCIAS);
    expect(q.match(/d3: /g)).toHaveLength(1);
  });

  it("texto malicioso no Depende de nunca chega na consulta montada pela leva", async () => {
    let consultas: string[] = [];
    const perguntar: PerguntarAoGitHub = async (q) => {
      consultas.push(q);
      return { tipo: "ok", dados: { repository: {} } };
    };
    for (const ruim of ["#1) { x } query { y", "#12abc", "#-4", "#1e3", "#99999999999", "#0"]) {
      consultas = [];
      // O item estranho deixa a tarefa incompleta: nem consulta. E junto de um número bom, o ruim nunca aparece.
      const dados = leva(daLeva(10, {}, { depende: `${ruim}, #77` }));
      const r = await marcarDependenciasAbertas(levaDosDados(1, dados)!, dados, perguntar);
      for (const q of consultas) {
        expect(q).not.toContain(ruim.slice(1));
        expect(q).not.toMatch(/\{ x \}|query \{ y|12abc|-4|1e3|99999999999|d0:/);
      }
      expect(consultas.join("")).not.toContain("d77");
      expect(r.tarefas[0].incompleta).toBeDefined();
    }
  });
});

describe("Depende de (#536): dentro e fora da leva", () => {
  const respondendo = (estados: Record<string, { state?: string; stateReason?: string } | null>) => {
    const consultas: string[] = [];
    const perguntar: PerguntarAoGitHub = async (q) => {
      consultas.push(q);
      return { tipo: "ok", dados: { repository: estados } };
    };
    return { perguntar, consultas };
  };
  const rodar = async (dados: DadosDaLeva, perguntar: PerguntarAoGitHub) => marcarDependenciasAbertas(levaDosDados(1, dados)!, dados, perguntar);
  const tarefa = (r: RespostaDaLeva, n: number) => r.tarefas.find((t) => t.numero === n)!;

  it("dentro da leva: a fechada está resolvida, a aberta conta; e não pergunta nada ao GitHub", async () => {
    const g = respondendo({});
    const dados = leva(daLeva(1, { state: "CLOSED", stateReason: "COMPLETED" }), daLeva(2), daLeva(3, {}, { depende: "#1, #2" }));
    const r = await rodar(dados, g.perguntar);
    expect(tarefa(r, 3).dependeDeAbertas).toEqual([2]);
    expect(g.consultas).toEqual([]);
  });

  it("fora da leva: FECHADA resolvida; ABERTA e inexistente (null) contam; uma consulta só", async () => {
    const g = respondendo({ d500: { state: "CLOSED", stateReason: "COMPLETED" }, d501: { state: "OPEN" }, d502: null });
    const dados = leva(daLeva(1, {}, { depende: "#500, #501, #502, #503" }), daLeva(2, {}, { depende: "#500, #501" }));
    const r = await rodar(dados, g.perguntar);
    // #503 nem veio na resposta: conta como aberto.
    expect(tarefa(r, 1).dependeDeAbertas).toEqual([501, 502, 503]);
    expect(tarefa(r, 2).dependeDeAbertas).toEqual([501]);
    expect(g.consultas).toHaveLength(1);
    expect(g.consultas[0].match(/issue\(number:/g)).toHaveLength(4);
  });

  it("fechada como não planejada, duplicada ou sem motivo NÃO libera, dentro e fora da leva (Sofia, 17/10)", async () => {
    const g = respondendo({ d500: { state: "CLOSED", stateReason: "NOT_PLANNED" }, d501: { state: "CLOSED", stateReason: "DUPLICATE" }, d502: { state: "CLOSED" } });
    const dados = leva(
      daLeva(1, { state: "CLOSED", stateReason: "NOT_PLANNED" }),
      daLeva(2, { state: "CLOSED", stateReason: "COMPLETED" }),
      daLeva(3, {}, { depende: "#1, #2, #500, #501, #502" }),
    );
    const r = await rodar(dados, g.perguntar);
    expect(tarefa(r, 3).dependeDeAbertas).toEqual([1, 500, 501, 502]);
  });

  it("tudo fechado: o campo nem aparece", async () => {
    const r = await rodar(leva(daLeva(1, {}, { depende: "#500" })), respondendo({ d500: { state: "CLOSED", stateReason: "COMPLETED" } }).perguntar);
    expect("dependeDeAbertas" in tarefa(r, 1)).toBe(false);
  });

  it("a consulta falha (erro, sem acesso, exceção): os de fora contam como abertos e a leva sai normal", async () => {
    const falhas: PerguntarAoGitHub[] = [
      async () => ({ tipo: "erro" }),
      async () => ({ tipo: "sem-acesso" }),
      async () => {
        throw new TypeError("fetch failed");
      },
      async () => ({ tipo: "ok", dados: { repository: null } }),
    ];
    for (const perguntar of falhas) {
      const dados = leva(daLeva(1, { state: "CLOSED", stateReason: "COMPLETED" }), daLeva(2, {}, { depende: "#1, #500" }));
      const r = await rodar(dados, perguntar);
      expect(r.tarefas).toHaveLength(2);
      expect(tarefa(r, 2).dependeDeAbertas).toEqual([500]);
    }
  });

  it("a consulta volta com erro ou sem acesso: fica registrado (senão todo botão desligaria sem rastro)", async () => {
    const espiao = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      for (const tipo of ["erro", "sem-acesso"] as const) {
        espiao.mockClear();
        await rodar(leva(daLeva(2, {}, { depende: "#500" })), async () => ({ tipo }));
        expect(espiao).toHaveBeenCalledTimes(1);
        expect(String(espiao.mock.calls[0][0])).toContain(tipo);
      }
    } finally {
      espiao.mockRestore();
    }
  });

  it("sem nenhum número de fora: nem consulta", async () => {
    const g = respondendo({});
    await rodar(leva(daLeva(1), daLeva(2, {}, { depende: "nada" })), g.perguntar);
    expect(g.consultas).toEqual([]);
  });

  it("tarefa feita ou incompleta não ganha dependeDeAbertas e não gera consulta", async () => {
    const g = respondendo({});
    const dados = leva(daLeva(1, { state: "CLOSED", stateReason: "COMPLETED" }, { depende: "#500" }), daLeva(2, {}, { depende: "#501", chefe: "frontend" }));
    const r = await rodar(dados, g.perguntar);
    expect("dependeDeAbertas" in tarefa(r, 1)).toBe(false);
    expect("dependeDeAbertas" in tarefa(r, 2)).toBe(false);
    expect(g.consultas).toEqual([]);
  });

  it("depender de si mesma é ignorado (não trava o botão pra sempre)", async () => {
    const g = respondendo({});
    const r = await rodar(leva(daLeva(7, {}, { depende: "#7" })), g.perguntar);
    expect("dependeDeAbertas" in tarefa(r, 7)).toBe(false);
    expect(g.consultas).toEqual([]);
  });

  it("mais de 50 números de fora: consulta só 50, os que sobram contam como abertos", async () => {
    const numeros = Array.from({ length: 60 }, (_, i) => 1000 + i);
    const tudoFechado = Object.fromEntries(numeros.map((n) => [`d${n}`, { state: "CLOSED", stateReason: "COMPLETED" }]));
    const g = respondendo(tudoFechado);
    const r = await rodar(leva(daLeva(1, {}, { depende: numeros.map((n) => `#${n}`).join(", ") })), g.perguntar);
    expect(g.consultas[0].match(/issue\(number:/g)).toHaveLength(50);
    expect(tarefa(r, 1).dependeDeAbertas).toEqual(numeros.slice(50));
  });
});

describe("as funções pequenas do Depende de (#536)", () => {
  it("dependenciasDaLeva: só tarefas abertas e completas, sem si mesma", () => {
    const dados = leva(daLeva(1, {}, { depende: "#1, #2" }), daLeva(2, { state: "CLOSED", stateReason: "COMPLETED" }, { depende: "#3" }), daLeva(3, {}, { ajudantes: null, depende: "#4" }), daLeva(4));
    expect([...dependenciasDaLeva(dados)]).toEqual([[1, [2]]]);
  });
  it("estadosDaLeva e numerosDeFora: sem repetir e sem os da leva", () => {
    const naLeva = estadosDaLeva(leva(daLeva(1, { state: "CLOSED", stateReason: "COMPLETED" }), daLeva(2)));
    expect([...naLeva]).toEqual([[1, true], [2, false]]);
    expect(numerosDeFora(new Map([[2, [1, 9, 9]], [5, [9, 8]]]), naLeva)).toEqual([9, 8]);
  });
  it("fechadasDaResposta: só CLOSED como COMPLETED conta; null, sem state, outro valor ou outro motivo não", () => {
    const r = fechadasDaResposta([1, 2, 3, 4], { repository: { d1: { state: "CLOSED", stateReason: "COMPLETED" }, d2: { state: "OPEN" }, d3: null, d4: {} } });
    expect([...r]).toEqual([1]);
    expect([...fechadasDaResposta([1], null)]).toEqual([]);
    expect([...fechadasDaResposta([1], { repository: { d1: { state: "CLOSED", stateReason: "NOT_PLANNED" } } })]).toEqual([]);
  });
});
