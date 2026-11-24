/**
 * A peça comum de gráfico de Relações (#1086). Quem monta a página importa
 * daqui: o molde do cartão, a tabela, os 6 desenhos e, se precisar de um
 * gráfico novo, as peças (escala, eixos, dica com teclado).
 */
export { CartaoDeGrafico } from "./CartaoDeGrafico";
export { TabelaDoGrafico, type ColunaDaTabela, type LinhaDaTabela } from "./TabelaDoGrafico";
export { GraficoMesAcumulado } from "./GraficoMesAcumulado";
export { GraficoPonte, type DegrauDaPonte } from "./GraficoPonte";
export { GraficoRanking, type LinhaDoRanking } from "./GraficoRanking";
export { GraficoPareto, type GrupoDaCurva, type ItemDaCurva, type LetraDaCurva } from "./GraficoPareto";
export { GraficoDegraus, type DiaDoFluxo } from "./GraficoDegraus";
export { GraficoColunasPorDia, type ColunaDoDia } from "./GraficoColunasPorDia";
export { caminhoEmDegraus, caminhoReto, escalaLinear, marcasDoEixo, temCurva, type Ponto } from "./escala";
export { AnelDeFoco, AreaDoGrafico, CaixaDaDica, EixoX, EixoY, Grade, Legenda, LinhaDeReferencia, RotuloDireto } from "./partes";
export { COR, comSinal } from "./tema";
export { useLargura } from "./useLargura";
export { useMarcasNavegaveis } from "./useMarcasNavegaveis";
