import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { levaDeExemploDoProjeto, projetosDeExemplo, propostasDeExemplo } from "../dados/exemplo-secundarios";
import type { Projeto, Proposta, RespostaDaLevaDoProjeto } from "../tipos";
import {
  carregarInicio,
  carregarLevaDoProjeto,
  ConteudoDosSecundarios,
  PaginaSecundarios,
  projetoEscolhido,
  type ParteDosSecundarios,
} from "./PaginaSecundarios";

const json = (corpo: unknown, status = 200) => Response.json(corpo, { status });
const pronto = <T,>(dados: T): ParteDosSecundarios<T> => ({ tipo: "pronto", dados });

/** Finge o worker, anota a ordem dos pedidos e se algum começou antes do anterior terminar. */
function fingirWorker(respostas: Record<string, () => Response>) {
  const pedidos: string[] = [];
  let emVoo = 0;
  let juntos = false;
  const buscar = async (endereco: string) => {
    pedidos.push(endereco);
    emVoo += 1;
    if (emVoo > 1) juntos = true;
    await new Promise((r) => setTimeout(r, 1));
    emVoo -= 1;
    const r = respostas[endereco];
    if (!r) throw new Error(`pedido inesperado: ${endereco}`);
    return r();
  };
  return { buscar, pedidos, foramJuntos: () => juntos };
}

const corpoDosProjetos = { projetos: projetosDeExemplo };
const corpoDasPropostas = { propostas: propostasDeExemplo };

describe("carregarInicio (#731)", () => {
  it("busca os projetos e depois as propostas, um pedido de cada vez", async () => {
    const w = fingirWorker({ "/api/projetos": () => json(corpoDosProjetos), "/api/propostas": () => json(corpoDasPropostas) });
    const r = await carregarInicio(w.buscar);
    expect(w.pedidos).toEqual(["/api/projetos", "/api/propostas"]);
    expect(w.foramJuntos()).toBe(false);
    expect(r.tipo).toBe("ok");
    if (r.tipo !== "ok") return;
    expect(r.projetos.tipo).toBe("pronto");
    expect(r.propostas.tipo).toBe("pronto");
  });

  it("erro nos projetos não derruba as propostas (e o contrário)", async () => {
    const a = await carregarInicio(fingirWorker({ "/api/projetos": () => json({}, 502), "/api/propostas": () => json(corpoDasPropostas) }).buscar);
    expect(a.tipo === "ok" && a.projetos.tipo).toBe("erro");
    expect(a.tipo === "ok" && a.propostas.tipo).toBe("pronto");
    const b = await carregarInicio(fingirWorker({ "/api/projetos": () => json(corpoDosProjetos), "/api/propostas": () => json({ erro: "x" }, 500) }).buscar);
    expect(b.tipo === "ok" && b.projetos.tipo).toBe("pronto");
    expect(b.tipo === "ok" && b.propostas.tipo).toBe("erro");
  });

  it("falha de conexão numa parte vira erro dela, com a mensagem de conexão", async () => {
    const buscar = async (e: string) => {
      if (e === "/api/projetos") throw new Error("sem rede");
      return json(corpoDasPropostas);
    };
    const r = await carregarInicio(buscar);
    expect(r.tipo === "ok" && r.projetos).toEqual({ tipo: "erro", mensagem: "Sem conexão com o painel. Confira a internet." });
    expect(r.tipo === "ok" && r.propostas.tipo).toBe("pronto");
  });

  it("401 em qualquer parte: sessão acabou, e não pede o resto", async () => {
    const a = fingirWorker({ "/api/projetos": () => json({}, 401), "/api/propostas": () => json(corpoDasPropostas) });
    expect(await carregarInicio(a.buscar)).toEqual({ tipo: "fora" });
    expect(a.pedidos).toEqual(["/api/projetos"]);
    const b = fingirWorker({ "/api/projetos": () => json(corpoDosProjetos), "/api/propostas": () => json({}, 401) });
    expect(await carregarInicio(b.buscar)).toEqual({ tipo: "fora" });
  });

  it("formato estranho vira erro; projeto com nome de repositório estranho some da lista", async () => {
    const mau = { ...projetosDeExemplo[0], repositorio: "../x" };
    const r = await carregarInicio(fingirWorker({ "/api/projetos": () => json({ projetos: [mau, projetosDeExemplo[1]] }), "/api/propostas": () => json({ propostas: "x" }) }).buscar);
    if (r.tipo !== "ok") throw new Error("devia ser ok");
    expect(r.projetos.tipo === "pronto" && r.projetos.dados.projetos.map((p) => p.repositorio)).toEqual(["site-da-loja"]);
    expect(r.propostas.tipo).toBe("erro");
  });

  it("link fora da sakura-corp é descartado; estado desconhecido vira null; semAcesso passa", async () => {
    const propostas: Proposta[] = [{ ...propostasDeExemplo[0], url: "https://exemplo.com/x", estado: "inventado" as never }];
    const projeto: Projeto = { ...projetosDeExemplo[0], url: "javascript:alert(1)" };
    const r = await carregarInicio(fingirWorker({ "/api/projetos": () => json({ projetos: [projeto] }), "/api/propostas": () => json({ propostas, semAcesso: true }) }).buscar);
    if (r.tipo !== "ok") throw new Error("devia ser ok");
    const p = r.propostas.tipo === "pronto" ? r.propostas.dados : undefined;
    expect(p?.propostas[0].url).toBe("");
    expect(p?.propostas[0].estado).toBeNull();
    expect(p?.semAcesso).toBe(true);
    expect(r.projetos.tipo === "pronto" && r.projetos.dados.projetos[0].url).toBe("");
  });
});

