import { describe, expect, it } from "vitest";
import { andarDoItem, fraseDoAndar, NAVEGACAO, problemasDaNavegacao, type GrupoDaNavegacao, type ItemDaNavegacao } from "./navegacao";

// Escritos aqui, e não importados da lista: trocar o endereço na lista tem que reprovar (decisão da #542).
const ENDERECOS_QUE_EXISTEM = { inicio: "/", leva: "/leva", sala: "/sala", escritorio: "/escritorio", levas: "/levas", financeiro: "/financeiro", relatorio: "/relatorio", decisoes: "/decisoes" };

// Todos os endereços que já existiam antes dos andares (#591): escritos aqui, a lista não pode mudar nenhum.
const ENDERECOS_EM_BREVE_ANTIGOS = ["versoes", "fases", "pessoas", "dre", "lojas", "configuracoes"];

// Os andares como a Sofia decidiu na #591, de cima da barra pra baixo (a ordem de uso, começando pelo Térreo).
const ANDARES = [
  { id: "terreo", titulo: "Térreo · Recepção", itens: ["inicio"], chefes: [] },
  { id: "producao", titulo: "1º · Produção", itens: ["leva", "levas", "fases", "relatorio", "sala", "escritorio", "pessoas"], chefes: ["frontend", "backend", "tester"] },
  { id: "comercial", titulo: "2º · Comercial e pós-venda", itens: ["lojas", "posvenda"], chefes: ["marketing"] },
  { id: "financeiro", titulo: "3º · Financeiro", itens: ["financeiro", "dre"], chefes: [] },
  { id: "seguranca", titulo: "4º · Segurança e operação", itens: ["versoes", "bancos"], chefes: ["segurança"] },
  { id: "diretoria", titulo: "Cobertura · Diretoria", itens: ["decisoes"], chefes: [] },
];

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

  it("tem os 6 andares na ordem da tabela, com os itens e os chefes certos, e o rodapé por último", () => {
    const andares = NAVEGACAO.filter((g) => g.id !== "rodape");
    expect(andares.map((g) => g.id)).toEqual(ANDARES.map((a) => a.id));
    for (const [i, esperado] of ANDARES.entries()) {
      expect(andares[i].titulo, esperado.id).toBe(esperado.titulo);
      expect(andares[i].itens.map((x) => x.id), esperado.id).toEqual(esperado.itens);
      expect(andares[i].chefes ?? [], esperado.id).toEqual(esperado.chefes);
    }
    expect(NAVEGACAO.at(-1)?.id).toBe("rodape");
    expect(NAVEGACAO.at(-1)?.itens.map((x) => x.id)).toEqual(["configuracoes"]);
    for (const i of todosOsItens) expect(i.icone, i.id).toBeTruthy();
  });

  it("os 2 itens novos que ainda faltam são em breve, com endereço /em-breve/<id> e do que dependem", () => {
    for (const id of ["posvenda", "bancos"]) {
      const item = todosOsItens.find((i) => i.id === id);
      expect(item?.emBreve, id).toBe(true);
      expect(item?.href, id).toBe(`/em-breve/${id}`);
    }
  });

  it("todos os endereços em breve que já existiam continuam abrindo a mesma página", () => {
    for (const id of ENDERECOS_EM_BREVE_ANTIGOS) {
      const item = todosOsItens.find((i) => i.id === id);
      expect(item?.emBreve, id).toBe(true);
      expect(item?.href, id).toBe(`/em-breve/${id}`);
    }
  });
});

describe("andarDoItem", () => {
  it("acha o andar do item, com os chefes", () => {
    expect(andarDoItem("pessoas")?.titulo).toBe("1º · Produção");
    expect(andarDoItem("pessoas")?.chefes).toEqual(["frontend", "backend", "tester"]);
    expect(andarDoItem("bancos")?.titulo).toBe("4º · Segurança e operação");
    expect(andarDoItem("decisoes")?.titulo).toBe("Cobertura · Diretoria");
  });
  it("item que não existe → undefined", () => {
    expect(andarDoItem("nao-existe")).toBeUndefined();
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

describe("fraseDoAndar (#601): o que a página em breve diz de quem cuida do andar, sem nome de chefe em inglês", () => {
  it("com tarefa e chefes: a frase continua a da tarefa, com os chefes por área", () => {
    expect(fraseDoAndar(["frontend", "backend", "tester"], true)).toBe(", no andar das telas, dos dados e dos testes.");
  });
  it("chefe único: marketing e segurança, cada um com o seu artigo", () => {
    expect(fraseDoAndar(["marketing"], true)).toBe(", no andar do marketing.");
    expect(fraseDoAndar(["segurança"], false)).toBe("o andar da segurança.");
  });
  it("sem tarefa: a frase começa pelo andar", () => {
    expect(fraseDoAndar(["frontend", "backend", "tester"], false)).toBe("o andar das telas, dos dados e dos testes.");
  });
  it("andar sem chefe: diz que ainda não tem, com ou sem tarefa (a linha nunca some)", () => {
    expect(fraseDoAndar([], true)).toBe(". O andar ainda não tem chefe.");
    expect(fraseDoAndar([], false)).toBe("o andar ainda não tem chefe.");
  });
  it("função que a lista não conhece: usa o nome dela, sem quebrar", () => {
    expect(fraseDoAndar(["juridico"], false)).toBe("o andar de juridico.");
  });
  it("nenhum chefe da lista aparece em inglês", () => {
    for (const g of NAVEGACAO) {
      const frase = fraseDoAndar(g.chefes ?? [], true);
      expect(frase, g.id).not.toMatch(/frontend|backend|tester/);
    }
  });
});
