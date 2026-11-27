// @vitest-environment jsdom
/**
 * #1017: quando a internet volta, só a lista que está no erro busca de novo,
 * uma vez. A que está funcionando não recarrega (pra não perder o que a
 * pessoa está fazendo).
 */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const conexao = vi.hoisted(() => ({ semConexao: false }));
vi.mock("./useConexao", () => ({ useConexao: () => ({ semConexao: conexao.semConexao }) }));

const { useRecarregarQuandoVoltar } = await import("./useRecarregarQuandoVoltar");

function montar(noErro: boolean) {
  const recarregar = vi.fn();
  const gancho = renderHook(
    ({ erro }: { erro: boolean }) => useRecarregarQuandoVoltar(erro, recarregar),
    { initialProps: { erro: noErro } },
  );
  const mudarRede = (semConexao: boolean, erro = noErro) => {
    conexao.semConexao = semConexao;
    act(() => gancho.rerender({ erro }));
  };
  return { recarregar, gancho, mudarRede };
}

describe("useRecarregarQuandoVoltar", () => {
  beforeEach(() => {
    conexao.semConexao = false;
  });
  afterEach(cleanup);

  it("no erro: a internet voltou → recarrega uma vez", () => {
    const { recarregar, mudarRede } = montar(true);
    mudarRede(true);
    expect(recarregar).not.toHaveBeenCalled();
    mudarRede(false);
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it("sem erro: a internet voltou → não recarrega", () => {
    const { recarregar, mudarRede } = montar(false);
    mudarRede(true);
    mudarRede(false);
    expect(recarregar).not.toHaveBeenCalled();
  });

  it("não recarrega em laço: novos desenhos sem a rede mudar não chamam de novo", () => {
    const { recarregar, mudarRede } = montar(true);
    mudarRede(true);
    mudarRede(false);
    // A recarga falhou de novo (continua no erro) e a tela redesenhou várias vezes.
    mudarRede(false);
    mudarRede(false);
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it("caiu e voltou duas vezes: recarrega uma vez por volta", () => {
    const { recarregar, mudarRede } = montar(true);
    mudarRede(true);
    mudarRede(false);
    mudarRede(true);
    mudarRede(false);
    expect(recarregar).toHaveBeenCalledTimes(2);
  });

  it("já começa com conexão: não recarrega ao montar, mesmo no erro", () => {
    const { recarregar } = montar(true);
    expect(recarregar).not.toHaveBeenCalled();
  });

  it("entrou no erro sem a rede ter caído antes, e a rede caiu e voltou: recarrega", () => {
    const { recarregar, mudarRede } = montar(false);
    mudarRede(true, true);
    mudarRede(false, true);
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it("usa a função de recarregar mais nova (a tela recria a função a cada desenho)", () => {
    const primeira = vi.fn();
    const segunda = vi.fn();
    const gancho = renderHook(
      ({ fn }: { fn: () => void }) => useRecarregarQuandoVoltar(true, fn),
      { initialProps: { fn: primeira } },
    );
    conexao.semConexao = true;
    act(() => gancho.rerender({ fn: primeira }));
    conexao.semConexao = false;
    act(() => gancho.rerender({ fn: segunda }));
    expect(primeira).not.toHaveBeenCalled();
    expect(segunda).toHaveBeenCalledTimes(1);
  });
});
