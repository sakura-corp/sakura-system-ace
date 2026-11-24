import { describe, expect, it } from "vitest";
import {
  aplicarTecnicoATodos,
  buscarNoCatalogo,
  incluirNaOS,
  itemAvulso,
  itemDoEnter,
} from "./buscaDeItens";
import { itemFormVazio } from "./ordemServico";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";

function peca(sobrescrever: Partial<PecaJanela> = {}): PecaJanela {
  return {
    id: "pneu",
    codigo_interno: "PN175",
    codigo_barras: "7891111111111",
    descricao: "Pneu 175/70 R14",
    unidade: "UN",
    preco_venda: 380,
    prazo_garantia_dias: null,
    ativo: true,
    marca: "Pirelli",
    modelo: null,
    medida: "175/70 R14",
    sem_custo: false,
    ...sobrescrever,
  };
}

function servico(sobrescrever: Partial<Servico> = {}): Servico {
  return {
    id: "montagem",
    codigo_interno: "S01",
    descricao: "Montagem de pneu",
    preco_padrao: 25,
    custo: null,
    categoria_id: null,
    ativo: true,
    intervalo_dias: null,
    intervalo_km: null,
    criado_em: "2026-01-01T00:00:00Z",
    ...sobrescrever,
  };
}

const pneu = peca();
const montagem = servico();
const alinhamento = servico({ id: "alinhamento", codigo_interno: "S02", descricao: "Alinhamento" });
const palheta = peca({
  id: "palheta",
  codigo_interno: "PAL20",
  codigo_barras: "7892222222222",
  descricao: 'Palheta 20"',
  marca: "Bosch",
  medida: null,
  preco_venda: 35,
});

describe("buscarNoCatalogo", () => {
  it("com muitos pneus no cadastro, o serviço de pneu ainda aparece (teste no PC da #1087)", () => {
    const pneus = Array.from({ length: 12 }, (_, i) =>
      peca({ id: `pneu-${i}`, codigo_interno: `PN${i}`, codigo_barras: `789${i}`, descricao: `Pneu ${i}` }),
    );
    const resultado = buscarNoCatalogo(pneus, [montagem], "pneu");
    expect(resultado).toHaveLength(8);
    expect(resultado.some((r) => r.tipo === "servico" && r.id === "montagem")).toBe(true);
  });

  it("com muitos serviços, as peças também guardam lugar", () => {
    const servicos = Array.from({ length: 12 }, (_, i) =>
      servico({ id: `sv-${i}`, codigo_interno: `SV${i}`, descricao: `Pneu: serviço ${i}` }),
    );
    // A peça NÃO começa com "pneu": sem vaga guardada, os 12 serviços a tirariam.
    const camara = peca({ id: "camara", codigo_interno: "CA1", codigo_barras: "7000", descricao: "Câmara de ar pra pneu" });
    const resultado = buscarNoCatalogo([camara], servicos, "pneu");
    expect(resultado).toHaveLength(8);
    expect(resultado.some((r) => r.tipo === "peca" && r.id === "camara")).toBe(true);
  });

  it("acha a peça e o serviço juntos com o mesmo termo", () => {
    expect(buscarNoCatalogo([pneu, palheta], [montagem, alinhamento], "pneu")).toEqual([
      {
        tipo: "peca",
        id: "pneu",
        descricao: "Pneu 175/70 R14",
        preco: 380,
        codigo: "PN175",
        unidade: "UN",
      },
      { tipo: "servico", id: "montagem", descricao: "Montagem de pneu", preco: 25, codigo: "S01" },
    ]);
  });

  const ids = (resultados: { id: string }[]) => resultados.map((r) => r.id);

  it("não mostra peça nem serviço inativo", () => {
    const resultados = buscarNoCatalogo(
      [{ ...pneu, ativo: false }],
      [{ ...montagem, ativo: false }],
      "pneu",
    );
    expect(resultados).toEqual([]);
  });

  it("termo vazio (ou só espaço) não mostra nada", () => {
    expect(buscarNoCatalogo([pneu], [montagem], "")).toEqual([]);
    expect(buscarNoCatalogo([pneu], [montagem], "   ")).toEqual([]);
  });

  it("acha o serviço pelo código e sem acento", () => {
    const balanceamento = servico({ id: "balanc", codigo_interno: "S03", descricao: "Balanceamento rápido" });
    expect(ids(buscarNoCatalogo([], [balanceamento], "rapido"))).toEqual(["balanc"]);
    expect(ids(buscarNoCatalogo([], [balanceamento], "s03"))).toEqual(["balanc"]);
  });

  it("código exato primeiro, depois quem começa com o termo, depois o resto", () => {
    // Termo "s02": a peça "contem" só CONTÉM "s02" no código ("XS02") e vem
    // primeiro na lista; a peça "comeca" COMEÇA com ele ("S02-A"); o
    // alinhamento (serviço, vem por último) tem o código exato.
    const contem = peca({ id: "contem", codigo_interno: "XS02", codigo_barras: null, descricao: "Válvula" });
    const comeca = peca({ id: "comeca", codigo_interno: "S02-A", codigo_barras: null, descricao: "Bico" });
    expect(ids(buscarNoCatalogo([contem, comeca], [alinhamento], "s02"))).toEqual([
      "alinhamento",
      "comeca",
      "contem",
    ]);
  });

  it("a descrição que começa com o termo vem antes da que só contém", () => {
    // Os dois são serviço; o que só contém "pneu" vem primeiro na lista.
    const rodizio = servico({ id: "rodizio", codigo_interno: null, descricao: "Rodízio de pneu" });
    const pneuNovo = servico({ id: "pneu-novo", codigo_interno: null, descricao: "Pneu: troca" });
    expect(ids(buscarNoCatalogo([], [rodizio, pneuNovo], "pneu"))).toEqual(["pneu-novo", "rodizio"]);
  });

  it("dentro do mesmo grupo, fica a ordem em que vieram", () => {
    const pneu2 = peca({ id: "pneu2", codigo_interno: "PN185", codigo_barras: null, descricao: "Pneu 185" });
    expect(ids(buscarNoCatalogo([pneu2, pneu], [], "pneu"))).toEqual(["pneu2", "pneu"]);
  });

  it("mostra no máximo 8, ou o limite pedido", () => {
    const muitas = Array.from({ length: 10 }, (_, i) =>
      peca({ id: `p${i}`, codigo_interno: null, codigo_barras: null, descricao: `Pneu ${i}` }),
    );
    expect(buscarNoCatalogo(muitas, [], "pneu")).toHaveLength(8);
    expect(buscarNoCatalogo(muitas, [], "pneu", 3)).toHaveLength(3);
  });
});

