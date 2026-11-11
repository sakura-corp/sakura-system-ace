import { deCentavos, paraCentavos } from "./dinheiro";
import type { LinhaLucro, LinhaLucroCliente, LucratividadePorCliente } from "./lucratividade";

/**
 * Relações → Curva ABC (#390): classifica peças, serviços e clientes em A, B
 * e C pelo quanto rendem no período. A são os poucos que fazem a maior parte;
 * C, os muitos que quase não pesam.
 *
 * A conta de cada linha (venda, custo, lucro) NÃO mora aqui: vem pronta de
 * `lucratividade.ts`. Aqui é só ordenar, acumular e dar a letra.
 */

/**
 * Os cortes da curva, em % do acumulado: A até 80%, B até 95%, C o resto.
 * Um lugar só — quem quiser outro corte muda aqui.
 */
export const CORTES_ABC = { A: 80, B: 95 } as const;

export type LetraABC = "A" | "B" | "C";

export interface CortesABC {
  A: number;
  B: number;
}

export interface LinhaABC<T> {
  linha: T;
  letra: LetraABC;
  /** O valor que classificou a linha (venda ou lucro). `null` = fora da conta. */
  valor: number | null;
  /** Quanto esta linha pesa no total, em % (0 a 100). `null` quando fora da conta. */
  participacao: number | null;
  /** A soma da participação até esta linha, em %. A última chega a 100. */
  acumulada: number | null;
  /**
   * A linha não entrou no acumulado: valor zero, negativo ou `null` (no lucro,
   * a peça avulsa sem custo informado — o lucro dela seria inventado). Vai pro
   * C, no fim da lista.
   */
  foraDaConta: boolean;
}

export interface CurvaABC<T> {
  /** Do maior pro menor; as fora da conta no fim. */
  linhas: LinhaABC<T>[];
  /** Soma dos valores que entraram no acumulado. */
  total: number;
}

/**
 * Ordena do maior pro menor e dá a letra pelo acumulado ANTES da linha: ela
 * é A se o que vem antes ainda não chegou ao corte do A, e assim por diante.
 * Com isso o primeiro é sempre A (mesmo com 90% sozinho), e o A é o menor
 * grupo que alcança 80%.
 *
 * Empate: valores iguais ficam na mesma letra (a de cima), pra ordem entre
 * iguais não decidir nada. Entre iguais, a ordem da lista sai pelo `chave`
 * (o nome, por padrão: `String(linha)`), só pra tela não pular.
 *
 * A conta é em centavos inteiros: o 0,1 + 0,2 não vira 0,30000000000000004
 * e a última linha fecha em 100% exatos.
 */
export function classificarABC<T>(
  linhas: readonly T[],
  valorDe: (linha: T) => number | null,
  cortes: CortesABC = CORTES_ABC,
  chave: (linha: T) => string = nomeDaLinha,
): CurvaABC<T> {
  const comValor = linhas.map((linha) => {
    const bruto = valorDe(linha);
    const centavos = bruto === null || !Number.isFinite(bruto) ? null : paraCentavos(bruto);
    return { linha, centavos, foraDaConta: centavos === null || centavos <= 0 };
  });

  const ordemDosIguais = (a: (typeof comValor)[number], b: (typeof comValor)[number]) =>
    chave(a.linha).localeCompare(chave(b.linha), "pt-BR");

  const dentro = comValor
    .filter((l) => !l.foraDaConta)
    .sort((a, b) => (b.centavos ?? 0) - (a.centavos ?? 0) || ordemDosIguais(a, b));
  // Fora da conta: o lucro menos ruim primeiro; sem valor (null) no fim.
  const fora = comValor
    .filter((l) => l.foraDaConta)
    .sort(
      (a, b) =>
        (b.centavos ?? Number.NEGATIVE_INFINITY) - (a.centavos ?? Number.NEGATIVE_INFINITY) ||
        ordemDosIguais(a, b),
    );

  const totalCentavos = dentro.reduce((soma, l) => soma + (l.centavos ?? 0), 0);

  let acumuladoCentavos = 0;
  let anterior: { centavos: number; letra: LetraABC } | null = null;
  const classificadas: LinhaABC<T>[] = dentro.map(({ linha, centavos }) => {
    const valor = centavos ?? 0;
    // Comparação em inteiros: antes × 100 < corte × total.
    const antes = acumuladoCentavos * 100;
    let letra: LetraABC =
      antes < cortes.A * totalCentavos ? "A" : antes < cortes.B * totalCentavos ? "B" : "C";
    if (anterior && anterior.centavos === valor) letra = anterior.letra;
    acumuladoCentavos += valor;
    anterior = { centavos: valor, letra };
    return {
      linha,
      letra,
      valor: deCentavos(valor),
      participacao: (valor * 100) / totalCentavos,
      acumulada: (acumuladoCentavos * 100) / totalCentavos,
      foraDaConta: false,
    };
  });

  const foraClassificadas: LinhaABC<T>[] = fora.map(({ linha, centavos }) => ({
    linha,
    letra: "C",
    valor: centavos === null ? null : deCentavos(centavos),
    participacao: null,
    acumulada: null,
    foraDaConta: true,
  }));

  return {
    linhas: [...classificadas, ...foraClassificadas],
    total: deCentavos(totalCentavos),
  };
}

