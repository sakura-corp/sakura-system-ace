import { FUNCOES, TABELAS, SESSAO } from "./dados-demo.mjs";

// Responde as chamadas ao Supabase com os dados inventados de dados-demo.mjs,
// pra conseguir abrir o app de verdade num navegador sem tocar no banco de
// loja nenhuma. Usado tanto pelas imagens do site (gerar-telas.mjs) quanto
// pelo catálogo completo de telas (gerar-catalogo-telas.mjs).

export function tabelasSemDados() {
  return faltando;
}

const faltando = new Set();

export async function instalarBancoFalso(contexto) {
  await contexto.route("**demo.supabase.co/**", async (rota) => {
    const req = rota.request();
    const url = new URL(req.url());
    const caminho = url.pathname;

    // --- login ---
    if (caminho.startsWith("/auth/v1/token")) {
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    }
    if (caminho.startsWith("/auth/v1/user")) {
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO.user) });
    }
    if (caminho.startsWith("/auth/v1/logout")) {
      return rota.fulfill({ status: 204, body: "" });
    }

    // --- funções do banco (supabase.rpc) ---
    if (caminho.startsWith("/rest/v1/rpc/")) {
      const funcao = caminho.replace("/rest/v1/rpc/", "");
      if (!(funcao in FUNCOES)) faltando.add(`rpc/${funcao}`);
      const resposta =
        typeof FUNCOES[funcao] === "function" ? FUNCOES[funcao](req.postDataJSON() ?? {}) : FUNCOES[funcao];
      return rota.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(resposta ?? null),
      });
    }

    // --- dados (PostgREST) ---
    if (caminho.startsWith("/rest/v1/")) {
      const tabela = caminho.replace("/rest/v1/", "").split("?")[0];
      let linhas = TABELAS[tabela];
      if (!linhas) {
        faltando.add(tabela);
        linhas = [];
      }

      linhas = filtrarComoOSupabase(linhas, url.searchParams);

      // .maybeSingle()/.single() pedem um objeto, não uma lista
      const querObjeto = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
      const corpo = querObjeto ? (linhas[0] ?? null) : linhas;
      return rota.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": `0-${Math.max(linhas.length - 1, 0)}/${linhas.length}` },
        body: JSON.stringify(corpo),
      });
    }

    return rota.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
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
export function filtrarComoOSupabase(linhasOriginais, parametros) {
  let linhas = [...linhasOriginais];
  for (const [campo, valor] of parametros.entries()) {
    if (["select", "order", "limit", "offset"].includes(campo)) continue;
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

  const deslocamento = Number(parametros.get("offset") ?? 0);
  const limite = parametros.get("limit");
  return linhas.slice(deslocamento, limite === null ? undefined : deslocamento + Number(limite));
}
