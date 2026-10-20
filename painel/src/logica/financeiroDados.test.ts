import { describe, expect, it } from "vitest";
import {
  apagarLancamento,
  barrasDoGrafico,
  carregarFinanceiro,
  diaCurto,
  enviarLancamento,
  diaEmSaoPaulo,
  enderecoDoMes,
  lancamentoDoFormulario,
  mesDaBusca,
  mesSeguinteAte,
  salvarLancamento,
  textoDoCrescimento,
  valorParaEditar,
  type Lancamento,
} from "./financeiroDados";
import { centavosDoTexto, type TotalDoMes } from "./financeiro";

// Só valores obviamente fictícios: o repositório é público.
const total = (mes: string, entrou: number, saiu: number, cresc: number | null = null): TotalDoMes => ({
  mes, entrouCentavos: entrou, saiuCentavos: saiu, saldoCentavos: entrou - saiu, crescimentoPercentual: cresc,
});
const RESUMO = {
  mesAtual: total("2026-10", 1000, 400, 10),
  meses: [total("2026-09", 900, 300), total("2026-10", 1000, 400, 10)],
  saidasPorCategoria: [{ categoria: "Categoria X", saiuCentavos: 400 }],
};
const LANCAMENTO: Lancamento = {
  id: 1, data: "2026-10-05", tipo: "entrada", valorCentavos: 1000, categoriaId: 1, categoria: "Categoria X",
  descricao: "Teste", lancadoPor: "fulana", criadoEm: "2026-10-05T10:00:00.000Z", atualizadoEm: null,
};

const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });

/** Um fetch de mentira que anota o que foi pedido e responde pelo caminho. */
function buscaFalsa(respostas: Record<string, () => Response>) {
  const pedidos: { endereco: string; metodo: string; corpo?: string }[] = [];
  const buscar = async (endereco: string, init?: RequestInit) => {
    pedidos.push({ endereco, metodo: init?.method ?? "GET", corpo: typeof init?.body === "string" ? init.body : undefined });
    const chave = Object.keys(respostas).find((c) => endereco.startsWith(c));
    if (!chave) throw new Error(`pedido inesperado: ${endereco}`);
    return respostas[chave]();
  };
  return { buscar, pedidos };
}

describe("carregarFinanceiro (#654)", () => {
  it("quem não é dona: pede só o resumo e NUNCA a rota dos lançamentos", async () => {
    const { buscar, pedidos } = buscaFalsa({
      "/api/financeiro/resumo": () => resposta({ resumo: RESUMO, podeLancar: false }),
      "/api/financeiro/lancamentos": () => resposta({ lancamentos: [LANCAMENTO], categorias: [] }),
    });
    const estado = await carregarFinanceiro("2026-10", buscar);
    expect(estado).toEqual({ tipo: "pronto", mes: "2026-10", resumo: RESUMO, podeLancar: false, lista: null });
    expect(pedidos.map((p) => p.endereco)).toEqual(["/api/financeiro/resumo?mes=2026-10"]);
  });

  it("a dona: pede o resumo e depois os lançamentos do mesmo mês", async () => {
    const { buscar, pedidos } = buscaFalsa({
      "/api/financeiro/resumo": () => resposta({ resumo: RESUMO, podeLancar: true }),
      "/api/financeiro/lancamentos": () => resposta({ lancamentos: [LANCAMENTO], categorias: [{ id: 1, nome: "Categoria X" }] }),
    });
    const estado = await carregarFinanceiro("2026-09", buscar);
    expect(estado).toMatchObject({ tipo: "pronto", podeLancar: true, lista: { lancamentos: [LANCAMENTO], categorias: [{ id: 1, nome: "Categoria X" }] } });
    expect(pedidos.map((p) => p.endereco)).toEqual(["/api/financeiro/resumo?mes=2026-09", "/api/financeiro/lancamentos?mes=2026-09"]);
  });

  it("503 vira 'sem-banco' (o banco ainda não foi ligado), no resumo", async () => {
    const { buscar } = buscaFalsa({ "/api/financeiro/resumo": () => resposta({ ok: false, erro: "o banco do financeiro ainda não foi configurado" }, 503) });
    expect(await carregarFinanceiro("2026-10", buscar)).toEqual({ tipo: "sem-banco" });
  });

  it("401 vira 'fora' (sessão acabou), no resumo e na lista", async () => {
    const a = buscaFalsa({ "/api/financeiro/resumo": () => resposta({ ok: false }, 401) });
    expect(await carregarFinanceiro("2026-10", a.buscar)).toEqual({ tipo: "fora" });
    const b = buscaFalsa({
      "/api/financeiro/resumo": () => resposta({ resumo: RESUMO, podeLancar: true }),
      "/api/financeiro/lancamentos": () => resposta({ ok: false }, 401),
    });
    expect(await carregarFinanceiro("2026-10", b.buscar)).toEqual({ tipo: "fora" });
  });

  it("erro com frase do worker mostra a frase (com a primeira letra maiúscula); sem frase, uma frase calma", async () => {
    const a = buscaFalsa({ "/api/financeiro/resumo": () => resposta({ ok: false, erro: "o banco do financeiro não respondeu" }, 502) });
    expect(await carregarFinanceiro("2026-10", a.buscar)).toEqual({ tipo: "erro", mensagem: "O banco do financeiro não respondeu" });
    const b = buscaFalsa({ "/api/financeiro/resumo": () => new Response("<html>", { status: 500 }) });
    const estado = await carregarFinanceiro("2026-10", b.buscar);
    expect(estado.tipo).toBe("erro");
  });

  it("resposta fora do formato combinado vale como erro, nunca como zero", async () => {
    const { buscar } = buscaFalsa({ "/api/financeiro/resumo": () => resposta({ resumo: { meses: [] }, podeLancar: false }) });
    expect((await carregarFinanceiro("2026-10", buscar)).tipo).toBe("erro");
  });

  it("sem conexão: erro com frase de conexão", async () => {
    const buscar = async () => {
      throw new Error("sem rede");
    };
    expect(await carregarFinanceiro("2026-10", buscar)).toEqual({ tipo: "erro", mensagem: expect.stringContaining("conexão") });
  });
});

