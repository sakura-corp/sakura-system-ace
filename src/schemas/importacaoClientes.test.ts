import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CAMPOS_IMPORTACAO,
  conferirLinhas,
  sugerirMapeamento,
  type CadastroExistente,
  type CampoImportacao,
} from "./importacaoClientes";
import { decodificarArquivo, lerCsv } from "./importacaoPlanilha";

// CPFs e CNPJs inventados, com dígito certo.
const CPF_A = "25847502281";
const CPF_A_PONTOS = "258.475.022-81";
const CPF_B = "38236626946";
const CNPJ_OK = "11222333000181";

const VAZIO: CadastroExistente = { clientes: [], placas: [] };
const MAP: CampoImportacao[] = ["nome", "cpf_cnpj", "telefone", "data_nascimento", "placa", "ano", "km_atual", "uf"];
function linha(parte: Partial<Record<CampoImportacao, string>>): string[] {
  return MAP.map((c) => parte[c] ?? "");
}
const conferir = (linhas: string[][], existente = VAZIO) => conferirLinhas(linhas, MAP, existente);

describe("sugerirMapeamento", () => {
  it("reconhece os nomes comuns, sem acento nem caixa", () => {
    expect(
      sugerirMapeamento(["Razão Social", "CPF/CNPJ", "Celular", "Placa", "E-mail", "Nascimento", "Quilometragem", "Obs"]),
    ).toEqual(["nome", "cpf_cnpj", "telefone", "placa", "email", "data_nascimento", "km_atual", "ignorar"]);
    expect(sugerirMapeamento(["CLIENTE", "Documento", "Fone", "WhatsApp"])).toEqual([
      "nome",
      "cpf_cnpj",
      "telefone",
      "ignorar",
    ]);
  });

  it("usa cada campo no máximo uma vez", () => {
    expect(sugerirMapeamento(["Nome", "Cliente", "CPF", "CNPJ"])).toEqual(["nome", "ignorar", "cpf_cnpj", "ignorar"]);
  });

  it("todo campo sugerido existe na lista de campos", () => {
    const campos = new Set(CAMPOS_IMPORTACAO.map((c) => c.campo));
    for (const c of sugerirMapeamento(["Nome", "Fone", "Placa", "Ano", "Cor", "UF"])) expect(campos.has(c)).toBe(true);
  });
});

