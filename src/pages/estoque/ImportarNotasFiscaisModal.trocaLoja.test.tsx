// @vitest-environment jsdom
/**
 * #927: o modal lê o regime tributário da loja. Se a loja mudar com a leitura
 * anterior ainda andando, o regime da loja antiga não pode chegar depois e
 * ficar valendo (ele decide o aviso de código de ICMS e o código das peças).
 * Só leitura: não tem os dados da anterior pra esconder, então um caso só.
 */
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reiniciarConexaoParaTeste } from "@/hooks/useConexao";
import { renderizar, screen } from "@/testes/tela";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";
import type { ItemNotaFiscalExtraido } from "@/types/itemNotaFiscal";

const lerNotasFiscais = vi.fn();
const buscarConfiguracaoFiscal = vi.fn();
vi.mock("@/lib/iaNotaFiscal", () => ({
  lerNotasFiscais: (...a: unknown[]) => lerNotasFiscais(...a),
}));
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoFiscal: (...a: unknown[]) => buscarConfiguracaoFiscal(...a),
}));
vi.mock("@/lib/pecas", () => ({ criarPeca: vi.fn() }));
vi.mock("@/lib/estoque", () => ({ criarMovimento: vi.fn() }));

const { ImportarNotasFiscaisModal } = await import("./ImportarNotasFiscaisModal");

// Um item com CST "00": serve pro regime normal e NÃO serve pro Simples.
const item = {
  descricao: "Pneu 175/70 R13",
  marca: null,
  modelo: null,
  codigo_barras: null,
  ncm: "40111000",
  cest: "1600100",
  cfop_padrao: "5102",
  origem: "0",
  cst_ou_csosn: "00",
  aliquota_icms: null,
  unidade: "UN",
  preco_custo: 300,
  quantidade: 2,
} as ItemNotaFiscalExtraido;

function adiada<T>() {
  let resolver!: (v: T) => void;
  const promessa = new Promise<T>((res) => {
    resolver = res;
  });
  return { promessa, resolver };
}

const config = (regime: string) => ({ regime_tributario: regime }) as unknown as ConfiguracaoFiscalLoja;
const modal = (lojaId: string) => (
  <ImportarNotasFiscaisModal
    categorias={[]}
    pecas={[]}
    lojaId={lojaId}
    onFechar={vi.fn()}
    onImportado={vi.fn()}
  />
);

beforeEach(() => {
  reiniciarConexaoParaTeste();
  vi.clearAllMocks();
});

describe("ImportarNotasFiscaisModal — troca de loja (#927)", () => {
  it("o regime da loja A que chega depois da B não sobrescreve o da B", async () => {
    const a = adiada<ConfiguracaoFiscalLoja>();
    buscarConfiguracaoFiscal.mockImplementation((loja: string) =>
      loja === "loja-a" ? a.promessa : Promise.resolve(config("simples_nacional")),
    );
    lerNotasFiscais.mockResolvedValue([item]);
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
      screen.getByLabelText("Fotos ou PDFs das notas"),
      new File(["x"], "nota.pdf", { type: "application/pdf" }),
    );
    await user.click(screen.getByRole("button", { name: "Ler arquivos" }));
    await screen.findByText("CFOP");

    // Com o Simples da loja B, o CST 00 não serve e o aviso aparece.
    expect(screen.getByText(/Um produto está/)).toBeInTheDocument();
  });
});
