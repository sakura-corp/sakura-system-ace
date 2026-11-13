// @vitest-environment jsdom
/**
 * #927: o modal lê o regime tributário da loja. Se a loja mudar com a leitura
 * anterior ainda andando, o regime da loja antiga não pode chegar depois e
 * ficar valendo (ele decide o aviso de código de ICMS das peças novas).
 * Só leitura: não tem dado da anterior pra esconder, então um caso só.
 */
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";
import type { Deposito } from "@/types/deposito";
import type { NotaFiscalXmlExtraida } from "@/types/notaFiscalXmlFornecedor";

const extrairNotaFiscalXml = vi.fn();
const buscarConfiguracaoFiscal = vi.fn();
vi.mock("@/lib/notaFiscalXmlFornecedor", () => ({
  extrairNotaFiscalXml: (...a: unknown[]) => extrairNotaFiscalXml(...a),
  lerTextoXml: async () => "<xml/>",
  normalizarCnpj: (cnpj: string | null) => (cnpj ?? "").replace(/\D/g, ""),
}));
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoFiscal: (...a: unknown[]) => buscarConfiguracaoFiscal(...a),
}));
vi.mock("@/lib/pecas", () => ({
  buscarDadosFiscaisDasPecas: async () => [],
  cadastrarPecaRapida: vi.fn(),
}));
vi.mock("@/lib/fornecedores", () => ({ criarFornecedor: vi.fn() }));
vi.mock("@/lib/pedidosCompra", () => ({ importarNotaFiscalCompra: vi.fn() }));

const { ImportarNotaFiscalXmlModal } = await import("./ImportarNotaFiscalXmlModal");

// Item com CST "00": serve pro regime normal e NÃO serve pro Simples.
const nota = {
  numero: "123",
  fornecedor_nome: "Distribuidora de exemplo",
  fornecedor_cnpj: null,
  itens: [
    {
      descricao: "Pneu 175/70 R13",
      codigo_barras: null,
      codigo_interno_xml: null,
      ncm: "40111000",
      cfop_padrao: "5102",
      origem: "0",
      cst_ou_csosn: "00",
      aliquota_icms: null,
      unidade: "UN",
      quantidade: 2,
      preco_unitario: 300,
    },
  ],
} as unknown as NotaFiscalXmlExtraida;

function adiada<T>() {
  let resolver!: (v: T) => void;
  const promessa = new Promise<T>((res) => {
    resolver = res;
  });
  return { promessa, resolver };
}

const config = (regime: string) => ({ regime_tributario: regime }) as unknown as ConfiguracaoFiscalLoja;
const modal = (lojaId: string) => (
  <ImportarNotaFiscalXmlModal
    fornecedores={[]}
    pecas={[]}
    depositos={[{ id: "dep-1", nome: "Loja" } as Deposito]}
    lojaId={lojaId}
    operadorId="op"
    onFechar={vi.fn()}
    onImportado={vi.fn()}
  />
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ImportarNotaFiscalXmlModal — troca de loja (#927)", () => {
  it("o regime da loja A que chega depois da B não sobrescreve o da B", async () => {
    const a = adiada<ConfiguracaoFiscalLoja>();
    buscarConfiguracaoFiscal.mockImplementation((loja: string) =>
      loja === "loja-a" ? a.promessa : Promise.resolve(config("simples_nacional")),
    );
    extrairNotaFiscalXml.mockReturnValue(nota);
    const { user, rerender } = renderizar(modal("loja-a"));
    rerender(modal("loja-b"));
    await waitFor(() => expect(buscarConfiguracaoFiscal).toHaveBeenCalledWith("loja-b"));
    await act(async () => {
      await Promise.resolve();
    });

    // A (regime normal) chega por último.
    await act(async () => {
      a.resolver(config("lucro_presumido"));
      await a.promessa;
    });

    await user.upload(
      screen.getByLabelText("Arquivo XML da nota"),
      new File(["<xml/>"], "nota.xml", { type: "text/xml" }),
    );
    await user.click(screen.getByRole("button", { name: "Ler arquivo" }));
    await screen.findByText(/Importar \d+ item/);

    // Com o Simples da loja B, o CST 00 do fornecedor não serve e o aviso aparece.
    expect(screen.getByText(/Uma peça nova desta nota vem/)).toBeInTheDocument();
  });
});
