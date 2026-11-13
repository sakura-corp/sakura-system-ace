// @vitest-environment jsdom
/**
 * #927: trocar de loja com o diagnóstico ainda sendo coletado. Só a coleta
 * mais nova mexe na tela; e se a coleta da loja nova der erro, a tela mostra
 * só o erro, nunca o diagnóstico (com a "Loja ativa") da loja anterior.
 */
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { Diagnostico } from "@/schemas/diagnostico";

const coletarDiagnostico = vi.fn();
vi.mock("@/lib/diagnostico", () => ({
  coletarDiagnostico: (...a: unknown[]) => coletarDiagnostico(...a),
  baixarDiagnostico: vi.fn(),
}));

const operador = { id: "op", usuario: "dono", nome: "Dono", admin: true, permissoes: [] };
let lojaAtual: { id: string; nome: string } | null = { id: "loja-a", nome: "Loja A" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual }),
}));

const { DiagnosticoPage } = await import("./DiagnosticoPage");

function diagnosticoDa(loja: string): Diagnostico {
  return {
    geradoEm: new Date(2026, 10, 12, 10, 0, 0),
    fusoDoComputador: "America/Sao_Paulo",
    app: {
      versao: "0.9.57",
      electron: "x",
      chromium: "x",
      node: "x",
      sistema: "x",
      arquitetura: "x",
      pastaDados: "x",
      canalAtualizacao: "normal",
    },
    enderecoDoBanco: "https://exemplo.supabase.co",
    esquema: { estado: "em_dia", versaoBanco: 1, versaoApp: 1, faltando: [] },
    sessao: { usuario: "dono", nome: "Dono", admin: true, loja },
    checagens: [],
    logs: { erros: "", atualizacoes: "" },
  };
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
  coletarDiagnostico.mockReset();
});

describe("DiagnosticoPage — troca de loja (#927)", () => {
  it("a coleta da loja antiga que chega depois não sobrescreve a da nova", async () => {
    const coletaA = adiada<Diagnostico>();
    coletarDiagnostico.mockImplementation((_op: unknown, loja: { nome: string } | null) =>
      loja?.nome === "Loja A" ? coletaA.promessa : Promise.resolve(diagnosticoDa("Loja B")),
    );
    const { rerender } = renderizar(<DiagnosticoPage />);

    lojaAtual = { id: "loja-b", nome: "Loja B" };
    rerender(<DiagnosticoPage />);
    expect(await screen.findByText("Loja B")).toBeInTheDocument();

    await act(async () => {
      coletaA.resolver(diagnosticoDa("Loja A"));
      await coletaA.promessa;
    });

    expect(screen.getByText("Loja B")).toBeInTheDocument();
    expect(screen.queryByText("Loja A")).not.toBeInTheDocument();
  });

  it("a coleta da loja nova dá erro: mostra o erro e não o diagnóstico da loja anterior", async () => {
    coletarDiagnostico.mockImplementation((_op: unknown, loja: { nome: string } | null) =>
      loja?.nome === "Loja A"
        ? Promise.resolve(diagnosticoDa("Loja A"))
        : Promise.reject(new Error("caiu a conexão")),
    );
    const { rerender } = renderizar(<DiagnosticoPage />);
    expect(await screen.findByText("Loja A")).toBeInTheDocument();

    lojaAtual = { id: "loja-b", nome: "Loja B" };
    rerender(<DiagnosticoPage />);

    expect(await screen.findByText(/caiu a conexão/)).toBeInTheDocument();
    expect(screen.queryByText("Loja A")).not.toBeInTheDocument();
  });

  it("sem loja ativa o diagnóstico roda do mesmo jeito (é a tela de socorro)", async () => {
    lojaAtual = null;
    coletarDiagnostico.mockResolvedValue(diagnosticoDa("(nenhuma loja ativa)"));
    renderizar(<DiagnosticoPage />);

    expect(await screen.findByText("(nenhuma loja ativa)")).toBeInTheDocument();
  });
});
