import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LIMITE_DESATUALIZADO_MS,
  avisoDaSala,
  avisoDeTarefa,
  criarTempoReal,
  esperaDaReconexao,
  estadoDoTempoReal,
  type ConexaoLike,
  textoDaConexao,
  type SituacaoDoTempoReal,
} from "./tempoReal";

describe("esperaDaReconexao", () => {
  it("1 s, 2 s, 5 s, 10 s e depois 30 s", () => {
    expect([0, 1, 2, 3, 4, 5, 20].map(esperaDaReconexao)).toEqual([1000, 2000, 5000, 10000, 30000, 30000, 30000]);
  });
  it("valor estranho cai na primeira espera", () => {
    expect(esperaDaReconexao(-1)).toBe(1000);
    expect(esperaDaReconexao(Number.NaN)).toBe(1000);
  });
});

describe("estadoDoTempoReal", () => {
  const t0 = 1_000_000;
  it("conectado = ao vivo; desconectado = reconectando", () => {
    expect(estadoDoTempoReal(true, t0, t0 + 1000)).toBe("aovivo");
    expect(estadoDoTempoReal(false, t0, t0 + 1000)).toBe("reconectando");
    expect(estadoDoTempoReal(true, null, t0)).toBe("aovivo");
  });
  it("vira desatualizado quando passam mais de 2 minutos sem busca com sucesso, com ou sem conexão", () => {
    expect(estadoDoTempoReal(true, t0, t0 + LIMITE_DESATUALIZADO_MS)).toBe("aovivo");
    expect(estadoDoTempoReal(true, t0, t0 + LIMITE_DESATUALIZADO_MS + 1)).toBe("desatualizado");
    expect(estadoDoTempoReal(false, t0, t0 + LIMITE_DESATUALIZADO_MS + 1)).toBe("desatualizado");
  });
});

describe("avisoDeTarefa", () => {
  it("só os avisos de tarefa contam", () => {
    expect(avisoDeTarefa('{"evento":"issues","numero":5}')).toEqual({ evento: "issues", numero: 5 });
    expect(avisoDeTarefa('{"evento":"pull_request"}')).toEqual({ evento: "pull_request" });
    expect(avisoDeTarefa('{"evento":"label"}')).toEqual({ evento: "label" });
  });
  it("robô, branch, lixo e o que não é texto não fazem buscar", () => {
    for (const x of ['{"evento":"push"}', '{"evento":"workflow_run"}', "não é json", "{}", "null", 42, undefined]) {
      expect(avisoDeTarefa(x)).toBeNull();
    }
  });
});

describe("avisoDaSala (#468)", () => {
  it("a Sala escuta também os avisos de robô e de branch", () => {
    for (const e of ["issues", "pull_request", "label", "workflow_run", "push", "create", "delete"]) {
      expect(avisoDaSala(JSON.stringify({ evento: e }))).toEqual({ evento: e });
    }
  });
  it("lixo e evento que ninguém repassa não fazem buscar", () => {
    for (const x of ['{"evento":"star"}', "não é json", "{}", "null", 42, undefined]) expect(avisoDaSala(x)).toBeNull();
  });
});

describe("textoDaConexao (#468)", () => {
  const t0 = 10_000_000;
  it("ao vivo diz há quantos segundos, e depois minutos", () => {
    expect(textoDaConexao("aovivo", t0, t0 + 7_900)).toBe("ao vivo · atualizado há 7 s");
    expect(textoDaConexao("aovivo", t0, t0 + 59_999)).toBe("ao vivo · atualizado há 59 s");
    expect(textoDaConexao("aovivo", t0, t0 + 61_000)).toBe("ao vivo · atualizado há 1 min");
    expect(textoDaConexao("aovivo", t0, t0 + 300)).toBe("ao vivo · atualizado agora");
  });
  it("reconectando é só 'reconectando…', sem número", () => {
    expect(textoDaConexao("reconectando", t0, t0 + 30_000)).toBe("reconectando…");
    expect(textoDaConexao("reconectando", null, t0)).toBe("reconectando…");
  });
  it("desatualizado diz há quantos minutos (nunca menos de 2)", () => {
    expect(textoDaConexao("desatualizado", t0, t0 + 121_000)).toBe("desatualizado há 2 min");
    expect(textoDaConexao("desatualizado", t0, t0 + 7 * 60_000 + 5)).toBe("desatualizado há 7 min");
    expect(textoDaConexao("desatualizado", t0, t0 + 1000)).toBe("desatualizado há 2 min");
  });
  it("relógio atrasado em relação à busca não dá número negativo", () => {
    expect(textoDaConexao("aovivo", t0 + 5000, t0)).toBe("ao vivo · atualizado agora");
  });
});

