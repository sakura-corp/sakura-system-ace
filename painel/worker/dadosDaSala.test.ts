import { afterEach, describe, expect, it, vi } from "vitest";
import { montarSala } from "../src/logica/sala";
import {
  arquivoDoTrabalho, buscarSala, CONSULTA_DOS_ROBOS, maisNovaDeCada, pessoasDasTarefas, robosDoClaudeDosDados, roboDaCasa,
  type DadosDosRobos, type RodadaDoGitHub,
} from "./dadosDaSala";
import type { Tarefa } from "../src/tipos";

const REPO = "https://github.com/sakura-corp/sakura-system-ace";
const AGORA = new Date("2026-10-17T12:00:00Z");
const ha = (min: number) => new Date(AGORA.getTime() - min * 60_000).toISOString();

describe("robôs do Claude", () => {
  const dados = (nos: DadosDosRobos["repository"] extends infer R ? R extends { refs: { nodes: infer N } | null } ? N : never : never): DadosDosRobos => ({ repository: { refs: { nodes: nos } } });

  it("a consulta olha só os branches claude/ e pede o PR aberto, com as revisões pedidas", () => {
    expect(CONSULTA_DOS_ROBOS).toContain('refPrefix: "refs/heads/claude/"');
    expect(CONSULTA_DOS_ROBOS).toContain("states: OPEN");
    expect(CONSULTA_DOS_ROBOS).toContain("reviewRequests");
  });

  it("um branch sem PR: nome, branch, data do último commit e link pro branch", () => {
    const [e] = robosDoClaudeDosDados(dados([{ name: "painel-sala", target: { committedDate: ha(10) }, associatedPullRequests: { nodes: [] } }]))!;
    expect(e).toMatchObject({ id: "claude:claude/painel-sala", tipo: "claude", nome: "painel-sala", fazendo: "claude/painel-sala", ultimaAtividade: ha(10), sinais: {}, url: `${REPO}/tree/claude/painel-sala` });
  });

  it("com PR aberto: mostra o PR, leva ao PR e anota quem foi chamado pra revisar", () => {
    const [e] = robosDoClaudeDosDados(dados([{
      name: "tarefa-1", target: { committedDate: ha(200) },
      associatedPullRequests: { nodes: [{ number: 12, title: "Clientes que sumiram", url: `${REPO}/pull/12`, reviewRequests: { nodes: [{ requestedReviewer: { login: "caranovavidanova" } }, { requestedReviewer: {} }, null] } }] },
    }]))!;
    expect(e).toMatchObject({ fazendo: "#12 Clientes que sumiram", url: `${REPO}/pull/12`, sinais: { revisaoPedidaA: ["caranovavidanova"] } });
    // e quem foi chamado vê "precisa de você"; outra pessoa não
    expect(montarSala([e], AGORA, "caranovavidanova")[0].estado).toBe("precisa");
    expect(montarSala([e], AGORA, "outra-pessoa")[0].estado).toBe("livre");
  });

  it("link de PR de fora do GitHub da Sakura não passa: cai pro branch", () => {
    const [e] = robosDoClaudeDosDados(dados([{ name: "x", target: null, associatedPullRequests: { nodes: [{ number: 1, title: "t", url: "https://exemplo.com/pr", reviewRequests: null }] } }]))!;
    expect(e.url).toBe(`${REPO}/tree/claude/x`);
  });

  it("nenhum branch é uma sala de verdade vazia; resposta sem `refs` é falha (null)", () => {
    expect(robosDoClaudeDosDados(dados([]))).toEqual([]);
    expect(robosDoClaudeDosDados({ repository: null })).toBeNull();
    expect(robosDoClaudeDosDados({ repository: { refs: null } })).toBeNull();
  });

  it("mais de 100 branches (lista incompleta) é falha do grupo, não sala pela metade", () => {
    const d = dados([{ name: "a", target: null, associatedPullRequests: { nodes: [] } }]);
    d.repository!.refs!.pageInfo = { hasNextPage: true };
    expect(robosDoClaudeDosDados(d)).toBeNull();
  });

  it("commit de agora trabalha, de 4 dias dorme (as regras são as de sala.ts)", () => {
    const e = robosDoClaudeDosDados(dados([
      { name: "novo", target: { committedDate: ha(5) }, associatedPullRequests: { nodes: [] } },
      { name: "velho", target: { committedDate: ha(4 * 24 * 60) }, associatedPullRequests: { nodes: [] } },
    ]))!;
    expect(montarSala(e, AGORA, "x").map((b) => [b.nome, b.estado])).toEqual([["novo", "trabalhando"], ["velho", "dormindo"]]);
  });
});

