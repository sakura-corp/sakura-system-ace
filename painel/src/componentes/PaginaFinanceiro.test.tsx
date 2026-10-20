import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EstadoDoFinanceiro, Lancamento } from "../logica/financeiroDados";
import type { TotalDoMes } from "../logica/financeiro";
import { PaginaFinanceiro } from "./PaginaFinanceiro";

// Só valores obviamente fictícios: o repositório é público.
const AGORA = new Date("2026-10-20T15:00:00Z");
const total = (mes: string, entrou: number, saiu: number, cresc: number | null = null): TotalDoMes => ({
  mes, entrouCentavos: entrou, saiuCentavos: saiu, saldoCentavos: entrou - saiu, crescimentoPercentual: cresc,
});
const RESUMO = {
  mesAtual: total("2026-10", 123456, 50000, 12.5),
  meses: [total("2026-09", 100000, 20000), total("2026-10", 123456, 50000, 12.5)],
  saidasPorCategoria: [{ categoria: "Categoria Alfa", saiuCentavos: 30000 }, { categoria: "Categoria Beta", saiuCentavos: 20000 }],
};
const LANCAMENTO: Lancamento = {
  id: 7, data: "2026-10-05", tipo: "saida", valorCentavos: 30000, categoriaId: 1, categoria: "Categoria Alfa",
  descricao: "Descrição de teste", lancadoPor: "fulana", criadoEm: "2026-10-05T10:00:00.000Z", atualizadoEm: null,
};
const CATEGORIAS = [{ id: 1, nome: "Categoria Alfa" }, { id: 2, nome: "Categoria Beta" }];

const pronto = (podeLancar: boolean, mes = "2026-10"): EstadoDoFinanceiro => ({
  tipo: "pronto", mes, resumo: RESUMO, podeLancar,
  lista: podeLancar ? { lancamentos: [LANCAMENTO], categorias: CATEGORIAS } : null,
});

const html = (estado: EstadoDoFinanceiro, mes = "2026-10") =>
  renderToString(<PaginaFinanceiro estado={estado} mes={mes} agora={AGORA} tentarDeNovo={() => {}} aoMudar={async () => true} />).replace(/<!-- -->/g, "");
const texto = (h: string) => h.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

describe("Página Financeiro (#654)", () => {
  it("quem não é dona vê os totais, as saídas por categoria e o gráfico", () => {
    const t = texto(html(pronto(false)));
    expect(t).toContain("R$ 1.234,56");
    expect(t).toContain("R$ 500,00");
    expect(t).toContain("R$ 734,56");
    expect(t).toContain("+12,5%");
    expect(t).toContain("Categoria Alfa");
    expect(t).toContain("R$ 300,00");
    expect(t).toContain("set/2026");
  });

  it("quem não é dona NÃO vê formulário, lista, editar nem apagar", () => {
    const h = html(pronto(false));
    expect(h).not.toContain("<form");
    expect(h).not.toContain("<dialog");
    expect(texto(h)).not.toContain("Lançamentos do mês");
    expect(texto(h)).not.toContain("Lançar");
    expect(texto(h)).not.toContain("Editar");
    expect(texto(h)).not.toContain("Apagar");
  });

  it("a dona vê o formulário (dia de hoje em São Paulo), a lista e os botões", () => {
    const h = html(pronto(true));
    const t = texto(h);
    expect(h).toContain("<form");
    expect(h).toContain('value="2026-10-20"');
    expect(t).toContain("Lançamentos do mês");
    expect(t).toContain("Descrição de teste");
    expect(t).toContain("05/10");
    expect(t).toContain("Editar");
    expect(t).toContain("Apagar");
    expect(t).toContain("Categoria Beta");
  });

  it("apagar pede confirmação num diálogo da própria página (nunca confirm do navegador)", () => {
    const h = html(pronto(true));
    expect(h).toContain("<dialog");
    expect(texto(h)).toContain("Apagar este lançamento?");
  });

  it("503: a frase calma do banco que ainda não foi ligado, sem totais", () => {
    const h = html({ tipo: "sem-banco" });
    expect(texto(h)).toContain("O banco do financeiro ainda não foi ligado");
    expect(texto(h)).not.toContain("Entrou");
  });

  it("erro: mostra a frase e o botão de tentar de novo", () => {
    const h = html({ tipo: "erro", mensagem: "O banco do financeiro não respondeu" });
    expect(texto(h)).toContain("O banco do financeiro não respondeu");
    expect(texto(h)).toContain("Tentar de novo");
  });

  it("carregando: aviso pra leitor de tela, sem totais", () => {
    const h = html({ tipo: "carregando" });
    expect(h).toContain('role="status"');
    expect(texto(h)).not.toContain("Entrou");
  });

  it("o gráfico tem texto alternativo e uma tabela com os números", () => {
    const h = html(pronto(false));
    expect(h).toMatch(/role="img"[^>]*aria-label="Entradas e saídas mês a mês/);
    expect(h).toContain("<table");
    expect(texto(h)).toContain("out/2026");
    expect(texto(h)).toContain("Ver os números em tabela");
  });

  it("o gráfico tem legenda com as duas séries", () => {
    const t = texto(html(pronto(false)));
    expect(t).toMatch(/Entrou.*Saiu/);
  });

  it("seletor de mês: no mês de hoje só tem 'anterior'; num mês antigo tem os dois", () => {
    const hoje = html(pronto(false));
    expect(hoje).toContain('href="/financeiro?mes=2026-09"');
    expect(hoje).not.toContain('href="/financeiro?mes=2026-11"');
    const antigo = html(pronto(false, "2026-08"), "2026-08");
    expect(antigo).toContain('href="/financeiro?mes=2026-07"');
    expect(antigo).toContain('href="/financeiro?mes=2026-09"');
  });

  it("crescimento sem base é traço", () => {
    const sem: EstadoDoFinanceiro = { ...(pronto(false) as Extract<EstadoDoFinanceiro, { tipo: "pronto" }>), resumo: { ...RESUMO, mesAtual: total("2026-10", 100, 0, null) } };
    expect(texto(html(sem))).toContain("—");
  });
});
