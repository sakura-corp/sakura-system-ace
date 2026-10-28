import { FunctionsHttpError } from "@supabase/supabase-js";
import { hojeLocal } from "./datas";
import { supabase } from "./supabase";
import { arredondarCentavo as arredondar } from "@/schemas/dinheiro";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";
import type { Cliente } from "@/types/cliente";
import { ehConsumidor } from "@/types/cliente";
import type {
  FormaPagamentoNFCe,
  ItemNFCe,
  NFCeCorpo,
  NFSeCorpo,
  RespostaFocusNfe,
} from "@/types/focusNfe";
import type { OrdemServico } from "@/types/os";
import type { PecaDadosFiscais } from "@/types/peca";

// Sakura System — AutoCenter Edition
// Cliente HTTP para a API do Focus NFe (https://focusnfe.com.br). Formato de
// requisição confirmado contra os exemplos oficiais do repositório
// github.com/FocusNFe/javascript (pasta NFCe/v2 e NFSe/v2) — ver
// PROJETO_STATUS.md seção 8, item 1, pro que ainda precisa ser validado com
// uma emissão de teste real (o formato da resposta da NFS-e, em especial,
// ainda não foi confirmado — só o da NFC-e).

export class FocusNfeError extends Error {
  constructor(
    message: string,
    public status?: number,
    public corpo?: unknown,
  ) {
    super(message);
    this.name = "FocusNfeError";
  }
}

// ---------------------------------------------------------------------------
// O caminho até a Focus NFe passa pelo PORTEIRO (item TR-04.2).
//
// Até a v0.9.40 este arquivo chamava a Focus NFe direto, pela ponte do
// Electron, com o token lido do banco — ou seja, o token que emite e cancela
// nota no CNPJ da loja ficava na memória de todo computador, balconista
// incluído. Agora quem tem o token é a Edge Function `focus-nfe`
// (supabase/functions/focus-nfe/index.ts): este arquivo manda "emita esta
// nota pela loja X" e ela confere quem pede antes de repassar.
//
// O que NÃO mudou: a nota continua sendo montada aqui (montarCorpoNFCe /
// montarCorpoNFSe, com o teste-ouro), e o porteiro só repassa. E a resposta
// da Focus NFe chega do mesmo jeito que chegava — o porteiro devolve o
// código e o corpo dela dentro de um envelope.
// ---------------------------------------------------------------------------

type TipoNotaPorteiro = "nfce" | "nfse";

type PedidoPorteiro =
  | { acao: "emitir"; tipo: TipoNotaPorteiro; ref: string; corpo: unknown }
  | { acao: "consultar"; tipo: TipoNotaPorteiro; ref: string }
  | { acao: "cancelar"; tipo: TipoNotaPorteiro; ref: string; justificativa: string }
  | { acao: "baixar"; tipo: TipoNotaPorteiro; ref: string; arquivo: "xml" | "danfe" };

interface EnvelopePorteiro {
  ok: boolean;
  status: number;
  dados?: unknown;
  tipo_conteudo?: string;
  conteudo_base64?: string | null;
}

// Quando o porteiro RECUSA (em vez de repassar), o corpo é { erro, motivo }.
// `motivo` é o que o código confere; `erro` é a frase pra pessoa ler.
export function motivoDaRecusa(erro: unknown): string | null {
  if (!(erro instanceof FocusNfeError)) return null;
  const corpo = erro.corpo as { motivo?: unknown } | null | undefined;
  return typeof corpo?.motivo === "string" ? corpo.motivo : null;
}

async function pedirAoPorteiro(lojaId: string, pedido: PedidoPorteiro): Promise<EnvelopePorteiro> {
  const { data, error } = await supabase.functions.invoke("focus-nfe", {
    body: { loja_id: lojaId, ...pedido },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const resposta = error.context as Response;
      const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
      if (corpo?.erro) throw new FocusNfeError(corpo.erro, resposta.status, corpo);
      // Sem o corpo do porteiro, um 404 quer dizer que a função nem existe
      // neste Supabase — é o passo de publicar o porteiro que faltou (seção
      // 9 do PROJETO_STATUS.md, "Ativar o porteiro da Focus NFe").
      if (resposta.status === 404) {
        throw new FocusNfeError(
          "A emissão de nota ainda não foi ativada neste banco: falta publicar o porteiro da " +
            "Focus NFe (a função focus-nfe) no Supabase. Avise quem cuida do sistema.",
          404,
        );
      }
      throw new FocusNfeError(
        `O porteiro da Focus NFe respondeu com erro ${resposta.status}.`,
        resposta.status,
      );
    }
    throw new FocusNfeError(
      "Não consegui falar com o servidor para emitir a nota. Confira a internet e tente de novo.",
    );
  }
  return data as EnvelopePorteiro;
}

