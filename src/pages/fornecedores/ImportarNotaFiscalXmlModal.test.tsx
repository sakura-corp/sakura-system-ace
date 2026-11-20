// @vitest-environment jsdom
/**
 * Teste de TELA da importação do XML de compra (#968).
 *
 * Promessa guardada aqui: item da nota que vai virar peça nova com o CFOP que
 * não combina com o CSOSN (5102 + 500) ganha o aviso na linha dele, e o botão
 * de importar continua liberado — é aviso, nunca tranca (docs/licoes.md, item 33).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { Deposito } from "@/types/deposito";
import type { NotaFiscalXmlExtraida } from "@/types/notaFiscalXmlFornecedor";

const extrairNotaFiscalXml = vi.fn();
vi.mock("@/lib/notaFiscalXmlFornecedor", () => ({
  extrairNotaFiscalXml: (...a: unknown[]) => extrairNotaFiscalXml(...a),
  lerTextoXml: async () => "<xml/>",
  normalizarCnpj: (cnpj: string | null) => (cnpj ?? "").replace(/\D/g, ""),
}));
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoFiscal: async () => ({ loja_id: "loja-1", regime_tributario: "simples_nacional" }),
}));
vi.mock("@/lib/pecas", () => ({
  buscarDadosFiscaisDasPecas: async () => [],
  cadastrarPecaRapida: vi.fn(),
}));
vi.mock("@/lib/fornecedores", () => ({ criarFornecedor: vi.fn() }));
vi.mock("@/lib/pedidosCompra", () => ({ importarNotaFiscalCompra: vi.fn() }));

const { ImportarNotaFiscalXmlModal } = await import("./ImportarNotaFiscalXmlModal");

const itemDaNota = (descricao: string, cfop: string, csosn: string) => ({
  descricao,
  codigo_barras: null,
  codigo_interno_xml: null,
  ncm: "40111000",
  cfop_padrao: cfop,
  origem: "0",
  cst_ou_csosn: csosn,
  aliquota_icms: null,
  unidade: "UN",
  quantidade: 2,
  preco_unitario: 300,
});

function nota(itens: ReturnType<typeof itemDaNota>[]): NotaFiscalXmlExtraida {
  return {
    numero: "123",
    fornecedor_nome: "Distribuidora de exemplo",
    fornecedor_cnpj: null,
    itens,
  } as unknown as NotaFiscalXmlExtraida;
}

async function lerNota(itens: ReturnType<typeof itemDaNota>[]) {
  extrairNotaFiscalXml.mockReturnValue(nota(itens));
  const { user } = renderizar(
    <ImportarNotaFiscalXmlModal
      fornecedores={[]}
      pecas={[]}
      depositos={[{ id: "dep-1", nome: "Loja" } as Deposito]}
      lojaId="loja-1"
      operadorId="op"
      onFechar={vi.fn()}
      onImportado={vi.fn()}
    />,
  );
  await user.upload(
    screen.getByLabelText("Arquivo XML da nota"),
    new File(["<xml/>"], "nota.xml", { type: "text/xml" }),
  );
  await user.click(screen.getByRole("button", { name: "Ler arquivo" }));
  await screen.findByText(/Importar \d+ item/);
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ImportarNotaFiscalXmlModal — CFOP que não combina com o CSOSN (#968)", () => {
  it("item 5102 + CSOSN 500: avisa na linha e importar continua liberado", async () => {
    await lerNota([itemDaNota("Pneu 175/70 R13", "5102", "500")]);

    expect(
      await screen.findByText(/o CFOP 5102 não combina com o CSOSN 500 .*use 5405/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Importar 1 item/ })).toBeEnabled();
  });

  it("item 5405 + CSOSN 500: sem aviso do CFOP", async () => {
    await lerNota([itemDaNota("Pneu 175/70 R13", "5405", "500")]);

    expect(screen.queryByText(/não combina com o CSOSN/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Importar 1 item/ })).toBeEnabled();
  });
});
