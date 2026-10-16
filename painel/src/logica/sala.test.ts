import { describe, expect, it } from "vitest";
import { QUEM_ESTA_OLHANDO_NA_SALA, salaDeExemplo } from "../dados/exemplo-sala";
import type { EntradaDaSala } from "../tipos";
import {
  agruparPorEstado, ehModoTv, estadoDoBonequinho, haQuantoTempo, iniciais, linkSeguro, montarSala, nomeDoRoboDaCasa,
  ordemDasMesas, quantosPrecisam, textoPrecisam,
} from "./sala";

const agora = new Date("2026-10-16T15:00:00-03:00");
const ha = (min: number) => new Date(agora.getTime() - min * 60_000).toISOString();
const e = (extra: Partial<EntradaDaSala>): EntradaDaSala => ({ id: "x", tipo: "claude", nome: "X", sinais: {}, ...extra });

describe("estadoDoBonequinho", () => {
  it("pessoa: trabalhando com tarefa em andamento, livre sem", () => {
    expect(estadoDoBonequinho(e({ tipo: "pessoa", sinais: { tarefaEmAndamento: true } }), agora, "eu")).toBe("trabalhando");
    expect(estadoDoBonequinho(e({ tipo: "pessoa" }), agora, "eu")).toBe("livre");
  });
  it("robô do Claude: commit há menos de 2 h = trabalhando; de 2 h a menos de 3 dias = livre; 3 dias ou mais = dormindo", () => {
    expect(estadoDoBonequinho(e({ ultimaAtividade: ha(119) }), agora, "eu")).toBe("trabalhando");
    expect(estadoDoBonequinho(e({ ultimaAtividade: ha(120) }), agora, "eu")).toBe("livre");
    expect(estadoDoBonequinho(e({ ultimaAtividade: ha(3 * 24 * 60 - 1) }), agora, "eu")).toBe("livre");
    expect(estadoDoBonequinho(e({ ultimaAtividade: ha(3 * 24 * 60) }), agora, "eu")).toBe("dormindo");
    expect(estadoDoBonequinho(e({}), agora, "eu")).toBe("livre");
  });
  it("robô da casa: rodando = trabalhando; falhou = erro; deu certo = livre", () => {
    expect(estadoDoBonequinho(e({ tipo: "casa", sinais: { rodando: true } }), agora, "eu")).toBe("trabalhando");
    expect(estadoDoBonequinho(e({ tipo: "casa", sinais: { ultimaRodada: "falhou" } }), agora, "eu")).toBe("erro");
    expect(estadoDoBonequinho(e({ tipo: "casa", sinais: { ultimaRodada: "deu-certo" } }), agora, "eu")).toBe("livre");
  });
  it("os três casos do 'precisa de você', só pra quem está olhando", () => {
    expect(estadoDoBonequinho(e({ sinais: { revisaoPedidaA: ["outra", "eu"] } }), agora, "eu")).toBe("precisa");
    expect(estadoDoBonequinho(e({ tipo: "casa", sinais: { aprovacaoEsperadaDe: ["eu"] } }), agora, "eu")).toBe("precisa");
    expect(estadoDoBonequinho(e({ sinais: { conferenciaVermelhaNoPrDe: "eu" } }), agora, "eu")).toBe("precisa");
    expect(estadoDoBonequinho(e({ sinais: { revisaoPedidaA: ["outra"], conferenciaVermelhaNoPrDe: "outra" } }), agora, "eu")).toBe("livre");
  });
  it("precisa de você vence erro e trabalhando", () => {
    expect(estadoDoBonequinho(e({ tipo: "casa", sinais: { ultimaRodada: "falhou", rodando: true, aprovacaoEsperadaDe: ["eu"] } }), agora, "eu")).toBe("precisa");
    expect(estadoDoBonequinho(e({ tipo: "casa", sinais: { ultimaRodada: "falhou", rodando: true } }), agora, "eu")).toBe("erro");
  });
  it("tempo corrido, não calendário: na troca do horário de verão (EUA), 70,5 h ainda não é dormindo; 72 h é", () => {
    const depois = new Date("2026-03-10T11:30:00-04:00");
    expect(estadoDoBonequinho(e({ ultimaAtividade: "2026-03-07T12:00:00-05:00" }), depois, "eu")).toBe("livre");
    expect(estadoDoBonequinho(e({ ultimaAtividade: "2026-03-07T10:30:00-05:00" }), depois, "eu")).toBe("dormindo");
  });
  it("na virada do dia: commit às 23:50, olhado à 00:10, é trabalhando e 'há 20 min'", () => {
    const meiaNoite = new Date("2026-10-16T00:10:00-03:00");
    expect(estadoDoBonequinho(e({ ultimaAtividade: "2026-10-15T23:50:00-03:00" }), meiaNoite, "eu")).toBe("trabalhando");
    expect(haQuantoTempo("2026-10-15T23:50:00-03:00", meiaNoite)).toBe("há 20 min");
  });
});

