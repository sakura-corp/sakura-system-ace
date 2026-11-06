// @vitest-environment jsdom
/**
 * Teste de TELA do Caixa Diário (#790): o faturamento grava a CHAVE da forma
 * de pagamento ("cartao_debito"), e a tela tem que mostrar o NOME ("Cartão de
 * débito"), na tabela e nos cartões das formas de recebimento. Os dados de
 * exemplo gravam o nome, por isso as fotos não mostravam o problema.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import type { MovimentoCaixa } from "@/types/caixa";
import { DiarioSection } from "./DiarioSection";

const agora = new Date().toISOString();

function mov(id: string, valor: number, forma: string | null): MovimentoCaixa {
  return { id, loja_id: "l", data: agora, ordem_servico_id: null, tipo: "entrada", forma_pagamento: forma, valor, descricao: null, categoria_id: null };
}

function abrir(movimentos: MovimentoCaixa[]) {
  return renderizar(
    <DiarioSection movimentos={movimentos} custoDasOrdens={new Map()} categorias={[]} onSalvar={vi.fn()} />,
  );
}

describe("DiarioSection", () => {
  it("mostra o nome da forma de pagamento, nunca a chave gravada", () => {
    abrir([mov("1", 50, "cartao_debito"), mov("2", 20, "pix")]);
    const tabela = screen.getByRole("table");
    expect(within(tabela).getByText("Cartão de débito")).toBeTruthy();
    expect(within(tabela).getByText("Pix")).toBeTruthy();
    expect(screen.queryByText("cartao_debito")).toBeNull();
  });

  it("a chave e o nome digitado à mão caem no mesmo cartão de recebimento", () => {
    abrir([mov("1", 50, "cartao_debito"), mov("2", 30, "Cartão de débito")]);
    const cartoes = screen.getByRole("heading", { name: "Formas de recebimento" }).parentElement!;
    expect(within(cartoes).getAllByText("Cartão de débito")).toHaveLength(1);
    expect(within(cartoes).getByText(/80,00/)).toBeTruthy();
  });

  it("lançamento manual com texto livre continua como foi escrito", () => {
    abrir([mov("1", 10, "Vale da loja")]);
    expect(within(screen.getByRole("table")).getByText("Vale da loja")).toBeTruthy();
  });
});
