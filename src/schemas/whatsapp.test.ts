import { describe, expect, it } from "vitest";
import {
  linkAvaliacaoSchema,
  modeloPorChave,
  montarTextoAvaliacao,
  montarUrlWhatsapp,
  preencherModelo,
  telefoneParaWhatsapp,
} from "./whatsapp";

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
