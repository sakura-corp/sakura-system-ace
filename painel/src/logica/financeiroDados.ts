// O lado da página nas contas do Financeiro (#654): pede os totais (e, só pra dona, os lançamentos) ao
// worker, lê o formulário e prepara os números do gráfico. Nenhuma conta de dinheiro mora no componente:
// soma e formatação vêm de ./financeiro, e aqui só se escolhe o que pedir e como mostrar.
// O token nunca passa por aqui (fica no cookie). Sem relógio: o `agora` vem de fora.
import {
  centavosDoTexto,
  formatarCentavos,
  mesEmSaoPaulo,
  mesSeguinte,
  nomeCurtoDoMes,
  validarNovoLancamento,
  type NovoLancamento,
  type ResumoFinanceiro,
  type TipoLancamento,
  type TotalDoMes,
} from "./financeiro";

/** Um lançamento como o worker devolve (só a dona recebe). */
export interface Lancamento {
  id: number;
  data: string; // "AAAA-MM-DD"
  tipo: TipoLancamento;
  valorCentavos: number;
  categoriaId: number;
  categoria: string;
  descricao: string;
  lancadoPor: string;
  criadoEm: string;
  atualizadoEm: string | null;
}
export interface CategoriaDoFinanceiro { id: number; nome: string }
export interface ListaDaDona { lancamentos: Lancamento[]; categorias: CategoriaDoFinanceiro[] }

export type EstadoDoFinanceiro =
  | { tipo: "carregando" }
  /** A sessão acabou (401). */
  | { tipo: "fora" }
  /** 503: o D1 ainda não foi ligado. */
  | { tipo: "sem-banco" }
  | { tipo: "erro"; mensagem: string }
  /** `lista` é null pra quem não é dona: a rota dos lançamentos nem é pedida. */
  | { tipo: "pronto"; mes: string; resumo: ResumoFinanceiro; podeLancar: boolean; lista: ListaDaDona | null };

type Buscar = (endereco: string, init?: RequestInit) => Promise<Response>;

const ERRO_GERAL = "Não deu pra buscar o financeiro agora.";
const ERRO_DE_CONEXAO = "Sem conexão com o painel. Confira a internet.";
const ERRO_DE_FORMATO = "O painel mandou uma resposta que eu não entendi.";

const maiuscula = (frase: string) => (frase === "" ? frase : frase[0].toUpperCase() + frase.slice(1));

/** A frase `erro` que o worker manda em `{ ok:false, erro }`; sem ela, a frase geral. */
async function fraseDoErro(resposta: Response, padrao: string): Promise<string> {
  try {
    const corpo = (await resposta.json()) as { erro?: unknown };
    if (typeof corpo.erro === "string" && corpo.erro.trim() !== "") return maiuscula(corpo.erro.trim());
  } catch {
    /* corpo que não é JSON: fica a frase geral */
  }
  return padrao;
}

type Falha = { tipo: "fora" } | { tipo: "sem-banco" } | { tipo: "erro"; mensagem: string };

/** GET que devolve o JSON, ou a falha já no formato do estado. */
async function pedirJson(buscar: Buscar, endereco: string): Promise<{ tipo: "ok"; corpo: unknown } | Falha> {
  let resposta: Response;
  try {
    resposta = await buscar(endereco, { headers: { accept: "application/json" } });
  } catch {
    return { tipo: "erro", mensagem: ERRO_DE_CONEXAO };
  }
  if (resposta.status === 401) return { tipo: "fora" };
  if (resposta.status === 503) return { tipo: "sem-banco" };
  if (!resposta.ok) return { tipo: "erro", mensagem: await fraseDoErro(resposta, ERRO_GERAL) };
  try {
    return { tipo: "ok", corpo: await resposta.json() };
  } catch {
    return { tipo: "erro", mensagem: ERRO_DE_FORMATO };
  }
}

const ehObjeto = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const ehNumero = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const ehTexto = (x: unknown): x is string => typeof x === "string";

function ehTotalDoMes(x: unknown): x is TotalDoMes {
  return (
    ehObjeto(x) && ehTexto(x.mes) && ehNumero(x.entrouCentavos) && ehNumero(x.saiuCentavos) && ehNumero(x.saldoCentavos) &&
    (x.crescimentoPercentual === null || ehNumero(x.crescimentoPercentual))
  );
}

