// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { StatusOrdem } from "./StatusOrdemBadge";
import type { OrdemServico } from "@/types/os";

const ordem = (extra: Partial<OrdemServico>) =>
  ({ id: "o", numero: null, status: "orcamento", itens: [], ...extra }) as unknown as OrdemServico;

describe("StatusOrdem — orçamento (#379)", () => {
  it("orçamento aberto no prazo: só 'Orçamento'", () => {
    renderizar(<StatusOrdem ordem={ordem({ validade: "2099-01-01" })} notas={[]} />);
    expect(screen.getByText("Orçamento")).toBeInTheDocument();
    expect(screen.queryByText("vencido")).not.toBeInTheDocument();
  });

  it("orçamento aberto vencido ganha a etiqueta 'vencido'", () => {
    renderizar(<StatusOrdem ordem={ordem({ validade: "2020-01-01" })} notas={[]} />);
    expect(screen.getByText("Orçamento")).toBeInTheDocument();
    expect(screen.getByText("vencido")).toBeInTheDocument();
  });

  it("orçamento recusado mostra 'Recusado', mesmo com a validade passada, sem 'vencido'", () => {
    renderizar(<StatusOrdem ordem={ordem({ status: "recusado", validade: "2020-01-01" })} notas={[]} />);
    expect(screen.getByText("Recusado")).toBeInTheDocument();
    expect(screen.queryByText("vencido")).not.toBeInTheDocument();
  });
});
