import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { escaparHtml } from "@/lib/html";
import { formatarMoeda } from "@/schemas/dinheiro";
import { podeAbrirNoNavegador } from "@/schemas/linkExterno";
import {
  mesmoValor,
  totalDosServicosDaOs,
  valorDaLinhaComDesconto,
  valorDoItemDaOs,
} from "@/schemas/reciboNotaFiscal";
import type { TipoNotaFiscal } from "@/types/notaFiscal";

// Sakura System — AutoCenter Edition
// Interpreta o XML de uma NFC-e/NF-e/NFS-e já enviado ao módulo "Notas
// Fiscais" pra montar o RECIBO que a loja entrega ao cliente (a "Versão para
// o cliente"). Não é o DANFE nem o DANFSe: os documentos oficiais continuam
// vindo da Focus NFe ("Ver DANFE" / "Ver PDF"), e o recibo diz isso no topo.
//
// O desenho segue o modelo aprovado pela Sofia em 13/11 (#1030, fonte Arial;
// tarefa #1031). Regras:
// - Chave, protocolo e QR code saem SÓ do XML. Sem o dado, a seção não sai.
// - Veículo, placa, km, atendente e garantia vêm da OS ligada à nota; nota
//   sem OS sai sem essas seções.
// - Dado que falta: a linha não aparece. Nunca "—" no lugar de um dado.
// - Todo texto do XML, da OS e das Configurações passa por `escaparHtml`.
// - Nenhuma conta de dinheiro aqui: o recibo mostra o que o XML traz; a
//   única conta (o caso da Giap) mora em `src/schemas/reciboNotaFiscal.ts`.
//
// NF-e/NFC-e seguem o leiaute nacional da SEFAZ (4.00), estável. A NFS-e usa
// o leiaute Nacional (1.00): a loja vem em `infNFSe/emit` (o grupo
// `DPS/prest` não traz o nome quando quem emite é o próprio prestador, e era
// dele que o recibo lia: daí o "—" da #1029). Se os campos esperados não
// aparecem, `reconhecido` vem `false` e a tela avisa.

export interface ItemNotaFiscalVisual {
  codigo: string | null;
  descricao: string;
  unidade: string | null;
  quantidade: number;
  valorUnitario: number;
  /** Desconto da linha, só se veio no XML (`vDesc`). */
  desconto: number | null;
  valorTotal: number;
}

export interface PessoaNotaFiscalVisual {
  nome: string | null;
  nomeFantasia: string | null;
  documento: string | null;
  endereco: string | null;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  telefone: string | null;
  email: string | null;
}

export interface FormaPagamentoVisual {
  forma: string | null;
  valor: number;
}

/** O que só a NFS-e Nacional traz. */
export interface ServicoNfseVisual {
  codigoTributacao: string | null;
  descricaoTributacao: string | null;
  discriminacao: string | null;
  localPrestacao: string | null;
  /** AAAA-MM-DD, como vem no XML. */
  competencia: string | null;
  numeroDps: string | null;
  serieDps: string | null;
  valorServicos: number | null;
  descontos: number | null;
  deducoes: number | null;
  baseCalculo: number | null;
  aliquotaIss: number | null;
  valorIss: number | null;
  /** `null` quando o XML não diz. */
  issRetido: boolean | null;
  retencoes: number | null;
  valorLiquido: number | null;
}

export interface NotaFiscalVisual {
  reconhecido: boolean;
  tipo: TipoNotaFiscal;
  /** `ide/mod`: "65" é NFC-e, "55" é NF-e. */
  modelo: string | null;
  numero: string | null;
  serie: string | null;
  dataEmissao: string | null;
  chaveAcesso: string | null;
  protocolo: string | null;
  dataProtocolo: string | null;
  emitente: PessoaNotaFiscalVisual | null;
  destinatario: PessoaNotaFiscalVisual | null;
  itens: ItemNotaFiscalVisual[];
  /** Soma dos produtos antes do desconto (`ICMSTot/vProd`). */
  subtotal: number | null;
  /** Desconto total da nota (`ICMSTot/vDesc`). */
  descontoTotal: number | null;
  total: number | null;
  formasPagamento: FormaPagamentoVisual[];
  /** Só se veio no XML (`pag/vTroco`). */
  troco: number | null;
  /** O conteúdo do QR code da NFC-e (`infNFeSupl/qrCode`). */
  qrCode: string | null;
  /** O endereço de consulta pela chave (`infNFeSupl/urlChave`). */
  urlConsulta: string | null;
  /** A linha de tributos aproximados, com o texto/valor da própria nota. */
  tributosAproximados: string | null;
  /** As informações complementares da nota (sem a linha dos tributos). */
  informacoesComplementares: string | null;
  servico: ServicoNfseVisual | null;
  // Só preenchido pra prefeituras (ex: Araraquara/Giap) cujo XML devolvido
  // pela Focus NFe não é o "corpo" da nota (sem itens/valores) — é só uma
  // confirmação de emissão, com um link pro documento oficial completo,
  // hospedado no próprio site da prefeitura. Ver interpretarConfirmacaoGiap().
  linkOficial: string | null;
}

// ---------------------------------------------------------------------------
// O que vem de fora do XML: a OS ligada à nota e as Configurações da loja.
// ---------------------------------------------------------------------------

export interface ItemDaOsDoRecibo {
  tipo: "peca" | "servico";
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  /** Prazo de garantia da peça (cadastro da peça), em dias. */
  garantiaDias: number | null;
}

export interface OsDoRecibo {
  numero: number;
  tipo: "os" | "venda_balcao";
  /** "Marca Modelo Ano · cor", já montado. */
  veiculo: string | null;
  placa: string | null;
  km: number | null;
  atendente: string | null;
  mecanico: string | null;
  telefoneCliente: string | null;
  /** Do cadastro: só entra quando o XML não traz o cliente (a Giap não traz). */
  cliente: { nome: string | null; documento: string | null } | null;
  itens: ItemDaOsDoRecibo[];
}

export interface LojaDoRecibo {
  nomeFantasia: string | null;
  razaoSocial: string | null;
  cnpj: string | null;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
}

export interface ContextoDoRecibo {
  os: OsDoRecibo | null;
  loja: LojaDoRecibo | null;
  /**
   * O valor da nota quando o XML não traz (Giap). Hoje o sistema não guarda
   * esse valor, então chega `null` e o recibo não lista os itens da OS.
   */
  valorDaNota: number | null;
}

const CONTEXTO_VAZIO: ContextoDoRecibo = { os: null, loja: null, valorDaNota: null };

const TPAG_LABEL: Record<string, string> = {
  "01": "Dinheiro",
  "02": "Cheque",
  "03": "Cartão de crédito",
  "04": "Cartão de débito",
  "05": "Crédito loja",
  "10": "Vale alimentação",
  "11": "Vale refeição",
  "15": "Boleto",
  "17": "Pix",
  "99": "Outros",
};

// ---------------------------------------------------------------------------
// Ler o XML
// ---------------------------------------------------------------------------

