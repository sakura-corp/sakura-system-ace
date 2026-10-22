import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { Peca } from "@/types/peca";
import { acharPecasParecidas, type PecaComparavel } from "./pecaParecida";
import {
  CAMPOS_JUNTAVEIS,
  camposDaQueSai,
  camposDiferentes,
  escolhasPadrao,
  lerResumo,
  paresSuspeitos,
  previaDaJuntada,
  quemFicaPorPadrao,
  type ResumoPecaJuntar,
  pecaDepoisDaJuntada,
} from "./juntarPecas";

function peca(p: Partial<Peca> = {}): Peca {
  return {
    id: "p",
    codigo_interno: null,
    codigo_barras: null,
    descricao: "Pneu 175/70 R13 Pirelli",
    marca: null,
    modelo: null,
    aplicacao: null,
    unidade: "UN",
    preco_custo: null,
    preco_venda: null,
    ncm: null,
    cest: null,
    cfop_padrao: null,
    origem: null,
    cst_ou_csosn: null,
    aliquota_icms: null,
    categoria_id: null,
    prazo_garantia_dias: null,
    estoque_minimo: null,
    medida: null,
    indice_carga_velocidade: null,
    dot: null,
    ativo: true,
    criado_em: "2026-01-01T10:00:00+00:00",
    ...p,
  };
}

/** Só os nomes dos campos diferentes, pra ler o teste sem ruído. */
function nomes(fica: Peca, sai: Peca): string[] {
  return camposDiferentes(fica, sai).map((d) => d.campo);
}

