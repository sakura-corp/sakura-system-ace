import { describe, expect, it } from "vitest";
import {
  blocoPix,
  linkAvaliacaoSchema,
  modeloPorChave,
  montarTextoAvaliacao,
  montarUrlWhatsapp,
  numerosDoResumoDono,
  periodoDoResumo,
  preencherModelo,
  telefoneParaWhatsapp,
  textoResumoDono,
} from "./whatsapp";
import {
  janelaDoMesAteODia,
  metricasDoPeriodo,
  contasVencendoAte,
  valoresPorCartao,
} from "./painelInicio";
import { custoDaOrdemPeloBanco } from "./metricasCaixa";
import { diferencaDoFechamento } from "./fechamentoCaixa";
import type { MovimentoCaixa } from "@/types/caixa";
import type { ContaPagar } from "@/types/contaPagar";
import type { ModuloChave } from "@/types/operador";

describe("telefoneParaWhatsapp", () => {
  it("aceita o formato que a loja digita de verdade", () => {
    expect(telefoneParaWhatsapp("(16) 99123-4567")).toBe("5516991234567");
    expect(telefoneParaWhatsapp("16 99123 4567")).toBe("5516991234567");
    expect(telefoneParaWhatsapp("16991234567")).toBe("5516991234567");
  });

  it("não duplica o 55 de quem já cadastrou com DDI", () => {
    expect(telefoneParaWhatsapp("5516991234567")).toBe("5516991234567");
    expect(telefoneParaWhatsapp("+55 (16) 99123-4567")).toBe("5516991234567");
  });

  it("tira o zero do DDD", () => {
    expect(telefoneParaWhatsapp("016 99123-4567")).toBe("5516991234567");
  });

  it("acrescenta o nono dígito em celular antigo", () => {
    // Celular cadastrado antes de 2016: DDD + 8 dígitos começando em 6-9.
    expect(telefoneParaWhatsapp("(16) 9123-4567")).toBe("5516991234567");
    expect(telefoneParaWhatsapp("(11) 8888-7777")).toBe("5511988887777");
  });

  it("NÃO inventa nono dígito em telefone fixo", () => {
    // Fixo começa em 2-5. Acrescentar um 9 criaria um número que não existe.
    expect(telefoneParaWhatsapp("(16) 3333-4444")).toBe("551633334444");
    expect(telefoneParaWhatsapp("(16) 2222-1111")).toBe("551622221111");
  });

  it("recusa o que não dá pra afirmar", () => {
    // Abrir conversa com o número errado é pior que avisar que falta cadastro.
    expect(telefoneParaWhatsapp("99123-4567")).toBeNull(); // sem DDD
    expect(telefoneParaWhatsapp("1234")).toBeNull();
    expect(telefoneParaWhatsapp("")).toBeNull();
    expect(telefoneParaWhatsapp(null)).toBeNull();
    expect(telefoneParaWhatsapp("abc")).toBeNull();
    expect(telefoneParaWhatsapp("0199123456789012")).toBeNull();
  });

  it("recusa DDD que não existe", () => {
    expect(telefoneParaWhatsapp("0912345678")).toBeNull();
  });
});

describe("preencherModelo", () => {
  it("troca os marcadores pelo valor", () => {
    expect(
      preencherModelo("Oi {cliente}, o valor é {valor}.", {
        cliente: "Maria",
        valor: "R$ 250,00",
      }),
    ).toBe("Oi Maria, o valor é R$ 250,00.");
  });

  it("valor com $ entra do jeito que está (link de avaliação digitado pela loja, #459)", () => {
    expect(preencherModelo("Veja: {link}", { link: "https://a.b/?x=$&y=$$1" })).toBe(
      "Veja: https://a.b/?x=$&y=$$1",
    );
  });

  it("troca todas as aparições do mesmo marcador", () => {
    expect(preencherModelo("{a} e {a}", { a: "x" })).toBe("x e x");
  });

  it("marcador sem valor vira travessão, não 'undefined'", () => {
    expect(preencherModelo("Oi {cliente}!", { cliente: null })).toBe("Oi —!");
    expect(preencherModelo("Oi {cliente}!", { cliente: "   " })).toBe("Oi —!");
  });

  it("deixa em paz um marcador que o modelo não conhece", () => {
    expect(preencherModelo("Oi {ninguem}!", { cliente: "x" })).toBe("Oi {ninguem}!");
  });
});

