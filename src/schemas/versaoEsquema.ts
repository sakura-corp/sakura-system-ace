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

import { compararVersoes } from "./computadores";

/**
 * A maior migration que ESTA build do app espera encontrar no banco.
 *
 * Sobe junto com toda migration nova — `versaoEsquema.test.ts` reprova se
 * este número ficar pra trás da pasta `supabase/migrations/`.
 */
export const VERSAO_ESQUEMA_ESPERADA = 70;

/**
 * As migrations que declaram `-- versao-minima-do-programa: X`, com o X de
 * cada uma. Essas sobem DEPOIS da versão do programa, de propósito: o botão
 * "Atualizar o banco" espera todos os computadores chegarem em X (0062, 0065, 0069, 0070).
 * Então o programa novo passa dias num banco sem elas, e isso não é atraso:
 * a faixa amarela nessa espera viraria telefonema em toda loja (#757).
 *
 * `versaoEsquema.test.ts` reprova se esta lista não bater com a pasta
 * `supabase/migrations/`.
 */
export const MIGRATIONS_QUE_ESPERAM_OS_COMPUTADORES: Readonly<Record<number, string>> = {
  62: "0.9.43",
  65: "0.9.52",
  69: "0.9.54",
  70: "0.9.41",
};

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
  /**
   * Só faltam migrations que esperam os computadores de propósito (#757).
   * Não é atraso: a faixa não aparece, só o Diagnóstico conta.
   */
  | "esperando_computadores"
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
  /** Em "esperando_computadores": a versão que os computadores precisam ter. */
  versaoMinimaDosComputadores?: string;
}

/** 55 → "0055", que é como o arquivo se chama na pasta de migrations. */
export function numeroDaMigration(versao: number): string {
  return String(versao).padStart(4, "0");
}

export function situacaoDoEsquema(
  versaoBanco: number | null,
  versaoApp: number = VERSAO_ESQUEMA_ESPERADA,
  esperamOsComputadores: Readonly<Record<number, string>> = MIGRATIONS_QUE_ESPERAM_OS_COMPUTADORES,
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

  const versoesDaEspera = faltando.map((arquivo) => esperamOsComputadores[Number(arquivo)]);
  if (versoesDaEspera.every((versao) => versao !== undefined)) {
    const versaoMinimaDosComputadores = versoesDaEspera.reduce((maior, versao) =>
      compararVersoes(versao, maior) > 0 ? versao : maior,
    );
    return { estado: "esperando_computadores", versaoBanco, versaoApp, faltando, versaoMinimaDosComputadores };
  }

  return { estado: "banco_atrasado", versaoBanco, versaoApp, faltando };
}
