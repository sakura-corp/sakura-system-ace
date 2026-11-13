// @vitest-environment jsdom
/**
 * O gancho que deixa só a carga mais nova mexer na tela (#927, o mesmo jeito
 * das OS, #903, e de Configurações, #967). Cada caso abaixo é uma forma de a
 * carga da loja antiga chegar depois da nova; o teste prova que o gancho diz
 * "essa já não vale" e de qual loja são os dados que estão na tela.
 */
import { act, renderHook } from "@testing-library/react";
import { useCallback, useEffect } from "react";
import { describe, expect, it } from "vitest";
import { useCargaMaisNova, type CargaDaLoja } from "./useCargaMaisNova";

describe("useCargaMaisNova", () => {
  it("a carga começada por último é a única que vale", () => {
    const { result } = renderHook(() => useCargaMaisNova("loja-a"));
    const primeira = result.current.comecar("loja-a");
    const segunda = result.current.comecar("loja-a");
    expect(primeira).not.toBeNull();
    expect(segunda).not.toBeNull();
    expect(primeira!.aindaEhAtual()).toBe(false);
    expect(segunda!.aindaEhAtual()).toBe(true);
  });

  it("a carga da loja A perde a vez quando a loja muda pra B", () => {
    const { result, rerender } = renderHook(({ loja }) => useCargaMaisNova(loja), {
      initialProps: { loja: "loja-a" as string | undefined },
    });
    const daA = result.current.comecar("loja-a")!;
    rerender({ loja: "loja-b" });
    const daB = result.current.comecar("loja-b")!;
    expect(daA.aindaEhAtual()).toBe(false);
    expect(daB.aindaEhAtual()).toBe(true);
  });

  it("um carregar guardado de antes da troca (um salvar lento) nem começa, e não tira a vez da B", () => {
    const { result, rerender } = renderHook(({ loja }) => useCargaMaisNova(loja), {
      initialProps: { loja: "loja-a" as string | undefined },
    });
    rerender({ loja: "loja-b" });
    const daB = result.current.comecar("loja-b")!;
    expect(result.current.comecar("loja-a")).toBeNull();
    expect(daB.aindaEhAtual()).toBe(true);
  });

  it("sem loja: nada começa, e a carga que ainda busca deixa de valer", () => {
    const { result, rerender } = renderHook(({ loja }) => useCargaMaisNova(loja), {
      initialProps: { loja: "loja-a" as string | undefined },
    });
    const daA = result.current.comecar("loja-a")!;
    rerender({ loja: undefined });
    expect(result.current.comecar(undefined)).toBeNull();
    expect(daA.aindaEhAtual()).toBe(false);
  });

  it("um carregar sem loja guardado de antes não tira a vez da loja que entrou", () => {
    const { result, rerender } = renderHook(({ loja }) => useCargaMaisNova(loja), {
      initialProps: { loja: undefined as string | undefined },
    });
    rerender({ loja: "loja-b" });
    const daB = result.current.comecar("loja-b")!;
    expect(result.current.comecar(undefined)).toBeNull();
    expect(daB.aindaEhAtual()).toBe(true);
  });

  it("diz de qual loja são os dados na tela: só muda quando a carga mais nova grava", () => {
    const { result, rerender } = renderHook(({ loja }) => useCargaMaisNova(loja), {
      initialProps: { loja: "loja-a" as string | undefined },
    });
    expect(result.current.lojaDosDados).toBeNull();
    expect(result.current.dadosSaoDaLoja).toBe(false);

    const daA = result.current.comecar("loja-a")!;
    act(() => daA.gravou());
    expect(result.current.lojaDosDados).toBe("loja-a");
    expect(result.current.dadosSaoDaLoja).toBe(true);

    // Troca pra B: os dados que estão na tela continuam sendo da A.
    rerender({ loja: "loja-b" });
    expect(result.current.lojaDosDados).toBe("loja-a");
    expect(result.current.dadosSaoDaLoja).toBe(false);

    const daB = result.current.comecar("loja-b")!;
    act(() => daB.gravou());
    expect(result.current.lojaDosDados).toBe("loja-b");
    expect(result.current.dadosSaoDaLoja).toBe(true);

    // A carga velha da A chegando depois da B não marca nada.
    act(() => daA.gravou());
    expect(result.current.lojaDosDados).toBe("loja-b");
    expect(result.current.dadosSaoDaLoja).toBe(true);
  });

  it("a carga da B que dá erro deixa a tela sem dados da loja do seletor", () => {
    const { result, rerender } = renderHook(({ loja }) => useCargaMaisNova(loja), {
      initialProps: { loja: "loja-a" as string | undefined },
    });
    act(() => result.current.comecar("loja-a")!.gravou());
    rerender({ loja: "loja-b" });
    const daB = result.current.comecar("loja-b")!;
    // deu erro: a tela não chama gravou()
    expect(daB.aindaEhAtual()).toBe(true);
    expect(result.current.dadosSaoDaLoja).toBe(false);
  });

  it("recarregar a mesma loja que dá erro continua com os dados dela", () => {
    const { result } = renderHook(() => useCargaMaisNova("loja-a"));
    act(() => result.current.comecar("loja-a")!.gravou());
    result.current.comecar("loja-a"); // a recarga que vai dar erro
    expect(result.current.dadosSaoDaLoja).toBe(true);
  });

  // O jeito de quase todas as telas: um efeito em [lojaAtual?.id] que chama
  // carregar() logo depois de pedir o gancho. A troca de loja precisa já valer
  // quando esse efeito roda, senão a carga da loja nova nem começa.
  it("com efeito em [lojaId]: a carga da loja nova começa no mesmo commit da troca", () => {
    const comecadas: (CargaDaLoja | null)[] = [];
    const { rerender } = renderHook(
      ({ loja }) => {
        const { comecar } = useCargaMaisNova(loja);
        useEffect(() => {
          comecadas.push(comecar(loja));
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [loja]);
      },
      { initialProps: { loja: "loja-a" as string | undefined } },
    );
    rerender({ loja: "loja-b" });
    expect(comecadas.map((c) => c?.lojaId ?? null)).toEqual(["loja-a", "loja-b"]);
    expect(comecadas[0]!.aindaEhAtual()).toBe(false);
    expect(comecadas[1]!.aindaEhAtual()).toBe(true);
  });

  // Mesmo se a tela declarar o efeito ANTES de pedir o gancho (a ordem dos
  // efeitos é a armadilha das OS e de Configurações), a troca já vale.
  it("a troca de loja já vale mesmo num efeito declarado antes do gancho", () => {
    const comecadas: (CargaDaLoja | null)[] = [];
    const { rerender } = renderHook(
      ({ loja }) => {
        const gancho: { comecar?: (l: string | undefined) => CargaDaLoja | null } = {};
        useEffect(() => {
          comecadas.push(gancho.comecar!(loja));
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [loja]);
        gancho.comecar = useCargaMaisNova(loja).comecar;
      },
      { initialProps: { loja: "loja-a" as string | undefined } },
    );
    rerender({ loja: "loja-b" });
    expect(comecadas.map((c) => c?.lojaId ?? null)).toEqual(["loja-a", "loja-b"]);
  });

  // O jeito do Painel e do Diagnóstico: um useCallback que depende da loja
  // inteira, e um efeito em [carregar].
  it("com useCallback na loja e efeito em [carregar]: a velha perde, a nova vale", () => {
    const comecadas: (CargaDaLoja | null)[] = [];
    const { rerender } = renderHook(
      ({ loja }) => {
        const { comecar } = useCargaMaisNova(loja?.id);
        const carregar = useCallback(() => {
          comecadas.push(comecar(loja?.id));
        }, [loja, comecar]);
        useEffect(() => {
          carregar();
        }, [carregar]);
      },
      { initialProps: { loja: { id: "loja-a" } as { id: string } | undefined } },
    );
    rerender({ loja: { id: "loja-b" } });
    // mesma loja, objeto novo (a lista de lojas recarregou): carrega de novo, e vale
    rerender({ loja: { id: "loja-b" } });
    expect(comecadas.map((c) => c?.lojaId ?? null)).toEqual(["loja-a", "loja-b", "loja-b"]);
    expect(comecadas[0]!.aindaEhAtual()).toBe(false);
    expect(comecadas[1]!.aindaEhAtual()).toBe(false);
    expect(comecadas[2]!.aindaEhAtual()).toBe(true);
  });

  it("comecar é a mesma função entre renders (não dispara useCallback/useEffect à toa)", () => {
    const { result, rerender } = renderHook(({ loja }) => useCargaMaisNova(loja), {
      initialProps: { loja: "loja-a" as string | undefined },
    });
    const primeira = result.current.comecar;
    rerender({ loja: "loja-b" });
    expect(result.current.comecar).toBe(primeira);
  });
});
