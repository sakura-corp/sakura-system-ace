/**
 * WhatsApp: normalizar o telefone e montar o texto da mensagem.
 *
 * Tudo aqui é função pura — o que abre a conversa de verdade fica em
 * `src/lib/whatsapp.ts`, porque depende do Electron.
 *
 * Por que o sistema manda mensagem pelo WhatsApp: é o canal por onde essa
 * operação já funciona. O pai dela manda foto de nota por lá, ela fala com a
 * contabilidade e com o suporte por lá, e a senha temporária de um operador é
 * repassada por lá. O sistema era a única parte do fluxo que ignorava isso —
 * quem precisava cobrar um cliente copiava valor e data na mão, de uma tela
 * pra outra, todo dia.
 */

import { z } from "zod";
import { DIAS_DE_CONTAS_VENCENDO } from "@/types/configuracao";
import type { ContaPagar } from "@/types/contaPagar";
import type { MovimentoCaixa } from "@/types/caixa";
import type { ModuloChave } from "@/types/operador";
import { formatarMoeda } from "./dinheiro";
import { situacaoDaDiferenca } from "./fechamentoCaixa";
import type { CustoDaOrdem } from "./metricasCaixa";
import {
  contasVencendoAte,
  ehOsAberta,
  janelaDoDia,
  janelaDoMesAteODia,
  metricasDoPeriodo,
  moduloQueFaltaAoCartao,
  mostraBlocosDeOS,
} from "./painelInicio";

export type ChaveModeloWhatsapp =
  | "cobranca"
  | "carro_pronto"
  | "pedido_compra"
  | "cliente_sumido"
  | "orcamento"
  | "avaliacao"
  | "resumo_dono";

export interface ModeloWhatsapp {
  chave: ChaveModeloWhatsapp;
  titulo: string;
  /** Pra que serve e onde o botão aparece — mostrado em Configurações. */
  descricao: string;
  /** Quais marcadores aquele modelo entende. */
  marcadores: string[];
  padrao: string;
}

/**
 * Os textos padrão. Ficam aqui, e não no banco, pra que uma loja
 * recém-instalada já consiga mandar mensagem sem configurar nada — a
 * migration 0052 não semeia linha nenhuma de propósito. Quem quiser falar de
 * outro jeito edita em Configurações, e aí a linha passa a existir.
 *
 * O tom é o de quem manda mensagem no balcão: curto, sem "prezado cliente".
 * É a mesma regra que vale pra qualquer texto deste projeto que sai pro
 * mundo: curto, informal e completo.
 */