describe("montarUrlWhatsapp", () => {
  it("escapa o texto, inclusive quebra de linha e acento", () => {
    const url = montarUrlWhatsapp("5516991234567", "Olá!\nTudo bem?");
    expect(url).toBe("https://wa.me/5516991234567?text=Ol%C3%A1!%0ATudo%20bem%3F");
  });

  it("sempre aponta pro wa.me — é o que a checagem do Electron exige", () => {
    expect(montarUrlWhatsapp("5511999999999", "x").startsWith("https://wa.me/")).toBe(true);
  });
});

describe("modelo cliente_sumido (FN-11)", () => {
  it("existe, com os três marcadores, e o texto aprovado pela Sofia em 17/10", () => {
    const modelo = modeloPorChave("cliente_sumido");
    expect(modelo.marcadores).toEqual(["{cliente}", "{loja}", "{veiculo}"]);
    expect(
      preencherModelo(modelo.padrao, {
        cliente: "Cliente A",
        loja: "Loja Centro",
        veiculo: "Fiat Uno",
      }),
    ).toBe(
      "Oi Cliente A, tudo bem? Aqui é da Loja Centro.\n" +
        "Faz um tempinho que você não passa por aqui. Que tal dar uma olhada no Fiat Uno? " +
        "É só responder que a gente marca um horário.",
    );
  });
});

describe("link de avaliação no Google", () => {
  const erroPadrao = "O link precisa começar com https://";

  it.each(["http://g.page/r/x/review", "g.page/r/x/review", "https://", "https://g.page/r/x review"])(
    "recusa %j",
    (link) => {
      const r = linkAvaliacaoSchema.safeParse({ link });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0].message).toBe(erroPadrao);
    },
  );

  it("aceita um link https e apara os espaços das pontas", () => {
    const r = linkAvaliacaoSchema.safeParse({ link: "  https://g.page/r/x/review " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.link).toBe("https://g.page/r/x/review");
  });

  it("aceita vazio (quer dizer: apagar o link)", () => {
    expect(linkAvaliacaoSchema.safeParse({ link: "" }).success).toBe(true);
    expect(linkAvaliacaoSchema.safeParse({ link: "   " }).success).toBe(true);
  });
});

describe("montarTextoAvaliacao", () => {
  it("usa o modelo padrão com cliente, loja e link", () => {
    const texto = montarTextoAvaliacao({
      cliente: "Maria",
      loja: "Pneus Amigão",
      link: "https://g.page/r/x/review",
    });
    expect(texto).toBe(
      "Oi, Maria! Obrigado por escolher a Pneus Amigão. Se puder, deixa sua avaliação no Google, ajuda muito a gente: https://g.page/r/x/review",
    );
  });

  it("usa o texto que a loja editou", () => {
    expect(
      montarTextoAvaliacao({
        cliente: "Maria",
        loja: "L",
        link: "https://a.b/c",
        modelo: "{cliente} na {loja}: {link_avaliacao}",
      }),
    ).toBe("Maria na L: https://a.b/c");
  });
});

describe("modelo avaliacao", () => {
  it("existe na lista com os três marcadores", () => {
    expect(modeloPorChave("avaliacao").marcadores).toEqual([
      "{cliente}",
      "{loja}",
      "{link_avaliacao}",
    ]);
  });
});

