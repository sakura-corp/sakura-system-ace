import { z } from "zod";
import { somar } from "./dinheiro";
import type { MovimentoCaixa, NovoMovimentoCaixa, TipoCaixa } from "@/types/caixa";

export const caixaFormSchema = z.object({
  tipo: z.enum(["entrada", "saida"]),
  // Obrigatória desde o item TL-27 do guia. Era opcional, e o resultado
  // aparecia na própria tela de Saídas: "Por categoria — Sem categoria:
  // R$ 31.000,00", o mês inteiro de despesa num balde só. Categoria opcional
  // é, na prática, relatório por categoria que não existe.
  //
  // Quem não souber onde encaixar escolhe "Outros", que a migration 0050
  // semeia pros dois tipos justamente pra esta regra ser sempre cumprível.
  categoria_id: z.string().min(1, "Escolha uma categoria."),
  valor: z.string().refine((v) => Number(v) > 0, "Informe um valor maior que zero."),
  forma_pagamento: z.string(),
  descricao: z.string(),
});

export type CaixaFormValues = z.infer<typeof caixaFormSchema>;

export function caixaFormVazio(tipoInicial: "entrada" | "saida"): CaixaFormValues {
  return {
    tipo: tipoInicial,
    categoria_id: "",
    valor: "",
    forma_pagamento: "dinheiro",
    descricao: "",
  };
}

export function paraNovoMovimentoCaixa(valores: CaixaFormValues): NovoMovimentoCaixa {
  return {
    ordem_servico_id: null,
    tipo: valores.tipo,
    forma_pagamento: valores.forma_pagamento || null,
    valor: Number(valores.valor),
    descricao: valores.descricao.trim() || null,
    categoria_id: valores.categoria_id || null,
  };
}

/**
 * Lançamento manual é o que NÃO nasceu de uma OS faturada.
 *
 * O faturamento de uma OS entra no caixa sem categoria e assim deve ficar —
 * ele é venda, aparece na aba Diário, e não é despesa nem entrada avulsa pra
 * classificar. Por isso tudo nesta parte do módulo (as abas Entradas e
 * Saídas, o bloco "Por categoria" e o conserto do histórico abaixo) olha
 * sempre para o mesmo recorte: `ordem_servico_id` nulo.
 *
 * Os lançamentos que a conta a pagar/receber gera AO SER quitada entram aqui
 * de propósito — eles herdam a categoria da conta, que também é opcional, e
 * quando ela vem vazia o lançamento fica sem categoria do mesmo jeito.
 */
export function movimentosManuais(
  movimentos: readonly MovimentoCaixa[],
  tipo: TipoCaixa,
): MovimentoCaixa[] {
  return movimentos.filter((m) => m.tipo === tipo && !m.ordem_servico_id);
}

/**
 * O passado a consertar: os manuais daquele tipo que ficaram sem categoria.
 *
 * Tornar a categoria obrigatória conserta só o futuro. Sem oferecer o
 * conserto do histórico, o relatório por categoria continua errado pra
 * sempre — os R$ 31.000,00 já lançados não se movem sozinhos.
 */
export function movimentosSemCategoria(
  movimentos: readonly MovimentoCaixa[],
  tipo: TipoCaixa,
): MovimentoCaixa[] {
  return movimentosManuais(movimentos, tipo).filter((m) => !m.categoria_id);
}

export interface ResumoSemCategoria {
  quantidade: number;
  total: number;
}

/** Quantos lançamentos estão sem categoria e quanto dinheiro eles somam. */
export function resumirSemCategoria(
  movimentos: readonly MovimentoCaixa[],
  tipo: TipoCaixa,
): ResumoSemCategoria {
  const semCategoria = movimentosSemCategoria(movimentos, tipo);
  return {
    quantidade: semCategoria.length,
    total: somar(semCategoria.map((m) => m.valor)),
  };
}

export interface GrupoDeCategoria {
  categoriaId: string;
  ids: string[];
}

/**
 * Junta as escolhas por categoria, pra gravar em poucas chamadas em vez de
 * uma por linha — trinta lançamentos viram duas ou três atualizações.
 *
 * Linha deixada em branco fica de fora: quem não soube classificar um
 * lançamento agora continua podendo classificar depois, e nada é gravado por
 * acidente.
 */
export function agruparPorCategoria(
  atribuicoes: Readonly<Record<string, string>>,
): GrupoDeCategoria[] {
  const grupos = new Map<string, string[]>();

  for (const [movimentoId, categoriaId] of Object.entries(atribuicoes)) {
    if (!categoriaId) continue;
    const ids = grupos.get(categoriaId);
    if (ids) ids.push(movimentoId);
    else grupos.set(categoriaId, [movimentoId]);
  }

  return [...grupos.entries()].map(([categoriaId, ids]) => ({ categoriaId, ids }));
}

/**
 * Quanto cada categoria soma (Caixa → Entradas/Saídas), da maior pra menor.
 * Saiu da tela na #875; a conta é a mesma de antes (soma direta, sem
 * arredondar por categoria — a tela formata no centavo).
 */
export function totaisPorCategoria(
  movimentos: readonly Pick<MovimentoCaixa, "valor" | "categoria">[],
): [string, number][] {
  const mapa = new Map<string, number>();
  for (const m of movimentos) {
    const nome = m.categoria?.nome ?? "Sem categoria";
    mapa.set(nome, (mapa.get(nome) ?? 0) + m.valor);
  }
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}