describe("lancamentoDoFormulario (#654)", () => {
  const base = { data: "2026-10-05", tipo: "saida", valor: "1.234,56", categoriaId: "3", descricao: "  Teste  " };

  it("'1.234,56' vira 123456 centavos, e o resto vai certo", () => {
    expect(lancamentoDoFormulario(base)).toEqual({
      ok: true,
      valor: { data: "2026-10-05", tipo: "saida", valorCentavos: 123456, categoriaId: 3, descricao: "Teste" },
    });
  });

  it("valor que não é número em reais volta com a frase", () => {
    const r = lancamentoDoFormulario({ ...base, valor: "abc" });
    expect(r).toEqual({ ok: false, erro: expect.stringContaining("valor") });
  });

  it("sem categoria escolhida volta a frase da validação do worker", () => {
    expect(lancamentoDoFormulario({ ...base, categoriaId: "" })).toEqual({ ok: false, erro: "Escolha uma categoria." });
  });

  it("valor zero é recusado", () => {
    expect(lancamentoDoFormulario({ ...base, valor: "0,00" }).ok).toBe(false);
  });
});

describe("salvarLancamento e apagarLancamento (#654)", () => {
  const dados = { data: "2026-10-05", tipo: "entrada" as const, valorCentavos: 123456, categoriaId: 3, descricao: "x" };

  it("novo: POST com os centavos no corpo", async () => {
    const { buscar, pedidos } = buscaFalsa({ "/api/financeiro/lancamentos": () => resposta({ lancamento: LANCAMENTO }, 201) });
    expect(await salvarLancamento(dados, null, buscar)).toEqual({ tipo: "ok" });
    expect(pedidos[0].endereco).toBe("/api/financeiro/lancamentos");
    expect(pedidos[0].metodo).toBe("POST");
    expect(JSON.parse(pedidos[0].corpo ?? "{}")).toEqual(dados);
  });

  it("editar: PUT no id", async () => {
    const { buscar, pedidos } = buscaFalsa({ "/api/financeiro/lancamentos/7": () => resposta({ lancamento: LANCAMENTO }) });
    expect(await salvarLancamento(dados, 7, buscar)).toEqual({ tipo: "ok" });
    expect(pedidos[0].metodo).toBe("PUT");
  });

  it("erro do worker mostra a frase dele", async () => {
    const { buscar } = buscaFalsa({ "/api/financeiro/lancamentos": () => resposta({ ok: false, erro: "categoria não existe" }, 400) });
    expect(await salvarLancamento(dados, null, buscar)).toEqual({ tipo: "erro", mensagem: "Categoria não existe" });
  });

  it("apagar: DELETE no id; 401 vira 'fora'", async () => {
    const a = buscaFalsa({ "/api/financeiro/lancamentos/7": () => resposta({ ok: true }) });
    expect(await apagarLancamento(7, a.buscar)).toEqual({ tipo: "ok" });
    expect(a.pedidos[0].metodo).toBe("DELETE");
    const b = buscaFalsa({ "/api/financeiro/lancamentos/7": () => resposta({ ok: false }, 401) });
    expect(await apagarLancamento(7, b.buscar)).toEqual({ tipo: "fora" });
  });

  it("apagar com id inválido nem faz o pedido", async () => {
    const { buscar, pedidos } = buscaFalsa({});
    expect((await apagarLancamento(0, buscar)).tipo).toBe("erro");
    expect(pedidos).toEqual([]);
  });
});

