// @vitest-environment jsdom
/**
 * Teste de TELA dos campos de retorno do serviço (FN-06, #381): o que a pessoa
 * digita chega no `onSalvar` como número (ou nulo), e número inválido barra.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { ServicoForm } from "./ServicoForm";

function montar() {
  const onSalvar = vi.fn().mockResolvedValue(undefined);
  const resultado = renderizar(<ServicoForm categorias={[]} onSalvar={onSalvar} onCancelar={vi.fn()} />);
  return { ...resultado, onSalvar };
}

const salvar = () => screen.getByRole("button", { name: /^Salvar/ });

describe("ServicoForm — retorno a cada (dias / km)", () => {
  it("manda os intervalos como número", async () => {
    const { user, onSalvar } = montar();
    await user.type(screen.getByLabelText(/Descrição/), "Troca de óleo");
    await user.type(screen.getByLabelText("Retorno a cada (dias)"), "180");
    await user.type(screen.getByLabelText("Retorno a cada (km)"), "10000");
    await user.click(salvar());
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ intervalo_dias: 180, intervalo_km: 10000 }));
  });

  it("vazio manda nulo e explica o que o vazio quer dizer", async () => {
    const { user, onSalvar } = montar();
    await user.type(screen.getByLabelText(/Descrição/), "Lavagem");
    await user.click(salvar());
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ intervalo_dias: null, intervalo_km: null }));
    expect(screen.getByText(/Vazio: este serviço não gera lembrete/)).toBeInTheDocument();
  });

  it("zero barra o salvamento (o navegador já recusa; a regra do zod fica de rede, testada em schemas/servico.test.ts)", async () => {
    const { user, onSalvar } = montar();
    await user.type(screen.getByLabelText(/Descrição/), "Alinhamento");
    await user.type(screen.getByLabelText("Retorno a cada (dias)"), "0");
    await user.click(salvar());
    expect(onSalvar).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Retorno a cada (dias)")).toBeInvalid();
  });
});
