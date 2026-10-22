import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RespostaDoMeuProgresso, TarefaEntregue } from "../tipos";
import {
  carregarMeuProgresso,
  CartaoDoMeuProgresso,
  ConteudoDoMeuProgresso,
  PaginaMeuProgresso,
  pessoaDaBusca,
  respostaValida,
  seriesDoGrafico,
  topoDoEixo,
  type EstadoDoMeuProgresso,
} from "./PaginaMeuProgresso";

// Quarta, 22/10/2026, 15h em São Paulo.
const AGORA = new Date("2026-10-22T18:00:00Z");
const SSACE = "sakura-system-ace";
const tarefa = (numero: number, extra: Partial<TarefaEntregue> = {}): TarefaEntregue => ({
  repositorio: SSACE, numero, titulo: `Tarefa ${numero}`, url: `https://github.com/sakura-corp/${SSACE}/issues/${numero}`, feitaEm: "2026-10-20T15:00:00Z", estimativaHoras: 3, chefe: "frontend", ...extra,
});
const resposta = (extra: Partial<RespostaDoMeuProgresso> = {}): RespostaDoMeuProgresso => ({
  login: "fulana",
  tarefas: [tarefa(1), tarefa(2, { repositorio: "ar", estimativaHoras: 1.5 }), tarefa(3, { estimativaHoras: undefined }), tarefa(4, { feitaEm: "2026-10-13T15:00:00Z" })],
  prs: [{ repositorio: SSACE, numero: 9, mescladoEm: "2026-10-21T15:00:00Z" }],
  ...extra,
});
const pronto = (r = resposta()): EstadoDoMeuProgresso => ({ tipo: "pronto", resposta: r });
const limpar = (h: string) => h.replace(/<!-- -->/g, "");
const conteudo = (estado: EstadoDoMeuProgresso) => limpar(renderToString(<ConteudoDoMeuProgresso estado={estado} agora={AGORA} tentarDeNovo={() => {}} />));
const pagina = (props: Parameters<typeof PaginaMeuProgresso>[0]) => limpar(renderToString(<PaginaMeuProgresso agora={AGORA} {...props} />));
const contar = (h: string, t: string) => h.split(t).length - 1;

describe("ConteudoDoMeuProgresso (#734)", () => {
  it("os totais: horas de todos os projetos, tarefas, PRs e a sequência; tarefa sem estimativa aparece como 'N sem estimativa'", () => {
    const h = conteudo(pronto());
    expect(h).toContain("7,5 h"); // 3 + 1,5 + 3 (a sem estimativa não conta)
    expect(h).toContain("1 sem estimativa");
    expect(h).toContain("2 semanas");
    expect(h).toContain("Tarefas feitas");
    expect(h).toContain("PRs mesclados");
  });

  it("sem tarefa sem estimativa, a frase não aparece", () => {
    expect(conteudo(pronto(resposta({ tarefas: [tarefa(1)] })))).not.toContain("sem estimativa");
  });

  it("o gráfico: 12 colunas, legenda com os projetos (SSACE primeiro) e a tabela", () => {
    const h = conteudo(pronto());
    expect(contar(h, "data-semana=")).toBe(12);
    expect(h).toContain('aria-label="Legenda"');
    expect(h.indexOf(">SSACE<")).toBeLessThan(h.indexOf(">ar<"));
    expect(h).toContain("Ver em tabela");
    // A leitura da semana atual: as horas por projeto, as tarefas e os PRs.
    expect(h).toContain("Semana de 19/10: 4,5 h (SSACE 3 h, ar 1,5 h) · 3 tarefas · 1 PR");
  });

  it("um projeto só: sem caixa de legenda", () => {
    expect(conteudo(pronto(resposta({ tarefas: [tarefa(1)] })))).not.toContain('aria-label="Legenda"');
  });

  it("recusado: diz que cada um vê só o seu, sem número nenhum", () => {
    const h = conteudo({ tipo: "recusado" });
    expect(h).toContain("Cada pessoa vê só o próprio progresso");
    expect(h).not.toContain("Horas entregues");
  });

  it("erro: a mensagem e o 'Tentar de novo'", () => {
    const h = conteudo({ tipo: "erro", mensagem: "Falhou." });
    expect(h).toContain("Falhou.");
    expect(h).toContain("Tentar de novo");
  });

  it("o título da tarefa é texto", () => {
    const h = conteudo(pronto(resposta({ tarefas: [tarefa(1, { titulo: "<script>x</script>", pegouEm: "2026-10-18T12:00:00Z", prAbertoEm: "2026-10-19T12:00:00Z" })] })));
    expect(h).not.toContain("<script>");
    expect(h).toContain("Estimativa 3 h · Real 24 h");
  });
});

