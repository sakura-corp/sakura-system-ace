// Plano B do botão "Começar com o Claude": no app do celular o link pode abrir o Claude sem a mensagem
// (docs/painel.md, "Andamento"). "Copiar texto" copia o MESMO texto que o link leva.

/** `copiado`: foi pra área de transferência. `plano-b`: não deu; a tela mostra o texto num campo pra copiar à mão. */
export type ResultadoDaCopia = "copiado" | "plano-b";

type AreaDeTransferencia = { writeText?: (texto: string) => Promise<void> } | undefined;

/** `area` é `navigator.clipboard`; vem de fora só pra o teste poder trocar. API ausente, recusa ou erro → plano B. */
export async function copiarTexto(texto: string, area: AreaDeTransferencia): Promise<ResultadoDaCopia> {
  if (typeof area?.writeText !== "function") return "plano-b";
  try {
    await area.writeText(texto);
    return "copiado";
  } catch {
    return "plano-b";
  }
}
