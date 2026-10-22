import { describe, expect, it } from "vitest";
import {
  consultaDasTarefasDaPessoa,
  levaAtualDoProjeto,
  projetoDoCaminho,
  projetosDosDados,
  propostasDosDados,
  repositorioValido,
  tarefasSeguradasDosDados,
  type DadosDasPropostas,
  type DadosDosProjetos,
  type EtiquetasDasLevas,
  type RepositorioDoGitHub,
} from "./projetos";

function repo(name: string, e: { topicos?: string[]; arquivado?: boolean; levas?: [string, number, number?][]; descricao?: string | null } = {}): RepositorioDoGitHub & { labels: EtiquetasDasLevas } {
  return {
    name,
    description: e.descricao === undefined ? `O ${name}` : e.descricao,
    url: `https://github.com/sakura-corp/${name}`,
    isArchived: e.arquivado ?? false,
    repositoryTopics: { nodes: (e.topicos ?? ["projeto-secundario"]).map((t) => ({ topic: { name: t } })) },
    labels: { nodes: (e.levas ?? []).map(([n, abertas, fechadas]) => ({ name: n, issues: { totalCount: abertas }, fechadas: { totalCount: fechadas ?? 0 } })) },
  };
}
const dados = (nodes: (RepositorioDoGitHub | null)[], totalCount = nodes.length): DadosDosProjetos => ({ organization: { repositories: { totalCount, nodes } } });
/** Os projetos com as levas que cada repositório fingido traz (a segunda consulta, já respondida). */
const pd = (d: DadosDosProjetos) => {
  const mapa = new Map<string, EtiquetasDasLevas>();
  for (const r of d.organization?.repositories?.nodes ?? []) if (r && "labels" in r) mapa.set(r.name, (r as { labels: EtiquetasDasLevas }).labels);
  return projetosDosDados(d, mapa);
};

describe("repositorioValido (#731)", () => {
  it.each(["ar-condicionado", "site.da_loja", "A1"])("aceita %s", (n) => expect(repositorioValido(n)).toBe(true));
  it.each(["", ".", "..", "a/b", "a b", 'a"b', "x".repeat(101), 3, null, "ação"])("recusa %s", (n) => expect(repositorioValido(n)).toBe(false));
});

describe("projetosDosDados (#731)", () => {
  it("só os repositórios com o tópico, sem o SSACE, o secundarios, os arquivados e os de nome estranho", () => {
    const r = pd(
      dados([
        repo("ar-condicionado", { levas: [["leva-1", 2], ["leva-2", 1]] }),
        repo("sem-topico", { topicos: ["outro"] }),
        repo("velho", { arquivado: true }),
        repo("sakura-system-ace"),
        repo("secundarios"),
        null,
        repo("site-da-loja"),
      ]),
    );
    expect(r.projetos.map((p) => p.repositorio)).toEqual(["ar-condicionado", "site-da-loja"]);
    expect(r.cortada).toBeUndefined();
  });

  it("leva atual = a menor leva-N com tarefa aberta; nenhuma aberta = null", () => {
    const r = pd(
      dados([
        repo("a", { levas: [["leva-3", 4], ["leva-1", 0, 5], ["leva-2", 1], ["leva-x", 9]] }),
        repo("b", { levas: [["leva-1", 0, 3]] }),
      ]),
    );
    expect(r.projetos[0].levas.map((l) => l.numero)).toEqual([1, 2, 3]);
    expect(r.projetos[0].atual).toBe(2);
    expect(r.projetos[1].atual).toBeNull();
  });

  it("organização que não veio (sem acesso) = nenhum projeto; mais repositórios do que os olhados = cortada", () => {
    expect(pd({ organization: null })).toEqual({ projetos: [] });
    expect(pd({} as DadosDosProjetos)).toEqual({ projetos: [] });
    expect(pd(dados([repo("a")], 150)).cortada).toBe(true);
  });

  it("link só da sakura-corp; descrição vazia some", () => {
    const outro = { ...repo("a", { descricao: "" }), url: "https://malicioso.exemplo/a" };
    const [p] = pd(dados([outro])).projetos;
    expect(p.url).toBe("https://github.com/sakura-corp/a");
    expect(p.descricao).toBeUndefined();
    expect(p.nome).toBe("a");
  });
});

describe("levaAtualDoProjeto (#731)", () => {
  it("a menor com aberta", () => {
    expect(levaAtualDoProjeto([{ numero: 1, nome: "", abertas: 0 }, { numero: 2, nome: "", abertas: 3 }, { numero: 3, nome: "", abertas: 1 }])).toBe(2);
    expect(levaAtualDoProjeto([])).toBeNull();
  });
});