describe("conferirLinhas — cliente", () => {
  it("sem nome é problema e não entra", () => {
    const r = conferir([linha({ cpf_cnpj: CPF_A })]);
    expect(r.linhas[0]).toMatchObject({ linha: 2, situacao: "problema", problemas: ["sem nome"] });
    expect(r.clientes).toHaveLength(0);
  });

  it("CPF com e sem ponto: grava só os dígitos, pessoa física", () => {
    const r = conferir([linha({ nome: "Ana", cpf_cnpj: CPF_A_PONTOS }), linha({ nome: "Bia", cpf_cnpj: CPF_B })]);
    expect(r.clientes[0].cliente).toMatchObject({ cpf_cnpj: CPF_A, tipo_pessoa: "fisica" });
    expect(r.clientes[1].cliente.cpf_cnpj).toBe(CPF_B);
  });

  it("CNPJ vira pessoa jurídica, com ou sem pontos", () => {
    const r = conferir([linha({ nome: "Loja", cpf_cnpj: "11.222.333/0001-81" })]);
    expect(r.clientes[0].cliente).toMatchObject({ cpf_cnpj: CNPJ_OK, tipo_pessoa: "juridica" });
  });

  it("CPF com dígito errado é problema", () => {
    const r = conferir([linha({ nome: "Ana", cpf_cnpj: "258.475.022-82" })]);
    expect(r.linhas[0].situacao).toBe("problema");
    expect(r.linhas[0].problemas).toContain("CPF com dígito errado");
    expect(r.clientes).toHaveLength(0);
  });

  it("CNPJ com dígito errado e documento de tamanho estranho são problema", () => {
    const r = conferir([
      linha({ nome: "A", cpf_cnpj: "11222333000182" }),
      linha({ nome: "B", cpf_cnpj: "12345" }),
    ]);
    expect(r.linhas[0].problemas).toContain("CNPJ com dígito errado");
    expect(r.linhas[1].situacao).toBe("problema");
  });

  it("sem documento entra normalmente", () => {
    const r = conferir([linha({ nome: "Ana" })]);
    expect(r.linhas[0].situacao).toBe("entra");
    expect(r.clientes[0].cliente.cpf_cnpj).toBe("");
  });

  it("telefone: grava como veio e só avisa quando é estranho", () => {
    const formatos = ["(16) 99123-4567", "16991234567", "+55 16 99123-4567", "016 99123-4567", "16 3333-4444"];
    const r = conferir(formatos.map((telefone, i) => linha({ nome: `P${i}`, telefone })));
    r.linhas.forEach((l) => expect(l.avisos).toEqual([]));
    expect(r.clientes[0].cliente.telefone).toBe("(16) 99123-4567");

    const estranho = conferir([linha({ nome: "Ana", telefone: "12345" })]);
    expect(estranho.linhas[0].situacao).toBe("entra");
    expect(estranho.linhas[0].avisos).toContain("telefone em formato estranho");
    expect(estranho.clientes[0].cliente.telefone).toBe("12345");
  });

  it("data dd/mm/aaaa vira aaaa-mm-dd; inválida vira aviso e fica em branco", () => {
    const r = conferir([
      linha({ nome: "A", data_nascimento: "05/03/1980" }),
      linha({ nome: "B", data_nascimento: "31/02/1990" }),
      linha({ nome: "C", data_nascimento: "29/02/2000" }),
      linha({ nome: "D", data_nascimento: "ontem" }),
      linha({ nome: "E", data_nascimento: "29/02/1900" }),
      linha({ nome: "F", data_nascimento: "31/04/1990" }),
      linha({ nome: "G", data_nascimento: "01/01/3000" }),
    ]);
    expect(r.clientes.map((c) => c.cliente.data_nascimento)).toEqual([
      "1980-03-05", null, "2000-02-29", null, null, null, null,
    ]);
    expect(r.linhas[1].avisos).toContain("data em formato estranho: ficou em branco");
    expect(r.linhas[1].situacao).toBe("entra");
  });

  it("UF: 2 letras, em maiúscula; senão aviso", () => {
    const r = conferir([linha({ nome: "A", uf: "sp" }), linha({ nome: "B", uf: "São Paulo" })]);
    expect(r.clientes[0].cliente.uf).toBe("SP");
    expect(r.clientes[1].cliente.uf).toBe("");
    expect(r.linhas[1].avisos.some((a) => a.startsWith("UF"))).toBe(true);
  });
});

