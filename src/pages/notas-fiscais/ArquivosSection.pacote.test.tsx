// @vitest-environment jsdom
/**
 * O botão "Pacote pro contador" (#383) na tela das notas. O pacote em si está
 * testado em lib/notasFiscais.pacote.test.ts; aqui é a costura: o botão de
 * cada mês manda SÓ as notas daquele mês e daquela aba, mostra o progresso
 * enquanto busca os PDFs, e um erro aparece na tela em português.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderizar, screen } from "@/testes/tela";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";

const auth = vi.hoisted(() => ({ lojaAtual: { id: "loja-1", nome: "Loja Um" } }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op-1" }, lojaAtual: auth.lojaAtual }),
}));

const gerarPacoteContabilidade = vi.fn();
vi.mock("@/lib/notasFiscais", () => ({
  baixarArquivo: vi.fn(),
  baixarZipDoMes: vi.fn(),
  enviarArquivo: vi.fn(),
  excluirArquivo: vi.fn(),
  listarArquivos: async (_tipo: string, lojaId: string) =>
    notas.map((n) => ({ ...n, loja_id: lojaId })),
  listarOrdensParaNotas: async () => [],
  gerarPacoteContabilidade: (...a: unknown[]) => gerarPacoteContabilidade(...a),
}));

const { ArquivosSection } = await import("./ArquivosSection");

function nota(id: string, competencia: string): NotaFiscalArquivo {
  return {
    id,
    loja_id: "loja-1",
    tipo: "nfe",
    competencia,
    nome_arquivo: `nfe-${id}.xml`,
    storage_path: `nfe/x/${id}.xml`,
    ordem_servico_id: null,
    operador_id: null,
    criado_em: "2026-10-10T12:00:00Z",
    origem: "automatica",
    numero: id,
    chave_acesso: null,
    status: "autorizado",
    focus_nfe_ref: `ref-${id}`,
  };
}

const notas = [nota("1", "2026-10-01"), nota("2", "2026-10-01"), nota("3", "2026-09-01")];

beforeEach(() => {
  gerarPacoteContabilidade.mockReset();
  auth.lojaAtual = { id: "loja-1", nome: "Loja Um" };
});

describe("ArquivosSection: pacote pro contador", () => {
  it("o botão do mês manda só as notas daquele mês, e mostra o progresso enquanto busca", async () => {
    let terminar: (valor: { semPdf: number; baixado: boolean }) => void = () => {};
    gerarPacoteContabilidade.mockImplementation(
      (opcoes: { aoProgredir: (feitos: number, total: number) => void }) => {
        opcoes.aoProgredir(1, 2);
        return new Promise((resolver) => {
          terminar = resolver;
        });
      },
    );
    const { user } = renderizar(<ArquivosSection tipo="nfe" />);

    const botoes = await screen.findAllByRole("button", { name: "Pacote pro contador (XML e PDF)" });
    // Os meses vêm na ordem da lista: outubro primeiro, setembro depois.
    await user.click(botoes[0]);

    const [opcoes] = gerarPacoteContabilidade.mock.calls[0] as [
      { mes: string; notas: NotaFiscalArquivo[]; loja: { id: string; nome: string } },
    ];
    expect(opcoes.mes).toBe("2026-10");
    // A loja vai junto: o nome entra no .zip e no LEIA-ME.
    expect(opcoes.loja).toEqual({ id: "loja-1", nome: "Loja Um" });
    expect((opcoes as { tipo?: string }).tipo).toBe("nfe");
    expect(opcoes.notas.map((n) => n.id)).toEqual(["1", "2"]);

    const andamento = await screen.findByRole("button", { name: "Buscando PDF 1 de 2…" });
    expect(andamento).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pacote pro contador (XML e PDF)" })).toBeDisabled();

    terminar({ semPdf: 0, baixado: true });
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Pacote pro contador (XML e PDF)" })).toHaveLength(2),
    );
  });

  it("um erro aparece na tela, e o botão volta", async () => {
    gerarPacoteContabilidade.mockRejectedValue(
      new Error("Não deu pra baixar o XML da nota nfe-2.xml: arquivo não encontrado"),
    );
    const { user } = renderizar(<ArquivosSection tipo="nfe" />);

    const botoes = await screen.findAllByRole("button", { name: "Pacote pro contador (XML e PDF)" });
    await user.click(botoes[1]);

    expect(
      await screen.findByText("Não deu pra baixar o XML da nota nfe-2.xml: arquivo não encontrado"),
    ).toBeInTheDocument();
    expect(gerarPacoteContabilidade.mock.calls[0][0]).toMatchObject({ mes: "2026-09" });
    expect(screen.getAllByRole("button", { name: "Pacote pro contador (XML e PDF)" })[1]).toBeEnabled();
  });

  it("trocou de loja antes de o pacote terminar: não baixa, e o andamento e o erro da loja anterior não aparecem", async () => {
    let opcoes!: { aindaValido?: () => boolean; aoProgredir: (f: number, t: number) => void };
    let falhar: (erro: Error) => void = () => {};
    gerarPacoteContabilidade.mockImplementation((a: typeof opcoes) => {
      opcoes = a;
      a.aoProgredir(1, 2);
      return new Promise((_, rejeitar) => {
        falhar = rejeitar;
      });
    });
    const { user, rerender } = renderizar(<ArquivosSection tipo="nfe" />);
    const botoes = await screen.findAllByRole("button", { name: "Pacote pro contador (XML e PDF)" });
    await user.click(botoes[0]);
    await screen.findByRole("button", { name: "Buscando PDF 1 de 2…" });
    // Na loja do clique, o pacote ainda pode baixar.
    expect(opcoes.aindaValido?.()).toBe(true);

    auth.lojaAtual = { id: "loja-2", nome: "Loja Dois" };
    rerender(<ArquivosSection tipo="nfe" />);

    // Na loja nova: o pacote da anterior não baixa mais...
    expect(opcoes.aindaValido?.()).toBe(false);
    // ...o "Buscando PDF" dela some, e os botões voltam...
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Pacote pro contador (XML e PDF)" })).toHaveLength(2),
    );
    expect(screen.queryByRole("button", { name: /Buscando PDF/ })).toBeNull();
    // ...e o andamento atrasado ou o erro dela não aparecem na tela da loja nova.
    opcoes.aoProgredir(2, 2);
    falhar(new Error("Não deu pra baixar o XML da nota nfe-1.xml: arquivo não encontrado"));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("button", { name: /Buscando PDF/ })).toBeNull();
    expect(screen.queryByText(/Não deu pra baixar o XML/)).toBeNull();
  });
});
