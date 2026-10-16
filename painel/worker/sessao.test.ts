import { describe, expect, it } from "vitest";
import {
  cifrarSessao,
  decifrarSessao,
  estadoConfere,
  lerCookie,
  caminhoDeVolta,
  montarCookie,
  novoEstado,
  precisaRenovar,
  sessaoVencida,
  type Sessao,
} from "./sessao";

const CHAVE = "chave-de-teste-com-mais-de-trinta-e-dois-caracteres-0123456789";
const sessao: Sessao = { token: "ghu_teste", refresh: "ghr_teste", expiraEm: 1_000_000, login: "fulana", avatar: "https://avatars.exemplo/1", entrouEm: 0 };

describe("sessão cifrada", () => {
  it("cifra e decifra de volta igual", async () => {
    const cookie = await cifrarSessao(sessao, CHAVE);
    expect(await decifrarSessao(cookie, CHAVE)).toEqual(sessao);
  });

  it("o cookie não mostra o token nem o login", async () => {
    const cookie = await cifrarSessao(sessao, CHAVE);
    expect(cookie).not.toContain("ghu_");
    expect(cookie).not.toContain("fulana");
    expect(cookie).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("cada vez sai um cookie diferente (IV novo)", async () => {
    expect(await cifrarSessao(sessao, CHAVE)).not.toBe(await cifrarSessao(sessao, CHAVE));
  });

  it("recusa sessão adulterada (qualquer caractere trocado)", async () => {
    const cookie = await cifrarSessao(sessao, CHAVE);
    for (const i of [0, 5, 13, Math.floor(cookie.length / 2), cookie.length - 2]) {
      const troca = cookie[i] === "A" ? "B" : "A";
      const adulterado = cookie.slice(0, i) + troca + cookie.slice(i + 1);
      expect(await decifrarSessao(adulterado, CHAVE)).toBeNull();
    }
  });

  it("recusa sessão cifrada com outra chave", async () => {
    const cookie = await cifrarSessao(sessao, CHAVE);
    expect(await decifrarSessao(cookie, CHAVE + "x")).toBeNull();
  });

  it("recusa lixo, vazio e cookie cortado", async () => {
    const cookie = await cifrarSessao(sessao, CHAVE);
    for (const lixo of ["", "abc", "!!!", "x".repeat(100), cookie.slice(0, 20), cookie.slice(0, -4)]) {
      expect(await decifrarSessao(lixo, CHAVE)).toBeNull();
    }
  });

  it("recusa conteúdo cifrado certo mas sem o formato de sessão", async () => {
    const cookie = await cifrarSessao({ ...sessao, token: "" }, CHAVE);
    expect(await decifrarSessao(cookie, CHAVE)).toBeNull();
  });
});

describe("state do login", () => {
  it("novo estado é longo e diferente a cada vez", () => {
    const a = novoEstado();
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(novoEstado()).not.toBe(a);
  });

  it("confere só quando é igual", () => {
    const e = novoEstado();
    expect(estadoConfere(e, e)).toBe(true);
    expect(estadoConfere(e, novoEstado())).toBe(false);
    expect(estadoConfere(e, e.slice(0, -1) + (e.endsWith("A") ? "B" : "A"))).toBe(false);
    expect(estadoConfere(e, null)).toBe(false);
    expect(estadoConfere(undefined, e)).toBe(false);
    expect(estadoConfere("", "")).toBe(false);
    expect(estadoConfere("curto", "curto")).toBe(false);
  });
});

describe("renovar e cookies", () => {
  it("renova quando venceu ou falta menos de um minuto; token que não vence, nunca", () => {
    expect(precisaRenovar({ ...sessao, expiraEm: 100_000 }, 0)).toBe(false);
    expect(precisaRenovar({ ...sessao, expiraEm: 100_000 }, 50_000)).toBe(true);
    expect(precisaRenovar({ ...sessao, expiraEm: 100_000 }, 200_000)).toBe(true);
    expect(precisaRenovar({ ...sessao, expiraEm: 0 }, 9e15)).toBe(false);
  });

  it("lê o cookie certo entre vários", () => {
    const r = new Request("https://x", { headers: { cookie: "a=1; sessao=abc; sessao_x=2" } });
    expect(lerCookie(r, "sessao")).toBe("abc");
    expect(lerCookie(r, "nada")).toBeUndefined();
  });

  it("o cookie sai HttpOnly, Secure e SameSite=Lax (sem Secure só quando pedido, no http://localhost)", () => {
    expect(montarCookie("sessao", "v", 60)).toBe("sessao=v; Path=/; Max-Age=60; HttpOnly; Secure; SameSite=Lax");
    expect(montarCookie("sessao", "v", 60, "/", false)).toBe("sessao=v; Path=/; Max-Age=60; HttpOnly; SameSite=Lax");
  });

  it("a sessão acaba 30 dias depois de entrar", () => {
    const dia = 24 * 60 * 60 * 1000;
    expect(sessaoVencida({ ...sessao, entrouEm: 0 }, 29 * dia)).toBe(false);
    expect(sessaoVencida({ ...sessao, entrouEm: 0 }, 31 * dia)).toBe(true);
  });

  it("depois do login, só volta pra página do próprio painel", () => {
    expect(caminhoDeVolta("/sala?tv")).toBe("/sala?tv");
    expect(caminhoDeVolta(encodeURIComponent("/sala?tv"))).toBe("/sala?tv");
    expect(caminhoDeVolta("/escritorio")).toBe("/escritorio");
    for (const ruim of [null, undefined, "", "sala", "//mal.exemplo", "/\\mal.exemplo", "https://mal.exemplo", "%2F%2Fmal.exemplo", "/api/sair", "%E0%A4%A", "/a\nb"]) {
      expect(caminhoDeVolta(ruim)).toBe("/");
    }
  });
});