function texto(elemento: Element | undefined, tag: string): string | null {
  const valor = elemento?.getElementsByTagName(tag)[0]?.textContent?.trim();
  return valor ? valor : null;
}

function numero(elemento: Element | undefined, tag: string): number | null {
  const valor = texto(elemento, tag);
  if (valor === null) return null;
  const n = Number(valor);
  return Number.isNaN(n) ? null : n;
}

function el(elemento: Element | Document | undefined, tag: string): Element | undefined {
  return elemento?.getElementsByTagName(tag)[0];
}

/** O filho direto com esse nome (sem descer: "valores" existe em dois níveis na NFS-e). */
function filho(elemento: Element | undefined, tag: string): Element | undefined {
  if (!elemento) return undefined;
  return Array.from(elemento.children).find((c) => c.localName === tag);
}

function formatarCep(cep: string | null): string | null {
  if (!cep) return null;
  const d = cep.replace(/\D/g, "");
  return d.length === 8 ? `CEP ${d.slice(0, 5)}-${d.slice(5)}` : `CEP ${cep}`;
}

function juntar(partes: (string | null | undefined)[], separador = " · "): string | null {
  const validas = partes.filter((p): p is string => Boolean(p && p.trim()));
  return validas.length > 0 ? validas.join(separador) : null;
}

function montarEndereco(
  ender: Element | undefined,
  cidadeSemNome: string | null = null,
): string | null {
  if (!ender) return null;
  const rua = juntar([texto(ender, "xLgr"), texto(ender, "nro"), texto(ender, "xCpl")], ", ");
  const cidade = juntar([texto(ender, "xMun") ?? cidadeSemNome, texto(ender, "UF")], "/");
  return juntar([rua, texto(ender, "xBairro"), cidade, formatarCep(texto(ender, "CEP"))]);
}

function pessoaVazia(): PessoaNotaFiscalVisual {
  return {
    nome: null,
    nomeFantasia: null,
    documento: null,
    endereco: null,
    inscricaoEstadual: null,
    inscricaoMunicipal: null,
    telefone: null,
    email: null,
  };
}

function notaNaoReconhecida(tipo: TipoNotaFiscal): NotaFiscalVisual {
  return {
    reconhecido: false,
    tipo,
    modelo: null,
    numero: null,
    serie: null,
    dataEmissao: null,
    chaveAcesso: null,
    protocolo: null,
    dataProtocolo: null,
    emitente: null,
    destinatario: null,
    itens: [],
    subtotal: null,
    descontoTotal: null,
    total: null,
    formasPagamento: [],
    troco: null,
    qrCode: null,
    urlConsulta: null,
    tributosAproximados: null,
    informacoesComplementares: null,
    servico: null,
    linkOficial: null,
  };
}

const MENCIONA_TRIBUTOS = /tributos?/i;

/** Separa a linha dos tributos do resto das informações complementares. */
function separarTributos(infCpl: string | null): { tributos: string | null; resto: string | null } {
  if (!infCpl) return { tributos: null, resto: null };
  if (MENCIONA_TRIBUTOS.test(infCpl)) return { tributos: infCpl, resto: null };
  return { tributos: null, resto: infCpl };
}

// Algumas prefeituras (Araraquara/Giap incluída) não emitem NFS-e no layout
// Nacional nem no ABRASF tradicional — a Focus NFe devolve, no lugar do
// "corpo" da nota, só uma confirmação de emissão (número da nota/RPS/lote,
// código de verificação e um link pro documento oficial completo, hospedado
// no próprio site da prefeitura). Sem itens nem valores nesse XML — o recibo
// mostra os dados de confirmação + esse link, e completa a loja com as
// Configurações (ver `montarHtmlVisualNotaFiscal`).
function interpretarConfirmacaoGiap(doc: Document): NotaFiscalVisual | null {
  const notaFiscal = el(el(doc, "nfeResposta"), "notaFiscal");
  if (!notaFiscal) return null;

  const numeroNota = texto(notaFiscal, "numeroNota");
  if (!numeroNota) return null;

  const loteRps = texto(notaFiscal, "loteRps");
  const numeroRps = texto(notaFiscal, "numeroRps");
  const cnpjPrestador = texto(notaFiscal, "cnpjPrestador");

  return {
    ...notaNaoReconhecida("nfse"),
    reconhecido: true,
    numero: numeroNota,
    dataEmissao: texto(notaFiscal, "dataEmissaoNF") ?? texto(notaFiscal, "dataEmissaoRPS"),
    chaveAcesso: texto(notaFiscal, "codigoVerificacao"),
    protocolo:
      loteRps || numeroRps
        ? [loteRps ? `Lote ${loteRps}` : null, numeroRps ? `RPS ${numeroRps}` : null]
            .filter(Boolean)
            .join(" · ")
        : null,
    emitente: cnpjPrestador ? { ...pessoaVazia(), documento: cnpjPrestador } : null,
    linkOficial: texto(notaFiscal, "link"),
  };
}

