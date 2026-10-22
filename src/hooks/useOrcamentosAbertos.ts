import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { contarOrcamentosAbertosDaLoja } from "@/lib/ordensServico";
import { isSupabaseConfigured } from "@/lib/supabase";

const EVENTO = "sakura:orcamentos-mudaram";

/** A lista de orçamentos avisa o menu que o número pode ter mudado. */
export function avisarOrcamentosMudaram(): void {
  window.dispatchEvent(new Event(EVENTO));
}

/**
 * O número ao lado de "Orçamentos" no menu (#379): quantos esperam resposta.
 * Pergunta de novo a cada troca de tela e quando a lista de orçamentos avisa.
 * Falhar aqui só tira o número: o menu nunca quebra por causa disso.
 */
export function useOrcamentosAbertos(lojaId: string | undefined, ativo: boolean): number {
  const [quantos, setQuantos] = useState(0);
  const { pathname } = useLocation();
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const aoMudar = () => setVersao((v) => v + 1);
    window.addEventListener(EVENTO, aoMudar);
    return () => window.removeEventListener(EVENTO, aoMudar);
  }, []);

  useEffect(() => {
    if (!ativo || !lojaId || !isSupabaseConfigured) {
      setQuantos(0);
      return;
    }
    let cancelado = false;
    contarOrcamentosAbertosDaLoja(lojaId)
      .then((n) => {
        if (!cancelado) setQuantos(n);
      })
      .catch((err) => console.error("Erro ao contar os orçamentos abertos:", err));
    return () => {
      cancelado = true;
    };
  }, [lojaId, ativo, pathname, versao]);

  return quantos;
}
