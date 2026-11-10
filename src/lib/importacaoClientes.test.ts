import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClienteParaImportar } from "@/schemas/importacaoClientes";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";

// Supabase simulado: guarda o que foi inserido/atualizado e devolve o que o teste mandar.
interface Chamada {
  tabela: string;
  operacao: string;
  dados?: unknown;
  filtros: [string, unknown][];
  faixa?: [number, number];
}
let chamadas: Chamada[] = [];
let leituras: Record<string, (faixa: [number, number]) => unknown[]> = {};
let falharNaInsercaoDe: { tabela: string; numero: number } | null = null;
let insercoesFeitas: Record<string, number> = {};
const rpc = vi.fn();

function construtor(tabela: string) {
  const c: Chamada = { tabela, operacao: "select", filtros: [] };
  const q: Record<string, unknown> = {};
  const registrar = () => chamadas.push(c);
  q.select = () => q;
  q.insert = (dados: unknown) => {
    c.operacao = "insert";
    c.dados = dados;
    return q;
  };
  q.update = (dados: unknown) => {
    c.operacao = "update";
    c.dados = dados;
    return q;
  };
  q.neq = (col: string, v: unknown) => (c.filtros.push([`neq:${col}`, v]), q);
  q.eq = (col: string, v: unknown) => (c.filtros.push([`eq:${col}`, v]), q);
  q.order = () => q;
  q.range = (de: number, ate: number) => ((c.faixa = [de, ate]), q);
  q.single = () => ((c.operacao += ":single"), q);
  q.then = (ok: (r: unknown) => unknown, ruim?: (e: unknown) => unknown) => {
    registrar();
    let resposta: unknown;
    if (c.operacao.startsWith("insert")) {
      insercoesFeitas[tabela] = (insercoesFeitas[tabela] ?? 0) + 1;
      if (falharNaInsercaoDe?.tabela === tabela && insercoesFeitas[tabela] === falharNaInsercaoDe.numero) {
        resposta = { data: null, error: { message: "queda de conexão" } };
      } else if (tabela === "importacao_lotes") {
        resposta = { data: { id: "lote-1" }, error: null };
      } else {
        resposta = { data: null, error: null };
      }
    } else if (c.operacao === "update") {
      resposta = { data: null, error: null };
    } else {
      resposta = { data: (leituras[tabela] ?? (() => []))(c.faixa ?? [0, 0]), error: null };
    }
    return Promise.resolve(resposta).then(ok, ruim);
  };
  return q;
}

vi.mock("./supabase", () => ({
  supabase: {
    from: (t: string) => construtor(t),
    rpc: (...a: unknown[]) => rpc(...a),
  },
}));

const lib = await import("./importacaoClientes");

function grupo(nome: string, placas: string[], existenteId: string | null = null): ClienteParaImportar {
  return {
    chave: `nome:${nome}`,
    clienteExistenteId: existenteId,
    cliente: {
      nome, tipo_pessoa: "fisica", cpf_cnpj: "", telefone: "", email: "", cep: "", rua: "",
      numero: "", bairro: "", cidade: "", uf: "", codigo_municipio: null, data_nascimento: null,
    },
    veiculos: placas.map((placa) => ({
      placa, marca: "", modelo: "", ano: null, cor: "", tipo: null, km_atual: null,
    })),
    linhas: [2],
  };
}

const doTipo = (tabela: string, operacao: string) =>
  chamadas.filter((c) => c.tabela === tabela && c.operacao.startsWith(operacao));

beforeEach(() => {
  chamadas = [];
  leituras = {};
  falharNaInsercaoDe = null;
  insercoesFeitas = {};
  rpc.mockReset();
});

describe("carregarCadastroParaConferir", () => {
  it("lê clientes e placas por páginas de 1000 e deixa o Consumidor de fora", async () => {
    const tantos = (prefixo: string, n: number, de: number) =>
      Array.from({ length: n }, (_, i) => ({ id: `${prefixo}${de + i}`, nome: `N${de + i}`, cpf_cnpj: null, placa: `P${de + i}` }));
    leituras.clientes = ([de]) => (de === 0 ? tantos("c", 1000, 0) : de === 1000 ? tantos("c", 250, 1000) : []);
    leituras.veiculos = ([de]) => (de === 0 ? tantos("v", 1000, 0) : tantos("v", 5, 1000));
    const r = await lib.carregarCadastroParaConferir();
    expect(r.clientes).toHaveLength(1250);
    expect(r.placas).toHaveLength(1005);
    expect(r.clientes[1249]).toEqual({ id: "c1249", nome: "N1249", cpf_cnpj: null });
    const deClientes = doTipo("clientes", "select");
    expect(deClientes.map((c) => c.faixa)).toEqual([[0, 999], [1000, 1999]]);
    expect(deClientes[0].filtros).toContainEqual(["neq:id", CLIENTE_CONSUMIDOR_ID]);
  });
});

