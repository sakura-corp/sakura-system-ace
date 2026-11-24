/**
 * Ferramentas compartilhadas pelos testes de TELA (item TR-07.2 do guia).
 *
 * Por que existe um helper em vez de cada teste montar o seu: os cinco
 * formulários que mexem em dinheiro precisam das mesmas três coisas — os
 * matchers do jest-dom, a limpeza entre um teste e outro, e um `<MemoryRouter>`
 * em volta (sem ele o `BotaoVoltar`, que quase todo formulário usa, quebra com
 * "useNavigate() may be used only in the context of a Router").
 *
 * **A limpeza é manual de propósito.** O `@testing-library/react` só registra
 * o `cleanup` automático quando o runner expõe `afterEach` global, e este
 * projeto não usa `globals: true` (cada teste importa `describe`/`it`/`expect`
 * do vitest). Sem o `afterEach` abaixo, o segundo teste de um arquivo
 * encontraria a tela do primeiro ainda montada e `getByRole` reprovaria com
 * "found multiple elements" — um sintoma que não sugere a causa em nada.
 *
 * O ambiente jsdom é declarado POR ARQUIVO (`// @vitest-environment jsdom`),
 * no mesmo padrão que `lib/notaFiscalXmlFornecedor.test.ts` já usava: o resto
 * da suíte continua no ambiente node, que é bem mais rápido.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach } from "vitest";
import { vigiarFormDentroDeForm } from "./semFormDentroDeForm";

afterEach(cleanup);

// Todo teste de tela reprova se aparecer um <form> dentro de outro (#1130).
// Ligada DEPOIS do cleanup de propósito: o vitest roda os afterEach do último
// pro primeiro, então a trava olha a tela ainda montada.
vigiarFormDentroDeForm();

/** Monta o componente já dentro do Router, e devolve o `user` pronto. */
export function renderizar(ui: ReactElement, opcoes?: Omit<RenderOptions, "wrapper">) {
  return {
    user: userEvent.setup(),
    // O wrapper é definido aqui dentro, e não como um componente exportado do
    // arquivo, só pra não misturar componente com utilitário no mesmo módulo
    // (é o que a regra `react-refresh/only-export-components` do lint pede).
    ...render(ui, {
      wrapper: ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>,
      ...opcoes,
    }),
  };
}

export { screen, within, waitFor } from "@testing-library/react";
export { userEvent };
