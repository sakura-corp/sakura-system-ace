import { diaLocal, diasEntre } from "@/lib/datas";
import { arredondarCentavo, somar } from "@/schemas/dinheiro";
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

/**
 * Quantos dias de venda a compra precisa cobrir além do mínimo (o "N" da
 * tarefa; Sofia, 10/11). É também o limite do aviso: peça que acaba em menos
 * que isso entra na lista mesmo sem mínimo cadastrado.
 */
export const DIAS_DE_FOLGA_SUGESTAO = 15;
/** A janela, em dias de calendário contando hoje, de onde sai o ritmo de saída. */
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

export interface PecaParaSugestao {
  id: string;
  descricao: string;
  unidade: string | null;
  estoque_minimo: number | null;
  ativo: boolean;
}

export interface CotacaoParaSugestao {
  peca_id: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  preco: number;
  criado_em: string;
}

export interface PedidoParaSugestao {
  status: "pendente" | "parcial" | "recebido" | "cancelado";
  itens: { peca_id: string; quantidade_pedida: number; quantidade_recebida: number }[];
}

export interface LinhaSugestaoCompra {
  peca_id: string;
  descricao: string;
  unidade: string | null;
  saldo: number;
  estoque_minimo: number | null;
  /** Sem arredondar: quem mostra arredonda; a conta usa o número inteiro. */
  consumoPorDia: number;
  /** saldo / consumoPorDia; `null` quando a peça não tem saída na janela. */
  diasRestantes: number | null;
  /** Pedido ao fornecedor e ainda não chegou (pendente ou parcial). */
  jaPedido: number;
  /** Inteiro, nunca negativo. Zero quando o que já está pedido cobre o alvo. */
  quantidadeSugerida: number;
  fornecedor: { id: string; nome: string } | null;
  preco: number | null;
  /** `totalDaLinha(quantidadeSugerida, preco)`; `null` sem cotação. */
  total: number | null;
}

/**
 * Quantas unidades comprar pra chegar no alvo, em número inteiro.
 *
 * A diferença é arredondada a 6 casas ANTES do `ceil` de propósito: o ritmo
 * é uma divisão (186 / 90) e a conta que deveria dar 31 dá
 * 31.000000000000004 no computador — sem esse cuidado, o `ceil` mandaria
 * comprar 32. Seis casas tiram a cauda sem esconder fração de verdade (meio
 * litro de óleo continua sendo meio litro).
 */
function quantidadeParaComprar(alvo: number, saldo: number, jaPedido: number): number {
  const falta = Math.round((alvo - saldo - jaPedido) * 1e6) / 1e6;
  return Math.max(0, Math.ceil(falta));
}

/**
 * O que já foi pedido ao fornecedor e ainda não chegou, por peça.
 *
 * Só pedido `pendente` ou `parcial`: o `recebido` já virou saldo (ou foi
 * fechado com falta e não vem mais) e o `cancelado` não vem nunca. O `max(0)`
 * segura o item que chegou a mais que o pedido — sem ele, o excesso viraria
 * desconto negativo e a sugestão subiria por causa de uma entrega maior.
 */
function jaPedidoPorPeca(pedidos: readonly PedidoParaSugestao[]): Map<string, number> {
  const porPeca = new Map<string, number>();
  for (const pedido of pedidos) {
    if (pedido.status !== "pendente" && pedido.status !== "parcial") continue;
    for (const item of pedido.itens) {
      const falta = Math.max(0, item.quantidade_pedida - item.quantidade_recebida);
      porPeca.set(item.peca_id, (porPeca.get(item.peca_id) ?? 0) + falta);
    }
  }
  return porPeca;
}

const compararNomes = new Intl.Collator("pt-BR").compare;

/**
 * O fornecedor sugerido pra cada peça: o mais barato, olhando só a ÚLTIMA
 * cotação de cada fornecedor — a mesma regra do `melhorCotacaoPorFornecedor`
 * (`src/lib/cotacoesPecas.ts`), reescrita aqui porque `src/schemas/` é conta
 * pura e não importa de `src/lib/`. Preço antigo e mais barato não vale: é
 * o preço que o fornecedor não pratica mais.
 *
 * Empate de preço vai pelo nome (e, se até o nome empatar, pelo id), pra
 * sugestão sair sempre a mesma: depender da ordem que o banco devolveu faria
 * o fornecedor trocar sozinho de uma abertura da tela pra outra.
 */