describe("carregarLevaDoProjeto (#731)", () => {
  it("pede /api/projetos/<repo>/leva, e as tarefas voltam marcadas com o repositório", async () => {
    const w = fingirWorker({ "/api/projetos/ar-condicionado/leva": () => json({ ...levaDeExemploDoProjeto, leva: { ...levaDeExemploDoProjeto.leva!, tarefas: levaDeExemploDoProjeto.leva!.tarefas.map((t) => ({ ...t, repositorio: undefined })) } }) });
    const r = await carregarLevaDoProjeto("ar-condicionado", w.buscar);
    expect(r.tipo).toBe("pronto");
    if (r.tipo !== "pronto") return;
    expect(r.dados.leva?.tarefas.every((t) => t.repositorio === "ar-condicionado")).toBe(true);
  });

  it("repositório inválido: erro e nem pede; 404 e 401 e formato estranho", async () => {
    const w = fingirWorker({});
    expect((await carregarLevaDoProjeto("../x", w.buscar)).tipo).toBe("erro");
    expect(w.pedidos).toEqual([]);
    expect((await carregarLevaDoProjeto("a", fingirWorker({ "/api/projetos/a/leva": () => json({}, 404) }).buscar)).tipo).toBe("erro");
    expect(await carregarLevaDoProjeto("a", fingirWorker({ "/api/projetos/a/leva": () => json({}, 401) }).buscar)).toEqual({ tipo: "fora" });
    expect((await carregarLevaDoProjeto("a", fingirWorker({ "/api/projetos/a/leva": () => json({ repositorio: "a", levas: [], atual: 1, leva: { numero: 1, tarefas: [{ x: 1 }], cortada: false } }) }).buscar)).tipo).toBe("erro");
  });

  it("sem leva atual (leva null) é um resultado válido", async () => {
    const corpo: RespostaDaLevaDoProjeto = { repositorio: "a", levas: [], atual: null, leva: null };
    const r = await carregarLevaDoProjeto("a", fingirWorker({ "/api/projetos/a/leva": () => json(corpo) }).buscar);
    expect(r).toEqual({ tipo: "pronto", dados: corpo });
  });
});