describe("uma pessoa por vez, sem lado a lado (#734)", () => {
  it("a página mostra os números de uma pessoa só, uma vez", () => {
    const h = pagina({ login: "sofia", busca: "?pessoa=tiago", estado: pronto(resposta({ login: "tiago", pessoas: ["fulana", "sofia", "tiago"] })) });
    expect(contar(h, ">Horas entregues<")).toBe(1);
    expect(contar(h, "data-semana=")).toBe(12);
    expect(h).toContain("Progresso de tiago");
    // A escolha é um seletor (uma pessoa por vez), não uma lista de números.
    expect(contar(h, "<select")).toBe(1);
    expect(h).toContain('name="pessoa"');
  });

  it("quem não é a Sofia (o worker não manda `pessoas`) não vê escolha nenhuma", () => {
    const h = pagina({ login: "fulana", estado: pronto() });
    expect(h).toContain("Meu progresso");
    expect(h).not.toContain("<select");
    expect(h).not.toContain('name="pessoa"');
  });

  it("a Sofia sem a lista (falhou) ganha um campo de texto", () => {
    const h = pagina({ login: "sofia", estado: pronto(resposta({ login: "sofia", pessoas: [] })) });
    expect(h).toMatch(/<input[^>]*name="pessoa"/);
    expect(h).toContain("Meu progresso");
  });
});

describe("a busca", () => {
  const responder = (status: number, corpo: unknown) => {
    const pedidos: string[] = [];
    const buscar = async (endereco: string) => {
      pedidos.push(endereco);
      return new Response(JSON.stringify(corpo), { status });
    };
    return { pedidos, buscar };
  };

  it("sem pessoa, pede o próprio; com pessoa, manda o ?pessoa= codificado", async () => {
    const a = responder(200, resposta());
    expect((await carregarMeuProgresso(null, a.buscar)).tipo).toBe("pronto");
    expect(a.pedidos).toEqual(["/api/meu-progresso"]);
    const b = responder(200, resposta());
    await carregarMeuProgresso("a&b", b.buscar);
    expect(b.pedidos).toEqual(["/api/meu-progresso?pessoa=a%26b"]);
  });

  it("403 = recusado; 401 = fora; 502 = erro", async () => {
    expect((await carregarMeuProgresso("tiago", responder(403, {}).buscar)).tipo).toBe("recusado");
    expect((await carregarMeuProgresso(null, responder(401, {}).buscar)).tipo).toBe("fora");
    expect((await carregarMeuProgresso(null, responder(502, {}).buscar)).tipo).toBe("erro");
    expect((await carregarMeuProgresso(null, responder(200, { nada: 1 }).buscar)).tipo).toBe("erro");
  });

  it("respostaValida descarta o que não serve e troca link de fora", () => {
    const r = respostaValida({ login: "x", tarefas: [null, { repositorio: "r", numero: 1, titulo: "t", feitaEm: "2026-10-20T15:00:00Z", url: "https://evil.example" }, { numero: "1" }], prs: [{ repositorio: "r" }], pessoas: ["a", 1] });
    expect(r?.tarefas).toEqual([{ repositorio: "r", numero: 1, titulo: "t", url: "https://github.com/sakura-corp/r/issues/1", feitaEm: "2026-10-20T15:00:00Z" }]);
    expect(r?.prs).toEqual([]);
    expect(r?.pessoas).toEqual(["a"]);
  });

  it("pessoaDaBusca", () => {
    expect(pessoaDaBusca("")).toBeNull();
    expect(pessoaDaBusca("?pessoa=%20")).toBeNull();
    expect(pessoaDaBusca("?pessoa=tiago")).toBe("tiago");
  });
});

describe("o gráfico", () => {
  it("cinco projetos com cor própria; do sexto em diante, 'Outros' (a cor nunca se repete)", () => {
    const s = seriesDoGrafico([SSACE, "a", "b", "c", "d", "e", "f"]);
    expect(s.map((x) => x.nome)).toEqual(["SSACE", "a", "b", "c", "d", "Outros"]);
    expect(s[5].projetos).toEqual(["e", "f"]);
    expect(new Set(s.map((x) => x.cor)).size).toBe(6);
  });

  it("o topo do eixo arredonda pra 1, 2 ou 5", () => {
    expect(topoDoEixo(0)).toBe(1);
    expect(topoDoEixo(4.5)).toBe(5);
    expect(topoDoEixo(12)).toBe(20);
    expect(topoDoEixo(20)).toBe(20);
    expect(topoDoEixo(51)).toBe(100);
  });
});

describe("o cartão do Início", () => {
  it("horas da semana, sequência e a última conquista, levando à página", () => {
    const h = limpar(renderToString(<CartaoDoMeuProgresso estado={pronto()} agora={AGORA} />));
    expect(h).toContain("4,5 h");
    expect(h).toContain("2 semanas");
    expect(h).toContain("Última conquista: Primeira tarefa num projeto secundário");
    expect(h).toContain('href="/meu-progresso"');
  });

  it("carregando e erro", () => {
    expect(renderToString(<CartaoDoMeuProgresso estado={{ tipo: "carregando" }} agora={AGORA} />)).toContain("Carregando");
    expect(renderToString(<CartaoDoMeuProgresso estado={{ tipo: "erro", mensagem: "x" }} agora={AGORA} />)).toContain("Não deu pra buscar agora.");
  });
});
