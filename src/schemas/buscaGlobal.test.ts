import { describe, expect, it } from "vitest";
import {
  agruparResultados,
  buscaAindaNaoNoBanco,
  chaveDePlaca,
  destinoDoResultado,
  filtrarPorPermissao,
  moverSelecao,
  parecePlaca,
  semAcento,
  termoDaBusca,
  tiposVisiveis,
  type ResultadoBusca,
} from "./buscaGlobal";
import type { ModuloChave, Operador } from "@/types/operador";

function operador(permissoes: ModuloChave[], admin = false): Operador {
  return {
    id: "op",
    usuario: "balcao",
    nome: "Balcão",
    admin,
    permissoes,
    ativo: true,
    deve_trocar_senha: false,
    criado_em: "",
  };
}

function resultado(dados: Partial<ResultadoBusca> & Pick<ResultadoBusca, "tipo">): ResultadoBusca {
  return { id: `${dados.tipo}-1`, titulo: "x", detalhe: null, veiculo_id: null, ...dados };
}

const TODOS: ResultadoBusca[] = [
  resultado({ tipo: "fornecedor" }),
  resultado({ tipo: "peca" }),
  resultado({ tipo: "os" }),
  resultado({ tipo: "cliente" }),
  resultado({ tipo: "veiculo" }),
];

describe("semAcento", () => {
  it("tira acento e cedilha e deixa minúsculo", () => {
    expect(semAcento("João Ávila Conceição")).toBe("joao avila conceicao");
    expect(semAcento("PNEU ÚNICO")).toBe("pneu unico");
  });
});

describe("chaveDePlaca", () => {
  it("aceita os dois formatos, com e sem traço, maiúsculo ou não", () => {
    expect(chaveDePlaca("ABC1D23")).toBe("ABC1D23");
    expect(chaveDePlaca("abc-1d23")).toBe("ABC1D23");
    expect(chaveDePlaca(" abc 1234 ")).toBe("ABC1234");
  });
});

describe("parecePlaca", () => {
  it("reconhece placa Mercosul e a antiga, com ou sem traço", () => {
    expect(parecePlaca("ABC1D23")).toBe(true);
    expect(parecePlaca("abc-1d23")).toBe(true);
    expect(parecePlaca("ABC-1234")).toBe(true);
  });
  it("não confunde nome nem número com placa", () => {
    expect(parecePlaca("joao")).toBe(false);
    expect(parecePlaca("1234567")).toBe(false);
    expect(parecePlaca("ABC1D2")).toBe(false);
  });
});

describe("termoDaBusca", () => {
  it("só busca a partir de 2 letras (sem contar espaço)", () => {
    expect(termoDaBusca("")).toBeNull();
    expect(termoDaBusca(" a ")).toBeNull();
    expect(termoDaBusca("jo")).toBe("jo");
    expect(termoDaBusca("  João  ")).toBe("João");
  });
  it("letra acentuada sozinha conta como uma letra", () => {
    expect(termoDaBusca("é")).toBeNull();
    expect(termoDaBusca("zé")).toBe("zé");
  });
});

describe("tiposVisiveis: quem não tem o módulo não vê o tipo", () => {
  it("admin vê tudo", () => {
    expect(tiposVisiveis(operador([], true))).toEqual(["veiculo", "cliente", "os", "peca", "fornecedor"]);
  });
  it("só Estoque: só peças", () => {
    expect(tiposVisiveis(operador(["estoque"]))).toEqual(["peca"]);
  });
  it("só OS: placa, cliente (pela janela estreita) e OS, sem peça nem fornecedor", () => {
    expect(tiposVisiveis(operador(["ordens_servico"]))).toEqual(["veiculo", "cliente", "os"]);
  });
  it("só Clientes: placa e cliente, sem OS", () => {
    expect(tiposVisiveis(operador(["clientes"]))).toEqual(["veiculo", "cliente"]);
  });
  it("só Fornecedores: só fornecedor", () => {
    expect(tiposVisiveis(operador(["fornecedores"]))).toEqual(["fornecedor"]);
  });
  it("sem login: nada", () => {
    expect(tiposVisiveis(null)).toEqual([]);
  });
});