describe("o mês da página (#654)", () => {
  const AGORA = new Date("2026-10-20T15:00:00Z");

  it("sem ?mes=, é o mês de hoje em São Paulo; com ?mes= bom, é ele", () => {
    expect(mesDaBusca("", AGORA)).toBe("2026-10");
    expect(mesDaBusca("?mes=2026-08", AGORA)).toBe("2026-08");
  });

  it("?mes= torto cai no mês de hoje", () => {
    expect(mesDaBusca("?mes=2026-13", AGORA)).toBe("2026-10");
    expect(mesDaBusca("?mes=abc", AGORA)).toBe("2026-10");
  });

  it("virada de mês em São Paulo: 01h UTC do dia 1 ainda é o mês anterior lá", () => {
    expect(mesDaBusca("", new Date("2026-11-01T01:00:00Z"))).toBe("2026-10");
  });

  it("o endereço do mês", () => {
    expect(enderecoDoMes("2026-09")).toBe("/financeiro?mes=2026-09");
  });

  it("o dia de hoje do formulário é o de São Paulo, não o de UTC", () => {
    expect(diaEmSaoPaulo(new Date("2026-11-01T01:00:00Z"))).toBe("2026-10-31");
    expect(diaEmSaoPaulo(new Date("2026-10-20T15:00:00Z"))).toBe("2026-10-20");
  });
});

describe("textoDoCrescimento (#654)", () => {
  it("null é traço; positivo leva +; zero e negativo, não", () => {
    expect(textoDoCrescimento(null)).toBe("—");
    expect(textoDoCrescimento(12.5)).toBe("+12,5%");
    expect(textoDoCrescimento(0)).toBe("0%");
    expect(textoDoCrescimento(-3)).toBe("-3%");
  });
});

describe("barrasDoGrafico (#654)", () => {
  it("a maior barra é 100 e as outras são proporcionais ao maior valor de toda a série", () => {
    const b = barrasDoGrafico([total("2026-09", 500, 250), total("2026-10", 1000, 100)]);
    expect(b.map((x) => [x.entrouPct, x.saiuPct])).toEqual([[50, 25], [100, 10]]);
  });

  it("valor pequeno mas maior que zero ainda aparece (no mínimo 2); zero é zero", () => {
    const b = barrasDoGrafico([total("2026-09", 100000, 1), total("2026-10", 0, 0)]);
    expect(b[0].saiuPct).toBe(2);
    expect(b[1].entrouPct).toBe(0);
  });

  it("série toda zerada não divide por zero", () => {
    expect(barrasDoGrafico([total("2026-10", 0, 0)])[0]).toMatchObject({ entrouPct: 0, saiuPct: 0 });
  });

  it("rótulo curto do mês e texto de cada valor", () => {
    const [b] = barrasDoGrafico([total("2026-10", 123456, 0)]);
    expect(b.rotulo).toBe("out");
    expect(b.nomeCompleto).toBe("out/2026");
    expect(b.entrouTexto).toBe("R$ 1.234,56");
    expect(b.saiuTexto).toBe("R$ 0,00");
  });
});

describe("pequenos textos da página (#654)", () => {
  it("valorParaEditar: centavos viram o texto que o formulário entende de volta", () => {
    expect(valorParaEditar(123456)).toBe("1.234,56");
    expect(valorParaEditar(5)).toBe("0,05");
    expect(centavosDoTexto(valorParaEditar(123456))).toBe(123456);
  });

  it("diaCurto: '2026-10-05' vira '05/10'", () => {
    expect(diaCurto("2026-10-05")).toBe("05/10");
  });

  it("mesSeguinteAte: avança até o mês de hoje (São Paulo) e para; depois dele é null", () => {
    const agora = new Date("2026-10-20T15:00:00Z");
    expect(mesSeguinteAte("2026-09", agora)).toBe("2026-10");
    expect(mesSeguinteAte("2026-10", agora)).toBeNull();
    expect(mesSeguinteAte("2026-12", agora)).toBeNull();
    expect(mesSeguinteAte("2025-12", agora)).toBe("2026-01");
  });
});

describe("enviarLancamento: do formulário até o pedido (#654)", () => {
  const campos = { data: "2026-10-05", tipo: "saida", valor: "1.234,56", categoriaId: "3", descricao: "Teste" };

  it("o texto '1.234,56' chega ao worker como 123456 centavos", async () => {
    const { buscar, pedidos } = buscaFalsa({ "/api/financeiro/lancamentos": () => resposta({ lancamento: LANCAMENTO }, 201) });
    expect(await enviarLancamento(campos, null, buscar)).toEqual({ tipo: "ok" });
    expect(JSON.parse(pedidos[0].corpo ?? "{}")).toEqual({ data: "2026-10-05", tipo: "saida", valorCentavos: 123456, categoriaId: 3, descricao: "Teste" });
  });

  it("formulário torto: devolve a frase e NÃO faz pedido nenhum", async () => {
    const { buscar, pedidos } = buscaFalsa({});
    expect(await enviarLancamento({ ...campos, valor: "abc" }, null, buscar)).toEqual({ tipo: "erro", mensagem: expect.stringContaining("valor") });
    expect(pedidos).toEqual([]);
  });
});
