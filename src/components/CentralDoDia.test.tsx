// @vitest-environment jsdom
/**
 * A Central do dia na tela (#454): quem não tem o módulo nem pergunta ao
 * banco; lista vazia diz "nada pendente hoje" (e só quando sabe); o botão leva
 * à ação. A regra em si está em `schemas/centralDoDia.test.ts`.
 */
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, userEvent, waitFor } from "@/testes/tela";
import type { Operador } from "@/types/operador";
import type { OrdemServico } from "@/types/os";

const listarNotasComErro = vi.fn();
const listarFechamentosCaixa = vi.fn();
const listarContasReceber = vi.fn();
const listarPecas = vi.fn();
const listarSaldos = vi.fn();
const listarModelosWhatsapp = vi.fn();
vi.mock("@/lib/notasFiscais", () => ({ listarNotasComErro: (...a: unknown[]) => listarNotasComErro(...a) }));
vi.mock("@/lib/fechamentoCaixa", () => ({ listarFechamentosCaixa: (...a: unknown[]) => listarFechamentosCaixa(...a) }));
vi.mock("@/lib/contasReceber", () => ({ listarContasReceber: (...a: unknown[]) => listarContasReceber(...a) }));
vi.mock("@/lib/pecas", () => ({ listarPecas: (...a: unknown[]) => listarPecas(...a) }));
vi.mock("@/lib/estoque", () => ({ listarSaldos: (...a: unknown[]) => listarSaldos(...a) }));
vi.mock("@/lib/modelosWhatsapp", () => ({
  listarModelosWhatsapp: (...a: unknown[]) => listarModelosWhatsapp(...a),
  registrarMensagemAberta: vi.fn(),
  textoDoModelo: () => "texto",
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

let operador: Partial<Operador> = {};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: { id: "loja-a", nome: "Loja Centro" } }),
}));

const { CentralDoDia } = await import("./CentralDoDia");

function LocalAtual() {
  const l = useLocation();
  return <p data-testid="local">{l.pathname + JSON.stringify(l.state)}</p>;
}

function montar(props: { ordens?: OrdemServico[]; dadosIncompletos?: boolean } = {}) {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={
            <CentralDoDia
              ordens={props.ordens ?? []}
              contasPagar={[]}
              movimentos={[]}
              clientes={[]}
              dadosIncompletos={props.dadosIncompletos}
            />
          }
        />
        <Route path="*" element={<LocalAtual />} />
      </Routes>
    </MemoryRouter>,
  );
}

const MODULOS_DA_CENTRAL = [
  "notas_fiscais",
  "caixa",
  "contas_receber",
  "ordens_servico",
  "contas_pagar",
  "estoque",
];

beforeEach(() => {
  // Dia 20: fora da janela do pacote da contabilidade (dia 1 ao 10).
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 20, 12, 0, 0));
  vi.clearAllMocks();
  listarNotasComErro.mockResolvedValue([]);
  listarFechamentosCaixa.mockResolvedValue([]);
  listarContasReceber.mockResolvedValue([]);
  listarPecas.mockResolvedValue([]);
  listarSaldos.mockResolvedValue(new Map());
  listarModelosWhatsapp.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CentralDoDia", () => {
  it("sem nenhum módulo dela, a central nem aparece e nada é pedido ao banco", async () => {
    operador = { id: "op", admin: false, permissoes: ["clientes"] };
    montar();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText("Central do dia")).toBeNull();
    expect(listarNotasComErro).not.toHaveBeenCalled();
    expect(listarContasReceber).not.toHaveBeenCalled();
    expect(listarPecas).not.toHaveBeenCalled();
    expect(listarFechamentosCaixa).not.toHaveBeenCalled();
  });

  it("só com OS: não pede notas, caixa, contas nem estoque, e a lista vazia diz que é parcial", async () => {
    operador = { id: "op", admin: false, permissoes: ["ordens_servico"] };
    montar();
    expect(
      await screen.findByText("Nada pendente hoje nas áreas que você pode ver."),
    ).toBeInTheDocument();
    expect(listarNotasComErro).not.toHaveBeenCalled();
    expect(listarFechamentosCaixa).not.toHaveBeenCalled();
    expect(listarContasReceber).not.toHaveBeenCalled();
    expect(listarPecas).not.toHaveBeenCalled();
    expect(listarSaldos).not.toHaveBeenCalled();
  });

  it("com todos os módulos e nada pendente, diz 'Nada pendente hoje.'", async () => {
    operador = { id: "op", admin: false, permissoes: [...MODULOS_DA_CENTRAL] as Operador["permissoes"] };
    montar();
    expect(await screen.findByText("Nada pendente hoje.")).toBeInTheDocument();
    expect(listarContasReceber).toHaveBeenCalledWith("loja-a");
  });

  it("se o Início não carregou, não diz 'nada pendente': avisa que pode faltar coisa", async () => {
    operador = { id: "op", admin: true, permissoes: [] };
    montar({ dadosIncompletos: true });
    expect(await screen.findByText(/esta lista pode estar faltando coisa/)).toBeInTheDocument();
    expect(screen.queryByText(/Nada pendente hoje/)).toBeNull();
  });

  it("OS parada: o botão abre a própria OS", async () => {
    operador = { id: "op", admin: false, permissoes: ["ordens_servico"] };
    const parada = {
      id: "os-9",
      numero: 9,
      tipo: "os",
      status: "em_andamento",
      data_abertura: new Date(2026, 10, 10, 9, 0, 0).toISOString(),
      data_fechamento: null,
      cliente: { nome: "Ana" },
      veiculo: null,
      itens: [],
    } as unknown as OrdemServico;
    montar({ ordens: [parada] });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Abrir a OS" }));
    await waitFor(() =>
      expect(screen.getByTestId("local")).toHaveTextContent('/ordens-servico{"abrirOrdemId":"os-9"}'),
    );
  });
});