function nomeDaLinha(linha: unknown): string {
  if (linha && typeof linha === "object") {
    const comNome = linha as { nome?: unknown; descricao?: unknown };
    if (typeof comNome.nome === "string") return comNome.nome;
    if (typeof comNome.descricao === "string") return comNome.descricao;
  }
  return String(linha);
}

/** Quantas linhas caíram em cada letra (o resumo no topo de cada lista). */
export function contarPorLetra<T>(curva: CurvaABC<T>): Record<LetraABC, number> {
  const contagem: Record<LetraABC, number> = { A: 0, B: 0, C: 0 };
  for (const linha of curva.linhas) contagem[linha.letra] += 1;
  return contagem;
}

/**
 * Por venda (o quanto entrou: "o que não pode faltar") ou por lucro (venda
 * menos custo: "o que vale a pena"). Decisão da Sofia na #390: as duas, com
 * a tela começando por venda.
 */
export type CriterioABC = "venda" | "lucro";

/**
 * O valor de uma linha no critério. No lucro, a linha com algum item sem
 * custo informado devolve `null` (fora da conta, no C): o lucro dela seria
 * inventado — o mesmo cuidado da Lucratividade (#655).
 */
function valorNoCriterio(criterio: CriterioABC) {
  return (linha: { receita: number; margem: number; custoNaoInformado: boolean }) =>
    criterio === "venda" ? linha.receita : linha.custoNaoInformado ? null : linha.margem;
}

export interface CurvasABC {
  pecas: CurvaABC<LinhaLucro>;
  servicos: CurvaABC<LinhaLucro>;
  clientes: CurvaABC<LinhaLucroCliente>;
  /**
   * A venda de balcão sem cliente escolhido, fora da classificação (#390,
   * pergunta 3). `valor` é `null` no lucro quando falta custo.
   */
  consumidor: { valor: number | null; custoNaoInformado: boolean } | null;
}

/** As três listas da aba, a partir do que a Lucratividade já calcula. */
export function curvasABC({
  porItem,
  porCliente,
  criterio,
}: {
  porItem: readonly LinhaLucro[];
  porCliente: LucratividadePorCliente;
  criterio: CriterioABC;
}): CurvasABC {
  const valorDe = valorNoCriterio(criterio);
  const { consumidor } = porCliente;
  return {
    pecas: classificarABC(porItem.filter((l) => l.tipo === "peca"), valorDe),
    servicos: classificarABC(porItem.filter((l) => l.tipo === "servico"), valorDe),
    clientes: classificarABC(porCliente.linhas, valorDe),
    consumidor: consumidor
      ? { valor: valorDe(consumidor), custoNaoInformado: consumidor.custoNaoInformado }
      : null,
  };
}
