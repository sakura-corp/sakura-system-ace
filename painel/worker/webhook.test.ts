import { describe, expect, it } from "vitest";
import { assinaturaConfere, avisoDoEvento } from "./webhook";

// O exemplo da documentação do GitHub ("Validating webhook deliveries").
const SEGREDO = "It's a Secret to Everybody";
const CORPO = "Hello, World!";
const ASSINATURA = "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17";

describe("assinaturaConfere", () => {
  it("aceita a assinatura de exemplo do GitHub", async () => {
    expect(await assinaturaConfere(CORPO, ASSINATURA, SEGREDO)).toBe(true);
  });

  it("aceita as letras do hexadecimal em maiúsculas", async () => {
    expect(await assinaturaConfere(CORPO, "sha256=" + ASSINATURA.slice(7).toUpperCase(), SEGREDO)).toBe(true);
  });

  it("recusa corpo diferente, segredo diferente e assinatura trocada", async () => {
    expect(await assinaturaConfere("Hello, World?", ASSINATURA, SEGREDO)).toBe(false);
    expect(await assinaturaConfere(CORPO, ASSINATURA, "outro segredo")).toBe(false);
    expect(await assinaturaConfere(CORPO, ASSINATURA.slice(0, -1) + "0", SEGREDO)).toBe(false);
  });

  it("recusa cabeçalho ausente, sem o prefixo, com tamanho errado ou que não é hexadecimal", async () => {
    expect(await assinaturaConfere(CORPO, null, SEGREDO)).toBe(false);
    expect(await assinaturaConfere(CORPO, ASSINATURA.replace("sha256=", ""), SEGREDO)).toBe(false);
    expect(await assinaturaConfere(CORPO, "sha1=" + ASSINATURA.slice(7), SEGREDO)).toBe(false);
    expect(await assinaturaConfere(CORPO, ASSINATURA.slice(0, -2), SEGREDO)).toBe(false);
    expect(await assinaturaConfere(CORPO, "sha256=" + "z".repeat(64), SEGREDO)).toBe(false);
  });

  it("recusa quando o segredo não está configurado, mesmo que a assinatura seja do segredo vazio", async () => {
    const vazio = "sha256=2bbcfa9524f3218c7a34b30e6936f8b1a4516cb097f1a85a1c7d98b5977ec769"; // HMAC de "Hello, World!" com segredo ""
    expect(await assinaturaConfere(CORPO, vazio, "")).toBe(false);
  });
});

const repo = { full_name: "sakura-corp/sakura-system-ace" };

describe("avisoDoEvento", () => {
  it("issues, pull_request e label levam o evento e o número da tarefa quando existe", () => {
    expect(avisoDoEvento("issues", { repository: repo, action: "assigned", issue: { number: 355 } })).toEqual({ evento: "issues", numero: 355 });
    expect(avisoDoEvento("pull_request", { repository: repo, number: 12, pull_request: { number: 12 } })).toEqual({ evento: "pull_request", numero: 12 });
    expect(avisoDoEvento("pull_request", { repository: repo, number: 13 })).toEqual({ evento: "pull_request", numero: 13 });
    expect(avisoDoEvento("label", { repository: repo, action: "created", label: { name: "leva-1" } })).toEqual({ evento: "label" });
  });

  it("workflow_run, push, create e delete levam só o evento, sem número nenhum", () => {
    for (const evento of ["workflow_run", "push", "create", "delete"]) {
      expect(avisoDoEvento(evento, { repository: repo, issue: { number: 1 }, number: 2 })).toEqual({ evento });
    }
  });

  it("não leva dado nenhum da tarefa: nem título, nem quem pegou", () => {
    const aviso = avisoDoEvento("issues", { repository: repo, issue: { number: 7, title: "segredo", assignee: { login: "fulana" }, body: "texto" }, sender: { login: "x" } });
    expect(Object.keys(aviso ?? {}).sort()).toEqual(["evento", "numero"]);
  });

  it("ignora qualquer outro evento (ping, issue_comment, star…)", () => {
    for (const evento of ["ping", "issue_comment", "star", "pull_request_review", "check_run"]) {
      expect(avisoDoEvento(evento, { repository: repo, issue: { number: 1 } })).toBeNull();
    }
  });

  it("ignora o que não for deste repositório (ou não disser de qual é)", () => {
    expect(avisoDoEvento("issues", { repository: { full_name: "outra-org/sakura-system-ace" }, issue: { number: 1 } })).toBeNull();
    expect(avisoDoEvento("push", { repository: { full_name: "sakura-corp/outro" } })).toBeNull();
    expect(avisoDoEvento("push", {})).toBeNull();
  });

  it("número inválido não vira número no aviso", () => {
    expect(avisoDoEvento("issues", { repository: repo, issue: { number: "1; drop" } })).toEqual({ evento: "issues" });
    expect(avisoDoEvento("issues", { repository: repo, issue: { number: -3 } })).toEqual({ evento: "issues" });
  });

  it("corpo que não é objeto, ou sem cabeçalho de evento, é ignorado", () => {
    expect(avisoDoEvento(null, { repository: repo })).toBeNull();
    expect(avisoDoEvento("issues", null)).toBeNull();
    expect(avisoDoEvento("issues", "texto")).toBeNull();
  });
});
