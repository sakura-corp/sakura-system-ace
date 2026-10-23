// @vitest-environment jsdom
/**
 * Teste de TELA da lista de Produtos (#781): a margem sai no formato
 * brasileiro, com vírgula ("59,1%"), igual ao resto dos números do programa.
 * A conta continua a de `margemAPartirDoPreco` (sobre o custo); aqui se
 * confere só como ela aparece na tabela.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { ProdutosSection } from "./ProdutosSection";
import type { Peca } from "@/types/peca";

function umaPeca(extra: Partial<Peca>): Peca {
  return {
    id: "p-1",
    codigo_interno: null,
    codigo_barras: null,
    descricao: "PNEU 175/70 R13 PIRELLI",
    marca: null,
    modelo: null,
    aplicacao: null,
    unidade: "UN",
    preco_custo: null,
    preco_venda: null,
    ncm: "40111000",
    cest: "0100100",
    cfop_padrao: "5102",
    origem: "0",
    cst_ou_csosn: "500",
    aliquota_icms: null,
    categoria_id: null,
    prazo_garantia_dias: null,
    estoque_minimo: null,
    medida: null,
    indice_carga_velocidade: null,
    dot: null,
    ativo: true,
    criado_em: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

function montar(pecas: Peca[]) {
  return renderizar(
    <ProdutosSection
      pecas={pecas}
      categorias={[]}
      saldos={new Map()}
      regime="simples_nacional"
      lojaId="loja-1"
      onRecarregar={vi.fn().mockResolvedValue(undefined)}
    />,
  );
}

describe("ProdutosSection — margem", () => {
  it("mostra a margem com vírgula: custo 220, venda 350 → 59,1%", () => {
    montar([umaPeca({ preco_custo: 220, preco_venda: 350 })]);
    expect(screen.getByText("59,1%")).toBeTruthy();
    expect(screen.queryByText("59.1%")).toBeNull();
  });

  it("margem inteira não ganha casa decimal: custo 100, venda 150 → 50%", () => {
    montar([umaPeca({ preco_custo: 100, preco_venda: 150 })]);
    expect(screen.getByText("50%")).toBeTruthy();
  });

  it("sem custo, mostra o traço", () => {
    montar([umaPeca({ preco_custo: null, preco_venda: 150 })]);
    const linha = screen.getByText("PNEU 175/70 R13 PIRELLI").closest("tr")!;
    expect(linha.textContent).not.toContain("%");
  });
});
