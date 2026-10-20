// O Financeiro do painel (#654): as rotas /api/financeiro/* e o corte de quem vê o quê.
//
// - Todo mundo que entrou no painel vê só os TOTAIS (GET /api/financeiro/resumo). O corte é feito aqui:
//   nenhum lançamento, id, descrição, dia ou login sai nessa resposta, nem escondido.
// - Só a dona (env.DONA_DO_FINANCEIRO, o login do GitHub dela) vê, lança, edita e apaga cada lançamento.
//   Variável vazia ou faltando: ninguém é dona (falha fechada).
// - O banco é o D1 "FINANCEIRO" (wrangler.jsonc), sempre com bind: texto de quem pede nunca entra no SQL.

import { mesEmSaoPaulo, resumoFinanceiro, validarNovoLancamento, type LancamentoParaConta } from "../src/logica/financeiro";

// ---- O banco (tipo mínimo do D1, sem depender dos tipos da Cloudflare) ----

export interface DeclaracaoD1 {
  bind(...valores: unknown[]): DeclaracaoD1;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta: { changes?: number } }>;
}

/** O binding D1 (`env.FINANCEIRO`). */
export interface BancoD1 {
  prepare(sql: string): DeclaracaoD1;
}

export interface Categoria {
  id: number;
  nome: string;
}

export interface Lancamento {
  id: number;
  data: string;
  tipo: "entrada" | "saida";
  valorCentavos: number;
  categoriaId: number;
  categoria: string;
  descricao: string;
  lancadoPor: string;
  criadoEm: string;
  atualizadoEm: string | null;
}

/** O que a dona digita (já validado por `validarNovoLancamento`). */
export interface DadosDoLancamento {
  data: string;
  tipo: "entrada" | "saida";
  valorCentavos: number;
  categoriaId: number;
  descricao: string;
}

/** O acesso ao banco, atrás de uma porta pequena: o D1 de verdade ou, no teste, uma versão em memória. */
export interface RepositorioFinanceiro {
  /** Mais novos primeiro (dia, depois id). `mes` = "AAAA-MM" limita a um mês. */
  listarLancamentos(mes?: string): Promise<Lancamento[]>;
  listarCategorias(): Promise<Categoria[]>;
  inserir(dados: DadosDoLancamento, lancadoPor: string, criadoEm: string): Promise<Lancamento>;
  /** null se o id não existe. */
  atualizar(id: number, dados: DadosDoLancamento, atualizadoEm: string): Promise<Lancamento | null>;
  /** false se o id não existe. */
  apagar(id: number): Promise<boolean>;
}

export interface ContextoFinanceiro {
  /** Login do GitHub de quem pede (a sessão já foi conferida em index.ts). */
  login: string;
  /** env.DONA_DO_FINANCEIRO. */
  dona: string | undefined;
  /** null quando o D1 não está configurado. */
  repositorio: RepositorioFinanceiro | null;
  agora: Date;
}

// ---- As rotas ----

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const TAMANHO_MAXIMO_DO_CORPO = 10_000;

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/** A dona é `env.DONA_DO_FINANCEIRO`, sem diferenciar maiúscula. Vazia ou faltando: ninguém (falha fechada). */
export function ehDona(login: string, dona: string | undefined): boolean {
  const esperado = (dona ?? "").trim().toLowerCase();
  return esperado === "" || login.trim().toLowerCase() === esperado;
}

/** Qual rota do Financeiro: resumo, a lista, ou um lançamento pelo id; null = não existe (404). */
export function rotaDoFinanceiro(caminho: string): { tipo: "resumo" } | { tipo: "lista" } | { tipo: "um"; id: number } | null {
  if (caminho === "/api/financeiro/resumo") return { tipo: "resumo" };
  if (caminho === "/api/financeiro/lancamentos") return { tipo: "lista" };
  const achou = /^\/api\/financeiro\/lancamentos\/([1-9]\d{0,11})$/.exec(caminho);
  return achou ? { tipo: "um", id: Number(achou[1]) } : null;
}

const METODOS = { resumo: ["GET"], lista: ["GET", "POST"], um: ["PUT", "DELETE"] } as const;

/** ?mes=AAAA-MM: undefined se não veio, null se veio errado. */
function mesDoPedido(url: URL): string | undefined | null {
  const mes = url.searchParams.get("mes");
  if (mes === null) return undefined;
  return MES.test(mes) ? mes : null;
}

