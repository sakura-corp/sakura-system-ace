// O botão "Começar com o Claude" (cartão da tarefa): monta o link pré-preenchido de claude.ai/code.
// O link só abre o formulário com o texto e o repositório; quem aperta Enter é a pessoa. Sem credencial,
// sem `environment` (é de cada pessoa) e sem texto livre: o único dado variável é o número da tarefa.

/** Os chefes são por função (decidido em 17/10/2026). Cada um tem a skill `chefe-<função>`. */
export const CHEFES = ["frontend", "backend", "seguranca", "marketing", "tester"] as const;
export type Chefe = (typeof CHEFES)[number];

export const BASE_DO_CLAUDE = "https://claude.ai/code";
export const REPOSITORIO_DO_LINK = "sakura-corp/sakura-system-ace";
/** O texto fica bem abaixo disto; é o teto de segurança (o link inteiro tem que caber na barra do navegador). */
export const LIMITE_DO_TEXTO = 1200;
const MAIOR_NUMERO = 999_999;

/** `chefe:frontend` → "frontend". Etiqueta de outro tipo, ou de função que não existe → undefined. */
export function chefeDaEtiqueta(etiqueta: string): Chefe | undefined {
  const achou = /^chefe:([a-z]{1,20})$/.exec(etiqueta);
  return CHEFES.find((c) => c === achou?.[1]);
}

/** Inteiro positivo e razoável; qualquer outra coisa (texto, 0, negativo, 1,5, NaN) não vira link. */
export function numeroValido(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n > 0 && n <= MAIOR_NUMERO;
}

/** Nome de repositório da sakura-corp (projeto secundário, #731): só letras, números, ponto, hífen e sublinhado. */
export function repositorioValido(r: unknown): r is string {
  return typeof r === "string" && /^[A-Za-z0-9._-]{1,100}$/.test(r) && r !== "." && r !== "..";
}

/** "sakura-corp/<repo>" do projeto, ou o do SSACE quando não há repositório. Quem chama já validou o nome. */
const repositorioCompleto = (repositorio?: string) => (repositorio === undefined ? REPOSITORIO_DO_LINK : `sakura-corp/${repositorio}`);

export function textoParaOClaude(numero: number, chefe?: Chefe, repositorio?: string): string {
  const issue = `https://github.com/${repositorioCompleto(repositorio)}/issues/${numero}`;
  const comum =
    "Leia a issue inteira, faça o trabalho (chame agentes dentro da sua sessão se precisar) e termine com PR aberto " +
    "e um relatório do que cada um fez, o que testou e o que ficou de fora. Nunca mescle, nunca publique.";
  const texto = chefe
    ? `Tarefa #${numero} (${issue}). Você é o chefe de ${chefe}: use a skill \`chefe-${chefe}\`. ${comum}`
    : `Tarefa #${numero} (${issue}). Esta tarefa não diz qual chefe deve cuidar dela. Leia a issue e pergunte à pessoa ` +
      `qual chefe usar (${CHEFES.join(", ")}) antes de começar. ${comum}`;
  return texto.slice(0, LIMITE_DO_TEXTO);
}

/** O texto que o link leva (e que o botão "Copiar texto" copia): uma regra só pros dois. Número inválido → undefined. */
export function textoDaTarefa(numero: unknown, etiquetaOuChefe?: string, repositorio?: string): string | undefined {
  if (!numeroValido(numero)) return undefined;
  // Repositório que não parece nome de repositório não vira texto: cair no SSACE mandaria a pessoa pra issue errada.
  if (repositorio !== undefined && !repositorioValido(repositorio)) return undefined;
  return textoParaOClaude(numero, CHEFES.find((c) => c === etiquetaOuChefe), repositorio);
}

/** O link, ou undefined se o número não é válido. `chefe` desconhecido cai no texto geral. */
export function linkParaComecar(numero: unknown, etiquetaOuChefe?: string, repositorio?: string): string | undefined {
  const texto = textoDaTarefa(numero, etiquetaOuChefe, repositorio);
  if (texto === undefined) return undefined;
  const prompt = encodeURIComponent(texto);
  return `${BASE_DO_CLAUDE}?prompt=${prompt}&repositories=${repositorioCompleto(repositorio)}`;
}
