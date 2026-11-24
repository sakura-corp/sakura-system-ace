// @vitest-environment jsdom
/**
 * A linha do molde de lista (#1135): nome em cima, detalhe embaixo, UMA ação
 * na linha e o resto no "⋯" (`AcoesDaLinha`).
 *
 * O que se prova aqui: o nome vira botão quando a linha abre alguma coisa (e
 * só o nome: botão dentro de botão não existe); a ação da linha leva o nome
 * do item pro leitor de tela ("Receber — Maria Souza"); o "⋯" só aparece
 * quando há o que pôr nele; e a ação e o "⋯" não abrem a linha junto.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { LinhaDeLista } from "./LinhaDeLista";

function NaLista({ children }: { children: React.ReactNode }) {
  return <ul>{children}</ul>;
}

describe("LinhaDeLista", () => {
  it("é um item de lista com o nome e o detalhe", () => {
    renderizar(
      <NaLista>
        <LinhaDeLista nome="Maria Souza" detalhe="(16) 99999-0000 · Araraquara" />
      </NaLista>,
    );
    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("Maria Souza");
    expect(item).toHaveTextContent("(16) 99999-0000 · Araraquara");
  });

  it("com aoAbrir, o nome vira um botão que abre o item", async () => {
    const aoAbrir = vi.fn();
    const { user } = renderizar(
      <NaLista>
        <LinhaDeLista nome="Maria Souza" detalhe="Araraquara" aoAbrir={aoAbrir} />
      </NaLista>,
    );
    await user.click(screen.getByRole("button", { name: /Maria Souza/ }));
    expect(aoAbrir).toHaveBeenCalledTimes(1);
  });

  it("a única ação da linha é um botão com verbo e o nome do item pro leitor de tela", async () => {
    const aoClicar = vi.fn();
    const aoAbrir = vi.fn();
    const { user } = renderizar(
      <NaLista>
        <LinhaDeLista nome="Maria Souza" aoAbrir={aoAbrir} acao={{ rotulo: "Receber", aoClicar }} />
      </NaLista>,
    );
    const botao = screen.getByRole("button", { name: "Receber — Maria Souza" });
    expect(botao).toHaveTextContent("Receber");
    await user.click(botao);
    expect(aoClicar).toHaveBeenCalledTimes(1);
    expect(aoAbrir).not.toHaveBeenCalled();
  });

  it("o resto vai pro '⋯' (AcoesDaLinha), com o nome do item, sem abrir a linha junto", async () => {
    const apagar = vi.fn();
    const aoAbrir = vi.fn();
    const { user } = renderizar(
      <NaLista>
        <LinhaDeLista
          nome="Maria Souza"
          aoAbrir={aoAbrir}
          acao={{ rotulo: "Receber", aoClicar: () => {} }}
          mais={[{ rotulo: "Apagar", aoClicar: apagar, perigosa: true }]}
        />
      </NaLista>,
    );
    await user.click(screen.getByRole("button", { name: "Mais ações — Maria Souza" }));
    await user.click(screen.getByRole("menuitem", { name: "Apagar" }));
    expect(apagar).toHaveBeenCalledTimes(1);
    expect(aoAbrir).not.toHaveBeenCalled();
  });

  it("nunca tem botão dentro de botão (o nome que abre fica separado da ação e do '⋯')", () => {
    renderizar(
      <NaLista>
        <LinhaDeLista
          nome="Maria Souza"
          detalhe="Araraquara"
          aoAbrir={() => {}}
          acao={{ rotulo: "Receber", aoClicar: () => {} }}
          mais={[{ rotulo: "Apagar", aoClicar: () => {} }]}
        />
      </NaLista>,
    );
    for (const botao of screen.getAllByRole("button")) {
      expect(botao.querySelector("button")).toBeNull();
    }
  });

  it("nome que não é texto sem descrição não compila", () => {
    // @ts-expect-error: sem a descrição, os botões virariam "Receber — item".
    const linha = <LinhaDeLista nome={<strong>OS 148</strong>} acao={{ rotulo: "Faturar", aoClicar: () => {} }} />;
    expect(linha).toBeTruthy();
  });

  it("sem nada no '⋯', o botão de três pontos não aparece", () => {
    renderizar(
      <NaLista>
        <LinhaDeLista nome="Maria Souza" acao={{ rotulo: "Receber", aoClicar: () => {} }} />
      </NaLista>,
    );
    expect(screen.queryByRole("button", { name: /Mais ações/ })).toBeNull();
  });

  it("descrição explícita vale quando o nome não é texto", () => {
    renderizar(
      <NaLista>
        <LinhaDeLista
          nome={<strong>OS 148</strong>}
          descricao="a OS 148"
          acao={{ rotulo: "Faturar", aoClicar: () => {} }}
        />
      </NaLista>,
    );
    expect(screen.getByRole("button", { name: "Faturar — a OS 148" })).toBeInTheDocument();
  });

  it("ação desligada não responde", async () => {
    const aoClicar = vi.fn();
    const { user } = renderizar(
      <NaLista>
        <LinhaDeLista nome="Maria Souza" acao={{ rotulo: "Receber", aoClicar, desabilitada: true }} />
      </NaLista>,
    );
    await user.click(screen.getByRole("button", { name: "Receber — Maria Souza" }));
    expect(aoClicar).not.toHaveBeenCalled();
  });
});
