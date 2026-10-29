// Edge Function do Supabase — o "porteiro" da Focus NFe (item TR-04.2).
//
// O token da Focus NFe EMITE E CANCELA NOTA FISCAL NO CNPJ DA LOJA. Até a
// v0.9.40 ele ficava numa coluna comum do banco e viajava até o computador
// de cada operador, balconista incluído. Agora ele mora no cofre
// (`segredos_fiscais_loja`, migration 0057), que nenhum operador lê, e quem
// usa o token é esta função: o programa pede "emita esta nota pela loja X",
// ela confere quem está pedindo e se aquilo faz sentido, e só então repassa
// à Focus NFe com o token.
//
// O que ela NÃO faz, de propósito: montar a nota. O corpo continua sendo
// montado pelo programa, exatamente como antes (`src/lib/focusNfe.ts`, com o
// teste-ouro), e chega aqui pronto. Reescrever a montagem num segundo lugar
// seria abrir a porta pra os dois divergirem — é a história dos itens 35, 40,
// 44 e 49 da seção 6 do PROJETO_STATUS.md, e aqui o custo seria nota
// recusada ou errada.
//
// As conferências, em ordem:
//   1. quem pede está logado, e pode fazer aquilo naquela loja — a regra é
//      `pode_usar_focus_nfe()` no banco, chamada COMO O OPERADOR (a mesma
//      regra que a tela já seguia: emitir/consultar/baixar pra quem tem OS
//      ou Notas Fiscais, cancelar só pra quem tem Notas Fiscais);
//   2. emitir: o CNPJ que está na nota é o CNPJ da loja. Sem isso, se um dia
//      a conta da Focus NFe for única pra todas as empresas (é a ideia do
//      "token compartilhado", seção 8 item 6), um operador de uma loja
//      poderia emitir nota em nome de outra empresa cliente;
//   3. cancelar: a nota está registrada como emitida POR ESTA LOJA. Cancelar
//      é a ação que não tem volta;
//   4. baixar o PDF/XML: quem escolhe o endereço do arquivo é a resposta da
//      própria Focus NFe, nunca quem pede — senão o porteiro viraria um jeito
//      de chamar qualquer endereço da API com o token junto;
//   5. o ambiente (homologação/produção) vem do cadastro da loja, não do
//      pedido.
//
// A resposta tem sempre o mesmo formato:
//   • 200 com { ok, status, dados } — o porteiro repassou, e `status` é o
//     que a Focus NFe respondeu (inclusive erro dela, que o programa mostra
//     como sempre mostrou);
//   • outro código com { erro, motivo } — o porteiro recusou, e `erro` é uma
//     frase pra pessoa ler.
//
// Sem nenhum `import`, de propósito: assim o mesmo arquivo roda no Supabase
// (Deno) e no teste do Vitest (`index.test.ts`), que injeta um `fetch` de
// mentira no lugar do Supabase e da Focus NFe. E publicar continua sendo
// colar UM arquivo no editor do painel.
//
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY o Supabase já
// injeta sozinho em toda Edge Function — não há secret nenhum pra
// configurar. O token fica na tabela, uma por loja.

export type AcaoPorteiro = "emitir" | "consultar" | "cancelar" | "baixar";
// nfsen = NFS-e pelo Padrão Nacional (#837): desde 01/11/2026 é o único
// caminho pra empresa do Simples em Araraquara. Mesmo token, outro endereço
// (`/v2/nfsen`) e outro formato de corpo.
export type TipoNota = "nfce" | "nfse" | "nfsen";

export interface Ambiente {
  env: (nome: string) => string | undefined;
  fetch: typeof fetch;
}

export const HOSTS_DA_FOCUS_NFE: Record<string, string> = {
  homologacao: "homologacao.focusnfe.com.br",
  producao: "api.focusnfe.com.br",
};

const HOSTS_PERMITIDOS = new Set(Object.values(HOSTS_DA_FOCUS_NFE));

// O PDF da NFS-e Nacional (DANFSe) a Focus NFe devolve num endereço público
// do S3 dela (campo `url_danfse`, conferido em doc.focusnfe.com.br,
// "NFSe Nacional → Consultar"). Ele é buscado SEM o token: o token só vai
// pros dois hosts acima.
const HOST_PUBLICO_DO_DANFSE = "focusnfe.s3.sa-east-1.amazonaws.com";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// A `ref` vai no caminho da URL da Focus NFe. Só letra, número, hífen e
// sublinhado: nada de barra, ponto ou interrogação que mudasse o endereço.
const REF_VALIDA = /^[A-Za-z0-9_-]{1,80}$/;