async function chamarFocusNfe<T>(lojaId: string, pedido: PedidoPorteiro): Promise<T> {
  const envelope = await pedirAoPorteiro(lojaId, pedido);
  const dados = envelope.dados ?? null;
  if (!envelope.ok) {
    throw new FocusNfeError(
      (dados as { mensagem?: string } | null)?.mensagem ??
        `Focus NFe retornou erro ${envelope.status}`,
      envelope.status,
      dados,
    );
  }
  return dados as T;
}

// Baixa o XML ou o PDF (DANFE) de uma nota. Quem escolhe o endereço do
// arquivo é o porteiro, pela resposta da própria Focus NFe — aqui só se diz
// qual nota e qual arquivo.
export async function baixarArquivoNota(
  lojaId: string,
  tipo: TipoNotaPorteiro,
  ref: string,
  arquivo: "xml" | "danfe",
): Promise<Blob> {
  const envelope = await pedirAoPorteiro(lojaId, { acao: "baixar", tipo, ref, arquivo });
  if (!envelope.ok || !envelope.conteudo_base64) {
    throw new FocusNfeError(
      `Não foi possível baixar o arquivo da nota (HTTP ${envelope.status})`,
      envelope.status,
    );
  }
  const bytes = Uint8Array.from(atob(envelope.conteudo_base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: envelope.tipo_conteudo || "application/octet-stream" });
}

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A espera venceu, mas o pedido de emissão JÁ FOI ENVIADO: a nota pode sair
// autorizada minutos depois. É um erro à parte (e não um FocusNfeError
// qualquer) porque leva a `ref` junto — é com ela que a tela confere de novo
// e registra a nota quando sair, em vez de deixar a pessoa emitir outra.
export class EsperaVencidaError extends FocusNfeError {
  constructor(
    message: string,
    public ref: string,
  ) {
    super(message);
    this.name = "EsperaVencidaError";
  }
}

// A emissão é assíncrona do lado da Focus NFe/SEFAZ — o POST inicial quase
// sempre volta com status "processando_autorizacao", e é preciso consultar
// de novo até sair desse estado. Tenta por um tempo antes de desistir (a
// nota continua processando do lado deles; dá pra consultar de novo depois).
// A prefeitura costuma ser mais lenta que a SEFAZ (em 01/10/2026 a NFS-e
// passou dos 30s e saiu autorizada logo depois), por isso espera o dobro.
async function aguardarAutorizacao(
  consultar: () => Promise<RespostaFocusNfe>,
  ref: string,
  quemAutoriza: "A SEFAZ" | "A prefeitura",
  tentativas: number,
): Promise<RespostaFocusNfe> {
  const intervaloMs = 3000;
  for (let i = 0; i < tentativas; i++) {
    const resposta = await consultar();
    if (resposta.status !== "processando_autorizacao") return resposta;
    await aguardar(intervaloMs);
  }
  // A `ref` precisa ir junto. Sem ela, o caminho natural seria clicar em
  // "emitir" de novo e acabar com DUAS notas fiscais válidas pra mesma venda.
  throw new EsperaVencidaError(
    `${quemAutoriza} está demorando mais que o normal pra responder. A nota já foi enviada e ` +
      'deve sair autorizada em instantes — não emita de novo. Espere um pouco e clique em ' +
      '"Conferir de novo": quando ela sair, o sistema registra aqui.',
    ref,
  );
}

// A `ref` de toda nota emitida pelo sistema começa com o número da OS e o
// tipo (ver montarRefNota). Conferir isso antes de registrar uma nota pela
// referência digitada evita grudar na OS 15 a nota de outra OS.
export function refPertenceAOrdem(
  ref: string,
  numeroOrdem: number,
  tipo: TipoNotaPorteiro,
): boolean {
  return new RegExp(`^os${numeroOrdem}-${tipo}-\\d+$`).test(ref.trim());
}

