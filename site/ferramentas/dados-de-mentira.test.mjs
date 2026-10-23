import { describe, expect, it } from "vitest";
import { filtrarComoOSupabase } from "./banco-falso.mjs";

// O banco falso responde as telas geradas (site, catálogo, varreduras de
// contraste e largura) e as fotos da apresentação. Quando ele ignora um
// pedaço da consulta, a tela mostra uma contradição que a loja de verdade não
// tem (#777: a venda de balcão com as notas de todas as OS, o estoque fora de
// ordem). Estes testes são o "do mesmo jeito que o Supabase" da #780.

const consulta = (texto) => new URL("https://demo.supabase.co/rest/v1/x?" + texto).searchParams;

describe("banco falso: filtros e ordem como o Supabase", () => {
  const linhas = [
    { id: "a", os: "os1", data: "2026-10-03T10:00:00Z", n: 2 },
    { id: "b", os: "os2", data: "2026-10-23T09:00:00Z", n: 10 },
    { id: "c", os: null, data: "2026-10-11T15:00:00Z", n: 1 },
    { id: "d", os: "os1", data: "2026-10-23T09:00:00Z", n: 3 },
  ];

  it("`.in()` só devolve as linhas da lista (nulo fica de fora)", () => {
    const r = filtrarComoOSupabase(linhas, consulta("os=in.(os1,os9)"));
    expect(r.map((l) => l.id)).toEqual(["a", "d"]);
  });

  it("`.in()` aceita os valores entre aspas", () => {
    const r = filtrarComoOSupabase(linhas, consulta('os=in.("os2")'));
    expect(r.map((l) => l.id)).toEqual(["b"]);
  });

  it("`.eq()` não deixa passar a linha com o campo nulo", () => {
    const r = filtrarComoOSupabase(linhas, consulta("os=eq.os1"));
    expect(r.map((l) => l.id)).toEqual(["a", "d"]);
  });

  it("ordena por mais de uma coluna, com desempate", () => {
    const r = filtrarComoOSupabase(linhas, consulta("order=data.desc,id.asc"));
    expect(r.map((l) => l.id)).toEqual(["b", "d", "c", "a"]);
  });

  it("ordena número como número, não como texto", () => {
    const r = filtrarComoOSupabase(linhas, consulta("order=n.asc"));
    expect(r.map((l) => l.n)).toEqual([1, 2, 3, 10]);
  });

  it("respeita o limite e o deslocamento (`.range()` e `.limit()`)", () => {
    const r = filtrarComoOSupabase(linhas, consulta("order=id.asc&offset=1&limit=2"));
    expect(r.map((l) => l.id)).toEqual(["b", "c"]);
  });

  it("não mexe na lista original", () => {
    filtrarComoOSupabase(linhas, consulta("order=id.desc"));
    expect(linhas.map((l) => l.id)).toEqual(["a", "b", "c", "d"]);
  });
});

