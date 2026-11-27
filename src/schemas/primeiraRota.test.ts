import { describe, expect, it } from "vitest";
import { primeiraRotaPermitida } from "./primeiraRota";

// #1016: a regra "pra onde vai quem abre o programa" é uma só, fora da tela.
describe("primeiraRotaPermitida", () => {
  it("administrador vai pro Início", () => {
    expect(primeiraRotaPermitida([], true)).toBe("/");
  });

  it("quem tem o Início vai pro Início", () => {
    expect(primeiraRotaPermitida(["relatorios", "painel"], false)).toBe("/");
  });

  it("login só de Relações vai pra Relações", () => {
    expect(primeiraRotaPermitida(["relatorios"], false)).toBe("/relatorios");
  });

  it("login sem nenhum módulo: nenhuma rota", () => {
    expect(primeiraRotaPermitida([], false)).toBeNull();
  });

  it("segue a ordem do menu (grupo por grupo), não a ordem da lista guardada", () => {
    // No menu, Clientes (Atendimento) vem antes do Caixa (Financeiro).
    expect(primeiraRotaPermitida(["caixa", "clientes"], false)).toBe("/clientes");
    // Garantias fica em Atendimento: no menu vem antes de Relações (Gestão),
    // embora venha depois dela na lista de módulos.
    expect(primeiraRotaPermitida(["relatorios", "garantias"], false)).toBe("/garantias");
  });

  it("permissão desconhecida (vinda do banco) é ignorada", () => {
    expect(primeiraRotaPermitida(["modulo_que_nao_existe" as never], false)).toBeNull();
  });
});