function interpretarNFe(doc: Document): NotaFiscalVisual {
  const infNFe = el(doc, "infNFe");
  if (!infNFe) return notaNaoReconhecida("nfe");

  const ide = el(infNFe, "ide");
  const emit = el(infNFe, "emit");
  const enderEmit = el(emit, "enderEmit");
  const dest = el(infNFe, "dest");
  const icmsTot = el(infNFe, "ICMSTot");
  const pag = el(infNFe, "pag");
  const supl = el(doc, "infNFeSupl");
  const infProt = el(doc, "infProt") ?? el(doc, "protNFe");

  const itens: ItemNotaFiscalVisual[] = Array.from(infNFe.getElementsByTagName("det")).map(
    (det) => {
      const prod = el(det, "prod");
      const desconto = numero(prod, "vDesc");
      return {
        codigo: texto(prod, "cProd"),
        descricao: texto(prod, "xProd") ?? "Item",
        unidade: texto(prod, "uCom"),
        quantidade: numero(prod, "qCom") ?? 1,
        valorUnitario: numero(prod, "vUnCom") ?? 0,
        desconto: desconto && desconto > 0 ? desconto : null,
        valorTotal: numero(prod, "vProd") ?? 0,
      };
    },
  );

  const formasPagamento: FormaPagamentoVisual[] = Array.from(
    infNFe.getElementsByTagName("detPag"),
  ).map((detPag) => {
    const codigo = texto(detPag, "tPag");
    return {
      forma: codigo ? (TPAG_LABEL[codigo] ?? null) : null,
      valor: numero(detPag, "vPag") ?? 0,
    };
  });

  // A chave tem 44 dígitos; qualquer outra coisa (um Id de teste) não é chave.
  const idAttr = infNFe.getAttribute("Id")?.replace(/^NFe/, "") ?? null;
  const chave = texto(infProt, "chNFe") ?? idAttr;

  const vTotTrib = numero(icmsTot, "vTotTrib");
  const infCpl = texto(el(infNFe, "infAdic"), "infCpl");
  const temVTotTrib = vTotTrib !== null && vTotTrib > 0;
  const { tributos, resto } = separarTributos(infCpl);
  const descontoTotal = numero(icmsTot, "vDesc");

  return {
    ...notaNaoReconhecida("nfe"),
    reconhecido: true,
    modelo: texto(ide, "mod"),
    numero: texto(ide, "nNF"),
    serie: texto(ide, "serie"),
    dataEmissao: texto(ide, "dhEmi"),
    chaveAcesso: chave && /^\d{44}$/.test(chave) ? chave : null,
    protocolo: texto(infProt, "nProt"),
    dataProtocolo: texto(infProt, "dhRecbto"),
    emitente: emit
      ? {
          nome: texto(emit, "xNome"),
          nomeFantasia: texto(emit, "xFant"),
          documento: texto(emit, "CNPJ") ?? texto(emit, "CPF"),
          endereco: montarEndereco(enderEmit),
          // `IE` direto no emit (o `IEST` é outra coisa).
          inscricaoEstadual: filho(emit, "IE")?.textContent?.trim() || null,
          inscricaoMunicipal: filho(emit, "IM")?.textContent?.trim() || null,
          telefone: texto(enderEmit, "fone"),
          email: null,
        }
      : null,
    destinatario: dest
      ? {
          ...pessoaVazia(),
          nome: texto(dest, "xNome"),
          documento: texto(dest, "CNPJ") ?? texto(dest, "CPF") ?? texto(dest, "idEstrangeiro"),
          endereco: montarEndereco(el(dest, "enderDest")),
          telefone: texto(el(dest, "enderDest"), "fone"),
          email: texto(dest, "email"),
        }
      : null,
    itens,
    subtotal: numero(icmsTot, "vProd"),
    descontoTotal: descontoTotal && descontoTotal > 0 ? descontoTotal : null,
    total: numero(icmsTot, "vNF"),
    formasPagamento,
    troco: numero(pag, "vTroco"),
    qrCode: texto(supl, "qrCode"),
    urlConsulta: texto(supl, "urlChave"),
    // Com `vTotTrib`, a linha é o valor dele e o `infCpl` sai inteiro, como
    // informação complementar; sem ele, a linha é o trecho do `infCpl`.
    tributosAproximados: temVTotTrib
      ? `Tributos aproximados: ${formatarMoeda(vTotTrib as number)} (Lei 12.741/2012)`
      : tributos,
    informacoesComplementares: temVTotTrib ? infCpl : resto,
  };
}

function formatarPercentual2(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/** A linha de tributos aproximados da NFS-e Nacional, só com o que o XML traz. */
function tributosDaNfse(totTrib: Element | undefined, xInfComp: string | null): string | null {
  const vFed = numero(totTrib, "vTotTribFed");
  const vEst = numero(totTrib, "vTotTribEst");
  const vMun = numero(totTrib, "vTotTribMun");
  if (vFed !== null || vEst !== null || vMun !== null) {
    const partes = juntar(
      [
        vFed !== null ? `federais ${formatarMoeda(vFed)}` : null,
        vEst !== null ? `estaduais ${formatarMoeda(vEst)}` : null,
        vMun !== null ? `municipais ${formatarMoeda(vMun)}` : null,
      ],
      ", ",
    );
    return `Tributos aproximados: ${partes}`;
  }
  const pFed = numero(totTrib, "pTotTribFed");
  const pEst = numero(totTrib, "pTotTribEst");
  const pMun = numero(totTrib, "pTotTribMun");
  if (pFed !== null || pEst !== null || pMun !== null) {
    const partes = juntar(
      [
        pFed !== null ? `federais ${formatarPercentual2(pFed)}` : null,
        pEst !== null ? `estaduais ${formatarPercentual2(pEst)}` : null,
        pMun !== null ? `municipais ${formatarPercentual2(pMun)}` : null,
      ],
      ", ",
    );
    return `Tributos aproximados: ${partes}`;
  }
  const pSN = numero(totTrib, "pTotTribSN");
  if (pSN !== null && pSN > 0) {
    return `Tributos aproximados: ${formatarPercentual2(pSN)} (Simples Nacional, Lei 12.741/2012)`;
  }
  return xInfComp && MENCIONA_TRIBUTOS.test(xInfComp) ? xInfComp : null;
}

function interpretarNFSe(doc: Document): NotaFiscalVisual {
  const confirmacaoGiap = interpretarConfirmacaoGiap(doc);
  if (confirmacaoGiap) return confirmacaoGiap;

  const infNFSe = el(doc, "infNFSe");
  const infDPS = el(doc, "infDPS");
  const emit = filho(infNFSe, "emit");
  const prest = el(infDPS, "prest") ?? el(doc, "prest");
  const toma = el(infDPS, "toma") ?? el(doc, "toma");
  const serv = el(infDPS, "serv") ?? el(doc, "serv");
  // Dois grupos "valores": o da NFS-e (base, ISS, líquido) e o da DPS
  // (valor do serviço, descontos, deduções, tributos).
  const valoresNfse = filho(infNFSe, "valores");
  const valoresDps = filho(infDPS, "valores") ?? el(doc, "valores");
  const cServ = el(serv, "cServ");

  const descricaoServico = texto(cServ, "xDescServ") ?? texto(serv, "xDescServ") ?? texto(serv, "discrim");
  const valorServicos = numero(el(valoresDps, "vServPrest"), "vServ") ?? numero(valoresDps, "vServ");
  const valorLiquido = numero(valoresNfse, "vLiq") ?? numero(valoresDps, "vLiq");
  const valorReferencia = valorLiquido ?? valorServicos;

  const pessoaLoja = emit ?? prest;
  const reconhecido = Boolean(pessoaLoja && (descricaoServico || valorReferencia !== null));
  if (!reconhecido) return notaNaoReconhecida("nfse");

  const cidadeEmissao = texto(infNFSe, "xLocEmi");
  const enderLoja = emit ? el(emit, "enderNac") : el(prest, "end");
  const descIncond = numero(valoresDps, "vDescIncond");
  const descCond = numero(valoresDps, "vDescCond");
  const descontos =
    descIncond !== null || descCond !== null ? (descIncond ?? 0) + (descCond ?? 0) : null;
  const tpRet = texto(el(valoresDps, "tribMun"), "tpRetISSQN");
  const vDR = numero(el(valoresDps, "vDedRed"), "vDR") ?? numero(valoresNfse, "vCalcDR");

  const idAttr = infNFSe?.getAttribute("Id") ?? null;
  const chave = idAttr ? idAttr.replace(/^NFS/, "") : null;
  const xInfComp = texto(serv, "xInfComp");

  return {
    ...notaNaoReconhecida("nfse"),
    reconhecido: true,
    numero: texto(infNFSe, "nNFSe"),
    serie: null,
    dataEmissao: texto(infNFSe, "dhProc") ?? texto(infDPS, "dhEmi"),
    chaveAcesso: chave,
    emitente: {
      nome: texto(pessoaLoja, "xNome"),
      nomeFantasia: texto(pessoaLoja, "xFant"),
      documento: texto(pessoaLoja, "CNPJ") ?? texto(pessoaLoja, "CPF"),
      endereco: montarEndereco(enderLoja, cidadeEmissao),
      inscricaoEstadual: null,
      inscricaoMunicipal: texto(pessoaLoja, "IM"),
      telefone: texto(pessoaLoja, "fone"),
      email: texto(pessoaLoja, "email"),
    },
    destinatario: toma
      ? {
          ...pessoaVazia(),
          nome: texto(toma, "xNome"),
          documento: texto(toma, "CNPJ") ?? texto(toma, "CPF") ?? texto(toma, "NIF"),
          endereco: montarEndereco(el(toma, "end")),
          telefone: texto(toma, "fone"),
          email: texto(toma, "email"),
        }
      : null,
    itens: [
      {
        codigo: null,
        descricao: descricaoServico ?? "Serviço prestado",
        unidade: null,
        quantidade: 1,
        valorUnitario: valorServicos ?? valorReferencia ?? 0,
        desconto: null,
        valorTotal: valorServicos ?? valorReferencia ?? 0,
      },
    ],
    total: valorReferencia,
    tributosAproximados: tributosDaNfse(el(valoresDps, "totTrib"), xInfComp),
    informacoesComplementares: xInfComp && !MENCIONA_TRIBUTOS.test(xInfComp) ? xInfComp : null,
    servico: {
      codigoTributacao: texto(cServ, "cTribNac"),
      descricaoTributacao: texto(infNFSe, "xTribNac"),
      discriminacao: descricaoServico,
      localPrestacao: texto(infNFSe, "xLocPrestacao"),
      competencia: texto(infDPS, "dCompet"),
      numeroDps: texto(infDPS, "nDPS"),
      serieDps: texto(infDPS, "serie"),
      valorServicos,
      descontos,
      deducoes: vDR,
      baseCalculo: numero(valoresNfse, "vBC"),
      aliquotaIss: numero(valoresNfse, "pAliqAplic"),
      valorIss: numero(valoresNfse, "vISSQN"),
      issRetido: tpRet === null ? null : tpRet !== "1",
      retencoes: numero(valoresNfse, "vTotalRet"),
      valorLiquido,
    },
  };
}

export function interpretarXmlNotaFiscal(
  xmlTexto: string,
  tipo: TipoNotaFiscal,
): NotaFiscalVisual {
  try {
    const doc = new DOMParser().parseFromString(xmlTexto, "text/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) {
      return notaNaoReconhecida(tipo);
    }
    return tipo === "nfe" ? interpretarNFe(doc) : interpretarNFSe(doc);
  } catch (err) {
    console.error("Erro ao interpretar XML da nota fiscal:", err);
    return notaNaoReconhecida(tipo);
  }
}

// ---------------------------------------------------------------------------
// Montar o HTML
// ---------------------------------------------------------------------------

const e = (valor: string) => escaparHtml(valor);

function formatarData(iso: string | null): string | null {
  if (!iso) return null;
  // A Giap manda "dd/mm/aaaa": o `Date` leria mês/dia (05/11 viraria 11/05).
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) return iso;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  const dia = data.toLocaleDateString("pt-BR");
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia} às ${hora}`;
}

/** "2026-11-13" → "11/2026", sem passar por Date (sem susto de fuso). */
function formatarCompetencia(dCompet: string | null): string | null {
  const m = dCompet?.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[2]}/${m[1]}` : dCompet;
}