describe("importarClientes", () => {
  it("cria o lote, grava clientes com o lote e liga cada veículo ao id certo", async () => {
    const r = await lib.importarClientes(
      [grupo("Ana", ["AAA1A11", "AAA1A12"]), grupo("Bia", ["BBB2B22"]), grupo("Velho", ["CCC3C33"], "id-do-velho")],
      { nomeArquivo: "lista.csv", totalLinhas: 5 },
    );
    const lote = doTipo("importacao_lotes", "insert")[0].dados as Record<string, unknown>;
    expect(lote).toMatchObject({ tipo: "clientes", nome_arquivo: "lista.csv", total_linhas: 5 });

    const clientes = doTipo("clientes", "insert").flatMap((c) => c.dados as { id: string; nome: string; importacao_lote_id: string }[]);
    expect(clientes.map((c) => c.nome)).toEqual(["Ana", "Bia"]);
    expect(clientes.every((c) => c.importacao_lote_id === "lote-1")).toBe(true);
    const idAna = clientes[0].id;
    const idBia = clientes[1].id;
    expect(idAna).not.toBe(idBia);

    const veiculos = doTipo("veiculos", "insert").flatMap((c) => c.dados as { placa: string; cliente_id: string; importacao_lote_id: string }[]);
    const doCliente = (placa: string) => veiculos.find((v) => v.placa === placa)!.cliente_id;
    expect(doCliente("AAA1A11")).toBe(idAna);
    expect(doCliente("AAA1A12")).toBe(idAna);
    expect(doCliente("BBB2B22")).toBe(idBia);
    expect(doCliente("CCC3C33")).toBe("id-do-velho");
    expect(veiculos.every((v) => v.importacao_lote_id === "lote-1")).toBe(true);
    expect(r).toEqual({ loteId: "lote-1", clientesCriados: 2, veiculosCriados: 4 });
  });

  it("grava em blocos de 500 e avisa o andamento entre eles", async () => {
    const grupos = Array.from({ length: 1100 }, (_, i) => grupo(`Cli ${i}`, []));
    const avisos: [number, number][] = [];
    await lib.importarClientes(grupos, { nomeArquivo: "a.csv", totalLinhas: 1100 }, (f, t) => avisos.push([f, t]));
    expect(doTipo("clientes", "insert").map((c) => (c.dados as unknown[]).length)).toEqual([500, 500, 100]);
    expect(avisos[avisos.length - 1]).toEqual([1100, 1100]);
    expect(avisos.length).toBeGreaterThanOrEqual(3);
  });

  it("no fim atualiza o lote com quantos clientes e veículos entraram", async () => {
    await lib.importarClientes([grupo("Ana", ["AAA1A11"])], { nomeArquivo: "a.csv", totalLinhas: 1 });
    const upd = doTipo("importacao_lotes", "update");
    expect(upd).toHaveLength(1);
    expect(upd[0].dados).toEqual({ clientes_criados: 1, veiculos_criados: 1 });
    expect(upd[0].filtros).toContainEqual(["eq:id", "lote-1"]);
  });

  it("se cair no meio, o erro diz que o que entrou ficou no lote e dá pra desfazer", async () => {
    const grupos = Array.from({ length: 600 }, (_, i) => grupo(`Cli ${i}`, []));
    falharNaInsercaoDe = { tabela: "clientes", numero: 2 };
    await expect(lib.importarClientes(grupos, { nomeArquivo: "a.csv", totalLinhas: 600 })).rejects.toThrow(/desfazer/i);
    // o que já tinha entrado fica contado no lote
    const upd = doTipo("importacao_lotes", "update");
    expect(upd[0].dados).toMatchObject({ clientes_criados: 500 });
  });
});

describe("lotes", () => {
  it("lista os lotes do mais novo pro mais velho", async () => {
    leituras.importacao_lotes = () => [{ id: "l1" }];
    expect(await lib.listarLotesImportacao()).toEqual([{ id: "l1" }]);
  });

  it("desfazer chama a função do banco com o lote e devolve o resultado", async () => {
    const resultado = { veiculos_apagados: 2, clientes_apagados: 1, mantidos: [] };
    rpc.mockResolvedValue({ data: resultado, error: null });
    expect(await lib.desfazerImportacao("lote-9")).toEqual(resultado);
    expect(rpc).toHaveBeenCalledWith("desfazer_importacao", { p_lote: "lote-9" });
  });

  it("desfazer lote já desfeito: o erro do banco sobe", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Importação já desfeita" } });
    await expect(lib.desfazerImportacao("lote-9")).rejects.toMatchObject({ message: "Importação já desfeita" });
  });
});
