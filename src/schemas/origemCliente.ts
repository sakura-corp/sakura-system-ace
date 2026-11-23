import { ehConsumidor } from "@/types/cliente";

/**
 * "De onde veio" — a origem do cliente (#1021, migration 0091).
 *
 * A loja quer saber se o dinheiro gasto em divulgação volta: de onde vêm os
 * clientes (anúncio, indicação, passou na frente). A origem fica guardada em
 * dois lugares: no cliente (de onde ele veio na PRIMEIRA vez) e em cada OS,
 * orçamento e venda de balcão (de onde veio DESTA vez).
 *
 * As regras (decisões da Sofia na issue):
 *   • LISTA FIXA, igual pra toda loja, morando só aqui (o banco tem a mesma
 *     lista na trava `ck_*_origem`; o teste confere as duas);
 *   • SEMPRE OPCIONAL: em branco é "Não informado", nunca impede salvar;
 *   • a OS nova já vem com a origem do cliente e pode ser trocada; trocar na
 *     OS não muda o cliente. Cliente sem origem que ganha uma OS com origem
 *     passa a ter aquela — isso é feito pelo banco (gatilho da 0091), pra
 *     valer também pra quem tem só o módulo OS;
 *   • o Consumidor nunca tem origem: a da venda anônima fica só na venda.
 */
export const ORIGENS_CLIENTE = [
  "anuncio_redes",
  "google",
  "indicacao",
  "passou_na_frente",
  "parceiro",
  "ja_era_cliente",
  "outro",
] as const;

export type OrigemCliente = (typeof ORIGENS_CLIENTE)[number];

export const ORIGEM_CLIENTE_LABEL: Record<OrigemCliente, string> = {
  anuncio_redes: "Anúncio no Instagram/Facebook",
  google: "Google",
  indicacao: "Indicação",
  passou_na_frente: "Passou na frente",
  parceiro: "Parceiro",
  ja_era_cliente: "Já era cliente",
  outro: "Outro",
};

export const ROTULO_SEM_ORIGEM = "Não informado";

/** O "qual anúncio ou quem indicou": a trava `ck_*_origem_detalhe` do banco. */
export const TAMANHO_MAXIMO_DETALHE_ORIGEM = 80;

export function ehOrigemCliente(valor: unknown): valor is OrigemCliente {
  return typeof valor === "string" && (ORIGENS_CLIENTE as readonly string[]).includes(valor);
}

export function rotuloDaOrigem(origem: string | null | undefined): string {
  return ehOrigemCliente(origem) ? ORIGEM_CLIENTE_LABEL[origem] : ROTULO_SEM_ORIGEM;
}

/**
 * A origem que a OS (ou orçamento, ou venda) nova já traz preenchida: a do
 * cliente escolhido. "" = nada a sugerir (sem cliente, cliente sem origem, ou
 * o Consumidor, que nunca tem).
 */
export function origemSugerida(
  cliente: { id: string; origem?: string | null } | null | undefined,
): OrigemCliente | "" {
  if (!cliente || ehConsumidor(cliente.id)) return "";
  return ehOrigemCliente(cliente.origem) ? cliente.origem : "";
}

/**
 * O que fica no campo quando o cliente da OS nova muda. A sugestão do cliente
 * novo entra se o campo estava vazio ou ainda com a sugestão do cliente
 * anterior (a pessoa não mexeu); o que a pessoa escolheu à mão fica.
 */
export function origemAoTrocarCliente(
  atual: string,
  sugestaoAnterior: string,
  sugestaoNova: string,
): string {
  return atual === "" || atual === sugestaoAnterior ? sugestaoNova : atual;
}

/**
 * Do formulário (texto) pro banco: em branco vira nulo ("Não informado"),
 * sem os espaços das pontas, e o detalhe nunca passa do que a trava aceita.
 * Um valor fora da lista (só por defeito) vira nulo: perder a origem é melhor
 * que o banco recusar o salvar da OS inteira — ela é opcional.
 */
export function origemParaGravar(
  origem: string,
  detalhe: string,
): { origem: OrigemCliente | null; origem_detalhe: string | null } {
  const limpo = detalhe.trim().slice(0, TAMANHO_MAXIMO_DETALHE_ORIGEM).trim();
  return {
    origem: ehOrigemCliente(origem) ? origem : null,
    origem_detalhe: limpo || null,
  };
}
