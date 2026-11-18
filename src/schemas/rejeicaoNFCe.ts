import type { RespostaFocusNfe } from "@/types/focusNfe";

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
 * a rejeição errada.
 *
 * É aviso, nunca tranca (`docs/licoes.md`, item 33): se o texto mudar e não
 * bater, a janela mostra a rejeição crua como antes, e nada piora.
 */
export function ehRejeicaoDeDestinatario(resposta: unknown): boolean {
  if (!resposta || typeof resposta !== "object") return false;
  const r = resposta as Partial<RespostaFocusNfe>;
  if (r.status === "autorizado") return false;
  const texto = normalizar(textosDaResposta(r).join(" "));
  if (!texto.includes("destinatario")) return false;
  return ["nao cadastrado", "invalido", "cpf", "cnpj"].some((palavra) => texto.includes(palavra));
}

/** A frase de balcão no lugar da rejeição crua. */
export function fraseRejeicaoDeDestinatario(tipoPessoa: "fisica" | "juridica" | null | undefined): string {
  if (tipoPessoa === "fisica") {
    return (
      "A SEFAZ não reconheceu o CPF deste cliente. Se der, confira o CPF no cadastro; " +
      "se estiver certo, você pode emitir agora sem identificar o cliente."
    );
  }
  return (
    "A SEFAZ ainda não reconhece o CNPJ deste cliente. Se a empresa dele é nova, isso " +
    "costuma levar alguns dias pra aparecer lá, mesmo com o CNPJ certo e ativo na Receita. " +
    "Você pode emitir agora sem identificar o cliente."
  );
}

/** A rejeição como veio da SEFAZ (o "Detalhe da SEFAZ"). */
export function mensagemCruaDaRejeicao(resposta: Partial<RespostaFocusNfe>): string {
  return textosDaResposta(resposta).join(" | ") || `A nota voltou com status "${resposta.status ?? "?"}".`;
}

/**
 * O texto do "Copiar o erro", pra mandar no WhatsApp do suporte: a rejeição
 * crua, o código e a `ref` da tentativa, SEM o nome nem o documento do cliente
 * (a SEFAZ costuma repetir o CNPJ na mensagem). Esconde o documento do
 * cadastro, qualquer número com cara de CPF/CNPJ e o nome do cliente.
 */
export function textoParaCopiarOErro(
  resposta: Partial<RespostaFocusNfe>,
  ref: string | null | undefined,
  cliente: { nome?: string | null; cpf_cnpj?: string | null } | null,
): string {
  let mensagem = mensagemCruaDaRejeicao(resposta);

  const documento = (cliente?.cpf_cnpj ?? "").trim();
  if (documento) mensagem = mensagem.split(documento).join("[documento]");
  // CPF (11) e CNPJ (14), com ou sem ponto, barra e traço.
  mensagem = mensagem.replace(
    /\d{2,3}\.?\d{3}\.?\d{3}(?:\/?\d{4})?-?\d{2}/g,
    (trecho) => ([11, 14].includes(trecho.replace(/\D/g, "").length) ? "[documento]" : trecho),
  );
  const nome = (cliente?.nome ?? "").trim();
  if (nome) mensagem = mensagem.replace(new RegExp(escaparRegex(nome), "gi"), "[cliente]");

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
  if (textos.length === 0 && typeof r.mensagem === "string" && r.mensagem.trim()) textos.push(r.mensagem);
  return textos;
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