function formatarDocumento(doc: string | null): string | null {
  if (!doc) return null;
  const d = doc.replace(/\D/g, "");
  if (/^\d{14}$/.test(d)) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (/^\d{11}$/.test(d)) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return doc;
}

function rotuloDocumento(doc: string | null): string {
  const d = doc?.replace(/\D/g, "") ?? "";
  return d.length === 11 ? "CPF" : d.length === 14 ? "CNPJ" : "Documento";
}

function formatarTelefone(fone: string | null): string | null {
  if (!fone) return null;
  const d = fone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return fone;
}

function formatarQuantidade(q: number): string {
  return q.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

function emBlocos(chave: string, tamanho: number): string {
  return chave.replace(/\s/g, "").match(new RegExp(`.{1,${tamanho}}`, "g"))?.join(" ") ?? chave;
}

function iniciais(nome: string | null): string | null {
  if (!nome) return null;
  const palavras = nome
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p))
    .filter((p) => !/^(da|de|do|das|dos|e|ltda|me|epp|s\/a|sa)$/i.test(p));
  const letras = palavras.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  return letras || null;
}

/** Junta o emitente do XML com as Configurações da loja: o XML manda, a loja só completa. */
function completarEmitente(
  doXml: PessoaNotaFiscalVisual | null,
  loja: LojaDoRecibo | null,
): PessoaNotaFiscalVisual | null {
  if (!doXml && !loja) return null;
  const x = doXml ?? pessoaVazia();
  if (!loja) return x;
  // XML de outra empresa (enviado à mão): não mistura os dados da loja.
  const digitos = (d: string | null) => d?.replace(/\D/g, "") ?? "";
  if (x.documento && loja.cnpj && digitos(x.documento) !== digitos(loja.cnpj)) return x;
  if (x.documento && !loja.cnpj && doXml?.nome) return x;
  return {
    nome: x.nome ?? loja.razaoSocial,
    nomeFantasia: x.nomeFantasia ?? loja.nomeFantasia,
    documento: x.documento ?? loja.cnpj,
    endereco: x.endereco ?? loja.endereco,
    inscricaoEstadual: x.inscricaoEstadual ?? loja.inscricaoEstadual,
    inscricaoMunicipal: x.inscricaoMunicipal ?? loja.inscricaoMunicipal,
    telefone: x.telefone ?? loja.telefone,
    email: x.email ?? loja.email,
  };
}

/** Uma linha "rótulo: valor" de uma lista `<dl class="campos">`; some sem valor. */
function campo(rotulo: string, valorHtml: string | null, normal = false): string {
  if (!valorHtml) return "";
  return `<dt>${rotulo}</dt><dd${normal ? ' class="normal"' : ""}>${valorHtml}</dd>`;
}

function linhaValor(
  rotulo: string,
  valor: number | null,
  { classe = "", negativo = false }: { classe?: string; negativo?: boolean } = {},
): string {
  if (valor === null) return "";
  const texto = negativo ? `− ${formatarMoeda(valor)}` : formatarMoeda(valor);
  return `<div${classe ? ` class="${classe}"` : ""}><dt>${rotulo}</dt><dd>${texto}</dd></div>`;
}

function qrSvg(conteudo: string): string {
  return renderToStaticMarkup(
    createElement(QRCodeSVG, {
      value: conteudo,
      size: 132,
      level: "M",
      marginSize: 0,
      bgColor: "#ffffff",
      fgColor: "#000000",
      className: "qr",
      role: "img",
      "aria-label": "QR code para consultar a nota",
    }),
  );
}