describe("conferirLinhas — veículo", () => {
  it("placa antiga e Mercosul, com e sem traço ou espaço, gravadas em maiúscula", () => {
    const placas = ["abc1234", "ABC-1234", "bra1a23", "BRA-2B34", "GHI 9012"];
    const r = conferir(placas.map((placa, i) => linha({ nome: `P${i}`, placa })));
    // a segunda é repetida da primeira: o cliente P1 entra, mas sem o veículo
    expect(r.clientes.flatMap((c) => c.veiculos.map((v) => v.placa))).toEqual(["ABC1234", "BRA1A23", "BRA2B34", "GHI9012"]);
    expect(r.clientes[1].veiculos).toEqual([]);
    expect(r.resumo.comProblema).toBe(0);
  });

  it("placa em formato estranho: o cliente entra, o veículo não, com aviso", () => {
    const r = conferir([linha({ nome: "Ana", placa: "12-ABC" })]);
    expect(r.linhas[0].situacao).toBe("entra");
    expect(r.linhas[0].avisos).toContain("placa em formato estranho: o veículo não entra");
    expect(r.clientes[0].veiculos).toEqual([]);
  });

  it("placa estranha de cliente que já existe: nada novo, vira problema", () => {
    const existente = { clientes: [{ id: "c1", nome: "Ana", cpf_cnpj: CPF_A }], placas: [] };
    const r = conferir([linha({ nome: "Ana", cpf_cnpj: CPF_A, placa: "12-ABC" })], existente);
    expect(r.linhas[0].situacao).toBe("problema");
    expect(r.linhas[0].problemas).toContain("placa em formato estranho");
  });

  it("ano e km: inteiros, senão aviso e em branco; km aceita ponto de milhar", () => {
    const r = conferir([
      linha({ nome: "A", placa: "ABC1234", ano: "2015", km_atual: "45.000" }),
      linha({ nome: "B", placa: "DEF5678", ano: "vinte", km_atual: "muito" }),
    ]);
    expect(r.clientes[0].veiculos[0]).toMatchObject({ ano: 2015, km_atual: 45000 });
    expect(r.clientes[1].veiculos[0]).toMatchObject({ ano: null, km_atual: null });
    expect(r.linhas[1].avisos).toHaveLength(2);
  });

  it("placa repetida na planilha e cliente novo: o cliente entra sem o veículo, com aviso", () => {
    const r = conferir([
      linha({ nome: "A", placa: "ABC1234" }),
      linha({ nome: "B", placa: "ABC-1234" }),
    ]);
    expect(r.linhas[0].situacao).toBe("entra");
    expect(r.linhas[1]).toMatchObject({
      situacao: "entra",
      problemas: [],
      avisos: ["placa repetida na planilha: o veículo não entra"],
    });
    expect(r.clientes.map((c) => [c.cliente.nome, c.veiculos.length])).toEqual([["A", 1], ["B", 0]]);
    expect(r.resumo).toMatchObject({ entram: 2, comProblema: 0, clientesNovos: 2, veiculosNovos: 1 });
  });

  it("placa repetida na planilha e o cliente já entrou antes: continua problema", () => {
    const r = conferir([
      linha({ nome: "A", placa: "ABC1234" }),
      linha({ nome: "A", placa: "ABC-1234" }),
    ]);
    expect(r.linhas[1]).toMatchObject({ situacao: "problema", problemas: ["placa repetida na planilha"] });
  });

  it("placa já cadastrada e cliente novo: o cliente entra sem o veículo, com aviso", () => {
    const r = conferir([linha({ nome: "Ana", placa: "abc1234" })], { clientes: [], placas: ["ABC-1234"] });
    expect(r.linhas[0]).toMatchObject({
      situacao: "entra",
      avisos: ["placa já cadastrada: o veículo não entra"],
    });
    expect(r.clientes).toHaveLength(1);
    expect(r.clientes[0].veiculos).toEqual([]);
    expect(r.resumo).toMatchObject({ entram: 1, jaExistem: 0, clientesNovos: 1, veiculosNovos: 0 });
  });

  it("km acima de 2.000.000 ou não inteiro fica em branco com aviso; ano fora da faixa também", () => {
    const r = conferir([
      linha({ nome: "A", placa: "ABC1234", km_atual: "2.000.001" }),
      linha({ nome: "B", placa: "DEF5678", km_atual: "2.000.000" }),
      linha({ nome: "C", placa: "GHI9012", km_atual: "99999999999999" }),
      linha({ nome: "D", placa: "JKL3456", ano: "1850" }),
    ]);
    expect(r.clientes[0].veiculos[0].km_atual).toBeNull();
    expect(r.linhas[0].avisos).toContain("km em formato estranho: ficou em branco");
    expect(r.clientes[1].veiculos[0].km_atual).toBe(2000000);
    expect(r.clientes[2].veiculos[0].km_atual).toBeNull();
    expect(r.clientes[3].veiculos[0].ano).toBeNull();
    expect(r.linhas[3].avisos).toContain("ano em formato estranho: ficou em branco");
  });
});

