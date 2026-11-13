// @vitest-environment jsdom
/**
 * #389: o fluxo de caixa projetado. A conta mora em `schemas/fluxoProjetado.ts`;
 * aqui se confere o que a tela mostra com ela: lado sem acesso nunca vira
 * R$ 0,00, cada conta cai na linha do seu dia, a recorrente aparece como
 * "prevista" e o período muda o que se vê.
 */
import { describe, expect, it } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import type { ContaPagar } from "@/types/contaPagar";
import type { ContaReceber } from "@/types/contaReceber";
import { FluxoProjetadoSection } from "./FluxoProjetadoSection";

const HOJE = "2026-11-11";

function pagar(parcial: Partial<ContaPagar>): ContaPagar {
  return {
    id: crypto.randomUUID(),
    loja_id: "loja",
    descricao: "Conta",
    valor: 100,
    vencimento: "2026-11-14",
    categoria_id: null,
    recorrente: false,
    recorrente_ate: null,
    status: "pendente",
    data_pagamento: null,
    caixa_movimento_id: null,
    operador_id: null,
    criado_em: "2026-11-01T12:00:00",
    ...parcial,
  };
}

function receber(parcial: Partial<ContaReceber>): ContaReceber {
  return {
    id: crypto.randomUUID(),
    loja_id: "loja",
    cliente_id: "cli",
    ordem_servico_id: null,
    descricao: "Fiado",
    valor: 250,
    vencimento: "2026-11-16",
    status: "pendente",
    data_recebimento: null,
    caixa_movimento_id: null,
    operador_id: null,
    criado_em: "2026-11-01T12:00:00",
    ...parcial,
  };
}

describe("FluxoProjetadoSection", () => {
  it("sem acesso aos dois módulos: avisa os dois lados e nunca mostra R$ 0,00", () => {
    renderizar(
      <FluxoProjetadoSection
        contasPagar={null}
        contasReceber={null}
        hoje={HOJE}
      />,
    );

    expect(screen.getByText("Sem acesso a Contas a Pagar")).toBeInTheDocument();
    expect(
      screen.getByText("Sem acesso a Contas a Receber"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/R\$\s*0,00/)).toBeNull();
  });

  it("só com Contas a Pagar: avisa o lado da Receber e mostra a soma do que sai", () => {
    renderizar(
      <FluxoProjetadoSection
        contasPagar={[pagar({ valor: 100 }), pagar({ valor: 50.5 })]}
        contasReceber={null}
        hoje={HOJE}
      />,
    );

    expect(
      screen.getByText("Sem acesso a Contas a Receber"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Sem acesso a Contas a Pagar")).toBeNull();
    expect(screen.getAllByText(/150,50/).length).toBeGreaterThan(0);
  });

  it("uma conta a pagar e uma a receber caem nas linhas dos seus dias", () => {
    renderizar(
      <FluxoProjetadoSection
        contasPagar={[pagar({ valor: 100, vencimento: "2026-11-14" })]}
        contasReceber={[receber({ valor: 250, vencimento: "2026-11-16" })]}
        hoje={HOJE}
      />,
    );

    const linhaPagar = screen.getByRole("row", { name: /14\/11\/2026/ });
    expect(within(linhaPagar).getAllByText(/100,00/).length).toBeGreaterThan(0);
    expect(within(linhaPagar).queryByText(/250,00/)).toBeNull();

    const linhaReceber = screen.getByRole("row", { name: /16\/11\/2026/ });
    expect(within(linhaReceber).getAllByText(/250,00/).length).toBeGreaterThan(
      0,
    );

    // O dia de hoje aparece sempre, mesmo sem conta; dia vazio sem ser hoje não.
    expect(
      screen.getByRole("row", { name: /11\/11\/2026/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /12\/11\/2026/ })).toBeNull();
  });

  it("abrir a linha mostra a conta e o selo 'prevista' da recorrente", async () => {
    const { user } = renderizar(
      <FluxoProjetadoSection
        contasPagar={[
          pagar({
            descricao: "Aluguel",
            valor: 1000,
            vencimento: "2026-11-20",
            recorrente: true,
          }),
        ]}
        contasReceber={[]}
        hoje={HOJE}
      />,
    );

    // Em 30 dias só a conta real (20/11); a prevista do mês seguinte (20/12) fica de fora.
    await user.click(screen.getByRole("button", { name: /20\/11\/2026/ }));
    expect(screen.getByText("Aluguel")).toBeInTheDocument();
    expect(screen.queryByText("prevista")).toBeNull();

    await user.click(screen.getByRole("button", { name: "60 dias" }));
    const botaoPrevista = screen.getByRole("button", { name: /20\/12\/2026/ });
    expect(botaoPrevista).toHaveAttribute("aria-expanded", "false");
    await user.click(botaoPrevista);
    expect(botaoPrevista).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("prevista")).toBeInTheDocument();
  });

  it("trocar o período muda o que aparece", async () => {
    const { user } = renderizar(
      <FluxoProjetadoSection
        contasPagar={[
          pagar({ descricao: "Perto", vencimento: "2026-11-14" }),
          pagar({ descricao: "Longe", vencimento: "2026-12-30" }),
        ]}
        contasReceber={[]}
        hoje={HOJE}
      />,
    );

    expect(screen.getByRole("button", { name: "30 dias" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: /14\/11\/2026/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /30\/12\/2026/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "60 dias" }));
    expect(
      screen.getByRole("button", { name: /30\/12\/2026/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "7 dias" }));
    expect(screen.queryByRole("row", { name: /30\/12\/2026/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: /14\/11\/2026/ }),
    ).toBeInTheDocument();
  });
});