describe("projetoDoCaminho (#731)", () => {
  it("lê o repositório e o que vem depois", () => {
    expect(projetoDoCaminho("/api/projetos/ar-condicionado/leva")).toEqual({ repositorio: "ar-condicionado", resto: "leva" });
    expect(projetoDoCaminho("/api/projetos/ar/tarefa/12/pegar")).toEqual({ repositorio: "ar", resto: "tarefa/12/pegar" });
    expect(projetoDoCaminho("/api/projetos")).toBeNull();
    expect(projetoDoCaminho("/api/projetos/a%2Fb/leva")).toBeNull();
    expect(projetoDoCaminho("/api/projetos/../leva")).toBeNull();
  });
});

describe("propostasDosDados (#731)", () => {
  const issue = (number: number, etiquetas: string[], e: { state?: "OPEN" | "CLOSED"; url?: string } = {}) => ({
    number,
    title: `Proposta ${number}`,
    url: e.url ?? `https://github.com/sakura-corp/secundarios/issues/${number}`,
    state: e.state ?? "OPEN",
    updatedAt: `2026-10-${10 + number}T12:00:00Z`,
    labels: { nodes: ["proposta", ...etiquetas].map((name) => ({ name })) },
  });

  it("o estado sai da etiqueta proposta:<estado>; nenhuma, desconhecida ou duas = null", () => {
    const d: DadosDasPropostas = {
      repository: {
        issues: {
          totalCount: 5,
          nodes: [
            issue(1, ["proposta:esperando-sofia"]),
            issue(2, ["proposta:aprovada"], { state: "CLOSED" }),
            issue(3, []),
            issue(4, ["proposta:inventada"]),
            issue(5, ["proposta:aprovada", "proposta:recusada"], { url: "https://malicioso.exemplo/5" }),
          ],
        },
      },
    };
    const r = propostasDosDados(d);
    expect(r.propostas.map((p) => [p.numero, p.estado, p.aberta])).toEqual([
      [1, "esperando-sofia", true],
      [2, "aprovada", false],
      [3, null, true],
      [4, null, true],
      [5, null, true],
    ]);
    expect(r.propostas[4].url).toBe("https://github.com/sakura-corp/secundarios/issues/5");
    expect(r.semAcesso).toBeUndefined();
  });

  it("sem o repositório (não existe ou o login não lê): lista vazia com semAcesso, sem quebrar", () => {
    expect(propostasDosDados({ repository: null })).toEqual({ propostas: [], semAcesso: true });
  });

  it("mais propostas do que as olhadas = cortada", () => {
    expect(propostasDosDados({ repository: { issues: { totalCount: 80, nodes: [issue(1, [])] } } }).cortada).toBe(true);
  });
});

describe("as tarefas que a pessoa segura em vários repositórios (#731)", () => {
  it("a consulta só leva nomes válidos, cada um num apelido", () => {
    const c = consultaDasTarefasDaPessoa(["sakura-system-ace", "ar-condicionado", 'x") { a } #', "a/b"]);
    expect(c).toContain('r0: repository(owner: $dono, name: "sakura-system-ace")');
    expect(c).toContain('r1: repository(owner: $dono, name: "ar-condicionado")');
    expect(c).not.toContain("r2:");
    expect(c).not.toContain("a/b");
  });

  it("conta só aberta, de leva, sem PR aberto (em andamento); repositório sem acesso não quebra", () => {
    const no = (number: number, labels: string[], pr?: "OPEN" | "MERGED") => ({
      number,
      labels: { nodes: labels.map((name) => ({ name })) },
      closedByPullRequestsReferences: { nodes: pr ? [{ state: pr }] : [] },
    });
    const r = tarefasSeguradasDosDados(["sakura-system-ace", "ar", "sem-acesso"], {
      r0: { issues: { totalCount: 3, nodes: [no(10, ["leva-4"]), no(11, ["leva-4"], "OPEN"), no(12, ["bug"])] } },
      r1: { issues: { totalCount: 2, nodes: [no(3, ["leva-1"], "MERGED"), null] } },
      r2: null,
    });
    expect(r).toEqual([
      { repositorio: "sakura-system-ace", numero: 10 },
      { repositorio: "ar", numero: 3 },
    ]);
  });

  it("mais issues no nome da pessoa do que as olhadas: null (a regra não sabe, e quem chama recusa)", () => {
    expect(tarefasSeguradasDosDados(["ar"], { r0: { issues: { totalCount: 51, nodes: [] } } })).toBeNull();
  });
});
