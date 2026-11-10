// @vitest-environment jsdom
/**
 * O gancho das listas por página (#373). O "banco" aqui é uma função de
 * mentira que ordena e corta uma tabela inteira, como o Postgres faria: o que
 * o teste prova é que o gancho pede a página, a ordem e a busca ao banco e
 * mostra o que ele devolveu, sem reordenar nada no computador.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useListaPaginada,
  type OrdemDaLista,
  type PaginaDaLista,
  type PedidoDePagina,
} from "./useListaPaginada";

type Coluna = "nome" | "cidade";
interface Linha {
  id: string;
  nome: string;
}

// 120 nomes fora de ordem de propósito: "Pessoa 000" … "Pessoa 119".
const TABELA: Linha[] = Array.from({ length: 120 }, (_, i) => {
  const n = (i * 37) % 120;
  return { id: `id-${String(n).padStart(3, "0")}`, nome: `Pessoa ${String(n).padStart(3, "0")}` };
});

function bancoDeMentira(pedido: PedidoDePagina<Coluna>): Promise<PaginaDaLista<Linha>> {
  const achados = TABELA.filter((l) => l.nome.toLowerCase().includes(pedido.busca.toLowerCase()));
  const ordenados = [...achados].sort(
    (a, b) => a.nome.localeCompare(b.nome) * (pedido.ordem.crescente ? 1 : -1),
  );
  return Promise.resolve({
    linhas: ordenados.slice(pedido.de, pedido.ate + 1),
    total: achados.length,
  });
}

const PADRAO: OrdemDaLista<Coluna> = { coluna: "nome", crescente: true };

function montar(buscarPagina = vi.fn(bancoDeMentira), chave = "teste") {
  const gancho = renderHook(() =>
    useListaPaginada<Linha, Coluna>({
      chave,
      buscarPagina,
      ordemPadrao: PADRAO,
      colunas: ["nome", "cidade"],
      esperaDaBusca: 0,
    }),
  );
  return { ...gancho, buscarPagina };
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("useListaPaginada — página e ordem no banco", () => {
  it("com 120 linhas, a página 1 tem 50, e o total é 120", async () => {
    const { result, buscarPagina } = montar();
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.linhas).toHaveLength(50);
    expect(result.current.total).toBe(120);
    expect(result.current.primeira).toBe(1);
    expect(result.current.ultima).toBe(50);
    expect(result.current.totalDePaginas).toBe(3);
    expect(buscarPagina).toHaveBeenLastCalledWith({ de: 0, ate: 49, ordem: PADRAO, busca: "" });
  });

  it("ordenar por Nome decrescente traz na página 1 os últimos da tabela INTEIRA", async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.trocarOrdem("nome"));
    await waitFor(() => expect(result.current.ordem.crescente).toBe(false));
    await waitFor(() => expect(result.current.linhas[0]?.nome).toBe("Pessoa 119"));
    expect(result.current.linhas[49].nome).toBe("Pessoa 070");
  });

  it("o primeiro da página 2 vem logo depois do último da página 1", async () => {
    const { result, buscarPagina } = montar();
    await waitFor(() => expect(result.current.carregando).toBe(false));
    const ultimoDaPagina1 = result.current.linhas[49].nome;

    act(() => result.current.proxima());
    await waitFor(() => expect(result.current.pagina).toBe(1));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(ultimoDaPagina1).toBe("Pessoa 049");
    expect(result.current.linhas[0].nome).toBe("Pessoa 050");
    expect(result.current.primeira).toBe(51);
    expect(result.current.ultima).toBe(100);
    expect(buscarPagina).toHaveBeenLastCalledWith({ de: 50, ate: 99, ordem: PADRAO, busca: "" });

    act(() => result.current.proxima());
    await waitFor(() => expect(result.current.ultima).toBe(120));
    expect(result.current.temProxima).toBe(false);
    act(() => result.current.proxima());
    expect(result.current.pagina).toBe(2);
  });

  it("trocar a ordem volta pra página 1", async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.carregando).toBe(false));
    act(() => result.current.proxima());
    await waitFor(() => expect(result.current.pagina).toBe(1));

    act(() => result.current.trocarOrdem("cidade"));
    expect(result.current.pagina).toBe(0);
    expect(result.current.ordem).toEqual({ coluna: "cidade", crescente: true });
  });
});

describe("useListaPaginada — busca", () => {
  it("a busca vai pro banco e volta pra página 1", async () => {
    const { result, buscarPagina } = montar();
    await waitFor(() => expect(result.current.carregando).toBe(false));
    act(() => result.current.proxima());
    await waitFor(() => expect(result.current.pagina).toBe(1));

    act(() => result.current.setBusca("11"));
    await waitFor(() => expect(result.current.buscaAplicada).toBe("11"));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.pagina).toBe(0);
    expect(buscarPagina).toHaveBeenLastCalledWith({ de: 0, ate: 49, ordem: PADRAO, busca: "11" });
    expect(result.current.linhas.map((l) => l.nome)).toEqual([
      "Pessoa 011",
      "Pessoa 110",
      "Pessoa 111",
      "Pessoa 112",
      "Pessoa 113",
      "Pessoa 114",
      "Pessoa 115",
      "Pessoa 116",
      "Pessoa 117",
      "Pessoa 118",
      "Pessoa 119",
    ]);
  });

  it("a resposta de uma busca antiga que chega depois não troca a lista", async () => {
    const pendentes = new Map<string, (p: PaginaDaLista<Linha>) => void>();
    const buscarPagina = vi.fn(
      (pedido: PedidoDePagina<Coluna>) =>
        new Promise<PaginaDaLista<Linha>>((resolver) => pendentes.set(pedido.busca, resolver)),
    );
    const { result } = montar(buscarPagina);
    await waitFor(() => expect(pendentes.has("")).toBe(true));
    await act(async () => pendentes.get("")!({ linhas: TABELA.slice(0, 50), total: 120 }));

    act(() => result.current.setBusca("Ana"));
    await waitFor(() => expect(pendentes.has("Ana")).toBe(true));
    act(() => result.current.setBusca("Ana Paula"));
    await waitFor(() => expect(pendentes.has("Ana Paula")).toBe(true));

    // A nova responde primeiro; a velha chega depois.
    await act(async () =>
      pendentes.get("Ana Paula")!({ linhas: [{ id: "n", nome: "Ana Paula" }], total: 1 }),
    );
    await act(async () =>
      pendentes.get("Ana")!({
        linhas: [
          { id: "v1", nome: "Ana" },
          { id: "v2", nome: "Ana Paula" },
        ],
        total: 2,
      }),
    );

    expect(result.current.linhas).toEqual([{ id: "n", nome: "Ana Paula" }]);
    expect(result.current.total).toBe(1);
    expect(result.current.carregando).toBe(false);
  });

  it("o erro de uma consulta velha não aparece por cima da nova", async () => {
    const pendentes = new Map<string, [(p: PaginaDaLista<Linha>) => void, (e: unknown) => void]>();
    const buscarPagina = vi.fn(
      (pedido: PedidoDePagina<Coluna>) =>
        new Promise<PaginaDaLista<Linha>>((ok, falha) => pendentes.set(pedido.busca, [ok, falha])),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = montar(buscarPagina);
    await waitFor(() => expect(pendentes.has("")).toBe(true));
    act(() => result.current.setBusca("x"));
    await waitFor(() => expect(pendentes.has("x")).toBe(true));

    await act(async () => pendentes.get("x")![0]({ linhas: [{ id: "x", nome: "X" }], total: 1 }));
    await act(async () => pendentes.get("")![1]({ message: "caiu" }));

    expect(result.current.erro).toBeNull();
    expect(result.current.linhas).toEqual([{ id: "x", nome: "X" }]);
  });
});

describe("useListaPaginada — ordem guardada por tela", () => {
  it("a ordem escolhida volta quando a tela abre de novo", async () => {
    const primeira = montar();
    await waitFor(() => expect(primeira.result.current.carregando).toBe(false));
    act(() => primeira.result.current.trocarOrdem("nome"));
    primeira.unmount();

    const segunda = montar();
    expect(segunda.result.current.ordem).toEqual({ coluna: "nome", crescente: false });
    await waitFor(() => expect(segunda.result.current.linhas[0]?.nome).toBe("Pessoa 119"));
  });

  it("cada tela guarda a sua", async () => {
    const clientes = montar(undefined, "clientes");
    await waitFor(() => expect(clientes.result.current.carregando).toBe(false));
    act(() => clientes.result.current.trocarOrdem("cidade"));
    const outra = montar(undefined, "outra");
    expect(outra.result.current.ordem).toEqual(PADRAO);
  });

  it("lixo guardado (ou coluna que não existe mais) volta pro padrão", () => {
    localStorage.setItem("sakura:ordem-da-lista:teste", "{não é json");
    expect(montar().result.current.ordem).toEqual(PADRAO);
    localStorage.setItem(
      "sakura:ordem-da-lista:teste",
      JSON.stringify({ coluna: "telefone", crescente: false }),
    );
    expect(montar().result.current.ordem).toEqual(PADRAO);
  });

  it("sem localStorage (ele falha), a lista funciona com a ordem padrão", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    const { result } = montar();
    expect(result.current.ordem).toEqual(PADRAO);
    await waitFor(() => expect(result.current.carregando).toBe(false));
    act(() => result.current.trocarOrdem("nome"));
    await waitFor(() => expect(result.current.linhas[0]?.nome).toBe("Pessoa 119"));
  });
});

describe("useListaPaginada — recarregar", () => {
  it("recarrega a página atual (depois de salvar)", async () => {
    const { result, buscarPagina } = montar();
    await waitFor(() => expect(result.current.carregando).toBe(false));
    act(() => result.current.proxima());
    await waitFor(() => expect(result.current.primeira).toBe(51));

    buscarPagina.mockClear();
    await act(() => result.current.recarregar());
    expect(buscarPagina).toHaveBeenCalledWith({ de: 50, ate: 99, ordem: PADRAO, busca: "" });
    expect(result.current.pagina).toBe(1);
  });

  it("se a página ficou vazia (excluiu o último dela), volta pra última que existe", async () => {
    let tamanho = 51;
    const buscarPagina = vi.fn((pedido: PedidoDePagina<Coluna>) =>
      bancoDeMentira(pedido).then(() => ({
        linhas: TABELA.slice(0, tamanho).slice(pedido.de, pedido.ate + 1),
        total: tamanho,
      })),
    );
    const { result } = montar(buscarPagina);
    await waitFor(() => expect(result.current.carregando).toBe(false));
    act(() => result.current.proxima());
    await waitFor(() => expect(result.current.linhas).toHaveLength(1));

    tamanho = 50;
    await act(() => result.current.recarregar());
    await waitFor(() => expect(result.current.pagina).toBe(0));
    await waitFor(() => expect(result.current.linhas).toHaveLength(50));
    expect(result.current.temProxima).toBe(false);
  });
});

describe("useListaPaginada — achados da revisão final", () => {
  it("um 'recarregar' guardado de antes (salvar demorado) recarrega a página de AGORA", async () => {
    const { result, buscarPagina } = montar();
    await waitFor(() => expect(result.current.carregando).toBe(false));
    const recarregarDeAntes = result.current.recarregar;

    act(() => result.current.proxima());
    await waitFor(() => expect(result.current.primeira).toBe(51));
    buscarPagina.mockClear();

    act(() => recarregarDeAntes());
    await waitFor(() => expect(buscarPagina).toHaveBeenCalled());
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(buscarPagina).toHaveBeenLastCalledWith({ de: 50, ate: 99, ordem: PADRAO, busca: "" });
    expect(result.current.primeira).toBe(51);
  });

  it("enquanto a próxima página carrega, o 'Mostrando' fala das linhas que estão na tela", async () => {
    let soltar: (() => void) | null = null;
    const buscarPagina = vi.fn((pedido: PedidoDePagina<Coluna>) =>
      pedido.de === 0
        ? bancoDeMentira(pedido)
        : new Promise<PaginaDaLista<Linha>>((ok) => {
            soltar = () => void bancoDeMentira(pedido).then(ok);
          }),
    );
    const { result } = montar(buscarPagina);
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.proxima());
    await waitFor(() => expect(soltar).not.toBeNull());
    expect(result.current.carregando).toBe(true);
    expect(result.current.primeira).toBe(1);
    expect(result.current.ultima).toBe(50);

    await act(async () => soltar!());
    await waitFor(() => expect(result.current.primeira).toBe(51));
  });
});
