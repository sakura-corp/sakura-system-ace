import { z } from "zod";
import type {
  ItemOS,
  NovaOrdemServico,
  NovoItemOS,
  OrdemServico,
  PatchItemOS,
  PatchOrdemServico,
} from "@/types/os";
import { totalPorTipo } from "@/types/os";

// Mesma ideia dos outros schemas: formulário trabalha só com strings (mesmo
// pros campos number | null no banco) — a conversão pra NovaOrdemServico/
// PatchOrdemServico/NovoItemOS acontece só na borda. IDs opcionais (veiculo,
// peca, servico, tecnico, vendedor) usam string vazia como "nenhum" — mesma
// convenção do `categoria_id` em PecaForm — não `null`, pra registrar em
// selects sem precisar de sentinela especial.
const itemFormSchema = z.object({
  tipo: z.enum(["peca", "servico"]),
  peca_id: z.string(),
  servico_id: z.string(),
  tecnico_id: z.string(),
  descricao: z.string(),
  quantidade: z.string(),
  preco_unitario: z.string(),
  desconto: z.string(),
});

export const ordemServicoFormSchema = z.object({
  cliente_id: z.string().min(1, "Selecione um cliente."),
  veiculo_id: z.string(),
  km_entrada: z.string(),
  descricao_problema: z.string(),
  vendedor_id: z.string(),
  // Só o orçamento usa (#379): dia "AAAA-MM-DD" até quando ele vale. Na OS
  // fica "" e nunca vai pro banco (`paraCamposComuns` não leva).
  validade: z.string(),
  itens: z.array(itemFormSchema),
});

export type OrdemServicoFormValues = z.infer<typeof ordemServicoFormSchema>;
export type ItemFormValues = OrdemServicoFormValues["itens"][number];

export const itemFormVazio: ItemFormValues = {
  tipo: "peca",
  peca_id: "",
  servico_id: "",
  tecnico_id: "",
  descricao: "",
  quantidade: "1",
  preco_unitario: "",
  desconto: "",
};

export function paraValoresFormulario(
  ordemExistente: OrdemServico | undefined,
  funcionarioAtualId: string,
): OrdemServicoFormValues {
  return {
    cliente_id: ordemExistente?.cliente_id ?? "",
    veiculo_id: ordemExistente?.veiculo_id ?? "",
    km_entrada: ordemExistente?.km_entrada != null ? String(ordemExistente.km_entrada) : "",
    descricao_problema: ordemExistente?.descricao_problema ?? "",
    vendedor_id: ordemExistente?.vendedor_id ?? funcionarioAtualId,
    validade: ordemExistente?.validade ?? "",
    itens: ordemExistente ? [] : [itemFormVazio],
  };
}

export function paraCamposComuns(
  valores: OrdemServicoFormValues,
): NovaOrdemServico & PatchOrdemServico {
  return {
    cliente_id: valores.cliente_id,
    veiculo_id: valores.veiculo_id || null,
    km_entrada: valores.km_entrada.trim() === "" ? null : Number(valores.km_entrada),
    descricao_problema: valores.descricao_problema.trim() || null,
    vendedor_id: valores.vendedor_id || null,
  };
}

const paraNumero = (valor: string): number => {
  const numero = Number(valor);
  return Number.isNaN(numero) ? 0 : numero;
};

export function paraItensValidos(itens: ItemFormValues[]): NovoItemOS[] {
  return itens
    .filter((item) => item.descricao.trim() && paraNumero(item.quantidade) > 0)
    .map((item) => ({
      tipo: item.tipo,
      peca_id: item.peca_id || null,
      servico_id: item.servico_id || null,
      tecnico_id: item.tecnico_id || null,
      descricao: item.descricao,
      quantidade: paraNumero(item.quantidade),
      preco_unitario: paraNumero(item.preco_unitario),
      desconto: paraNumero(item.desconto),
    }));
}

/**
 * O que torna um item de OS impossível: preço ou desconto negativo, ou
 * desconto maior que a própria linha (que deixaria a linha negativa e
 * derrubaria a nota fiscal — §6 item 60). É a MESMA regra das travas
 * `ck_ordens_servico_itens_*` do banco (migration 0060): aqui ela só avisa
 * antes, em português, em vez de o banco recusar depois.
 *
 * @returns a frase do problema, ou `null` se o item está bom
 */
export function problemaDoItem(
  item: Pick<NovoItemOS, "quantidade" | "preco_unitario" | "desconto">,
): string | null {
  if (item.preco_unitario < 0) return "O preço não pode ser negativo.";
  if (item.desconto < 0) return "O desconto não pode ser negativo.";
  const linha = item.quantidade * item.preco_unitario;
  if (item.desconto > Math.max(linha, 0) + 1e-9) {
    return "O desconto não pode ser maior que o valor do item (quantidade × preço).";
  }
  return null;
}

// Corrigir um item já lançado usa um formulário próprio, de um item só
// (`ItemExistenteRow`), fora do formulário grande da OS. A diferença é que
// aqui não dá pra "descartar linha vazia" como `paraItensValidos` faz: se
// faltar descrição ou quantidade, a correção precisa reclamar na tela em vez
// de sumir com o item.
export const itemExistenteFormSchema = itemFormSchema
  .refine((item) => item.descricao.trim().length > 0, {
    message: "Descreva a peça ou o serviço.",
    path: ["descricao"],
  })
  .refine((item) => paraNumero(item.quantidade) > 0, {
    message: "A quantidade precisa ser maior que zero.",
    path: ["quantidade"],
  })
  .superRefine((item, ctx) => {
    const problema = problemaDoItem({
      quantidade: paraNumero(item.quantidade),
      preco_unitario: paraNumero(item.preco_unitario),
      desconto: paraNumero(item.desconto),
    });
    if (problema) ctx.addIssue({ code: "custom", message: problema, path: ["desconto"] });
  });