export const MODELOS_WHATSAPP: ModeloWhatsapp[] = [
  {
    chave: "cobranca",
    titulo: "Cobrança de conta a receber",
    descricao:
      "Aparece no botão de WhatsApp de cada conta pendente, em Contas a Receber. Serve pra lembrar o cliente de um valor combinado.",
    marcadores: ["{cliente}", "{valor}", "{vencimento}", "{descricao}", "{loja}", "{pix}"],
    padrao:
      "Oi {cliente}, tudo bem? Aqui é da {loja}.\n" +
      "Passando pra lembrar do valor de {valor} referente a {descricao}, com vencimento em {vencimento}.\n" +
      "Qualquer coisa é só chamar por aqui!\n" +
      "{pix}",
  },
  {
    chave: "carro_pronto",
    titulo: "Seu carro está pronto",
    descricao:
      "Aparece na ordem de serviço concluída ou faturada. Avisa o cliente que o veículo pode ser retirado.",
    marcadores: ["{cliente}", "{veiculo}", "{placa}", "{valor}", "{os}", "{loja}"],
    padrao:
      "Oi {cliente}, tudo bem? Aqui é da {loja}.\n" +
      "Seu {veiculo} ({placa}) já está pronto pra retirar.\n" +
      "O total do serviço ficou em {valor} ({os}).\n" +
      "Estamos te esperando!",
  },
  {
    chave: "pedido_compra",
    titulo: "Pedido de compra para o fornecedor",
    descricao:
      "Aparece em Fornecedores → Pedidos de compra. Manda a lista de itens do pedido pro fornecedor.",
    marcadores: ["{fornecedor}", "{pedido}", "{itens}", "{loja}"],
    padrao:
      "Olá! Aqui é da {loja}.\n" +
      "Segue nosso {pedido}:\n" +
      "{itens}\n" +
      "Consegue confirmar disponibilidade e prazo?",
  },
  {
    chave: "cliente_sumido",
    titulo: "Cliente que sumiu",
    descricao:
      "Aparece em Clientes, no filtro de quem não vem há meses. Chama de volta quem já comprou e parou de aparecer.",
    marcadores: ["{cliente}", "{loja}", "{veiculo}"],
    // Texto aprovado pela Sofia em 17/10/2026 (tarefa #455).
    padrao:
      "Oi {cliente}, tudo bem? Aqui é da {loja}.\n" +
      "Faz um tempinho que você não passa por aqui. Que tal dar uma olhada no {veiculo}? " +
      "É só responder que a gente marca um horário.",
  },
  {
    chave: "orcamento",
    titulo: "Orçamento",
    descricao:
      "Aparece no orçamento aberto. Manda o orçamento pro cliente aprovar, com o total e até quando vale.",
    marcadores: ["{cliente}", "{numero}", "{loja}", "{veiculo}", "{valor}", "{validade}"],
    // Texto aprovado na tarefa #379.
    padrao:
      "Olá, {cliente}! Segue o orçamento {numero} da {loja} para o {veiculo}: {valor}. " +
      "Vale até {validade}.\n" +
      "Qualquer dúvida, é só responder aqui.",
  },
  {
    chave: "avaliacao",
    titulo: "Pedir avaliação no Google",
    descricao:
      "Aparece na ordem de serviço faturada e na venda de balcão faturada, no botão Avaliação, e só quando a loja tem o link de avaliação configurado (campo acima). Pede ao cliente que deixe a avaliação no Google; um clique por cliente, nada é enviado sozinho.",
    marcadores: ["{cliente}", "{loja}", "{link_avaliacao}"],
    // Texto aprovado pela Sofia em 22/10/2026 (tarefa #459).
    padrao:
      "Oi, {cliente}! Obrigado por escolher a {loja}. " +
      "Se puder, deixa sua avaliação no Google, ajuda muito a gente: {link_avaliacao}",
  },
  {
    chave: "resumo_dono",
    titulo: "Resumo pro dono",
    descricao:
      "Aparece no Início (Hoje ou Este mês) e no Fechamento do caixa, depois de fechar. Abre o WhatsApp com os números do dia ou do mês, e quem escolhe o contato e manda é você. Linha que quem aperta o botão não pode ver sai do texto inteira.",
    marcadores: [
      "{loja}",
      "{periodo}",
      "{vendas}",
      "{lucro}",
      "{ticket}",
      "{os_abertas}",
      "{contas_vencendo}",
      "{diferenca_caixa}",
    ],
    // Tarefa #397. Cada número numa linha própria: é a linha inteira que sai
    // quando a pessoa não pode ver aquele número.
    padrao:
      "Resumo da {loja}, {periodo}:\n" +
      "Recebido: {vendas}\n" +
      "Lucro: {lucro}\n" +
      "Ticket médio: {ticket}\n" +
      "OS abertas: {os_abertas}\n" +
      `Contas a pagar vencidas ou vencendo em até ${DIAS_DE_CONTAS_VENCENDO} dias: {contas_vencendo}\n` +
      "Fechamento do caixa: {diferenca_caixa}",
  },
];

export function modeloPorChave(chave: ChaveModeloWhatsapp): ModeloWhatsapp {
  const modelo = MODELOS_WHATSAPP.find((m) => m.chave === chave);
  if (!modelo) throw new Error(`Modelo de WhatsApp desconhecido: ${chave}`);
  return modelo;
}

