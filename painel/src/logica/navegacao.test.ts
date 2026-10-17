import { describe, expect, it } from "vitest";
import { NAVEGACAO, problemasDaNavegacao, type GrupoDaNavegacao, type ItemDaNavegacao } from "./navegacao";

// Escritos aqui, e não importados da lista: trocar o endereço na lista tem que reprovar (decisão da #542).
const ENDERECOS_QUE_EXISTEM = { leva: "/", sala: "/sala", escritorio: "/escritorio" };

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

  it("tem os cinco grupos, nessa ordem, e todo item tem ícone", () => {
    expect(NAVEGACAO.map((g) => g.id)).toEqual(["topo", "trabalho", "equipe", "empresa", "rodape"]);
    for (const i of todosOsItens) expect(i.icone, i.id).toBeTruthy();
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

  it("pega id repetido e rótulo vazio", () => {
    const repetida = copiaComItem("dre", (i) => ({ ...i, id: "lojas", href: "/em-breve/lojas" }) as ItemDaNavegacao);
    expect(problemasDaNavegacao(repetida)).toHaveLength(1);
    const vazia = copiaComItem("dre", (i) => ({ ...i, rotulo: " " }) as ItemDaNavegacao);
    expect(problemasDaNavegacao(vazia)).toHaveLength(1);
  });
});
