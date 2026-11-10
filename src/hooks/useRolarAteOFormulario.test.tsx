// @vitest-environment jsdom
/**
 * O gancho de rolar até o formulário (#969). As telas têm o teste delas
 * (abrir pela canetinha e pelo "+ Novo"); aqui fica o que elas não cobrem:
 * trocar o item com o formulário já aberto (o "Abrir a que já existe" do
 * Estoque) rola de novo, e fechado não rola nem rouba o foco.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { useRolarAteOFormulario } from "./useRolarAteOFormulario";

function Formulario({ chave }: { chave: string | null }) {
  const caixa = useRolarAteOFormulario(chave);
  return (
    <>
      <input aria-label="busca" />
      {chave && (
        <div ref={caixa}>
          <label>
            <input type="radio" name="tipo" /> Pessoa física
          </label>
          <input aria-label="nome" />
        </div>
      )}
    </>
  );
}

let rolar: ReturnType<typeof vi.fn<(opcoes?: boolean | ScrollIntoViewOptions) => void>>;
beforeEach(() => {
  rolar = vi.fn<(opcoes?: boolean | ScrollIntoViewOptions) => void>();
  Element.prototype.scrollIntoView = rolar;
});

describe("useRolarAteOFormulario", () => {
  it("fechado, não rola nem mexe no foco", () => {
    renderizar(<Formulario chave={null} />);
    expect(rolar).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body);
  });

  it("ao abrir, rola até o topo do formulário e foca o primeiro campo de digitar (pula o botão de opção)", () => {
    renderizar(<Formulario chave="p-1" />);
    expect(rolar).toHaveBeenCalledTimes(1);
    expect(rolar).toHaveBeenCalledWith({ block: "start" });
    expect(document.activeElement).toBe(screen.getByLabelText("nome"));
  });

  it("trocar o item com o formulário aberto rola de novo", () => {
    const { rerender } = renderizar(<Formulario chave="p-1" />);
    screen.getByLabelText("busca").focus();
    rerender(<Formulario chave="p-2" />);
    expect(rolar).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(screen.getByLabelText("nome"));
  });

  it("re-renderizar com o mesmo item não rola de novo (não rouba o cursor de quem digita)", () => {
    const { rerender } = renderizar(<Formulario chave="p-1" />);
    screen.getByLabelText("busca").focus();
    rerender(<Formulario chave="p-1" />);
    expect(rolar).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByLabelText("busca"));
  });
});
