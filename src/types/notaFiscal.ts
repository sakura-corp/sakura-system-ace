export type TipoNotaFiscal = "nfe" | "nfse";
export type OrigemNotaFiscal = "manual" | "automatica";

export interface NotaFiscalArquivo {
  id: string;
  loja_id: string;
  tipo: TipoNotaFiscal;
  competencia: string;
  nome_arquivo: string;
  storage_path: string;
  ordem_servico_id: string | null;
  operador_id: string | null;
  criado_em: string;
  origem: OrigemNotaFiscal;
  numero: string | null;
  chave_acesso: string | null;
  status: string | null;
  focus_nfe_ref: string | null;
  ordem_servico?: { cliente?: { nome: string } | null } | null;
  operador?: { nome: string } | null;
}
