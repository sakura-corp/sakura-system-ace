// @vitest-environment jsdom
/**
 * Visual novo (#1087, item 6): o cadastro rápido de veículo também pede tipo
 * e cor (o cadastro completo já pedia).
 */
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@/testes/tela";
import { NovoClienteRapidoModal, NovoVeiculoRapidoModal } from "./CadastroRapidoModais";

describe("Cadastro rápido de veículo — tipo e cor", () => {
  it("manda tipo e cor escolhidos pro onCadastrar", async () => {
    const onCadastrar = vi.fn().mockResolvedValue(undefined);
    render(<NovoVeiculoRapidoModal nomeDoCliente="Ana" onFechar={vi.fn()} onCadastrar={onCadastrar} />);

    await userEvent.type(screen.getByLabelText("Placa"), "abc1d23");
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "picape");
    await userEvent.type(screen.getByLabelText("Cor"), "Prata");
    await userEvent.click(screen.getByRole("button", { name: /Cadastrar e usar nesta OS/ }));

    expect(onCadastrar).toHaveBeenCalledTimes(1);
    expect(onCadastrar.mock.calls[0][0]).toMatchObject({ placa: "ABC1D23", tipo: "picape", cor: "Prata" });
  });

  it("tipo e cor não são obrigatórios", async () => {
    const onCadastrar = vi.fn().mockResolvedValue(undefined);
    render(<NovoVeiculoRapidoModal nomeDoCliente="Ana" onFechar={vi.fn()} onCadastrar={onCadastrar} />);
    expect(screen.getByRole("option", { name: "Escolha o tipo" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Placa"), "ABC1D23");
    await userEvent.click(screen.getByRole("button", { name: /Cadastrar e usar nesta OS/ }));
    expect(onCadastrar.mock.calls[0][0]).toMatchObject({ tipo: null, cor: "" });
  });

  it("o cadastro de cliente novo mostra os mesmos campos", () => {
    render(<NovoClienteRapidoModal onFechar={vi.fn()} onCadastrar={vi.fn()} />);
    expect(screen.getByLabelText("Tipo")).toBeInTheDocument();
    expect(screen.getByLabelText("Cor")).toBeInTheDocument();
  });
});
