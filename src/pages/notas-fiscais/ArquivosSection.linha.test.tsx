// @vitest-environment jsdom
/**
 * Visual novo, tarefa 12 (#990), pedido da Sofia de 15/11: a nota do cliente
 * fácil de achar. Na linha fica o botão que abre a nota (era "Ver DANFE"), e
 * nada do que existia some: o resto mora no "Mais ações", cada opção de baixar
 * dizendo o que baixa e pra quem.
 */
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";

const listarArquivos = vi.fn();
const baixarArquivo = vi.fn();
vi.mock("@/lib/notasFiscais", () => ({
  baixarArquivo: (...a: unknown[]) => baixarArquivo(...a),
  baixarZipDoMes: vi.fn(),
  enviarArquivo: vi.fn(),
  excluirArquivo: vi.fn(),
  listarArquivos: (...a: unknown[]) => listarArquivos(...a),
  listarOrdensParaNotas: async () => [],
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("./CancelarNotaModal", () => ({
  CancelarNotaModal: ({ arquivo }: { arquivo: NotaFiscalArquivo }) => <p>janela de cancelar {arquivo.id}</p>,
}));
vi.mock("./NotaFiscalVisualModal", () => ({
  NotaFiscalVisualModal: ({ arquivo }: { arquivo: NotaFiscalArquivo }) => <p>janela do resumo {arquivo.id}</p>,
}));
vi.mock("./VerDanfeModal", () => ({
  VerDanfeModal: ({ arquivo }: { arquivo: NotaFiscalArquivo }) => <p>janela do PDF {arquivo.id}</p>,
}));

const operador = { id: "op", admin: true, permissoes: [] };
const lojaAtual = { id: "loja-a", nome: "Loja A" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual }),
}));

const { ArquivosSection } = await import("./ArquivosSection");

function nota(id: string, extra: Partial<NotaFiscalArquivo>): NotaFiscalArquivo {
  return {
    id,
    loja_id: "loja-a",
    tipo: "nfe",
    competencia: "2026-11-01",
    nome_arquivo: `${id}.xml`,
    storage_path: `x/${id}.xml`,
    ordem_servico_id: null,
    operador_id: null,
    criado_em: "2026-11-10T15:00:00.000Z",
    origem: "automatica",
    numero: null,
    chave_acesso: null,
    status: "autorizado",
    focus_nfe_ref: "ref",
    ...extra,
  };
}

const AUTORIZADA = nota("autorizada", { numero: "2202" });
const CANCELADA = nota("cancelada", { status: "cancelado" });
const DE_FORA = nota("de-fora", { origem: "manual", status: null, focus_nfe_ref: null });

beforeEach(() => {
  listarArquivos.mockReset();
  baixarArquivo.mockReset();
  listarArquivos.mockResolvedValue([AUTORIZADA, CANCELADA, DE_FORA]);
  // A lista carrega sozinha ao montar.
  renderizar(<ArquivosSection tipo="nfe" />);
});

function botaoDaLinha(id: string) {
  return screen.getByRole("button", { name: new RegExp(`— ${id}\\.xml$`) });
}

function abrirMaisAcoes(id: string) {
  fireEvent.click(screen.getByRole("button", { name: `Mais ações — a nota ${id}.xml` }));
  return screen.getAllByRole("menuitem").map((item) => item.textContent);
}

describe("ArquivosSection — a linha da nota (visual novo, #990)", () => {
  it("a autorizada mostra 'Nota do cliente', que abre o PDF", async () => {
    expect(await screen.findByText("Nº 2202")).toBeInTheDocument();
    const botao = botaoDaLinha("autorizada");
    expect(botao).toHaveTextContent("Nota do cliente");
    fireEvent.click(botao);
    expect(screen.getByText("janela do PDF autorizada")).toBeInTheDocument();
  });

  it("a cancelada mostra 'Ver a nota' (o PDF), sem 'Cancelar nota' no menu", async () => {
    await screen.findByText("Nº 2202");
    const botao = botaoDaLinha("cancelada");
    expect(botao).toHaveTextContent("Ver a nota");
    fireEvent.click(botao);
    expect(screen.getByText("janela do PDF cancelada")).toBeInTheDocument();
    expect(abrirMaisAcoes("cancelada")).toEqual([
      "Versão para o cliente (resumo do XML)",
      "Baixar o XML (pro contador)",
      "Excluir nota",
    ]);
  });

  it("a feita fora abre o resumo do XML, que é o que existe pra ela", async () => {
    await screen.findByText("Nº 2202");
    fireEvent.click(botaoDaLinha("de-fora"));
    expect(screen.getByText("janela do resumo de-fora")).toBeInTheDocument();
    expect(abrirMaisAcoes("de-fora")).toEqual(["Baixar o XML (pro contador)", "Excluir nota"]);
  });

  it("nada sumiu do menu da autorizada, e o perigoso fica por último", async () => {
    await screen.findByText("Nº 2202");
    expect(abrirMaisAcoes("autorizada")).toEqual([
      "Versão para o cliente (resumo do XML)",
      "Baixar o XML (pro contador)",
      "Cancelar nota",
      "Excluir nota",
    ]);
    fireEvent.mouseDown(screen.getByRole("menuitem", { name: "Baixar o XML (pro contador)" }));
    expect(baixarArquivo).toHaveBeenCalledWith(AUTORIZADA);
  });

  it("o botão do mês diz que é o pacote do contador", async () => {
    await screen.findByText("Nº 2202");
    expect(screen.getByRole("button", { name: /Baixar os XML do mês, pro contador/ })).toBeInTheDocument();
  });
});
