import { describe, expect, it } from "vitest";
import { NAVEGACAO, andarDoItem, problemasDaNavegacao, quemCuidaDoAndar, type GrupoDaNavegacao, type ItemDaNavegacao } from "./navegacao";

// Escritos aqui, e não importados da lista: trocar o endereço na lista tem que reprovar (decisão da #542).
const ENDERECOS_QUE_EXISTEM = { inicio: "/", leva: "/leva", sala: "/sala", escritorio: "/escritorio" };

const todosOsItens = NAVEGACAO.flatMap((g) => g.itens);

function copiaComItem(id: string, troca: (i: ItemDaNavegacao) => ItemDaNavegacao): GrupoDaNavegacao[] {
  return NAVEGACAO.map((g) => ({ ...g, itens: g.itens.map((i) => (i.id === id ? troca(i) : i)) }));
}

describe("NAVEGACAO", () => {
  it("não tem problema nenhum", () => {
    expect(problemasDaNavegacao(NAVEGACAO)).toEqual([]);
  });

  it("os endereços que já existem continuam existindo, iguais", () => {
    for (const [id, href] of Object.entries(ENDERECOS_QUE_EXISTEM)) {
      const item = todosOsItens.find((i) => i.id === id);
      expect(item, id).toBeDefined();
      expect(item?.emBreve, id).toBeUndefined();
      expect(item?.href, id).toBe(href);
    }
  });

  it("os andares, nessa ordem, com os itens de cada um (lista escrita à mão)", () => {
    expect(NAVEGACAO.map((g) => g.id)).toEqual(["terreo", "producao", "comercial", "financeiro", "operacao", "diretoria", "rodape"]);
    expect(NAVEGACAO.map((g) => g.titulo)).toEqual([
      "Térreo · Recepção",
      "1º · Produção",
      "2º · Comercial e pós-venda",
      "3º · Financeiro",
      "4º · Segurança e operação",
      "Cobertura · Diretoria",
      undefined,
    ]);
    expect(NAVEGACAO.map((g) => g.itens.map((i) => i.id))).toEqual([
      ["inicio"],
      ["leva", "levas", "fases", "relatorio", "sala", "escritorio", "pessoas"],
      ["lojas", "posvenda"],
      ["financeiro", "dre"],
      ["versoes", "bancos"],
      ["decisoes"],
      ["configuracoes"],
    ]);
    for (const i of todosOsItens) expect(i.icone, i.id).toBeTruthy();
  });

  it("os chefes de cada andar (escritos à mão)", () => {
    expect(NAVEGACAO.map((g) => g.chefes ?? [])).toEqual([[], ["frontend", "backend", "tester"], ["marketing"], [], ["seguranca"], [], []]);
  });

  it("os itens em breve que já existiam continuam com o mesmo endereço", () => {
    for (const id of ["levas", "versoes", "fases", "relatorio", "pessoas", "financeiro", "dre", "lojas", "configuracoes"]) {
      const item = todosOsItens.find((i) => i.id === id);
      expect(item?.emBreve, id).toBe(true);
      expect(item?.href, id).toBe(`/em-breve/${id}`);
    }
  });

  it("os três itens novos estão em breve, com ícone próprio e sem tarefa", () => {
    for (const [id, icone] of [["posvenda", "suporte"], ["bancos", "banco"], ["decisoes", "decisoes"]]) {
      const item = todosOsItens.find((i) => i.id === id);
      expect(item?.emBreve, id).toBe(true);
      expect(item?.href, id).toBe(`/em-breve/${id}`);
      expect(item?.icone, id).toBe(icone);
      expect(item?.dependeDe, id).toBe("ainda sem tarefa");
    }
  });
});

describe("andarDoItem", () => {
  it("acha o andar que tem o item", () => {
    expect(andarDoItem("posvenda")?.id).toBe("comercial");
    expect(andarDoItem("pessoas")?.id).toBe("producao");
    expect(andarDoItem("inicio")?.id).toBe("terreo");
    expect(andarDoItem("configuracoes")?.id).toBe("rodape");
  });
  it("item que não existe → undefined", () => {
    expect(andarDoItem("nao-existe")).toBeUndefined();
  });
});

describe("quemCuidaDoAndar", () => {
  const andar = (chefes?: GrupoDaNavegacao["chefes"]): GrupoDaNavegacao => ({ id: "producao", titulo: "x", chefes, itens: [] });
  it("sem chefes", () => {
    expect(quemCuidaDoAndar(andar())).toBe("Quem cuida deste andar: ainda nenhum chefe.");
    expect(quemCuidaDoAndar(andar([]))).toBe("Quem cuida deste andar: ainda nenhum chefe.");
  });
  it("um chefe", () => {
    expect(quemCuidaDoAndar(andar(["marketing"]))).toBe("Quem cuida deste andar: o chefe de marketing.");
    expect(quemCuidaDoAndar(andar(["seguranca"]))).toBe("Quem cuida deste andar: o chefe de segurança.");
  });
  it("dois e três chefes", () => {
    expect(quemCuidaDoAndar(andar(["frontend", "backend"]))).toBe("Quem cuida deste andar: os chefes de frontend e backend.");
    expect(quemCuidaDoAndar(andar(["frontend", "backend", "tester"]))).toBe("Quem cuida deste andar: os chefes de frontend, backend e tester.");
  });
});

describe("problemasDaNavegacao", () => {
  it("pega item em breve sem dependeDe", () => {
    const quebrada = copiaComItem("dre", (i) => ({ ...i, dependeDe: "" }) as ItemDaNavegacao);
    expect(problemasDaNavegacao(quebrada)).toHaveLength(1);
  });

  it("pega item em breve com endereço que não é /em-breve/<id> (#544)", () => {
    const outro = copiaComItem("dre", (i) => ({ ...i, href: "/em-breve/lojas" }) as ItemDaNavegacao);
    expect(problemasDaNavegacao(outro)).toHaveLength(1);
    const sem = copiaComItem("dre", (i) => ({ ...i, href: undefined }) as never);
    expect(problemasDaNavegacao(sem)).toHaveLength(1);
  });

  it("pega item que existe sem href", () => {
    const quebrada = copiaComItem("sala", (i) => ({ ...i, href: undefined }) as never);
    expect(problemasDaNavegacao(quebrada)).toHaveLength(1);
  });

  it("pega href que não começa com /", () => {
    const quebrada = copiaComItem("sala", (i) => ({ ...i, href: "sala" }) as never);
    expect(problemasDaNavegacao(quebrada)).toHaveLength(1);
  });

  it("pega chefe repetido no mesmo andar", () => {
    const repetido = NAVEGACAO.map((g) => (g.id === "producao" ? { ...g, chefes: ["frontend", "frontend"] as GrupoDaNavegacao["chefes"] } : g));
    expect(problemasDaNavegacao(repetido)).toHaveLength(1);
  });

  it("pega id repetido e rótulo vazio", () => {
    const repetida = copiaComItem("dre", (i) => ({ ...i, id: "lojas", href: "/em-breve/lojas" }) as ItemDaNavegacao);
    expect(problemasDaNavegacao(repetida)).toHaveLength(1);
    const vazia = copiaComItem("dre", (i) => ({ ...i, rotulo: " " }) as ItemDaNavegacao);
    expect(problemasDaNavegacao(vazia)).toHaveLength(1);
  });
});
