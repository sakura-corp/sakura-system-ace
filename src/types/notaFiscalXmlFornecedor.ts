// Item extraído do XML da nota fiscal (NFe) que o fornecedor emitiu — não
// confundir com src/types/itemNotaFiscal.ts, que é o item extraído por IA a
// partir de foto/PDF em Estoque → "Importar por foto".
export interface ItemNotaFiscalXml {
  codigo_barras: string | null;
  codigo_interno_xml: string | null;
  descricao: string;
  ncm: string | null;
  cfop_padrao: string | null;
  unidade: string | null;
  quantidade: number;
  preco_unitario: number;
  origem: string | null;
  cst_ou_csosn: string | null;
  aliquota_icms: number | null;
}

// Uma parcela da nota (no XML: `cobr` → `dup`). Vira uma conta a pagar (#1020).
export interface DuplicataNotaFiscalXml {
  numero: string | null;
  /** Dia de calendário "AAAA-MM-DD", como está na nota; nulo se vier ilegível. */
  vencimento: string | null;
  valor: number;
}

export interface NotaFiscalXmlExtraida {
  fornecedor_cnpj: string | null;
  fornecedor_nome: string | null;
  numero: string | null;
  /** Os 44 dígitos da chave de acesso; nula se o XML não tiver uma chave válida. */
  chave_acesso: string | null;
  /** O total da nota (vNF); nulo se o XML não trouxer. */
  valor_total: number | null;
  itens: ItemNotaFiscalXml[];
  duplicatas: DuplicataNotaFiscalXml[];
}
