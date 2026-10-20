// Conta dos totais do Financeiro (#654): função pura, sem rede e sem relógio. Dinheiro sempre em
// centavos inteiros; mês é "AAAA-MM" e dia é "AAAA-MM-DD" (dia de calendário, nunca toISOString).

export type TipoLancamento = "entrada" | "saida";

/** O mínimo de um lançamento que a conta precisa. `data` = "AAAA-MM-DD" (dia de calendário). */
export interface LancamentoParaConta {
  data: string;
  tipo: TipoLancamento;
  valorCentavos: number;
  categoria: string; // nome da categoria
}

export interface TotalDoMes {
  mes: string; // "AAAA-MM"
  entrouCentavos: number;
  saiuCentavos: number;
  saldoCentavos: number; // entrou - saiu (pode ser negativo)
  /** Crescimento das ENTRADAS em relação ao mês anterior, em %, com 1 casa (ex.: 12.5). null se o mês anterior teve 0 de entrada ou se é o primeiro mês. */
  crescimentoPercentual: number | null;
}

export interface SaidaPorCategoria { categoria: string; saiuCentavos: number }

export interface ResumoFinanceiro {
  mesAtual: TotalDoMes;
  meses: TotalDoMes[];
  saidasPorCategoria: SaidaPorCategoria[];
}

const doisDigitos = (n: number): string => String(n).padStart(2, "0");

/** "AAAA-MM" de "AAAA-MM-DD". */
export function mesDe(data: string): string {
  return data.slice(0, 7);
}

function partesDoMes(mes: string): [number, number] {
  return [Number(mes.slice(0, 4)), Number(mes.slice(5, 7))];
}

/** Dezembro vira janeiro do ano seguinte. */
export function mesSeguinte(mes: string): string {
  const [ano, m] = partesDoMes(mes);
  return m === 12 ? `${ano + 1}-01` : `${ano}-${doisDigitos(m + 1)}`;
}

/** Janeiro vira dezembro do ano anterior. */
export function mesAnterior(mes: string): string {
  const [ano, m] = partesDoMes(mes);
  return m === 1 ? `${ano - 1}-12` : `${ano}-${doisDigitos(m - 1)}`;
}

const formatoSaoPaulo = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" });

/** "AAAA-MM" do dia de calendário em São Paulo (nunca toISOString, que é UTC). */
export function mesEmSaoPaulo(agora: Date): string {
  const partes = formatoSaoPaulo.formatToParts(agora);
  const pegar = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${pegar("year")}-${pegar("month")}`;
}

/** "R$ 1.234,56" a partir de centavos (negativo: "-R$ 1.234,56"). Montado por texto, sem Intl,
 * pra sair com espaço comum e igual em qualquer máquina. */
export function formatarCentavos(centavos: number): string {
  const sinal = centavos < 0 ? "-" : "";
  const absoluto = Math.abs(Math.trunc(centavos));
  const reais = String(Math.floor(absoluto / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sinal}R$ ${reais},${doisDigitos(absoluto % 100)}`;
}

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "out/2026" a partir de "2026-10". */
export function nomeCurtoDoMes(mes: string): string {
  const [ano, m] = partesDoMes(mes);
  return `${MESES_CURTOS[m - 1] ?? "?"}/${ano}`;
}

// Reais: só dígitos ("1234") ou com ponto de milhar em grupos de 3 ("1.234"); centavos: 1 ou 2
// dígitos depois da vírgula. "R$" na frente é aceito; sinal de menos não.
const VALOR_DIGITADO = /^(?:R\$\s*)?(\d+|\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/;

/** Converte "1.234,56", "1234,5", "10" em centavos inteiros; null se inválido. Lido por texto,
 * nunca por número com vírgula flutuante. */
export function centavosDoTexto(texto: string): number | null {
  const achado = VALOR_DIGITADO.exec(texto.trim());
  if (!achado) return null;
  const reais = achado[1].replace(/\./g, "");
  const centavos = (achado[2] ?? "").padEnd(2, "0");
  const total = Number(reais + centavos);
  return Number.isSafeInteger(total) ? total : null;
}

/** Quantos meses a série mostra, no máximo (terminando no mês atual). */
export const MESES_NA_SERIE = 12;

const DIA_NO_FORMATO = /^\d{4}-\d{2}-\d{2}$/;

/** Defesa: valor que não é inteiro positivo, tipo ou data fora do formato não entra na conta. */
function lancamentoValido(l: LancamentoParaConta): boolean {
  return Number.isSafeInteger(l.valorCentavos) && l.valorCentavos > 0 && (l.tipo === "entrada" || l.tipo === "saida") && DIA_NO_FORMATO.test(l.data);
}

/** % com 1 casa, em conta de inteiros; null se não há base. Nunca devolve -0. */
function crescimento(anterior: number, atual: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((atual - anterior) * 1000) / anterior) / 10 || 0;
}

