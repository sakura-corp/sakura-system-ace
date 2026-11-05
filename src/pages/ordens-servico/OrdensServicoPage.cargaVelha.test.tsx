// @vitest-environment jsdom
/**
 * #903: trocar de loja (ou salvar uma OS) enquanto a carga anterior ainda
 * busca dispara uma carga nova. Se a velha terminar DEPOIS, ela não pode
 * gravar a lista nem o custo da carga antiga por cima da nova.
 */
import { act, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@/testes/tela";
import { TEXTO_CUSTO_NAO_INFORMADO } from "@/schemas/orcamento";
import { hojeLocal } from "@/lib/datas";
import type { OrdemServico } from "@/types/os";

const listarOrdens = vi.fn();
const buscarCustoDasOrdens = vi.fn();
vi.mock("@/lib/ordensServico", () => ({
  listarOrdens: (...a: unknown[]) => listarOrdens(...a),
  adicionarItensOrdem: vi.fn(),
  atualizarOrdem: vi.fn(),
  concluirOrdem: vi.fn(),
  criarOrdem: vi.fn(),
  editarItemOrdem: vi.fn(),
  faturarOrdem: vi.fn(),
  registrarVendaBalcao: vi.fn(),
  VendaSemFaturamentoError: class extends Error {},
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/clientes", () => ({
  listarClientesParaEscolha: async () => [],
  cadastrarClienteRapido: vi.fn(),
  cadastrarVeiculoRapido: vi.fn(),
}));
vi.mock("@/lib/pecas", () => ({ listarPecasJanela: async () => [] }));
vi.mock("@/lib/caixa", () => ({
  buscarCustoDasOrdens: (...a: unknown[]) => buscarCustoDasOrdens(...a),
}));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/funcionarios", () => ({ listarFuncionariosPublico: async () => [] }));
vi.mock("@/lib/configuracoes", () => ({ listarJurosParcelas: async () => [] }));
vi.mock("@/lib/notasFiscais", () => ({ listarArquivosDasOrdens: async () => [] }));
vi.mock("@/lib/estoque", () => ({ listarSaldos: async () => new Map() }));
vi.mock("@/lib/modelosWhatsapp", () => ({
  listarModelosWhatsapp: async () => ({}),
  textoDoModelo: () => "",
  registrarMensagemAberta: vi.fn(),
}));
let lojaAtual = { id: "loja-a", nome: "Loja A" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op", admin: true, permissoes: [] }, lojaAtual }),
}));

const { OrdensServicoPage } = await import("./OrdensServicoPage");

function ordem(id: string, lojaId: string, nome: string) {
  return {
    id,
    numero: 1,
    loja_id: lojaId,
    cliente_id: "c1",
    veiculo_id: null,
    data_abertura: `${hojeLocal()}T15:00:00.000Z`,
    status: "em_andamento",
    cliente: { nome },
    itens: [
      { id: `i-${id}`, tipo: "peca", peca_id: null, descricao: "Palheta", quantidade: 1, preco_unitario: 100, desconto: 0, custo_unitario: 30 },
    ],
  } as unknown as OrdemServico;
}

function adiada<T>() {
  let resolver!: (v: T) => void;
  const promessa = new Promise<T>((r) => (resolver = r));
  return { promessa, resolver };
}

function montar() {
  const tela = render(
    <MemoryRouter>
      <OrdensServicoPage />
    </MemoryRouter>,
  );
  return () =>
    tela.rerender(
      <MemoryRouter>
        <OrdensServicoPage />
      </MemoryRouter>,
    );
}

beforeEach(() => {
  localStorage.clear();
  lojaAtual = { id: "loja-a", nome: "Loja A" };
  listarOrdens.mockReset();
  buscarCustoDasOrdens.mockReset();
});

describe("OrdensServicoPage — carga velha que chega depois da nova (#903)", () => {
  it("a lista da loja antiga não sobrescreve a da loja nova", async () => {
    const cargaA = adiada<OrdemServico[]>();
    listarOrdens.mockImplementation((loja: string) =>
      loja === "loja-a" ? cargaA.promessa : Promise.resolve([ordem("b", "loja-b", "Cliente da loja B")]),
    );
    buscarCustoDasOrdens.mockResolvedValue(new Map());
    const rerender = montar();

    lojaAtual = { id: "loja-b", nome: "Loja B" };
    rerender();

    expect(await screen.findByText("Cliente da loja B")).toBeInTheDocument();

    await act(async () => {
      cargaA.resolver([ordem("a", "loja-a", "Cliente da loja A")]);
      await cargaA.promessa;
    });

    expect(screen.getByText("Cliente da loja B")).toBeInTheDocument();
    expect(screen.queryByText("Cliente da loja A")).not.toBeInTheDocument();
  });

  it("o custo da carga velha não sobrescreve o da nova", async () => {
    // As duas cargas trazem a mesma OS; a velha empaca no custo e, quando
    // chega, diz "custo não informado". A nova já trouxe o custo certo.
    listarOrdens.mockResolvedValue([ordem("x", "loja-a", "Cliente X")]);
    const custoVelho = adiada<Map<string, { custo: number; completo: boolean }>>();
    buscarCustoDasOrdens
      .mockImplementationOnce(() => custoVelho.promessa)
      .mockResolvedValue(new Map([["x", { custo: 30, completo: true }]]));
    const rerender = montar();
    // A carga velha já passou da lista e está esperando o custo.
    await waitFor(() => expect(buscarCustoDasOrdens).toHaveBeenCalledTimes(1));

    lojaAtual = { id: "loja-b", nome: "Loja B" };
    rerender();
    const linha = (await screen.findByText("Cliente X")).closest("tr") as HTMLElement;
    expect(await within(linha).findByText(/70,00/)).toBeInTheDocument();

    await act(async () => {
      custoVelho.resolver(new Map([["x", { custo: 0, completo: false }]]));
      await custoVelho.promessa;
    });

    const linhaDepois = screen.getByText("Cliente X").closest("tr") as HTMLElement;
    expect(within(linhaDepois).queryByText(TEXTO_CUSTO_NAO_INFORMADO)).not.toBeInTheDocument();
    expect(within(linhaDepois).getByText(/70,00/)).toBeInTheDocument();
  });
});
