// @vitest-environment jsdom
/**
 * O campo do molde de formulário (visual da leva 8, #1085, parte 3/5 #1134):
 * rótulo em cima (maior que o antigo), "obrigatório" escrito (nunca só a cor),
 * a ajuda embaixo e o erro ao lado do campo, os dois ligados ao campo pro
 * leitor de tela; campo de uma linha com 48 px.
 */
import { describe, expect, it } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { CampoDoMolde } from "./CampoDoMolde";

describe("CampoDoMolde", () => {
  it("o rótulo dá nome ao campo, e clicar nele foca o campo", async () => {
    const { user } = renderizar(
      <CampoDoMolde rotulo="Nome do cliente">{(campo) => <input {...campo} />}</CampoDoMolde>,
    );
    const input = screen.getByRole("textbox", { name: "Nome do cliente" });
    await user.click(screen.getByText("Nome do cliente"));
    expect(input).toHaveFocus();
  });

  it("o campo de uma linha nasce com 48 px (a classe do molde)", () => {
    renderizar(<CampoDoMolde rotulo="Nome">{(campo) => <input {...campo} />}</CampoDoMolde>);
    const input = screen.getByRole("textbox", { name: "Nome" });
    expect(input).toHaveClass("sakura-campo");
    expect(input.className).toMatch(/(^|\s)!h-12(\s|$)/);
  });

  it("a área de texto não ganha a altura de uma linha", () => {
    renderizar(
      <CampoDoMolde rotulo="Observação" multilinha>
        {(campo) => <textarea {...campo} />}
      </CampoDoMolde>,
    );
    const area = screen.getByRole("textbox", { name: "Observação" });
    expect(area).toHaveClass("sakura-campo");
    expect(area.className).not.toMatch(/h-12/);
  });

  it("obrigatório vem escrito ao lado do rótulo e marcado no campo", () => {
    renderizar(
      <CampoDoMolde rotulo="Telefone" obrigatorio>
        {(campo) => <input {...campo} />}
      </CampoDoMolde>,
    );
    const input = screen.getByRole("textbox", { name: /Telefone/ });
    expect(input).toHaveAttribute("aria-required", "true");
    // A palavra, e não só um asterisco colorido (WCAG 1.4.1).
    expect(screen.getByText("obrigatório")).toBeInTheDocument();
  });

  it("campo que não é obrigatório não diz que é", () => {
    renderizar(<CampoDoMolde rotulo="Apelido">{(campo) => <input {...campo} />}</CampoDoMolde>);
    expect(screen.queryByText("obrigatório")).toBeNull();
    expect(screen.getByRole("textbox", { name: "Apelido" })).not.toHaveAttribute("aria-required");
  });

  it("a ajuda fica embaixo e é lida junto com o campo", () => {
    renderizar(
      <CampoDoMolde rotulo="CPF ou CNPJ" ajuda="Só os números, sem ponto nem traço.">
        {(campo) => <input {...campo} />}
      </CampoDoMolde>,
    );
    const input = screen.getByRole("textbox", { name: "CPF ou CNPJ" });
    expect(input).toHaveAccessibleDescription("Só os números, sem ponto nem traço.");
    // Embaixo do campo, na ordem do HTML.
    const ajuda = screen.getByText("Só os números, sem ponto nem traço.");
    expect(input.compareDocumentPosition(ajuda) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("o erro aparece ao lado do campo, marca o campo e é lido junto (antes da ajuda)", () => {
    renderizar(
      <CampoDoMolde rotulo="E-mail" ajuda="Pra mandar a nota." erro="E-mail sem o @.">
        {(campo) => <input {...campo} />}
      </CampoDoMolde>,
    );
    const input = screen.getByRole("textbox", { name: "E-mail" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("E-mail sem o @. Pra mandar a nota.");
    expect(input).toHaveAccessibleErrorMessage("E-mail sem o @.");
  });

  it("sem erro, o campo não fica marcado como recusado", () => {
    renderizar(<CampoDoMolde rotulo="E-mail">{(campo) => <input {...campo} />}</CampoDoMolde>);
    const input = screen.getByRole("textbox", { name: "E-mail" });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("o erro não é avisado só pela cor: tem ícone e frase", () => {
    renderizar(
      <CampoDoMolde rotulo="Placa" erro="Placa incompleta.">
        {(campo) => <input {...campo} />}
      </CampoDoMolde>,
    );
    const erro = screen.getByText("Placa incompleta.");
    expect(erro.closest("[data-erro-do-campo]")?.querySelector("svg")).not.toBeNull();
  });

  it("dois campos na mesma tela não dividem o mesmo id", () => {
    renderizar(
      <>
        <CampoDoMolde rotulo="Nome" ajuda="a">
          {(campo) => <input {...campo} />}
        </CampoDoMolde>
        <CampoDoMolde rotulo="Sobrenome" ajuda="b">
          {(campo) => <input {...campo} />}
        </CampoDoMolde>
      </>,
    );
    const [a, b] = screen.getAllByRole("textbox");
    expect(a.id).not.toBe(b.id);
    expect(a.getAttribute("aria-describedby")).not.toBe(b.getAttribute("aria-describedby"));
  });

  it("a largura inteira ocupa a linha toda da grade", () => {
    renderizar(
      <CampoDoMolde rotulo="Endereço" largura="inteira">
        {(campo) => <input {...campo} />}
      </CampoDoMolde>,
    );
    const input = screen.getByRole("textbox", { name: "Endereço" });
    expect(input.closest("[data-campo-do-molde]")).toHaveClass("col-span-full");
  });
});