function responder(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function recusar(status: number, motivo: string, erro: string): Response {
  return responder(status, { erro, motivo });
}

function soDigitos(valor: unknown): string {
  return typeof valor === "string" ? valor.replace(/\D/g, "") : "";
}

function basicAuth(token: string): string {
  // btoa só aceita latin-1; o token da Focus NFe é alfanumérico.
  return `Basic ${btoa(`${token}:`)}`;
}

function paraBase64(bytes: Uint8Array): string {
  let binario = "";
  const pedaco = 0x8000;
  for (let i = 0; i < bytes.length; i += pedaco) {
    binario += String.fromCharCode(...bytes.subarray(i, i + pedaco));
  }
  return btoa(binario);
}

function lerJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8").decode(bytes));
  } catch {
    return null;
  }
}

interface Pedido {
  loja_id: string;
  acao: AcaoPorteiro;
  tipo: TipoNota;
  ref: string;
  corpo?: Record<string, unknown>;
  justificativa?: string;
  arquivo?: "xml" | "danfe";
}

/** Confere o formato do pedido. Devolve o pedido limpo ou a frase do erro. */
export function validarPedido(bruto: unknown): Pedido | string {
  if (typeof bruto !== "object" || bruto === null) return "Pedido vazio ou mal formado.";
  const p = bruto as Record<string, unknown>;

  if (typeof p.loja_id !== "string" || !UUID.test(p.loja_id)) return "Loja não informada.";
  if (p.acao !== "emitir" && p.acao !== "consultar" && p.acao !== "cancelar" && p.acao !== "baixar") {
    return "Ação desconhecida.";
  }
  if (p.tipo !== "nfce" && p.tipo !== "nfse" && p.tipo !== "nfsen") return "Tipo de nota desconhecido.";
  if (typeof p.ref !== "string" || !REF_VALIDA.test(p.ref)) return "Referência da nota inválida.";

  const pedido: Pedido = { loja_id: p.loja_id, acao: p.acao, tipo: p.tipo, ref: p.ref };

  if (p.acao === "emitir") {
    if (typeof p.corpo !== "object" || p.corpo === null || Array.isArray(p.corpo)) {
      return "A nota chegou sem conteúdo.";
    }
    pedido.corpo = p.corpo as Record<string, unknown>;
  }
  if (p.acao === "cancelar") {
    const justificativa = typeof p.justificativa === "string" ? p.justificativa.trim() : "";
    // A Focus NFe exige de 15 a 255 caracteres; a tela já confere, e aqui se
    // confere de novo porque o porteiro não confia na tela.
    if (justificativa.length < 15 || justificativa.length > 255) {
      return "A justificativa do cancelamento precisa ter de 15 a 255 caracteres.";
    }
    pedido.justificativa = justificativa;
  }
  if (p.acao === "baixar") {
    if (p.arquivo !== "xml" && p.arquivo !== "danfe") return "Arquivo desconhecido.";
    pedido.arquivo = p.arquivo;
  }
  return pedido;
}

/** O CNPJ que a nota diz ser o do emitente (NFC-e) ou do prestador (NFS-e). */
export function cnpjDoCorpo(tipo: TipoNota, corpo: Record<string, unknown>): string {
  if (tipo === "nfce") return soDigitos(corpo.cnpj_emitente);
  // A NFS-e Nacional tem o corpo "achatado": o prestador não é um objeto.
  if (tipo === "nfsen") return soDigitos(corpo.cnpj_prestador);
  const prestador = corpo.prestador;
  return typeof prestador === "object" && prestador !== null
    ? soDigitos((prestador as Record<string, unknown>).cnpj)
    : "";
}

/**
 * O CNPJ que a Focus NFe diz ser o dono da nota, quando ela diz. O nome do
 * campo não foi confirmado pra todo tipo de resposta, então ausente quer dizer
 * "não dá pra conferir" — e aí vale a conferência da loja, que já passou.
 */
export function cnpjDaResposta(dados: unknown): string {
  if (typeof dados !== "object" || dados === null) return "";
  const d = dados as Record<string, unknown>;
  return soDigitos(d.cnpj_emitente) || soDigitos(d.cnpj_prestador);
}

/**
 * Onde buscar o arquivo que a Focus NFe apontou. Só caminho relativo (que vai
 * pro host do ambiente da loja) ou endereço https de um dos dois hosts da
 * Focus NFe. Qualquer outra coisa é recusada — é onde o token iria junto.
 */
export function enderecoDoArquivo(caminho: unknown, host: string): string | null {
  if (typeof caminho !== "string" || caminho === "") return null;
  if (caminho.startsWith("/") && !caminho.startsWith("//")) return `https://${host}${caminho}`;
  let endereco: URL;
  try {
    endereco = new URL(caminho);
  } catch {
    return null;
  }
  if (endereco.protocol !== "https:" || !HOSTS_PERMITIDOS.has(endereco.hostname)) return null;
  return endereco.toString();
}

