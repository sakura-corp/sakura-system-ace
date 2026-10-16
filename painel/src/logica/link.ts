/** Link só se for do GitHub da sakura-corp (regra da Sala, #467). Qualquer outro endereço vira texto sem link. */
export function linkSeguro(url: string | undefined): string | undefined {
  return url !== undefined && url.startsWith("https://github.com/sakura-corp/") ? url : undefined;
}