describe("CAMPOS_JUNTAVEIS", () => {
  // A tela oferece os campos; quem aceita ou recusa é a lista `v_permitidos`
  // da função do banco. Se uma mudar sem a outra, a tela oferece um campo que
  // o banco recusa (ou esconde um que ele aceita). Lido do .sql de verdade.
  it("é a mesma lista que a função juntar_pecas aceita (0067)", () => {
    const sql = readFileSync("supabase/migrations/0067_juntar_pecas.sql", "utf8");
    const bloco = sql.match(/v_permitidos constant text\[\] := array\[([^\]]*)\]/);
    expect(bloco).not.toBeNull();
    const doBanco = [...bloco![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    expect(CAMPOS_JUNTAVEIS.map((c) => c.campo).sort()).toEqual(doBanco);
  });

  it("é a lista fechada da RPC, com o rótulo da tela de Produtos", () => {
    expect(CAMPOS_JUNTAVEIS.map((c) => c.campo)).toEqual([
      "descricao",
      "codigo_barras",
      "codigo_interno",
      "marca",
      "modelo",
      "unidade",
      "categoria_id",
      "estoque_minimo",
      "prazo_garantia_dias",
      "aplicacao",
      "preco_custo",
      "preco_venda",
      "ncm",
      "cest",
      "cfop_padrao",
      "origem",
      "cst_ou_csosn",
      "aliquota_icms",
      "medida",
      "indice_carga_velocidade",
      "dot",
    ]);
    const rotulo = Object.fromEntries(CAMPOS_JUNTAVEIS.map((c) => [c.campo, c.rotulo]));
    expect(rotulo.codigo_interno).toBe("Referência");
    expect(rotulo.codigo_barras).toBe("Código de barras");
    expect(rotulo.preco_venda).toBe("Preço venda");
  });
});

describe("camposDiferentes", () => {
  it("peças iguais não têm campo diferente", () => {
    expect(camposDiferentes(peca({ id: "a" }), peca({ id: "b" }))).toEqual([]);
  });

  it("acha o campo diferente e devolve os dois valores, com o rótulo", () => {
    const r = camposDiferentes(peca({ marca: "Pirelli" }), peca({ marca: "Goodyear" }));
    expect(r).toEqual([{ campo: "marca", rotulo: "Marca", fica: "Pirelli", sai: "Goodyear" }]);
  });

  it("null, undefined e texto vazio contam como vazio e iguais entre si", () => {
    const sai = peca({ marca: "", modelo: "   " });
    (sai as unknown as Record<string, unknown>).aplicacao = undefined;
    expect(nomes(peca({ marca: null, modelo: null, aplicacao: null }), sai)).toEqual([]);
  });

  it("texto é comparado sem os espaços das pontas, mas o resto conta", () => {
    expect(nomes(peca({ ncm: "40111000" }), peca({ ncm: " 40111000 " }))).toEqual([]);
    expect(nomes(peca({ marca: "Pirelli" }), peca({ marca: "PIRELLI" }))).toEqual(["marca"]);
  });

  it("vazio de um lado e preenchido do outro é diferente", () => {
    expect(nomes(peca({ codigo_barras: null }), peca({ codigo_barras: "789123" }))).toEqual([
      "codigo_barras",
    ]);
  });

  it("número é comparado como número: '10.00' é igual a 10", () => {
    const fica = peca({ preco_venda: 10, aliquota_icms: 18 });
    const sai = peca({ preco_venda: "10.00", aliquota_icms: "18.0" } as unknown as Partial<Peca>);
    expect(nomes(fica, sai)).toEqual([]);
    expect(nomes(peca({ preco_custo: 10 }), peca({ preco_custo: 10.5 }))).toEqual(["preco_custo"]);
  });

  it("zero é valor, não vazio", () => {
    expect(nomes(peca({ estoque_minimo: 0 }), peca({ estoque_minimo: null }))).toEqual([
      "estoque_minimo",
    ]);
  });

  it("código só com números continua texto: '0012' é diferente de '12'", () => {
    expect(nomes(peca({ codigo_interno: "0012" }), peca({ codigo_interno: "12" }))).toEqual([
      "codigo_interno",
    ]);
  });
});

describe("escolhasPadrao", () => {
  it("cada campo diferente fica com o valor da peça que fica", () => {
    const fica = peca({ preco_venda: 300, marca: "Pirelli" });
    const sai = peca({ preco_venda: 280, marca: "PIRELLI" });
    expect(escolhasPadrao(fica, sai)).toEqual({ marca: "fica", preco_venda: "fica" });
  });

  it("se a que fica está vazia e a que sai não, o padrão é trazer da que sai", () => {
    const fica = peca({ codigo_barras: null, ncm: "", estoque_minimo: null });
    const sai = peca({ codigo_barras: "789123", ncm: "40111000", estoque_minimo: 0 });
    expect(escolhasPadrao(fica, sai)).toEqual({
      codigo_barras: "sai",
      estoque_minimo: "sai",
      ncm: "sai",
    });
  });

  it("se a que sai está vazia, nunca apaga o que a que fica tem", () => {
    expect(escolhasPadrao(peca({ marca: "Pirelli" }), peca({ marca: null }))).toEqual({
      marca: "fica",
    });
  });

  it("campo igual não entra nas escolhas", () => {
    expect(escolhasPadrao(peca({ preco_venda: 10 }), peca({ preco_venda: 10 }))).toEqual({});
  });
});

describe("camposDaQueSai", () => {
  it("é só o que foi escolhido da peça que sai, na ordem da tela", () => {
    expect(
      camposDaQueSai({ ncm: "sai", marca: "fica", codigo_barras: "sai", preco_venda: "fica" }),
    ).toEqual(["codigo_barras", "ncm"]);
  });

  it("sem escolha nenhuma, a lista é vazia (a RPC recebe '{}')", () => {
    expect(camposDaQueSai({})).toEqual([]);
  });
});

describe("pecaDepoisDaJuntada", () => {
  it("fica com o valor escolhido de cada lado e o resto da peça que fica", () => {
    const fica = peca({ id: "f", descricao: "Pneu 175/70 R13 Pirelli", preco_venda: 300, ncm: null });
    const sai = peca({ id: "s", descricao: "PNEU 175 70 13 PIRELLI", preco_venda: 280, ncm: "40111000" });
    const depois = pecaDepoisDaJuntada(fica, sai, { preco_venda: "sai", ncm: "sai", descricao: "fica" });
    expect(depois.id).toBe("f");
    expect(depois.descricao).toBe("Pneu 175/70 R13 Pirelli");
    expect(depois.preco_venda).toBe(280);
    expect(depois.ncm).toBe("40111000");
  });

  it("continua ativa se qualquer uma das duas estava ativa", () => {
    expect(pecaDepoisDaJuntada(peca({ ativo: false }), peca({ ativo: true }), {}).ativo).toBe(true);
    expect(pecaDepoisDaJuntada(peca({ ativo: true }), peca({ ativo: false }), {}).ativo).toBe(true);
    expect(pecaDepoisDaJuntada(peca({ ativo: false }), peca({ ativo: false }), {}).ativo).toBe(false);
  });

  it("não muda as peças recebidas", () => {
    const fica = peca({ preco_venda: 300 });
    pecaDepoisDaJuntada(fica, peca({ preco_venda: 280 }), { preco_venda: "sai" });
    expect(fica.preco_venda).toBe(300);
  });
});

describe("lerResumo", () => {
  it("lê o resumo completo, com número vindo como número ou como texto", () => {
    const r = lerResumo({
      lojas_sem_acesso: 0,
      movimentos: "7",
      itens_os: 14,
      os: 12,
      contagens: "1",
      itens_compra: 3,
      compras: "3",
      cotacoes: 0,
      estoque: [
        { loja_id: "l1", loja_nome: "Matriz", saldo: "4.50" },
        { loja_id: "l2", loja_nome: "Filial", saldo: -1 },
      ],
    });
    expect(r).toEqual({
      lojas_sem_acesso: 0,
      movimentos: 7,
      itens_os: 14,
      os: 12,
      contagens: 1,
      itens_compra: 3,
      compras: 3,
      cotacoes: 0,
      estoque: [
        { loja_id: "l1", loja_nome: "Matriz", saldo: 4.5 },
        { loja_id: "l2", loja_nome: "Filial", saldo: -1 },
      ],
    });
  });

  it("quando o admin não cuida de alguma loja, vem só isso e o resto fica zerado", () => {
    expect(lerResumo({ lojas_sem_acesso: 2 })).toEqual({
      lojas_sem_acesso: 2,
      movimentos: 0,
      itens_os: 0,
      os: 0,
      contagens: 0,
      itens_compra: 0,
      compras: 0,
      cotacoes: 0,
      estoque: [],
    });
  });

  it("saldo com cauda de ponto flutuante fecha em 2 casas, como a coluna numeric(12,2)", () => {
    const r = lerResumo({ lojas_sem_acesso: 0, estoque: [{ loja_id: "l", loja_nome: "L", saldo: 0.1 + 0.2 }] });
    expect(r.estoque[0].saldo).toBe(0.3);
  });

  it("resposta que não é um objeto é erro (o banco respondeu outra coisa)", () => {
    expect(() => lerResumo(null)).toThrow();
    expect(() => lerResumo("oi")).toThrow();
  });
});

function resumo(r: Partial<ResumoPecaJuntar> = {}): ResumoPecaJuntar {
  return {
    lojas_sem_acesso: 0,
    movimentos: 0,
    itens_os: 0,
    os: 0,
    contagens: 0,
    itens_compra: 0,
    compras: 0,
    cotacoes: 0,
    estoque: [],
    ...r,
  };
}

const matriz = (saldo: number) => ({ loja_id: "l1", loja_nome: "Matriz", saldo });
const filial = (saldo: number) => ({ loja_id: "l2", loja_nome: "Filial", saldo });

describe("previaDaJuntada — números", () => {
  it("soma o estoque loja por loja, com loja que só uma das duas tem", () => {
    const p = previaDaJuntada({
      fica: peca({ id: "f" }),
      sai: peca({ id: "s" }),
      resumoFica: resumo({ estoque: [matriz(4)] }),
      resumoSai: resumo({ estoque: [matriz(1.5), filial(2)] }),
      escolhas: {},
    });
    expect(p.estoquePorLoja).toEqual([
      { loja_id: "l1", loja_nome: "Matriz", fica: 4, sai: 1.5, depois: 5.5 },
      { loja_id: "l2", loja_nome: "Filial", fica: 0, sai: 2, depois: 2 },
    ]);
    expect(p.estoqueTotal).toEqual({ fica: 4, sai: 3.5, depois: 7.5 });
  });

  it("soma sem cauda de ponto flutuante (0,1 + 0,2 = 0,3)", () => {
    const p = previaDaJuntada({
      fica: peca(),
      sai: peca(),
      resumoFica: resumo({ estoque: [matriz(0.1)] }),
      resumoSai: resumo({ estoque: [matriz(0.2)] }),
      escolhas: {},
    });
    expect(p.estoquePorLoja[0].depois).toBe(0.3);
    expect(p.estoqueTotal.depois).toBe(0.3);
  });

  it("o que passa é o que a peça que sai tem; os totais depois somam as duas", () => {
    const p = previaDaJuntada({
      fica: peca(),
      sai: peca(),
      resumoFica: resumo({ movimentos: 10, itens_os: 20, os: 18, contagens: 2, itens_compra: 5, compras: 4, cotacoes: 1 }),
      resumoSai: resumo({ movimentos: 7, itens_os: 14, os: 12, contagens: 1, itens_compra: 3, compras: 3, cotacoes: 2 }),
      escolhas: {},
    });
    expect(p.passa).toEqual({ os: 12, compras: 3, contagens: 1, movimentos: 7, cotacoes: 2 });
    expect(p.totaisDepois).toEqual({
      movimentos: 17,
      itens_os: 34,
      contagens: 3,
      itens_compra: 8,
      cotacoes: 3,
    });
  });

  it("só fica completa quando o admin cuida de todas as lojas das duas peças", () => {
    const base = { fica: peca(), sai: peca(), escolhas: {} };
    expect(previaDaJuntada({ ...base, resumoFica: resumo(), resumoSai: resumo() }).completa).toBe(true);
    expect(
      previaDaJuntada({ ...base, resumoFica: resumo(), resumoSai: resumo({ lojas_sem_acesso: 1 }) }).completa,
    ).toBe(false);
    expect(
      previaDaJuntada({ ...base, resumoFica: resumo({ lojas_sem_acesso: 1 }), resumoSai: resumo() }).completa,
    ).toBe(false);
  });

  it("a descrição final segue a escolha", () => {
    const base = {
      fica: peca({ descricao: "Pneu 175/70 R13 Pirelli" }),
      sai: peca({ descricao: "PNEU 175 70 13 PIRELLI" }),
      resumoFica: resumo(),
      resumoSai: resumo(),
    };
    expect(previaDaJuntada({ ...base, escolhas: {} }).descricaoFinal).toBe("Pneu 175/70 R13 Pirelli");
    expect(previaDaJuntada({ ...base, escolhas: { descricao: "sai" } }).descricaoFinal).toBe(
      "PNEU 175 70 13 PIRELLI",
    );
  });
});

describe("previaDaJuntada — a frase", () => {
  function frase(
    sai: Partial<ResumoPecaJuntar>,
    estoque: { fica: number; sai: number } = { fica: 4, sai: 2 },
    escolhas = {},
  ): string {
    return previaDaJuntada({
      fica: peca({ descricao: "Pneu 175/70 R13 Pirelli" }),
      sai: peca({ descricao: "PNEU 175 70 13 PIRELLI" }),
      resumoFica: resumo({ estoque: [matriz(estoque.fica)], os: 30, compras: 9, contagens: 4 }),
      resumoSai: resumo({ estoque: [matriz(estoque.sai)], ...sai }),
      escolhas,
    }).frase;
  }

  it("é exatamente o exemplo da Sofia", () => {
    expect(frase({ os: 12, compras: 3, contagens: 1 })).toBe(
      "Estoque 4 + 2 = 6. 12 OS, 3 compras e 1 contagem passam pra Pneu 175/70 R13 Pirelli.",
    );
  });

  it("singular e plural de cada coisa, com cotação no fim", () => {
    expect(frase({ os: 1, compras: 1, contagens: 1, cotacoes: 1 })).toBe(
      "Estoque 4 + 2 = 6. 1 OS, 1 compra, 1 contagem e 1 cotação passam pra Pneu 175/70 R13 Pirelli.",
    );
    expect(frase({ contagens: 2, cotacoes: 2 })).toBe(
      "Estoque 4 + 2 = 6. 2 contagens e 2 cotações passam pra Pneu 175/70 R13 Pirelli.",
    );
  });

  it("uma coisa só, e uma unidade dela: 'passa', no singular", () => {
    expect(frase({ os: 1 })).toBe("Estoque 4 + 2 = 6. 1 OS passa pra Pneu 175/70 R13 Pirelli.");
    expect(frase({ compras: 3 })).toBe("Estoque 4 + 2 = 6. 3 compras passam pra Pneu 175/70 R13 Pirelli.");
  });

  it("o que é zero não aparece", () => {
    expect(frase({ os: 12, compras: 0, contagens: 1, cotacoes: 0 })).toBe(
      "Estoque 4 + 2 = 6. 12 OS e 1 contagem passam pra Pneu 175/70 R13 Pirelli.",
    );
  });

  it("nada pra passar: diz isso", () => {
    expect(frase({ movimentos: 3 }, { fica: 4, sai: 0 })).toBe(
      "Estoque 4 + 0 = 4. Nenhuma OS, compra, contagem ou cotação passa pra Pneu 175/70 R13 Pirelli.",
    );
  });

  it("quantidade com vírgula só quando tem fração, e milhar com ponto", () => {
    expect(frase({ os: 2 }, { fica: 4.5, sai: 2 })).toBe(
      "Estoque 4,5 + 2 = 6,5. 2 OS passam pra Pneu 175/70 R13 Pirelli.",
    );
    expect(frase({ os: 2 }, { fica: 1200, sai: 34.25 })).toBe(
      "Estoque 1.200 + 34,25 = 1.234,25. 2 OS passam pra Pneu 175/70 R13 Pirelli.",
    );
  });

  it("estoque negativo da que sai vira conta de menos, não '+ -2'", () => {
    expect(frase({ os: 2 }, { fica: 4, sai: -2 })).toBe(
      "Estoque 4 - 2 = 2. 2 OS passam pra Pneu 175/70 R13 Pirelli.",
    );
  });

  it("quando o admin não cuida de todas as lojas, a frase diz isso, e não 'Estoque 0 + 0'", () => {
    const p = previaDaJuntada({
      fica: peca(),
      sai: peca(),
      resumoFica: resumo({ estoque: [matriz(4)] }),
      resumoSai: resumo({ lojas_sem_acesso: 1 }),
      escolhas: {},
    });
    expect(p.frase).toBe(
      "Uma das peças aparece em loja que você não administra. Só quem administra todas as lojas dela pode juntar.",
    );
  });

  it("usa a descrição final, a escolhida", () => {
    expect(frase({ os: 2 }, undefined, { descricao: "sai" })).toBe(
      "Estoque 4 + 2 = 6. 2 OS passam pra PNEU 175 70 13 PIRELLI.",
    );
  });
});

describe("paresSuspeitos", () => {
  const ids = (pares: { a: Peca; b: Peca }[]) => pares.map((p) => [p.a.id, p.b.id].sort().join("+"));

  it("cada par aparece uma vez só, do motivo mais forte pro mais fraco", () => {
    const pecas = [
      peca({ id: "n1", descricao: "Filtro de óleo PSL55 Tecfil" }),
      peca({ id: "b1", descricao: "Amortecedor dianteiro", codigo_barras: "789123" }),
      peca({ id: "i1", descricao: "Vela de ignição", codigo_interno: "VL-10" }),
      peca({ id: "n2", descricao: "FILTRO DE OLEO PSL55 TECFIL" }),
      peca({ id: "b2", descricao: "Amortecedor diant. Cofap", codigo_barras: "789123" }),
      peca({ id: "i2", descricao: "Vela NGK", codigo_interno: "VL-10" }),
      peca({ id: "x", descricao: "Lâmpada H4 55W" }),
    ];
    const r = paresSuspeitos(pecas);
    expect(ids(r)).toEqual(["b1+b2", "i1+i2", "n1+n2"]);
    expect(r.map((p) => p.motivo)).toEqual(["codigo_barras", "codigo_interno", "nome"]);
    expect(r[0].semelhanca).toBe(1);
  });

  it("entre nomes parecidos, o mais parecido vem antes", () => {
    const pecas = [
      peca({ id: "a1", descricao: "Pastilha de freio dianteira Cobreq N-123" }),
      peca({ id: "a2", descricao: "Pastilha freio dianteira Cobreq N-123" }),
      peca({ id: "c1", descricao: "Pneu 175/70 R13 Pirelli" }),
      peca({ id: "c2", descricao: "PNEU 175/70R13 PIRELLI" }),
    ];
    const r = paresSuspeitos(pecas);
    expect(ids(r)).toEqual(["c1+c2", "a1+a2"]);
    expect(r[0].semelhanca).toBeGreaterThan(r[1].semelhanca);
  });

  it("três peças iguais dão três pares, sem repetir", () => {
    const pecas = ["1", "2", "3"].map((id) => peca({ id, codigo_barras: "789" }));
    expect(ids(paresSuspeitos(pecas))).toEqual(["1+2", "1+3", "2+3"]);
  });

  it("sem parecida, nenhum par", () => {
    expect(paresSuspeitos([peca({ id: "a" }), peca({ id: "b", descricao: "Vela NGK" })])).toEqual([]);
  });
});

describe("quemFicaPorPadrao", () => {
  it("fica a cadastrada primeiro, em qualquer ordem que chegar", () => {
    const velha = peca({ id: "z", criado_em: "2025-03-01T10:00:00+00:00" });
    const nova = peca({ id: "a", criado_em: "2026-03-01T10:00:00+00:00" });
    expect(quemFicaPorPadrao(velha, nova)).toEqual({ fica: velha, sai: nova });
    expect(quemFicaPorPadrao(nova, velha)).toEqual({ fica: velha, sai: nova });
  });

  it("compara a hora de verdade, não o texto (fuso diferente)", () => {
    // Como texto, "T11" vem antes de "T13"; como hora, 13h UTC vem antes de 14h UTC.
    const antes = peca({ id: "z", criado_em: "2026-03-01T13:00:00+00:00" });
    const depois = peca({ id: "a", criado_em: "2026-03-01T11:00:00-03:00" }); // 14h UTC
    expect(quemFicaPorPadrao(depois, antes).fica.id).toBe("z");
  });

  it("até o microssegundo do banco conta", () => {
    const antes = peca({ id: "z", criado_em: "2026-03-01T10:00:00.123456+00:00" });
    const depois = peca({ id: "a", criado_em: "2026-03-01T10:00:00.123457+00:00" });
    expect(quemFicaPorPadrao(depois, antes).fica.id).toBe("z");
  });

  it("empate na data: fica o menor id", () => {
    const quando = "2026-03-01T10:00:00+00:00";
    const a = peca({ id: "a", criado_em: quando });
    const b = peca({ id: "b", criado_em: quando });
    expect(quemFicaPorPadrao(b, a)).toEqual({ fica: a, sai: b });
  });
});

/**
 * A versão antiga de `paresSuspeitos`: cada peça contra todas as que vêm
 * depois dela. Era certa, mas lenta (3.000 peças ≈ 17 s, a tela travava). Fica
 * só aqui, como a resposta de referência: a versão rápida (que só compara
 * peças do mesmo grupo) tem que achar EXATAMENTE os mesmos pares, na mesma
 * ordem.
 */
function paresForcaBruta<T extends PecaComparavel & { id: string }>(pecas: T[]) {
  const ordem = { codigo_barras: 0, codigo_interno: 1, nome: 2 };
  const pares: { a: T; b: T; motivo: keyof typeof ordem; semelhanca: number }[] = [];
  pecas.forEach((a, i) => {
    for (const { peca: b, motivo, semelhanca } of acharPecasParecidas(a, pecas.slice(i + 1))) {
      pares.push({ a, b, motivo, semelhanca });
    }
  });
  return pares.sort((x, y) => ordem[x.motivo] - ordem[y.motivo] || y.semelhanca - x.semelhanca);
}

describe("paresSuspeitos — igual à comparação de todas contra todas", () => {
  // Pedaços escolhidos pra colidir muito: acento, maiúscula, zero à esquerda,
  // espaço nas pontas, "SEM GTIN", código vazio e medidas que só mudam no aro.
  const palavra = fc.constantFrom(
    "Pneu", "PNEU", "pnéu", "Pirelli", "PIRÉLLI", "pirelli", "Goodyear", "Filtro", "FILTRO",
    "óleo", "OLEO", "Oléo", "R13", "R14", "r13", "175/70", "175/070", "0175", "175/70R13",
    "PSL55", "psl055", "PSL56", "Lâmpada", "LAMPADA", "H4", "55W", "-", "/", "  ",
  );
  const codigo = fc.constantFrom(
    null, "", "   ", "SEM GTIN", "sem gtin", " Sem Gtin ", "SEM-GTIN", "789", "0789", " 789 ",
    "ÁB1", "ab1", "Ab1 ", "VL-10", "vl-10", "VL10", "ção", "CAO",
  );
  const medida = fc.constantFrom(null, "", "175/70 R13", "175/70 R14", "175/070 r13", "84T");
  const catalogo = fc
    .array(
      fc.record({
        descricao: fc.array(palavra, { minLength: 1, maxLength: 5 }).map((p) => p.join(" ")),
        codigo_barras: codigo,
        codigo_interno: codigo,
        medida,
      }),
      { maxLength: 30 },
    )
    .map((pecas) => pecas.map((p, i) => ({ ...p, id: `p${i}` })));

  type ParResumivel = { a: { id: string }; b: { id: string }; motivo: string; semelhanca: number };
  const resumir = (pares: ParResumivel[]) =>
    pares.map((p) => `${p.a.id}+${p.b.id} ${p.motivo} ${p.semelhanca}`);

  it("acha os mesmos pares, na mesma ordem, em catálogos aleatórios", () => {
    fc.assert(
      fc.property(catalogo, (pecas) => {
        expect(resumir(paresSuspeitos(pecas))).toEqual(resumir(paresForcaBruta(pecas)));
      }),
      { numRuns: 500 },
    );
  });

  it("vale também com ids repetidos (a mesma peça duas vezes na lista)", () => {
    const pecas = [
      peca({ id: "x", codigo_barras: "789" }),
      peca({ id: "x", codigo_barras: "789" }),
      peca({ id: "y", codigo_barras: "789" }),
    ];
    expect(resumir(paresSuspeitos(pecas))).toEqual(resumir(paresForcaBruta(pecas)));
  });
});