describe("marcador {pix} na cobrança (#456)", () => {
  // O texto padrão de antes do Pix, copiado literalmente: sem chave Pix o
  // texto que sai tem que ser exatamente este.
  const TEXTO_ANTIGO =
    "Oi {cliente}, tudo bem? Aqui é da {loja}.\n" +
    "Passando pra lembrar do valor de {valor} referente a {descricao}, com vencimento em {vencimento}.\n" +
    "Qualquer coisa é só chamar por aqui!";
  const valores = {
    cliente: "Maria",
    loja: "Loja Exemplo",
    valor: "R$ 100,00",
    descricao: "troca de óleo",
    vencimento: "10/11/2026",
  };

  it("sem Pix, o texto padrão sai idêntico ao de antes (quem chama nem passa pix)", () => {
    const novo = preencherModelo(modeloPorChave("cobranca").padrao, valores);
    expect(novo).toBe(preencherModelo(TEXTO_ANTIGO, valores));
  });

  it("sem Pix, pix vazio, nulo ou em branco também some sem deixar linha sobrando", () => {
    const antigo = preencherModelo(TEXTO_ANTIGO, valores);
    for (const pix of ["", null, undefined, "   "]) {
      expect(preencherModelo(modeloPorChave("cobranca").padrao, { ...valores, pix })).toBe(antigo);
    }
  });

  it("com Pix, o bloco vai como última linha", () => {
    const pix = blocoPix("000201ABC");
    const texto = preencherModelo(modeloPorChave("cobranca").padrao, { ...valores, pix });
    expect(texto.endsWith("Qualquer coisa é só chamar por aqui!\n" + pix)).toBe(true);
    expect(texto).toContain("Pix copia e cola");
    expect(texto).toContain("000201ABC");
  });

  it("blocoPix sem código devolve vazio", () => {
    expect(blocoPix(null)).toBe("");
    expect(blocoPix("")).toBe("");
  });

  it("o modelo da cobrança anuncia o marcador {pix}", () => {
    expect(modeloPorChave("cobranca").marcadores).toContain("{pix}");
  });

  it("modelo personalizado sem {pix} continua igual, mesmo com Pix configurado", () => {
    const meu = "Oi {cliente}, falta {valor}.";
    expect(preencherModelo(meu, { ...valores, pix: blocoPix("000201ABC") })).toBe(
      "Oi Maria, falta R$ 100,00.",
    );
  });

  it("modelo personalizado com {pix} no meio do texto, sem Pix, não deixa buraco", () => {
    expect(preencherModelo("A\n{pix}\nB", { ...valores })).toBe("A\nB");
    expect(preencherModelo("Pague: {pix}", { ...valores })).toBe("Pague:");
    // Revisão final: o {pix} com texto depois, na mesma linha, não pode juntar as linhas.
    expect(preencherModelo("A\n{pix} Obrigado!", { ...valores })).toBe("A\nObrigado!");
    expect(preencherModelo("A {pix} B", { ...valores })).toBe("A B");
  });

  it("os outros marcadores vazios continuam virando travessão", () => {
    expect(preencherModelo("{cliente} / {valor}", { cliente: "", valor: null })).toBe("— / —");
  });
});

// ---------------------------------------------------------------------------
// Resumo pro dono (#397)
// ---------------------------------------------------------------------------

// 11/11/2026 às 15h, no fuso de quem roda o teste.
const HOJE = new Date(2026, 10, 11, 15, 0, 0);

function movimento(
  id: string,
  tipo: "entrada" | "saida",
  valor: number,
  data: Date,
  ordemId: string | null = null,
): MovimentoCaixa {
  return {
    id,
    loja_id: "l",
    data: data.toISOString(),
    ordem_servico_id: ordemId,
    tipo,
    forma_pagamento: "dinheiro",
    valor,
    descricao: null,
    categoria_id: null,
    ordem_servico: ordemId
      ? { id: ordemId, numero: 1, tipo: "os", cliente: null, itens: [] }
      : null,
  };
}

const MOVIMENTOS: MovimentoCaixa[] = [
  // Hoje: uma OS paga em duas formas (custo 100) e uma saída.
  movimento("m1", "entrada", 300, new Date(2026, 10, 11, 9), "os-1"),
  movimento("m2", "entrada", 200, new Date(2026, 10, 11, 9, 5), "os-1"),
  movimento("m3", "saida", 50, new Date(2026, 10, 11, 10)),
  // Começo do mês: outra OS (custo 40).
  movimento("m4", "entrada", 120, new Date(2026, 10, 2, 14), "os-2"),
  // Mês passado: não entra em nada.
  movimento("m5", "entrada", 999, new Date(2026, 9, 30, 14), "os-3"),
];
const CUSTOS = custoDaOrdemPeloBanco(
  new Map([
    ["os-1", { custo: 100, completo: true }],
    ["os-2", { custo: 40, completo: true }],
    ["os-3", { custo: 1, completo: true }],
  ]),
);

