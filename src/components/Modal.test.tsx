// @vitest-environment jsdom
//
// O Modal e as duas janelas de importação que passaram a usar ele (#510):
// Esc fecha, Tab não escapa pra tela de trás, role="dialog" e a largura.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImportarNotasFiscaisModal } from "@/pages/estoque/ImportarNotasFiscaisModal";
import { ImportarNotaFiscalXmlModal } from "@/pages/fornecedores/ImportarNotaFiscalXmlModal";
import { Modal } from "./Modal";

// As janelas buscam o regime da loja ao abrir e importam funções que falam
// com o Supabase: aqui nada disso roda de verdade.
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoFiscal: vi.fn(() => new Promise(() => {})),
}));
vi.mock("@/lib/fornecedores", () => ({ criarFornecedor: vi.fn() }));
vi.mock("@/lib/pecas", () => ({
  cadastrarPecaRapida: vi.fn(),
  buscarDadosFiscaisDasPecas: async () => [],
}));
vi.mock("@/lib/pedidosCompra", () => ({ importarNotaFiscalCompra: vi.fn() }));
vi.mock("@/lib/estoque", () => ({ registrarMovimento: vi.fn() }));
vi.mock("@/lib/iaNotaFiscal", () => ({ lerNotasFiscais: vi.fn() }));

// O jsdom não calcula layout: sem isto, o Modal acharia que nenhum botão
// aparece na tela e não teria o que focar.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    {} as DOMRect,
  ] as unknown as DOMRectList);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function abrir(montar: (onFechar: () => void) => ReactElement) {
  const onFechar = vi.fn();
  render(
    <div>
      <button type="button">Botão da tela de trás</button>
      {montar(onFechar)}
    </div>,
  );
  return onFechar;
}

const janelas: { nome: string; largura: string; montar: (onFechar: () => void) => ReactElement }[] = [
  {
    nome: "XML do fornecedor",
    largura: "max-w-4xl",
    montar: (onFechar) => (
      <ImportarNotaFiscalXmlModal
        fornecedores={[]}
        pecas={[]}
        depositos={[]}
        lojaId="loja-1"
        operadorId={null}
        onFechar={onFechar}
        onImportado={async () => {}}
      />
    ),
  },
  {
    nome: "notas no estoque",
    largura: "max-w-5xl",
    montar: (onFechar) => (
      <ImportarNotasFiscaisModal
        categorias={[]}
        pecas={[]}
        lojaId="loja-1"
        onFechar={onFechar}
        onImportado={async () => {}}
      />
    ),
  },
];

