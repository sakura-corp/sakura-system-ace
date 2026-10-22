// A conta do item TR-05.7: "o banco desta empresa está em dia com este
// programa?".
//
// Por que isso existe. O auto-update chega em todas as lojas no mesmo minuto;
// a migration é manual, um projeto Supabase por vez. Quando as duas coisas
// saem de sincronia, o app novo bate num `column ... does not exist` numa tela
// qualquer — erro que não diz nem o que aconteceu nem o que fazer. Aqui o app
// compara os dois números e responde em português.
//
// Regra que vale pro arquivo inteiro: isto vira AVISO, nunca tranca (item 33
// da seção 6 do PROJETO_STATUS — validação incerta que guarda a porta de
// entrada já deixou a usuária de fora do próprio sistema uma vez).

/**
 * A maior migration que ESTA build do app espera encontrar no banco.
 *
 * Sobe junto com toda migration nova — `versaoEsquema.test.ts` reprova se
 * este número ficar pra trás da pasta `supabase/migrations/`.
 */
export const VERSAO_ESQUEMA_ESPERADA = 67;

/**
 * A primeira migration que registra a própria versão (a que criou a tabela).
 *
 * Banco anterior a ela não tem `schema_versao` nenhuma, então não sabe dizer
 * onde está — o que dá pra afirmar é que falta desta pra frente. Por isso a
 * lista do aviso nunca começa antes deste número, em vez de despejar
 * "faltam 0001 a 0055", que assustaria sem informar.
 */
export const PRIMEIRA_VERSAO_REGISTRADA = 55;

export type EstadoDoEsquema =
  /** Banco e programa combinam. */
  | "em_dia"
  /** Falta rodar migration: é o caso que este item veio resolver. */
  | "banco_atrasado"
  /** O banco já recebeu migration de uma versão do programa que este PC ainda não tem. */
  | "app_atrasado"
  /** Não deu pra perguntar (sem rede, sem sessão). Não se mostra nada. */
  | "desconhecido";

export interface SituacaoEsquema {
  estado: EstadoDoEsquema;
  versaoBanco: number | null;
  versaoApp: number;
  /** Os arquivos que faltam rodar, já no formato do nome ("0055"). */
  faltando: string[];
}

/** 55 → "0055", que é como o arquivo se chama na pasta de migrations. */
export function numeroDaMigration(versao: number): string {
  return String(versao).padStart(4, "0");
}

export function situacaoDoEsquema(
  versaoBanco: number | null,
  versaoApp: number = VERSAO_ESQUEMA_ESPERADA,
): SituacaoEsquema {
  if (versaoBanco === null) {
    return { estado: "desconhecido", versaoBanco, versaoApp, faltando: [] };
  }

  if (versaoBanco > versaoApp) {
    return { estado: "app_atrasado", versaoBanco, versaoApp, faltando: [] };
  }

  if (versaoBanco === versaoApp) {
    return { estado: "em_dia", versaoBanco, versaoApp, faltando: [] };
  }

  const inicio = Math.max(versaoBanco + 1, PRIMEIRA_VERSAO_REGISTRADA);
  const faltando: string[] = [];
  for (let versao = inicio; versao <= versaoApp; versao += 1) {
    faltando.push(numeroDaMigration(versao));
  }

  return { estado: "banco_atrasado", versaoBanco, versaoApp, faltando };
}
