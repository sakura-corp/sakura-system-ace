// @vitest-environment jsdom
/**
 * O molde de formulário (visual da leva 8, #1085, parte 3/5 #1134): o jeito
 * único de fazer formulário no programa. O curto abre em janela (`Modal`), o
 * longo em página própria; os dois no padrão react-hook-form + zod.
 *
 * O que se prova aqui: na janela o foco já cai no primeiro campo, o Esc e o
 * "Cancelar" fecham, o Enter vai de campo em campo e confirma no fim (com o
 * hook do programa ligado, como na loja); o botão principal tem 48 px e diz o
 * verbo; clicar 2 vezes não salva 2 vezes; o erro ao salvar fica do lado do
 * botão; e o erro de um campo (zod) aparece embaixo dele, com o foco nele.
 * Na página, o Esc não joga fora um formulário comprido.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { act } from "react";
import { useForm } from "react-hook-form";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { useEnterParaProximoCampo } from "@/hooks/useEnterParaProximoCampo";
import { renderizar, screen } from "@/testes/tela";
import { CampoDoMolde } from "./CampoDoMolde";
import { MoldeFormulario, SecaoDoFormulario, type PropsDoMoldeFormulario } from "./MoldeFormulario";

// O hook do Enter pula campo que não aparece (`offsetParent === null`), e o
// jsdom não desenha nada: todo campo teria `offsetParent` nulo. Aqui, todo
// elemento "aparece" (o pai dele), como na tela de verdade.
const offsetParentOriginal = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetParent");
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetParent", {
    configurable: true,
    get(this: HTMLElement) {
      return this.parentElement;
    },
  });
});
afterAll(() => {
  if (offsetParentOriginal) Object.defineProperty(HTMLElement.prototype, "offsetParent", offsetParentOriginal);
});

const esquema = z.object({
  nome: z.string().trim().min(1, "Escreva o nome."),
  telefone: z.string(),
});
type Valores = z.infer<typeof esquema>;

/** Um formulário de verdade, no padrão do programa (react-hook-form + zod). */
function FormularioDeCliente(
  props: Partial<PropsDoMoldeFormulario> & { salvar?: (v: Valores) => void | Promise<void> },
) {
  useEnterParaProximoCampo();
  const { salvar = () => {}, ...resto } = props;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Valores>({ resolver: zodResolver(esquema), defaultValues: { nome: "", telefone: "" } });
  return (
    <MoldeFormulario
      em="janela"
      titulo="Novo cliente"
      rotuloDoEnviar="Salvar cliente"
      aoEnviar={handleSubmit(salvar)}
      aoCancelar={() => {}}
      {...resto}
    >
      <SecaoDoFormulario titulo="Contato">
        <CampoDoMolde rotulo="Nome" obrigatorio erro={errors.nome?.message}>
          {(campo) => <input {...campo} {...register("nome")} />}
        </CampoDoMolde>
        <CampoDoMolde rotulo="Telefone" ajuda="Com DDD.">
          {(campo) => <input {...campo} {...register("telefone")} />}
        </CampoDoMolde>
      </SecaoDoFormulario>
    </MoldeFormulario>
  );
}

