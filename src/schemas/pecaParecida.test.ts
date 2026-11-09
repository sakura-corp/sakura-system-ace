import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  acharPecasParecidas,
  LIMITE_NOME_PARA_ORDENAR,
  MOTIVO_PARECIDA_ROTULO,
  type PecaComparavel,
} from "./pecaParecida";

function peca(p: Partial<PecaComparavel> & { descricao: string }): PecaComparavel {
  return { codigo_interno: null, codigo_barras: null, medida: null, ...p };
}

const pneu = peca({ id: "1", descricao: "Pneu 175/70 R13 Pirelli" });

describe("acharPecasParecidas", () => {
  it("mesmo código de barras é parecido, mesmo com nome bem diferente", () => {
    const nova = peca({ descricao: "Filtro de óleo", codigo_barras: "789123" });
    const r = acharPecasParecidas(nova, [
      peca({ id: "a", descricao: "Amortecedor dianteiro", codigo_barras: "789123" }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].motivo).toBe("codigo_barras");
    expect(r[0].semelhanca).toBe(1);
  });

  it("mesmo código interno é parecido", () => {
    const nova = peca({ descricao: "Vela", codigo_interno: "VL-10" });
    const r = acharPecasParecidas(nova, [
      peca({ id: "a", descricao: "Pastilha de freio", codigo_interno: "VL-10" }),
    ]);
    expect(r[0].motivo).toBe("codigo_interno");
  });

  it("código vazio ou nulo nunca casa", () => {
    const nova = peca({ descricao: "Vela", codigo_interno: "", codigo_barras: null });
    const r = acharPecasParecidas(nova, [
      peca({ id: "a", descricao: "Pastilha de freio", codigo_interno: "", codigo_barras: null }),
      peca({ id: "b", descricao: "Cabo", codigo_interno: "  ", codigo_barras: " " }),
    ]);
    expect(r).toEqual([]);
  });

  it("'SEM GTIN' no código de barras não é código (é o que a nota traz quando não há)", () => {
    const nova = peca({ descricao: "Vela", codigo_barras: "SEM GTIN" });
    const r = acharPecasParecidas(nova, [
      peca({ id: "a", descricao: "Pastilha de freio", codigo_barras: "sem gtin" }),
    ]);
    expect(r).toEqual([]);
  });

  it("nome com acento, maiúscula e espaçamento diferentes é parecido", () => {
    const r = acharPecasParecidas(peca({ descricao: "PNEU 175/70R13 PIRÉLLI" }), [pneu]);
    expect(r).toHaveLength(1);
    expect(r[0].motivo).toBe("nome");
    expect(r[0].semelhanca).toBeGreaterThanOrEqual(0.8);
  });

  it("acento é ignorado mesmo em nome curto (Lâmpada x LAMPADA)", () => {
    const r = acharPecasParecidas(peca({ descricao: "LAMPADA H4 55W" }), [
      peca({ id: "l", descricao: "Lâmpada H4 55W" }),
    ]);
    expect(r[0]?.motivo).toBe("nome");
    // Igual depois de tirar o acento: tem que dar semelhança total.
    expect(r[0]?.semelhanca).toBe(1);
  });

  it("R13 x R14 NÃO é parecido: a medida conta mais que o resto do nome", () => {
    const r = acharPecasParecidas(peca({ descricao: "Pneu 175/70 R14 Pirelli" }), [pneu]);
    expect(r).toEqual([]);
  });

  it("referência de peça diferente (PSL55 x PSL56) não é parecida", () => {
    const r = acharPecasParecidas(peca({ descricao: "Filtro de óleo PSL56" }), [
      peca({ id: "f", descricao: "Filtro de óleo PSL55" }),
    ]);
    expect(r).toEqual([]);
  });

  it("a ordem das palavras não importa", () => {
    const r = acharPecasParecidas(peca({ descricao: "Pirelli Pneu R13 175/70" }), [pneu]);
    expect(r[0]?.motivo).toBe("nome");
  });

  it("nomes bem diferentes não são parecidos", () => {
    const r = acharPecasParecidas(peca({ descricao: "Amortecedor dianteiro" }), [pneu]);
    expect(r).toEqual([]);
  });

  it("o campo medida entra nos números", () => {
    // Sem medida na descrição: só a medida diferencia.
    const a = peca({ id: "a", descricao: "Pneu Pirelli", medida: "175/70 R13" });
    const nova = peca({ descricao: "Pneu Pirelli", medida: "175/70 R14" });
    expect(acharPecasParecidas(nova, [a])).toEqual([]);
    // E medida repetida na descrição não duplica nem atrapalha.
    const b = peca({ id: "b", descricao: "Pneu 175/70 R13 Pirelli", medida: "175/70 R13" });
    expect(acharPecasParecidas(peca({ descricao: "Pneu 175/70 R13 Pirelli" }), [b])).toHaveLength(1);
  });

  it("ignora a própria peça pelo id", () => {
    const r = acharPecasParecidas(peca({ id: "1", descricao: "Pneu 175/70 R13 Pirelli" }), [pneu]);
    expect(r).toEqual([]);
  });

  it("cada peça aparece uma vez, com o motivo mais forte", () => {
    const nova = peca({
      descricao: "Pneu 175/70 R13 Pirelli",
      codigo_barras: "1",
      codigo_interno: "X",
    });
    const r = acharPecasParecidas(nova, [
      peca({ id: "a", descricao: "Pneu 175/70 R13 Pirelli", codigo_barras: "1", codigo_interno: "X" }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].motivo).toBe("codigo_barras");
  });

  it("ordena: motivo mais forte primeiro, e no nome a maior semelhança primeiro", () => {
    const nova = peca({ descricao: "Pneu 175/70 R13 Pirelli", codigo_interno: "X", codigo_barras: "9" });
    const r = acharPecasParecidas(nova, [
      peca({ id: "nome-menos", descricao: "Pneu 175/70 R13 Pirelli Cinturato" }),
      peca({ id: "nome-igual", descricao: "Pneu 175/70 R13 Pirelli" }),
      peca({ id: "interno", descricao: "Outra coisa", codigo_interno: "x" }),
      peca({ id: "barras", descricao: "Qualquer", codigo_barras: "9" }),
    ]);
    expect(r.map((x) => x.peca.id)).toEqual(["barras", "interno", "nome-igual", "nome-menos"]);
    expect(r[2].semelhanca).toBeGreaterThan(r[3].semelhanca);
  });

  it("na lista que só ordena (#741), um limite mais baixo acha o bico de válvula; o aviso continua exigente", () => {
    const digitada = peca({ descricao: "Bico de valvula cromado" });
    const cadastro = [peca({ id: "bico", descricao: "Bico de válvula (exemplo)" }), peca({ id: "oleo", descricao: "Óleo 5W30 (exemplo)" })];
    // O aviso do cadastro (0,8) não acha: "parece" demais seria ensinar a ignorar o aviso.
    expect(acharPecasParecidas(digitada, cadastro)).toEqual([]);
    const r = acharPecasParecidas(digitada, cadastro, { limiteNome: LIMITE_NOME_PARA_ORDENAR });
    expect(r.map((x) => x.peca.id)).toEqual(["bico"]);
  });

  it("com o limite mais baixo, a medida continua mandando (R13 x R14 nunca é parecida)", () => {
    const r = acharPecasParecidas(peca({ descricao: "Pneu 175/70 R14" }), [pneu], { limiteNome: LIMITE_NOME_PARA_ORDENAR });
    expect(r).toEqual([]);
  });

  // #708 (Sofia, 23/10): lado diferente é peça diferente, como R13 × R14.
  it("amortecedor LE x LD NÃO é parecido: lado diferente é peça diferente", () => {
    const r = acharPecasParecidas(peca({ descricao: "Amortecedor dianteiro LE" }), [
      peca({ id: "ld", descricao: "Amortecedor dianteiro LD" }),
    ]);
    expect(r).toEqual([]);
  });

  it("lado escrito por extenso também separa (esquerdo x direito)", () => {
    const r = acharPecasParecidas(peca({ descricao: "Bandeja suspensão dianteira esquerda" }), [
      peca({ id: "d", descricao: "Bandeja suspensão dianteira direita" }),
    ]);
    expect(r).toEqual([]);
  });

  it("mesmo lado continua parecido (LE x le, com acento e maiúscula diferentes)", () => {
    const r = acharPecasParecidas(peca({ descricao: "AMORTECEDOR DIANTEIRO le" }), [
      peca({ id: "le", descricao: "Amortecedor dianteiro LE" }),
    ]);
    expect(r[0]?.motivo).toBe("nome");
  });

  it("LE x esquerdo é o mesmo lado: continua parecido", () => {
    const r = acharPecasParecidas(peca({ descricao: "Amortecedor dianteiro esquerdo" }), [
      peca({ id: "le", descricao: "Amortecedor dianteiro LE" }),
    ]);
    expect(r[0]?.motivo).toBe("nome");
  });

  it("lado diferente com o mesmo código continua avisando pelo código", () => {
    const r = acharPecasParecidas(peca({ descricao: "Amortecedor dianteiro LE", codigo_interno: "AM-1" }), [
      peca({ id: "ld", descricao: "Amortecedor dianteiro LD", codigo_interno: "am-1" }),
    ]);
    expect(r[0]?.motivo).toBe("codigo_interno");
  });

  // #708 (Sofia, 23/10): o índice de carga e velocidade do pneu não conta como medida.
  it("pneu com e sem o índice de carga (82T) é parecido", () => {
    const r = acharPecasParecidas(peca({ descricao: "Pneu 175/70 R14 82T" }), [
      peca({ id: "p", descricao: "Pneu 175/70 R14" }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].motivo).toBe("nome");
  });

  // Sofia, 07/11: carga diferente é pneu diferente; só "com × sem índice" avisa.
  it("pneu 82T x 86T NÃO é parecido: índice de carga diferente é pneu diferente", () => {
    const r = acharPecasParecidas(peca({ descricao: "Pneu 175/70 R14 82T" }), [
      peca({ id: "p", descricao: "Pneu 175/70 R14 86T" }),
    ]);
    expect(r).toEqual([]);
  });

  it("mesmo índice de carga continua parecido (82T x 82t)", () => {
    const r = acharPecasParecidas(peca({ descricao: "PNEU 175/70 R14 82t" }), [
      peca({ id: "p", descricao: "Pneu 175/70 R14 82T" }),
    ]);
    expect(r).toHaveLength(1);
  });

  it("índice de carga também é ignorado quando está no campo medida (91H)", () => {
    const r = acharPecasParecidas(peca({ descricao: "Pneu Pirelli", medida: "195/55 R15 91H" }), [
      peca({ id: "p", descricao: "Pneu Pirelli", medida: "195/55 R15" }),
    ]);
    expect(r).toHaveLength(1);
  });

  it("com o índice de carga, a medida continua mandando (R14 82T x R13 não é parecido)", () => {
    const r = acharPecasParecidas(peca({ descricao: "Pneu 175/70 R14 82T" }), [pneu]);
    expect(r).toEqual([]);
  });

  it("acessório com a palavra pneu, sem medida de pneu, não perde a voltagem (compressor 12V x 220V)", () => {
    const r = acharPecasParecidas(peca({ descricao: "Compressor de ar para pneu 220V" }), [
      peca({ id: "c", descricao: "Compressor de ar para pneu 12V" }),
    ]);
    expect(r).toEqual([]);
  });

  it("medida 3/2 dígitos fora de pneu não apaga número com letra (disco de freio 256/22 20V)", () => {
    const r = acharPecasParecidas(peca({ descricao: "Disco de freio 256/22 20V" }), [
      peca({ id: "d", descricao: "Disco de freio 256/22" }),
    ]);
    expect(r).toEqual([]);
  });

  it("pneu de moto (90/90-18) também ignora o índice de carga (51P)", () => {
    const r = acharPecasParecidas(peca({ descricao: "Pneu 90/90-18 51P" }), [
      peca({ id: "m", descricao: "Pneu 90/90-18" }),
    ]);
    expect(r).toHaveLength(1);
  });

  it("fora de pneu, número com letra continua sendo medida (lâmpada 55W x 60W)", () => {
    const r = acharPecasParecidas(peca({ descricao: "Lâmpada H4 60W" }), [
      peca({ id: "l", descricao: "Lâmpada H4 55W" }),
    ]);
    expect(r).toEqual([]);
  });

  it("tem frase curta pra cada motivo", () => {
    expect(MOTIVO_PARECIDA_ROTULO.codigo_barras).toBe("mesmo código de barras");
    expect(MOTIVO_PARECIDA_ROTULO.codigo_interno).toBe("mesmo código interno");
    expect(MOTIVO_PARECIDA_ROTULO.nome).toBe("nome muito parecido");
  });
});

/**
 * A regra como era antes da forma preparada (#721), copiada à mão de propósito:
 * é a resposta de referência. A versão nova (peça normalizada uma vez só,
 * bigramas como números, atalho pelo tamanho do nome) tem que dar EXATAMENTE
 * o mesmo resultado, motivo e semelhança.
 */
function regraAntiga(nova: PecaComparavel, cadastro: PecaComparavel[], limiteNome: number) {
  const normalizar = (t: string | null | undefined) =>
    (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const pedacos = (t: string) => (normalizar(t).match(/\d+|[a-z]+/g) ?? []).sort();
  const numeros = (p: PecaComparavel) => {
    const todos = `${normalizar(p.descricao)} ${normalizar(p.medida)}`.match(/\d+/g) ?? [];
    return [...new Set(todos.map((n) => String(Number(n))))].sort().join(",");
  };
  const bigramas = (t: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < t.length - 1; i++) m.set(t.slice(i, i + 2), (m.get(t.slice(i, i + 2)) ?? 0) + 1);
    return m;
  };
  const dice = (a: string, b: string) => {
    if (a === b) return a.length > 0 ? 1 : 0;
    const ba = bigramas(a);
    const bb = bigramas(b);
    let comuns = 0;
    for (const [par, q] of ba) comuns += Math.min(q, bb.get(par) ?? 0);
    const total = Math.max(a.length - 1, 0) + Math.max(b.length - 1, 0);
    return total === 0 ? 0 : (2 * comuns) / total;
  };
  const mesmoCodigo = (a: string | null, b: string | null) => {
    const x = normalizar(a);
    return !["", "sem gtin"].includes(x) && x === normalizar(b);
  };
  const forca = { codigo_barras: 3, codigo_interno: 2, nome: 1 };
  const achadas: { id?: string; motivo: keyof typeof forca; semelhanca: number }[] = [];
  for (const p of cadastro) {
    if (nova.id !== undefined && p.id === nova.id) continue;
    if (mesmoCodigo(nova.codigo_barras, p.codigo_barras)) achadas.push({ id: p.id, motivo: "codigo_barras", semelhanca: 1 });
    else if (mesmoCodigo(nova.codigo_interno, p.codigo_interno)) achadas.push({ id: p.id, motivo: "codigo_interno", semelhanca: 1 });
    else {
      const sem = numeros(nova) !== numeros(p) ? 0 : dice(pedacos(nova.descricao).join(" "), pedacos(p.descricao).join(" "));
      if (sem >= limiteNome) achadas.push({ id: p.id, motivo: "nome", semelhanca: sem });
    }
  }
  return achadas.sort((x, y) => forca[y.motivo] - forca[x.motivo] || y.semelhanca - x.semelhanca);
}

// O vocabulário abaixo evita DE PROPÓSITO as palavras da #708 (lado LE/LD e o
// índice de carga do pneu): fora delas, a regra tem que dar o mesmo de antes.
describe("acharPecasParecidas — igual à regra de antes da forma preparada (#721)", () => {
  const palavra = fc.constantFrom(
    "Pneu", "PNEU", "pnéu", "Pirelli", "Filtro", "FILTRO", "óleo", "OLEO", "R13", "R14", "175/70",
    "175/070", "PSL55", "psl055", "Lâmpada", "LAMPADA", "H4", "a", "aa", "aaa", "ab", "ba", "-", "  ",
  );
  const codigo = fc.constantFrom(null, "", "SEM GTIN", " sem gtin ", "789", " 789 ", "VL-10", "vl-10");
  const medida = fc.constantFrom(null, "", "175/70 R13", "175/070 r13");
  const pecaAleatoria = fc.record({
    id: fc.constantFrom("1", "2", "3", "4"),
    descricao: fc.array(palavra, { minLength: 0, maxLength: 5 }).map((p) => p.join(" ")),
    codigo_barras: codigo,
    codigo_interno: codigo,
    medida,
  });

  it("mesmos achados, motivo e semelhança, nos dois limites", () => {
    fc.assert(
      fc.property(pecaAleatoria, fc.array(pecaAleatoria, { maxLength: 8 }), (nova, cadastro) => {
        for (const limiteNome of [0.8, LIMITE_NOME_PARA_ORDENAR]) {
          const nova_ = acharPecasParecidas(nova, cadastro, { limiteNome }).map(({ peca: p, motivo, semelhanca }) => ({ id: p.id, motivo, semelhanca }));
          expect(nova_).toEqual(regraAntiga(nova, cadastro, limiteNome));
        }
      }),
      { numRuns: 1000 },
    );
  });
});
