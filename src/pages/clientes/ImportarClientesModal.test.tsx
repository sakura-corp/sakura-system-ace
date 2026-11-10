// @vitest-environment jsdom
/**
 * Teste de TELA da importação de clientes por planilha (#457).
 *
 * As contas da conferência estão em schemas/importacaoClientes.test.ts e a
 * gravação em lib/importacaoClientes.test.ts. O que só a tela prova é a
 * costura: nada é gravado antes do "Confirmar"; a linha com problema aparece
 * com o motivo; editar a célula refaz a conferência; o relatório sai com os
 * números certos; e o "Desfazer" mostra o que ficou.
 * Dados todos inventados.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, within, waitFor } from "@/testes/tela";
import type { LoteImportacao } from "@/types/cliente";

const carregarCadastroParaConferir = vi.fn();
const importarClientes = vi.fn();
const listarLotesImportacao = vi.fn();
const desfazerImportacao = vi.fn();
vi.mock("@/lib/importacaoClientes", () => ({
  carregarCadastroParaConferir: () => carregarCadastroParaConferir(),
  importarClientes: (...a: unknown[]) => importarClientes(...a),
  listarLotesImportacao: () => listarLotesImportacao(),
  desfazerImportacao: (...a: unknown[]) => desfazerImportacao(...a),
}));

const { ImportarClientesModal } = await import("./ImportarClientesModal");

const CSV = [
  "Nome;CPF;Telefone;Placa;Modelo",
  "Ana Teste;529.982.247-25;(16) 99999-0001;ABC1D23;Gol",
  ";111.444.777-35;;XYZ9K88;Uno",
  "Bia Exemplo;;(16) 99999-0002;OLD1A11;Palio",
].join("\n");

const lote = (extra: Partial<LoteImportacao> = {}): LoteImportacao => ({
  id: "lote-1", tipo: "clientes", nome_arquivo: "antiga.csv", operador_id: "op",
  criado_em: "2026-11-05T15:30:00-03:00", total_linhas: 10, clientes_criados: 8, veiculos_criados: 9,
  desfeito_em: null, desfeito_por: null, ...extra,
});

beforeEach(() => {
  carregarCadastroParaConferir.mockReset();
  importarClientes.mockReset();
  listarLotesImportacao.mockReset();
  desfazerImportacao.mockReset();
  carregarCadastroParaConferir.mockResolvedValue({ clientes: [], placas: ["OLD1A11"] });
  listarLotesImportacao.mockResolvedValue([]);
});

function abrir(aoConcluir = vi.fn()) {
  return { aoConcluir, ...renderizar(<ImportarClientesModal onFechar={vi.fn()} onConcluido={aoConcluir} />) };
}

async function ateORevisar(user: ReturnType<typeof renderizar>["user"]) {
  await user.upload(
    await screen.findByLabelText(/arquivo da planilha/i),
    new File([CSV], "clientes.csv", { type: "text/csv" }),
  );
  await screen.findByText(/lido como UTF-8/i);
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByTestId("resumo-entram");
}

describe("ImportarClientesModal", () => {
  it("lê o arquivo, mostra o jeito que foi lido e sugere as colunas", async () => {
    const { user } = abrir();
    await user.upload(
      await screen.findByLabelText(/arquivo da planilha/i),
      new File([CSV], "clientes.csv", { type: "text/csv" }),
    );
    expect(await screen.findByText(/lido como UTF-8, separado por ;/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Campo da coluna CPF")).toHaveValue("cpf_cnpj");
    expect(screen.getByLabelText("Campo da coluna Placa")).toHaveValue("placa");
    expect(screen.getByText("Ana Teste")).toBeInTheDocument(); // exemplo da coluna
  });

  it("não deixa continuar sem uma coluna de nome", async () => {
    const { user } = abrir();
    await user.upload(
      await screen.findByLabelText(/arquivo da planilha/i),
      new File([CSV], "clientes.csv", { type: "text/csv" }),
    );
    await screen.findByText(/lido como/i);
    await user.selectOptions(screen.getByLabelText("Campo da coluna Nome"), "ignorar");
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  it("revisa sem gravar nada, com o resumo e o motivo de cada problema", async () => {
    const { user } = abrir();
    await ateORevisar(user);
    expect(screen.getByTestId("resumo-entram")).toHaveTextContent("1");
    expect(screen.getByTestId("resumo-ja-existem")).toHaveTextContent("1");
    expect(screen.getByTestId("resumo-problemas")).toHaveTextContent("1");
    expect(screen.getByTestId("resumo-clientes-novos")).toHaveTextContent("1");
    expect(screen.getByTestId("resumo-veiculos-novos")).toHaveTextContent("1");
    const linhaSemNome = screen.getByTestId("linha-3");
    expect(within(linhaSemNome).getByText(/sem nome/i)).toBeInTheDocument();
    expect(within(screen.getByTestId("linha-4")).getByText(/placa já cadastrada/i)).toBeInTheDocument();
    expect(importarClientes).not.toHaveBeenCalled();
  });

  it("filtra por com problema e por já existem", async () => {
    const { user } = abrir();
    await ateORevisar(user);
    await user.selectOptions(screen.getByLabelText("Mostrar"), "problema");
    expect(screen.queryByTestId("linha-2")).not.toBeInTheDocument();
    expect(screen.getByTestId("linha-3")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Mostrar"), "ja_existe");
    expect(screen.getByTestId("linha-4")).toBeInTheDocument();
    expect(screen.queryByTestId("linha-3")).not.toBeInTheDocument();
  });

  it("editar a célula refaz a conferência", async () => {
    const { user } = abrir();
    await ateORevisar(user);
    await user.type(screen.getByLabelText("Nome da linha 3"), "Caio Exemplo");
    expect(screen.getByTestId("resumo-problemas")).toHaveTextContent("0");
    expect(screen.getByTestId("resumo-entram")).toHaveTextContent("2");
    expect(within(screen.getByTestId("linha-3")).queryByText(/sem nome/i)).not.toBeInTheDocument();
  });

  it("mostra só 100 linhas por vez e diz quantas faltam", async () => {
    const muitas = ["Nome;Placa", ...Array.from({ length: 130 }, (_, i) => `Cli ${i};`)].join("\n");
    const { user } = abrir();
    await user.upload(
      await screen.findByLabelText(/arquivo da planilha/i),
      new File([muitas], "muitas.csv", { type: "text/csv" }),
    );
    await screen.findByText(/lido como/i);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByTestId("resumo-entram");
    expect(screen.getAllByTestId(/^linha-/)).toHaveLength(100);
    expect(screen.getByText(/faltam 30 linhas/i)).toBeInTheDocument();
  });

  it("confirmar grava, mostra x de y e o relatório, e copia", async () => {
    let avisar: (f: number, t: number) => void = () => {};
    let terminar: (v: unknown) => void = () => {};
    importarClientes.mockImplementation((_g, _i, aoAvancar) => {
      avisar = aoAvancar;
      return new Promise((ok) => (terminar = ok));
    });
    const escrever = vi.fn().mockResolvedValue(undefined);
    const { user, aoConcluir } = abrir();
    // depois do abrir(): o userEvent.setup() instala o próprio clipboard
    Object.defineProperty(navigator, "clipboard", { value: { writeText: escrever }, configurable: true });
    await ateORevisar(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(importarClientes).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmar importação" }));
    expect(importarClientes).toHaveBeenCalledTimes(1);
    const [grupos, info] = importarClientes.mock.calls[0];
    expect(grupos).toHaveLength(1);
    expect(grupos[0].cliente.nome).toBe("Ana Teste");
    expect(info).toEqual({ nomeArquivo: "clientes.csv", totalLinhas: 3 });
    avisar(1, 2);
    expect(await screen.findByText("1 de 2")).toBeInTheDocument();
    terminar({ loteId: "l", clientesCriados: 1, veiculosCriados: 1 });
    expect(await screen.findByText(/1 cliente\(s\) e 1 veículo\(s\) entraram/i)).toBeInTheDocument();
    expect(screen.getByText(/Linha 3/)).toBeInTheDocument();
    expect(screen.getByText(/sem nome/i)).toBeInTheDocument();
    expect(aoConcluir).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Copiar relatório" }));
    expect(escrever).toHaveBeenCalledTimes(1);
    expect(escrever.mock.calls[0][0]).toMatch(/Linha 3.*sem nome/s);
  });

  it("se a gravação falhar, mostra o erro em português", async () => {
    importarClientes.mockRejectedValue(new Error("A importação parou no meio. dá pra desfazer"));
    const { user } = abrir();
    await ateORevisar(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar importação" }));
    expect(await screen.findByText(/parou no meio/i)).toBeInTheDocument();
  });

  it("lista as importações anteriores e desfaz mostrando o que ficou", async () => {
    listarLotesImportacao.mockResolvedValue([lote(), lote({ id: "lote-0", nome_arquivo: "velha.csv", desfeito_em: "2026-11-06T10:00:00-03:00" })]);
    desfazerImportacao.mockResolvedValue({
      veiculos_apagados: 8, clientes_apagados: 6,
      mantidos: [{ tipo: "cliente", id: "c1", nome: "Ana Teste", motivo: "tem ordem de serviço" }],
    });
    const { user, aoConcluir } = abrir();
    expect(await screen.findByText("antiga.csv")).toBeInTheDocument();
    expect(screen.getByText("velha.csv")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Desfazer" })).toHaveLength(1);
    expect(screen.getAllByText(/05\/11\/2026/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(desfazerImportacao).not.toHaveBeenCalled(); // pede confirmação antes
    await user.click(screen.getByRole("button", { name: "Sim, desfazer" }));
    expect(desfazerImportacao).toHaveBeenCalledWith("lote-1");
    expect(await screen.findByText(/ficaram 1 registro/i)).toBeInTheDocument();
    expect(screen.getByText(/Ana Teste/)).toBeInTheDocument();
    expect(screen.getByText(/tem ordem de serviço/)).toBeInTheDocument();
    await waitFor(() => expect(aoConcluir).toHaveBeenCalled());
  });
});