describe("itemDoEnter", () => {
  it("o código de barras exato põe a peça direto, mesmo com serviço que tem o termo no nome", () => {
    const comCodigoNoNome = servico({ id: "estranho", descricao: "Montagem do 7891111111111" });
    expect(itemDoEnter([pneu, palheta], [comCodigoNoNome], "7891111111111")).toMatchObject({
      tipo: "peca",
      id: "pneu",
    });
  });

  it("o código interno exato da peça também vale", () => {
    expect(itemDoEnter([pneu, palheta], [montagem], "pal20")).toMatchObject({ tipo: "peca", id: "palheta" });
  });

  it("sem peça com o código, vale o código interno exato do serviço", () => {
    const kit = peca({ id: "kit", codigo_interno: "KIT", codigo_barras: null, descricao: "Kit S01 e S02" });
    expect(itemDoEnter([kit], [montagem, alinhamento], "S01")).toMatchObject({
      tipo: "servico",
      id: "montagem",
    });
  });

  it("sem código exato, entra se a busca achar uma coisa só", () => {
    expect(itemDoEnter([pneu, palheta], [montagem, alinhamento], "alinha")).toMatchObject({
      tipo: "servico",
      id: "alinhamento",
    });
  });

  it("com mais de um resultado, nada entra (a pessoa escolhe na lista)", () => {
    expect(itemDoEnter([pneu], [montagem], "pneu")).toBeNull();
  });

  it("duas peças com o mesmo código: nada entra", () => {
    const outra = peca({ id: "pneu-dup", descricao: "Pneu repetido" });
    expect(itemDoEnter([pneu, outra], [], "7891111111111")).toBeNull();
  });

  it("peça inativa não entra pelo código", () => {
    expect(itemDoEnter([{ ...pneu, ativo: false }], [], "7891111111111")).toBeNull();
  });

  it("termo vazio: nada entra", () => {
    expect(itemDoEnter([pneu], [], "  ")).toBeNull();
  });
});

