/**
 * O conteúdo do Diagnóstico, como função pura (item TR-08.1 do guia).
 *
 * A coleta em si — versões do Electron, leitura dos registros em disco, as
 * três checagens ao vivo — fica em `src/lib/diagnostico.ts`, porque depende
 * de IPC e de rede. Aqui fica só o que dá pra testar sem nada disso: a
 * montagem do texto e, principalmente, **a garantia de que segredo nenhum
 * sai daqui**.
 *
 * Por que isso importa mais que a formatação: este pacote existe pra ser
 * mandado por WhatsApp. Ele sai da máquina da loja e vai parar numa conversa,
 * então o que entra nele precisa ser escolhido a dedo, e não "tudo que der".
 *
 * A regra, em três partes:
 *
 * 1. **Nada é despejado.** O relatório é montado campo a campo, a partir de
 *    uma estrutura declarada — nunca espalhando um objeto de configuração ou
 *    uma resposta do banco. Chave e token não são omitidos por descuido de
 *    quem escreveu: eles nunca chegam a ser coletados.
 * 2. **O que vem de fora passa pela máscara.** Os dois registros em disco
 *    são texto livre escrito por quem quer que tenha estourado um erro, e um
 *    erro de rede pode carregar a URL inteira com a chave dentro. Por isso
 *    `mascararSegredos` roda em cima deles antes de qualquer coisa.
 * 3. **O resumo curto não leva registro nenhum.** É o texto que a pessoa cola
 *    no WhatsApp sem ler; ele carrega só fato técnico.
 *
 * O que este arquivo NÃO promete, e está escrito na tela: uma linha de
 * `erros.log` pode citar um dado da tela onde o erro aconteceu (o nome de um
 * cliente numa gravação que falhou, por exemplo). Mascarar isso não é
 * possível sem destruir o valor do registro — então o caminho é a pessoa
 * saber o que está mandando, não uma promessa que o código não consegue
 * cumprir.
 */
import type { SituacaoEsquema } from "./versaoEsquema";

export interface ChecagemDiagnostico {
  nome: string;
  ok: boolean;
  detalhe: string;
  /** Quanto a checagem demorou, em milissegundos. */
  ms: number;
}

export interface Diagnostico {
  geradoEm: Date;
  fusoDoComputador: string;
  app: {
    versao: string;
    electron: string;
    chromium: string;
    node: string;
    sistema: string;
    arquitetura: string;
    pastaDados: string;
    /**
     * "teste" ou "normal" (item TR-09.1). Vai no resumo porque é a pergunta
     * que vem logo depois de "que versão você tem?": se a loja está no canal
     * de teste, ela pode estar numa versão que as outras ainda não receberam.
     */
    canalAtualizacao: string;
  };
  /** Só o ENDEREÇO do projeto Supabase. A chave nunca entra aqui. */
  enderecoDoBanco: string;
  /**
   * Em que versão está o banco desta empresa, contra a que este programa
   * espera (item TR-05.7).
   *
   * É a primeira coisa a olhar quando uma tela "quebrou sozinha depois da
   * atualização": banco atrás do programa explica erro de coluna inexistente
   * sem que ninguém tenha feito nada errado.
   */
  esquema: SituacaoEsquema;
  sessao: {
    usuario: string;
    nome: string;
    admin: boolean;
    loja: string;
  };
  checagens: ChecagemDiagnostico[];
  logs: {
    erros: string;
    atualizacoes: string;
  };
}

/**
 * Troca por `***` qualquer coisa com cara de credencial.
 *
 * Duas frentes, e as duas são necessárias:
 *
 * - **Os segredos conhecidos** (`segredosConhecidos`): hoje, a chave do
 *   Supabase deste computador. É o caso mais provável de todos, porque ela
 *   vai junto na URL de toda requisição que falha.
 * - **Os formatos conhecidos**: chave da Anthropic, chave secreta e
 *   publicável do Supabase, e JWT. Pega o segredo que ninguém lembrou de
 *   passar — inclusive de um serviço que este arquivo nem sabe que existe.
 *
 * Segredo curto demais é ignorado de propósito: uma string de 3 letras
 * apareceria no meio de palavra comum e transformaria o registro inteiro em
 * `***`, que é pior que não mascarar (esconde o problema em vez do segredo).
 */
const TAMANHO_MINIMO_DE_SEGREDO = 8;

