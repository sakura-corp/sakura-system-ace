import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  conexaoAtual,
  ehPalavraDemo,
  entrarNaDemonstracao,
  mensagemDoTeste,
  modoDemonstracao,
  sairDaDemonstracao,
  salvarConexao,
} from "./conexao";

// O módulo real da demonstração carrega os dados inventados; aqui só importa o
// endereço, então um de mentira basta (e o teste não depende de quem o escreve).
vi.mock("@/demo/fetchDemo", () => ({
  ENDERECO_DEMO: "https://demonstracao.invalid",
}));
const ENDERECO_DEMO = "https://demonstracao.invalid";

// Os testes rodam em Node puro: não há `window` nem `sessionStorage`, então
// montamos os dois à mão (o `sessionStorage` do Electron morre ao fechar a
// janela, e é isso que faz a demonstração valer "até fechar o programa").
function montarJanela(conexaoSalva?: { url: string; chave: string }) {
  const memoria = new Map<string, string>();
  const salvarConexaoDoApp = vi.fn(async () => {});
  const recarregar = vi.fn();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => memoria.get(k) ?? null,
    setItem: (k: string, v: string) => void memoria.set(k, v),
    removeItem: (k: string) => void memoria.delete(k),
  });
  vi.stubGlobal("window", {
    sakuraApp: { conexao: conexaoSalva, salvarConexao: salvarConexaoDoApp },
    location: { reload: recarregar },
  });
  return { salvarConexaoDoApp, recarregar };
}

describe("modo demonstração", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reconhece a palavra demo, sem ligar pra espaço nem maiúscula", () => {
    expect(ehPalavraDemo("demo")).toBe(true);
    expect(ehPalavraDemo("  Demo ")).toBe(true);
    expect(ehPalavraDemo("DEMO")).toBe(true);
    expect(ehPalavraDemo("demonstracao")).toBe(false);
    expect(ehPalavraDemo("https://x.supabase.co")).toBe(false);
    expect(ehPalavraDemo("")).toBe(false);
  });

  it("entrar não grava nada no computador e passa a usar o endereço de mentira", () => {
    const { salvarConexaoDoApp, recarregar } = montarJanela({
      url: "https://loja.supabase.co",
      chave: "chave-da-loja",
    });
    expect(modoDemonstracao()).toBe(false);
    entrarNaDemonstracao();
    expect(salvarConexaoDoApp).not.toHaveBeenCalled();
    expect(recarregar).toHaveBeenCalledTimes(1);
    expect(modoDemonstracao()).toBe(true);
    expect(conexaoAtual()).toEqual({ url: ENDERECO_DEMO, chave: "demo" });
  });

  it("sair volta à conexão que estava salva", () => {
    const { recarregar } = montarJanela({
      url: "https://loja.supabase.co",
      chave: "chave-da-loja",
    });
    entrarNaDemonstracao();
    sairDaDemonstracao();
    expect(recarregar).toHaveBeenCalledTimes(2);
    expect(modoDemonstracao()).toBe(false);
    expect(conexaoAtual()).toEqual({
      url: "https://loja.supabase.co",
      chave: "chave-da-loja",
    });
  });

  it("sem conexão salva, sair deixa sem conexão (cai na tela de conexão)", () => {
    montarJanela();
    entrarNaDemonstracao();
    sairDaDemonstracao();
    expect(conexaoAtual()).toBeNull();
  });

  it("fora da demonstração, a conexão salva sai igual a de sempre", () => {
    montarJanela({ url: "https://loja.supabase.co", chave: "chave-da-loja" });
    expect(conexaoAtual()).toEqual({
      url: "https://loja.supabase.co",
      chave: "chave-da-loja",
    });
  });

  it("salvar uma conexão de verdade tira da demonstração", async () => {
    const { salvarConexaoDoApp } = montarJanela();
    entrarNaDemonstracao();
    await salvarConexao({ url: "https://loja.supabase.co", chave: "k" });
    expect(salvarConexaoDoApp).toHaveBeenCalledTimes(1);
    expect(modoDemonstracao()).toBe(false);
  });

  it("sem sessionStorage (bloqueado) não quebra e fica fora da demonstração", () => {
    vi.stubGlobal("window", { sakuraApp: {} });
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    });
    expect(modoDemonstracao()).toBe(false);
  });
});

describe("mensagemDoTeste", () => {
  it("aceita a conexão quando o Supabase não devolve erro nenhum", () => {
    expect(mensagemDoTeste(null)).toBeNull();
  });

  it("aponta a chave quando o erro fala de API key", () => {
    expect(mensagemDoTeste({ message: "Invalid API key" })).toContain("chave");
    expect(mensagemDoTeste({ message: "No API key found in request" })).toContain("chave");
  });

  it("aponta as migrations quando o banco não tem as tabelas do sistema", () => {
    expect(
      mensagemDoTeste({
        code: "PGRST205",
        message: "Could not find the table 'public.lojas'",
      }),
    ).toContain("migrations");
    expect(
      mensagemDoTeste({
        code: "42P01",
        message: 'relation "lojas" does not exist',
      }),
    ).toContain("migrations");
  });

  it("repassa qualquer outro erro do Supabase em vez de escondê-lo", () => {
    expect(mensagemDoTeste({ message: "algo inesperado" })).toContain("algo inesperado");
  });
});
