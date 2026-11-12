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
const listarNotasDoMesParaPacote = vi.fn();
const gerarPacoteContabilidade = vi.fn();
const buscarContatoContabilidade = vi.fn();
const registrarMensagemAberta = vi.fn();
const abrirConversaWhatsapp = vi.fn();
vi.mock("@/lib/notasFiscais", () => ({
  listarNotasComErro: (...a: unknown[]) => listarNotasComErro(...a),
  listarNotasDoMesParaPacote: (...a: unknown[]) => listarNotasDoMesParaPacote(...a),
  gerarPacoteContabilidade: (...a: unknown[]) => gerarPacoteContabilidade(...a),
}));
vi.mock("@/lib/contabilidade", () => ({
  buscarContatoContabilidade: (...a: unknown[]) => buscarContatoContabilidade(...a),
}));
vi.mock("@/lib/whatsapp", () => ({
  abrirConversaWhatsapp: (...a: unknown[]) => abrirConversaWhatsapp(...a),
}));
vi.mock("@/lib/fechamentoCaixa", () => ({ listarFechamentosCaixa: (...a: unknown[]) => listarFechamentosCaixa(...a) }));
vi.mock("@/lib/contasReceber", () => ({ listarContasReceber: (...a: unknown[]) => listarContasReceber(...a) }));
vi.mock("@/lib/pecas", () => ({ listarPecas: (...a: unknown[]) => listarPecas(...a) }));
vi.mock("@/lib/estoque", () => ({ listarSaldos: (...a: unknown[]) => listarSaldos(...a) }));
vi.mock("@/lib/modelosWhatsapp", () => ({
  listarModelosWhatsapp: (...a: unknown[]) => listarModelosWhatsapp(...a),
  registrarMensagemAberta: (...a: unknown[]) => registrarMensagemAberta(...a),
  textoDoModelo: (m: Record<string, string>, c: never) => m[c] ?? modeloPorChave(c).padrao,
}));
import { modeloPorChave } from "@/schemas/whatsapp";
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

let operador: Partial<Operador> = {};
let lojaAtual = { id: "loja-a", nome: "Loja Centro" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual }),
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

function montarComRerender() {
  // Árvore nova a cada chamada: o React ignora um elemento idêntico ao anterior.
  const arvore = () => (
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={<CentralDoDia ordens={[]} contasPagar={[]} movimentos={[]} clientes={[]} />}
        />
        <Route path="*" element={<LocalAtual />} />
      </Routes>
    </MemoryRouter>
  );
  const r = render(arvore());
  return { rerender: () => r.rerender(arvore()) };
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
  lojaAtual = { id: "loja-a", nome: "Loja Centro" };
  listarNotasComErro.mockResolvedValue([]);
  listarFechamentosCaixa.mockResolvedValue([]);
  listarContasReceber.mockResolvedValue([]);
  listarPecas.mockResolvedValue([]);
  listarSaldos.mockResolvedValue(new Map());
  listarModelosWhatsapp.mockResolvedValue({});
  buscarContatoContabilidade.mockResolvedValue(null);
  listarNotasDoMesParaPacote.mockResolvedValue([]);
  gerarPacoteContabilidade.mockResolvedValue({ semPdf: 0, baixado: true });
  abrirConversaWhatsapp.mockResolvedValue(undefined);
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

  describe("estoque baixo", () => {
    const PECA_BAIXA = { id: "p1", descricao: "Pneu 175/70", estoque_minimo: 5, ativo: true, unidade: "UN" };
    beforeEach(() => {
      listarPecas.mockResolvedValue([PECA_BAIXA]);
      listarSaldos.mockResolvedValue(new Map([["p1", 1]]));
    });

    it("com Fornecedores: o botão abre a aba Sugestão de compra", async () => {
      operador = { id: "op", admin: false, permissoes: ["estoque", "fornecedores"] };
      montar();
      const user = userEvent.setup();
      await user.click(await screen.findByRole("button", { name: "Sugestão de compra" }));
      await waitFor(() =>
        expect(screen.getByTestId("local")).toHaveTextContent('/fornecedores{"aba":"sugestao"}'),
      );
    });

    it("sem Fornecedores: continua levando ao estoque", async () => {
      operador = { id: "op", admin: false, permissoes: ["estoque"] };
      montar();
      const user = userEvent.setup();
      await user.click(await screen.findByRole("button", { name: "Ver no estoque" }));
      await waitFor(() => expect(screen.getByTestId("local")).toHaveTextContent("/estoque"));
      expect(screen.queryByRole("button", { name: "Sugestão de compra" })).toBeNull();
    });
  });
});

