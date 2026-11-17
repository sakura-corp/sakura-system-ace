import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: {} }));
vi.mock("./clientes", () => ({ buscarClienteEVeiculoDaOrdem: vi.fn() }));

import { montarLojaDoRecibo, montarOsDoRecibo, type LinhaOsDoRecibo } from "./reciboNotaFiscal";
import { mesmoValor, totalDosServicosDaOs } from "@/schemas/reciboNotaFiscal";

const LINHA: LinhaOsDoRecibo = {
  numero: 1842,
  tipo: "os",
  km_entrada: 61300,
  vendedor_id: "f1",
  veiculo: { placa: "ABC1D23", marca: "Marca", modelo: "Hatch 1.6", cor: "prata" },
  criado_por: { nome: "Operador do caixa" },
  itens: [
    { tipo: "peca", descricao: "Pneu 205/55 R16", quantidade: 4, preco_unitario: 489.9, desconto: 59.6, tecnico_id: null, peca: { prazo_garantia_dias: 1825 } },
    { tipo: "servico", descricao: "Montagem", quantidade: 4, preco_unitario: 20, desconto: 10, tecnico_id: "f2", peca: null },
    { tipo: "servico", descricao: "Alinhamento", quantidade: 1, preco_unitario: 120.1, desconto: 0, tecnico_id: "f2", peca: null },
  ],
};

describe("montarOsDoRecibo", () => {
  it("monta veículo, atendente (o vendedor), mecânico e a garantia da peça", () => {
    const os = montarOsDoRecibo(LINHA, {
      nomes: new Map([["f1", "Rafael"], ["f2", "Diego"]]),
      telefoneCliente: "16955500142",
      cliente: null,
      anoVeiculo: 2019,
    });
    expect(os.veiculo).toBe("Marca Hatch 1.6 2019 · prata");
    expect(os.placa).toBe("ABC1D23");
    expect(os.km).toBe(61300);
    expect(os.atendente).toBe("Rafael");
    expect(os.mecanico).toBe("Diego");
    expect(os.telefoneCliente).toBe("16955500142");
    expect(os.itens[0].garantiaDias).toBe(1825);
    expect(os.itens[1].garantiaDias).toBeNull();
  });

  it("sem vendedor, o atendente é quem abriu a OS; sem veículo, os campos ficam vazios (nunca \"—\")", () => {
    const os = montarOsDoRecibo(
      { ...LINHA, vendedor_id: null, veiculo: null, itens: [] },
      { nomes: new Map(), telefoneCliente: null, cliente: null, anoVeiculo: null },
    );
    expect(os.atendente).toBe("Operador do caixa");
    expect(os.veiculo).toBeNull();
    expect(os.placa).toBeNull();
    expect(os.mecanico).toBeNull();
  });
});

describe("contas do recibo (src/schemas/reciboNotaFiscal)", () => {
  it("o total dos serviços da OS conta só os serviços, com desconto, fechado no centavo", () => {
    const os = montarOsDoRecibo(LINHA, { nomes: new Map(), telefoneCliente: null, cliente: null, anoVeiculo: null });
    // 4 × 20 − 10 + 120,10 = 190,10 (a peça não entra)
    expect(totalDosServicosDaOs(os.itens)).toBe(190.1);
    expect(mesmoValor(totalDosServicosDaOs(os.itens), 190.1)).toBe(true);
    expect(mesmoValor(totalDosServicosDaOs(os.itens), 190.11)).toBe(false);
  });
});

describe("montarLojaDoRecibo", () => {
  it("monta o endereço da loja a partir das Configurações", () => {
    const loja = montarLojaDoRecibo({
      cnpj: "12345678000100",
      razao_social: "Exemplo Pneus Ltda",
      nome_fantasia: "Auto Center Exemplo",
      inscricao_estadual: "",
      inscricao_municipal: "45678",
      telefone: "1655500199",
      email: null,
      rua: "Av. das Paineiras",
      numero: "480",
      bairro: "Jardim Exemplo",
      cidade: "Cidade Exemplo",
      uf: "SP",
      cep: "13560000",
    });
    expect(loja.endereco).toBe("Av. das Paineiras, 480 · Jardim Exemplo · Cidade Exemplo/SP · CEP 13560-000");
    expect(loja.inscricaoEstadual).toBeNull();
    expect(loja.nomeFantasia).toBe("Auto Center Exemplo");
  });
});