// Tabela de formas de pagamento do layout da NFe/NFC-e (SEFAZ) — mapeia as
// chaves já usadas em ordens_servico/caixa_movimentos (ver
// types/os.ts → FORMA_PAGAMENTO_LABEL) pro código que a nota fiscal exige.
const CODIGO_FORMA_PAGAMENTO_SEFAZ: Record<string, string> = {
  dinheiro: "01",
  cartao_credito: "03",
  cartao_debito: "04",
  pix: "17",
};

function codigoFormaPagamentoSefaz(formaPagamento: string): string {
  return CODIGO_FORMA_PAGAMENTO_SEFAZ[formaPagamento] ?? "99";
}

function formatarValor(valor: number): string {
  return valor.toFixed(2);
}

export interface ItemParaNFCe {
  // Só os dados fiscais: quem emite a nota pode não ter o módulo Estoque (#366).
  peca: PecaDadosFiscais;
  quantidade: number;
  precoUnitario: number;
  /** Desconto em reais dado naquela linha da OS (0 quando não houve). */
  desconto: number;
}

export interface PagamentoParaNota {
  formaPagamento: string;
  valor: number;
}

export interface DadosEmissaoNFCe {
  ordem: OrdemServico;
  itens: ItemParaNFCe[];
  cliente: Cliente | null;
  pagamentos: PagamentoParaNota[];
  configuracaoFiscal: ConfiguracaoFiscalLoja;
}

/**
 * O que a linha vale de verdade: quantidade × preço menos o desconto dado
 * nela. Fica numa função só porque o mesmo número é usado em três lugares
 * (o item, o total dos produtos e a base do ICMS) e antes cada um refazia a
 * conta — dois deles esquecendo o desconto.
 */
export function valorLiquidoItem(item: ItemParaNFCe): number {
  return arredondar(item.quantidade * item.precoUnitario - item.desconto);
}

function montarItemNFCe(item: ItemParaNFCe, numeroItem: number): ItemNFCe {
  const { peca, quantidade } = item;
  const aliquota = peca.aliquota_icms ?? 0;

  // O desconto da linha entra abatido no preço unitário, e não como um campo
  // separado, porque a SEFAZ confere que "valor bruto = quantidade × preço
  // unitário" — mandar o bruto já com desconto sem mexer no unitário seria
  // recusado. Ignorar o desconto (como era antes) deixava a nota valendo
  // mais do que o cliente pagou: os pagamentos informados são rateados sobre
  // o total da OS, que **já** desconta, então a soma dos pagamentos ficava
  // menor que o total da nota e a SEFAZ rejeitava a emissão.
  const valorBruto = valorLiquidoItem(item);
  const precoUnitario = quantidade > 0 ? valorBruto / quantidade : 0;

  return {
    numero_item: String(numeroItem),
    codigo_ncm: peca.ncm ?? "",
    codigo_produto: peca.codigo_interno || peca.id,
    descricao: peca.descricao,
    quantidade_comercial: quantidade.toFixed(4),
    quantidade_tributavel: quantidade.toFixed(4),
    cfop: peca.cfop_padrao ?? "5102",
    valor_unitario_comercial: precoUnitario.toFixed(10),
    valor_unitario_tributavel: precoUnitario.toFixed(10),
    valor_bruto: formatarValor(valorBruto),
    unidade_comercial: peca.unidade || "UN",
    unidade_tributavel: peca.unidade || "UN",
    icms_origem: peca.origem ?? "0",
    icms_situacao_tributaria: peca.cst_ou_csosn ?? "",
    icms_aliquota: String(aliquota),
    // Simplificação: só calcula base de ICMS quando há alíquota (regime
    // normal); em Simples Nacional (CSOSN, sem destaque de ICMS na nota) a
    // alíquota fica zerada e a base também — ver PROJETO_STATUS.md.
    icms_base_calculo: aliquota > 0 ? formatarValor(valorBruto) : "0",
    icms_modalidade_base_calculo: "3",
    // Reforma Tributária (IBS/CBS) — período de transição 2026: CST "000"
    // (tributação integral) + cClassTrib "000001" (situação plenamente
    // tributada). As alíquotas de teste (0,9% CBS / 0,1% IBS-UF / 0% IBS-mun)
    // são fixadas por lei pra 2026 (Nota Técnica NFe 2025.002/LC 214/2025) —
    // símbolicas, compensadas com PIS/Cofins/ICMS/ISS já cobrados, sem
    // aumento real de imposto — mas a SEFAZ rejeita a nota se o valor não
    // bater exatamente com isso (rejeição 1026/1027/1036/1037). A
    // contabilidade da loja tinha orientado tudo zerado (ver
    // PROJETO_STATUS.md seção 8, item 1) — essa parte específica (o valor
    // exato da alíquota de teste) foi corrigida depois de uma rejeição real
    // da SEFAZ em homologação apontando exatamente pra isso.
    ibs_cbs_situacao_tributaria: "000",
    ibs_cbs_classificacao_tributaria: "000001",
    ibs_cbs_base_calculo: formatarValor(valorBruto),
    cbs_aliquota: "0.90",
    cbs_valor: formatarValor((valorBruto * 0.9) / 100),
    ibs_uf_aliquota: "0.10",
    ibs_uf_valor: formatarValor((valorBruto * 0.1) / 100),
    ibs_mun_aliquota: "0.00",
    ibs_mun_valor: "0.00",
    ibs_valor_total: formatarValor((valorBruto * 0.1) / 100),
  };
}