describe("robôs da casa", () => {
  const rodada = (id: number, path: string, status: string, conclusion: string | null, min = 5): RodadaDoGitHub => ({
    id, path, status, conclusion, html_url: `${REPO}/actions/runs/${id}`, display_title: "Meu PR", updated_at: ha(min),
  });

  it("o arquivo do trabalho sai do caminho, com ou sem '@ref'", () => {
    expect(arquivoDoTrabalho(".github/workflows/ci.yml")).toBe("ci.yml");
    expect(arquivoDoTrabalho(".github/workflows/ci.yml@refs/heads/main")).toBe("ci.yml");
    expect(arquivoDoTrabalho("dynamic/pages-build")).toBeNull();
    expect(arquivoDoTrabalho(undefined)).toBeNull();
  });

  it("fica a rodada mais nova de cada trabalho", () => {
    const m = maisNovaDeCada([rodada(1, ".github/workflows/ci.yml", "completed", "failure", 90), rodada(2, ".github/workflows/ci.yml", "completed", "success", 10)]);
    expect(m.get("ci.yml")?.id).toBe(2);
  });

  it("conferência vermelha = robô com erro; verde = livre; rodando = trabalhando", () => {
    const estado = (r: RodadaDoGitHub) => montarSala([roboDaCasa("ci.yml", r, false, "x")], AGORA, "x")[0].estado;
    expect(estado(rodada(1, "ci.yml", "completed", "failure"))).toBe("erro");
    expect(estado(rodada(1, "ci.yml", "completed", "timed_out"))).toBe("erro");
    expect(estado(rodada(1, "ci.yml", "completed", "success"))).toBe("livre");
    expect(estado(rodada(1, "ci.yml", "in_progress", null))).toBe("trabalhando");
    expect(estado(rodada(1, "ci.yml", "completed", "cancelled"))).toBe("livre");
  });

  it("rodada esperando aprovação: 'precisa de você' só pra quem pode aprovar, e o link abre a própria rodada", () => {
    const espera = rodada(77, ".github/workflows/liberar-versao.yml", "waiting", null);
    const pode = roboDaCasa("liberar-versao.yml", espera, true, "caranovavidanova");
    const nao = roboDaCasa("liberar-versao.yml", espera, false, "caranovavidanova");
    expect(pode.url).toBe(`${REPO}/actions/runs/77`);
    expect(montarSala([pode], AGORA, "caranovavidanova")[0].estado).toBe("precisa");
    expect(montarSala([nao], AGORA, "caranovavidanova")[0].estado).toBe("trabalhando");
  });

  it("sem rodada recente: livre e diz isso, sem fingir que deu certo", () => {
    const e = roboDaCasa("backup-banco.yml", null, false, "x");
    expect(e).toMatchObject({ nome: "Cópia do banco", fazendo: "sem rodada recente" });
    expect(e.sinais).toEqual({});
  });
});

describe("pessoas", () => {
  const tarefa = (n: number, estado: Tarefa["estado"], login?: string): Tarefa => ({
    numero: n, titulo: `Tarefa ${n}`, url: `${REPO}/issues/${n}`, estado, ...(login ? { dono: { login, avatar: `https://avatars.githubusercontent.com/u/${n}` } } : {}),
  });

  it("uma pessoa por responsável, com a foto; em andamento ou revisão = trabalhando; só feitas = livre; sem dono não entra", () => {
    const e = pessoasDasTarefas([tarefa(1, "andamento", "ana"), tarefa(2, "revisao", "ana"), tarefa(3, "feita", "bruno"), tarefa(4, "livre")]);
    expect(e.map((p) => p.nome)).toEqual(["ana", "bruno"]);
    expect(e[0]).toMatchObject({ fazendo: "#1 Tarefa 1 (+1)", url: `${REPO}/issues/1`, avatar: "https://avatars.githubusercontent.com/u/1", sinais: { tarefaEmAndamento: true } });
    expect(e[1]).toMatchObject({ fazendo: "sem tarefa agora", sinais: { tarefaEmAndamento: false } });
  });
});

