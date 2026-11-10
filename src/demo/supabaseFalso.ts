import { FUNCOES, SESSAO, TABELAS } from "./dados";

// "Responder como o Supabase": recebe um pedido (método, endereço, cabeçalhos,
// corpo) e devolve a resposta, tudo da memória, com os dados inventados de
// dados.ts. Serve ao modo demonstração do programa (via fetchDemo.ts) e às
// ferramentas do site (via site/ferramentas/banco-falso.mjs), pra existir uma
// cópia só. Só olha o CAMINHO do endereço, nunca o servidor.

export const AVISO_NOTA = "No modo demonstração não sai nota.";
export const AVISO_DEMONSTRACAO = "No modo demonstração isto não funciona: nada sai do computador.";

export type PedidoDemo = {
  metodo: string;
  url: string;
  cabecalhos: Record<string, string>;
  corpo: string | null;
};
export type RespostaDemo = { status: number; cabecalhos: Record<string, string>; corpo: string };

type Linha = Record<string, unknown>;

const tabelas = TABELAS as unknown as Record<string, Linha[]>;
const funcoes = FUNCOES as unknown as Record<string, unknown>;

// Tabelas e funções que o app pediu e os dados inventados não têm: as
// ferramentas do site listam isso pra a gente saber o que falta inventar.
const faltando = new Set<string>();
export function tabelasSemDados() {
  return faltando;
}

// Aplica na lista o que a URL do PostgREST pede, do mesmo jeito que o
// Supabase: os filtros ".eq()", ".neq()" e ".in()" ("campo=eq.valor",
// "campo=in.(a,b)"), a ordem ("order=data.desc,id.asc") e a faixa
// (".range()"/".limit()" viram "offset" e "limit"). Campo que a linha
// inventada nem tem passa pelo filtro, pra dado de mentira não precisar
// repetir toda coluna. Separado da rota pra ter teste
// (dados-de-mentira.test.mjs): quando isto ignorava o ".in()" e a ordem, a
// venda de balcão mostrava as notas de todas as OS e o estoque saía fora de
// ordem (#777, itens 1 e 6).
function filtrarEOrdenar(linhasOriginais: Linha[], parametros: URLSearchParams): Linha[] {
  let linhas = [...linhasOriginais];
  for (const [campo, valor] of parametros.entries()) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(campo)) continue;
    // o ".neq()" é o que tira o cliente Consumidor das listas de clientes
    // (migration 0064)
    if (valor.startsWith("neq.")) {
      const fora = valor.slice(4);
      linhas = linhas.filter((l) => l[campo] === undefined || String(l[campo]) !== fora);
    } else if (valor.startsWith("eq.")) {
      const alvo = valor.slice(3);
      linhas = linhas.filter((l) => l[campo] === undefined || String(l[campo]) === alvo);
    } else if (valor.startsWith("in.(") && valor.endsWith(")")) {
      const lista = valor
        .slice(4, -1)
        .split(",")
        .map((v) => v.replace(/^"(.*)"$/, "$1"));
      linhas = linhas.filter(
        (l) => l[campo] === undefined || (l[campo] !== null && lista.includes(String(l[campo]))),
      );
    }
  }

  const ordem = parametros.get("order");
  if (ordem) {
    const chaves = ordem.split(",").map((parte) => {
      const [campo, sentido] = parte.split(".");
      return { campo, desc: sentido === "desc" };
    });
    linhas.sort((a, b) => {
      for (const { campo, desc } of chaves) {
        const x = a[campo];
        const y = b[campo];
        if (x === y) continue;
        // nulo por último (o padrão do Postgres no "asc")
        if (x === null || x === undefined) return desc ? -1 : 1;
        if (y === null || y === undefined) return desc ? 1 : -1;
        const r = typeof x === "number" && typeof y === "number" ? x - y : String(x) < String(y) ? -1 : 1;
        return desc ? -r : r;
      }
      return 0;
    });
  }
  return linhas;
}