/**
 * Troca os marcadores pelo valor de verdade. Mesmo padrão do texto de
 * garantia (`lib/garantiaTexto.ts`): `{cliente}`, `{valor}` e companhia.
 *
 * Marcador sem valor vira "—" em vez de sumir ou virar "undefined": uma
 * lacuna visível é melhor que uma frase que perdeu o sentido no meio.
 */
export function preencherModelo(
  template: string,
  valores: Record<string, string | null | undefined>,
): string {
  let texto = template;
  for (const [marcador, valor] of Object.entries(valores)) {
    // O {pix} é a exceção (#456): sem chave Pix configurada ele não vira "—",
    // ele some junto com a quebra de linha que sobraria, e o texto sai igual
    // ao de antes do Pix. Tratado depois do laço.
    if (marcador === "pix") continue;
    // Troca por função, e não por texto: num texto de troca, "$&" e "$$" são
    // padrões especiais, e um link digitado pela loja (#459) sairia alterado.
    const troca = valor?.trim() ? valor : "—";
    texto = texto.replaceAll(`{${marcador}}`, () => troca);
  }
  const pix = valores.pix?.trim() ? valores.pix : "";
  if (pix) {
    // Função no lugar de texto: o código do Pix não pode ser lido como "$&".
    texto = texto.replaceAll("{pix}", () => pix);
  } else {
    // Linha que só tem o {pix}: sai a linha inteira. {pix} no meio de uma
    // linha: sai só ele (e os espaços em volta, deixando um entre as palavras).
    texto = texto
      .replace(/\r?\n[ \t]*\{pix\}[ \t]*(?=\r?\n|$)/g, "")
      .replace(/^[ \t]*\{pix\}[ \t]*(?:\r?\n|$)/, "")
      .replace(/[ \t]*\{pix\}[ \t]*/g, (trecho, posicao: number, tudo: string) => {
        const antes = tudo[posicao - 1];
        const depois = tudo[posicao + trecho.length];
        const temTextoDosDoisLados =
          antes !== undefined && antes !== "\n" && depois !== undefined && depois !== "\n" && depois !== "\r";
        return temTextoDosDoisLados ? " " : "";
      });
  }
  return texto;
}

/**
 * O bloco que entra no lugar do {pix} da cobrança. Sem código (a loja não
 * configurou o Pix, ou não deu pra montar) devolve "", e o marcador some.
 */
export function blocoPix(codigo: string | null | undefined): string {
  if (!codigo) return "";
  return `Se preferir, pague pelo Pix copia e cola (já com o valor):\n${codigo}`;
}

/**
 * Telefone no formato que o `wa.me` espera: só dígitos, com o 55 do Brasil na
 * frente. Devolve `null` quando não dá pra afirmar qual é o número — abrir
 * uma conversa com o número errado é pior que avisar que o cadastro está
 * incompleto.
 *
 * Os casos tratados são os que aparecem de verdade num cadastro de loja:
 *  - "(16) 99123-4567"  → 5516991234567
 *  - "16991234567"      → 5516991234567
 *  - "5516991234567"    → já vem com DDI, fica como está
 *  - "1691234567"       → celular antigo, sem o nono dígito (ver abaixo)
 *  - "99123-4567"       → sem DDD: não dá pra adivinhar a cidade, vira null
 *
 * O nono dígito: desde 2016 todo celular do Brasil tem 9 dígitos. Um número
 * com DDD + 8 dígitos começando em 6, 7, 8 ou 9 é um celular cadastrado
 * antes disso, e o certo é acrescentar o 9. Número fixo (começa em 2, 3, 4 ou
 * 5) fica como está — o WhatsApp Business existe em fixo, e inventar um nono
 * dígito ali criaria um número que não existe.
 */
