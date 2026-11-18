/**
 * O texto da discriminação da NFS-e (#1040): o resumo da OS, uma linha por
 * serviço, e no fim a linha dos tributos aproximados quando a loja informa.
 *
 * Só vai o que já ia pra nota (a descrição de cada serviço), mais a
 * quantidade quando passa de 1 e o valor da linha. O valor só aparece quando
 * a soma das linhas dá exatamente o valor dos serviços da nota: um resumo que
 * não fecha com o total confunde quem lê. O total da nota não muda aqui.
 */

import { arredondarCentavo, paraCentavos } from "./dinheiro";
import { formatarQuantidade } from "./quantidade";
import { duasCasas } from "./tributosAproximados";
import { valorLiquidoDoItem } from "./valorItem";

/** A descrição da NFS-e Nacional aceita até 2000 caracteres. */
export const LIMITE_DISCRIMINACAO_NFSE = 2000;

export interface ServicoDaNota {
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
}

function cortar(texto: string, limite: number): string {
  if (texto.length <= limite) return texto;
  // Três pontos comuns, não o "…": o leiaute da nota aceita só o latim básico
  // e os acentos, e um caractere fora disso pode fazer a nota ser recusada.
  return `${texto.slice(0, Math.max(0, limite - 3)).trimEnd()}...`;
}

/** Uma linha por serviço, separadas por quebra de linha, no máximo no limite. */
export function resumoDosServicos(itens: readonly ServicoDaNota[], valorServicos: number): string {
  const valores = itens.map((item) => arredondarCentavo(valorLiquidoDoItem(item)));
  const somaCentavos = valores.reduce((soma, valor) => soma + paraCentavos(valor), 0);
  const mostrarValor = somaCentavos === paraCentavos(valorServicos);

  const linhas = itens.map((item, indice) => {
    const descricao = item.descricao.trim() || "Serviço";
    const quantidade = item.quantidade !== 1 ? `${formatarQuantidade(item.quantidade)} x ` : "";
    const valor = mostrarValor ? ` - R$ ${duasCasas(valores[indice])}` : "";
    return `${quantidade}${descricao}${valor}`;
  });
  return cortar(linhas.join("\n"), LIMITE_DISCRIMINACAO_NFSE);
}

/**
 * Junta o resumo e a linha dos tributos (no fim, numa linha nova). Se passar
 * do limite, quem é cortado é o resumo, nunca a linha dos tributos.
 */
export function discriminacaoComTributos(resumo: string, linhaTributos: string | null): string {
  if (!linhaTributos) return resumo;
  const espaco = LIMITE_DISCRIMINACAO_NFSE - linhaTributos.length - 1;
  return `${cortar(resumo, espaco)}\n${linhaTributos}`;
}