function faixaDe(parametros: URLSearchParams) {
  const deslocamento = Number(parametros.get("offset") ?? 0);
  const limite = parametros.get("limit");
  return { deslocamento, fim: limite === null ? undefined : deslocamento + Number(limite) };
}

export function filtrarComoOSupabase(linhasOriginais: Linha[], parametros: URLSearchParams): Linha[] {
  const { deslocamento, fim } = faixaDe(parametros);
  return filtrarEOrdenar(linhasOriginais, parametros).slice(deslocamento, fim);
}

const JSON_HEADERS = { "content-type": "application/json" };
const json = (status: number, valor: unknown, extra: Record<string, string> = {}): RespostaDemo => ({
  status,
  cabecalhos: { ...JSON_HEADERS, ...extra },
  corpo: JSON.stringify(valor),
});
const vazia = (status: number, extra: Record<string, string> = {}): RespostaDemo => ({
  status,
  cabecalhos: extra,
  corpo: "",
});

function lerJson(corpo: string | null): unknown {
  if (!corpo) return null;
  try {
    return JSON.parse(corpo);
  } catch {
    return null;
  }
}

// O cabeçalho que o navegador só deixa a página ler se for liberado, como o
// Supabase de verdade faz (sem ele, a lista de Clientes por página via total
// 0, #373). O total é o de ANTES da faixa: é com ele que a paginação sabe
// quantas páginas existem.
function cabecalhoDeFaixa(inicio: number, devolvidas: number, total: number) {
  const faixa = devolvidas === 0 ? "*" : `${inicio}-${inicio + devolvidas - 1}`;
  return { "content-range": `${faixa}/${total}`, "access-control-expose-headers": "content-range" };
}

