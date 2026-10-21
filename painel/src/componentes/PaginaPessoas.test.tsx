import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EstadoDaSala } from "../logica/salaDados";
import type { EntradaDaSala } from "../tipos";
import { PaginaPessoas } from "./PaginaPessoas";

const FOTO = "https://avatars.githubusercontent.com/u/1?v=4";
const pessoa = (nome: string, extra: Partial<EntradaDaSala> = {}): EntradaDaSala => ({
  id: `pessoa:${nome}`,
  tipo: "pessoa",
  nome,
  fazendo: "sem tarefa agora",
  sinais: {},
  ...extra,
});
const comTarefa = (nome: string, extra: Partial<EntradaDaSala> = {}) =>
  pessoa(nome, { fazendo: "#454 Central do dia", url: "https://github.com/sakura-corp/sakura-system-ace/issues/454", avatar: FOTO, sinais: { tarefaEmAndamento: true }, ...extra });
const pronto = (entradas: EntradaDaSala[]): EstadoDaSala => ({ tipo: "pronto", entradas, falhas: [], leva: 2 });
const html = (dados: EstadoDaSala) => renderToString(<PaginaPessoas dados={dados} tentarDeNovo={() => {}} />).replace(/<!-- -->/g, "");
const texto = (h: string) => h.replace(/<[^>]*>/g, " ");

describe("PaginaPessoas (#650)", () => {
  it("pessoa com tarefa: o login e o texto da tarefa, como link seguro", () => {
    const h = html(pronto([comTarefa("ana-exemplo")]));
    expect(h).toContain("ana-exemplo");
    expect(h).toMatch(/<a href="https:\/\/github\.com\/sakura-corp\/sakura-system-ace\/issues\/454"[^>]*>#454 Central do dia/);
    expect(h).not.toContain("Sem tarefa");
  });

  it("pessoa sem tarefa: 'Sem tarefa' e nenhum link de tarefa", () => {
    const h = html(pronto([pessoa("bruno-exemplo", { url: "https://github.com/sakura-corp/sakura-system-ace/issues/9" })]));
    expect(h).toContain("Sem tarefa");
    expect(h).not.toContain("sem tarefa agora");
    expect(h).not.toContain("/issues/9");
  });

  it("tarefa com link de fora do GitHub da Sakura: só o texto, sem link", () => {
    const h = html(pronto([comTarefa("ana-exemplo", { url: "https://exemplo.com/x" })]));
    expect(h).toContain("#454 Central do dia");
    expect(h).not.toContain("exemplo.com");
  });

  it("foto do GitHub vira img com alt vazio; sem foto (ou foto de fora), as iniciais", () => {
    const com = html(pronto([comTarefa("ana-exemplo")]));
    expect(com).toContain(`src="${FOTO}"`);
    expect(com).toContain('alt=""');
    const sem = html(pronto([comTarefa("ana-exemplo", { avatar: undefined })]));
    expect(sem).not.toContain("<img");
    expect(sem).toContain(">AE<");
    const fora = html(pronto([comTarefa("bruno-exemplo", { avatar: "https://exemplo.com/f.png" })]));
    expect(fora).not.toContain("<img");
    expect(fora).toContain(">BE<");
  });

  it("só pessoas, em ordem alfabética do login (não de quem trabalha mais)", () => {
    const robo: EntradaDaSala = { id: "c1", tipo: "claude", nome: "Robo Qualquer", fazendo: "claude/x", sinais: {} };
    const h = html(pronto([pessoa("zeca"), robo, comTarefa("ana"), pessoa("Bia")]));
    expect(h).not.toContain("Robo Qualquer");
    const ordem = ["ana", "Bia", "zeca"].map((n) => h.indexOf(n));
    expect(ordem.every((i) => i >= 0)).toBe(true);
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem);
    expect(h.match(/<li /g)).toHaveLength(3);
  });

  it("sem pessoas: diz que ninguém tem tarefa na leva, sem lista", () => {
    const h = html(pronto([]));
    expect(h).toContain("Ninguém com tarefa nesta leva.");
    expect(h).not.toContain("<ul");
  });

  it("erro: a mensagem e o botão de tentar de novo", () => {
    const h = html({ tipo: "erro", mensagem: "Não consegui ler a sala do GitHub agora." });
    expect(h).toContain("Não consegui ler a sala do GitHub agora.");
    expect(h).toContain("Tentar de novo");
  });

  it("carregando: avisa que está buscando", () => {
    expect(html({ tipo: "carregando" })).toContain("Carregando");
  });

  it("nenhum número por pessoa: sem horas, contagem ou ranking", () => {
    const h = html(pronto([comTarefa("ana-exemplo"), pessoa("bruno-exemplo")]));
    const t = texto(h).replace(/#454/g, "");
    expect(t).not.toMatch(/\d/);
    expect(t).not.toMatch(/\bhoras?\b|\bh\b|ranking/i);
  });

  it("quem segura mais de uma tarefa: o '(+N)' do worker não aparece (é contagem por pessoa)", () => {
    const h = html(pronto([comTarefa("ana-exemplo", { fazendo: "#454 Central do dia (+2)" })]));
    expect(h).toContain("#454 Central do dia");
    expect(h).not.toContain("(+2)");
  });

  it("a busca das pessoas falhou (as outras deram certo): avisa o erro, nunca diz que não há ninguém", () => {
    const h = html({ tipo: "pronto", entradas: [], falhas: ["pessoa"], leva: null });
    expect(h).toContain("Não consegui ler as pessoas agora.");
    expect(h).toContain("Tentar de novo");
    expect(h).not.toContain("Ninguém");
  });

  it("sem leva nenhuma: não fala de 'nesta leva'", () => {
    const h = html({ tipo: "pronto", entradas: [], falhas: [], leva: null });
    expect(h).toContain("Nenhuma leva aberta agora.");
    expect(h).not.toContain("nesta leva");
  });
});
