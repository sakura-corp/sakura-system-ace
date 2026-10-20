import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EntradaDaSala, Tarefa } from "../tipos";
import type { EstadoDaLeva } from "../logica/dados";
import type { EstadoDaSala } from "../logica/salaDados";
import { PaginaInicio } from "./PaginaInicio";

const AGORA = new Date("2026-10-17T12:00:00Z");
const tarefa = (n: number, extra: Partial<Tarefa> = {}): Tarefa => ({
  numero: n, titulo: `Tarefa ${n}`, url: `https://github.com/sakura-corp/sakura-system-ace/issues/${n}`, estado: "livre", chefe: "frontend", ...extra,
});
const EU = { login: "fulana", avatar: "" };
const OUTRA = { login: "beltrano", avatar: "" };
const pr = (id: string, nome: string, sinais: EntradaDaSala["sinais"]): EntradaDaSala => ({
  id, tipo: "pessoa", nome, fazendo: `PR ${id}`, url: `https://github.com/sakura-corp/sakura-system-ace/pull/${id}`, sinais,
});
const salaPronta = (entradas: EntradaDaSala[], falhas: ("pessoa" | "claude" | "casa")[] = []): EstadoDaSala => ({ tipo: "pronto", entradas, falhas, leva: 1 });
const levaPronta = (tarefas: Tarefa[], cortada = false): EstadoDaLeva => ({
  tipo: "pronto", levas: [{ numero: 1, nome: "Leva 1", abertas: tarefas.length, total: tarefas.length, feitas: 0, horas: 0, terminouEm: null }], atual: 1, leva: { numero: 1, tarefas, cortada },
});
const SALA_VAZIA = salaPronta([]);
const LEVA_COM_TAREFA = levaPronta([tarefa(1, { estado: "andamento", dono: EU, estimativaHoras: 2.5 })]);

const html = (o: { sala?: EstadoDaSala; leva?: EstadoDaLeva; exemplo?: boolean } = {}) =>
  renderToString(
    <PaginaInicio
      login="fulana"
      sala={o.sala ?? SALA_VAZIA}
      leva={o.leva ?? LEVA_COM_TAREFA}
      agora={AGORA}
      tentarSalaDeNovo={() => {}}
      tentarLevaDeNovo={() => {}}
      exemplo={o.exemplo}
    />,
  ).replace(/<!-- -->/g, "");