describe("MoldeFormulario em janela (o formulário curto)", () => {
  it("abre numa janela com o título, e o foco já cai no primeiro campo", () => {
    renderizar(<FormularioDeCliente />);
    expect(screen.getByRole("dialog", { name: "Novo cliente" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Nome/ })).toHaveFocus();
  });

  it("Esc fecha", async () => {
    const aoCancelar = vi.fn();
    const { user } = renderizar(<FormularioDeCliente aoCancelar={aoCancelar} />);
    await user.keyboard("{Escape}");
    expect(aoCancelar).toHaveBeenCalledTimes(1);
  });

  it("o \"Cancelar\" fecha sem salvar", async () => {
    const aoCancelar = vi.fn();
    const salvar = vi.fn();
    const { user } = renderizar(<FormularioDeCliente aoCancelar={aoCancelar} salvar={salvar} />);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(aoCancelar).toHaveBeenCalledTimes(1);
    expect(salvar).not.toHaveBeenCalled();
  });

  it("o botão principal tem 48 px, diz o verbo e vem por último, embaixo", () => {
    renderizar(<FormularioDeCliente />);
    const salvar = screen.getByRole("button", { name: "Salvar cliente" });
    expect(salvar.className).toMatch(/(^|\s)h-12(\s|$)/);
    expect(salvar).toHaveAttribute("type", "submit");
    const cancelar = screen.getByRole("button", { name: "Cancelar" });
    expect(cancelar.compareDocumentPosition(salvar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Um laranja só: o "Cancelar" não é o botão principal.
    expect(cancelar.className).not.toMatch(/bg-acao/);
  });

  it("Enter vai de campo em campo e, no fim, confirma", async () => {
    const salvar = vi.fn();
    const { user } = renderizar(<FormularioDeCliente salvar={salvar} />);
    await user.keyboard("Maria Souza{Enter}");
    expect(screen.getByRole("textbox", { name: /Telefone/ })).toHaveFocus();
    await user.keyboard("16999990000{Enter}");
    expect(screen.getByRole("button", { name: "Salvar cliente" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(salvar).toHaveBeenCalledTimes(1);
    expect(salvar.mock.calls[0][0]).toEqual({ nome: "Maria Souza", telefone: "16999990000" });
  });

  it("o erro do campo (zod) aparece embaixo dele, e o foco vai pra ele", async () => {
    const salvar = vi.fn();
    const { user } = renderizar(<FormularioDeCliente salvar={salvar} />);
    await user.click(screen.getByRole("button", { name: "Salvar cliente" }));
    const nome = await screen.findByRole("textbox", { name: /Nome/ });
    expect(nome).toHaveAccessibleErrorMessage("Escreva o nome.");
    expect(nome).toHaveFocus();
    expect(salvar).not.toHaveBeenCalled();
  });

  it("clicar 2 vezes não salva 2 vezes, e o botão diz que está salvando", async () => {
    let terminar = () => {};
    const salvar = vi.fn(() => new Promise<void>((r) => (terminar = r)));
    const { user } = renderizar(<FormularioDeCliente salvar={salvar} />);
    await user.keyboard("Maria");
    const botao = screen.getByRole("button", { name: "Salvar cliente" });
    await user.click(botao);
    await user.click(screen.getByRole("button", { name: "Salvando…" }));
    await user.keyboard("{Enter}");
    expect(salvar).toHaveBeenCalledTimes(1);
    const ocupado = screen.getByRole("button", { name: "Salvando…" });
    expect(ocupado).toHaveAttribute("aria-disabled", "true");
    // Continua focável: quem usa só o teclado não perde o lugar enquanto espera.
    expect(ocupado).not.toBeDisabled();

    await act(async () => terminar());
    await user.click(screen.getByRole("button", { name: "Salvar cliente" }));
    expect(salvar).toHaveBeenCalledTimes(2);
  });

  it("se o salvar deixar escapar um erro, o botão destrava e o erro vai pro registro", async () => {
    // O `handleSubmit` de verdade, com um `salvar` que rejeita: o handleSubmit
    // lança de novo, e o molde não pode ficar preso no "Salvando…".
    const salvar = vi.fn().mockRejectedValueOnce(new Error("caiu a conexão")).mockResolvedValueOnce(undefined);
    const registrados: unknown[] = [];
    const ouvir = (e: ErrorEvent) => registrados.push(e.error);
    window.addEventListener("error", ouvir);
    try {
      const { user } = renderizar(<FormularioDeCliente salvar={salvar} />);
      await user.keyboard("Maria");
      await user.click(screen.getByRole("button", { name: "Salvar cliente" }));
      await user.click(await screen.findByRole("button", { name: "Salvar cliente" }));
      expect(salvar).toHaveBeenCalledTimes(2);
      // O registro de erros do programa (`registrarErros.ts`) ouve o "error" da janela.
      expect(registrados).toHaveLength(1);
      expect(String((registrados[0] as Error).message)).toBe("caiu a conexão");
    } finally {
      window.removeEventListener("error", ouvir);
    }
  });

  it("no meio do \"Salvando…\", Esc e \"Cancelar\" não fecham a janela", async () => {
    let terminar = () => {};
    const salvar = vi.fn(() => new Promise<void>((r) => (terminar = r)));
    const aoCancelar = vi.fn();
    const { user } = renderizar(<FormularioDeCliente salvar={salvar} aoCancelar={aoCancelar} />);
    await user.keyboard("Maria");
    await user.click(screen.getByRole("button", { name: "Salvar cliente" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(aoCancelar).not.toHaveBeenCalled();
    await act(async () => terminar());
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(aoCancelar).toHaveBeenCalledTimes(1);
  });

  it("o erro ao salvar fica do lado do botão, e é avisado", () => {
    renderizar(<FormularioDeCliente erro="Não deu pra salvar: sem internet." />);
    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("Não deu pra salvar: sem internet.");
    // No rodapé da janela, junto do "Salvar cliente".
    expect(alerta.closest("[data-modal-rodape]")).not.toBeNull();
  });

  it("a seção agrupa os campos com um título", () => {
    renderizar(<FormularioDeCliente />);
    const grupo = screen.getByRole("group", { name: "Contato" });
    expect(grupo).toContainElement(screen.getByRole("textbox", { name: /Nome/ }));
  });

  it("o formulário não usa a validação do navegador (a mensagem é a do programa)", () => {
    renderizar(<FormularioDeCliente />);
    const form = screen.getByRole("textbox", { name: /Nome/ }).closest("form");
    expect(form).toHaveAttribute("novalidate");
  });
});

describe("MoldeFormulario em página (o formulário longo)", () => {
  it("não abre janela: o título é o da tela, e as ações ficam embaixo à direita", () => {
    renderizar(<FormularioDeCliente em="pagina" titulo="Cadastro de cliente" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Cadastro de cliente" })).toBeInTheDocument();
    const salvar = screen.getByRole("button", { name: "Salvar cliente" });
    expect(salvar.className).toMatch(/(^|\s)h-12(\s|$)/);
    expect(salvar.closest("[data-rodape-do-formulario]")).toHaveClass("justify-end");
  });

  it("Esc não joga fora o formulário comprido", async () => {
    const aoCancelar = vi.fn();
    const { user } = renderizar(<FormularioDeCliente em="pagina" aoCancelar={aoCancelar} />);
    await user.click(screen.getByRole("textbox", { name: /Nome/ }));
    await user.keyboard("Maria{Escape}");
    expect(aoCancelar).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: /Nome/ })).toHaveValue("Maria");
  });

  it("na página, o foco não é puxado sozinho pro primeiro campo", () => {
    renderizar(<FormularioDeCliente em="pagina" />);
    expect(screen.getByRole("textbox", { name: /Nome/ })).not.toHaveFocus();
  });

  it("Enter no último campo leva ao botão, e o segundo Enter salva", async () => {
    const salvar = vi.fn();
    const { user } = renderizar(<FormularioDeCliente em="pagina" salvar={salvar} />);
    await user.click(screen.getByRole("textbox", { name: /Nome/ }));
    await user.keyboard("Maria{Enter}{Enter}");
    expect(screen.getByRole("button", { name: "Salvar cliente" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(salvar).toHaveBeenCalledTimes(1);
  });

  it("o campo que ganha o foco embaixo do rodapé rola pra cima dele", () => {
    renderizar(<FormularioDeCliente em="pagina" />);
    const telefone = screen.getByRole("textbox", { name: /Telefone/ });
    const nome = screen.getByRole("textbox", { name: /Nome/ });
    const rodape = screen.getByRole("button", { name: "Salvar cliente" }).closest<HTMLElement>("[data-rodape-do-formulario]")!;
    // O jsdom não desenha: as posições são as de uma tela de 700 px com o rodapé em 620.
    const caixa = (topo: number, altura: number) => () => ({ top: topo, bottom: topo + altura }) as DOMRect;
    rodape.getBoundingClientRect = caixa(620, 81);
    nome.getBoundingClientRect = caixa(200, 48);
    telefone.getBoundingClientRect = caixa(640, 48); // coberto pelo rodapé
    nome.scrollIntoView = vi.fn();
    telefone.scrollIntoView = vi.fn();

    nome.focus();
    expect(nome.scrollIntoView).not.toHaveBeenCalled();
    telefone.focus();
    expect(telefone.scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
    // E a margem que faz ele parar acima do rodapé vale pros campos do formulário.
    expect(telefone.closest("form")?.className).toMatch(/scroll-mb-24/);
  });

  it("sem \"Cancelar\" quando a tela não dá como cancelar", () => {
    renderizar(<FormularioDeCliente em="pagina" aoCancelar={undefined} />);
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
  });
});