function conta(id: string, valor: number, vencimento: string): ContaPagar {
  return { id, valor, vencimento, status: "pendente", descricao: id } as unknown as ContaPagar;
}
const CONTAS = [conta("c1", 80, "2026-11-12"), conta("c2", 20, "2026-11-05"), conta("c3", 500, "2027-01-30")];
const ORDENS = [
  { id: "o1", status: "em_andamento" },
  { id: "o2", status: "em_andamento" },
  { id: "o3", status: "concluida" },
] as never[];

const pode = (...modulos: ModuloChave[]) => (m: ModuloChave) => modulos.includes(m);
const TUDO = pode("caixa", "ordens_servico", "contas_pagar");

describe("resumo pro dono: os números são os mesmos do Início e do Caixa", () => {
  it("mês: recebido, lucro e ticket iguais aos cartões do Início com os mesmos dados", () => {
    const cartoes = valoresPorCartao(
      metricasDoPeriodo(MOVIMENTOS, janelaDoMesAteODia(HOJE), CUSTOS),
      contasVencendoAte(CONTAS, HOJE),
    );
    const numeros = numerosDoResumoDono({
      periodo: "mes",
      referencia: HOJE,
      hoje: HOJE,
      movimentos: MOVIMENTOS,
      custoDaOrdem: CUSTOS,
      ordens: ORDENS,
      contas: CONTAS,
      podeVer: TUDO,
    });
    expect(numeros.vendas).toBe(cartoes.vendas_mes);
    expect(numeros.lucro).toBe(cartoes.lucro_mes);
    expect(numeros.ticket).toBe(cartoes.ticket_medio_mes);
    expect(numeros.contasVencendo).toBe(cartoes.contas_pagar_vencendo);
    // E os valores de verdade, pra o teste não passar com os dois errados juntos.
    expect(numeros.vendas).toBe(620);
    expect(numeros.lucro).toBe(620 - 50 - 140);
    expect(numeros.ticket).toBe(310);
    expect(numeros.contasVencendo).toBe(100);
    expect(numeros.osAbertas).toBe(2);
    expect(numeros.diferencaCaixa).toBeNull();
  });

  it("dia: só os lançamentos de hoje", () => {
    const numeros = numerosDoResumoDono({
      periodo: "dia",
      referencia: HOJE,
      hoje: HOJE,
      movimentos: MOVIMENTOS,
      custoDaOrdem: CUSTOS,
      ordens: ORDENS,
      contas: CONTAS,
      podeVer: TUDO,
    });
    expect(numeros.vendas).toBe(500);
    expect(numeros.lucro).toBe(500 - 50 - 100);
    expect(numeros.ticket).toBe(500);
  });

  it("fechamento: a diferença é a mesma de diferencaDoFechamento, com o sinal certo", () => {
    for (const [esperado, contado] of [
      [500, 480],
      [500, 512.5],
      [500, 500],
    ]) {
      const numeros = numerosDoResumoDono({
        periodo: "dia",
        referencia: HOJE,
        hoje: HOJE,
        movimentos: MOVIMENTOS,
        custoDaOrdem: CUSTOS,
        ordens: ORDENS,
        contas: CONTAS,
        podeVer: TUDO,
        diferencaCaixa: diferencaDoFechamento(esperado, contado),
      });
      expect(numeros.diferencaCaixa).toBe(diferencaDoFechamento(esperado, contado));
    }
  });

  it("sem Contas a Pagar a linha some; sem OS, a das OS some", () => {
    const numeros = numerosDoResumoDono({
      periodo: "mes",
      referencia: HOJE,
      hoje: HOJE,
      movimentos: MOVIMENTOS,
      custoDaOrdem: CUSTOS,
      ordens: ORDENS,
      contas: CONTAS,
      podeVer: pode("caixa"),
    });
    expect(numeros.contasVencendo).toBeNull();
    expect(numeros.osAbertas).toBeNull();
    expect(numeros.vendas).toBe(620);
  });

  it("sem Caixa e sem Relações, recebido, lucro e ticket ficam de fora (nunca R$ 0,00)", () => {
    const numeros = numerosDoResumoDono({
      periodo: "mes",
      referencia: HOJE,
      hoje: HOJE,
      movimentos: [],
      custoDaOrdem: CUSTOS,
      ordens: ORDENS,
      contas: CONTAS,
      podeVer: pode("contas_pagar"),
    });
    expect(numeros.vendas).toBeNull();
    expect(numeros.lucro).toBeNull();
    expect(numeros.ticket).toBeNull();
    expect(numeros.contasVencendo).toBe(100);
  });
});

