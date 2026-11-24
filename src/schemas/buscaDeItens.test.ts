import { describe, expect, it } from "vitest";
import { buscarNoCatalogo } from "./buscaDeItens";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";

function peca(sobrescrever: Partial<PecaJanela> = {}): PecaJanela {
  return {
    id: "pneu",
    codigo_interno: "PN175",
    codigo_barras: "7891111111111",
    descricao: "Pneu 175/70 R14",
    unidade: "UN",
    preco_venda: 380,
    prazo_garantia_dias: null,
    ativo: true,
    marca: "Pirelli",
    modelo: null,
    medida: "175/70 R14",
    sem_custo: false,
    ...sobrescrever,
  };
}

function servico(sobrescrever: Partial<Servico> = {}): Servico {
  return {
    id: "montagem",
    codigo_interno: "S01",
    descricao: "Montagem de pneu",
    preco_padrao: 25,
    custo: null,
    categoria_id: null,
    ativo: true,
    intervalo_dias: null,
    intervalo_km: null,
    criado_em: "2026-01-01T00:00:00Z",
    ...sobrescrever,
  };
}

const pneu = peca();
const montagem = servico();
const alinhamento = servico({ id: "alinhamento", codigo_interno: "S02", descricao: "Alinhamento" });
const palheta = peca({
  id: "palheta",
  codigo_interno: "PAL20",
  codigo_barras: "7892222222222",
  descricao: 'Palheta 20"',
  marca: "Bosch",
  medida: null,
  preco_venda: 35,
});

describe("buscarNoCatalogo", () => {
  it("acha a peça e o serviço juntos com o mesmo termo", () => {
    expect(buscarNoCatalogo([pneu, palheta], [montagem, alinhamento], "pneu")).toEqual([
      {
        tipo: "peca",
        id: "pneu",
        descricao: "Pneu 175/70 R14",
        preco: 380,
        codigo: "PN175",
        unidade: "UN",
      },
      { tipo: "servico", id: "montagem", descricao: "Montagem de pneu", preco: 25, codigo: "S01" },
    ]);
  });
});