/** Uma conexão de mentira que o teste abre, derruba e alimenta à mão. */
class Falsa implements ConexaoLike {
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  fechada = false;
  close() {
    this.fechada = true;
  }
  abrir() {
    this.onopen?.();
  }
  receber(data: unknown) {
    this.onmessage?.({ data });
  }
  cair() {
    this.onclose?.();
  }
}

describe("criarTempoReal", () => {
  let conexoes: Falsa[];
  let buscas: number;
  let resultado: boolean;
  let situacoes: SituacaoDoTempoReal[];
  let agora: number;

  beforeEach(() => {
    vi.useFakeTimers();
    conexoes = [];
    buscas = 0;
    resultado = true;
    situacoes = [];
    agora = 5_000_000;
  });
  afterEach(() => vi.useRealTimers());

  const ligar = () =>
    criarTempoReal({
      abrir: () => {
        const c = new Falsa();
        conexoes.push(c);
        return c;
      },
      buscar: async () => {
        buscas++;
        return resultado;
      },
      aoMudar: (s) => situacoes.push(s),
      relogio: () => agora,
    });
  const ultimo = () => situacoes[situacoes.length - 1];
  const avancar = async (ms: number) => {
    agora += ms;
    await vi.advanceTimersByTimeAsync(ms);
  };

  it("fica ao vivo quando a conexão abre", () => {
    const t = ligar();
    t.iniciar();
    expect(ultimo().estado).toBe("reconectando");
    conexoes[0].abrir();
    expect(ultimo().estado).toBe("aovivo");
    t.parar();
  });

  it("junta avisos seguidos numa busca só, 1 segundo depois", async () => {
    const t = ligar();
    t.iniciar();
    conexoes[0].abrir();
    for (const n of [1, 2, 3]) conexoes[0].receber(JSON.stringify({ evento: "issues", numero: n }));
    await avancar(999);
    expect(buscas).toBe(0);
    await avancar(1);
    expect(buscas).toBe(1);
    conexoes[0].receber('{"evento":"label"}');
    await avancar(1000);
    expect(buscas).toBe(2);
    t.parar();
  });

  it("aviso de robô ou de branch não busca", async () => {
    const t = ligar();
    t.iniciar();
    conexoes[0].abrir();
    conexoes[0].receber('{"evento":"workflow_run"}');
    conexoes[0].receber('{"evento":"push"}');
    await avancar(5000);
    expect(buscas).toBe(0);
    t.parar();
  });

  it("só marca a hora da atualização quando a busca dá certo", async () => {
    const t = ligar();
    t.iniciar();
    conexoes[0].abrir();
    resultado = false;
    conexoes[0].receber('{"evento":"issues","numero":1}');
    await avancar(1000);
    expect(ultimo().ultimaAtualizacao).toBeNull();
    resultado = true;
    conexoes[0].receber('{"evento":"issues","numero":1}');
    await avancar(1000);
    expect(ultimo().ultimaAtualizacao).toBe(agora);
    t.parar();
  });

  it("se a conexão cair, reconecta em 1, 2, 5, 10 e 30 s, e zera a espera quando volta", async () => {
    const t = ligar();
    t.iniciar();
    conexoes[0].abrir();
    conexoes[0].cair();
    expect(ultimo().estado).toBe("reconectando");
    const esperas: number[] = [];
    for (const esperado of [1000, 2000, 5000, 10000, 30000, 30000]) {
      const antes = conexoes.length;
      await avancar(esperado - 1);
      expect(conexoes.length).toBe(antes);
      await avancar(1);
      expect(conexoes.length).toBe(antes + 1);
      esperas.push(esperado);
      conexoes[conexoes.length - 1].cair();
    }
    expect(esperas).toEqual([1000, 2000, 5000, 10000, 30000, 30000]);
    // volta: a espera recomeça em 1 s
    await avancar(30000);
    conexoes[conexoes.length - 1].abrir();
    expect(ultimo().estado).toBe("aovivo");
    conexoes[conexoes.length - 1].cair();
    const antes = conexoes.length;
    await avancar(1000);
    expect(conexoes.length).toBe(antes + 1);
    t.parar();
  });

  it("ao reconectar busca de novo (pode ter perdido avisos), mas na primeira conexão não", async () => {
    const t = ligar();
    t.iniciar();
    conexoes[0].abrir();
    expect(buscas).toBe(0);
    conexoes[0].cair();
    await avancar(1000);
    conexoes[1].abrir();
    await avancar(0);
    expect(buscas).toBe(1);
    t.parar();
  });

  it("de reserva, busca a cada 2 minutos mesmo sem aviso e sem conexão", async () => {
    const t = ligar();
    t.iniciar();
    await avancar(120_000);
    expect(buscas).toBe(1);
    await avancar(120_000);
    expect(buscas).toBe(2);
    t.parar();
  });

  it("busca quando a janela volta ao foco, e não faz duas buscas ao mesmo tempo", async () => {
    const t = ligar();
    t.iniciar();
    t.voltouAoFoco();
    t.voltouAoFoco();
    await avancar(0);
    expect(buscas).toBe(1);
    t.parar();
  });

  it("vira desatualizado sozinho quando passam mais de 2 minutos sem busca com sucesso, e volta ao buscar", async () => {
    const t = ligar();
    t.iniciar();
    conexoes[0].abrir();
    t.buscaFeita();
    resultado = false;
    await avancar(130_000);
    expect(ultimo().estado).toBe("desatualizado");
    resultado = true;
    t.voltouAoFoco();
    await avancar(0);
    expect(ultimo().estado).toBe("aovivo");
    t.parar();
  });

  it("parar fecha a conexão, cancela tudo e não reconecta", async () => {
    const t = ligar();
    t.iniciar();
    conexoes[0].abrir();
    conexoes[0].receber('{"evento":"issues","numero":1}');
    t.parar();
    expect(conexoes[0].fechada).toBe(true);
    conexoes[0].cair();
    await avancar(300_000);
    expect(conexoes.length).toBe(1);
    expect(buscas).toBe(0);
  });

  it("uma conexão velha que cai depois de trocada não derruba a nova", async () => {
    const t = ligar();
    t.iniciar();
    conexoes[0].abrir();
    conexoes[0].cair();
    await avancar(1000);
    conexoes[1].abrir();
    conexoes[0].cair();
    expect(ultimo().estado).toBe("aovivo");
    t.parar();
  });
  it("a Sala (#468) busca de novo num aviso de robô; a leva, não", async () => {
    const sala = criarTempoReal({
      abrir: () => {
        const c = new Falsa();
        conexoes.push(c);
        return c;
      },
      buscar: async () => {
        buscas++;
        return true;
      },
      aviso: avisoDaSala,
      aoMudar: (s) => situacoes.push(s),
      relogio: () => agora,
    });
    sala.iniciar();
    conexoes[0].abrir();
    conexoes[0].receber('{"evento":"create"}');
    conexoes[0].receber('{"evento":"workflow_run"}');
    await avancar(1000);
    expect(buscas).toBe(1);
    sala.parar();

    const leva = ligar();
    leva.iniciar();
    conexoes[1].abrir();
    conexoes[1].receber('{"evento":"workflow_run"}');
    await avancar(1500);
    expect(buscas).toBe(1);
    leva.parar();
  });

  it("atualizar busca na hora e conta como atualizado só se deu certo", async () => {
    const t = ligar();
    t.iniciar();
    conexoes[0].abrir();
    resultado = false;
    await t.atualizar();
    expect(buscas).toBe(1);
    expect(ultimo().ultimaAtualizacao).toBeNull();
    resultado = true;
    await t.atualizar();
    expect(ultimo().ultimaAtualizacao).toBe(agora);
    t.parar();
  });

  it("sem internet: reconectando e, passando de 2 minutos sem busca boa, desatualizado; ao voltar, ao vivo sozinho", async () => {
    const t = ligar();
    t.iniciar();
    conexoes[0].abrir();
    t.buscaFeita();
    resultado = false;
    conexoes[0].cair();
    expect(ultimo().estado).toBe("reconectando");
    await avancar(LIMITE_DESATUALIZADO_MS + 20_000);
    expect(ultimo().estado).toBe("desatualizado");
    resultado = true;
    await avancar(30_000);
    const nova = conexoes[conexoes.length - 1];
    nova.abrir();
    await avancar(0);
    expect(ultimo().estado).toBe("aovivo");
    t.parar();
  });
});