describe("conferirLinhas — agrupar", () => {
  it("mesmo CPF (com e sem ponto) vira 1 cliente com 2 veículos", () => {
    const r = conferir([
      linha({ nome: "Ana", cpf_cnpj: CPF_A_PONTOS, placa: "ABC1234" }),
      linha({ nome: "Ana", cpf_cnpj: CPF_A, placa: "BRA1A23" }),
    ]);
    expect(r.clientes).toHaveLength(1);
    expect(r.clientes[0].veiculos.map((v) => v.placa)).toEqual(["ABC1234", "BRA1A23"]);
    expect(r.clientes[0].linhas).toEqual([2, 3]);
    expect(r.clientes[0].chave).toBe(CPF_A);
    expect(r.resumo).toMatchObject({ entram: 2, clientesNovos: 1, veiculosNovos: 2 });
  });

  it("sem CPF, agrupa pelo nome sem acento, caixa nem espaço extra", () => {
    const r = conferir([
      linha({ nome: "José  Antônio", placa: "ABC1234" }),
      linha({ nome: "jose antonio ", placa: "BRA1A23" }),
    ]);
    expect(r.clientes).toHaveLength(1);
    expect(r.clientes[0].chave).toBe("nome:jose antonio");
    expect(r.clientes[0].veiculos).toHaveLength(2);
  });

  it("cliente repetido sem veículo novo: a segunda linha é ja_existe", () => {
    const r = conferir([linha({ nome: "Ana", cpf_cnpj: CPF_A }), linha({ nome: "Ana", cpf_cnpj: CPF_A })]);
    expect(r.linhas.map((l) => l.situacao)).toEqual(["entra", "ja_existe"]);
  });
});

describe("conferirLinhas — já existe (só pula)", () => {
  const existente: CadastroExistente = {
    clientes: [
      { id: "c1", nome: "Ana Souza", cpf_cnpj: CPF_A_PONTOS },
      { id: "c2", nome: "João da Silva", cpf_cnpj: null },
    ],
    placas: ["ABC-1234"],
  };

  it("mesmo CPF (com ponto no banco, sem ponto na planilha) e sem veículo: ja_existe e nada a gravar", () => {
    const r = conferir([linha({ nome: "Ana Souza", cpf_cnpj: CPF_A })], existente);
    expect(r.linhas[0].situacao).toBe("ja_existe");
    expect(r.clientes).toEqual([]);
    expect(r.resumo.jaExistem).toBe(1);
  });

  it("cliente que existe com veículo novo: só o veículo entra, ligado ao cliente", () => {
    const r = conferir([linha({ nome: "Ana Souza", cpf_cnpj: CPF_A_PONTOS, placa: "bra1a23" })], existente);
    expect(r.linhas[0].situacao).toBe("entra");
    expect(r.linhas[0].avisos).toContain("cliente já existe: só o veículo entra");
    expect(r.clientes).toHaveLength(1);
    expect(r.clientes[0].clienteExistenteId).toBe("c1");
    expect(r.clientes[0].veiculos.map((v) => v.placa)).toEqual(["BRA1A23"]);
    expect(r.resumo).toMatchObject({ clientesNovos: 0, veiculosNovos: 1 });
  });

  it("sem documento, acha o cliente existente pelo nome normalizado", () => {
    const r = conferir([linha({ nome: "JOAO DA SILVA", placa: "DEF5678" })], existente);
    expect(r.clientes[0].clienteExistenteId).toBe("c2");
  });

  it("mesma placa com e sem traço e o cliente também já existe: ja_existe e o veículo não entra", () => {
    const r = conferir([linha({ nome: "Ana Souza", cpf_cnpj: CPF_A, placa: "abc1234" })], existente);
    expect(r.linhas[0].situacao).toBe("ja_existe");
    expect(r.clientes).toEqual([]);
  });

  it("documento igual com nome diferente ainda é o mesmo cliente", () => {
    const r = conferir([linha({ nome: "A. Souza", cpf_cnpj: CPF_A, placa: "DEF5678" })], existente);
    expect(r.clientes[0].clienteExistenteId).toBe("c1");
  });
});

