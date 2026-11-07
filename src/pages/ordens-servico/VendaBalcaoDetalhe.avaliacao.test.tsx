// @vitest-environment jsdom
/**
 * Tarefa #459: o botão "Avaliação" na venda de balcão faturada. Só aparece
 * quando a loja tem o link (a página manda `pedirAvaliacao`) e a venda está faturada.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";
import type { OrdemServico } from "@/types/os";

const abrirConversaWhatsapp = vi.fn();
vi.mock("@/lib/whatsapp", () => ({
  abrirConversaWhatsapp: (...a: unknown[]) => abrirConversaWhatsapp(...a),
}));
vi.mock("./FechamentoTab", () => ({ FechamentoTab: () => null }));

const { VendaBalcaoDetalhe } = await import("./VendaBalcaoDetalhe");
const { montarTextoAvaliacao } = await import("@/schemas/whatsapp");

function venda(status: string): OrdemServico {
  return {
    id: "v1",
    numero: 7,
    tipo: "venda_balcao",
    status,
    data_abertura: "2026-11-01T10:00:00Z",
    cliente: { nome: "Maria" },
    itens: [],
  } as unknown as OrdemServico;
}

const LINK = "https://g.page/r/abc/review";

function montar(status: string, comLink: boolean) {
  const aoAbrir = vi.fn();
  const r = renderizar(
    <VendaBalcaoDetalhe
      ordem={venda(status)}
      notas={[]}
      onFaturar={() => {}}
      onVoltar={() => {}}
      pedirAvaliacao={
        comLink
          ? {
              telefone: "(16) 99123-4567",
              texto: montarTextoAvaliacao({ cliente: "Maria", loja: "Loja Centro", link: LINK }),
              aoAbrir,
            }
          : undefined
      }
    />,
  );
  return { ...r, aoAbrir };
}

describe("VendaBalcaoDetalhe — pedir avaliação", () => {
  it("com o link e a venda faturada, mostra o botão e abre o WhatsApp com o link", async () => {
    abrirConversaWhatsapp.mockReset();
    abrirConversaWhatsapp.mockResolvedValue(undefined);
    const { user, aoAbrir } = montar("faturada", true);
    await user.click(screen.getByRole("button", { name: /avaliação/i }));
    await waitFor(() => expect(abrirConversaWhatsapp).toHaveBeenCalledTimes(1));
    const [telefone, texto] = abrirConversaWhatsapp.mock.calls[0];
    expect(telefone).toBe("(16) 99123-4567");
    expect(texto).toContain(LINK);
    expect(texto).toContain("Maria");
    expect(aoAbrir).toHaveBeenCalled();
  });

  it("sem o link, não mostra o botão", () => {
    montar("faturada", false);
    expect(screen.queryByRole("button", { name: /avaliação/i })).toBeNull();
  });

  it("venda ainda não faturada, não mostra o botão mesmo com o link", () => {
    montar("concluida", true);
    expect(screen.queryByRole("button", { name: /avaliação/i })).toBeNull();
  });
});
