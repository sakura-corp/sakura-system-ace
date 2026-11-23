// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { SeloDaOrdem } from "./SeloDaOrdem";
import type { OrdemServico } from "@/types/os";

// Os casos do orçamento que moravam no teste do `StatusOrdemBadge` (apagado
// na #1091, sem uso desde o #1038), agora no selo do visual novo, com as
// cores da folha da tela: vencido em amarelo, recusado em vermelho.
const ordem = (extra: Partial<OrdemServico>) =>
  ({ id: "o", numero: null, status: "orcamento", itens: [], ...extra }) as unknown as OrdemServico;

/** A classe de cor do selo que tem esta palavra. */
function corDo(palavra: string): string {
  return screen.getByText(palavra).closest("span[class*='bg-']")?.className ?? "";
}

describe("SeloDaOrdem — orçamento (#379, #1091)", () => {
  it("orçamento aberto no prazo: só 'Orçamento', em cinza", () => {
    renderizar(<SeloDaOrdem ordem={ordem({ validade: "2099-01-01" })} notas={[]} />);
    expect(corDo("Orçamento")).toContain("text-texto-2");
    expect(screen.queryByText("Vencido")).not.toBeInTheDocument();
  });

  it("orçamento aberto vencido ganha o 'Vencido' em amarelo (atenção)", () => {
    renderizar(<SeloDaOrdem ordem={ordem({ validade: "2020-01-01" })} notas={[]} />);
    expect(screen.getByText("Orçamento")).toBeInTheDocument();
    expect(corDo("Vencido")).toContain("text-atencao");
  });

  it("recusado: 'Recusado' em vermelho, mesmo com a validade passada, sem 'Vencido'", () => {
    renderizar(<SeloDaOrdem ordem={ordem({ status: "recusado", validade: "2020-01-01" })} notas={[]} />);
    expect(corDo("Recusado")).toContain("text-perigo");
    expect(screen.queryByText("Vencido")).not.toBeInTheDocument();
  });
});