describe("CentralDoDia: pacote da contabilidade (#383)", () => {
  const linhaDasNotas = () => screen.findByText("Pacote da contabilidade: as notas de outubro");

  beforeEach(() => {
    // Dia 5 de novembro: o pacote de outubro está na janela (dia 1 ao 7).
    vi.setSystemTime(new Date(2026, 10, 5, 12, 0, 0));
    operador = { id: "op-1", admin: true, permissoes: [] };
  });

  it("com contato com WhatsApp: tem Gerar o pacote e Abrir conversa", async () => {
    buscarContatoContabilidade.mockResolvedValue({ nome: "Marta", whatsapp: "11900000000", email: null });
    montar();
    await linhaDasNotas();
    expect(await screen.findByRole("button", { name: "Abrir conversa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerar o pacote" })).toBeInTheDocument();
    expect(screen.queryByText("cadastrar o WhatsApp do contador")).toBeNull();
    expect(buscarContatoContabilidade).toHaveBeenCalledTimes(1);
    expect(buscarContatoContabilidade).toHaveBeenCalledWith("loja-a");
  });

  it("a linha do extrato continua sem botão", async () => {
    buscarContatoContabilidade.mockResolvedValue({ nome: "Marta", whatsapp: "11900000000", email: null });
    montar();
    await linhaDasNotas();
    await screen.findByRole("button", { name: "Abrir conversa" });
    const linha = screen.getByText("Pacote da contabilidade: o extrato de outubro").closest("li")!;
    expect(linha.querySelectorAll("button")).toHaveLength(0);
  });

  it("sem contato: o link leva a Configurações e não há Abrir conversa", async () => {
    montar();
    await linhaDasNotas();
    const user = userEvent.setup();
    expect(screen.queryByRole("button", { name: "Abrir conversa" })).toBeNull();
    await user.click(await screen.findByRole("button", { name: "cadastrar o WhatsApp do contador" }));
    await waitFor(() => expect(screen.getByTestId("local")).toHaveTextContent("/configuracoes"));
  });

  it("quem não é admin não vê o link (Configurações só abre pra admin)", async () => {
    operador = { id: "op-2", admin: false, permissoes: ["notas_fiscais"] };
    montar();
    await linhaDasNotas();
    await screen.findByRole("button", { name: "Gerar o pacote" });
    await waitFor(() => expect(buscarContatoContabilidade).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("button", { name: /cadastrar o/ })).toBeNull();
  });

  it("troca de loja no meio do pacote: a loja nova não herda o andamento nem o aviso", async () => {
    let progresso: ((f: number, t: number) => void) | undefined;
    let terminar!: (v: { semPdf: number; baixado: boolean }) => void;
    gerarPacoteContabilidade.mockImplementation(
      (a: { aoProgredir: (f: number, t: number) => void }) => {
        progresso = a.aoProgredir;
        return new Promise((r) => (terminar = r));
      },
    );
    const { rerender } = montarComRerender();
    await linhaDasNotas();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Gerar o pacote" }));
    await waitFor(() => expect(gerarPacoteContabilidade).toHaveBeenCalled());
    progresso!(1, 3);
    await screen.findByRole("button", { name: "Buscando PDF 1 de 3…" });

    lojaAtual = { id: "loja-b", nome: "Loja Sul" };
    rerender();
    await linhaDasNotas();
    expect(await screen.findByRole("button", { name: "Gerar o pacote" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Buscando PDF/ })).toBeNull();

    terminar({ semPdf: 0, baixado: true });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText("Pacote baixado.")).toBeNull();
    expect(screen.getByRole("button", { name: "Gerar o pacote" })).toBeEnabled();
  });

  it("troca de loja no meio do pacote: o pacote é da loja do clique e não baixa depois da troca", async () => {
    let opcoes!: { loja: { id: string; nome: string }; aindaValido?: () => boolean };
    let terminar!: (v: { semPdf: number; baixado: boolean }) => void;
    gerarPacoteContabilidade.mockImplementation((a: typeof opcoes) => {
      opcoes = a;
      return new Promise((r) => (terminar = r));
    });
    const { rerender } = montarComRerender();
    await linhaDasNotas();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Gerar o pacote" }));
    await waitFor(() => expect(gerarPacoteContabilidade).toHaveBeenCalled());

    // O nome e o id vão juntos: o nome entra no .zip e no LEIA-ME.
    expect(opcoes.loja).toEqual({ id: "loja-a", nome: "Loja Centro" });
    // Ainda na loja A: pode baixar.
    expect(opcoes.aindaValido?.()).toBe(true);

    lojaAtual = { id: "loja-b", nome: "Loja Sul" };
    rerender();
    await linhaDasNotas();
    // Na loja B: o pacote da A, que ainda está buscando PDF, não baixa mais.
    expect(opcoes.aindaValido?.()).toBe(false);

    terminar({ semPdf: 0, baixado: false });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText("Pacote baixado.")).toBeNull();
  });

  it("contato só com e-mail: também mostra o link, sem Abrir conversa", async () => {
    buscarContatoContabilidade.mockResolvedValue({ nome: "Marta", whatsapp: null, email: "m@exemplo.com" });
    montar();
    await linhaDasNotas();
    expect(await screen.findByRole("button", { name: "cadastrar o WhatsApp do contador" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abrir conversa" })).toBeNull();
  });

  it("Gerar o pacote usa o mês anterior (2026-10) e mostra o progresso", async () => {
    const notas = [{ id: "n1" }];
    listarNotasDoMesParaPacote.mockResolvedValue(notas);
    let progresso: ((f: number, t: number) => void) | undefined;
    let terminar!: (v: { semPdf: number; baixado: boolean }) => void;
    gerarPacoteContabilidade.mockImplementation(
      (a: { aoProgredir: (f: number, t: number) => void }) => {
        progresso = a.aoProgredir;
        return new Promise((r) => (terminar = r));
      },
    );
    montar();
    await linhaDasNotas();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Gerar o pacote" }));
    await waitFor(() => expect(listarNotasDoMesParaPacote).toHaveBeenCalledWith("loja-a", "2026-10"));
    await waitFor(() =>
      expect(gerarPacoteContabilidade).toHaveBeenCalledWith(
        expect.objectContaining({ notas, mes: "2026-10" }),
      ),
    );
    progresso!(1, 3);
    expect(await screen.findByRole("button", { name: "Buscando PDF 1 de 3…" })).toBeDisabled();
    terminar({ semPdf: 0, baixado: true });
    expect(await screen.findByText("Pacote baixado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerar o pacote" })).toBeEnabled();
  });

  it("mostra em português o erro de quando não há nota no mês", async () => {
    gerarPacoteContabilidade.mockRejectedValue(new Error("Não há nota fiscal em outubro de 2026."));
    montar();
    await linhaDasNotas();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Gerar o pacote" }));
    expect(await screen.findByText("Não há nota fiscal em outubro de 2026.")).toBeInTheDocument();
  });

  it("Abrir conversa: abre o WhatsApp com o modelo preenchido e registra a abertura", async () => {
    buscarContatoContabilidade.mockResolvedValue({ nome: "Marta", whatsapp: "11900000000", email: null });
    montar();
    await linhaDasNotas();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Abrir conversa" }));
    await waitFor(() => expect(abrirConversaWhatsapp).toHaveBeenCalledTimes(1));
    expect(abrirConversaWhatsapp).toHaveBeenCalledWith(
      "11900000000",
      "Oi, Marta! Aqui é da Loja Centro. Segue o pacote das notas de outubro de 2026 (XML e PDF). " +
        "O extrato do banco eu mando até o dia 10. Qualquer coisa, é só chamar.",
    );
    await waitFor(() =>
      expect(registrarMensagemAberta).toHaveBeenCalledWith(
        "loja-a",
        "contabilidade",
        "2026-10",
        "11900000000",
        "op-1",
      ),
    );
  });

  it("usa o texto que a loja editou no modelo contabilidade (mesmo só com Notas fiscais)", async () => {
    operador = { id: "op-1", admin: false, permissoes: ["notas_fiscais"] };
    listarModelosWhatsapp.mockResolvedValue({ contabilidade: "Bom dia {contador}, notas de {mes}." });
    buscarContatoContabilidade.mockResolvedValue({ nome: "Marta", whatsapp: "11900000000", email: null });
    montar();
    await linhaDasNotas();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Abrir conversa" }));
    await waitFor(() =>
      expect(abrirConversaWhatsapp).toHaveBeenCalledWith("11900000000", "Bom dia Marta, notas de outubro de 2026."),
    );
  });

  it("fora da janela (dia 20) não busca o contato", async () => {
    vi.setSystemTime(new Date(2026, 10, 20, 12, 0, 0));
    montar();
    await screen.findByText("Nada pendente hoje.");
    expect(buscarContatoContabilidade).not.toHaveBeenCalled();
  });
});