function ehResumo(x: unknown): x is ResumoFinanceiro {
  return (
    ehObjeto(x) && ehTotalDoMes(x.mesAtual) && Array.isArray(x.meses) && x.meses.every(ehTotalDoMes) &&
    Array.isArray(x.saidasPorCategoria) &&
    x.saidasPorCategoria.every((s) => ehObjeto(s) && ehTexto(s.categoria) && ehNumero(s.saiuCentavos))
  );
}

function ehLancamento(x: unknown): x is Lancamento {
  return (
    ehObjeto(x) && ehNumero(x.id) && ehTexto(x.data) && (x.tipo === "entrada" || x.tipo === "saida") && ehNumero(x.valorCentavos) &&
    ehNumero(x.categoriaId) && ehTexto(x.categoria) && ehTexto(x.descricao)
  );
}

function ehLista(x: unknown): x is ListaDaDona {
  return (
    ehObjeto(x) && Array.isArray(x.lancamentos) && x.lancamentos.every(ehLancamento) &&
    Array.isArray(x.categorias) && x.categorias.every((c) => ehObjeto(c) && ehNumero(c.id) && ehTexto(c.nome))
  );
}

/**
 * Pede o resumo do mês e, só se `podeLancar`, os lançamentos do mesmo mês: um depois do outro (se o token
 * precisar ser renovado, só o primeiro pedido renova). Quem não é dona nem chega a pedir a rota da lista.
 * Resposta fora do formato combinado vale como erro, nunca como "zero de movimento".
 */
export async function carregarFinanceiro(mes: string, buscar: Buscar = fetch): Promise<EstadoDoFinanceiro> {
  const r1 = await pedirJson(buscar, `/api/financeiro/resumo?mes=${mes}`);
  if (r1.tipo !== "ok") return r1;
  const corpo = r1.corpo;
  if (!ehObjeto(corpo) || !ehResumo(corpo.resumo) || typeof corpo.podeLancar !== "boolean") return { tipo: "erro", mensagem: ERRO_DE_FORMATO };
  const resumo = corpo.resumo;
  if (!corpo.podeLancar) return { tipo: "pronto", mes, resumo, podeLancar: false, lista: null };

  const r2 = await pedirJson(buscar, `/api/financeiro/lancamentos?mes=${mes}`);
  if (r2.tipo !== "ok") return r2;
  if (!ehLista(r2.corpo)) return { tipo: "erro", mensagem: ERRO_DE_FORMATO };
  return { tipo: "pronto", mes, resumo, podeLancar: true, lista: { lancamentos: r2.corpo.lancamentos, categorias: r2.corpo.categorias } };
}

// ---- Lançar, editar e apagar (só a dona) ----

export type ResultadoDaEscrita = { tipo: "ok" } | { tipo: "fora" } | { tipo: "erro"; mensagem: string };

async function escrever(buscar: Buscar, endereco: string, init: RequestInit): Promise<ResultadoDaEscrita> {
  let resposta: Response;
  try {
    resposta = await buscar(endereco, { ...init, headers: { accept: "application/json", ...(init.headers ?? {}) } });
  } catch {
    return { tipo: "erro", mensagem: ERRO_DE_CONEXAO };
  }
  if (resposta.status === 401) return { tipo: "fora" };
  if (!resposta.ok) return { tipo: "erro", mensagem: await fraseDoErro(resposta, "Não deu pra salvar agora. Tente de novo.") };
  return { tipo: "ok" };
}

