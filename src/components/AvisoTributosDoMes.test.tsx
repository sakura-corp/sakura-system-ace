// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvisoTributosDoMes } from "./AvisoTributosDoMes";
import { avisoTributosDoMes } from "@/schemas/avisoTributos";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";

afterEach(cleanup);

const hoje = new Date(2026, 10, 18, 10, 0);

function config(confirmada: string | null, simples: number | null = 4) {
  return {
    regime_tributario: "simples_nacional",
    focus_nfe_configurado: true,
    percentual_tributos_simples: simples,
    percentual_tributos_pecas: null,
    competencia_tributos_confirmada: confirmada,
  } as ConfiguracaoFiscalLoja;
}

function montar(c: ConfiguracaoFiscalLoja, onConfirmar?: () => void) {
  const aviso = avisoTributosDoMes(c, hoje);
  return render(
    <MemoryRouter>
      <AvisoTributosDoMes
        aviso={aviso}
        semAliquota={c.percentual_tributos_simples == null}
        onConfirmar={onConfirmar}
        linkConfiguracoes="/configuracoes"
      />
    </MemoryRouter>,
  );
}

describe("AvisoTributosDoMes", () => {
  it("mês sem confirmação mostra o aviso e o botão chama a confirmação", () => {
    const onConfirmar = vi.fn();
    montar(config("2026-10-01"), onConfirmar);
    expect(screen.getByText(/Confira as alíquotas dos tributos aproximados de novembro/)).toBeTruthy();
    expect(screen.getByText(/último número salvo/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmei a alíquota deste mês" }));
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });
  it("mês confirmado: o aviso some", () => {
    const { container } = montar(config("2026-11-01"), vi.fn());
    expect(container.textContent).toBe("");
  });
  it("sem alíquota nenhuma: diz que a nota sai sem a linha dos tributos", () => {
    montar(config("2026-11-01", null), vi.fn());
    expect(screen.getByText(/saindo sem a linha dos tributos/)).toBeTruthy();
    // Confirmar não resolveria (o aviso volta): só o caminho pra Configurações.
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Abrir Dados fiscais")).toBeTruthy();
  });
  it("sem permissão de editar: sem botão", () => {
    montar(config(null));
    expect(screen.queryByRole("button")).toBeNull();
  });
});
