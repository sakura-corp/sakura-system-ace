/**
 * Acima de um valor por estado, a SEFAZ exige que a NFC-e tenha o cliente
 * identificado (CPF ou CNPJ). O valor veio do suporte da Focus NFe (03/09/2026)
 * e vale pra maioria das UFs; por enquanto é o mesmo pra todas. Ao instalar
 * loja de outro estado, conferir o da UF dela (`docs/pendencias-e-futuro.md`,
 * "O que ainda está frágil na parte fiscal", item 1).
 */
export const LIMITE_NFCE_SEM_DESTINATARIO = 10000;

/**
 * O aviso da tela de emissão quando a NFC-e chega no limite e vai sair sem o
 * cliente identificado, ou `null` quando não há o que avisar.
 *
 * É aviso, nunca tranca (`docs/licoes.md`, item 33): o valor pode mudar por
 * estado e por legislação, e quem decide é a SEFAZ.
 *
 * `vaiIdentificado` vem de `destinatarioIdentificadoNFCe()` (`src/lib/focusNfe.ts`),
 * a mesma regra que monta o destinatário da nota — não repetir a regra aqui.
 */
export function avisoLimiteNFCeSemDestinatario(
  total: number,
  vaiIdentificado: boolean,
): string | null {
  if (vaiIdentificado) return null;
  // Em centavos, pra uma soma de itens como 9999.999999 não escapar do "no limite".
  if (Math.round(total * 100) < LIMITE_NFCE_SEM_DESTINATARIO * 100) return null;
  return (
    `Esta nota passa de R$ ${LIMITE_NFCE_SEM_DESTINATARIO.toLocaleString("pt-BR")} e vai sair` +
    " sem CPF/CNPJ do cliente. Acima desse valor a " +
    "SEFAZ costuma exigir o cliente identificado: cadastre o documento dele antes de emitir."
  );
}
