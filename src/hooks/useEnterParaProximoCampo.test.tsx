// @vitest-environment jsdom
/**
 * O Enter do balcão (`useEnterParaProximoCampo`): no último campo, leva o foco
 * pro botão de enviar. Desde a tarefa 7 do visual novo (#990), o "Confirmar
 * faturamento" mora no rodapé da janela, FORA do <form>, ligado a ele pelo
 * atributo `form`: o Enter tem de achar o botão assim também.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { useEnterParaProximoCampo } from "./useEnterParaProximoCampo";

function Tela() {
  useEnterParaProximoCampo();
  return (
    <div>
      <form id="faturar" onSubmit={(e) => e.preventDefault()}>
        <input aria-label="Previsão" />
      </form>
      <button type="submit" form="faturar">
        Confirmar faturamento
      </button>
    </div>
  );
}

// O jsdom não desenha nada, e `offsetParent` ali é sempre null: o gancho
// acharia que nenhum campo está visível. Aqui, "visível" = está na página.
const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetParent");
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetParent", {
    configurable: true,
    get() {
      return (this as HTMLElement).parentElement;
    },
  });
});
afterAll(() => {
  if (original) Object.defineProperty(HTMLElement.prototype, "offsetParent", original);
});

describe("useEnterParaProximoCampo", () => {
  it("no último campo, o Enter leva ao botão de enviar que mora fora do <form> (atributo form)", async () => {
    const { user } = renderizar(<Tela />);
    await user.click(screen.getByRole("textbox", { name: "Previsão" }));
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Confirmar faturamento" })).toHaveFocus();
  });
});