/**
 * Como o destinatário entra na NFC-e, conforme o suporte da Focus NFe
 * (03/09/2026): pessoa física vai com `cpf_destinatario`; pessoa jurídica vai
 * com `cnpj_destinatario` mais `indicador_inscricao_estadual_destinatario`
 * "9" (não contribuinte) — e a inscrição estadual do destinatário não deve
 * ser enviada de jeito nenhum nesse caso.
 *
 * Sem cliente, ou com o documento faltando/incompleto no cadastro, a nota sai
 * como "consumidor não identificado" (todos os campos vazios), que é o
 * comportamento válido de sempre — mandar um documento pela metade seria pior,
 * porque a SEFAZ rejeita a nota inteira. Quem avisa a usuária desse caso é a
 * tela de emissão, antes de mandar.
 *
 * O cliente "Consumidor" da venda de balcão (migration 0064) sai SEMPRE como
 * não identificado, mesmo que alguém tenha gravado um documento nele: ele é
 * "ninguém em particular", e um CPF parado nele iria parar em toda venda
 * anônima da loja.
 */
export function montarDestinatarioNFCe(
  cliente: Cliente | null,
): Pick<
  NFCeCorpo,
  | "nome_destinatario"
  | "cpf_destinatario"
  | "cnpj_destinatario"
  | "indicador_inscricao_estadual_destinatario"
> {
  if (ehConsumidor(cliente?.id)) return { nome_destinatario: "", cpf_destinatario: "" };

  const documento = (cliente?.cpf_cnpj ?? "").replace(/\D/g, "");

  if (cliente?.tipo_pessoa === "juridica") {
    return documento.length === 14
      ? {
          nome_destinatario: cliente.nome,
          cnpj_destinatario: documento,
          indicador_inscricao_estadual_destinatario: "9",
        }
      : { nome_destinatario: "" };
  }

  if (cliente?.tipo_pessoa === "fisica") {
    return { nome_destinatario: cliente.nome, cpf_destinatario: documento };
  }

  return { nome_destinatario: "", cpf_destinatario: "" };
}

function montarRefNota(numeroOrdem: number, sufixo: string): string {
  return `os${numeroOrdem}-${sufixo}-${Date.now()}`;
}

// Orçamento (#379) não tem número de OS e nunca emite nota: a nota é da
// venda, e orçamento ainda não é venda. A tela não oferece o botão, mas quem
// emite não pode depender disso — uma nota "osnull" na SEFAZ não tem volta.
function numeroParaNota(ordem: { numero: number | null; status?: string }): number {
  if (ordem.numero === null || ordem.status === "orcamento" || ordem.status === "recusado") {
    throw new FocusNfeError(
      "Orçamento não emite nota fiscal: aprove o orçamento (ele vira OS) e fature antes.",
    );
  }
  return ordem.numero;
}

