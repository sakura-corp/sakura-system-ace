// @vitest-environment jsdom
/**
 * Teste de TELA das contas a pagar da nota de compra (#1020).
 *
 * Promessas: a janela mostra as parcelas lidas da nota, editáveis; com a
 * caixa marcada a importação leva as contas (com o vencimento que a pessoa
 * mudou), desmarcada não leva nenhuma; nota já importada trava o botão; sem
 * vencimento não lança as contas, mas o pedido entra (aviso, nunca tranca).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
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
  cadastrarPecaRapida: vi.fn(async () => "peca-nova"),
}));
vi.mock("@/lib/fornecedores", () => ({ criarFornecedor: vi.fn(async () => ({ id: "forn-novo" })) }));
vi.mock("@/lib/categoriasCaixa", () => ({
  listarCategoriasCaixa: async () => [
    { id: "cat-entrada", nome: "Vendas", tipo: "entrada" },
    { id: "cat-compras", nome: "Compra de mercadoria", tipo: "saida" },
  ],
}));
const importarNotaFiscalCompra = vi.fn();
const buscarPedidoDaNota = vi.fn();
vi.mock("@/lib/pedidosCompra", () => ({
  importarNotaFiscalCompra: (...a: unknown[]) => importarNotaFiscalCompra(...a),
  buscarPedidoDaNota: (...a: unknown[]) => buscarPedidoDaNota(...a),
  observacaoDaImportacao: (n: string, c: string) => `NFe ${n} chave ${c}`,
  NotaJaImportadaError: class extends Error {},
}));

const { ImportarNotaFiscalXmlModal } = await import("./ImportarNotaFiscalXmlModal");

const CHAVE = "35261112345678000199550010000012341000012345";

function nota(duplicatas: NotaFiscalXmlExtraida["duplicatas"]): NotaFiscalXmlExtraida {
  return {
    numero: "1234",
    fornecedor_nome: "Distribuidora de exemplo",
    fornecedor_cnpj: "12345678000199",
    chave_acesso: CHAVE,
    valor_total: 1000,
    duplicatas,
    itens: [
      {
        descricao: "Pneu de exemplo",
        codigo_barras: null,
        codigo_interno_xml: null,
        ncm: "40111000",
        cfop_padrao: "5405",
        origem: "0",
        cst_ou_csosn: "500",
        aliquota_icms: null,
        unidade: "UN",
        quantidade: 4,
        preco_unitario: 250,
      },
    ],
  };
}

const TRES = [
  { numero: "001", vencimento: "2026-12-01", valor: 333.34 },
  { numero: "002", vencimento: "2026-12-31", valor: 333.33 },
  { numero: "003", vencimento: "2027-01-30", valor: 333.33 },
];

async function lerNota(duplicatas: NotaFiscalXmlExtraida["duplicatas"], podeLancarContas = true) {
  extrairNotaFiscalXml.mockReturnValue(nota(duplicatas));
  const onFechar = vi.fn();
  const { user } = renderizar(
    <ImportarNotaFiscalXmlModal
      fornecedores={[{ id: "forn-1", nome: "Distribuidora de exemplo", cnpj: "12345678000199" } as never]}
      pecas={[]}
      depositos={[{ id: "dep-1", nome: "Loja" } as Deposito]}
      lojaId="loja-1"
      operadorId="op"
      podeLancarContas={podeLancarContas}
      onFechar={onFechar}
      onImportado={async () => undefined}
    />,
  );
  await user.upload(
    screen.getByLabelText("Arquivo XML da nota"),
    new File(["<xml/>"], "nota.xml", { type: "text/xml" }),
  );
  await user.click(screen.getByRole("button", { name: "Ler arquivo" }));
  await screen.findByText(/Importar \d+ item/);
  return { user, onFechar };
}

beforeEach(() => {
  vi.clearAllMocks();
  buscarPedidoDaNota.mockResolvedValue(null);
  importarNotaFiscalCompra.mockResolvedValue({
    pedido: { numero: 7 },
    contasLancadas: 3,
    erroContas: null,
  });
});

describe("ImportarNotaFiscalXmlModal — contas a pagar da nota (#1020)", () => {
  it("mostra as 3 parcelas com valor e vencimento, e leva as 3 com o vencimento editado", async () => {
    const { user, onFechar } = await lerNota(TRES);
    expect(screen.getByLabelText("Vencimento da parcela 1")).toHaveValue("2026-12-01");
    expect(screen.getByLabelText("Valor da parcela 3")).toHaveValue(333.33);

    fireEvent.change(screen.getByLabelText("Vencimento da parcela 2"), {
      target: { value: "2027-01-05" },
    });
    await user.selectOptions(screen.getByLabelText("Categoria"), "cat-compras");
    await user.click(screen.getByRole("button", { name: /Importar 1 item/ }));

    const extras = importarNotaFiscalCompra.mock.calls[0][6];
    expect(extras.chaveAcesso).toBe(CHAVE);
    expect(extras.contas.map((c: { vencimento: string }) => c.vencimento)).toEqual([
      "2026-12-01",
      "2027-01-05",
      "2027-01-30",
    ]);
    expect(extras.contas[0]).toMatchObject({
      descricao: "NF 1234 — Distribuidora de exemplo (1/3)",
      valor: 333.34,
      categoria_id: "cat-compras",
    });
    expect(onFechar).toHaveBeenCalled();
  });

  it("a categoria só oferece as de saída", async () => {
    await lerNota(TRES);
    expect(await screen.findByRole("option", { name: "Compra de mercadoria" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Vendas" })).toBeNull();
  });

  it("com a caixa desmarcada, importa sem nenhuma conta", async () => {
    const { user } = await lerNota(TRES);
    await user.click(screen.getByLabelText("Lançar em Contas a pagar"));
    await user.click(screen.getByRole("button", { name: /Importar 1 item/ }));
    expect(importarNotaFiscalCompra.mock.calls[0][6].contas).toEqual([]);
  });

  it("sem acesso a Contas a pagar, não oferece a caixa e não leva conta", async () => {
    const { user } = await lerNota(TRES, false);
    expect(screen.queryByLabelText("Lançar em Contas a pagar")).toBeNull();
    expect(screen.getByText(/não tem acesso a Contas a pagar/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Importar 1 item/ }));
    expect(importarNotaFiscalCompra.mock.calls[0][6].contas).toEqual([]);
  });

  it("nota sem duplicata: 1 parcela com o total e sem vencimento; importa sem as contas e diz por quê", async () => {
    const { user, onFechar } = await lerNota([]);
    expect(screen.getByLabelText("Valor da parcela 1")).toHaveValue(1000);
    expect(screen.getByLabelText("Vencimento da parcela 1")).toHaveValue("");
    expect(screen.getByText(/Falta o vencimento da parcela 1/)).toBeInTheDocument();

    const botao = screen.getByRole("button", { name: /Importar 1 item/ });
    expect(botao).toBeEnabled(); // aviso, nunca tranca
    await user.click(botao);
    expect(importarNotaFiscalCompra.mock.calls[0][6].contas).toEqual([]);
    expect(await screen.findByText(/O pedido 7.*NÃO foram lançadas/)).toBeInTheDocument();
    expect(onFechar).not.toHaveBeenCalled();
  });

  it("parcelas que não somam o total: aviso com a diferença, e importar continua liberado", async () => {
    await lerNota(TRES.slice(0, 2));
    expect(screen.getByText(/diferença de/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Importar 1 item/ })).toBeEnabled();
  });

  it("nota já importada: avisa com o pedido e não deixa importar de novo", async () => {
    buscarPedidoDaNota.mockResolvedValue({ numero: 5 });
    await lerNota(TRES);
    expect(screen.getByText(/já foi importada/)).toHaveTextContent("Pedido 5");
    expect(screen.getByRole("button", { name: /Importar 1 item/ })).toBeDisabled();
  });

  it("pedido entrou e as contas falharam: diz o que entrou e o que não entrou", async () => {
    importarNotaFiscalCompra.mockResolvedValue({
      pedido: { numero: 7 },
      contasLancadas: 0,
      erroContas: "Sem permissão",
    });
    const { user, onFechar } = await lerNota(TRES);
    await user.click(screen.getByRole("button", { name: /Importar 1 item/ }));
    expect(
      await screen.findByText(/O pedido 7 e a entrada no estoque foram gravados\. As contas a pagar desta nota NÃO foram lançadas \(Sem permissão\)/),
    ).toBeInTheDocument();
    expect(onFechar).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Importar/ })).toBeNull();
  });

  it("falhou depois do pedido (itens ou estoque): mostra o que entrou e não fecha", async () => {
    importarNotaFiscalCompra.mockResolvedValue({
      pedido: { numero: 7 },
      contasLancadas: 0,
      erroContas: null,
      erroAntesDasContas: "O Pedido 7 foi criado, mas só 1 de 2 entradas no estoque foram lançadas.",
      avisoCotacao: null,
    });
    const { user, onFechar } = await lerNota(TRES);
    await user.click(screen.getByRole("button", { name: /Importar 1 item/ }));
    expect(await screen.findByText(/só 1 de 2 entradas.*Não importe a nota de novo/)).toBeInTheDocument();
    expect(onFechar).not.toHaveBeenCalled();
  });
});
