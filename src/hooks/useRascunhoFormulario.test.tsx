// @vitest-environment jsdom
/**
 * Teste do rascunho local dos formulários. O foco é o "salvar agora": quando a
 * rede cai no meio do Salvar, o que a pessoa digitou precisa ir pro
 * localStorage na hora, sem esperar os 30 s do autosave.
 */
import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it } from "vitest";
import { useRascunho } from "./useRascunhoFormulario";

type Valores = { nome: string };

beforeEach(() => localStorage.clear());

function montar() {
  return renderHook(() => {
    const form = useForm<Valores>({ defaultValues: { nome: "" } });
    const rascunho = useRascunho("rascunho-teste", form.watch, form.reset);
    return { form, rascunho };
  });
}

describe("useRascunho — salvarAgora", () => {
  it("grava na hora o que foi digitado, sem esperar o autosave de 30 s", () => {
    const { result } = montar();
    act(() => result.current.form.setValue("nome", "Maria"));

    act(() => result.current.rascunho.salvarAgora());

    expect(JSON.parse(localStorage.getItem("rascunho-teste")!)).toEqual({ nome: "Maria" });
  });

  it("não grava se nada mudou desde a abertura", () => {
    const { result } = montar();

    act(() => result.current.rascunho.salvarAgora());

    expect(localStorage.getItem("rascunho-teste")).toBeNull();
  });

  it("não faz aparecer a faixa de restaurar no formulário já aberto", () => {
    const { result } = montar();
    act(() => result.current.form.setValue("nome", "Maria"));

    act(() => result.current.rascunho.salvarAgora());

    expect(result.current.rascunho.rascunho).toBeNull();
  });
});