function compararCotacoes(a: CotacaoParaSugestao, b: CotacaoParaSugestao): number {
  if (a.preco !== b.preco) return a.preco - b.preco;
  const porNome = compararNomes(a.fornecedor_nome, b.fornecedor_nome);
  if (porNome !== 0) return porNome;
  return a.fornecedor_id < b.fornecedor_id ? -1 : a.fornecedor_id > b.fornecedor_id ? 1 : 0;
}

function melhorCotacaoPorPeca(
  cotacoes: readonly CotacaoParaSugestao[],
): Map<string, CotacaoParaSugestao> {
  const ultimaPorPecaEFornecedor = new Map<string, CotacaoParaSugestao>();
  for (const cotacao of cotacoes) {
    const chave = `${cotacao.peca_id}\u0000${cotacao.fornecedor_id}`;
    const existente = ultimaPorPecaEFornecedor.get(chave);
    if (!existente || new Date(cotacao.criado_em) > new Date(existente.criado_em)) {
      ultimaPorPecaEFornecedor.set(chave, cotacao);
    }
  }
  const melhorPorPeca = new Map<string, CotacaoParaSugestao>();
  for (const cotacao of ultimaPorPecaEFornecedor.values()) {
    const atual = melhorPorPeca.get(cotacao.peca_id);
    if (!atual || compararCotacoes(cotacao, atual) < 0) melhorPorPeca.set(cotacao.peca_id, cotacao);
  }
  return melhorPorPeca;
}

/**
 * A lista de "o que comprar agora", peça por peça (#382, FN-07).
 *
 * Uma peça entra quando já está no mínimo (a mesma regra do `precisaComprar`)
 * OU quando o ritmo de saída diz que ela acaba antes de `diasDeFolga` dias —
 * é isso que pega o pneu que vende bem e ainda tem estoque "normal", mas vai
 * faltar antes do fornecedor entregar.
 *
 * Fica de fora: peça inativa (ninguém compra o que saiu de linha) e saldo
 * negativo, que é erro de lançamento e se resolve na Contagem, não comprando.
 *
 * A quantidade mira o mínimo MAIS o que sai em `diasDeFolga` dias, e desconta
 * o que já está pedido e não chegou — sem esse desconto, quem abre a tela
 * duas vezes na semana compra o mesmo pneu duas vezes.
 */