describe("projetoEscolhido", () => {
  it("o pedido vale se existe; senão o primeiro com leva atual; senão nenhum", () => {
    expect(projetoEscolhido(projetosDeExemplo, "site-da-loja")).toBe("site-da-loja");
    expect(projetoEscolhido(projetosDeExemplo, "nao-existe")).toBe("ar-condicionado");
    expect(projetoEscolhido([projetosDeExemplo[1], projetosDeExemplo[0]], null)).toBe("ar-condicionado");
    expect(projetoEscolhido([projetosDeExemplo[1]], null)).toBeNull();
    expect(projetoEscolhido([], null)).toBeNull();
  });
});

const html = (p: Partial<Parameters<typeof ConteudoDosSecundarios>[0]> = {}) =>
  renderToString(
    <ConteudoDosSecundarios
      projetos={pronto({ projetos: projetosDeExemplo })}
      propostas={pronto({ propostas: propostasDeExemplo })}
      leva={pronto(levaDeExemploDoProjeto)}
      escolhido="ar-condicionado"
      aoEscolher={() => {}}
      tentarProjetosDeNovo={() => {}}
      tentarPropostasDeNovo={() => {}}
      tentarLevaDeNovo={() => {}}
      {...p}
    />,
  ).replace(/<!-- -->/g, "");