export function telefoneParaWhatsapp(telefone: string | null | undefined): string | null {
  let digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos === "") return null;

  // Alguns cadastros trazem o zero do DDD ("016 99123-4567").
  if (digitos.length === 11 && digitos.startsWith("0")) digitos = digitos.slice(1);
  if (digitos.length === 12 && digitos.startsWith("0")) digitos = digitos.slice(1);

  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    digitos = digitos.slice(2);
  }

  if (digitos.length === 10 && /^[6-9]/.test(digitos.slice(2))) {
    digitos = `${digitos.slice(0, 2)}9${digitos.slice(2)}`;
  }

  if (digitos.length !== 10 && digitos.length !== 11) return null;
  // DDD do Brasil vai de 11 a 99; nenhum começa com 0 ou 1 depois do 1.
  const ddd = Number(digitos.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;

  return `55${digitos}`;
}

/**
 * A URL final. Montada aqui pra ser testável, mas quem abre confere de novo
 * que é `https://wa.me/` antes de entregar pro sistema operacional — URL
 * montada com dado do banco é exatamente o caso que o checklist de segurança
 * do Electron alerta (item 15).
 */
export function montarUrlWhatsapp(telefoneNormalizado: string | null, texto: string): string {
  // Sem número (#397, o resumo pro dono): `https://wa.me/?text=…` abre o
  // WhatsApp pedindo pra pessoa escolher o contato. O processo principal só
  // confere o endereço (https e wa.me), então este passa igual.
  return `https://wa.me/${telefoneNormalizado ?? ""}?text=${encodeURIComponent(texto)}`;
}

/**
 * O link de avaliação no Google da loja (tarefa #459). Vazio é permitido e
 * quer dizer "apagar o link" (sem link, o botão Avaliação não aparece).
 * Preenchido precisa começar com https:// e não ter espaço — o banco tem a
 * mesma trava (migration 0082), e aqui a mensagem chega antes do erro dele.
 */
export const linkAvaliacaoSchema = z.object({
  link: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), {
      message: "O link precisa começar com https://",
    }),
});

export type LinkAvaliacaoFormValores = z.infer<typeof linkAvaliacaoSchema>;

/** O texto do pedido de avaliação, a partir do modelo da loja (ou do padrão). */
export function montarTextoAvaliacao(dados: {
  cliente: string | null | undefined;
  loja: string | null | undefined;
  link: string;
  modelo?: string;
}): string {
  return preencherModelo(dados.modelo ?? modeloPorChave("avaliacao").padrao, {
    cliente: dados.cliente,
    loja: dados.loja,
    link_avaliacao: dados.link,
  });
}

// ---------------------------------------------------------------------------
// Resumo pro dono (#397)
// ---------------------------------------------------------------------------

/**
 * Os números do resumo. `null` quer dizer "a pessoa não pode ver este número"
 * (ou ele não existe nesse resumo, como a diferença do caixa fora do
 * fechamento): a linha dele SAI do texto. Nunca vira R$ 0,00, pela mesma
 * razão dos cartões do Início (`MODULOS_DO_CARTAO`): zero linha somada é um
 * número com cara de verdade pra quem só não tem acesso.
 */
export interface NumerosResumoDono {
  vendas: number | null;
  lucro: number | null;
  ticket: number | null;
  osAbertas: number | null;
  contasVencendo: number | null;
  diferencaCaixa: number | null;
}

export type PeriodoResumoDono = "dia" | "mes";

/**
 * Junta os números do resumo SEM conta nova: cada um vem da mesma função que
 * o Início e o Caixa usam (`metricasDoPeriodo`, `contasVencendoAte`,
 * `ehOsAberta` e, no fechamento, `diferencaDoFechamento` já calculada por
 * quem chama). Se um dia o cartão mudar, o resumo muda junto.
 *
 * @param referencia o dia do resumo (no fechamento, o dia que foi fechado)
 * @param hoje       o dia de agora: as contas vencendo olham daqui pra frente
 */
