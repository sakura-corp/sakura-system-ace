import type { RegimeTributario } from "@/types/configuracao";

// O código de ICMS de um produto muda conforme o regime de quem emite a nota:
// quem é do **Simples Nacional** usa **CSOSN** (3 dígitos), quem é do regime
// normal usa **CST** (2 dígitos). A SEFAZ recusa a nota inteira quando o
// código não bate com o regime — e a mensagem dela ("Informado CST para
// emissor do Simples Nacional (CRT=1 ou 4) [nItem:1]") só diz o número do
// item, nunca o nome da peça: achar qual peça do cadastro está errada vira
// adivinhação no meio de uma OS cheia.
//
// Isso aconteceu de verdade em 09/09/2026, e a peça tinha vindo com o código
// do **fornecedor** (regime normal) copiado direto pro cadastro da loja pela
// importação de XML — ver PROJETO_STATUS.md.

export const CODIGOS_CSOSN = [
  "101",
  "102",
  "103",
  "201",
  "202",
  "203",
  "300",
  "400",
  "500",
  "900",
] as const;

export const CODIGOS_CST_ICMS = [
  "00",
  "10",
  "20",
  "30",
  "40",
  "41",
  "50",
  "51",
  "60",
  "70",
  "90",
] as const;

function normalizar(codigo: string | null | undefined): string {
  return (codigo ?? "").trim();
}

export function regimeUsaCsosn(regime: RegimeTributario | null | undefined): boolean {
  return regime === "simples_nacional";
}

export function ehCsosn(codigo: string | null | undefined): boolean {
  return (CODIGOS_CSOSN as readonly string[]).includes(normalizar(codigo));
}

export function ehCst(codigo: string | null | undefined): boolean {
  return (CODIGOS_CST_ICMS as readonly string[]).includes(normalizar(codigo));
}

/**
 * Por que esse código de ICMS não serve pra essa loja — ou `null` quando está
 * tudo certo. É **aviso, nunca tranca**: a lista de códigos válidos pode
 * envelhecer com mudança de legislação, e travar a emissão por causa de um
 * palpite meu seria pior que deixar a SEFAZ decidir (ver PROJETO_STATUS.md,
 * seção 6, item 33).
 *
 * Sem o regime preenchido em Configurações, devolve `null` de propósito: sem
 * saber o regime não dá pra afirmar nada, e avisar por avisar vira ruído.
 */
export function motivoCodigoIncompativel(
  codigo: string | null | undefined,
  regime: RegimeTributario | null | undefined,
): string | null {
  if (!regime) return null;

  const valor = normalizar(codigo);
  const esperado = regimeUsaCsosn(regime) ? "CSOSN" : "CST";

  if (!valor) return `está sem o código ${esperado} no cadastro`;

  if (regimeUsaCsosn(regime)) {
    if (ehCsosn(valor)) return null;
    if (ehCst(valor)) {
      return `está com o CST ${valor}, que é do regime normal — sua loja é Simples Nacional e usa CSOSN`;
    }
  } else {
    if (ehCst(valor)) return null;
    if (ehCsosn(valor)) {
      return `está com o CSOSN ${valor}, que é do Simples Nacional — sua loja usa CST`;
    }
  }

  return `está com o código "${valor}", que não é um ${esperado} conhecido`;
}

/**
 * O CSOSN que a loja mais usa nas peças que ela mesma já cadastrou. Serve pra
 * pré-preencher a importação em vez de copiar o código do fornecedor: é um
 * palpite tirado do cadastro **dela**, não um código inventado por aqui.
 * Empate desempata pelo primeiro que aparecer.
 */
export function csosnMaisUsado(codigos: (string | null | undefined)[]): string | null {
  const contagem = new Map<string, number>();
  for (const codigo of codigos) {
    const valor = normalizar(codigo);
    if (!ehCsosn(valor)) continue;
    contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
  }

  let maisUsado: string | null = null;
  let maior = 0;
  for (const [valor, vezes] of contagem) {
    if (vezes > maior) {
      maior = vezes;
      maisUsado = valor;
    }
  }
  return maisUsado;
}

