// @vitest-environment jsdom
/**
 * Teste de TELA da importação de produtos por foto/PDF da nota (#968).
 *
 * Promessa guardada aqui: item com o CFOP que não combina com o CSOSN
 * (5102 + 500) ganha o aviso na linha dele, e o botão de cadastrar continua
 * liberado — é aviso, nunca tranca (docs/licoes.md, item 33). O CFOP não é
 * trocado sozinho.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { reiniciarConexaoParaTeste } from "@/hooks/useConexao";
import { renderizar, screen } from "@/testes/tela";
import type { ItemNotaFiscalExtraido } from "@/types/itemNotaFiscal";

const lerNotasFiscais = vi.fn();
vi.mock("@/lib/iaNotaFiscal", () => ({
  lerNotasFiscais: (...a: unknown[]) => lerNotasFiscais(...a),
}));
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoFiscal: async () => ({ loja_id: "loja-1", regime_tributario: "simples_nacional" }),
}));
vi.mock("@/lib/pecas", () => ({ criarPeca: vi.fn() }));
vi.mock("@/lib/estoque", () => ({ criarMovimento: vi.fn() }));

const { ImportarNotasFiscaisModal } = await import("./ImportarNotasFiscaisModal");

const itemDaNota = (cfop: string, csosn: string): ItemNotaFiscalExtraido => ({
  descricao: "Pneu 175/70 R13",
  marca: null,
  modelo: null,
  codigo_barras: null,
  ncm: "40111000",
  cest: "1600100",
  cfop_padrao: cfop,
  origem: "0",
  cst_ou_csosn: csosn,
  aliquota_icms: null,
  unidade: "UN",
  preco_custo: 300,
  quantidade: 2,
});

async function lerNota(itens: ItemNotaFiscalExtraido[]) {
  lerNotasFiscais.mockResolvedValue(itens);
  const { user } = renderizar(
    <ImportarNotasFiscaisModal
      categorias={[]}
      pecas={[]}
      lojaId="loja-1"
      onFechar={vi.fn()}
      onImportado={vi.fn()}
    />,
  );
  await user.upload(
    screen.getByLabelText("Fotos ou PDFs das notas"),
    new File(["x"], "nota.pdf", { type: "application/pdf" }),
  );
  await user.click(screen.getByRole("button", { name: "Ler arquivos" }));
  await screen.findByText("CFOP");
  return user;
}

beforeEach(() => {
  reiniciarConexaoParaTeste();
  vi.clearAllMocks();
});

describe("ImportarNotasFiscaisModal — CFOP que não combina com o CSOSN (#968)", () => {
  it("item 5102 + CSOSN 500: avisa na linha e cadastrar continua liberado", async () => {
    await lerNota([itemDaNota("5102", "500")]);

    expect(
      await screen.findByText(/o CFOP 5102 não combina com o CSOSN 500 .*use 5405/),
    ).toBeInTheDocument();
    const botao = screen.getByRole("button", { name: /Cadastrar/ });
    expect(botao).toBeEnabled();
  });

  it("item 5405 + CSOSN 500: sem aviso do CFOP", async () => {
    await lerNota([itemDaNota("5405", "500")]);

    expect(screen.queryByText(/não combina com o CSOSN/)).not.toBeInTheDocument();
  });
});

describe("ImportarNotasFiscaisModal — sem internet (#374)", () => {
  it("offline: avisa perto do botão Ler e ele continua clicável", async () => {
    const { user } = renderizar(
      <ImportarNotasFiscaisModal
        categorias={[]}
        pecas={[]}
        lojaId="loja-1"
        onFechar={vi.fn()}
        onImportado={vi.fn()}
      />,
    );
    await user.upload(
      screen.getByLabelText("Fotos ou PDFs das notas"),
      new File(["x"], "nota.pdf", { type: "application/pdf" }),
    );
    expect(screen.queryByText(/Sem internet não dá pra ler/)).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByText(/Sem internet não dá pra ler a nota por foto/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ler arquivos" })).toBeEnabled();
  });
});