// As contas da loja inventada têm que fechar entre as telas: cada teste
// abaixo é um item do levantamento da #777 que a #780 consertou.
describe("dados de mentira: as telas não se contradizem", async () => {
  const { TABELAS } = await import("./dados-demo.mjs");
  const ordens = TABELAS.ordens_servico.filter((o) => !["orcamento", "recusado"].includes(o.status));
  const ordemPorId = new Map(ordens.map((o) => [o.id, o]));
  const total = (o) => o.itens.reduce((t, i) => t + i.quantidade * i.preco_unitario - i.desconto, 0);
  const centavos = (v) => Math.round(v * 100);
  const custoPeca = new Map(TABELAS.pecas.map((p) => [p.id, p.preco_custo]));
  const custoServico = new Map(TABELAS.servicos.map((s) => [s.id, s.custo]));
  const custo = (o) =>
    o.itens.reduce((t, i) => t + i.quantidade * ((i.peca_id ? custoPeca.get(i.peca_id) : custoServico.get(i.servico_id)) ?? 0), 0);
  const entradasDeOs = TABELAS.caixa_movimentos.filter((m) => m.tipo === "entrada" && m.ordem_servico_id);

  it("item 1: cada nota é de uma OS faturada, e cada OS faturada tem as notas que precisa", () => {
    for (const nota of TABELAS.notas_fiscais_arquivos) {
      if (!nota.ordem_servico_id) continue;
      expect(ordemPorId.get(nota.ordem_servico_id)?.status, nota.id).toBe("faturada");
    }
    for (const o of ordens.filter((x) => x.status === "faturada" && x.data_fechamento > new Date(Date.now() - 40 * 864e5).toISOString())) {
      const validas = TABELAS.notas_fiscais_arquivos.filter((n) => n.ordem_servico_id === o.id && n.status !== "cancelado");
      const temPeca = o.itens.some((i) => i.tipo === "peca");
      const temServico = o.itens.some((i) => i.tipo === "servico");
      expect(validas.filter((n) => n.tipo === "nfe").length, `NFC-e da ${o.numero}`).toBe(temPeca ? 1 : 0);
      expect(validas.filter((n) => n.tipo === "nfse").length, `NFS-e da ${o.numero}`).toBe(temServico ? 1 : 0);
    }
  });

  it("item 2: o lançamento de OS no caixa traz a OS (número, cliente, itens) e o valor dela", () => {
    expect(entradasDeOs.length).toBeGreaterThan(10);
    for (const m of entradasDeOs) {
      expect(m.ordem_servico?.numero, m.id).toBeTypeOf("number");
      expect(m.ordem_servico?.cliente?.nome, m.id).toBeTruthy();
      expect(centavos(total(m.ordem_servico)), m.id).toBe(centavos(m.valor));
    }
  });

  it("item 2: o lucro do dia não é igual à venda do dia", () => {
    const hoje = new Date().toLocaleDateString("sv-SE");
    const deHoje = entradasDeOs.filter((m) => new Date(m.data).toLocaleDateString("sv-SE") === hoje);
    expect(deHoje.length).toBeGreaterThan(0);
    const custoDeHoje = deHoje.reduce((t, m) => t + custo(m.ordem_servico), 0);
    expect(custoDeHoje).toBeGreaterThan(0);
  });

  it("item 3: toda venda do caixa é uma OS que Relações → Lucratividade também enxerga", () => {
    for (const m of entradasDeOs) {
      expect(ordemPorId.has(m.ordem_servico_id), m.id).toBe(true);
    }
  });

  it("item 3: no mês, Lucratividade só passa das vendas do caixa pelo que ainda não foi recebido", () => {
    const inicioDoMes = new Date();
    inicioDoMes.setDate(1);
    const mes = inicioDoMes.toLocaleDateString("sv-SE").slice(0, 7);
    const doMes = (iso) => new Date(iso).toLocaleDateString("sv-SE").slice(0, 7) === mes;
    // Todas as entradas, como o Início e os Gráficos somam (não só as de OS).
    const vendasDoCaixa = TABELAS.caixa_movimentos
      .filter((m) => m.tipo === "entrada" && doMes(m.data))
      .reduce((t, m) => t + m.valor, 0);
    const pagas = new Set(entradasDeOs.map((m) => m.ordem_servico_id));
    const ordensDoMes = ordens.filter((o) => doMes(o.data_abertura));
    const receita = ordensDoMes.reduce((t, o) => t + total(o), 0);
    const naoRecebidas = ordensDoMes.filter((o) => !pagas.has(o.id)).reduce((t, o) => t + total(o), 0);
    expect(centavos(receita - naoRecebidas)).toBe(centavos(vendasDoCaixa));
  });

  it("item 4: OS com conta a receber pendente não está no caixa", () => {
    for (const conta of TABELAS.contas_receber.filter((c) => c.status === "pendente" && c.ordem_servico_id)) {
      expect(entradasDeOs.some((m) => m.ordem_servico_id === conta.ordem_servico_id), conta.id).toBe(false);
    }
  });

  it("item 5: a auditoria diz quem mexeu", () => {
    for (const r of TABELAS.auditoria) expect(r.operador_nome, r.id).toBeTruthy();
  });

  it("item 6: toda peça lançada em OS recente sai do estoque, e o saldo nunca fica negativo", () => {
    const desde = new Date(Date.now() - 28 * 864e5).toISOString();
    for (const o of ordens.filter((x) => x.data_abertura > desde)) {
      for (const i of o.itens.filter((x) => x.tipo === "peca")) {
        const saida = TABELAS.estoque_movimentos.find(
          (m) => m.tipo === "saida" && m.peca_id === i.peca_id && m.referencia?.endsWith(" " + o.numero),
        );
        expect(saida?.quantidade, `${i.descricao} da ${o.numero}`).toBe(i.quantidade);
      }
    }
    const saldo = new Map();
    for (const m of [...TABELAS.estoque_movimentos].sort((a, b) => (a.criado_em < b.criado_em ? -1 : 1))) {
      const novo = (saldo.get(m.peca_id) ?? 0) + (m.tipo === "entrada" ? m.quantidade : -m.quantidade);
      expect(novo, m.id).toBeGreaterThanOrEqual(0);
      saldo.set(m.peca_id, novo);
    }
  });

  it("item 6: as movimentações não saem todas na mesma hora", () => {
    const horas = new Set(TABELAS.estoque_movimentos.map((m) => new Date(m.criado_em).toTimeString().slice(0, 5)));
    expect(horas.size).toBeGreaterThan(10);
  });

  it("item 6: a contagem com diferença mexe no saldo", () => {
    for (const c of TABELAS.contagens_estoque.filter((x) => x.diferenca !== 0)) {
      const ajuste = TABELAS.estoque_movimentos.find(
        (m) => m.motivo === "ajuste" && m.peca_id === c.peca_id && m.criado_em >= c.criado_em,
      );
      expect(ajuste?.quantidade, c.id).toBe(Math.abs(c.diferenca));
    }
  });

  it("item 7: lançamento manual, conta a pagar e serviço têm categoria", () => {
    const manuais = TABELAS.caixa_movimentos.filter((m) => !m.ordem_servico_id);
    expect(manuais.length).toBeGreaterThan(0);
    for (const m of manuais) expect(m.categoria?.nome, m.id).toBeTruthy();
    for (const c of TABELAS.contas_pagar) expect(c.categoria?.nome, c.id).toBeTruthy();
    for (const s of TABELAS.servicos) expect(s.categoria_id, s.id).toBeTruthy();
  });

  it("item 11: quem 'sumiu' não está com OS aberta", () => {
    const seisMeses = new Date(Date.now() - 182 * 864e5).toISOString();
    const clientes = new Set(ordens.map((o) => o.cliente_id));
    for (const cliente of clientes) {
      const faturadas = ordens.filter((o) => o.cliente_id === cliente && o.status === "faturada");
      const ultima = faturadas.map((o) => o.data_fechamento).sort().at(-1);
      if (!ultima || ultima > seisMeses) continue;
      const abertas = ordens.filter((o) => o.cliente_id === cliente && o.status !== "faturada");
      expect(abertas.map((o) => o.numero), cliente).toEqual([]);
    }
  });

  // Achados do tester da #780 nas fotos (não estavam no levantamento).
  it("o Início compara com um mês passado de verdade, não com quase nada (o '+999%')", () => {
    const agora = new Date();
    const diaDoMes = agora.getDate();
    const naJanela = (iso, mesesAtras) => {
      const d = new Date(iso);
      const ref = new Date(agora.getFullYear(), agora.getMonth() - mesesAtras, 1);
      return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() <= diaDoMes;
    };
    const entradas = TABELAS.caixa_movimentos.filter((m) => m.tipo === "entrada");
    const soma = (meses) => entradas.filter((m) => naJanela(m.data, meses)).reduce((t, m) => t + m.valor, 0);
    const variacao = (soma(0) - soma(1)) / soma(1);
    // Nos primeiros dias do mês, um dia contra um dia pode variar à vontade
    // (como numa loja de verdade); a partir do dia 5 a soma já se compara.
    if (diaDoMes >= 5) expect(Math.abs(variacao)).toBeLessThan(0.5);
    else expect(soma(1)).toBeGreaterThan(0);
  });

  it("ninguém é atendido de madrugada nem no domingo", () => {
    const passadas = ordens.filter((o) => o.status === "faturada");
    const hoje = new Date().toLocaleDateString("sv-SE");
    for (const o of passadas) {
      const d = new Date(o.data_abertura);
      // As de hoje são de hoje, seja que dia for; só não podem ser antes das 8h.
      if (d.toLocaleDateString("sv-SE") !== hoje) expect(d.getDay(), `OS ${o.numero}`).not.toBe(0);
      if (d.toLocaleDateString("sv-SE") !== hoje || new Date().getHours() >= 8) {
        expect(d.getHours(), `OS ${o.numero}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("o dia do recebimento na conta é o mesmo do lançamento no caixa", () => {
    for (const c of TABELAS.contas_receber.filter((x) => x.caixa_movimento_id)) {
      const m = TABELAS.caixa_movimentos.find((x) => x.id === c.caixa_movimento_id);
      expect(new Date(m.data).toLocaleDateString("sv-SE"), c.id).toBe(c.data_recebimento);
    }
  });
});