/**
 * Qual código gravar numa peça criada por importação. Copiar o código do
 * fornecedor às cegas é o que gerava a nota rejeitada: o fornecedor pode ser
 * do regime normal e mandar CST, que nunca vai servir pra uma loja do Simples.
 * Nesse caso vale o padrão da própria loja (e, sem padrão, campo em branco —
 * melhor pedir pra preencher do que gravar um código que não serve).
 */
export function codigoParaPecaImportada(
  codigoDaNota: string | null | undefined,
  regime: RegimeTributario | null | undefined,
  padraoDaLoja: string | null | undefined,
): string | null {
  const daNota = normalizar(codigoDaNota);
  if (!motivoCodigoIncompativel(daNota, regime)) return daNota || null;
  return normalizar(padraoDaLoja) || null;
}

// O CFOP da peça também precisa combinar com o CSOSN dela. Peça com ICMS já
// pago antes (substituição tributária / monofásico, CSOSN 500) sai com 5405
// dentro do estado e 6404 para outro estado; peça comum (CSOSN 101, 102, 103,
// 300 e 400) sai com 5102 dentro e 6102 fora. Com o par trocado a SEFAZ
// recusa a nota. Provado no ensaio de 04/11/2026 e confirmado pela
// contabilidade em 05/11/2026.
//
// Mudar a regra é mudar só esta tabela. CSOSN fora dela (201, 202, 203, 900)
// fica sem opinião de propósito.
const PECA_COMUM = { dentro: "5102", fora: "6102", peca: "peça comum, sem ICMS pago antes" };

const CFOP_ESPERADO_POR_CSOSN: Record<string, { dentro: string; fora: string; peca: string }> = {
  "101": PECA_COMUM,
  "102": PECA_COMUM,
  "103": PECA_COMUM,
  "300": PECA_COMUM,
  "400": PECA_COMUM,
  "500": { dentro: "5405", fora: "6404", peca: "peça com ICMS já pago antes" },
};

/**
 * Por que esse CFOP não combina com o CSOSN da peça — ou `null` quando está
 * tudo certo ou quando não dá pra afirmar nada. É **aviso, nunca tranca**
 * (docs/licoes.md, item 33): a tabela pode envelhecer com mudança de
 * legislação, e quem decide no fim é a SEFAZ.
 *
 * Só fala no Simples Nacional (no regime normal o código é CST, e a regra é
 * outra). Fica calado com o regime vazio, e com CFOP ou CSOSN em branco —
 * esses já têm aviso próprio. A sugestão é sempre o par de dentro do estado
 * (5102 ou 5405): a NFC-e só aceita CFOP que começa com 5 (Sofia, 09/11/2026,
 * #968). Por isso o par de fora do estado (6102/6404), mesmo combinando com o
 * CSOSN, também ganha aviso.
 */
export function motivoCfopIncompativel(
  cfop: string | null | undefined,
  csosn: string | null | undefined,
  regime: RegimeTributario | null | undefined,
): string | null {
  if (!regimeUsaCsosn(regime)) return null;

  // Só no CFOP: tira o que não é número ("5.405" vira "5405"). O
  // `normalizar()` serve também ao CSOSN/CST e fica como está.
  const valorCfop = normalizar(cfop).replace(/\D/g, "");
  const valorCsosn = normalizar(csosn);
  if (!valorCfop || !valorCsosn) return null;

  const esperado = CFOP_ESPERADO_POR_CSOSN[valorCsosn];
  if (!esperado) return null;
  if (valorCfop === esperado.dentro) return null;
  if (valorCfop === esperado.fora) {
    return `o CFOP ${valorCfop} é de venda para outro estado, e a NFC-e só aceita CFOP de dentro do estado: use ${esperado.dentro}`;
  }

  return `o CFOP ${valorCfop} não combina com o CSOSN ${valorCsosn} (${esperado.peca}); use ${esperado.dentro}`;
}
