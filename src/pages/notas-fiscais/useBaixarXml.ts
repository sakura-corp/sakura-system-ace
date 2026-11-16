import { useState } from "react";
import { mensagemDeErro } from "@/lib/errors";
import { baixarArquivo } from "@/lib/notasFiscais";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";

/**
 * O "Baixar o XML (pro contador)" das duas janelas da nota (a do PDF e a da
 * Versão para o cliente): baixa o XML guardado e, se der errado, guarda a
 * mensagem pra mostrar do lado do botão.
 */
export function useBaixarXml(arquivo: NotaFiscalArquivo) {
  const [erroXml, setErroXml] = useState("");
  const [baixandoXml, setBaixandoXml] = useState(false);

  async function baixarXml() {
    setErroXml("");
    setBaixandoXml(true);
    try {
      await baixarArquivo(arquivo);
    } catch (err) {
      console.error("Erro ao baixar XML:", err);
      setErroXml(mensagemDeErro(err));
    } finally {
      setBaixandoXml(false);
    }
  }

  return { baixarXml, baixandoXml, erroXml };
}
