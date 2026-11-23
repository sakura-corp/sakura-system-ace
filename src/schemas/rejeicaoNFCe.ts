import type { RespostaFocusNfe } from "@/types/focusNfe";
import { LIMITE_NFCE_SEM_DESTINATARIO } from "./limiteNFCe";
import { cnpjValido, cpfValido } from "./pix";

/**
 * A SEFAZ recusou a NFC-e por causa do CPF/CNPJ do destinatário (#1112)?
 *
 * Caso de 17/11/2026: cliente pessoa jurídica com CNPJ recém-aberto, ativo na
 * Receita, e a NFC-e voltou "CNPJ [...] do destinatário não cadastrado na
 * Receita Federal" — a base da SEFAZ ainda não tinha o CNPJ novo. O cadastro
 * estava certo; a saída é emitir sem identificar o cliente (na NFC-e a
 * identificação é opcional abaixo do limite da UF).
 *
 * Reconhece pelo TEXTO, sem acento e sem caixa: "destinatario" junto com
 * "nao cadastrado", "invalido", "cpf" ou "cnpj". O código da SEFAZ
 * (`status_sefaz`) dessa rejeição não foi confirmado (nem na documentação da
 * Focus nem na rejeição real), por isso não entra: código chutado reconheceria
 * a rejeição errada. Só vale pra nota recusada (`erro_autorizacao`) ou pro
 * corpo de erro da Focus (sem `status`); nota denegada, cancelada ou ainda
 * processando nunca é esta.
 *
 * Quem chama confere também que a nota FOI com o cliente identificado: sem
 * documento na nota, oferecer "emitir sem identificar" repetiria a recusa.
 *
 * É aviso, nunca tranca (`docs/licoes.md`, item 33): se o texto mudar e não
 * bater, a janela mostra a rejeição crua como antes, e nada piora.
 */
export function ehRejeicaoDeDestinatario(resposta: unknown): boolean {
  if (!resposta || typeof resposta !== "object") return false;
  const r = resposta as Partial<RespostaFocusNfe>;
  if (r.status !== undefined && r.status !== "erro_autorizacao") return false;
  const texto = semAcento(textosDaResposta(r).join(" ")).toLowerCase();
  if (!texto.includes("destinatario")) return false;
  return ["nao cadastrado", "invalido", "cpf", "cnpj"].some((palavra) => texto.includes(palavra));
}

type ClienteDaFrase = { tipo_pessoa?: string | null; cpf_cnpj?: string | null } | null | undefined;

/**
 * A frase de balcão no lugar da rejeição crua. Se o documento do cadastro tem
 * o dígito de conferência errado, o problema É da loja (o cadastro não confere
 * o dígito): manda corrigir, em vez de falar de empresa nova.
 */
export function fraseRejeicaoDeDestinatario(cliente: ClienteDaFrase): string {
  const documento = (cliente?.cpf_cnpj ?? "").replace(/\D/g, "");
  const nomeDoDocumento = cliente?.tipo_pessoa === "fisica" ? "CPF" : "CNPJ";
  const digitoErrado =
    (documento.length === 14 && !cnpjValido(documento)) ||
    (documento.length === 11 && !cpfValido(documento));

  if (digitoErrado) {
    return (
      `O ${nomeDoDocumento} no cadastro deste cliente tem um número errado. Se ele quer a nota no ` +
      "nome dele, corrija em Clientes, feche esta janela e abra de novo. Ou, se preferir, você " +
      "pode emitir agora sem identificar o cliente."
    );
  }
  if (cliente?.tipo_pessoa === "fisica") {
    return (
      "A SEFAZ não reconheceu o CPF deste cliente. Confira o CPF em Clientes: se estiver errado, " +
      "corrija, feche esta janela e abra de novo. Se estiver certo, você pode emitir agora sem " +
      "identificar o cliente."
    );
  }
  return (
    "A SEFAZ ainda não reconhece o CNPJ deste cliente. Se a empresa dele é nova, isso " +
    "costuma levar alguns dias pra aparecer lá, mesmo com o CNPJ certo e ativo na Receita. " +
    "Você pode emitir agora sem identificar o cliente."
  );
}

/**
 * O aviso do limite da UF (#881) pra nota que vai sair sem o cliente DEPOIS
 * da recusa: o documento está cadastrado (foi ele que a SEFAZ recusou), então
 * o "cadastre o documento" do aviso de sempre não serve aqui. Aviso, não tranca.
 */