const FORMATOS_DE_SEGREDO: RegExp[] = [
  // Anthropic (a chave da leitura de nota por foto).
  /sk-ant-[A-Za-z0-9_-]{8,}/g,
  // Supabase, formato novo — a secreta e a publicável.
  /sb_(?:secret|publishable)_[A-Za-z0-9_-]{8,}/g,
  // JWT (o formato antigo da chave anon do Supabase, e todo token de sessão).
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g,
  // Credencial escrita num cabeçalho ou numa URL.
  /\b(?:apikey|api_key|access_token|token)=[^&\s"']+/gi,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\bBasic\s+[A-Za-z0-9+/=]{8,}/g,
];

function escaparParaRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mascararSegredos(texto: string, segredosConhecidos: string[] = []): string {
  let saida = texto;
  for (const segredo of segredosConhecidos) {
    if (!segredo || segredo.length < TAMANHO_MINIMO_DE_SEGREDO) continue;
    saida = saida.replace(new RegExp(escaparParaRegex(segredo), "g"), "***");
  }
  for (const formato of FORMATOS_DE_SEGREDO) {
    saida = saida.replace(formato, "***");
  }
  return saida;
}

/** As últimas `quantas` linhas de um texto, sem as linhas vazias do fim. */
export function ultimasLinhas(texto: string, quantas: number): string[] {
  const linhas = texto.split("\n");
  while (linhas.length > 0 && linhas[linhas.length - 1].trim() === "") linhas.pop();
  return linhas.slice(-quantas);
}

function dataHoraLocal(data: Date): string {
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** "55 (em dia)" / "52 — faltam rodar 0053, 0054, 0055". */
export function descreverEsquema(esquema: SituacaoEsquema): string {
  switch (esquema.estado) {
    case "em_dia":
      return `${esquema.versaoBanco} (em dia)`;
    case "banco_atrasado":
      return `${esquema.versaoBanco} — o programa espera ${esquema.versaoApp}; faltam rodar ${esquema.faltando.join(", ")}`;
    case "esperando_computadores": {
      const varias = esquema.faltando.length > 1;
      return `${esquema.versaoBanco} — ${varias ? "faltam as" : "falta a"} ${esquema.faltando.join(", ")}, que ${varias ? "esperam" : "espera"} os computadores chegarem na ${esquema.versaoMinimaDosComputadores}`;
    }
    case "app_atrasado":
      return `${esquema.versaoBanco} — à frente deste programa, que espera ${esquema.versaoApp}`;
    default:
      return "não foi possível perguntar ao banco";
  }
}

function linhaDaChecagem(checagem: ChecagemDiagnostico): string {
  return `${checagem.ok ? "OK" : "FALHOU"} · ${checagem.nome} (${checagem.ms} ms) — ${checagem.detalhe}`;
}

/**
 * O texto curto, pra colar numa conversa.
 *
 * **Não leva nenhuma linha de registro** — só a contagem. Quem manda isso
 * está pedindo socorro no meio do expediente e não vai ler o que está
 * colando; então aqui só entra fato técnico que já passou por escolha.
 */
export function montarResumo(d: Diagnostico): string {
  const erros = ultimasLinhas(d.logs.erros, 1000).length;
  return [
    "Sakura System — diagnóstico",
    `Versão do app: ${d.app.versao} (canal de atualização: ${d.app.canalAtualizacao})`,
    `Sistema: ${d.app.sistema} · Electron ${d.app.electron} · Chromium ${d.app.chromium}`,
    `Banco: ${d.enderecoDoBanco}`,
    `Versão do banco: ${descreverEsquema(d.esquema)}`,
    `Usuário: @${d.sessao.usuario}${d.sessao.admin ? " (admin)" : ""} · Loja: ${d.sessao.loja}`,
    `Aqui é ${dataHoraLocal(d.geradoEm)} (${d.fusoDoComputador})`,
    ...d.checagens.map(linhaDaChecagem),
    `Erros registrados neste computador: ${erros}`,
  ].join("\n");
}

/**
 * O arquivo completo, que vai dentro do .zip. É o resumo mais os dois
 * registros — os dois já mascarados por quem chamou (ver `lib/diagnostico.ts`).
 */
export function montarRelatorio(d: Diagnostico): string {
  const erros = ultimasLinhas(d.logs.erros, 200);
  const atualizacoes = ultimasLinhas(d.logs.atualizacoes, 200);
  return [
    montarResumo(d),
    "",
    `Node ${d.app.node} · ${d.app.arquitetura}`,
    `Pasta de dados: ${d.app.pastaDados}`,
    `Gerado em ${d.geradoEm.toISOString()}`,
    "",
    `--- Últimos erros (${erros.length} linhas) ---`,
    erros.length > 0 ? erros.join("\n") : "(nenhum erro registrado neste computador)",
    "",
    `--- Últimas atualizações (${atualizacoes.length} linhas) ---`,
    atualizacoes.length > 0 ? atualizacoes.join("\n") : "(nenhuma atualização registrada)",
    "",
  ].join("\n");
}

/** Nome do arquivo que a pessoa vai anexar. A data ajuda a não sobrescrever. */
export function nomeDoArquivo(d: Diagnostico): string {
  const dia = d.geradoEm.toLocaleDateString("sv-SE");
  const hora = d.geradoEm.toLocaleTimeString("pt-BR", { hour12: false }).replace(/:/g, "");
  return `diagnostico-sakura-${dia}-${hora}.zip`;
}
