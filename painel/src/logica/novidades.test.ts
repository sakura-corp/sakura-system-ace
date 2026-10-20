import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { carregarNovidades, linkDaNovidade, MAXIMO_DE_NOVIDADES, novidadesDeHoje, textoDaNovidade, type Novidade } from "./novidades";

// O fuso do computador de quem usa (Brasil, UTC-3). O Node aceita trocar o TZ com o processo rodando.
const ambiente = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
const TZ_ANTES = ambiente.TZ;
beforeAll(() => {
  ambiente.TZ = "America/Sao_Paulo";
});
afterAll(() => {
  if (TZ_ANTES === undefined) delete ambiente.TZ;
  else ambiente.TZ = TZ_ANTES;
});

const pegou = (id: string, quando: string, extra: Partial<Novidade> = {}): Novidade =>
  ({ id, quando, tipo: "tarefa", acao: "pegou", quem: "fulana", numero: 510, ...extra }) as Novidade;

describe("novidadesDeHoje (#549)", () => {
  // 20/10, meio-dia em São Paulo.
  const AGORA = new Date("2026-10-20T15:00:00Z");

  it("ontem às 22h30 em São Paulo (já 20/10 em UTC) não é hoje; hoje à 0h05 é", () => {
    const ontemTarde = pegou("a", "2026-10-20T01:30:00Z");
    const hojeCedo = pegou("b", "2026-10-20T03:05:00Z");
    expect(novidadesDeHoje([ontemTarde, hojeCedo], AGORA).map((n) => n.id)).toEqual(["b"]);
  });

  it("hoje às 22h em São Paulo (já amanhã em UTC) ainda é hoje", () => {
    const noite = pegou("c", "2026-10-21T01:00:00Z");
    expect(novidadesDeHoje([noite], new Date("2026-10-21T01:30:00Z")).map((n) => n.id)).toEqual(["c"]);
  });

  it("da mais nova pra mais velha, no máximo 15", () => {
    const muitas = Array.from({ length: 20 }, (_, i) => pegou(`n${i}`, `2026-10-20T1${Math.floor(i / 10)}:${String((i % 10) * 5).padStart(2, "0")}:00Z`));
    const hoje = novidadesDeHoje(muitas, AGORA);
    expect(hoje).toHaveLength(MAXIMO_DE_NOVIDADES);
    expect(hoje[0].id).toBe("n19");
    expect(hoje.at(-1)?.id).toBe("n5");
  });
});

describe("textoDaNovidade (#549)", () => {
  const q = "2026-10-20T12:00:00Z";
  it("monta a frase só do tipo, do número e de quem fez, nunca do título", () => {
    const comTitulo = pegou("a", q, { titulo: "Título <script>" });
    expect(textoDaNovidade(comTitulo)).toBe("fulana pegou a #510");
    expect(textoDaNovidade(pegou("a", q, { alvo: "Fulana" }))).toBe("fulana pegou a #510");
    expect(textoDaNovidade(pegou("a", q, { alvo: "beltrano" }))).toBe("fulana pôs beltrano na #510");
    expect(textoDaNovidade(pegou("a", q, { acao: "largou" }))).toBe("fulana largou a #510");
    expect(textoDaNovidade(pegou("a", q, { acao: "largou", alvo: "beltrano" }))).toBe("fulana tirou beltrano da #510");
    expect(textoDaNovidade(pegou("a", q, { acao: "fechou" }))).toBe("fulana fechou a #510");
    const pr = (acao: string): Novidade => ({ id: "p", quando: q, tipo: "pr", acao, quem: "bia", numero: 663 }) as Novidade;
    expect(textoDaNovidade(pr("abriu"))).toBe("bia entregou o PR #663");
    expect(textoDaNovidade(pr("mesclou"))).toBe("bia mesclou o PR #663");
    expect(textoDaNovidade(pr("fechou-sem-mesclar"))).toBe("bia fechou o PR #663 sem mesclar");
    expect(textoDaNovidade({ id: "r", quando: q, tipo: "rodada", passou: true, nome: "CI", numero: 663 })).toBe("A conferência CI no PR #663 passou");
    expect(textoDaNovidade({ id: "r", quando: q, tipo: "rodada", passou: false, nome: "Release" })).toBe("A conferência Release falhou");
  });
});

describe("linkDaNovidade (#549)", () => {
  it("só link do GitHub da sakura-corp; de fora vira texto sem link", () => {
    const q = "2026-10-20T12:00:00Z";
    expect(linkDaNovidade(pegou("a", q, { url: "https://github.com/sakura-corp/sakura-system-ace/issues/510" }))).toBe(
      "https://github.com/sakura-corp/sakura-system-ace/issues/510",
    );
    for (const url of ["https://github.com/outra/repo/issues/1", "https://mal.exemplo/sakura-corp/", "javascript:alert(1)", "http://github.com/sakura-corp/x"]) {
      expect(linkDaNovidade(pegou("a", q, { url }))).toBeUndefined();
    }
  });
});

describe("carregarNovidades (#549)", () => {
  const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
  const n = pegou("a", "2026-10-20T12:00:00Z");
  it("pronto, com as falhas", async () => {
    expect(await carregarNovidades(async () => json({ novidades: [n], falhas: ["rodadas"] }))).toEqual({ tipo: "pronto", novidades: [n], falhas: ["rodadas"] });
  });
  it("401 = a sessão acabou", async () => {
    expect(await carregarNovidades(async () => json({}, 401))).toEqual({ tipo: "fora" });
  });
  it("502, sem internet ou fora do formato = erro, nunca \"nada mudou\"", async () => {
    const erro = { tipo: "erro", mensagem: expect.any(String) };
    expect(await carregarNovidades(async () => json({}, 502))).toMatchObject(erro);
    expect(await carregarNovidades(async () => { throw new TypeError("offline"); })).toMatchObject(erro);
    expect(await carregarNovidades(async () => json({ novidades: [{ ...n, tipo: "outro" }], falhas: [] }))).toMatchObject(erro);
    expect(await carregarNovidades(async () => json({ novidades: [{ ...n, quando: "ontem" }], falhas: [] }))).toMatchObject(erro);
    expect(await carregarNovidades(async () => json({ novidades: [], falhas: ["tudo"] }))).toMatchObject(erro);
  });
});