describe("conferirLinhas — zero da frente perdido pelo Excel", () => {
  it("CPF com 10 e com 9 dígitos: completa com zeros e aceita só se o dígito bater", () => {
    const r = conferir([
      linha({ nome: "A", cpf_cnpj: "1234567890" }),
      linha({ nome: "B", cpf_cnpj: "123456797" }),
    ]);
    expect(r.linhas.map((l) => l.situacao)).toEqual(["entra", "entra"]);
    expect(r.clientes[0].cliente).toMatchObject({ cpf_cnpj: "01234567890", tipo_pessoa: "fisica" });
    expect(r.clientes[1].cliente).toMatchObject({ cpf_cnpj: "00123456797", tipo_pessoa: "fisica" });
    expect(r.linhas[0].avisos).toContain("documento sem o zero da frente (corrigido)");
  });

  it("CNPJ com 13 e com 12 dígitos: completa até 14 e vira pessoa jurídica", () => {
    const r = conferir([
      linha({ nome: "A", cpf_cnpj: "1234567000195" }),
      linha({ nome: "B", cpf_cnpj: "123456000149" }),
    ]);
    expect(r.clientes[0].cliente).toMatchObject({ cpf_cnpj: "01234567000195", tipo_pessoa: "juridica" });
    expect(r.clientes[1].cliente).toMatchObject({ cpf_cnpj: "00123456000149", tipo_pessoa: "juridica" });
    expect(r.linhas[1].avisos).toContain("documento sem o zero da frente (corrigido)");
  });

  it("se o dígito não bate depois de completar, continua problema de tamanho", () => {
    const r = conferir([linha({ nome: "A", cpf_cnpj: "1234567891" }), linha({ nome: "B", cpf_cnpj: "123456000148" })]);
    expect(r.linhas.map((l) => l.situacao)).toEqual(["problema", "problema"]);
    expect(r.linhas[0].problemas[0]).toMatch(/tamanho estranho/);
  });

  it("o documento corrigido acha o cliente que já existe", () => {
    const existente = { clientes: [{ id: "c1", nome: "Z", cpf_cnpj: "012.345.678-90" }], placas: [] };
    const r = conferir([linha({ nome: "A", cpf_cnpj: "1234567890" })], existente);
    expect(r.linhas[0].situacao).toBe("ja_existe");
  });
});

describe("conferirLinhas — número da linha do arquivo", () => {
  it("usa os números passados em vez de posição + 2", () => {
    const r = conferirLinhas([linha({ nome: "A" }), linha({ nome: "" }), linha({ nome: "C" })], MAP, VAZIO, [2, 5, 9]);
    expect(r.linhas.map((l) => l.linha)).toEqual([2, 5, 9]);
    expect(r.clientes.map((c) => c.linhas)).toEqual([[2], [9]]);
  });

  it("sem os números, continua posição + 2", () => {
    const r = conferir([linha({ nome: "A" }), linha({ nome: "B" })]);
    expect(r.linhas.map((l) => l.linha)).toEqual([2, 3]);
  });
});