const ESTILO = `
  :root {
    --texto: #3a2a3f; --suave: #655468; --roxo: #B38DAC; --roxo-escuro: #6b4a66;
    --linha: #dcd0da; --aviso-fundo: #fdf3e7; --aviso-texto: #6e4a1c;
    --ok-fundo: #eaf7ee; --ok-texto: #1f6b3d;
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0; padding: 12px; background: #efe9ee; color: var(--texto);
    font-family: Arial, "Liberation Sans", Helvetica, sans-serif; font-size: 13px; line-height: 1.4;
  }
  p { margin: 0; }
  .doc {
    container-type: inline-size; max-width: 794px; margin: 0 auto; background: #fff;
    border-top: 5px solid var(--roxo); box-shadow: 0 1px 6px rgba(58, 42, 63, .18);
  }
  .folha { padding: 12px 10px 14px; }
  .topo { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: flex-start; }
  .loja { display: flex; gap: 10px; align-items: flex-start; flex: 1 1 200px; min-width: 0; }
  .logo {
    flex: 0 0 auto; width: 40px; height: 40px; border-radius: 10px; border: 2px solid var(--roxo);
    display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; color: var(--roxo-escuro);
  }
  .loja h1 { font-size: 16px; line-height: 1.2; margin: 0 0 2px; overflow-wrap: anywhere; }
  .mini { font-size: 11px; color: var(--suave); overflow-wrap: anywhere; }
  .nota-id { flex: 1 1 150px; border: 1.5px solid var(--texto); border-radius: 8px; padding: 6px 10px; }
  .nota-id .tipo { font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
  .nota-id .num { font-size: 18px; font-weight: 800; line-height: 1.15; font-variant-numeric: tabular-nums; }
  .aviso {
    margin-top: 10px; padding: 6px 10px; border-left: 4px solid #c98a2b;
    background: var(--aviso-fundo); color: var(--aviso-texto); font-size: 11px;
  }
  .aviso b { color: #53360f; }
  .aviso.ok { border-left-color: var(--ok-texto); background: var(--ok-fundo); color: var(--ok-texto); }
  .aviso.ok a { color: var(--ok-texto); font-weight: 700; }
  .secao { margin-top: 12px; }
  .h2 {
    margin: 0 0 6px; padding-bottom: 3px; border-bottom: 2px solid var(--roxo);
    font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--roxo-escuro);
  }
  .pares { display: grid; grid-template-columns: 1fr; gap: 10px; }
  .campos { display: grid; grid-template-columns: auto 1fr; gap: 1px 8px; margin: 0; }
  .campos dt { font-size: 11px; color: var(--suave); }
  .campos dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; min-width: 0; }
  .campos dd.normal { font-weight: 400; }
  .placa {
    display: inline-block; border: 1.5px solid var(--texto); border-radius: 4px; padding: 0 6px;
    font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; font-weight: 700; letter-spacing: .08em;
  }
  .faixa { margin: 0 0 6px; padding: 4px 8px; border: 1px dashed var(--roxo-escuro); border-radius: 6px; font-size: 11.5px; font-weight: 700; color: var(--roxo-escuro); }
  .itens-cab { display: none; }
  .item { display: flex; flex-wrap: wrap; gap: 0 10px; padding: 5px 0; border-bottom: 1px dashed var(--linha); font-variant-numeric: tabular-nums; }
  .item > span { font-size: 12px; }
  .item > span::before { content: attr(data-r); color: var(--suave); font-size: 10.5px; }
  .item .n { font-weight: 700; }
  .item .desc { flex: 1 1 60%; font-weight: 600; font-size: 13px; min-width: 0; overflow-wrap: anywhere; }
  .item .quebra { flex: 0 0 100%; height: 0; }
  .item .tot { margin-left: auto; font-weight: 700; font-size: 13px; }
  .item .larga { display: none; }
  .obs-item { flex: 0 0 100%; font-size: 11px; color: var(--suave); }
  .fecho { display: grid; grid-template-columns: 1fr; gap: 10px; margin-top: 10px; }
  .linhas { margin: 0; font-variant-numeric: tabular-nums; }
  .linhas div { display: flex; justify-content: space-between; gap: 10px; padding: 2px 0; }
  .linhas dt { color: var(--suave); }
  .linhas dd { margin: 0; font-weight: 600; white-space: nowrap; }
  .linhas .total { margin-top: 4px; padding: 6px 0; border-top: 2px solid var(--texto); border-bottom: 2px solid var(--texto); align-items: baseline; }
  .linhas .total dt { color: var(--texto); font-weight: 800; font-size: 14px; text-transform: uppercase; }
  .linhas .total dd { font-size: 20px; font-weight: 800; }
  .linhas .forte dt, .linhas .forte dd { color: var(--texto); font-weight: 700; }
  .caixa { border: 1px solid var(--linha); border-radius: 8px; padding: 8px 10px; }
  .caixa h3 { margin: 0 0 4px; font-size: 12px; }
  .caixa ul { margin: 0; padding-left: 16px; }
  .caixa li { margin: 1px 0; }
  .fiscal { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: flex-start; }
  .qr { width: 118px; height: 118px; flex: 0 0 auto; display: block; margin: 0 auto; }
  .fiscal .dados { flex: 1 1 180px; min-width: 0; }
  .chave {
    font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; font-size: 12.5px; font-weight: 700;
    letter-spacing: .02em; word-spacing: .25em; line-height: 1.5; overflow-wrap: anywhere;
  }
  .tributos { margin-top: 8px; padding-top: 6px; border-top: 1px dashed var(--linha); font-size: 11.5px; overflow-wrap: anywhere; }
  .rodape { margin-top: 14px; padding-top: 8px; border-top: 2px solid var(--roxo); text-align: center; }
  .rodape .obrigado { font-size: 14px; font-weight: 700; overflow-wrap: anywhere; }
  .assinatura { margin: 26px auto 0; max-width: 260px; border-top: 1px solid var(--texto); padding-top: 2px; font-size: 11px; color: var(--suave); }
  @container (min-width: 640px) {
    .folha { padding: 26px 30px 24px; }
    .loja h1 { font-size: 20px; }
    .logo { width: 52px; height: 52px; font-size: 19px; }
    .nota-id { flex: 0 0 250px; text-align: right; }
    .so-estreito { display: none; }
    .item > span { white-space: nowrap; }
    .item .desc, .item .obs-item { white-space: normal; }
    .pares { grid-template-columns: 1fr 1fr; gap: 22px; }
    .itens-cab, .item {
      display: grid; gap: 0 10px; align-items: baseline;
      grid-template-columns: 18px 84px minmax(0, 1fr) 26px 50px 76px 76px 86px;
    }
    .itens-cab { padding: 0 0 4px; border-bottom: 1px solid var(--texto); font-size: 10.5px; font-weight: 700; color: var(--suave); text-transform: uppercase; }
    .item > span::before { content: none; }
    .item .quebra { display: none; }
    .item .larga { display: block; overflow: hidden; text-overflow: ellipsis; }
    .item .tot { margin-left: 0; }
    .dir { text-align: right; }
    .obs-item { grid-column: 3 / -1; }
    .fecho { grid-template-columns: minmax(0, 1fr) 280px; gap: 22px; }
    .fecho .linhas { order: 2; }
    .fecho .linhas:only-child { grid-column: 2; }
    .qr { width: 132px; height: 132px; margin: 0; }
  }
  @container (max-width: 240px) {
    .folha { padding: 8px 4px 10px; }
    .logo { display: none; }
    .nota-id .num { font-size: 16px; }
    .linhas .total dd { font-size: 17px; }
    .chave { font-size: 11.5px; }
  }
  @media print {
    @page { margin: 6mm; }
    body { background: #fff; padding: 0; color: #1d1420; font-size: 12px; }
    .doc { max-width: none; box-shadow: none; }
    .secao, .item, .caixa, .fiscal { break-inside: avoid; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

/** "NFS-e", "NF-e" (modelo 55) ou "NFC-e". */
function siglaDaNota(dados: NotaFiscalVisual): string {
  if (dados.tipo === "nfse") return "NFS-e";
  return dados.modelo === "55" ? "NF-e" : "NFC-e";
}

function htmlCabecalho(dados: NotaFiscalVisual, emitente: PessoaNotaFiscalVisual | null): string {
  const nfse = dados.tipo === "nfse";
  const nomePrincipal = emitente?.nomeFantasia ?? emitente?.nome ?? null;
  const razao = emitente?.nomeFantasia && emitente.nome !== emitente.nomeFantasia ? emitente.nome : null;
  const titulo = nomePrincipal ?? formatarDocumento(emitente?.documento ?? null);
  const logo = iniciais(nomePrincipal);

  const linhaDocs = juntar([
    razao ? e(razao) : null,
    emitente?.documento ? `${rotuloDocumento(emitente.documento)} ${e(formatarDocumento(emitente.documento) ?? "")}` : null,
    !nfse && emitente?.inscricaoEstadual ? `IE ${e(emitente.inscricaoEstadual)}` : null,
    nfse && emitente?.inscricaoMunicipal ? `Inscr. municipal ${e(emitente.inscricaoMunicipal)}` : null,
  ]);
  const linhaContato = juntar([
    emitente?.telefone ? e(formatarTelefone(emitente.telefone) ?? "") : null,
    emitente?.email ? e(emitente.email) : null,
  ]);

  const dataEmissao = formatarData(dados.dataEmissao);
  const numeroNota = dados.numero ? `Nº ${e(dados.numero)}` : null;
  const linhaSerie = nfse
    ? juntar([dataEmissao ? `Emitida em ${e(dataEmissao)}` : null])
    : juntar([dados.serie ? `Série ${e(dados.serie)}` : null, dataEmissao ? e(dataEmissao) : null]);
  const servico = dados.servico;
  const linhaDps = servico
    ? juntar([
        servico.competencia ? `Competência ${e(formatarCompetencia(servico.competencia) ?? "")}` : null,
        servico.numeroDps
          ? `DPS ${e(servico.numeroDps)}${servico.serieDps ? `, série ${e(servico.serieDps)}` : ""}`
          : null,
      ])
    : null;

  return `
    <header class="topo">
      <div class="loja">
        ${logo ? `<div class="logo" aria-hidden="true">${e(logo)}</div>` : ""}
        <div style="min-width:0">
          ${titulo ? `<h1>${e(titulo)}</h1>` : ""}
          ${linhaDocs ? `<p class="mini">${linhaDocs}</p>` : ""}
          ${emitente?.endereco ? `<p class="mini">${e(emitente.endereco)}</p>` : ""}
          ${linhaContato ? `<p class="mini">${linhaContato}</p>` : ""}
        </div>
      </div>
      <div class="nota-id">
        <p class="tipo">Recibo da ${siglaDaNota(dados)}</p>
        ${numeroNota ? `<p class="num">${numeroNota}</p>` : ""}
        ${linhaSerie ? `<p class="mini">${linhaSerie}</p>` : ""}
        ${linhaDps ? `<p class="mini">${linhaDps}</p>` : ""}
      </div>
    </header>`;
}

function htmlAviso(dados: NotaFiscalVisual): string {
  const sigla = siglaDaNota(dados);
  const oficial =
    sigla === "NFS-e" ? "o DANFSe (o documento oficial da NFS-e)" : sigla === "NF-e" ? "o DANFE" : "o DANFE NFC-e";
  const conferir = dados.qrCode
    ? " confira pelo QR code ou pela chave de acesso no fim desta folha."
    : dados.chaveAcesso && !dados.linkOficial
      ? " confira pela chave de acesso no fim desta folha."
      : "";
  const aviso = `
    <p class="aviso">
      <b>Recibo para o cliente.</b> Não substitui ${oficial}. O documento fiscal válido é a
      nota autorizada (o XML)${conferir ? `:${conferir}` : "."}
    </p>`;
  // Só vira link o endereço da prefeitura (https, *.giap.com.br), a mesma
  // regra de quem abre o link no programa (`linkExterno.ts`).
  const giap = dados.linkOficial && podeAbrirNoNavegador(dados.linkOficial)
    ? `
    <p class="aviso ok">
      Esta prefeitura confirma a emissão, mas não manda os itens e os valores no arquivo da nota.
      O documento oficial completo fica no site dela:
      <a href="${e(dados.linkOficial)}" target="_blank" rel="noopener">Ver documento oficial completo</a>
    </p>`
    : "";
  return aviso + giap;
}

function htmlClienteEVeiculo(dados: NotaFiscalVisual, os: OsDoRecibo | null): string {
  const pessoa: PessoaNotaFiscalVisual | null =
    dados.destinatario ??
    (dados.linkOficial && os?.cliente ? { ...pessoaVazia(), nome: os.cliente.nome, documento: os.cliente.documento } : null);
  const nfse = dados.tipo === "nfse";
  // O telefone do cadastro só completa um cliente que a nota tem (ou o da
  // Giap, pela OS). Nota sem cliente sai sem nenhum dado dele (18/11).
  const telefone = pessoa ? (pessoa.telefone ?? os?.telefoneCliente ?? null) : null;
  const contato = juntar([
    telefone ? e(formatarTelefone(telefone) ?? "") : null,
    pessoa?.email ? e(pessoa.email) : null,
  ]);
  const camposCliente = [
    campo("Nome", pessoa?.nome ? e(pessoa.nome) : null),
    campo(
      rotuloDocumento(pessoa?.documento ?? null),
      pessoa?.documento ? e(formatarDocumento(pessoa.documento) ?? "") : null,
    ),
    campo("Endereço", pessoa?.endereco ? e(pessoa.endereco) : null, true),
    campo(nfse ? "Contato" : "Telefone", contato, true),
  ].join("");

  const cliente = camposCliente
    ? `<div><h2 class="h2">${nfse ? "Cliente (tomador do serviço)" : "Cliente"}</h2><dl class="campos">${camposCliente}</dl></div>`
    : "";

  let veiculo = "";
  if (os) {
    const nomeDaOrdem = os.tipo === "venda_balcao" ? "Venda" : "OS";
    const pessoaDaOs = nfse && os.mecanico ? `mecânico: ${os.mecanico}` : os.atendente ? `atendente: ${os.atendente}` : null;
    const camposVeiculo = [
      campo("Modelo", os.veiculo ? e(os.veiculo) : null),
      campo("Placa", os.placa ? `<span class="placa">${e(os.placa)}</span>` : null),
      campo("Quilometragem", os.km !== null && os.km > 0 ? `${os.km.toLocaleString("pt-BR")} km` : null),
      campo(
        "Ordem de serviço",
        e(juntar([`${nomeDaOrdem} nº ${os.numero}`, pessoaDaOs]) ?? ""),
        true,
      ),
    ].join("");
    const temVeiculo = Boolean(os.veiculo || os.placa);
    veiculo = `<div><h2 class="h2">${temVeiculo ? "Veículo" : "Atendimento"}</h2><dl class="campos">${camposVeiculo}</dl></div>`;
  }

  if (!cliente && !veiculo) return "";
  return `<section class="secao"><div class="pares">${cliente}${veiculo}</div></section>`;
}

interface LinhaDeItem {
  codigo: string | null;
  descricao: string;
  unidade: string | null;
  quantidade: number;
  valorUnitario: number;
  desconto: number | null;
  total: number;
  observacao: string | null;
}

function htmlItens(linhas: LinhaDeItem[], comCodigo: boolean, rotuloDescricao: string): string {
  const cab = `
    <div class="itens-cab" aria-hidden="true">
      <span>#</span><span>${comCodigo ? "Código" : ""}</span><span>${rotuloDescricao}</span><span>${comCodigo ? "Un." : ""}</span>
      <span class="dir">Qtde</span><span class="dir">Valor unit.</span><span class="dir">Desconto</span><span class="dir">Total</span>
    </div>`;
  const corpo = linhas
    .map((l, i) => {
      const unidade = l.unidade ? ` ${e(l.unidade)}` : "";
      const obs = juntar([
        comCodigo && l.codigo ? `<span class="so-estreito">Cód. ${e(l.codigo)}</span>` : null,
        l.observacao ? e(l.observacao) : null,
      ]);
      return `
        <div class="item">
          <span class="n">${i + 1}</span>
          <span class="larga">${l.codigo ? e(l.codigo) : ""}</span>
          <span class="desc">${e(l.descricao)}</span>
          <span class="quebra"></span>
          <span class="larga">${l.unidade ? e(l.unidade) : ""}</span>
          <span class="dir">${formatarQuantidade(l.quantidade)}<span class="so-estreito">${unidade} ×</span></span>
          <span class="dir">${formatarMoeda(l.valorUnitario)}</span>
          ${l.desconto !== null ? `<span class="dir" data-r="desconto ">− ${formatarMoeda(l.desconto)}</span>` : `<span class="dir larga"></span>`}
          <span class="tot dir">${formatarMoeda(l.total)}</span>
          ${obs ? `<span class="obs-item">${obs}</span>` : ""}
        </div>`;
    })
    .join("");
  return cab + corpo;
}

function prazoPorExtenso(dias: number): string {
  if (dias % 365 === 0) return dias === 365 ? "1 ano" : `${dias / 365} anos`;
  return `${dias} dias`;
}

// A garantia que o sistema conhece hoje é a das peças (cadastro da peça), e as
// peças vão na NFC-e. A garantia do serviço ainda não tem cadastro (#1033).
function htmlGarantia(os: OsDoRecibo | null): string {
  if (!os) return "";
  const comGarantia = os.itens.filter((i) => i.tipo === "peca" && i.garantiaDias && i.garantiaDias > 0);
  if (comGarantia.length === 0) return "";
  const vistos = new Set<string>();
  const linhas = comGarantia
    .filter((i) => {
      const chave = `${i.descricao}|${i.garantiaDias}`;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    })
    .map((i) => `<li><b>${e(i.descricao)}:</b> garantia de ${prazoPorExtenso(i.garantiaDias as number)}, a contar desta nota.</li>`)
    .join("");
  return `
    <div class="caixa">
      <h3>Garantia</h3>
      <ul>${linhas}<li>Guarde este recibo: ele é o comprovante da garantia.</li></ul>
    </div>`;
}

// "Pago em pix" e "Pago em outros" soavam estranho no recibo (Sofia, 20/11,
// #1147): o Pix com maiúscula, e o "Outros" da SEFAZ (tPag 99) vira
// "Pago (outra forma)".
export function rotuloDoPagamento(forma: string | null): string {
  if (!forma) return "Pago";
  const minuscula = forma.toLowerCase();
  if (minuscula === "outros") return "Pago (outra forma)";
  if (minuscula === "pix") return "Pago em Pix";
  return `Pago em ${minuscula}`;
}

function htmlProdutosNfce(dados: NotaFiscalVisual, os: OsDoRecibo | null): string {
  const linhas: LinhaDeItem[] = dados.itens.map((i) => ({
    codigo: i.codigo,
    descricao: i.descricao,
    unidade: i.unidade,
    quantidade: i.quantidade,
    valorUnitario: i.valorUnitario,
    desconto: i.desconto,
    total: valorDaLinhaComDesconto(i.valorTotal, i.desconto),
    observacao: null,
  }));
  const pagamentos = dados.formasPagamento
    .map((fp) => linhaValor(rotuloDoPagamento(fp.forma), fp.valor))
    .join("");
  const mostrarSubtotal = dados.descontoTotal !== null && dados.subtotal !== null;
  const valores = `
    <dl class="linhas">
      ${mostrarSubtotal ? linhaValor(`Subtotal (${dados.itens.length} ${dados.itens.length === 1 ? "item" : "itens"})`, dados.subtotal) : ""}
      ${linhaValor("Descontos", dados.descontoTotal, { negativo: true })}
      ${linhaValor("Total", dados.total, { classe: "total" })}
      ${pagamentos}
      ${linhaValor("Troco", dados.troco, { classe: "forte" })}
    </dl>`;
  return `
    <section class="secao">
      <h2 class="h2">Produtos</h2>
      ${htmlItens(linhas, true, "Descrição")}
      <div class="fecho">${htmlGarantia(os)}${valores}</div>
    </section>`;
}

function htmlServicoNacional(dados: NotaFiscalVisual): string {
  const s = dados.servico;
  if (!s) return "";
  const codigo = s.codigoTributacao
    ? `${e(s.codigoTributacao)}${s.descricaoTributacao ? ` <span style="font-weight:400">· ${e(s.descricaoTributacao)}</span>` : ""}`
    : null;
  const linhas: LinhaDeItem[] = dados.itens.map((i) => ({
    codigo: null,
    descricao: i.descricao,
    unidade: null,
    quantidade: i.quantidade,
    valorUnitario: i.valorUnitario,
    desconto: null,
    total: i.valorTotal,
    observacao: null,
  }));
  const rotuloIss =
    s.aliquotaIss !== null
      ? `ISS (${formatarPercentual2(s.aliquotaIss)})${s.issRetido === null ? "" : s.issRetido ? ", retido" : ", não retido"}`
      : `ISS${s.issRetido === null ? "" : s.issRetido ? ", retido" : ", não retido"}`;
  const valores = `
    <dl class="linhas">
      ${linhaValor("Valor dos serviços", s.valorServicos)}
      ${s.descontos ? linhaValor("Desconto", s.descontos, { negativo: true }) : ""}
      ${s.deducoes ? linhaValor("Deduções", s.deducoes) : ""}
      ${linhaValor("Base de cálculo", s.baseCalculo, { classe: "forte" })}
      ${linhaValor(rotuloIss, s.valorIss)}
      ${linhaValor("Retenções", s.retencoes)}
      ${linhaValor("Valor líquido", s.valorLiquido ?? dados.total, { classe: "total" })}
    </dl>`;
  return `
    <section class="secao">
      <h2 class="h2">Serviço prestado</h2>
      ${
        codigo || s.localPrestacao
          ? `<dl class="campos" style="margin-bottom:8px">${campo("Código do serviço", codigo)}${campo("Local da prestação", s.localPrestacao ? e(s.localPrestacao) : null, true)}</dl>`
          : ""
      }
      ${htmlItens(linhas, false, "Discriminação")}
      <div class="fecho">${valores}</div>
    </section>`;
}

// NFS-e da Giap: o XML não traz itens nem valores. Com a OS ligada, o recibo
// mostra os serviços dela SÓ se o total dos serviços da OS bate com o valor
// da nota (resposta da contadora, 14/11, e decisão 4 da #1031). Senão, só o
// total da nota (se ele for conhecido) e "Itens na OS nº X".
function htmlServicoGiap(os: OsDoRecibo | null, valorDaNota: number | null): string {
  if (!os) return "";
  const nomeDaOrdem = `${os.tipo === "venda_balcao" ? "Venda" : "OS"} nº ${os.numero}`;
  const servicos = os.itens.filter((i) => i.tipo === "servico");
  const bate =
    valorDaNota !== null && servicos.length > 0 && mesmoValor(totalDosServicosDaOs(os.itens), valorDaNota);
  const total = `<dl class="linhas">${linhaValor("Total da nota", valorDaNota, { classe: "total" })}</dl>`;

  if (bate) {
    const linhas: LinhaDeItem[] = servicos.map((i) => ({
      codigo: null,
      descricao: i.descricao,
      unidade: null,
      quantidade: i.quantidade,
      valorUnitario: i.precoUnitario,
      desconto: i.desconto > 0 ? i.desconto : null,
      total: valorDoItemDaOs(i),
      observacao: null,
    }));
    return `
      <section class="secao">
        <h2 class="h2">Serviço prestado</h2>
        <p class="faixa">Documento sem valor fiscal - itens conforme ${e(nomeDaOrdem)}</p>
        ${htmlItens(linhas, false, "Discriminação")}
        <div class="fecho">${total}</div>
      </section>`;
  }
  return `
    <section class="secao">
      <h2 class="h2">Serviço prestado</h2>
      <p class="mini">Itens na ${e(nomeDaOrdem)}</p>
      ${valorDaNota !== null ? `<div class="fecho">${total}</div>` : ""}
    </section>`;
}

function htmlDadosFiscais(dados: NotaFiscalVisual): string {
  const giap = Boolean(dados.linkOficial);
  const chave = dados.chaveAcesso
    ? giap
      ? e(dados.chaveAcesso)
      : e(emBlocos(dados.chaveAcesso, dados.tipo === "nfse" ? 5 : 4))
    : null;
  const dataProt = formatarData(dados.dataProtocolo);
  const protocolo = dados.protocolo ? e(juntar([dados.protocolo, dataProt]) ?? "") : null;
  const consulta = dados.qrCode
    ? "Aponte a câmera para o QR code, ou digite a chave no site da Secretaria da Fazenda do estado."
    : null;
  const extras = [
    dados.tributosAproximados ? `<p class="tributos"><b>${e(dados.tributosAproximados)}</b></p>` : "",
    dados.informacoesComplementares
      ? `<p class="tributos">${e(dados.informacoesComplementares)}</p>`
      : "",
  ].join("");

  if (!chave && !protocolo && !dados.qrCode && !extras) return "";
  return `
    <section class="secao">
      <h2 class="h2">Dados fiscais da nota</h2>
      <div class="fiscal">
        ${dados.qrCode ? qrSvg(dados.qrCode) : ""}
        <div class="dados">
          ${chave ? `<p class="mini">${giap ? "Código de verificação" : dados.tipo === "nfse" ? "Chave de acesso da NFS-e" : "Chave de acesso"}</p><p class="chave">${chave}</p>` : ""}
          <dl class="campos" style="margin-top:6px">
            ${campo(giap ? "Lote e RPS" : "Protocolo", protocolo)}
            ${campo("Consulta", consulta, true)}
            ${dados.urlConsulta && !dados.qrCode ? campo("Consulta", e(dados.urlConsulta), true) : ""}
          </dl>
          ${extras}
        </div>
      </div>
    </section>`;
}

function htmlRodape(dados: NotaFiscalVisual, emitente: PessoaNotaFiscalVisual | null): string {
  const primeiroNome = dados.destinatario?.nome?.split(/\s+/)[0] ?? null;
  const pessoaFisica = (dados.destinatario?.documento?.replace(/\D/g, "").length ?? 0) === 11;
  const obrigado = primeiroNome && pessoaFisica ? `Obrigado pela preferência, ${e(primeiroNome)}!` : "Obrigado pela preferência!";
  const contato = emitente?.telefone
    ? `Dúvida ou problema? Fale com a loja: ${e(formatarTelefone(emitente.telefone) ?? "")}.`
    : null;
  return `
    <footer class="rodape">
      <p class="obrigado">${obrigado}</p>
      ${contato ? `<p class="mini">${contato}</p>` : ""}
      <p class="mini">Emitido pelo Sakura System</p>
      ${dados.tipo === "nfse" ? `<p class="assinatura">Assinatura do cliente</p>` : ""}
    </footer>`;
}

export function montarHtmlVisualNotaFiscal(
  dados: NotaFiscalVisual,
  contexto: ContextoDoRecibo = CONTEXTO_VAZIO,
): string {
  const { os, loja } = contexto;
  const emitente = completarEmitente(dados.emitente, loja);
  const titulo = `Recibo da ${siglaDaNota(dados)}`;

  let corpo: string;
  if (dados.tipo === "nfe") corpo = htmlProdutosNfce(dados, os);
  else if (dados.linkOficial) corpo = htmlServicoGiap(os, contexto.valorDaNota);
  else corpo = htmlServicoNacional(dados);

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${titulo}${dados.numero ? ` nº ${e(dados.numero)}` : ""}</title>
<style>${ESTILO}</style>
</head>
<body>
  <article class="doc">
    <div class="folha">
      ${htmlCabecalho(dados, emitente)}
      ${htmlAviso(dados)}
      ${htmlClienteEVeiculo(dados, os)}
      ${corpo}
      ${htmlDadosFiscais(dados)}
      ${htmlRodape(dados, emitente)}
    </div>
  </article>
</body>
</html>`;
}