describe("incluirNaOS", () => {
  const escolhaPneu = buscarNoCatalogo([pneu], [], "PN175")[0];
  const escolhaMontagem = buscarNoCatalogo([], [montagem], "S01")[0];

  it("peça nova vira uma linha com quantidade 1, o preço do cadastro e o técnico padrão", () => {
    expect(incluirNaOS([], escolhaPneu, "tec-1")).toEqual([
      {
        ...itemFormVazio,
        tipo: "peca",
        peca_id: "pneu",
        descricao: "Pneu 175/70 R14",
        quantidade: "1",
        preco_unitario: "380",
        tecnico_id: "tec-1",
      },
    ]);
  });

  it("o mesmo serviço com OUTRO técnico vira outra linha (a comissão é por técnico do item)", () => {
    const comA = incluirNaOS([], escolhaMontagem, "tec-A");
    const resultado = incluirNaOS(comA, escolhaMontagem, "tec-B");
    expect(resultado).toHaveLength(2);
    expect(resultado.map((item) => [item.tecnico_id, item.quantidade])).toEqual([
      ["tec-A", "1"],
      ["tec-B", "1"],
    ]);
  });

  it("a mesma peça com o mesmo técnico soma 1 na linha que já existe", () => {
    const comA = incluirNaOS([], escolhaPneu, "tec-A");
    const resultado = incluirNaOS(comA, escolhaPneu, "tec-A");
    expect(resultado).toHaveLength(1);
    expect(resultado[0].quantidade).toBe("2");
  });

  it("serviço novo vira uma linha de serviço, no fim da lista", () => {
    const comPneu = incluirNaOS([], escolhaPneu, "tec-1");
    const resultado = incluirNaOS(comPneu, escolhaMontagem, "tec-2");
    expect(resultado).toHaveLength(2);
    expect(resultado[1]).toEqual({
      ...itemFormVazio,
      tipo: "servico",
      servico_id: "montagem",
      descricao: "Montagem de pneu",
      quantidade: "1",
      preco_unitario: "25",
      tecnico_id: "tec-2",
    });
  });

  it("sem preço no cadastro, o preço fica em branco pra digitar", () => {
    const semPreco = { ...escolhaMontagem, preco: null };
    expect(incluirNaOS([], semPreco, "")[0].preco_unitario).toBe("");
  });

  it("passar o leitor 2 vezes no mesmo pneu dá 2 unidades na mesma linha", () => {
    const duas = incluirNaOS(incluirNaOS([], escolhaPneu, "tec-1"), escolhaPneu, "tec-1");
    expect(duas).toHaveLength(1);
    expect(duas[0].quantidade).toBe("2");
  });

  it("o mesmo serviço de novo também soma, e as outras linhas ficam como estavam", () => {
    const antes = incluirNaOS(incluirNaOS([], escolhaMontagem, ""), escolhaPneu, "");
    const depois = incluirNaOS(antes, escolhaMontagem, "");
    expect(depois.map((item) => item.quantidade)).toEqual(["2", "1"]);
    expect(depois[1]).toBe(antes[1]);
  });

  it("soma em cima da quantidade que a pessoa digitou", () => {
    const [linha] = incluirNaOS([], escolhaPneu, "");
    expect(incluirNaOS([{ ...linha, quantidade: "4" }], escolhaPneu, "")[0].quantidade).toBe("5");
  });
});

describe("itemAvulso", () => {
  it("serviço sem cadastro: linha de serviço com o texto aparado, sem id", () => {
    expect(itemAvulso("servico", "  Troca de bico  ", "tec-1")).toEqual({
      ...itemFormVazio,
      tipo: "servico",
      descricao: "Troca de bico",
      tecnico_id: "tec-1",
    });
  });

  it("peça sem cadastro: peça avulsa (sem peca_id), custo em branco", () => {
    const item = itemAvulso("peca", "Válvula cromada", "");
    expect(item).toMatchObject({ tipo: "peca", peca_id: "", descricao: "Válvula cromada", custo_unitario: "" });
  });

  it("nunca junta com outra linha: é sempre uma linha nova", () => {
    // Quem chama acrescenta na lista; duas avulsas iguais são duas linhas.
    const um = itemAvulso("servico", "Lavagem", "");
    const outro = itemAvulso("servico", "Lavagem", "");
    expect(um).toEqual(outro);
    expect(um).not.toBe(outro);
  });
});

describe("aplicarTecnicoATodos", () => {
  it("troca o técnico de todas as linhas e mantém o resto", () => {
    const itens = [
      itemAvulso("servico", "Montagem", "tec-1"),
      itemAvulso("peca", "Válvula", ""),
    ];
    const resultado = aplicarTecnicoATodos(itens, "tec-9");
    expect(resultado.map((item) => item.tecnico_id)).toEqual(["tec-9", "tec-9"]);
    expect(resultado.map((item) => item.descricao)).toEqual(["Montagem", "Válvula"]);
  });

  it("não mexe na lista de entrada", () => {
    const itens = [itemAvulso("servico", "Montagem", "tec-1")];
    aplicarTecnicoATodos(itens, "tec-9");
    expect(itens[0].tecnico_id).toBe("tec-1");
  });
});
