import { supabase } from "./supabase";
import { CARTOES_INICIO_PADRAO } from "@/types/configuracao";
import type {
  CartaoMetrica,
  ConfiguracaoFiscalLoja,
  ConfiguracaoGarantia,
  ConfiguracaoPainelInicio,
  JurosParcela,
} from "@/types/configuracao";

export async function listarJurosParcelas(lojaId: string): Promise<JurosParcela[]> {
  const { data, error } = await supabase
    .from("configuracoes_juros_parcelas")
    .select("*")
    .eq("loja_id", lojaId)
    .order("numero_parcelas", { ascending: true });

  if (error) throw error;
  return data as JurosParcela[];
}

export async function salvarJurosParcelas(
  lojaId: string,
  lista: Omit<JurosParcela, "loja_id">[],
): Promise<void> {
  const { error } = await supabase
    .from("configuracoes_juros_parcelas")
    .upsert(
      lista.map((item) => ({ ...item, loja_id: lojaId })),
      { onConflict: "loja_id,numero_parcelas" },
    );

  if (error) throw error;
}

export async function buscarTextoGarantia(lojaId: string): Promise<string> {
  const { data, error } = await supabase
    .from("configuracoes_garantia")
    .select("texto")
    .eq("loja_id", lojaId)
    .maybeSingle();

  if (error) throw error;
  return (data as ConfiguracaoGarantia | null)?.texto ?? "";
}

export async function salvarTextoGarantia(lojaId: string, texto: string): Promise<void> {
  const { error } = await supabase
    .from("configuracoes_garantia")
    .upsert({ loja_id: lojaId, texto }, { onConflict: "loja_id" });

  if (error) throw error;
}

// As colunas que a tela lê, uma por uma — e NUNCA `select("*")`: a tabela
// ainda tem a coluna antiga do token da Focus NFe (`focus_nfe_token`). A
// migration 0070 (parte 2 do TR-04.2) a deixa vazia, mas num banco que ainda
// não a recebeu ela carrega o token, e um `*` o traria de volta pra memória
// do computador, que é exatamente o que o item existe pra acabar.
const COLUNAS_FISCAIS = [
  "loja_id",
  "cnpj",
  "razao_social",
  "nome_fantasia",
  "inscricao_estadual",
  "inscricao_municipal",
  "regime_tributario",
  "cep",
  "rua",
  "numero",
  "bairro",
  "cidade",
  "uf",
  "telefone",
  "email",
  "focus_nfe_ambiente",
  "codigo_municipio",
  "item_lista_servico",
  "aliquota_iss",
  "codigo_tributario_municipio",
  "codigo_cnae",
  "competencia_aliquota_confirmada",
  "aliquota_passo_a_passo",
  "atualizado_em",
].join(",");

export async function buscarConfiguracaoFiscal(
  lojaId: string,
): Promise<ConfiguracaoFiscalLoja | null> {
  const [{ data, error }, configurado] = await Promise.all([
    supabase
      .from("configuracoes_fiscais_loja")
      .select(COLUNAS_FISCAIS)
      .eq("loja_id", lojaId)
      .maybeSingle(),
    lojaTemTokenFocusNfe(lojaId),
  ]);

  if (error) throw error;
  if (!data) return null;
  const linha = data as unknown as Omit<ConfiguracaoFiscalLoja, "focus_nfe_configurado">;
  return { ...linha, focus_nfe_configurado: configurado };
}

// "Esta loja tem token da Focus NFe?" — sem ver o token. Se a pergunta
// falhar (banco ainda sem a migration 0057, ou sem rede), a resposta é
// "não": quem cuida de avisar do banco atrasado é a faixa de versão do
// esquema, e esta leitura alimenta telas que não podem quebrar por causa
// disso (a garantia usa o cabeçalho fiscal da loja).
export async function lojaTemTokenFocusNfe(lojaId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("loja_tem_token_focus_nfe", { p_loja_id: lojaId });
  if (error) {
    console.error("Não deu pra saber se a loja tem token da Focus NFe:", error);
    return false;
  }
  return data === true;
}

// Grava (ou troca) o token da Focus NFe no cofre. Só admin da loja — quem
// confere é o banco, não esta tela. Não existe o caminho de volta: nenhuma
// função devolve o token pra cá.
export async function definirTokenFocusNfe(lojaId: string, token: string): Promise<void> {
  const { error } = await supabase.rpc("definir_token_focus_nfe", {
    p_loja_id: lojaId,
    p_token: token,
  });
  if (error) throw error;
}

export async function buscarConfiguracaoPainelInicio(
  lojaId: string,
): Promise<CartaoMetrica[]> {
  const { data, error } = await supabase
    .from("configuracoes_painel_inicio")
    .select("cartoes")
    .eq("loja_id", lojaId)
    .maybeSingle();

  if (error) throw error;
  return (data as ConfiguracaoPainelInicio | null)?.cartoes ?? CARTOES_INICIO_PADRAO;
}

export async function salvarConfiguracaoPainelInicio(
  lojaId: string,
  cartoes: CartaoMetrica[],
): Promise<void> {
  const { error } = await supabase
    .from("configuracoes_painel_inicio")
    .upsert({ loja_id: lojaId, cartoes }, { onConflict: "loja_id" });

  if (error) throw error;
}

// A competência confirmada fica DE FORA do que a tela de Configurações
// grava, de propósito: quem escreve nela é o botão "Já cadastrei" (e a
// emissão de NFS-e autorizada), não o formulário de dados fiscais — senão
// salvar um telefone novo poderia apagar, sem querer, a confirmação feita no
// computador do lado.
export type DadosFiscaisEditaveis = Omit<
  ConfiguracaoFiscalLoja,
  "loja_id" | "atualizado_em" | "competencia_aliquota_confirmada" | "focus_nfe_configurado"
>;

export async function salvarConfiguracaoFiscal(
  lojaId: string,
  config: DadosFiscaisEditaveis,
): Promise<void> {
  const { error } = await supabase.from("configuracoes_fiscais_loja").upsert(
    { loja_id: lojaId, ...config, atualizado_em: new Date().toISOString() },
    { onConflict: "loja_id" },
  );

  if (error) throw error;
}

// Marca a alíquota daquele mês como já cadastrada no portal da prefeitura.
// Vem de dois lugares: do botão "Já cadastrei" no aviso do Início e, sozinho,
// de toda NFS-e que a prefeitura autoriza no mês — se ela autorizou, a
// alíquota está lá, e continuar avisando seria só barulho.
//
// É `upsert` e não `update` porque uma loja pode ainda não ter linha de
// configuração fiscal nenhuma: um `update` que não encontra linha não dá
// erro, só não faz nada (PROJETO_STATUS.md, seção 6, item 15), e o aviso
// voltaria na próxima abertura como se o clique não tivesse acontecido.
export async function confirmarAliquotaCompetencia(
  lojaId: string,
  competencia: string,
): Promise<void> {
  const { error } = await supabase.from("configuracoes_fiscais_loja").upsert(
    {
      loja_id: lojaId,
      competencia_aliquota_confirmada: competencia,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "loja_id" },
  );

  if (error) throw error;
}
