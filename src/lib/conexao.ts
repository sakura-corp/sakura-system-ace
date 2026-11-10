import { createClient } from "@supabase/supabase-js";
import { ENDERECO_DEMO } from "@/demo/fetchDemo";

// Decide com qual Supabase (qual empresa) este computador vai falar.
//
// O app nasceu com a conexão gravada dentro do build, o que fazia um
// instalador servir uma empresa só. Agora ela é escolhida na primeira
// abertura e guardada neste computador (ver o bloco sobre "conexao.json" em
// electron/main.ts), então o mesmo instalador serve qualquer empresa.

export interface Conexao {
  url: string;
  chave: string;
}

// Em desenvolvimento (`npm run dev`), o `.env` continua mandando — assim quem
// está programando não precisa passar pela tela de configuração a cada
// máquina nova. **No app instalado o `.env` é ignorado de propósito**: o
// instalador não carrega mais a conexão de empresa nenhuma dentro dele (ver o
// comentário em .github/workflows/release.yml), justamente pra um instalador
// entregue a um cliente novo não vir apontando pro banco de outra empresa.
//
// Exceção: no `npm run dev:demo` (modo "demo" do Vite) o `.env` também é
// ignorado, senão ele passaria na frente e a demonstração nunca abriria.
const usaEnvDoDesenvolvimento = import.meta.env.DEV && import.meta.env.MODE !== "demo";
const urlDoDesenvolvimento = usaEnvDoDesenvolvimento ? import.meta.env.VITE_SUPABASE_URL || "" : "";
const chaveDoDesenvolvimento = usaEnvDoDesenvolvimento
  ? import.meta.env.VITE_SUPABASE_ANON_KEY || ""
  : "";

// ---------------------------------------------------------------------------
// Modo demonstração (FN-14): o programa inteiro funcionando com dados
// inventados, só na memória, pra mostrar o sistema sem tocar em banco nenhum.
//
// O sinal fica no `sessionStorage`, que o Electron apaga ao fechar a janela:
// assim a demonstração vale "até fechar o programa" e, ao abrir de novo, o
// programa volta à conexão de verdade (não fica preso na demonstração). Nada
// é gravado no `conexao.json` do computador.
// ---------------------------------------------------------------------------
const SINAL_DEMO = "sakura_modo_demonstracao";

// Digitar "demo" no campo do endereço da tela de conexão abre a demonstração.
export function ehPalavraDemo(texto: string): boolean {
  return texto.trim().toLowerCase() === "demo";
}

function lerSinalDemo(): string | null {
  try {
    return sessionStorage.getItem(SINAL_DEMO);
  } catch {
    // Armazenamento bloqueado: segue como se não houvesse sinal.
    return null;
  }
}

function gravarSinalDemo(valor: "sim" | "saiu" | null) {
  try {
    if (valor === null) sessionStorage.removeItem(SINAL_DEMO);
    else sessionStorage.setItem(SINAL_DEMO, valor);
  } catch {
    // Sem armazenamento a demonstração não liga; não há o que fazer além disso.
  }
}

export function modoDemonstracao(): boolean {
  const sinal = lerSinalDemo();
  if (sinal === "sim") return true;
  if (sinal === "saiu") return false;
  // Sem sinal nenhum: só o `npm run dev:demo` abre direto na demonstração.
  return import.meta.env.DEV && import.meta.env.MODE === "demo";
}

// O cliente do Supabase é criado quando o módulo carrega, então mudar de
// modo exige recarregar a janela inteira (é o que o salvarConexao também faz).
function recarregarJanela() {
  if (typeof window !== "undefined") window.location.reload();
}

export function entrarNaDemonstracao() {
  gravarSinalDemo("sim");
  recarregarJanela();
}

export function sairDaDemonstracao() {
  gravarSinalDemo("saiu");
  recarregarJanela();
}