export function resumoFinanceiro(lancamentos: readonly LancamentoParaConta[], mesAtual: string): ResumoFinanceiro {
  // Soma por mês em centavos inteiros; o que vem depois do mês atual fica de fora.
  const porMes = new Map<string, { entrou: number; saiu: number }>();
  const saidasDoMes = new Map<string, number>();
  for (const l of lancamentos) {
    if (!lancamentoValido(l)) continue;
    const mes = mesDe(l.data);
    if (mes > mesAtual) continue;
    const soma = porMes.get(mes) ?? { entrou: 0, saiu: 0 };
    if (l.tipo === "entrada") soma.entrou += l.valorCentavos;
    else soma.saiu += l.valorCentavos;
    porMes.set(mes, soma);
    if (l.tipo === "saida" && mes === mesAtual) saidasDoMes.set(l.categoria, (saidasDoMes.get(l.categoria) ?? 0) + l.valorCentavos);
  }

  const totalDo = (mes: string): TotalDoMes => {
    const { entrou, saiu } = porMes.get(mes) ?? { entrou: 0, saiu: 0 };
    const entrouAntes = porMes.get(mesAnterior(mes))?.entrou ?? 0;
    return { mes, entrouCentavos: entrou, saiuCentavos: saiu, saldoCentavos: entrou - saiu, crescimentoPercentual: crescimento(entrouAntes, entrou) };
  };

  // Série sem buraco: do primeiro mês com lançamento (ou 12 meses atrás, o que vier depois) até o atual.
  let inicio = mesAtual;
  for (let i = 1; i < MESES_NA_SERIE; i++) inicio = mesAnterior(inicio);
  const primeiro = [...porMes.keys()].sort()[0] ?? mesAtual;
  if (primeiro > inicio) inicio = primeiro;
  const meses: TotalDoMes[] = [];
  for (let mes = inicio; mes <= mesAtual; mes = mesSeguinte(mes)) meses.push(totalDo(mes));

  const saidasPorCategoria = [...saidasDoMes]
    .map(([categoria, saiuCentavos]) => ({ categoria, saiuCentavos }))
    .sort((a, b) => b.saiuCentavos - a.saiuCentavos || a.categoria.localeCompare(b.categoria, "pt-BR"));

  return { mesAtual: totalDo(mesAtual), meses, saidasPorCategoria };
}

/** Validação da entrada vinda do formulário/rota (o worker usa antes de gravar). */
export interface NovoLancamento { data: string; tipo: TipoLancamento; valorCentavos: number; categoriaId: number; descricao: string }
export type ResultadoDaValidacao = { ok: true; valor: NovoLancamento } | { ok: false; erro: string };

/** Maior valor aceito num lançamento: R$ 1 bilhão. */
export const VALOR_MAXIMO_CENTAVOS = 100_000_000_000;
export const DESCRICAO_MAXIMA = 200;

/** "AAAA-MM-DD" de um dia que existe (30/02 não). Conta de calendário, sem Date. */
function diaExiste(data: unknown): data is string {
  if (typeof data !== "string" || !DIA_NO_FORMATO.test(data)) return false;
  const [ano, mes, dia] = data.split("-").map(Number);
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
  const diasNoMes = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
  return dia <= diasNoMes;
}

export function validarNovoLancamento(entrada: unknown): ResultadoDaValidacao {
  if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) return { ok: false, erro: "Os dados do lançamento não vieram certos." };
  const e = entrada as Record<string, unknown>;
  if (!diaExiste(e.data)) return { ok: false, erro: "A data não é um dia que existe." };
  if (e.tipo !== "entrada" && e.tipo !== "saida") return { ok: false, erro: "O tipo precisa ser entrada ou saída." };
  const valor = e.valorCentavos;
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor <= 0 || valor > VALOR_MAXIMO_CENTAVOS) return { ok: false, erro: "O valor precisa ser maior que zero e até R$ 1 bilhão." };
  const categoriaId = e.categoriaId;
  if (typeof categoriaId !== "number" || !Number.isSafeInteger(categoriaId) || categoriaId <= 0) return { ok: false, erro: "Escolha uma categoria." };
  // Descrição ausente vale como vazia.
  if (e.descricao !== undefined && e.descricao !== null && typeof e.descricao !== "string") return { ok: false, erro: "A descrição precisa ser um texto." };
  const descricao = typeof e.descricao === "string" ? e.descricao.trim() : "";
  if (descricao.length > DESCRICAO_MAXIMA) return { ok: false, erro: `A descrição pode ter até ${DESCRICAO_MAXIMA} letras.` };
  return { ok: true, valor: { data: e.data, tipo: e.tipo, valorCentavos: valor, categoriaId, descricao } };
}