describe("filtrarPorPermissao", () => {
  it("tira do resultado o tipo de módulo que a pessoa não tem, mesmo que o banco devolva", () => {
    const tipos = filtrarPorPermissao(TODOS, operador(["caixa"])).map((r) => r.tipo);
    expect(tipos).toEqual([]);
    const soEstoque = filtrarPorPermissao(TODOS, operador(["estoque"])).map((r) => r.tipo);
    expect(soEstoque).toEqual(["peca"]);
  });
});

describe("agruparResultados", () => {
  it("agrupa por tipo numa ordem fixa (placa primeiro) e numera pra navegar com as setas", () => {
    const grupos = agruparResultados(TODOS);
    expect(grupos.map((g) => g.tipo)).toEqual(["veiculo", "cliente", "os", "peca", "fornecedor"]);
    expect(grupos.map((g) => g.rotulo)).toEqual([
      "Placas",
      "Clientes",
      "Ordens de serviço",
      "Peças",
      "Fornecedores",
    ]);
    expect(grupos.flatMap((g) => g.itens.map((i) => i.indice))).toEqual([0, 1, 2, 3, 4]);
  });
  it("grupo vazio não aparece", () => {
    expect(agruparResultados([resultado({ tipo: "peca" })]).map((g) => g.tipo)).toEqual(["peca"]);
  });
});

describe("destinoDoResultado", () => {
  const admin = operador([], true);
  it("placa abre a ficha do veículo", () => {
    expect(destinoDoResultado(resultado({ tipo: "veiculo", id: "v1" }), admin)).toEqual({ rota: "/veiculos/v1" });
  });
  it("OS abre a própria OS na tela de OS", () => {
    expect(destinoDoResultado(resultado({ tipo: "os", id: "o1" }), admin)).toEqual({
      rota: "/ordens-servico",
      state: { abrirOrdemId: "o1" },
    });
  });
  it("cliente abre Clientes pra quem tem o módulo", () => {
    expect(destinoDoResultado(resultado({ tipo: "cliente", veiculo_id: "v1" }), operador(["clientes"]))).toEqual({
      rota: "/clientes",
    });
  });
  it("cliente, pra quem só tem OS, abre a ficha do carro dele (nunca o cadastro)", () => {
    expect(
      destinoDoResultado(resultado({ tipo: "cliente", veiculo_id: "v1" }), operador(["ordens_servico"])),
    ).toEqual({ rota: "/veiculos/v1" });
    expect(destinoDoResultado(resultado({ tipo: "cliente" }), operador(["ordens_servico"]))).toBeNull();
  });
  it("peça e fornecedor abrem a tela deles", () => {
    expect(destinoDoResultado(resultado({ tipo: "peca" }), admin)).toEqual({ rota: "/estoque" });
    expect(destinoDoResultado(resultado({ tipo: "fornecedor" }), admin)).toEqual({ rota: "/fornecedores" });
  });
});

describe("moverSelecao", () => {
  it("anda com as setas e dá a volta nas pontas", () => {
    expect(moverSelecao(0, 3, 1)).toBe(1);
    expect(moverSelecao(2, 3, 1)).toBe(0);
    expect(moverSelecao(0, 3, -1)).toBe(2);
  });
  it("sem resultado, fica em -1", () => {
    expect(moverSelecao(0, 0, 1)).toBe(-1);
  });
});

describe("buscaAindaNaoNoBanco", () => {
  it("reconhece o banco que ainda não recebeu a migration 0077", () => {
    expect(buscaAindaNaoNoBanco({ code: "PGRST202", message: "Could not find the function" })).toBe(true);
    expect(buscaAindaNaoNoBanco({ code: "42883", message: "function does not exist" })).toBe(true);
  });
  it("erro de outro tipo continua sendo erro", () => {
    expect(buscaAindaNaoNoBanco({ code: "42501", message: "permission denied" })).toBe(false);
    expect(buscaAindaNaoNoBanco(new Error("Failed to fetch"))).toBe(false);
    expect(buscaAindaNaoNoBanco(null)).toBe(false);
  });
});
