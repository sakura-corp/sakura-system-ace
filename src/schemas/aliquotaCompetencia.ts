import { diaLocal } from "@/lib/datas";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";

// A prefeitura exige que a alíquota daquele mês esteja cadastrada no portal
// dela ANTES da primeira NFS-e do mês — senão a nota é recusada com uma
// mensagem que nem chega legível ("Por gentileza, conclua o cadastro de todas
// as alíquotas referentes à competência vigente", com os acentos quebrados).
// Não é nada que o sistema possa fazer sozinho: é um cadastro no portal, no
// nome da loja. O que o sistema pode fazer é lembrar antes de falhar, que é
// justamente o que ele faz bem.
//
// O caminho dentro do portal muda de município pra município. A loja pode
// escrever o dela em Configurações → Dados fiscais, e aí o que vale é o texto
// dela. Em branco, vale o PADRÃO da cidade da loja (pelo código IBGE): o
// caminho do portal de Araraquara (Giap) só pra loja de Araraquara, e pras
// outras um texto geral (#876 — antes o de Araraquara aparecia pra todas).
export const CODIGO_IBGE_ARARAQUARA = "3503208";

export const PASSO_A_PASSO_ALIQUOTA_ARARAQUARA = [
  "1. Entre no portal da prefeitura (site da prefeitura → Serviços Empresa → Nota Fiscal",
  "   Eletrônica → Contribuintes).",
  "2. Menu “Emissor/Consulta NFS-e” → tela “Cadastro de Alíquota”.",
  "3. Preencha Mês/Ano (a competência deste mês), a Alíquota e a Atividade.",
  "4. Clique em “Replicar Alíquota” — é o botão que salva (o outro é “Voltar”).",
].join("\n");

export const PASSO_A_PASSO_ALIQUOTA_GERAL =
  "Peça à contabilidade o caminho no portal da prefeitura da sua cidade. Escrito em " +
  "Configurações → Dados fiscais, ele passa a aparecer neste aviso.";

/** O passo a passo de quando a loja não escreveu o dela, pela cidade (código IBGE). */
export function passoAPassoAliquotaPadrao(codigoMunicipio: string | null | undefined): string {
  return codigoMunicipio?.trim() === CODIGO_IBGE_ARARAQUARA
    ? PASSO_A_PASSO_ALIQUOTA_ARARAQUARA
    : PASSO_A_PASSO_ALIQUOTA_GERAL;
}

/** O mês corrente como competência ("YYYY-MM-01"), no fuso de quem usa. */
export function competenciaDoMes(hoje: Date = new Date()): string {
  return diaLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
}

/** "2026-09-01" → "setembro". */
export function mesPorExtenso(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
}

// A loja emite NFS-e? Não existe uma chave dizendo isso — o que existe é a
// configuração que só quem emite preenche: o token da Focus NFe (que a tela
// não vê desde o TR-04.2, só sabe que existe — `focus_nfe_configurado`) e a
// inscrição municipal (que vai no corpo da NFS-e como prestador). Sem isso, o aviso
// mensal seria só chateação pra quem nunca vai emitir nota de serviço.
export function lojaEmiteNfse(configuracao: ConfiguracaoFiscalLoja | null): boolean {
  return Boolean(configuracao?.focus_nfe_configurado && configuracao?.inscricao_municipal);
}

export interface AvisoAliquota {
  /** Se o aviso deve aparecer agora. */
  precisa: boolean;
  /** A competência do mês corrente ("YYYY-MM-01"), pra gravar ao confirmar. */
  competencia: string;
  /** O mês por extenso, pro texto do aviso ("setembro"). */
  mes: string;
  /** O caminho dentro do portal — o da loja, ou o padrão da cidade dela. */
  passoAPasso: string;
}

export function avisoAliquotaCompetencia(
  configuracao: ConfiguracaoFiscalLoja | null,
  hoje: Date = new Date(),
): AvisoAliquota {
  const competencia = competenciaDoMes(hoje);
  const confirmada = configuracao?.competencia_aliquota_confirmada ?? null;

  return {
    // Comparado por mês, não por data exata: a coluna guarda sempre o dia 1º,
    // mas um valor gravado à mão com outro dia não deveria fazer o aviso
    // aparecer o mês inteiro.
    precisa: lojaEmiteNfse(configuracao) && confirmada?.slice(0, 7) !== competencia.slice(0, 7),
    competencia,
    mes: mesPorExtenso(competencia),
    passoAPasso:
      configuracao?.aliquota_passo_a_passo?.trim() ||
      passoAPassoAliquotaPadrao(configuracao?.codigo_municipio),
  };
}