/** O GitHub de mentira: cada pedaço pode ser trocado por uma falha. */
function fingirGitHub(opcoes: {
  claude?: () => Response; levas?: () => Response; leva?: () => Response; rodadas?: () => Response;
  porTrabalho?: (arquivo: string) => Response; pendentes?: () => Response;
} = {}) {
  const chamadas: string[] = [];
  const nenhuma = () => Response.json({ workflow_runs: [] });
  vi.stubGlobal("fetch", async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada);
    chamadas.push(url);
    if (url === "https://api.github.com/graphql") {
      const { query } = JSON.parse(String(init?.body)) as { query: string };
      if (query.includes("query Robos")) return (opcoes.claude ?? (() => Response.json({ data: { repository: { refs: { nodes: [{ name: "a", target: { committedDate: ha(3) }, associatedPullRequests: { nodes: [] } }] } } } })))();
      if (query.includes("query Levas")) return (opcoes.levas ?? (() => Response.json({ data: { repository: { labels: { nodes: [{ name: "leva-0", issues: { totalCount: 1 } }] } } } })))();
      return (opcoes.leva ?? (() => Response.json({ data: { repository: { issues: { totalCount: 1, nodes: [{ number: 5, title: "T", url: `${REPO}/issues/5`, state: "OPEN", body: "", assignees: { nodes: [{ login: "ana", avatarUrl: "https://avatars.githubusercontent.com/u/5" }] }, closedByPullRequestsReferences: { nodes: [] } }] } } } })))();
    }
    if (url.includes("/actions/runs?per_page=100")) return (opcoes.rodadas ?? (() => Response.json({ workflow_runs: [{ id: 1, path: ".github/workflows/ci.yml", status: "completed", conclusion: "success", html_url: `${REPO}/actions/runs/1`, updated_at: ha(4) }] })))();
    const porTrabalho = /\/actions\/workflows\/([^/]+)\/runs/.exec(url);
    if (porTrabalho) return (opcoes.porTrabalho ?? nenhuma)(decodeURIComponent(porTrabalho[1]));
    if (url.endsWith("/pending_deployments")) return (opcoes.pendentes ?? (() => Response.json([{ current_user_can_approve: true }])))();
    return new Response("inesperado", { status: 500 });
  });
  return chamadas;
}

afterEach(() => vi.unstubAllGlobals());

async function sala() {
  const r = await buscarSala("ghu_a", "ana");
  if (r.tipo !== "ok") throw new Error(`esperava ok, veio ${r.tipo}`);
  return r.sala;
}