export function conexaoAtual(): Conexao | null {
  // Endereço e chave de mentira: só servem pro App.tsx entender que "há
  // conexão" e não mostrar a tela de conexão. Quem responde é o fetchDemo.
  if (modoDemonstracao()) return { url: ENDERECO_DEMO, chave: "demo" };
  if (urlDoDesenvolvimento && chaveDoDesenvolvimento) {
    return { url: urlDoDesenvolvimento, chave: chaveDoDesenvolvimento };
  }
  const salva = typeof window !== "undefined" ? window.sakuraApp?.conexao : undefined;
  return salva ?? null;
}

export function conexaoConfigurada(): boolean {
  return conexaoAtual() !== null;
}

export async function salvarConexao(conexao: Conexao): Promise<void> {
  if (typeof window === "undefined" || !window.sakuraApp) {
    throw new Error(
      "Não foi possível salvar a conexão: esta tela precisa rodar dentro do aplicativo instalado.",
    );
  }
  await window.sakuraApp.salvarConexao(conexao);
  // Quem salva uma conexão de verdade sai da demonstração (o app recarrega em
  // seguida e já abre na conexão nova).
  gravarSinalDemo(null);
}

// Confere se a URL e a chave funcionam de verdade, pra usuária não descobrir
// um erro de digitação só na hora de entrar.
//
// **Nunca deve impedir de salvar** (ver ConexaoPage): duas versões seguidas
// deste teste acusaram "chave não aceita" com a chave certa, e enquanto ele
// era obrigatório pra salvar, isso virava uma parede que deixava a usuária
// sem conseguir usar o sistema. Um teste sobre o qual não se tem certeza
// absoluta serve de aviso, não de tranca.
//
// Traduz o erro numa mensagem em português (`null` = deu certo). Separado da
// chamada de rede pra poder ser testado sem internet.
export function mensagemDoTeste(erro: { message?: string; code?: string } | null): string | null {
  if (!erro) return null;
  const mensagem = erro.message ?? "";
  if (/api key|apikey|jwt|unauthorized/i.test(mensagem)) {
    return "O endereço respondeu, mas a chave não foi aceita. Confira se copiou a chave inteira — e, se o painel do Supabase mostrar mais de uma, tente a outra.";
  }
  // Conectou e a chave passou, mas o banco não tem as tabelas do sistema —
  // acontece num projeto Supabase novo, antes de rodar as migrations.
  if (erro.code === "PGRST205" || erro.code === "42P01" || /does not exist/i.test(mensagem)) {
    return "Conectou, mas esse projeto ainda não tem as tabelas do Sakura System. Rode as migrations antes de usar.";
  }
  return `O Supabase respondeu com um erro: ${mensagem}`;
}

export async function testarConexao(conexao: Conexao): Promise<void> {
  // Usa o próprio cliente do Supabase, em vez de montar a requisição à mão:
  // assim o teste passa exatamente pelo mesmo caminho que o app usa de
  // verdade, e não pode "passar" num caminho que o app não usa (ou reprovar
  // num detalhe de cabeçalho que só existia aqui — foi o que aconteceu nas
  // duas primeiras versões deste teste).
  const cliente = createClient(conexao.url, conexao.chave, {
    auth: { persistSession: false },
    // Sem esse limite, uma URL com erro de digitação deixa o botão "Testando..."
    // pendurado por muito tempo, sem dizer nada — parece que travou.
    global: {
      fetch: (entrada, opcoes) =>
        fetch(entrada, { ...opcoes, signal: AbortSignal.timeout(10_000) }),
    },
  });
  let erro: { message?: string; code?: string } | null;
  try {
    // `lojas` existe em todo projeto Sakura já preparado. Sem estar logado, a
    // RLS simplesmente não devolve linha nenhuma — o que conta aqui é não vir
    // erro de chave inválida.
    ({ error: erro } = await cliente.from("lojas").select("id").limit(1));
  } catch {
    throw new Error(
      "Não foi possível falar com esse endereço. Confira se a URL está certa e se o computador está conectado à internet.",
    );
  }
  const problema = mensagemDoTeste(erro);
  if (problema) throw new Error(problema);
}
