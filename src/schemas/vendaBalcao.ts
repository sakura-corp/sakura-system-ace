import { z } from "zod";
import {
  acharPorCodigoExato,
  pecaCasaComBusca,
  type PecaBuscavel,
} from "./estoque";
import { problemaDoItem, totalItensFormulario, type ItemFormValues } from "./ordemServico";
import { CLIENTE_CONSUMIDOR_ID, ehConsumidor } from "@/types/cliente";
import type { ItemOS, NovoItemOS } from "@/types/os";

/**
 * Venda de balcão (item FN-09 do guia, migration 0064): vender uma peça pra
 * quem não vai deixar o carro, numa tela só.
 *
 * O que mora aqui, e não na tela, é tudo que dá pra errar em silêncio — a
 * conta do total, o "passar o leitor duas vezes soma 2", o que conta como
 * item válido e quando a venda pode ficar "a receber". É a regra de sempre
 * deste projeto (PROJETO_STATUS.md, seção 6, item 40): conta refeita em cada
 * tela acaba divergindo.
 *
 * A venda só tem PEÇA, de propósito: serviço pede NFS-e, e NFS-e pede um
 * tomador identificado, com município — é o mundo da OS. O que a venda de
 * balcão emite é NFC-e.
 */

const itemVendaSchema = z.object({
  peca_id: z.string(),
  descricao: z.string(),
  quantidade: z.string(),
  preco_unitario: z.string(),
  desconto: z.string(),
});

export type ItemVendaValues = z.infer<typeof itemVendaSchema>;

const paraNumero = (valor: string): number => {
  const numero = Number(valor);
  return Number.isNaN(numero) ? 0 : numero;
};

export const vendaBalcaoFormSchema = z
  .object({
    cliente_id: z.string().min(1, "Escolha o cliente (ou deixe o Consumidor)."),
    vendedor_id: z.string(),
    itens: z.array(itemVendaSchema),
  })
  .superRefine((venda, ctx) => {
    if (venda.itens.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Passe o leitor ou procure uma peça pra começar a venda.",
        path: ["itens"],
      });
      return;
    }
    venda.itens.forEach((item, indice) => {
      if (paraNumero(item.quantidade) <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "A quantidade precisa ser maior que zero.",
          path: ["itens", indice, "quantidade"],
        });
        return;
      }
      // A mesma regra das travas do banco (migration 0060) — avisar aqui,
      // em português, é melhor que o banco recusar o item depois.
      const problema = problemaDoItem({
        quantidade: paraNumero(item.quantidade),
        preco_unitario: paraNumero(item.preco_unitario),
        desconto: paraNumero(item.desconto),
      });
      if (problema) {
        ctx.addIssue({ code: "custom", message: problema, path: ["itens", indice, "desconto"] });
      }
    });
  });

export type VendaBalcaoFormValues = z.infer<typeof vendaBalcaoFormSchema>;

/** Toda venda começa no Consumidor, com o vendedor sendo quem está logado. */
export function vendaVazia(funcionarioAtualId: string): VendaBalcaoFormValues {
  return { cliente_id: CLIENTE_CONSUMIDOR_ID, vendedor_id: funcionarioAtualId, itens: [] };
}

interface PecaDaVenda extends PecaBuscavel {
  id: string;
  preco_venda: number | null;
}

/**
 * Põe a peça na venda. Se ela já está lá, soma 1 na quantidade em vez de
 * criar outra linha: passar o leitor duas vezes no mesmo pneu é o jeito
 * natural de vender dois, e duas linhas iguais na nota só confundem.
 */
export function incluirPeca(itens: ItemVendaValues[], peca: PecaDaVenda): ItemVendaValues[] {
  const indice = itens.findIndex((item) => item.peca_id === peca.id);
  if (indice >= 0) {
    return itens.map((item, i) =>
      i === indice ? { ...item, quantidade: String(paraNumero(item.quantidade) + 1) } : item,
    );
  }
  return [
    ...itens,
    {
      peca_id: peca.id,
      descricao: peca.descricao,
      quantidade: "1",
      preco_unitario: peca.preco_venda ? String(peca.preco_venda) : "",
      desconto: "",
    },
  ];
}

/**
 * O que acontece com o Enter no campo de busca: com o código exato (é o
 * leitor de código de barras), ou com uma peça só na busca, ela entra
 * direto. Com várias, nada entra — a lista aparece pra pessoa escolher, que é
 * a mesma regra da lista de Produtos (nunca chutar entre duas parecidas).
 */
export function pecaDoEnter<T extends PecaDaVenda>(pecas: T[], termo: string): T | null {
  const exata = acharPorCodigoExato(pecas, termo);
  if (exata) return exata;
  const casaram = buscarPecasDaVenda(pecas, termo, 2);
  return casaram.length === 1 ? casaram[0] : null;
}

/** As peças que aparecem embaixo do campo enquanto a pessoa digita. */
export function buscarPecasDaVenda<T extends PecaBuscavel>(
  pecas: T[],
  termo: string,
  limite = 8,
): T[] {
  if (termo.trim() === "") return [];
  return pecas.filter((peca) => pecaCasaComBusca(peca, termo)).slice(0, limite);
}

function comoItemDoFormulario(item: ItemVendaValues): ItemFormValues {
  // Venda de balcão não tem peça avulsa (#655): o custo fica sempre vazio.
  return { ...item, tipo: "peca", servico_id: "", tecnico_id: "", custo_unitario: "" };
}

/**
 * Total da venda. Reaproveita a conta dos itens da OS em vez de somar de
 * novo: é a mesma linha (quantidade × preço − desconto), e uma segunda
 * versão dessa conta seria mais um lugar pra divergir.
 */
export function totalDaVenda(itens: ItemVendaValues[]): number {
  return totalItensFormulario(itens.map(comoItemDoFormulario));
}

export function totalDoItem(item: ItemVendaValues): number {
  return totalDaVenda([item]);
}

export function paraItensDaVenda(itens: ItemVendaValues[]): NovoItemOS[] {
  return itens
    .filter((item) => item.peca_id && paraNumero(item.quantidade) > 0)
    .map((item) => ({
      tipo: "peca",
      peca_id: item.peca_id,
      servico_id: null,
      tecnico_id: null,
      descricao: item.descricao.trim(),
      quantidade: paraNumero(item.quantidade),
      preco_unitario: paraNumero(item.preco_unitario),
      desconto: paraNumero(item.desconto),
    }));
}

/**
 * Os itens com cara de item gravado — é o que a tela de pagamento
 * (FaturamentoCard) sabe somar. Ela só olha quantidade, preço e desconto;
 * os ids em branco não vão pra lugar nenhum.
 */
export function comoItensDaOrdem(itens: NovoItemOS[]): ItemOS[] {
  return itens.map((item, indice) => ({ ...item, id: `novo-${indice}`, ordem_servico_id: "" }));
}

/**
 * Venda no Consumidor não pode ficar "a receber depois": não há de quem
 * cobrar, e a conta a receber nasceria no nome de "ninguém". Pra vender
 * fiado, escolhe-se o cliente de verdade.
 */
export function podeReceberDepois(clienteId: string): boolean {
  return !ehConsumidor(clienteId);
}