describe("textoResumoDono", () => {
  const cheio = {
    vendas: 620,
    lucro: 430,
    ticket: 310,
    osAbertas: 2,
    contasVencendo: 100,
    diferencaCaixa: null,
  };

  it("monta o texto padrão com todos os números", () => {
    const texto = textoResumoDono({ loja: "Loja Centro", periodo: "este mês (01/11 a 11/11/2026)", numeros: cheio });
    expect(texto).toContain("Loja Centro");
    expect(texto).toContain("este mês (01/11 a 11/11/2026)");
    expect(texto).toContain("Recebido: R$\u00a0620,00");
    expect(texto).toContain("Lucro: R$\u00a0430,00");
    expect(texto).toContain("Ticket médio: R$\u00a0310,00");
    expect(texto).toContain("OS abertas: 2");
    expect(texto).toMatch(/Contas a pagar.*R\$\u00a0100,00/);
    // Sem fechamento, a linha da diferença não aparece.
    expect(texto).not.toMatch(/caixa:/i);
    expect(texto).not.toContain("{");
  });

  it("linha que a pessoa não pode ver SOME (não vira R$ 0,00 nem —)", () => {
    const texto = textoResumoDono({
      loja: "Loja Centro",
      periodo: "hoje",
      numeros: { ...cheio, contasVencendo: null, osAbertas: null },
    });
    expect(texto).not.toMatch(/Contas a pagar/);
    expect(texto).not.toMatch(/OS abertas/);
    expect(texto).not.toContain("—");
    expect(texto).not.toContain("R$\u00a00,00");
    expect(texto).toContain("Recebido: R$\u00a0620,00");
  });

  it("diferença do fechamento: faltou, sobrou e bateu", () => {
    const comDiferenca = (d: number) =>
      textoResumoDono({ loja: "L", periodo: "dia 10/11/2026", numeros: { ...cheio, diferencaCaixa: d } });
    expect(comDiferenca(-20)).toContain("Fechamento do caixa: faltaram R$\u00a020,00");
    expect(comDiferenca(12.5)).toContain("Fechamento do caixa: sobraram R$\u00a012,50");
    expect(comDiferenca(0)).toContain("Fechamento do caixa: bateu certinho");
  });

  it("usa o modelo editado pela loja, e tira a linha do marcador escondido mesmo no texto dela", () => {
    const texto = textoResumoDono({
      loja: "L",
      periodo: "hoje",
      numeros: { ...cheio, lucro: null },
      modelo: "Oi chefe! {periodo}\nGanhamos {lucro} hoje\nEntrou {vendas}",
    });
    expect(texto).toBe("Oi chefe! hoje\nEntrou R$\u00a0620,00");
  });
});

describe("periodoDoResumo", () => {
  it("dia e mês, com as datas no formato do Brasil", () => {
    expect(periodoDoResumo("dia", HOJE, HOJE)).toBe("hoje (11/11/2026)");
    expect(periodoDoResumo("mes", HOJE, HOJE)).toBe("este mês (01/11 a 11/11/2026)");
    // Um dia que já passou (fechamento feito na manhã seguinte).
    expect(periodoDoResumo("dia", new Date(2026, 10, 10), HOJE)).toBe("dia 10/11/2026");
  });
});

describe("montarUrlWhatsapp sem número (#397)", () => {
  it("abre a escolha de contato: https://wa.me/?text=… com o texto codificado", () => {
    const url = montarUrlWhatsapp(null, "Resumo & lucro: R$ 10,00\nOK?");
    expect(url).toBe(`https://wa.me/?text=${encodeURIComponent("Resumo & lucro: R$ 10,00\nOK?")}`);
    expect(url).toContain("%26");
    expect(url).toContain("%0A");
    expect(new URL(url).hostname).toBe("wa.me");
  });
});
