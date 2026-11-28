import { describe, expect, it } from "vitest";
import {
  clienteFormSchema,
  paraNovoCliente,
  paraValoresFormulario as valoresDoCliente,
} from "./cliente";
import {
  ordemServicoFormSchema,
  paraCamposComuns,
  paraValoresFormulario as valoresDaOrdem,
} from "./ordemServico";
import { vendaBalcaoFormSchema, vendaVazia } from "./vendaBalcao";
import type { Cliente } from "@/types/cliente";
import type { OrdemServico } from "@/types/os";

// "De onde veio" (#1021) nos três formulários: cliente, OS/orçamento e venda
// de balcão. O que importa: o campo é opcional (em branco salva, como nulo),
// o valor escolhido chega no banco, e o rascunho gravado pela versão anterior
// (sem o campo) continua abrindo.

describe("cliente", () => {
  it("cliente novo nasce com a origem em branco, e em branco vai como nulo", () => {
    const valores = valoresDoCliente();
    expect(valores.origem).toBe("");
    expect(valores.origem_detalhe).toBe("");
    valores.nome = "Ana";
    expect(clienteFormSchema.safeParse(valores).success).toBe(true);
    expect(paraNovoCliente(valores)).toMatchObject({ origem: null, origem_detalhe: null });
  });

  it("a origem escolhida vai pro banco, e volta pro formulário ao editar", () => {
    const valores = { ...valoresDoCliente(), nome: "Ana", origem: "indicacao", origem_detalhe: "Zé da padaria" };
    expect(paraNovoCliente(valores)).toMatchObject({ origem: "indicacao", origem_detalhe: "Zé da padaria" });

    const gravado = { id: "c1", nome: "Ana", origem: "indicacao", origem_detalhe: "Zé da padaria" } as Cliente;
    expect(valoresDoCliente(gravado)).toMatchObject({ origem: "indicacao", origem_detalhe: "Zé da padaria" });
  });

  it("cliente gravado antes da migration (sem as colunas) abre com a origem em branco", () => {
    const antigo = { id: "c1", nome: "Ana" } as Cliente;
    expect(valoresDoCliente(antigo)).toMatchObject({ origem: "", origem_detalhe: "" });
  });
});

describe("OS e orçamento", () => {
  it("OS nova sem origem salva, com a origem nula", () => {
    const valores = { ...valoresDaOrdem(undefined, "func-1"), cliente_id: "c1" };
    expect(ordemServicoFormSchema.safeParse(valores).success).toBe(true);
    expect(paraCamposComuns(valores)).toMatchObject({ origem: null, origem_detalhe: null });
  });

  it("a origem escolhida vai pro banco junto com o resto da OS", () => {
    const valores = {
      ...valoresDaOrdem(undefined, "func-1"),
      cliente_id: "c1",
      origem: "google",
      origem_detalhe: " IG-pneu-nov ",
    };
    expect(paraCamposComuns(valores)).toMatchObject({ origem: "google", origem_detalhe: "IG-pneu-nov" });
  });

  it("abrir uma OS gravada mostra a origem DELA (não a do cliente)", () => {
    const gravada = { id: "os1", cliente_id: "c1", origem: "parceiro", origem_detalhe: null } as OrdemServico;
    expect(valoresDaOrdem(gravada, "func-1")).toMatchObject({ origem: "parceiro", origem_detalhe: "" });
  });

  it("o rascunho da versão anterior (sem o campo) continua abrindo e salvando", () => {
    const rascunhoAntigo: Record<string, unknown> = { ...valoresDaOrdem(undefined, "func-1"), cliente_id: "c1" };
    delete rascunhoAntigo.origem;
    delete rascunhoAntigo.origem_detalhe;
    const lido = ordemServicoFormSchema.safeParse(rascunhoAntigo);
    expect(lido.success).toBe(true);
    expect(lido.data).toMatchObject({ origem: "", origem_detalhe: "" });
  });
});

describe("venda de balcão", () => {
  it("toda venda começa sem origem (o Consumidor não tem)", () => {
    expect(vendaVazia("func-1")).toMatchObject({ origem: "", origem_detalhe: "" });
  });

  it("a origem é opcional na venda: sem ela, a venda passa na validação", () => {
    const venda = {
      ...vendaVazia("func-1"),
      itens: [{ peca_id: "p1", descricao: "Palheta", quantidade: "1", preco_unitario: "35", desconto: "" }],
    };
    expect(vendaBalcaoFormSchema.safeParse(venda).success).toBe(true);
    expect(vendaBalcaoFormSchema.safeParse({ ...venda, origem: "passou_na_frente" }).success).toBe(true);
  });
});
