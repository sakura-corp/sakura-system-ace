import type {
  DuplicataNotaFiscalXml,
  ItemNotaFiscalXml,
  NotaFiscalXmlExtraida,
} from "@/types/notaFiscalXmlFornecedor";

// `File.text()` sempre decodifica como UTF-8, mas boa parte dos emissores de
// NFe (ERPs mais antigos, algumas SEFAZ) gera o XML em ISO-8859-1 — decodificar
// errado não dá erro nenhum, só corrompe acento/cedilha silenciosamente. O
// prólogo do XML (`<?xml ... encoding="..."?>`) é sempre ASCII puro, então dá
// pra ler ele primeiro pra descobrir qual encoding usar no arquivo inteiro.
export async function lerTextoXml(arquivo: File): Promise<string> {
  const buffer = await arquivo.arrayBuffer();
  const prefixo = new TextDecoder("utf-8").decode(buffer.slice(0, 200));
  const encoding = prefixo.match(/encoding=["']([^"']+)["']/i)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

// Só dígitos — pra comparar CNPJ do XML (sempre só números) com o CNPJ
// cadastrado no fornecedor (a usuária pode ter digitado com ponto/barra/traço
// ou não, ver schemas/fornecedor.ts, que não aplica máscara nenhuma).
export function normalizarCnpj(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

function textoDe(elemento: Element | null, tag: string): string | null {
  if (!elemento) return null;
  const encontrado = elemento.getElementsByTagName(tag)[0];
  const valor = encontrado?.textContent?.trim();
  return valor ? valor : null;
}

function numeroDe(elemento: Element | null, tag: string): number | null {
  const texto = textoDe(elemento, tag);
  if (texto === null) return null;
  const valor = Number(texto);
  return Number.isNaN(valor) ? null : valor;
}

// Lê o XML de uma NFe (nota fiscal eletrônica) que um fornecedor emitiu pra
// loja — formato público/estável do governo, não a API de emissão da loja
// (Focus NFe, ainda pendente). Aceita tanto `<nfeProc><NFe><infNFe>` (nota +
// protocolo de autorização) quanto `<NFe><infNFe>` ou `<infNFe>` soltos —
// `getElementsByTagName` acha a tag em qualquer nível, então a estrutura em
// volta não importa.
export function extrairNotaFiscalXml(xmlTexto: string): NotaFiscalXmlExtraida {
  const doc = new DOMParser().parseFromString(xmlTexto, "application/xml");

  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Arquivo XML inválido ou corrompido — confira se é o arquivo certo.");
  }

  const infNFe = doc.getElementsByTagName("infNFe")[0];
  if (!infNFe) {
    throw new Error(
      "Não encontrei os dados de uma nota fiscal eletrônica nesse arquivo (tag infNFe ausente).",
    );
  }

  const emit = infNFe.getElementsByTagName("emit")[0] ?? null;
  const ide = infNFe.getElementsByTagName("ide")[0] ?? null;

  const itens: ItemNotaFiscalXml[] = Array.from(infNFe.getElementsByTagName("det")).map((det) => {
    const prod = det.getElementsByTagName("prod")[0] ?? null;
    const icms = det.getElementsByTagName("ICMS")[0] ?? null;
    // A tag do ICMS varia por regime (ICMS00, ICMS20, ICMS60, ICMSSN101...) —
    // é sempre a única filha direta de <ICMS>, então pega ela pelo que for,
    // sem precisar listar todas as variações possíveis.
    const icmsVariante = icms ? (Array.from(icms.children)[0] as Element | undefined) : undefined;

    const ean = textoDe(prod, "cEAN");

    return {
      codigo_barras: ean && ean !== "SEM GTIN" ? ean : null,
      codigo_interno_xml: textoDe(prod, "cProd"),
      descricao: textoDe(prod, "xProd") ?? "",
      ncm: textoDe(prod, "NCM"),
      cfop_padrao: textoDe(prod, "CFOP"),
      unidade: textoDe(prod, "uCom"),
      quantidade: numeroDe(prod, "qCom") ?? 0,
      preco_unitario: numeroDe(prod, "vUnCom") ?? 0,
      origem: icmsVariante ? textoDe(icmsVariante, "orig") : null,
      cst_ou_csosn: icmsVariante
        ? (textoDe(icmsVariante, "CST") ?? textoDe(icmsVariante, "CSOSN"))
        : null,
      aliquota_icms: icmsVariante ? numeroDe(icmsVariante, "pICMS") : null,
    };
  });

  // As parcelas (#1020). O vencimento é dia de calendário e fica como texto:
  // passar por `new Date()` jogaria o dia pra trás no fuso do Brasil (#1005).
  const cobr = infNFe.getElementsByTagName("cobr")[0] ?? null;
  const duplicatas: DuplicataNotaFiscalXml[] = cobr
    ? Array.from(cobr.getElementsByTagName("dup")).map((dup) => {
        const vencimento = textoDe(dup, "dVenc");
        return {
          numero: textoDe(dup, "nDup"),
          vencimento: vencimento && /^\d{4}-\d{2}-\d{2}$/.test(vencimento) ? vencimento : null,
          valor: numeroDe(dup, "vDup") ?? 0,
        };
      })
    : [];

  const total = infNFe.getElementsByTagName("ICMSTot")[0] ?? null;

  return {
    fornecedor_cnpj: textoDe(emit, "CNPJ"),
    fornecedor_nome: textoDe(emit, "xNome"),
    numero: textoDe(ide, "nNF"),
    chave_acesso: chaveDeAcesso(doc, infNFe),
    valor_total: numeroDe(total, "vNF"),
    itens,
    duplicatas,
  };
}

// A chave de acesso (44 dígitos) identifica a nota no país inteiro: é ela que
// impede importar a mesma nota duas vezes (#1020). Vem do protocolo de
// autorização (`chNFe`) ou, sem ele, do `Id="NFe<chave>"` do infNFe.
function chaveDeAcesso(doc: Document, infNFe: Element): string | null {
  const candidatas = [
    doc.getElementsByTagName("chNFe")[0]?.textContent?.trim() ?? "",
    (infNFe.getAttribute("Id") ?? "").replace(/^NFe/, ""),
  ];
  return candidatas.find((c) => /^\d{44}$/.test(c)) ?? null;
}
