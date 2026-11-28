import type { Dre, LinhaDre, ValorDoMesDre } from "@/schemas/dre";

// Um DRE montado à mão (dados inventados) pros testes de tela e de documento:
// não depende da `montarDre` real.

export function valor(v: number, extra: Partial<ValorDoMesDre> = {}): ValorDoMesDre {
  return { valor: v, sobreReceita: 10, sobreResultadoBruto: 20, naoInformado: false, parcial: false, ...extra };
}

export function linha(
  chave: string,
  rotulo: string,
  sinal: LinhaDre["sinal"],
  v: number,
  filhas: LinhaDre[] = [],
  extra: Partial<ValorDoMesDre> = {},
): LinhaDre {
  return { chave, rotulo, sinal, colunas: [valor(v, extra), valor(v, extra), valor(v * 2, extra)], filhas };
}

/** Dois meses (out/26 e nov/26) mais o total. */
export function dreDeExemplo(trocas: Partial<Dre> = {}): Dre {
  return {
    meses: ["2026-10", "2026-11"],
    linhas: [
      linha("receita_bruta", "Receita bruta", "+", 1000),
      linha("taxa_maquininha", "Taxa da maquininha", "-", 0, [], { naoInformado: true }),
      linha("resultado_bruto", "Resultado bruto", "=", 600),
      linha("despesas_operacionais", "Despesas operacionais", "-", 300, [
        linha("despesas_pessoal", "Pessoal", "-", 200, [linha("categoria:c1", "Salário <fixo>", "-", 200)]),
        linha("despesas_gerais", "Gerais", "-", 100),
      ]),
      linha("resultado_mes", "Resultado do mês", "=", 300),
    ],
    semGrupo: { quantidade: 0, total: 0 },
    foraDoResultado: { quantidade: 0, total: 0 },
    devolucoesDeOs: { quantidade: 0, total: 0 },
    algumCustoNaoInformado: false,
    ...trocas,
  };
}