describe("buscarSala", () => {
  it("junta as três buscas; os 6 robôs da casa sempre aparecem; a leva vem das pessoas", async () => {
    fingirGitHub();
    const s = await sala();
    expect(s.falhas).toEqual([]);
    expect(s.leva).toBe(0);
    expect(s.entradas.filter((e) => e.tipo === "pessoa").map((e) => e.nome)).toEqual(["ana"]);
    expect(s.entradas.filter((e) => e.tipo === "claude").map((e) => e.nome)).toEqual(["a"]);
    expect(s.entradas.filter((e) => e.tipo === "casa").map((e) => e.nome)).toEqual(["Conferência", "Publicar", "Liberar", "Atualizar bancos", "Cópia do banco", "Aviso do Electron"]);
  });

  it("um trabalho fora das últimas 100 rodadas é buscado sozinho (não vira 'livre' escondendo erro)", async () => {
    const chamadas = fingirGitHub({
      porTrabalho: (a) => a === "backup-banco.yml"
        ? Response.json({ workflow_runs: [{ id: 9, status: "completed", conclusion: "failure", html_url: `${REPO}/actions/runs/9`, updated_at: ha(2000) }] })
        : Response.json({ workflow_runs: [] }),
    });
    const s = await sala();
    const backup = s.entradas.find((e) => e.id === "casa:backup-banco.yml");
    expect(backup?.sinais.ultimaRodada).toBe("falhou");
    expect(chamadas.some((c) => c.includes("/workflows/backup-banco.yml/runs"))).toBe(true);
    expect(chamadas.some((c) => c.includes("/workflows/ci.yml/runs"))).toBe(false);
  });

  it("rodada esperando: pergunta se quem olha pode aprovar", async () => {
    const waiting = () => Response.json({ workflow_runs: [{ id: 8, path: ".github/workflows/liberar-versao.yml", status: "waiting", conclusion: null, html_url: `${REPO}/actions/runs/8`, updated_at: ha(1) }] });
    const chamadas = fingirGitHub({ rodadas: waiting, pendentes: () => Response.json([{ current_user_can_approve: true }]) });
    let s = await sala();
    expect(chamadas.some((c) => c.endsWith("/actions/runs/8/pending_deployments"))).toBe(true);
    expect(s.entradas.find((e) => e.id === "casa:liberar-versao.yml")?.sinais.aprovacaoEsperadaDe).toEqual(["ana"]);
    vi.unstubAllGlobals();
    fingirGitHub({ rodadas: waiting, pendentes: () => Response.json([{ current_user_can_approve: false }]) });
    s = await sala();
    expect(s.entradas.find((e) => e.id === "casa:liberar-versao.yml")?.sinais.aprovacaoEsperadaDe).toBeUndefined();
  });

  it("se não deu pra saber quem aprova, os robôs da casa falham (não chuta)", async () => {
    fingirGitHub({
      rodadas: () => Response.json({ workflow_runs: [{ id: 8, path: ".github/workflows/liberar-versao.yml", status: "waiting", conclusion: null, html_url: `${REPO}/actions/runs/8` }] }),
      pendentes: () => new Response("x", { status: 403 }),
    });
    expect((await sala()).falhas).toEqual(["casa"]);
  });

  it("cada busca que falha derruba só o próprio grupo, e a resposta diz qual", async () => {
    fingirGitHub({ claude: () => new Response("x", { status: 502 }) });
    let s = await sala();
    expect(s.falhas).toEqual(["claude"]);
    expect(s.entradas.some((e) => e.tipo === "claude")).toBe(false);
    expect(s.entradas.some((e) => e.tipo === "casa")).toBe(true);

    vi.unstubAllGlobals();
    fingirGitHub({ rodadas: () => new Response("x", { status: 500 }) });
    s = await sala();
    expect(s.falhas).toEqual(["casa"]);
    expect(s.entradas.some((e) => e.tipo === "casa")).toBe(false);

    vi.unstubAllGlobals();
    fingirGitHub({ leva: () => new Response("x", { status: 500 }) });
    s = await sala();
    expect(s.falhas).toEqual(["pessoa"]);
    expect(s.leva).toBeNull();

    vi.unstubAllGlobals();
    fingirGitHub({ levas: () => Response.json({ errors: [{ message: "x" }] }) });
    expect((await sala()).falhas).toEqual(["pessoa"]);
  });

  it("rede que lança exceção também só derruba o grupo", async () => {
    const original = fingirGitHub();
    void original;
    const base = globalThis.fetch;
    vi.stubGlobal("fetch", async (entrada: RequestInfo | URL, init?: RequestInit) => {
      if (String(entrada).includes("/actions/")) throw new TypeError("rede");
      return base(entrada, init);
    });
    expect((await sala()).falhas).toEqual(["casa"]);
  });

  it("as três falhando = erro (nada de verdade pra mostrar); 401 do GitHub = sem acesso", async () => {
    fingirGitHub({ claude: () => new Response("x", { status: 500 }), rodadas: () => new Response("x", { status: 500 }), levas: () => new Response("x", { status: 500 }) });
    expect((await buscarSala("ghu_a", "ana")).tipo).toBe("erro");
    vi.unstubAllGlobals();
    fingirGitHub({ claude: () => new Response("x", { status: 401 }) });
    expect((await buscarSala("ghu_a", "ana")).tipo).toBe("sem-acesso");
    vi.unstubAllGlobals();
    fingirGitHub({ rodadas: () => new Response("x", { status: 401 }) });
    expect((await buscarSala("ghu_a", "ana")).tipo).toBe("sem-acesso");
  });
});