/** O endereço do DANFSe da NFS-e Nacional, só se for o S3 da Focus NFe. */
export function enderecoPublicoDoDanfse(caminho: unknown): string | null {
  if (typeof caminho !== "string") return null;
  let endereco: URL;
  try {
    endereco = new URL(caminho);
  } catch {
    return null;
  }
  if (endereco.protocol !== "https:" || endereco.hostname !== HOST_PUBLICO_DO_DANFSE) return null;
  return endereco.toString();
}

export async function atender(req: Request, amb: Ambiente): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return recusar(405, "metodo", "Use POST.");

  const supabaseUrl = amb.env("SUPABASE_URL");
  const anonKey = amb.env("SUPABASE_ANON_KEY");
  const serviceKey = amb.env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return recusar(500, "configuracao", "Configuração do Supabase incompleta nesta função.");
  }

  const autorizacao = req.headers.get("Authorization") ?? "";
  if (!autorizacao.startsWith("Bearer ")) {
    return recusar(401, "sem_login", "Sessão inválida — faça login de novo.");
  }

  let bruto: unknown;
  try {
    bruto = await req.json();
  } catch {
    return recusar(400, "pedido", "Pedido vazio ou mal formado.");
  }
  const pedido = validarPedido(bruto);
  if (typeof pedido === "string") return recusar(400, "pedido", pedido);

  // ---- 1. quem pede pode? (como o próprio operador) -----------------------
  const permissao = await amb.fetch(`${supabaseUrl}/rest/v1/rpc/pode_usar_focus_nfe`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: autorizacao, "Content-Type": "application/json" },
    body: JSON.stringify({ p_loja_id: pedido.loja_id, p_acao: pedido.acao }),
  });
  if (permissao.status === 401) {
    return recusar(401, "sem_login", "Sessão inválida — faça login de novo.");
  }
  if (!permissao.ok || (await permissao.json()) !== true) {
    return recusar(
      403,
      "sem_permissao",
      pedido.acao === "cancelar"
        ? "Você não tem permissão para cancelar nota fiscal nesta loja (precisa do módulo Notas Fiscais)."
        : "Você não tem permissão para usar a emissão de nota fiscal nesta loja.",
    );
  }

  // ---- o que só o servidor sabe: token, CNPJ e ambiente da loja -----------
  const comoServidor = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const lerTabela = async (caminho: string): Promise<Record<string, unknown>[] | null> => {
    const r = await amb.fetch(`${supabaseUrl}/rest/v1/${caminho}`, { headers: comoServidor });
    return r.ok ? ((await r.json()) as Record<string, unknown>[]) : null;
  };

  const loja = encodeURIComponent(pedido.loja_id);
  const [segredos, fiscais] = await Promise.all([
    lerTabela(`segredos_fiscais_loja?loja_id=eq.${loja}&select=focus_nfe_token`),
    lerTabela(`configuracoes_fiscais_loja?loja_id=eq.${loja}&select=cnpj,focus_nfe_ambiente`),
  ]);
  if (segredos === null || fiscais === null) {
    return recusar(502, "banco", "Não consegui ler os dados fiscais da loja agora. Tente de novo em instantes.");
  }

  const token = typeof segredos[0]?.focus_nfe_token === "string" ? segredos[0].focus_nfe_token.trim() : "";
  if (!token) {
    return recusar(
      409,
      "sem_token",
      "Token do Focus NFe não configurado — cadastre em Configurações → Dados fiscais da loja.",
    );
  }
  const cnpjLoja = soDigitos(fiscais[0]?.cnpj);
  if (cnpjLoja.length !== 14) {
    return recusar(
      409,
      "sem_cnpj",
      "O CNPJ da loja não está cadastrado — preencha em Configurações → Dados fiscais da loja.",
    );
  }
  const ambiente = fiscais[0]?.focus_nfe_ambiente === "producao" ? "producao" : "homologacao";
  const host = HOSTS_DA_FOCUS_NFE[ambiente];

  const chamarFocus = async (
    metodo: string,
    endereco: string,
    corpo?: unknown,
    semToken = false,
  ): Promise<{ ok: boolean; status: number; tipo: string; bytes: Uint8Array }> => {
    const r = await amb.fetch(endereco, {
      method: metodo,
      headers: semToken
        ? { "Content-Type": "application/json" }
        : { Authorization: basicAuth(token), "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    return {
      ok: r.ok,
      status: r.status,
      tipo: r.headers.get("content-type") ?? "",
      bytes: new Uint8Array(await r.arrayBuffer()),
    };
  };
  const enderecoDaNota = `https://${host}/v2/${pedido.tipo}/${pedido.ref}`;
  const naoEDestaLoja = () =>
    recusar(403, "outra_empresa", "Essa nota não é desta loja — o CNPJ não bate com o cadastro.");

  // ---- 2. emitir -----------------------------------------------------------
  if (pedido.acao === "emitir") {
    if (cnpjDoCorpo(pedido.tipo, pedido.corpo!) !== cnpjLoja) return naoEDestaLoja();
    const r = await chamarFocus(
      "POST",
      `https://${host}/v2/${pedido.tipo}?ref=${pedido.ref}`,
      pedido.corpo,
    );
    return responder(200, { ok: r.ok, status: r.status, dados: lerJson(r.bytes) });
  }

  // ---- 3. cancelar: só nota emitida por esta loja ------------------------
  if (pedido.acao === "cancelar") {
    // Na tabela, municipal e nacional são as duas "nfse".
    const tipoNaTabela = pedido.tipo === "nfce" ? "nfe" : "nfse";
    const registradas = await lerTabela(
      `notas_fiscais_arquivos?loja_id=eq.${loja}&focus_nfe_ref=eq.${encodeURIComponent(pedido.ref)}` +
        `&tipo=eq.${tipoNaTabela}&select=id`,
    );
    if (registradas === null) {
      return recusar(502, "banco", "Não consegui conferir a nota agora. Tente de novo em instantes.");
    }
    if (registradas.length === 0) {
      return recusar(
        404,
        "nota_desconhecida",
        "Essa nota não está registrada como emitida por esta loja — não dá pra cancelar por aqui.",
      );
    }
    const r = await chamarFocus("DELETE", enderecoDaNota, { justificativa: pedido.justificativa });
    return responder(200, { ok: r.ok, status: r.status, dados: lerJson(r.bytes) });
  }

  // ---- consultar (e o primeiro passo de baixar) --------------------------
  const consulta = await chamarFocus("GET", enderecoDaNota);
  const dados = lerJson(consulta.bytes);
  const cnpjDaNota = cnpjDaResposta(dados);
  if (cnpjDaNota && cnpjDaNota !== cnpjLoja) return naoEDestaLoja();

  if (pedido.acao === "consultar" || !consulta.ok) {
    return responder(200, { ok: consulta.ok, status: consulta.status, dados });
  }

  // ---- 4. baixar: o endereço vem da resposta da Focus NFe -----------------
  if (pedido.tipo === "nfsen" && pedido.arquivo === "danfe") {
    const urlDanfse = (dados as Record<string, unknown> | null)?.url_danfse;
    const publico = enderecoPublicoDoDanfse(urlDanfse);
    if (publico) {
      const pdf = await chamarFocus("GET", publico, undefined, true);
      return responder(200, {
        ok: pdf.ok,
        status: pdf.status,
        tipo_conteudo: pdf.tipo,
        conteudo_base64: pdf.ok ? paraBase64(pdf.bytes) : null,
      });
    }
    // Sem url_danfse no S3, segue pelo caminho_danfe de sempre (abaixo).
  }
  const campo = pedido.arquivo === "xml" ? "caminho_xml_nota_fiscal" : "caminho_danfe";
  const caminho = (dados as Record<string, unknown> | null)?.[campo];
  if (!caminho) {
    return recusar(404, "sem_arquivo", "A Focus NFe não devolveu esse arquivo para essa nota.");
  }
  const endereco = enderecoDoArquivo(caminho, host);
  if (!endereco) {
    return recusar(502, "endereco_estranho", "A Focus NFe apontou um endereço de arquivo que o porteiro não aceita.");
  }
  const arquivo = await chamarFocus("GET", endereco);
  return responder(200, {
    ok: arquivo.ok,
    status: arquivo.status,
    tipo_conteudo: arquivo.tipo,
    conteudo_base64: arquivo.ok ? paraBase64(arquivo.bytes) : null,
  });
}

// No Supabase (Deno), sobe o servidor. No teste (Node), `Deno` não existe e
// só a função `atender` é usada.
declare const Deno: {
  env: { get(nome: string): string | undefined };
  serve(tratar: (req: Request) => Promise<Response>): void;
};

if (typeof Deno !== "undefined") {
  Deno.serve((req) =>
    atender(req, { env: (nome) => Deno.env.get(nome), fetch: (...args) => fetch(...args) }).catch(
      (erro: unknown) =>
        recusar(
          500,
          "inesperado",
          erro instanceof Error ? erro.message : "Erro inesperado no porteiro da Focus NFe.",
        ),
    ),
  );
}