// Num insert, o `select` da URL pode pedir o dono embutido
// (`cliente:clientes(...)`): preenche com a linha da tabela de verdade, pra a
// lista não quebrar ao mostrar o item recém-criado. Não é perfeito: só o
// muitos-pra-um simples, pelo `<apelido>_id`.
function embutir(linha: Linha, select: string | null) {
  if (!select) return;
  for (const m of select.matchAll(/(\w+):(\w+)(?:![\w]+)?\(/g)) {
    const [, apelido, tabela] = m;
    const chave = linha[`${apelido}_id`];
    if (chave === undefined || chave === null) continue;
    const alvo = tabelas[tabela]?.find((l) => l.id === chave);
    if (alvo) linha[apelido] = { ...alvo };
  }
}

function gravar(
  tabela: string,
  metodo: string,
  parametros: URLSearchParams,
  cabecalhos: Record<string, string>,
  corpo: string | null,
): RespostaDemo {
  if (!tabelas[tabela]) tabelas[tabela] = [];
  const lista = tabelas[tabela];
  const prefer = cabecalhos["prefer"] || "";
  const querRepresentacao = prefer.includes("return=representation");
  const querObjeto = (cabecalhos["accept"] || "").includes("vnd.pgrst.object");
  const devolver = (linhas: Linha[], status: number) => {
    if (!querRepresentacao) return vazia(status === 200 ? 204 : status);
    return json(status, querObjeto ? (linhas[0] ?? null) : linhas);
  };

  if (metodo === "POST") {
    const entrada = lerJson(corpo);
    const novas = (Array.isArray(entrada) ? entrada : [entrada]).filter(
      (l): l is Linha => !!l && typeof l === "object",
    );
    const agora = new Date().toISOString();
    const saida: Linha[] = [];
    const mesclar = prefer.includes("resolution=merge-duplicates");
    const chaves = (parametros.get("on_conflict") || "id").split(",");
    for (const nova of novas) {
      const existente = mesclar
        ? lista.find((l) => chaves.every((c) => nova[c] !== undefined && l[c] === nova[c]))
        : undefined;
      if (existente) {
        Object.assign(existente, nova);
        saida.push(existente);
        continue;
      }
      const linha: Linha = { ...nova };
      if (linha.id === undefined) linha.id = crypto.randomUUID();
      if (linha.criado_em === undefined) linha.criado_em = agora;
      lista.push(linha);
      saida.push(linha);
    }
    const resposta = saida.map((l) => {
      const copia = { ...l };
      embutir(copia, parametros.get("select"));
      return copia;
    });
    return devolver(resposta, 201);
  }

  const alvo = filtrarEOrdenar(lista, parametros);
  if (metodo === "PATCH") {
    const mudanca = lerJson(corpo);
    if (mudanca && typeof mudanca === "object") for (const l of alvo) Object.assign(l, mudanca);
    return devolver(alvo, 200);
  }
  // DELETE
  for (const l of alvo) lista.splice(lista.indexOf(l), 1);
  return devolver(alvo, 200);
}

export function responderComoSupabase(pedido: PedidoDemo): RespostaDemo {
  const metodo = pedido.metodo.toUpperCase();
  const url = new URL(pedido.url);
  const caminho = url.pathname;
  const cabecalhos: Record<string, string> = {};
  for (const [k, v] of Object.entries(pedido.cabecalhos)) cabecalhos[k.toLowerCase()] = v;

  // --- login: qualquer usuário e senha entram ---
  if (caminho.startsWith("/auth/v1/token")) return json(200, SESSAO);
  if (caminho.startsWith("/auth/v1/user")) return json(200, SESSAO.user); // GET e a troca de senha (PUT)
  if (caminho.startsWith("/auth/v1/logout")) return vazia(204);

  // --- funções do banco (supabase.rpc) ---
  if (caminho.startsWith("/rest/v1/rpc/")) {
    const nome = caminho.replace("/rest/v1/rpc/", "");
    if (!(nome in funcoes)) faltando.add(`rpc/${nome}`);
    const f = funcoes[nome];
    const resposta = typeof f === "function" ? f((lerJson(pedido.corpo) as object) ?? {}) : f;
    return json(200, resposta ?? null);
  }

  // --- dados (PostgREST) ---
  if (caminho.startsWith("/rest/v1/")) {
    const tabela = caminho.replace("/rest/v1/", "").split("?")[0];
    if (metodo === "POST" || metodo === "PATCH" || metodo === "DELETE") {
      return gravar(tabela, metodo, url.searchParams, cabecalhos, pedido.corpo);
    }
    let base = tabelas[tabela];
    if (!base) {
      faltando.add(tabela);
      base = [];
    }
    const todas = filtrarEOrdenar(base, url.searchParams);
    const { deslocamento, fim } = faixaDe(url.searchParams);
    const linhas = todas.slice(deslocamento, fim);
    const extra = cabecalhoDeFaixa(deslocamento, linhas.length, todas.length);
    // ".select(..., { head: true })" só quer o total
    if (metodo === "HEAD") return vazia(200, extra);
    // .maybeSingle()/.single() pedem um objeto, não uma lista
    const querObjeto = (cabecalhos["accept"] || "").includes("vnd.pgrst.object");
    return json(200, querObjeto ? (linhas[0] ?? null) : linhas, extra);
  }

  // --- funções de borda (nota fiscal, leitura de nota por IA, senha de operador) ---
  // Nunca devolve nada com cara de nota de verdade: o corpo traz o aviso nos
  // três nomes de campo que o programa lê (`erro`, `error`, `mensagem`).
  if (caminho.startsWith("/functions/v1/")) {
    const aviso = caminho.startsWith("/functions/v1/focus-nfe") ? AVISO_NOTA : AVISO_DEMONSTRACAO;
    return json(403, { erro: aviso, error: aviso, mensagem: aviso, motivo: "demonstracao" });
  }

  // --- arquivos (storage) ---
  if (caminho.startsWith("/storage/v1/")) {
    if (metodo === "GET") return json(404, { erro: AVISO_DEMONSTRACAO, error: AVISO_DEMONSTRACAO, motivo: "demonstracao" });
    return json(200, metodo === "DELETE" ? [] : {});
  }

  return json(404, { erro: "Caminho desconhecido no modo demonstração." });
}