describe("Página Início (#546)", () => {
  it("(a) mostra só as coisas que precisam de quem olha", () => {
    const h = html({
      sala: salaPronta([
        pr("10", "ana", { revisaoPedidaA: ["fulana"] }),
        pr("11", "bia", { conferenciaVermelhaNoPrDe: "fulana" }),
        pr("12", "caio", { revisaoPedidaA: ["beltrano"] }),
      ]),
    });
    expect(h).toContain("Precisa de você (2)");
    expect(h).toContain("PR 10");
    expect(h).toContain("PR 11");
    expect(h).not.toContain("PR 12");
    expect(h).toContain('href="https://github.com/sakura-corp/sakura-system-ace/pull/10"');
    expect(h).toContain("(abre no GitHub, em aba nova)");
  });

  it("(b) sala pronta e vazia: estado vazio que ensina", () => {
    const h = html();
    expect(h).toContain("Precisa de você (0)");
    expect(h).toContain("Nada esperando por você");
    expect(h).toContain("revisão pedida");
  });

  it("(c) sala com falhas e vazia: avisa e NÃO diz que não há nada", () => {
    const h = html({ sala: salaPronta([], ["casa"]) });
    expect(h).not.toContain("Nada esperando por você");
    expect(h).toContain("a lista pode estar incompleta");
  });

  it("(d) tarefa em andamento do login mostra Começar e Largar; a de outra pessoa não aparece", () => {
    const h = html({ leva: levaPronta([tarefa(1, { estado: "andamento", dono: EU }), tarefa(2, { estado: "andamento", dono: OUTRA, titulo: "Da outra" })]) });
    expect(h).toContain("Começar com o Claude");
    expect(/<button[^>]*>Largar</.test(h)).toBe(true);
    expect(h).toContain("Tarefa 1");
    // A tarefa da outra só entra na contagem da leva, nunca em "A sua tarefa".
    expect(h).not.toContain("Da outra");
    expect(h).toContain("2 em andamento");
  });

  it("(e) sem tarefa: diz isso e aponta pra Leva", () => {
    const h = html({ leva: levaPronta([tarefa(3)]) });
    expect(h).toContain("Você não está com nenhuma tarefa");
    // O link do próprio aviso (o "Ver a leva atual" do cabeçalho também vai pra /leva).
    expect(h).toMatch(/<a href="\/leva"[^>]*>Leva<\/a>/);
  });

  it("sem tarefa e leva cortada: não afirma que você está sem tarefa", () => {
    const h = html({ leva: levaPronta([tarefa(3)], true) });
    expect(h).not.toContain("Você não está com nenhuma tarefa");
    expect(h).toContain("Nenhuma tarefa sua entre as 100 primeiras da leva");
  });

  it("(f) leva cortada: avisa das 100 primeiras", () => {
    expect(html({ leva: levaPronta([tarefa(1)], true) })).toContain("Mostrando só as 100 primeiras tarefas: os números podem estar incompletos.");
    expect(html()).not.toContain("100 primeiras");
  });

  it("(g) erro na sala e leva pronta: o 'Tentar de novo' fica só no bloco da sala", () => {
    const h = html({ sala: { tipo: "erro", mensagem: "Falhou a sala." } });
    expect(h).toContain("Falhou a sala.");
    expect(h.match(/Tentar de novo/g)?.length).toBe(1);
    expect(h).toContain("Começar com o Claude");
    expect(h).toContain("Leva 1");
  });

  it("erro na leva e sala pronta: o contrário", () => {
    const h = html({ leva: { tipo: "erro", mensagem: "Falhou a leva." } });
    // um botão no bloco da tarefa e outro no da leva
    expect(h.match(/Tentar de novo/g)?.length).toBe(2);
    expect(h).toContain("Nada esperando por você");
  });

  it("carregando: esqueletos, sem 'Nada esperando'", () => {
    const h = html({ sala: { tipo: "carregando" }, leva: { tipo: "carregando" } });
    expect(h).toContain("Carregando o que precisa de você");
    expect(h).not.toContain("Nada esperando por você");
    expect(h).not.toContain("Você não está com nenhuma tarefa");
  });

  it("sem levas", () => {
    expect(html({ leva: { tipo: "sem-levas" } })).toContain("Ainda não existe leva.");
  });

  it("resumo da leva: horas com vírgula, barra com valores e contagens", () => {
    const h = html({ leva: levaPronta([tarefa(1, { estado: "feita", estimativaHoras: 1.5 }), tarefa(2, { estado: "livre", estimativaHoras: 4.5 })]) });
    expect(h).toContain("de 2 tarefas feitas</span>");
    expect(h).toContain("1,5 h de 6 h feitas");
    expect(h).toContain('role="progressbar"');
    expect(h).toContain('aria-valuenow="25"');
    expect(h).toContain("1 livre");
    expect(h).toContain("1 feita");
  });

  it("sem horas estimadas: sem barra", () => {
    expect(html({ leva: levaPronta([tarefa(1)]) })).not.toContain("progressbar");
  });

  it("(h) um único h1, e linha de exemplo só quando é exemplo", () => {
    const h = html();
    expect(h.match(/<h1/g)?.length).toBe(1);
    expect(h).toContain("Ver a leva atual");
    expect(h).not.toContain("Dados de exemplo");
    expect(html({ exemplo: true })).toContain("Dados de exemplo: ainda sem ligação com o GitHub.");
  });
});