describe("ConteudoDosSecundarios (#731)", () => {
  it("as propostas mostram o estado em português, e sem estado, 'Sem estado'", () => {
    const h = html();
    for (const rotulo of ["Em entrevista", "Esperando a Sofia", "Com sugestões", "Aprovada", "Recusada", "Sem estado"]) expect(h).toContain(rotulo);
    expect(h).not.toContain("em-entrevista");
    expect(h).not.toContain("esperando-sofia");
  });

  it("proposta fechada sem 'aprovada' nem 'recusada' (um teste, uma desistência) some da lista", () => {
    const fechada: Proposta = { numero: 7, titulo: "Proposta (teste)", url: "", estado: "esperando-sofia", aberta: false, atualizadaEm: "2026-10-22T23:04:24.000Z" };
    const h = html({ propostas: pronto({ propostas: [fechada, propostasDeExemplo[2]] }) });
    expect(h).not.toContain("Proposta (teste)");
    expect(h).toContain("Aplicativo de pontos para clientes");
    expect(html({ propostas: pronto({ propostas: [fechada] }) })).toContain("Nenhuma proposta ainda.");
  });

  it("proposta fechada como aprovada ou recusada continua na lista, com o estado dela", () => {
    const h = html({ propostas: pronto({ propostas: propostasDeExemplo.filter((p) => !p.aberta) }) });
    expect(h).toContain("Aprovada");
    expect(h).toContain("Recusada");
  });

  it("o título da proposta é texto puro; o link só se for da sakura-corp", () => {
    const perigosa: Proposta = { numero: 9, titulo: "<img src=x onerror=alert(1)>", url: "", estado: null, aberta: true, atualizadaEm: "2026-10-22T12:00:00.000Z" };
    const h = html({ propostas: pronto({ propostas: [perigosa, propostasDeExemplo[0]] }) });
    expect(h).not.toContain("<img src=x");
    expect(h).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(h).toContain('href="https://github.com/sakura-corp/secundarios/issues/1"');
    expect(h).not.toContain('href=""');
  });

  it("semAcesso: aviso discreto, e o resto da página normal", () => {
    const h = html({ propostas: pronto({ propostas: [], semAcesso: true }) });
    expect(h).toContain("Não deu pra ler as propostas: o repositório secundarios ainda não existe ou seu login não alcança ele.");
    expect(h).toContain("ar-condicionado");
    expect(h).toContain("Resumo da leva");
  });

  it("um cartão por projeto: nome, descrição, link, 'Leva N' ou 'Sem tarefa aberta', quantas abertas", () => {
    const h = html();
    expect(h).toContain("site-da-loja");
    expect(h).toContain("Controle e histórico de manutenção dos aparelhos");
    expect(h).toContain('href="https://github.com/sakura-corp/ar-condicionado"');
    expect(h).toContain("Leva 1");
    expect(h).toContain("Sem tarefa aberta");
    expect(h).toContain("3 abertas");
    expect(h).toContain('aria-pressed="true"');
    expect(h.match(/aria-pressed="false"/g)).toHaveLength(1);
  });

  it("descrição do projeto é texto puro", () => {
    const p: Projeto = { ...projetosDeExemplo[0], descricao: "<b>oi</b>" };
    const h = html({ projetos: pronto({ projetos: [p] }) });
    expect(h).toContain("&lt;b&gt;oi&lt;/b&gt;");
    expect(h).not.toContain("<b>oi");
  });

  it("nenhum projeto: a frase explica o tópico projeto-secundario", () => {
    const h = html({ projetos: pronto({ projetos: [] }), escolhido: null, leva: undefined });
    expect(h).toContain("projeto-secundario");
    expect(h).toContain("Nenhum projeto");
  });

  it("a leva do projeto escolhido: subtítulo, contador, horas por pessoa e lista com os botões do projeto", () => {
    const h = html({ login: "ana-exemplo" });
    expect(h).toContain("ar-condicionado · Leva 1");
    expect(h).toContain("Resumo da leva");
    expect(h).toContain("Horas por pessoa");
    expect(h).toContain("Cadastro dos aparelhos");
    expect(h).toContain("repositories=sakura-corp%2Far-condicionado".replace("%2F", "/"));
  });

  it("a leva atual aceita 'Pegar tarefa'; sem ser a atual, não", () => {
    expect(html({ login: "carla-exemplo" })).toMatch(/<button type="button" class="[^"]*">Pegar tarefa/);
    const outra: RespostaDaLevaDoProjeto = { ...levaDeExemploDoProjeto, atual: 2 };
    expect(html({ login: "carla-exemplo", leva: pronto(outra) })).toMatch(/<button[^>]*disabled=""[^>]*>Pegar tarefa/);
  });

  it("projeto sem tarefa aberta: diz isso, sem contador", () => {
    const h = html({ escolhido: "site-da-loja", leva: undefined });
    expect(h).toContain("site-da-loja · sem tarefa aberta");
    expect(h).not.toContain("Resumo da leva");
  });

  it("erro numa parte mostra a mensagem e 'Tentar de novo', e as outras partes continuam", () => {
    const h = html({ propostas: { tipo: "erro", mensagem: "Falhou as propostas." } });
    expect(h).toContain("Falhou as propostas.");
    expect(h).toContain("Tentar de novo");
    expect(h).toContain("ar-condicionado");
    expect(h).toContain("Resumo da leva");
    const g = html({ leva: { tipo: "erro", mensagem: "Falhou a leva." } });
    expect(g).toContain("Falhou a leva.");
    expect(g).toContain("Aprovada");
  });

  it("carregando: esqueleto avisável, sem dados", () => {
    const h = html({ projetos: { tipo: "carregando" }, propostas: { tipo: "carregando" }, leva: { tipo: "carregando" } });
    expect(h).toContain('role="status"');
    expect(h).not.toContain("Em entrevista");
  });

  it("não tem HTML solto nem largura fixa que force rolagem lateral", () => {
    expect(html()).not.toContain("dangerouslySetInnerHTML");
    expect(html()).toContain("min-w-0");
    expect(html()).toContain("break-words");
  });
});

describe("PaginaSecundarios (#731)", () => {
  it("sem login: um h1, os dados de exemplo e nenhum pedido", () => {
    const h = renderToString(<PaginaSecundarios semLogin buscar={() => Promise.reject(new Error("não devia buscar"))} />).replace(/<!-- -->/g, "");
    expect((h.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(h).toMatch(/<h1[^>]*>Projetos secundários<\/h1>/);
    expect(h).toContain("1º · Produção");
    expect(h).toContain("ar-condicionado");
    expect(h).toContain("Em entrevista");
  });

  it("com login, antes de chegar os dados, mostra o esqueleto", () => {
    const h = renderToString(<PaginaSecundarios semLogin={false} login="ana" buscar={() => new Promise(() => {})} />);
    expect(h).toContain("Buscando");
  });
});
