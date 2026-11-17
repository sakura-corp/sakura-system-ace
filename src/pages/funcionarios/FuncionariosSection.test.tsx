// @vitest-environment jsdom
/**
 * Teste de TELA da lista de funcionários (tarefa 14 do visual novo, #990).
 *
 * O visual novo deixa à vista só o próximo passo da linha ("Editar") e manda
 * "Inativar/Reativar" pro botão de três pontos. O que este teste prova: as
 * duas ações continuam existindo e continuam fazendo o que faziam, e o
 * cadastro sem nome é recusado com a mensagem E o campo marcado.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { Funcionario } from "@/types/funcionario";

const atualizarFuncionario = vi.fn();
const criarFuncionario = vi.fn();
vi.mock("@/lib/funcionarios", () => ({
  atualizarFuncionario: (...a: unknown[]) => atualizarFuncionario(...a),
  criarFuncionario: (...a: unknown[]) => criarFuncionario(...a),
}));

const { FuncionariosSection } = await import("./FuncionariosSection");

const ana = { id: "f1", nome: "Ana", cargo: "Mecânica", ativo: true, operador: null } as unknown as Funcionario;
const rui = { id: "f2", nome: "Rui", cargo: null, ativo: false, operador: null } as unknown as Funcionario;

function montar() {
  const onRecarregar = vi.fn().mockResolvedValue(undefined);
  const r = renderizar(
    <FuncionariosSection funcionarios={[ana, rui]} lojaId="l" onRecarregar={onRecarregar} />,
  );
  return { ...r, onRecarregar };
}

beforeEach(() => {
  atualizarFuncionario.mockReset().mockResolvedValue(undefined);
  criarFuncionario.mockReset().mockResolvedValue(undefined);
});

describe("FuncionariosSection", () => {
  it("mostra o status com palavra (Ativo / Inativo), não só com cor", () => {
    montar();
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByText("Inativo")).toBeInTheDocument();
  });

  it("inativa pelo menu de três pontos", async () => {
    const { user, onRecarregar } = montar();
    await user.click(screen.getByRole("button", { name: "Mais ações — o funcionário Ana" }));
    await user.click(screen.getByRole("menuitem", { name: "Inativar" }));

    expect(atualizarFuncionario).toHaveBeenCalledWith("f1", { ativo: false });
    expect(onRecarregar).toHaveBeenCalled();
  });

  it("reativa quem está inativo, pelo mesmo menu", async () => {
    const { user } = montar();
    await user.click(screen.getByRole("button", { name: "Mais ações — o funcionário Rui" }));
    await user.click(screen.getByRole("menuitem", { name: "Reativar" }));

    expect(atualizarFuncionario).toHaveBeenCalledWith("f2", { ativo: true });
  });

  it("o próximo passo da linha, Editar, abre a ficha do funcionário", async () => {
    const { user } = montar();
    await user.click(screen.getByRole("button", { name: "Editar — o funcionário Ana" }));
    expect(screen.getByText("Editar funcionário")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ana")).toBeInTheDocument();
  });

  it("recusa o cadastro sem nome: mensagem escrita e campo marcado como inválido", async () => {
    const { user } = montar();
    await user.click(screen.getByRole("button", { name: "+ Novo funcionário" }));
    await user.click(screen.getByRole("button", { name: "Salvar funcionário" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/nome/i);
    expect(screen.getByRole("textbox", { name: /^Nome\s\(obrigatório\)/ })).toHaveAttribute("aria-invalid", "true");
    expect(criarFuncionario).not.toHaveBeenCalled();
  });
});
