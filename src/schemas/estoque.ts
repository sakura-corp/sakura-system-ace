import { diaLocal, diasEntre } from "@/lib/datas";
import type { MotivoMovimento, NovoMovimentoEstoque, TipoMovimento } from "@/types/estoque";

/**
 * O que o saldo de uma peça está dizendo — em um lugar só.
 *
 * Mora aqui, e não dentro da tela de Produtos, porque a MESMA pergunta
 * aparece em três lugares diferentes: a lista de Produtos (item TL-11 do
 * guia), o relatório de estoque e o lançamento de item numa OS. Este projeto
 * já viu quatro vezes o que acontece quando a mesma regra é reescrita em cada
 * tela — as três telas de lucro respondendo números diferentes pro mesmo dia
 * (PROJETO_STATUS.md, seção 6, itens 35, 40, 44 e 49). Regra de negócio
 * repetida é regra de negócio que diverge.
 */

export type SituacaoSaldo = "negativo" | "zerado" | "abaixo_do_minimo" | "normal";

export interface LeituraDeSaldo {
  situacao: SituacaoSaldo;
  /**
   * Quantas unidades faltam pra voltar ao mínimo — `null` quando não há
   * mínimo cadastrado ou quando o saldo já está acima dele. É o número que
   * responde "o que eu preciso comprar?", que é a pergunta que o estoque
   * mínimo veio resolver.
   */
  faltam: number | null;
}

/**
 * Saldo negativo NÃO é "pouco estoque", é erro de lançamento: quer dizer que
 * saiu peça que nunca entrou. O relatório de estoque já tratava assim, e a
 * lista de Produtos mostrava o mesmo número em preto, como se fosse normal.
 *
 * Um saldo igual ao mínimo já conta como "abaixo do mínimo", de propósito: o
 * mínimo é o ponto de comprar, não o ponto de acabar. Quem cadastra mínimo 2
 * está dizendo "quando chegar em 2, compre" — avisar só em 1 seria avisar
 * tarde demais, que é o que faz a peça faltar com o carro no pátio.
 *
 * Mínimo `null` quer dizer "essa peça não tem mínimo definido" e nunca vira
 * aviso — diferente de mínimo zero, que é um mínimo de verdade. Sem essa
 * distinção, o catálogo inteiro (que hoje está sem mínimo nenhum) viraria uma
 * lista de alarmes no dia em que a coluna nascesse, e alarme que toca pra
 * tudo é alarme que ninguém olha.
 */
export function lerSaldo(saldo: number, estoqueMinimo: number | null | undefined): LeituraDeSaldo {
  if (saldo < 0) return { situacao: "negativo", faltam: null };
  if (saldo === 0) {
    return {
      situacao: "zerado",
      // `== null` pega null E undefined de propósito: dado vindo do banco
      // por uma versão anterior à migration 0051 chega sem a coluna, e
      // `undefined !== null` deixaria passar um mínimo que não existe.
      faltam: estoqueMinimo != null && estoqueMinimo > 0 ? estoqueMinimo : null,
    };
  }
  if (estoqueMinimo != null && saldo <= estoqueMinimo) {
    return { situacao: "abaixo_do_minimo", faltam: estoqueMinimo - saldo };
  }
  return { situacao: "normal", faltam: null };
}

/**
 * Entra na lista de "o que preciso comprar?". Saldo negativo fica de FORA de
 * propósito: ele é erro de lançamento, e comprar por causa dele esconderia o
 * erro em vez de corrigir — o lugar de resolver isso é a Contagem.
 */
export function precisaComprar(saldo: number, estoqueMinimo: number | null | undefined): boolean {
  const { situacao } = lerSaldo(saldo, estoqueMinimo);
  return situacao === "abaixo_do_minimo" || (situacao === "zerado" && estoqueMinimo != null);
}

export const SITUACAO_SALDO_ROTULO: Record<SituacaoSaldo, string> = {
  negativo: "Saldo negativo — saiu peça que não entrou. Confira na Contagem.",
  zerado: "Sem estoque.",
  abaixo_do_minimo: "No mínimo ou abaixo dele — hora de comprar.",
  normal: "",
};

// --- Busca na lista de Produtos (item TL-11 do guia) ---------------------

/** O mínimo que a busca precisa saber de uma peça. */
export interface PecaBuscavel {
  descricao: string;
  codigo_interno: string | null;
  codigo_barras: string | null;
  marca: string | null;
  modelo: string | null;
  medida: string | null;
}

function normalizar(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira acento: "suspensão" acha "suspensao"
    .toLowerCase()
    .trim();
}

/**
 * Casa por qualquer campo que alguém usaria pra achar a peça no balcão —
 * inclusive a `medida` do pneu (migration 0051), que é justamente o que
 * permite responder "tem 175/70 R14?" sem ler peça por peça.
 */
