// O lado da página no login (#353): o que fazer com a resposta de /api/eu e qual mensagem
// mostrar quando o login volta com erro. O token nunca passa por aqui.
import type { Usuario } from "../tipos";

export type EstadoDoLogin =
  | { tipo: "carregando" }
  | { tipo: "fora" }
  | { tipo: "dentro"; usuario: Usuario }
  /** O worker não respondeu como devia: rodando só o `npm run dev`, sem o .dev.vars, ou fora do ar. */
  | { tipo: "indisponivel" };

export async function interpretarEu(resposta: Response): Promise<EstadoDoLogin> {
  if (resposta.status === 401) return { tipo: "fora" };
  if (!resposta.ok || !(resposta.headers.get("content-type") ?? "").includes("application/json")) {
    return { tipo: "indisponivel" };
  }
  try {
    const corpo = (await resposta.json()) as Partial<Usuario>;
    if (typeof corpo.login !== "string" || !corpo.login) return { tipo: "indisponivel" };
    return { tipo: "dentro", usuario: { login: corpo.login, avatar: typeof corpo.avatar === "string" ? corpo.avatar : "" } };
  } catch {
    return { tipo: "indisponivel" };
  }
}

/** A mensagem do `?erro=` que o worker põe no endereço ao voltar do GitHub. */
export function mensagemDoErro(busca: string): string | null {
  const erro = new URLSearchParams(busca).get("erro");
  if (erro === "nao-membro") return "Esta conta não faz parte da Sakura Corp.";
  if (erro === "falha-login") return "Não deu pra entrar. Tente de novo.";
  return null;
}

/** A página atual, sem o `?erro=`, pra voltar a ela depois do login. */
export function paginaPraVoltar(caminho: string, busca: string): string {
  const parametros = new URLSearchParams(busca);
  parametros.delete("erro");
  // "?tv" vira "tv=" no URLSearchParams; devolver do jeito que a Sala espera.
  const resto = parametros.toString().replace(/=(?=&|$)/g, "");
  return resto ? `${caminho}?${resto}` : caminho;
}