export function montarCorpoNFCe({
  itens,
  cliente,
  pagamentos,
  configuracaoFiscal,
}: DadosEmissaoNFCe): NFCeCorpo {
  const valorProdutos = itens.reduce((soma, item) => soma + valorLiquidoItem(item), 0);
  const valorIcmsTotal = itens.reduce((soma, item) => {
    const aliquota = item.peca.aliquota_icms ?? 0;
    return aliquota > 0 ? soma + (valorLiquidoItem(item) * aliquota) / 100 : soma;
  }, 0);

  return {
    natureza_operacao: "VENDA AO CONSUMIDOR",
    data_emissao: new Date().toISOString(),
    tipo_documento: "1",
    presenca_comprador: "1",
    consumidor_final: "1",
    finalidade_emissao: "1",
    cnpj_emitente: (configuracaoFiscal.cnpj ?? "").replace(/\D/g, ""),
    ...montarDestinatarioNFCe(cliente),
    valor_produtos: formatarValor(valorProdutos),
    valor_desconto: "0.00",
    valor_total: formatarValor(valorProdutos),
    // "0" = pagamento à vista, "1" = a prazo — venda de balcão à vista
    // sempre, o parcelamento (quando existe) é do cartão de crédito, não da
    // nota em si (ver formas_pagamento abaixo, que é quem carrega o meio de
    // pagamento de verdade).
    forma_pagamento: "0",
    icms_valor_total: formatarValor(valorIcmsTotal),
    modalidade_frete: "9",
    items: itens.map((item, indice) => montarItemNFCe(item, indice + 1)),
    formas_pagamento: pagamentos.map(
      (pagamento): FormaPagamentoNFCe => ({
        forma_pagamento: codigoFormaPagamentoSefaz(pagamento.formaPagamento),
        valor_pagamento: formatarValor(pagamento.valor),
      }),
    ),
  };
}

const MENSAGEM_SEM_TOKEN =
  "Token do Focus NFe não configurado — cadastre em Configurações → Dados fiscais da loja.";

export async function emitirNFCe(dados: DadosEmissaoNFCe): Promise<RespostaFocusNfe> {
  const { configuracaoFiscal, ordem } = dados;
  const numero = numeroParaNota(ordem);
  if (!configuracaoFiscal.focus_nfe_configurado) throw new FocusNfeError(MENSAGEM_SEM_TOKEN);
  // Nenhuma nota sai sem NCM (#655): a tela já avisa antes, e esta é a
  // última trava, antes de pedir qualquer coisa à Focus.
  const semNcm = dados.itens.find((item) => !item.peca.ncm?.trim());
  if (semNcm) {
    throw new FocusNfeError(
      `A peça "${semNcm.peca.descricao}" está sem NCM no cadastro: preencha pra sair na nota.`,
    );
  }

  const lojaId = configuracaoFiscal.loja_id;
  const ref = montarRefNota(numero, "nfce");
  const corpo = montarCorpoNFCe(dados);

  await chamarFocusNfe<RespostaFocusNfe>(lojaId, { acao: "emitir", tipo: "nfce", ref, corpo });

  const resposta = await aguardarAutorizacao(
    () => consultarNFCe(ref, lojaId),
    ref,
    "A SEFAZ",
    10,
  );
  // A `ref` é o único jeito de achar a nota depois (reabrir o PDF, cancelar),
  // e ela é daqui, não da Focus NFe: garante que ela vá junto mesmo se a
  // resposta não a repetir.
  return { ...resposta, ref: resposta.ref ?? ref };
}

export async function consultarNFCe(ref: string, lojaId: string): Promise<RespostaFocusNfe> {
  return chamarFocusNfe<RespostaFocusNfe>(lojaId, { acao: "consultar", tipo: "nfce", ref });
}

export async function cancelarNFCe(
  ref: string,
  justificativa: string,
  lojaId: string,
): Promise<RespostaFocusNfe> {
  return chamarFocusNfe<RespostaFocusNfe>(lojaId, {
    acao: "cancelar",
    tipo: "nfce",
    ref,
    justificativa,
  });
}

export interface DadosEmissaoNFSe {
  ordem: OrdemServico;
  discriminacao: string;
  valorServicos: number;
  cliente: Cliente;
  // Código IBGE do município do cliente (tomador) — não tem campo próprio no
  // cadastro de Clientes hoje, então é pedido na hora da emissão (ver
  // EmitirNotaFiscalModal.tsx).
  codigoMunicipioCliente: string;
  configuracaoFiscal: ConfiguracaoFiscalLoja;
}