export function pecaCasaComBusca(peca: PecaBuscavel, termo: string): boolean {
  const busca = normalizar(termo);
  if (busca === "") return true;
  return [
    peca.descricao,
    peca.codigo_interno,
    peca.codigo_barras,
    peca.marca,
    peca.modelo,
    peca.medida,
  ].some((campo) => normalizar(campo).includes(busca));
}

/**
 * A peça cujo código de barras (ou referência) é EXATAMENTE o que foi
 * digitado. É o que faz o leitor de código de barras funcionar: o leitor se
 * comporta como um teclado que digita o código e aperta Enter, então o Enter
 * no campo de busca com correspondência exata abre aquela peça direto.
 *
 * Exige correspondência exata, e não "contém", de propósito: abrir a peça
 * errada por um código que só parecia igual é pior que não abrir nada. E
 * devolve `null` quando mais de uma peça tem o mesmo código — catálogo
 * duplicado existe, e nesse caso o certo é mostrar a lista filtrada pra
 * pessoa escolher, não chutar uma.
 */
export function acharPorCodigoExato<T extends PecaBuscavel>(
  pecas: T[],
  termo: string,
): T | null {
  const busca = normalizar(termo);
  if (busca === "") return null;
  const casaram = pecas.filter(
    (peca) =>
      normalizar(peca.codigo_barras) === busca || normalizar(peca.codigo_interno) === busca,
  );
  return casaram.length === 1 ? casaram[0] : null;
}

/**
 * A entrada de "estoque inicial" que nasce junto com a peça quando quem
 * cadastra informa uma quantidade. Um lugar só pros dois cadastros — o do
 * Estoque (`ProdutosSection`) e o da peça avulsa da OS (`cadastrarPecaNova`,
 * #655) — pra o lançamento não sair diferente em cada um (#720).
 *
 * @returns o movimento, ou `null` quando não há o que lançar (vazio ou zero)
 */
export function movimentoDeEstoqueInicial(
  pecaId: string,
  quantidade: number | null,
): Omit<NovoMovimentoEstoque, "deposito_id"> | null {
  if (!quantidade || quantidade <= 0) return null;
  return {
    peca_id: pecaId,
    tipo: "entrada",
    quantidade,
    motivo: "ajuste",
    referencia: "Estoque inicial (cadastro do produto)",
  };
}

// --- Sugestão de compra (#382, FN-07) ------------------------------------

export const DIAS_DE_FOLGA_SUGESTAO = 15;
export const DIAS_DO_RITMO_DE_SAIDA = 90;

export interface MovimentoParaConsumo {
  peca_id: string;
  tipo: TipoMovimento;
  motivo: MotivoMovimento;
  quantidade: number;
  criado_em: string;
}

/** Os motivos de saída que são a peça indo embora de verdade, pro cliente. */
const MOTIVOS_DE_CONSUMO: readonly MotivoMovimento[] = ["venda", "uso_em_os"];

/**
 * Quanto de cada peça sai por dia, na média dos últimos `dias` (contando
 * hoje). É o "ritmo de saída" que faz a sugestão enxergar a peça que ainda
 * não chegou no mínimo, mas vai acabar antes da próxima compra.
 *
 * Só venda e uso em OS contam. Ajuste NÃO é consumo: é a Contagem corrigindo
 * um número errado, e contar isso como saída inventaria um ritmo que nunca
 * existiu (uma contagem que acha 20 pneus a menos faria o sistema sugerir 20
 * pneus a mais todo mês).
 *
 * A janela é por dia de calendário LOCAL (`diaLocal`), não por 90×24 horas
 * nem pelo dia em UTC: uma venda das 22h do dia 13/08 é do dia 13/08 pra quem
 * está no balcão, e é assim que ela entra ou sai da janela.
 *
 * Divide pelo tamanho da janela inteira, e não pelos dias que tiveram venda:
 * a pergunta é "quanto sai num dia qualquer", e o dia sem venda também é um
 * dia. Peça sem saída nenhuma não aparece no mapa (quem lê usa 0).
 */
export function consumoPorDiaDasPecas(
  movimentos: readonly MovimentoParaConsumo[],
  hoje: string,
  dias: number = DIAS_DO_RITMO_DE_SAIDA,
): Map<string, number> {
  const somaPorPeca = new Map<string, number>();
  for (const movimento of movimentos) {
    if (movimento.tipo !== "saida" || !MOTIVOS_DE_CONSUMO.includes(movimento.motivo)) continue;
    // 0 = hoje, dias−1 = o dia mais antigo da janela. Negativo é dia
    // depois de hoje (relógio errado de algum computador): fica fora.
    const diasAtras = diasEntre(diaLocal(movimento.criado_em), hoje);
    if (diasAtras < 0 || diasAtras > dias - 1) continue;
    somaPorPeca.set(movimento.peca_id, (somaPorPeca.get(movimento.peca_id) ?? 0) + movimento.quantidade);
  }
  const consumo = new Map<string, number>();
  for (const [pecaId, soma] of somaPorPeca) consumo.set(pecaId, soma / dias);
  return consumo;
}
