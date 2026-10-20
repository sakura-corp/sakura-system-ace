import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EntradaDaSala, Tarefa } from "../tipos";
import type { EstadoDaLeva } from "../logica/dados";
import type { EstadoDaSala } from "../logica/salaDados";
import type { EstadoDasNovidades, Novidade } from "../logica/novidades";
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
  tipo: "pronto", levas: [{ numero: 1, nome: "Leva 1", abertas: tarefas.length }], atual: 1, leva: { numero: 1, tarefas, cortada },
});
const SALA_VAZIA = salaPronta([]);
const LEVA_COM_TAREFA = levaPronta([tarefa(1, { estado: "andamento", dono: EU, estimativaHoras: 2.5 })]);

const SEM_NOVIDADES: EstadoDasNovidades = { tipo: "pronto", novidades: [], falhas: [] };

const html = (o: { sala?: EstadoDaSala; leva?: EstadoDaLeva; novidades?: EstadoDasNovidades; exemplo?: boolean } = {}) =>
  renderToString(
    <PaginaInicio
      login="fulana"
      sala={o.sala ?? SALA_VAZIA}
      leva={o.leva ?? LEVA_COM_TAREFA}
      agora={AGORA}
      tentarSalaDeNovo={() => {}}
      tentarLevaDeNovo={() => {}}
      novidades={o.novidades ?? SEM_NOVIDADES}
      tentarNovidadesDeNovo={() => {}}
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

  it("a fase da leva (#645): uma linha \"Leva N: <fase>\" que leva pra tela da leva; sem a fase, sem a linha", () => {
    const comFase: EstadoDaLeva = { tipo: "pronto", levas: [{ numero: 1, nome: "Leva 1", abertas: 1, fase: "trabalhando" }], atual: 1, leva: { numero: 1, tarefas: [tarefa(1)], cortada: false, fase: "trabalhando" } };
    expect(html({ leva: comFase })).toMatch(/<a href="\/leva"[^>]*>Leva 1: <strong[^>]*>Trabalhando<\/strong>/);
    expect(html()).not.toContain("Leva 1: ");
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

describe("O que mudou hoje (#549)", () => {
  // AGORA = 17/10 12h UTC: em qualquer fuso do Brasil, 11h é o mesmo dia.
  const n = (extra: Partial<Novidade>): Novidade =>
    ({ id: "a", quando: "2026-10-17T11:00:00Z", tipo: "tarefa", acao: "pegou", quem: "bia", numero: 510, alvo: "bia", ...extra }) as Novidade;

  it("com novidades: a frase, o tempo, e o título só vira link se for da sakura-corp", () => {
    const h = html({
      novidades: {
        tipo: "pronto",
        falhas: [],
        novidades: [
          n({ id: "a", titulo: "Tarefa boa", url: "https://github.com/sakura-corp/sakura-system-ace/issues/510" }),
          n({ id: "b", quem: "caio", alvo: "caio", numero: 511, titulo: "Tarefa de fora", url: "https://mal.exemplo/x" }),
          { id: "r", quando: "2026-10-17T11:30:00Z", tipo: "rodada", passou: false, nome: "CI", numero: 663 },
        ],
      },
    });
    expect(h).toContain("O que mudou hoje");
    expect(h).toContain("bia pegou a #510");
    expect(h).toContain("A conferência CI no PR #663 falhou");
    expect(h).toContain("há 30 min");
    expect(h).toContain('href="https://github.com/sakura-corp/sakura-system-ace/issues/510"');
    expect(h).toContain("Tarefa de fora");
    expect(h).not.toContain("mal.exemplo");
    // A mais nova primeiro.
    expect(h.indexOf("conferência CI")).toBeLessThan(h.indexOf("bia pegou"));
  });

  it("sem novidades de hoje (só de dias atrás): o vazio que ensina, nunca a de outro dia", () => {
    const h = html({ novidades: { tipo: "pronto", falhas: [], novidades: [n({ quando: "2026-10-15T11:00:00Z" })] } });
    expect(h).toContain("Nada mudou hoje ainda");
    expect(h).not.toContain("bia pegou");
  });

  it("as conferências falharam: aviso; erro: tentar de novo, nunca \"nada mudou\"", () => {
    expect(html({ novidades: { tipo: "pronto", falhas: ["rodadas"], novidades: [] } })).toContain("As conferências não carregaram");
    const h = html({ novidades: { tipo: "erro", mensagem: "Não consegui ler o que mudou hoje no GitHub." } });
    expect(h).toContain("Não consegui ler o que mudou hoje");
    expect(h).not.toContain("Nada mudou hoje");
  });
});