export function paraValoresItemExistente(item: ItemOS): ItemFormValues {
  return {
    tipo: item.tipo,
    peca_id: item.peca_id ?? "",
    servico_id: item.servico_id ?? "",
    tecnico_id: item.tecnico_id ?? "",
    descricao: item.descricao,
    quantidade: String(item.quantidade),
    preco_unitario: paraDisplayNumero(item.preco_unitario),
    desconto: paraDisplayNumero(item.desconto),
  };
}

export function paraPatchItem(valores: ItemFormValues): PatchItemOS {
  return {
    tipo: valores.tipo,
    peca_id: valores.peca_id || null,
    servico_id: valores.servico_id || null,
    tecnico_id: valores.tecnico_id || null,
    descricao: valores.descricao.trim(),
    quantidade: paraNumero(valores.quantidade),
    preco_unitario: paraNumero(valores.preco_unitario),
    desconto: paraNumero(valores.desconto),
  };
}

export function totalItensFormulario(itens: ItemFormValues[]): number {
  return itens.reduce(
    (total, item) =>
      total + paraNumero(item.quantidade) * paraNumero(item.preco_unitario) - paraNumero(item.desconto),
    0,
  );
}

export interface TotaisOrdem {
  pecas: number;
  servicos: number;
  total: number;
}

/**
 * O que a barra de total do rodapé mostra: peças, serviços e o total geral,
 * juntando o que já está lançado na OS com o que está sendo digitado agora.
 *
 * Mora aqui, e não na tela, pelo motivo de sempre (PROJETO_STATUS.md, seção
 * 6, item 40): a mesma conta refeita em cada tela sempre acabou divergindo.
 * Repare que ela reaproveita `totalPorTipo` (itens já gravados)
 * e `totalItensFormulario` (itens em digitação) em vez de somar de novo por
 * conta própria — assim o rodapé nunca discorda do total que a lista de OS
 * mostra.
 */
export function totaisDaOrdem(
  itensExistentes: ItemOS[],
  itensFormulario: ItemFormValues[],
): TotaisOrdem {
  const doFormulario = (tipo: ItemFormValues["tipo"]) =>
    totalItensFormulario(itensFormulario.filter((item) => item.tipo === tipo));

  const pecas = totalPorTipo(itensExistentes, "peca") + doFormulario("peca");
  const servicos = totalPorTipo(itensExistentes, "servico") + doFormulario("servico");

  return {
    pecas,
    servicos,
    // Soma dos dois, e não uma terceira varredura dos itens: qualquer item
    // é peça ou serviço, então um total calculado à parte só criaria mais um
    // lugar pra divergir.
    total: pecas + servicos,
  };
}

// Mesmo truque visual de antes: 0 mostra campo vazio (não "0" travado no
// meio da digitação) — só importa pro auto-preenchimento de preço ao
// escolher uma peça/serviço do catálogo.
export function paraDisplayNumero(valor: number): string {
  return valor ? valor.toString() : "";
}

// ---------------------------------------------------------------------------
// Costura do nome de vendedor e técnico (TR-04.3, migration 0056)
// ---------------------------------------------------------------------------
// Antes, os dois nomes vinham por join embutido em `funcionarios`. A tabela
// passou a exigir a permissão do módulo, e um join embutido numa tabela
// fechada não dá erro: devolve `null`, e o "técnico: Fulano" some da tela do
// balconista sem nada explicando. Os nomes agora vêm da view pública, e estas
// duas funções são o antes e o depois dessa consulta — puras, pra poderem ser
// testadas sem banco.

/** Quem precisa ser nomeado nestas ordens: vendedor da OS e técnico do item. */
export function idsDeFuncionarios(ordens: OrdemServico[]): string[] {
  const ids = new Set<string>();
  for (const ordem of ordens) {
    if (ordem.vendedor_id) ids.add(ordem.vendedor_id);
    for (const item of ordem.itens ?? []) {
      if (item.tecnico_id) ids.add(item.tecnico_id);
    }
  }
  return [...ids];
}

/**
 * Preenche `ordem.vendedor` e `item.tecnico` a partir do mapa de nomes.
 *
 * Id sem nome no mapa vira `null`, nunca um nome inventado nem um objeto com
 * texto vazio: é o que acontece se o funcionário for de outra loja, e ali
 * "não sei quem é" é a resposta honesta — a tela já sabe mostrar o travessão.
 */
export function nomearFuncionarios(
  ordens: OrdemServico[],
  nomes: Map<string, string>,
): OrdemServico[] {
  const nomear = (id: string | null) => {
    const nome = id ? nomes.get(id) : undefined;
    return nome ? { nome } : null;
  };

  return ordens.map((ordem) => ({
    ...ordem,
    vendedor: nomear(ordem.vendedor_id),
    itens: ordem.itens?.map((item) => ({ ...item, tecnico: nomear(item.tecnico_id) })),
  }));
}