describe("planilha de exemplo (supabase/exemplo/importar-clientes-exemplo.csv)", () => {
  const bytes = new Uint8Array(readFileSync("supabase/exemplo/importar-clientes-exemplo.csv"));
  const { texto, codificacao } = decodificarArquivo(bytes);
  const csv = lerCsv(texto);
  const mapeamento = sugerirMapeamento(csv.cabecalho);
  const r = conferirLinhas(csv.linhas, mapeamento, VAZIO);

  it("é Latin-1 com ';' e os acentos saem certos", () => {
    expect(codificacao).toBe("latin-1");
    expect(csv.separador).toBe(";");
    expect(r.clientes.map((c) => c.cliente.nome)).toContain("José Antônio Pereira");
    expect(texto).not.toContain("�");
  });

  it("o mapeamento sugerido acerta todas as colunas", () => {
    expect(mapeamento).toEqual([
      "nome", "cpf_cnpj", "telefone", "email", "cep", "rua", "numero", "bairro", "cidade", "uf",
      "data_nascimento", "placa", "marca", "modelo", "ano", "cor", "km_atual",
    ]);
  });

  it("cada caso difícil cai onde deve", () => {
    const porNome = (n: string) => r.clientes.find((c) => c.cliente.nome === n);
    expect(r.linhas.find((l) => l.problemas.includes("sem nome"))).toBeDefined();
    expect(r.linhas.filter((l) => l.problemas.includes("CPF com dígito errado"))).toHaveLength(1);
    expect(r.linhas.filter((l) => l.problemas.includes("CNPJ com dígito errado"))).toHaveLength(1);
    // placa repetida de cliente novo: entra sem o veículo, com aviso (antes era problema)
    expect(r.linhas.filter((l) => l.avisos.includes("placa repetida na planilha: o veículo não entra"))).toHaveLength(1);
    expect(porNome("Carlos Eduardo Lima")?.veiculos).toHaveLength(2); // dois veículos, mesmo CPF
    expect(porNome("Lúcia Fernandes")?.cliente.cpf_cnpj).toMatch(/^\d{11}$/);
    expect(porNome("Fátima Rodrigues")).toBeDefined();
    expect(r.clientes.find((c) => c.chave.startsWith("nome:"))?.veiculos.length).toBeGreaterThanOrEqual(1);
    expect(porNome("Silva; Irmãos & Cia")?.cliente.rua).toBe('Avenida "Brasil"; Sala 2');
  });

  it("o resumo bate com o que a tela vai mostrar", () => {
    expect(r.resumo.totalLinhas).toBe(csv.linhas.length);
    expect(r.resumo.entram + r.resumo.jaExistem + r.resumo.comProblema).toBe(r.resumo.totalLinhas);
    expect(r.resumo.comProblema).toBeGreaterThanOrEqual(3);
    expect(r.resumo.veiculosNovos).toBeGreaterThan(15);
  });
});

describe("desempenho: 2.000 linhas", () => {
  it("lerCsv + conferirLinhas em bem menos de 1 s", () => {
    const linhasCsv = ["Nome;CPF;Telefone;Placa"];
    for (let i = 0; i < 2000; i++) {
      const cpf = String(100000000 + i).padStart(9, "0");
      linhasCsv.push(`Cliente ${i};${cpf};(16) 99123-${String(1000 + (i % 9000))};${String.fromCharCode(65 + (i % 26))}AB${String(1000 + i)}`);
    }
    const existente: CadastroExistente = {
      clientes: Array.from({ length: 2000 }, (_, i) => ({ id: `c${i}`, nome: `Outro ${i}`, cpf_cnpj: null })),
      placas: Array.from({ length: 5000 }, (_, i) => `ZZZ${1000 + (i % 9000)}`),
    };
    const inicio = performance.now();
    const csv = lerCsv(linhasCsv.join("\r\n"));
    const r = conferirLinhas(csv.linhas, sugerirMapeamento(csv.cabecalho), existente);
    const ms = performance.now() - inicio;
    console.log(`tempo lerCsv + conferirLinhas (2.000 linhas): ${ms.toFixed(1)} ms`);
    expect(csv.linhas).toHaveLength(2000);
    expect(r.resumo.totalLinhas).toBe(2000);
    expect(ms).toBeLessThan(500);
  });
});