describe.each(janelas)("janela de importação: $nome", ({ largura, montar }) => {
  it('é um role="dialog" com nome', () => {
    abrir(montar);
    const dialogo = screen.getByRole("dialog");
    expect(dialogo.getAttribute("aria-modal")).toBe("true");
    expect(dialogo.getAttribute("aria-labelledby")).toBeTruthy();
  });

  it("Esc fecha", () => {
    const onFechar = abrir(montar);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it("Tab no último botão volta pro primeiro, sem escapar pra tela de trás", () => {
    abrir(montar);
    const dialogo = screen.getByRole("dialog");
    const botoes = Array.from(dialogo.querySelectorAll<HTMLElement>("button:not([disabled]), input"));
    const ultimo = botoes[botoes.length - 1];
    ultimo.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(dialogo.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(ultimo);
    expect(screen.getByText("Botão da tela de trás").closest("[inert]")).not.toBeNull();
  });

  it(`continua larga (${largura})`, () => {
    abrir(montar);
    expect(screen.getByRole("dialog").className).toContain(largura);
  });
});

describe("Modal: Esc de um campo de dentro", () => {
  // O Combobox usa o Esc pra fechar a própria lista (e chama preventDefault).
  // Esse Esc não pode fechar a janela inteira junto: na importação, isso
  // jogaria fora a revisão dos itens.
  it("Esc já tratado por um campo de dentro não fecha o modal", () => {
    const onFechar = abrir((fechar) => (
      <Modal titulo="Teste" onFechar={fechar}>
        <input
          aria-label="campo"
          onKeyDown={(e) => {
            if (e.key === "Escape") e.preventDefault();
          }}
        />
      </Modal>
    ));
    fireEvent.keyDown(screen.getByLabelText("campo"), { key: "Escape" });
    expect(onFechar).not.toHaveBeenCalled();
  });

  it("Esc num campo comum fecha", () => {
    const onFechar = abrir((fechar) => (
      <Modal titulo="Teste" onFechar={fechar}>
        <input aria-label="campo" />
      </Modal>
    ));
    fireEvent.keyDown(screen.getByLabelText("campo"), { key: "Escape" });
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});

describe("Modal: largura", () => {
  it("sem dizer a largura, continua max-w-lg", () => {
    abrir((onFechar) => (
      <Modal titulo="Teste" onFechar={onFechar}>
        <p>conteúdo</p>
      </Modal>
    ));
    const classes = screen.getByRole("dialog").className;
    expect(classes).toContain("max-w-lg");
    expect(classes).not.toMatch(/max-w-[45]xl/);
  });

  it("com largura 5xl, troca o max-w-lg pelo max-w-5xl", () => {
    abrir((onFechar) => (
      <Modal titulo="Teste" onFechar={onFechar} largura="5xl">
        <p>conteúdo</p>
      </Modal>
    ));
    const classes = screen.getByRole("dialog").className;
    expect(classes).toContain("max-w-5xl");
    expect(classes).not.toContain("max-w-lg");
  });

  it("a descrição aparece e descreve o diálogo", () => {
    abrir((onFechar) => (
      <Modal titulo="Teste" descricao="Explica a janela" onFechar={onFechar}>
        <p>conteúdo</p>
      </Modal>
    ));
    const descricao = screen.getByText("Explica a janela");
    expect(screen.getByRole("dialog").getAttribute("aria-describedby")).toBe(descricao.id);
  });
});

// O visual novo (#990, tarefa 2): o total no cabeçalho e as ações no rodapé.
describe("Modal: cabeçalho com total e rodapé com as ações", () => {
  it("o total aparece no cabeçalho, com o rótulo dele", () => {
    abrir((onFechar) => (
      <Modal titulo="Faturar a OS 148" total={{ rotulo: "Total da OS", valor: "R$ 1.240,00" }} onFechar={onFechar}>
        <p>conteúdo</p>
      </Modal>
    ));
    const cabecalho = screen.getByRole("heading", { name: "Faturar a OS 148" }).closest("[data-modal-topo]");
    expect(cabecalho).not.toBeNull();
    expect(cabecalho?.textContent).toContain("Total da OS");
    expect(cabecalho?.textContent).toContain("R$ 1.240,00");
  });

  it("as ações do rodapé ficam FORA da parte que rola: o botão de confirmar nunca some da vista", () => {
    abrir((onFechar) => (
      <Modal
        titulo="Faturar a OS 148"
        onFechar={onFechar}
        rodape={
          <>
            <button type="button">Cancelar</button>
            <button type="button">Confirmar</button>
          </>
        }
      >
        <p>conteúdo comprido</p>
      </Modal>
    ));
    const dialogo = screen.getByRole("dialog");
    const corpo = dialogo.querySelector("[data-modal-corpo]");
    const rodape = dialogo.querySelector("[data-modal-rodape]");
    expect(corpo?.textContent).toContain("conteúdo comprido");
    expect(rodape?.textContent).toBe("CancelarConfirmar");
    expect(corpo?.contains(rodape as Node)).toBe(false);
    // Quem rola é o corpo, não a janela inteira (senão o rodapé rolaria junto).
    expect(corpo?.className).toContain("overflow-y-auto");
    expect(dialogo.className).not.toContain("overflow-y-auto");
  });

  it("a nota do rodapé (a conta final) fica à esquerda das ações", () => {
    abrir((onFechar) => (
      <Modal
        titulo="Faturar"
        onFechar={onFechar}
        notaDoRodape="Recebido agora: R$ 620,00"
        rodape={<button type="button">Confirmar</button>}
      >
        <p>conteúdo</p>
      </Modal>
    ));
    const rodape = screen.getByRole("dialog").querySelector("[data-modal-rodape]");
    expect(rodape?.textContent).toBe("Recebido agora: R$ 620,00Confirmar");
  });

  it("com rodapé, o foco ainda começa no ✕: Enter no automático fecha, nunca confirma", () => {
    abrir((onFechar) => (
      <Modal titulo="Cancelar nota" onFechar={onFechar} rodape={<button type="button">Confirmar cancelamento</button>}>
        <p>Não dá pra desfazer.</p>
      </Modal>
    ));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Fechar" }));
  });

  it("o Tab passa pelas ações do rodapé e dá a volta, sem escapar", () => {
    abrir((onFechar) => (
      <Modal titulo="Teste" onFechar={onFechar} rodape={<button type="button">Confirmar</button>}>
        <input aria-label="campo" />
      </Modal>
    ));
    const confirmar = screen.getByRole("button", { name: "Confirmar" });
    confirmar.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Fechar" }));
  });

  it("sem rodapé, não sobra uma faixa vazia embaixo", () => {
    abrir((onFechar) => (
      <Modal titulo="Teste" onFechar={onFechar}>
        <p>conteúdo</p>
      </Modal>
    ));
    expect(screen.getByRole("dialog").querySelector("[data-modal-rodape]")).toBeNull();
  });
});
