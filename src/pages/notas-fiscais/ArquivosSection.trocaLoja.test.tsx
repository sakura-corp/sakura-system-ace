// @vitest-environment jsdom
/**
 * #927: trocar de loja com a carga anterior ainda buscando. Só a carga mais
 * nova mexe na tela; e se a carga da loja nova der erro, a tela mostra só o
 * erro, nunca os arquivos da loja anterior.
 */
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";

const listarArquivos = vi.fn();
vi.mock("@/lib/notasFiscais", () => ({
  baixarArquivo: vi.fn(),
  baixarZipDoMes: vi.fn(),
  enviarArquivo: vi.fn(),
  excluirArquivo: vi.fn(),
  listarArquivos: (...a: unknown[]) => listarArquivos(...a),
  listarOrdensParaNotas: async () => [],
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("./CancelarNotaModal", () => ({ CancelarNotaModal: () => null }));
vi.mock("./NotaFiscalVisualModal", () => ({ NotaFiscalVisualModal: () => null }));
vi.mock("./VerDanfeModal", () => ({ VerDanfeModal: () => null }));

const operador = { id: "op", admin: true, permissoes: [] };
let lojaAtual = { id: "loja-a", nome: "Loja A" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual }),
}));

const { ArquivosSection } = await import("./ArquivosSection");

function arquivo(id: string, nome: string) {
  return {
    id,
    loja_id: "x",
    tipo: "nfe",
    competencia: "2026-10-01",
    nome_arquivo: nome,
    storage_path: `x/${nome}`,
    ordem_servico_id: null,
    operador_id: null,
    criado_em: "2026-10-20T15:00:00.000Z",
    origem: "manual",
    numero: null,
    chave_acesso: null,
    status: null,
    focus_nfe_ref: null,
  } as NotaFiscalArquivo;
}

function adiada<T>() {
  let resolver!: (v: T) => void;
  const promessa = new Promise<T>((r) => {
    resolver = r;
  });
  return { promessa, resolver };
}

beforeEach(() => {
  lojaAtual = { id: "loja-a", nome: "Loja A" };
  listarArquivos.mockReset();
});

describe("ArquivosSection — troca de loja (#927)", () => {
  it("a carga da loja antiga que chega depois não sobrescreve a da nova", async () => {
    const cargaA = adiada<NotaFiscalArquivo[]>();
    listarArquivos.mockImplementation((_tipo: string, loja: string) =>
      loja === "loja-a" ? cargaA.promessa : Promise.resolve([arquivo("b", "nota-da-loja-b.xml")]),
    );
    const { rerender } = renderizar(<ArquivosSection tipo="nfe" />);

    lojaAtual = { id: "loja-b", nome: "Loja B" };
    rerender(<ArquivosSection tipo="nfe" />);
    expect((await screen.findAllByText("nota-da-loja-b.xml")).length).toBeGreaterThan(0);

    await act(async () => {
      cargaA.resolver([arquivo("a", "nota-da-loja-a.xml")]);
      await cargaA.promessa;
    });

    expect(screen.getAllByText("nota-da-loja-b.xml").length).toBeGreaterThan(0);
    expect(screen.queryByText("nota-da-loja-a.xml")).not.toBeInTheDocument();
  });

  it("a carga da loja nova dá erro: mostra o erro e não os arquivos da loja anterior", async () => {
    listarArquivos.mockImplementation((_tipo: string, loja: string) =>
      loja === "loja-a"
        ? Promise.resolve([arquivo("a", "nota-da-loja-a.xml")])
        : Promise.reject(new Error("caiu a conexão")),
    );
    const { rerender } = renderizar(<ArquivosSection tipo="nfe" />);
    expect((await screen.findAllByText("nota-da-loja-a.xml")).length).toBeGreaterThan(0);

    lojaAtual = { id: "loja-b", nome: "Loja B" };
    rerender(<ArquivosSection tipo="nfe" />);

    expect(await screen.findByText(/caiu a conexão/)).toBeInTheDocument();
    expect(screen.queryByText("nota-da-loja-a.xml")).not.toBeInTheDocument();
  });
});