export function montarCorpoNFSe({
  discriminacao,
  valorServicos,
  cliente,
  codigoMunicipioCliente,
  configuracaoFiscal,
}: DadosEmissaoNFSe): NFSeCorpo {
  const cnpjOuCpf = (cliente.cpf_cnpj ?? "").replace(/\D/g, "");

  return {
    // Dia local — com toISOString() a nota emitida à noite sairia com a
    // data de amanhã. Ver lib/datas.ts.
    data_emissao: hojeLocal(),
    prestador: {
      cnpj: (configuracaoFiscal.cnpj ?? "").replace(/\D/g, ""),
      inscricao_municipal: configuracaoFiscal.inscricao_municipal ?? "",
      codigo_municipio: configuracaoFiscal.codigo_municipio ?? "",
    },
    tomador: {
      ...(cliente.tipo_pessoa === "juridica" ? { cnpj: cnpjOuCpf } : { cpf: cnpjOuCpf }),
      razao_social: cliente.nome,
      email: cliente.email ?? undefined,
      endereco:
        cliente.rua && cliente.cep
          ? {
              logradouro: cliente.rua,
              numero: cliente.numero ?? "S/N",
              bairro: cliente.bairro ?? "",
              codigo_municipio: codigoMunicipioCliente,
              uf: cliente.uf ?? "",
              cep: (cliente.cep ?? "").replace(/\D/g, ""),
            }
          : undefined,
    },
    servico: {
      // Arredondados: são os únicos valores que saem como número (o resto do
      // corpo é texto com 2 casas), e soma de item em ponto flutuante pode
      // produzir coisa como 90.00000000000001 — que viraria isso no XML.
      aliquota: arredondar(configuracaoFiscal.aliquota_iss ?? 0),
      discriminacao,
      iss_retido: "false",
      item_lista_servico: configuracaoFiscal.item_lista_servico || "14.01",
      codigo_tributario_municipio: configuracaoFiscal.codigo_tributario_municipio ?? undefined,
      codigo_cnae: (configuracaoFiscal.codigo_cnae ?? "").replace(/\D/g, ""),
      valor_servicos: arredondar(valorServicos),
    },
  };
}

export async function emitirNFSe(dados: DadosEmissaoNFSe): Promise<RespostaFocusNfe> {
  const { configuracaoFiscal, ordem } = dados;
  const numero = numeroParaNota(ordem);
  if (!configuracaoFiscal.focus_nfe_configurado) throw new FocusNfeError(MENSAGEM_SEM_TOKEN);
  if (!configuracaoFiscal.codigo_municipio) {
    throw new FocusNfeError(
      "Código do município da loja não configurado — cadastre em Configurações → Dados " +
        "fiscais da loja, seção \"Emissão de NFS-e\".",
    );
  }
  if (!configuracaoFiscal.codigo_cnae) {
    throw new FocusNfeError(
      "Código CNAE da loja não configurado — cadastre em Configurações → Dados fiscais da " +
        "loja, seção \"Emissão de NFS-e\" (está no Cartão CNPJ da empresa).",
    );
  }
  // Sem essa checagem, alíquota em branco virava 0% na nota, sem erro nenhum:
  // a prefeitura autorizaria um ISS zerado e o problema só apareceria depois,
  // com a contabilidade. É o mesmo cuidado já aplicado ao município e ao CNAE.
  if (!configuracaoFiscal.aliquota_iss) {
    throw new FocusNfeError(
      "Alíquota do ISS não configurada — cadastre em Configurações → Dados fiscais da loja, " +
        "seção \"Emissão de NFS-e\". Sem ela a nota sairia com ISS zerado.",
    );
  }

  const lojaId = configuracaoFiscal.loja_id;
  const ref = montarRefNota(numero, "nfse");
  const corpo = montarCorpoNFSe(dados);

  await chamarFocusNfe<RespostaFocusNfe>(lojaId, { acao: "emitir", tipo: "nfse", ref, corpo });

  const resposta = await aguardarAutorizacao(
    () => consultarNFSe(ref, lojaId),
    ref,
    "A prefeitura",
    20,
  );
  return { ...resposta, ref: resposta.ref ?? ref };
}

export async function consultarNFSe(ref: string, lojaId: string): Promise<RespostaFocusNfe> {
  return chamarFocusNfe<RespostaFocusNfe>(lojaId, { acao: "consultar", tipo: "nfse", ref });
}

export async function cancelarNFSe(
  ref: string,
  justificativa: string,
  lojaId: string,
): Promise<RespostaFocusNfe> {
  return chamarFocusNfe<RespostaFocusNfe>(lojaId, {
    acao: "cancelar",
    tipo: "nfse",
    ref,
    justificativa,
  });
}