export function numerosDoResumoDono(entrada: {
  periodo: PeriodoResumoDono;
  referencia: Date;
  hoje: Date;
  movimentos: readonly MovimentoCaixa[];
  custoDaOrdem: CustoDaOrdem;
  ordens: readonly { status: string }[];
  contas: ContaPagar[];
  podeVer: (modulo: ModuloChave) => boolean;
  diferencaCaixa?: number | null;
}): NumerosResumoDono {
  const janela =
    entrada.periodo === "mes" ? janelaDoMesAteODia(entrada.referencia) : janelaDoDia(entrada.referencia);
  const metricas = metricasDoPeriodo([...entrada.movimentos], janela, entrada.custoDaOrdem);
  const ve = (cartao: Parameters<typeof moduloQueFaltaAoCartao>[0]) =>
    moduloQueFaltaAoCartao(cartao, entrada.podeVer) === null;

  return {
    vendas: ve("vendas_mes") ? metricas.vendas : null,
    lucro: ve("lucro_mes") ? metricas.lucro : null,
    ticket: ve("ticket_medio_mes") ? metricas.ticketMedio : null,
    osAbertas: mostraBlocosDeOS(entrada.podeVer) ? entrada.ordens.filter(ehOsAberta).length : null,
    contasVencendo: ve("contas_pagar_vencendo") ? contasVencendoAte(entrada.contas, entrada.hoje) : null,
    diferencaCaixa: entrada.diferencaCaixa ?? null,
  };
}

function dataBr(data: Date, comAno = true): string {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return comAno ? `${dia}/${mes}/${data.getFullYear()}` : `${dia}/${mes}`;
}

function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** O que entra no {periodo}: "hoje (11/11/2026)", "este mês (01/11 a 11/11/2026)" ou "dia 10/11/2026". */
export function periodoDoResumo(periodo: PeriodoResumoDono, referencia: Date, hoje: Date): string {
  if (periodo === "mes") {
    const inicio = janelaDoMesAteODia(referencia).inicio;
    return `este mês (${dataBr(inicio, false)} a ${dataBr(referencia)})`;
  }
  return mesmoDia(referencia, hoje) ? `hoje (${dataBr(referencia)})` : `dia ${dataBr(referencia)}`;
}

/** A diferença do fechamento em palavras, com o sinal certo. */
function textoDaDiferenca(diferenca: number): string {
  const situacao = situacaoDaDiferenca(diferenca);
  if (situacao === "bateu") return "bateu certinho";
  return `${situacao === "faltou" ? "faltaram" : "sobraram"} ${formatarMoeda(Math.abs(diferenca))}`;
}

/**
 * O texto do resumo, a partir do modelo da loja (ou do padrão).
 *
 * Linha que tem um marcador cujo número é `null` sai INTEIRA, inclusive num
 * modelo editado pela loja (se ela puser dois números na mesma linha e um
 * deles for escondido, a linha toda sai: é o jeito de nunca mostrar meia
 * informação nem um "—" que pareça erro).
 */
export function textoResumoDono(dados: {
  loja: string | null | undefined;
  periodo: string;
  numeros: NumerosResumoDono;
  modelo?: string;
}): string {
  const { numeros } = dados;
  const valores: Record<string, string | null> = {
    vendas: numeros.vendas === null ? null : formatarMoeda(numeros.vendas),
    lucro: numeros.lucro === null ? null : formatarMoeda(numeros.lucro),
    ticket: numeros.ticket === null ? null : formatarMoeda(numeros.ticket),
    os_abertas: numeros.osAbertas === null ? null : String(numeros.osAbertas),
    contas_vencendo: numeros.contasVencendo === null ? null : formatarMoeda(numeros.contasVencendo),
    diferenca_caixa: numeros.diferencaCaixa === null ? null : textoDaDiferenca(numeros.diferencaCaixa),
  };
  const escondidos = Object.entries(valores)
    .filter(([, valor]) => valor === null)
    .map(([marcador]) => `{${marcador}}`);

  const modelo = dados.modelo ?? modeloPorChave("resumo_dono").padrao;
  const linhas = modelo.split(/\r?\n/).filter((linha) => !escondidos.some((m) => linha.includes(m)));

  return preencherModelo(linhas.join("\n"), {
    loja: dados.loja,
    periodo: dados.periodo,
    ...valores,
  });
}