export function avisoLimiteDepoisDaRecusa(total: number): string | null {
  // Em centavos, como no aviso de sempre (`limiteNFCe.ts`).
  if (Math.round(total * 100) < LIMITE_NFCE_SEM_DESTINATARIO * 100) return null;
  return (
    `Esta nota é de R$ ${LIMITE_NFCE_SEM_DESTINATARIO.toLocaleString("pt-BR")} ou mais: sem o ` +
    "cliente identificado, a SEFAZ também deve recusar. Se recusar, fale com quem cuida do sistema."
  );
}

/** A rejeição como veio da SEFAZ (o "Detalhe da SEFAZ"). */
export function mensagemCruaDaRejeicao(resposta: Partial<RespostaFocusNfe>): string {
  return (
    textosDaResposta(resposta).join(" | ") ||
    `A nota voltou com status "${resposta.status ?? "?"}".`
  );
}

/**
 * O texto do "Copiar o erro", pra mandar no WhatsApp do suporte: a rejeição
 * crua, o código e a `ref` da tentativa, SEM o nome nem o documento do cliente
 * (a SEFAZ costuma repetir o CNPJ na mensagem). Esconde o documento do
 * cadastro, qualquer sequência de 11 números ou mais (com ou sem ponto, barra
 * e traço: tem cara de CPF/CNPJ) e o nome do cliente (sem acento e sem caixa).
 */
export function textoParaCopiarOErro(
  resposta: Partial<RespostaFocusNfe>,
  ref: string | null | undefined,
  cliente: { nome?: string | null; cpf_cnpj?: string | null } | null,
): string {
  let mensagem = mensagemCruaDaRejeicao(resposta);

  const documento = (cliente?.cpf_cnpj ?? "").trim();
  if (documento) mensagem = mensagem.split(documento).join("[documento]");
  // Do primeiro ao último número, sem número colado dos lados: um CNPJ só com
  // números não pode ser cortado como se fosse um CPF (sobrariam 3 dígitos).
  mensagem = mensagem.replace(/(?<!\d)\d[\d./-]*\d(?!\d)/g, (trecho) =>
    trecho.replace(/\D/g, "").length >= 11 ? "[documento]" : trecho,
  );
  mensagem = trocarSemAcento(mensagem, (cliente?.nome ?? "").trim(), "[cliente]");

  return [
    "NFC-e recusada pela SEFAZ",
    `Mensagem: ${mensagem}`,
    `Código da SEFAZ: ${resposta.status_sefaz?.trim() || "(não veio)"}`,
    `Referência: ${ref?.trim() || "(não veio)"}`,
  ].join("\n");
}

function textosDaResposta(r: Partial<RespostaFocusNfe>): string[] {
  const textos: string[] = [];
  if (typeof r.mensagem_sefaz === "string" && r.mensagem_sefaz.trim()) textos.push(r.mensagem_sefaz);
  for (const erro of Array.isArray(r.erros) ? r.erros : []) {
    if (typeof erro?.mensagem === "string" && erro.mensagem.trim()) textos.push(erro.mensagem);
  }
  if (textos.length === 0 && typeof r.mensagem === "string" && r.mensagem.trim()) {
    textos.push(r.mensagem);
  }
  return textos;
}

// Letra por letra, pra o texto sem acento ter o mesmo tamanho do original
// (e as posições baterem em `trocarSemAcento`).
function semAcento(texto: string): string {
  return Array.from(texto, (letra) => letra.normalize("NFD").replace(/[̀-ͯ]/g, "") || letra).join("");
}

// Troca toda ocorrência de `procurado` em `texto`, sem olhar acento nem caixa.
function trocarSemAcento(texto: string, procurado: string, troca: string): string {
  if (!procurado) return texto;
  const letras = Array.from(texto);
  const base = Array.from(semAcento(texto).toLowerCase());
  const alvo = Array.from(semAcento(procurado).toLowerCase());
  if (base.length !== letras.length) return texto;
  const saida: string[] = [];
  for (let i = 0; i < letras.length; ) {
    if (alvo.every((letra, j) => base[i + j] === letra)) {
      saida.push(troca);
      i += alvo.length;
    } else {
      saida.push(letras[i]);
      i += 1;
    }
  }
  return saida.join("");
}
