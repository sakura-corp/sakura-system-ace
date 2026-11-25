// @vitest-environment jsdom
/**
 * #389 e #1086: o bloco Próximos 30 dias (o período é 7, 30, 60 ou 90). A
 * conta mora em `schemas/fluxoProjetado.ts` e `schemas/relacoes.ts`; aqui se
 * confere o que a tela mostra com ela: lado sem acesso nunca vira R$ 0,00,
 * cada conta cai na linha do seu dia (no "Ver como tabela"), a recorrente
 * aparece como "prevista", o período muda o nome do cartão e o que se vê, e
 * sem o "quanto tenho hoje" o gráfico diz "quanto falta cobrir".
 */
import { describe, expect, it } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import type { ContaPagar } from "@/types/contaPagar";
import type { ContaReceber } from "@/types/contaReceber";
import { BlocoProximos } from "./BlocoProximos";

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


function desenhar(parcial: { pagar?: ContaPagar[] | null; receber?: ContaReceber[] | null }) {
  return renderizar(
    <BlocoProximos
      contasPagar={parcial.pagar === undefined ? [] : parcial.pagar}
      contasReceber={parcial.receber === undefined ? [] : parcial.receber}
      carregando={false}
      erro={null}
      hoje={HOJE}
    />,
  );
}

async function abrirATabela(user: ReturnType<typeof renderizar>["user"]) {
  await user.click(screen.getByRole("button", { name: "Ver como tabela" }));
}

describe("BlocoProximos", () => {
  it("sem acesso aos dois módulos: avisa os dois lados e nunca mostra R$ 0,00", () => {
    desenhar({ pagar: null, receber: null });

    expect(screen.getByText("Sem acesso a Contas a Pagar")).toBeInTheDocument();
    expect(screen.getByText("Sem acesso a Contas a Receber")).toBeInTheDocument();
    expect(screen.queryByText(/R\$\s*0,00/)).toBeNull();
    // Sem saldo não há gráfico: o aviso fica no lugar dele.
    expect(screen.getByRole("heading", { name: "Falta acesso pra projetar o saldo" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Quanto falta cobrir/ })).toBeNull();
  });

  it("só com Contas a Pagar: avisa o lado da Receber e mostra a soma do que sai", () => {
    desenhar({ pagar: [pagar({ valor: 100 }), pagar({ valor: 50.5 })], receber: null });

    expect(screen.getByText("Sem acesso a Contas a Receber")).toBeInTheDocument();
    expect(screen.queryByText("Sem acesso a Contas a Pagar")).toBeNull();
    expect(screen.getAllByText(/150,50/).length).toBeGreaterThan(0);
  });

  it("com os dois: o gráfico diz quanto falta cobrir, e Entra e Sai vêm escritos", () => {
    desenhar({
      pagar: [pagar({ descricao: "Aluguel", valor: 1000, vencimento: "2026-11-14" })],
      receber: [receber({ valor: 250, vencimento: "2026-11-16" })],
    });

    expect(screen.getByRole("heading", { name: /Quanto falta cobrir nos próximos 30 dias: R\$ 1 mil/ })).toBeInTheDocument();
    expect(screen.getByRole("figure")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?250,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?1\.000,00/)).toBeInTheDocument();
  });

  it("uma conta a pagar e uma a receber caem nas linhas dos seus dias", async () => {
    const { user } = desenhar({
      pagar: [pagar({ valor: 100, vencimento: "2026-11-14" })],
      receber: [receber({ valor: 250, vencimento: "2026-11-16" })],
    });
    await abrirATabela(user);

    const linhaPagar = screen.getByRole("row", { name: /14\/11\/2026/ });
    expect(within(linhaPagar).getAllByText(/100,00/).length).toBeGreaterThan(0);
    expect(within(linhaPagar).queryByText(/250,00/)).toBeNull();

    const linhaReceber = screen.getByRole("row", { name: /16\/11\/2026/ });
    expect(within(linhaReceber).getAllByText(/250,00/).length).toBeGreaterThan(0);

    // O dia de hoje aparece sempre, mesmo sem conta; dia vazio sem ser hoje não.
    expect(screen.getByRole("row", { name: /11\/11\/2026/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /12\/11\/2026/ })).toBeNull();
  });

  it("abrir a linha mostra a conta e o selo 'prevista' da recorrente", async () => {
    const { user } = desenhar({
      pagar: [pagar({ descricao: "Aluguel", valor: 1000, vencimento: "2026-11-20", recorrente: true })],
    });
    await abrirATabela(user);

    // Em 30 dias só a conta real (20/11); a prevista do mês seguinte (20/12) fica de fora.
    await user.click(screen.getByRole("button", { name: /20\/11\/2026/ }));
    expect(screen.getByText("Aluguel")).toBeInTheDocument();
    expect(screen.queryByText(/^prevista$/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: "60 dias" }));
    const botaoPrevista = screen.getByRole("button", { name: /20\/12\/2026/ });
    expect(botaoPrevista).toHaveAttribute("aria-expanded", "false");
    await user.click(botaoPrevista);
    expect(botaoPrevista).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Prevista")).toBeInTheDocument();
  });

  it("trocar o período muda o nome do cartão e o que aparece", async () => {
    const { user } = desenhar({
      pagar: [
        pagar({ descricao: "Perto", vencimento: "2026-11-14" }),
        pagar({ descricao: "Longe", vencimento: "2026-12-30" }),
      ],
    });
    await abrirATabela(user);

    expect(screen.getByRole("button", { name: "30 dias" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Próximos 30 dias")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /14\/11\/2026/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /30\/12\/2026/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "60 dias" }));
    expect(screen.getByText("Próximos 60 dias")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /30\/12\/2026/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "7 dias" }));
    expect(screen.getByText("Próximos 7 dias")).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /30\/12\/2026/ })).toBeNull();
    expect(screen.getByRole("button", { name: /14\/11\/2026/ })).toBeInTheDocument();
  });

  it("carregando as contas e erro nas contas têm o seu próprio aviso", () => {
    const { rerender } = renderizar(
      <BlocoProximos contasPagar={null} contasReceber={null} carregando erro={null} hoje={HOJE} />,
    );
    expect(screen.getByText("Carregando as contas...")).toBeInTheDocument();

    rerender(<BlocoProximos contasPagar={null} contasReceber={null} carregando={false} erro="caiu a internet" hoje={HOJE} />);
    expect(screen.getByText(/Não deu pra carregar as contas: caiu a internet/)).toBeInTheDocument();
    expect(screen.queryByText(/Sem acesso/)).toBeNull();
  });
});