describe("ordem das mesas", () => {
  it("pessoas, depois robôs do Claude, depois os robôs da casa no lugar fixo (desconhecido vai pro fim)", () => {
    const lista = [
      { tipo: "casa", nome: "Liberar" }, { tipo: "claude", nome: "Zeta" }, { tipo: "casa", nome: "deploy-extra" },
      { tipo: "pessoa", nome: "bia" }, { tipo: "casa", nome: "Conferência" }, { tipo: "claude", nome: "Alfa" }, { tipo: "pessoa", nome: "ana" },
    ] as const;
    expect(ordemDasMesas([...lista]).map((b) => b.nome)).toEqual(["ana", "bia", "Alfa", "Zeta", "Conferência", "Liberar", "deploy-extra"]);
  });
  it("nome do robô da casa pelo arquivo; fora da lista fica o nome do arquivo", () => {
    expect(nomeDoRoboDaCasa("ci.yml")).toBe("Conferência");
    expect(nomeDoRoboDaCasa("backup-banco.yml")).toBe("Cópia do banco");
    expect(nomeDoRoboDaCasa("novo-trabalho.yml")).toBe("novo-trabalho");
  });
});

describe("a sala de exemplo", () => {
  const sala = montarSala(salaDeExemplo(agora), agora, QUEM_ESTA_OLHANDO_NA_SALA);
  it("tem 11 bonequinhos e todos os estados; 2 precisam de você", () => {
    expect(sala).toHaveLength(11);
    expect(new Set(sala.map((b) => b.estado))).toEqual(new Set(["trabalhando", "precisa", "erro", "dormindo", "livre"]));
    expect(quantosPrecisam(sala)).toBe(2);
    expect(textoPrecisam(2)).toBe("2 coisas precisam de você");
    expect(textoPrecisam(1)).toBe("1 coisa precisa de você");
  });
  it("os robôs da casa estão na ordem fixa, no fim", () => {
    expect(sala.filter((b) => b.tipo === "casa").map((b) => b.nome)).toEqual([
      "Conferência", "Publicar", "Liberar", "Atualizar bancos", "Cópia do banco", "Aviso do Electron",
    ]);
    expect(sala.at(-1)!.nome).toBe("Aviso do Electron");
  });
  it("a lista agrupa com 'Precisa de você' primeiro", () => {
    expect(agruparPorEstado(sala).map((g) => g.estado)).toEqual(["precisa", "erro", "trabalhando", "dormindo", "livre"]);
  });
});

describe("pequenas regras", () => {
  it("link: só https://github.com/sakura-corp/", () => {
    expect(linkSeguro("https://github.com/sakura-corp/sakura-system-ace/pulls")).toBeDefined();
    expect(linkSeguro("https://exemplo.com/fora-do-github")).toBeUndefined();
    expect(linkSeguro("https://github.com/sakura-corpx/a")).toBeUndefined();
  });
  it("iniciais e modo TV", () => {
    expect(iniciais("ana-exemplo")).toBe("AE");
    expect(iniciais("Bruno")).toBe("B");
    expect(ehModoTv("?tv")).toBe(true);
    expect(ehModoTv("?tv=1")).toBe(true);
    expect(ehModoTv("")).toBe(false);
    expect(ehModoTv("?outra")).toBe(false);
  });
});