/** POST (id null) ou PUT. O corpo é o que `validarNovoLancamento` já aprovou. */
export function salvarLancamento(dados: NovoLancamento, id: number | null, buscar: Buscar = fetch): Promise<ResultadoDaEscrita> {
  if (id !== null && !idValido(id)) return Promise.resolve({ tipo: "erro", mensagem: "Lançamento inválido." });
  const endereco = id === null ? "/api/financeiro/lancamentos" : `/api/financeiro/lancamentos/${id}`;
  return escrever(buscar, endereco, { method: id === null ? "POST" : "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(dados) });
}

export function apagarLancamento(id: number, buscar: Buscar = fetch): Promise<ResultadoDaEscrita> {
  if (!idValido(id)) return Promise.resolve({ tipo: "erro", mensagem: "Lançamento inválido." });
  return escrever(buscar, `/api/financeiro/lancamentos/${id}`, { method: "DELETE" });
}

const idValido = (id: number) => Number.isSafeInteger(id) && id > 0;

/** O que a dona digitou no formulário, tudo como texto. */
export interface FormularioDeLancamento { data: string; tipo: string; valor: string; categoriaId: string; descricao: string }

/** Valor em reais do texto → centavos, e a mesma validação que o worker faz antes de gravar. */
export function lancamentoDoFormulario(f: FormularioDeLancamento): { ok: true; valor: NovoLancamento } | { ok: false; erro: string } {
  const valorCentavos = centavosDoTexto(f.valor);
  if (valorCentavos === null) return { ok: false, erro: "Digite o valor em reais, como 1.234,56." };
  return validarNovoLancamento({ data: f.data, tipo: f.tipo, valorCentavos, categoriaId: f.categoriaId === "" ? 0 : Number(f.categoriaId), descricao: f.descricao });
}

// ---- O mês e o dia da página ----

const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/;

/** O mês pedido em `?mes=AAAA-MM`; sem ele (ou torto), o mês de hoje em São Paulo. */
export function mesDaBusca(busca: string, agora: Date): string {
  const mes = new URLSearchParams(busca).get("mes");
  return mes !== null && MES_VALIDO.test(mes) ? mes : mesEmSaoPaulo(agora);
}

export const enderecoDoMes = (mes: string) => `/financeiro?mes=${mes}`;

const formatoDia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

/** "AAAA-MM-DD" de hoje em São Paulo (nunca toISOString, que é UTC). */
export function diaEmSaoPaulo(agora: Date): string {
  const partes = formatoDia.formatToParts(agora);
  const pegar = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${pegar("year")}-${pegar("month")}-${pegar("day")}`;
}

/** O mês seguinte, mas só até o mês de hoje (São Paulo): depois dele não há o que mostrar, e vira null. */
export function mesSeguinteAte(mes: string, agora: Date): string | null {
  const proximo = mesSeguinte(mes);
  return proximo <= mesEmSaoPaulo(agora) ? proximo : null;
}

/** "05/10" de "2026-10-05". */
export function diaCurto(data: string): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

/** Os centavos como o formulário digita ("1.234,56", sem o "R$"), pra editar um lançamento. */
export function valorParaEditar(centavos: number): string {
  return formatarCentavos(centavos).replace("R$ ", "");
}

// ---- O que a página escreve ----

/** "+12,5%", "0%", "-3%"; sem base de comparação, o traço. */
export function textoDoCrescimento(percentual: number | null): string {
  if (percentual === null) return "—";
  const numero = String(percentual).replace(".", ",");
  return `${percentual > 0 ? "+" : ""}${numero}%`;
}

export interface BarraDoMes {
  mes: string;
  /** "out" */
  rotulo: string;
  /** "out/2026" */
  nomeCompleto: string;
  entrouPct: number;
  saiuPct: number;
  entrouTexto: string;
  saiuTexto: string;
}

/** Barra com valor, mas minúscula: ainda aparece (2%). */
const ALTURA_MINIMA_PCT = 2;

/**
 * Os números do gráfico mês a mês: a altura de cada barra em % do MAIOR valor de toda a série (a mesma
 * régua pras entradas e pras saídas, nunca dois eixos). Zero é zero; maior que zero nunca some.
 */
export function barrasDoGrafico(meses: readonly TotalDoMes[]): BarraDoMes[] {
  const maior = meses.reduce((m, t) => Math.max(m, t.entrouCentavos, t.saiuCentavos), 0);
  const altura = (valor: number) => (valor <= 0 || maior <= 0 ? 0 : Math.max(ALTURA_MINIMA_PCT, Math.round((valor * 100) / maior)));
  return meses.map((t) => {
    const nome = nomeCurtoDoMes(t.mes);
    return {
      mes: t.mes,
      rotulo: nome.split("/")[0],
      nomeCompleto: nome,
      entrouPct: altura(t.entrouCentavos),
      saiuPct: altura(t.saiuCentavos),
      entrouTexto: formatarCentavos(t.entrouCentavos),
      saiuTexto: formatarCentavos(t.saiuCentavos),
    };
  });
}

/** O botão "Lançar"/"Salvar" do formulário: confere o que foi digitado e, se estiver certo, manda pro worker. */
export async function enviarLancamento(campos: FormularioDeLancamento, id: number | null, buscar: Buscar = fetch): Promise<ResultadoDaEscrita> {
  const lido = lancamentoDoFormulario(campos);
  if (!lido.ok) return { tipo: "erro", mensagem: lido.erro };
  return salvarLancamento(lido.valor, id, buscar);
}
