import type { PedidoDemo } from "./supabaseFalso";

// O "fetch de mentira" do modo demonstração: o cliente do Supabase é criado
// com ele, e tudo que vai pro endereço de demonstração é respondido da
// memória, sem rede. Este arquivo é carregado SEMPRE (o supabase.ts o importa),
// então não pode puxar os dados inventados na entrada: eles só entram, em
// pedaço separado do build, na primeira vez que alguém de fato pede algo.

// ".invalid" é um domínio que nunca resolve: se algo escapasse, falharia em
// vez de bater em servidor de verdade.
export const ENDERECO_DEMO = "https://demonstracao.invalid";
export const CHAVE_SESSAO_DEMO = "sakura-demo-auth";

const carregarFalso = () => import("./supabaseFalso");

export const fetchDemo: typeof fetch = async (entrada, opcoes) => {
  const pedidoOriginal = entrada instanceof Request ? entrada : null;
  const url = pedidoOriginal ? pedidoOriginal.url : String(entrada);
  // Qualquer outro endereço (ex.: ViaCEP) segue pela rede de verdade.
  if (!url.startsWith(ENDERECO_DEMO)) return globalThis.fetch(entrada, opcoes);

  const cabecalhos: Record<string, string> = {};
  const juntar = (h?: HeadersInit) => {
    if (!h) return;
    new Headers(h).forEach((valor, nome) => {
      cabecalhos[nome] = valor;
    });
  };
  juntar(pedidoOriginal?.headers);
  juntar(opcoes?.headers);

  const metodo = opcoes?.method || pedidoOriginal?.method || "GET";
  let corpo: string | null = null;
  const bruto = opcoes?.body;
  if (typeof bruto === "string") corpo = bruto;
  else if (bruto instanceof URLSearchParams) corpo = bruto.toString();
  else if (bruto == null && pedidoOriginal && metodo !== "GET" && metodo !== "HEAD") {
    corpo = await pedidoOriginal.clone().text();
  }
  // (arquivo enviado ao storage: o corpo não importa, a resposta é sempre "ok")

  const { responderComoSupabase } = await carregarFalso();
  const pedido: PedidoDemo = { metodo, url, cabecalhos, corpo };
  const r = responderComoSupabase(pedido);
  // Resposta sem corpo (204 etc.) não aceita texto vazio como corpo.
  const semCorpo = r.status === 204 || r.status === 205 || r.status === 304;
  return new Response(semCorpo ? null : r.corpo, { status: r.status, headers: r.cabecalhos });
};

// O "storage" da sessão do supabase-js: guarda em memória, e na primeira
// leitura já tem a sessão da demonstração gravada, então o programa abre já
// logado. Some ao fechar, como o resto.
const memoria = new Map<string, string>();
export const armazenamentoDemo = {
  async getItem(chave: string): Promise<string | null> {
    if (chave === CHAVE_SESSAO_DEMO && !memoria.has(chave)) {
      const { SESSAO } = await import("./dados");
      memoria.set(chave, JSON.stringify(SESSAO));
    }
    return memoria.get(chave) ?? null;
  },
  async setItem(chave: string, valor: string): Promise<void> {
    memoria.set(chave, valor);
  },
  async removeItem(chave: string): Promise<void> {
    memoria.delete(chave);
  },
};
