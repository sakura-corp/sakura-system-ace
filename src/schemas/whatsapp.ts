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

export type ChaveModeloWhatsapp =
  | "cobranca"
  | "carro_pronto"
  | "pedido_compra"
  | "cliente_sumido";

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
    marcadores: ["{cliente}", "{valor}", "{vencimento}", "{descricao}", "{loja}"],
    padrao:
      "Oi {cliente}, tudo bem? Aqui é da {loja}.\n" +
      "Passando pra lembrar do valor de {valor} referente a {descricao}, com vencimento em {vencimento}.\n" +
      "Qualquer coisa é só chamar por aqui!",
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
    texto = texto.replaceAll(`{${marcador}}`, valor?.trim() ? valor : "—");
  }
  return texto;
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
export function montarUrlWhatsapp(telefoneNormalizado: string, texto: string): string {
  return `https://wa.me/${telefoneNormalizado}?text=${encodeURIComponent(texto)}`;
}