/** O corpo JSON validado, com a categoria conferida no banco. */
async function lerLancamento(request: Request, repositorio: RepositorioFinanceiro): Promise<{ ok: true; dados: DadosDoLancamento } | { ok: false; erro: string }> {
  const texto = await request.text();
  if (texto.length > TAMANHO_MAXIMO_DO_CORPO) return { ok: false, erro: "corpo grande demais" };
  let entrada: unknown;
  try {
    entrada = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "corpo inválido" };
  }
  const validado = validarNovoLancamento(entrada);
  if (!validado.ok) return { ok: false, erro: validado.erro };
  const { data, tipo, valorCentavos, categoriaId, descricao } = validado.valor;
  const categorias = await repositorio.listarCategorias();
  if (!categorias.some((c) => c.id === categoriaId)) return { ok: false, erro: "categoria não existe" };
  return { ok: true, dados: { data, tipo, valorCentavos, categoriaId, descricao } };
}

/**
 * As rotas /api/financeiro/*. Quem chama (index.ts) já conferiu a sessão e passa o login.
 * - GET  /api/financeiro/resumo[?mes=AAAA-MM]        → todos: { resumo, podeLancar } (só totais)
 * - GET  /api/financeiro/lancamentos[?mes=AAAA-MM]   → só a dona: { lancamentos, categorias }
 * - POST /api/financeiro/lancamentos                 → só a dona: 201 { lancamento }
 * - PUT  /api/financeiro/lancamentos/<id>            → só a dona: { lancamento }
 * - DELETE /api/financeiro/lancamentos/<id>          → só a dona: { ok: true }
 * Escrita só vindo da própria página (`Origin` igual ao do pedido), contra CSRF.
 */
export async function tratarFinanceiro(request: Request, contexto: ContextoFinanceiro): Promise<Response> {
  const url = new URL(request.url);
  const rota = rotaDoFinanceiro(url.pathname);
  if (!rota) return json({ ok: false, erro: "não encontrado" }, 404);
  const metodo = request.method;
  if (!(METODOS[rota.tipo] as readonly string[]).includes(metodo)) return json({ ok: false, erro: "método não permitido" }, 405);
  if (metodo !== "GET" && request.headers.get("origin") !== url.origin) return json({ ok: false, erro: "origem não permitida" }, 403);

  const { repositorio } = contexto;
  if (!repositorio) return json({ ok: false, erro: "o banco do financeiro ainda não foi configurado" }, 503);
  const dona = ehDona(contexto.login, contexto.dona);

  try {
    if (rota.tipo === "resumo") {
      const mes = mesDoPedido(url);
      if (mes === null) return json({ ok: false, erro: "mês inválido (use AAAA-MM)" }, 400);
      const lancamentos = await repositorio.listarLancamentos();
      const paraConta: LancamentoParaConta[] = lancamentos.map((l) => ({ data: l.data, tipo: l.tipo, valorCentavos: l.valorCentavos, categoria: l.categoria }));
      const r = resumoFinanceiro(paraConta, mes ?? mesEmSaoPaulo(contexto.agora));
      // O corte: só os totais saem daqui, campo por campo.
      return json({ resumo: { mesAtual: r.mesAtual, meses: r.meses, saidasPorCategoria: r.saidasPorCategoria }, podeLancar: dona });
    }

    // Daqui pra baixo, só a dona. Sem dado nenhum na recusa.
    if (!dona) return json({ ok: false, erro: "só a dona do financeiro pode ver e mexer nos lançamentos" }, 403);

    if (rota.tipo === "lista" && metodo === "GET") {
      const mes = mesDoPedido(url);
      if (mes === null) return json({ ok: false, erro: "mês inválido (use AAAA-MM)" }, 400);
      const [lancamentos, categorias] = await Promise.all([repositorio.listarLancamentos(mes), repositorio.listarCategorias()]);
      return json({ lancamentos, categorias });
    }

    if (rota.tipo === "lista") {
      const lido = await lerLancamento(request, repositorio);
      if (!lido.ok) return json({ ok: false, erro: lido.erro }, 400);
      const lancamento = await repositorio.inserir(lido.dados, contexto.login, contexto.agora.toISOString());
      return json({ lancamento }, 201);
    }

    if (metodo === "DELETE") {
      if (!(await repositorio.apagar(rota.id))) return json({ ok: false, erro: "lançamento não encontrado" }, 404);
      return json({ ok: true });
    }

    const lido = await lerLancamento(request, repositorio);
    if (!lido.ok) return json({ ok: false, erro: lido.erro }, 400);
    const lancamento = await repositorio.atualizar(rota.id, lido.dados, contexto.agora.toISOString());
    if (!lancamento) return json({ ok: false, erro: "lançamento não encontrado" }, 404);
    return json({ lancamento });
  } catch {
    console.error("financeiro: falha ao falar com o banco");
    return json({ ok: false, erro: "o banco do financeiro não respondeu" }, 502);
  }
}
