// @vitest-environment jsdom
/**
 * Taxas da maquininha (#387): salvar manda as linhas certas, linha pela
 * metade mostra o erro e não salva, e quem não é admin só lê.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";

const salvarTaxasMaquininha = vi.hoisted(() => vi.fn());
vi.mock("@/lib/taxasMaquininha", () => ({ salvarTaxasMaquininha }));

const { TaxasMaquininhaSection } = await import("./TaxasMaquininhaSection");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  salvarTaxasMaquininha.mockResolvedValue(undefined);
});

function montar(podeEditar = true) {
  const onSalvo = vi.fn().mockResolvedValue(undefined);
  const r = renderizar(
    <TaxasMaquininhaSection tabela={[]} lojaId="loja-a" podeEditar={podeEditar} onSalvo={onSalvo} />,
  );
  return { ...r, onSalvo };
}

describe("Taxas da maquininha", () => {
  it("mostra as 13 linhas, todas em branco", () => {
    montar();
    expect(screen.getAllByRole("textbox", { name: /^Taxa do / })).toHaveLength(13);
    expect(screen.getByRole("textbox", { name: "Taxa do Débito, em porcentagem" })).toHaveValue("");
    // Só o crédito parcelado tem "recebo tudo de uma vez" (2x a 12x = 11).
    expect(screen.getAllByRole("checkbox")).toHaveLength(11);
  });

  it("salvar manda só as linhas preenchidas, com número e o 'tudo de uma vez'", async () => {
    const { user, onSalvo } = montar();
    await user.type(screen.getByRole("textbox", { name: "Taxa do Débito, em porcentagem" }), "1,99");
    await user.type(screen.getByRole("textbox", { name: "Prazo do Débito, em dias" }), "1");
    await user.type(screen.getByRole("textbox", { name: "Taxa do Crédito 3x, em porcentagem" }), "5,5");
    await user.type(screen.getByRole("textbox", { name: "Prazo do Crédito 3x, em dias" }), "30");
    await user.click(screen.getByRole("checkbox", { name: "Crédito 3x: recebo tudo de uma vez" }));
    await user.click(screen.getByRole("button", { name: "Salvar taxas" }));

    expect(await screen.findByText("Taxas salvas.")).toBeInTheDocument();
    expect(salvarTaxasMaquininha).toHaveBeenCalledTimes(1);
    expect(salvarTaxasMaquininha).toHaveBeenCalledWith("loja-a", [
      { forma: "cartao_debito", parcelas: 1, taxa_percentual: 1.99, prazo_dias: 1, recebe_tudo_de_uma_vez: false },
      { forma: "cartao_credito", parcelas: 3, taxa_percentual: 5.5, prazo_dias: 30, recebe_tudo_de_uma_vez: true },
    ]);
    expect(onSalvo).toHaveBeenCalledTimes(1);
  });

  it("linha só com a taxa mostra o erro do prazo e não salva", async () => {
    const { user } = montar();
    await user.type(screen.getByRole("textbox", { name: "Taxa do Crédito 2x, em porcentagem" }), "4");
    await user.click(screen.getByRole("button", { name: "Salvar taxas" }));

    expect(await screen.findByText("Preencha o prazo do Crédito 2x, ou apague a taxa.")).toBeInTheDocument();
    expect(salvarTaxasMaquininha).not.toHaveBeenCalled();
    expect(screen.queryByText("Taxas salvas.")).not.toBeInTheDocument();
  });

  it("erro do banco aparece na tela, sem o 'salvas'", async () => {
    salvarTaxasMaquininha.mockRejectedValue(new Error("Falhou de propósito"));
    const { user } = montar();
    await user.type(screen.getByRole("textbox", { name: "Taxa do Débito, em porcentagem" }), "2");
    await user.type(screen.getByRole("textbox", { name: "Prazo do Débito, em dias" }), "1");
    await user.click(screen.getByRole("button", { name: "Salvar taxas" }));
    await waitFor(() => expect(screen.getByText(/Falhou de propósito/)).toBeInTheDocument());
    expect(screen.queryByText("Taxas salvas.")).not.toBeInTheDocument();
  });

  it("quem não é admin lê, mas não edita nem salva", () => {
    montar(false);
    expect(screen.getByRole("textbox", { name: "Taxa do Débito, em porcentagem" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Salvar taxas" })).not.toBeInTheDocument();
    expect(screen.getByText(/Só quem é administrador/)).toBeInTheDocument();
  });
});