export function montarSugestaoCompra(dados: {
  pecas: readonly PecaParaSugestao[];
  saldos: ReadonlyMap<string, number>;
  movimentos: readonly MovimentoParaConsumo[];
  cotacoes: readonly CotacaoParaSugestao[];
  pedidos: readonly PedidoParaSugestao[];
  hoje: string;
  diasDeFolga?: number;
  diasDoRitmo?: number;
}): LinhaSugestaoCompra[] {
  const diasDeFolga = dados.diasDeFolga ?? DIAS_DE_FOLGA_SUGESTAO;
  const consumoPorPeca = consumoPorDiaDasPecas(
    dados.movimentos,
    dados.hoje,
    dados.diasDoRitmo ?? DIAS_DO_RITMO_DE_SAIDA,
  );
  const pedidoPorPeca = jaPedidoPorPeca(dados.pedidos);
  const cotacaoPorPeca = melhorCotacaoPorPeca(dados.cotacoes);

  const linhas: LinhaSugestaoCompra[] = [];
  for (const peca of dados.pecas) {
    if (!peca.ativo) continue;
    const saldo = dados.saldos.get(peca.id) ?? 0;
    if (saldo < 0) continue;
    const consumoPorDia = consumoPorPeca.get(peca.id) ?? 0;
    const diasRestantes = consumoPorDia > 0 ? saldo / consumoPorDia : null;
    const vaiAcabar = diasRestantes !== null && diasRestantes < diasDeFolga;
    if (!precisaComprar(saldo, peca.estoque_minimo) && !vaiAcabar) continue;

    const jaPedido = pedidoPorPeca.get(peca.id) ?? 0;
    const alvo = (peca.estoque_minimo ?? 0) + consumoPorDia * diasDeFolga;
    const quantidadeSugerida = quantidadeParaComprar(alvo, saldo, jaPedido);
    const cotacao = cotacaoPorPeca.get(peca.id);
    linhas.push({
      peca_id: peca.id,
      descricao: peca.descricao,
      unidade: peca.unidade,
      saldo,
      estoque_minimo: peca.estoque_minimo,
      consumoPorDia,
      diasRestantes,
      jaPedido,
      quantidadeSugerida,
      fornecedor: cotacao ? { id: cotacao.fornecedor_id, nome: cotacao.fornecedor_nome } : null,
      preco: cotacao?.preco ?? null,
      total: cotacao ? totalDaLinha(quantidadeSugerida, cotacao.preco) : null,
    });
  }
  // O que acaba primeiro vem primeiro. Peça sem ritmo de saída (entrou só
  // pelo mínimo) vai pro fim: ela está no ponto de comprar, mas nada diz que
  // acaba amanhã. O empate vai pela descrição, pra lista não pular de ordem.
  return linhas.sort((a, b) => {
    if (a.diasRestantes !== b.diasRestantes) {
      if (a.diasRestantes === null) return 1;
      if (b.diasRestantes === null) return -1;
      return a.diasRestantes - b.diasRestantes;
    }
    return compararNomes(a.descricao, b.descricao);
  });
}

/**
 * Quantidade × preço, fechado no centavo. Um lugar só pra conta da linha e
 * pro total do pedido por fornecedor, pra os dois nunca divergirem por um
 * centavo de arredondamento (item 49 de `docs/licoes.md`).
 */
export function totalDaLinha(quantidade: number, preco: number): number {
  return arredondarCentavo(quantidade * preco);
}

export interface ItemParaAgrupar {
  peca_id: string;
  descricao: string;
  quantidade: number;
  fornecedor: { id: string; nome: string } | null;
  preco: number | null;
}

export interface GrupoPorFornecedor {
  fornecedor: { id: string; nome: string };
  itens: { peca_id: string; descricao: string; quantidade: number; preco: number; total: number }[];
  total: number;
}

/**
 * Os pedidos que a tela vai abrir, um por fornecedor, a partir das linhas que
 * a pessoa deixou marcadas (já com a quantidade que ela ajustou).
 *
 * Fica de fora o que não dá pra pedir: sem fornecedor ou sem preço (não há a
 * quem pedir nem por quanto) e quantidade zero ou menos (a peça já está toda
 * pedida — a linha aparece na tela pra informar, não pra virar item vazio).
 *
 * O total do grupo soma os totais JÁ fechados de cada linha, com `somar()`:
 * é o mesmo número que a pessoa vê linha a linha, sem um centavo de diferença
 * entre a soma da tela e o total do pedido.
 */
export function agruparPorFornecedor(itens: readonly ItemParaAgrupar[]): GrupoPorFornecedor[] {
  const porFornecedor = new Map<string, Omit<GrupoPorFornecedor, "total">>();
  for (const item of itens) {
    if (!item.fornecedor || item.preco === null || item.quantidade <= 0) continue;
    let grupo = porFornecedor.get(item.fornecedor.id);
    if (!grupo) {
      grupo = { fornecedor: item.fornecedor, itens: [] };
      porFornecedor.set(item.fornecedor.id, grupo);
    }
    grupo.itens.push({
      peca_id: item.peca_id,
      descricao: item.descricao,
      quantidade: item.quantidade,
      preco: item.preco,
      total: totalDaLinha(item.quantidade, item.preco),
    });
  }
  return Array.from(porFornecedor.values())
    .map((grupo) => ({ ...grupo, total: somar(grupo.itens.map((i) => i.total)) }))
    .sort((a, b) => compararNomes(a.fornecedor.nome, b.fornecedor.nome));
}
