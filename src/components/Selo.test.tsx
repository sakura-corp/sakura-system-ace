// @vitest-environment jsdom
//
// O Selo de aviso do visual novo (#990, tarefa 2). A regra 4 das cores diz que
// todo aviso tem ÍCONE e PALAVRA junto da cor: 1 em cada 12 homens confunde
// vermelho, laranja e verde, e cor sozinha não avisa ninguém. O que estes
// testes guardam é que essa regra não dependa de quem escreve a tela lembrar.

import { cleanup, render, screen } from "@testing-library/react";
import { Wrench } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Selo, type TipoDeSelo } from "./Selo";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Selo", () => {
  it("sem a palavra é RECUSADO: não compila", () => {
    // Esta parte não roda: quem confere é o `npm run typecheck`. Cada
    // `@ts-expect-error` abaixo diz "esta linha TEM que dar erro de tipo"; se
    // um dia o Selo passar a aceitar ficar sem palavra, a linha deixa de dar
    // erro, o `@ts-expect-error` sobra, e o typecheck reprova aqui.
    const recusados = () => [
      // @ts-expect-error — sem a palavra
      <Selo key="a" tipo="ok" />,
      // @ts-expect-error — palavra vazia
      <Selo key="b" tipo="ok" palavra="" />,
      // @ts-expect-error — a palavra é texto, não outra coisa
      <Selo key="c" tipo="ok" palavra={null} />,
      // @ts-expect-error — o tipo também é obrigatório: é ele que escolhe a cor e o ícone
      <Selo key="d" palavra="Finalizada" />,
    ];
    expect(recusados).toBeTypeOf("function");
  });

  it("mostra a palavra e um ícone, nos cinco tipos", () => {
    const tipos: TipoDeSelo[] = ["info", "atencao", "ok", "perigo", "neutro"];
    for (const tipo of tipos) {
      const { container, unmount } = render(<Selo tipo={tipo} palavra={`Aviso ${tipo}`} />);
      expect(screen.getByText(`Aviso ${tipo}`)).toBeTruthy();
      const icones = container.querySelectorAll("svg");
      expect(icones, `o tipo ${tipo} saiu sem ícone`).toHaveLength(1);
      // O ícone é enfeite pra quem ouve a tela: a palavra já diz tudo.
      expect(icones[0].getAttribute("aria-hidden")).toBe("true");
      unmount();
    }
  });

  it("cada tipo tem a sua cor, no texto e no fundo fraco (nunca fundo cheio)", () => {
    const esperado: Record<TipoDeSelo, [string, string]> = {
      info: ["text-info", "bg-info/[0.13]"],
      atencao: ["text-atencao", "bg-atencao/[0.12]"],
      ok: ["text-ok", "bg-ok/[0.12]"],
      perigo: ["text-perigo", "bg-perigo/[0.13]"],
      neutro: ["text-texto-2", "bg-texto/[0.08]"],
    };
    for (const [tipo, [letra, fundo]] of Object.entries(esperado) as [TipoDeSelo, [string, string]][]) {
      const { unmount } = render(<Selo tipo={tipo} palavra="Palavra" />);
      const classes = (screen.getByText("Palavra").closest("[data-selo]")?.getAttribute("class") ?? "").split(/\s+/);
      expect(classes).toContain(letra);
      expect(classes).toContain(fundo);
      unmount();
    }
  });

  it("aceita outro ícone, quando o do tipo não conta a história", () => {
    const { container } = render(<Selo tipo="info" palavra="Na oficina" icone={Wrench} />);
    expect(container.querySelector("svg.lucide-wrench")).not.toBeNull();
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("palavra em branco vinda de um dado: reclama no console e ainda mostra uma palavra", () => {
    // O compilador pega a palavra esquecida no código, mas não a que chega
    // vazia do banco. Aí o Selo não derruba a tela (validação incerta é aviso,
    // nunca tranca): escreve o nome do tipo, e avisa quem programa.
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const doBanco: string = "   ";
    render(<Selo tipo="perigo" palavra={doBanco} />);
    expect(screen.getByText("Problema")).toBeTruthy();
    expect(erro).toHaveBeenCalledTimes(1);
  });
});
