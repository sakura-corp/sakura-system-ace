import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { buscarNumerosDoMenu, type ModulosDoMenu, type NumerosDoMenu } from "@/lib/numerosDoMenu";
import { aoGravarNoBanco } from "@/lib/supabase";

const EVENTO = "sakura:orcamentos-mudaram";

/** A lista de orçamentos avisa o menu que os números podem ter mudado. */
export function avisarOrcamentosMudaram(): void {
  window.dispatchEvent(new Event(EVENTO));
}

/**
 * Quanto esperar depois de uma gravação antes de buscar de novo: faturar ou
 * pagar grava mais de uma vez em seguida, e isso vira uma busca só.
 */
export const ESPERA_DEPOIS_DE_GRAVAR_MS = 400;

const SEM_NUMEROS: NumerosDoMenu = {};

/**
 * Os números ao lado de Orçamentos, Ordens de Serviço, Contas a Pagar e
 * Contas a Receber no menu (#1092; o de Orçamentos nasceu na #379). Pergunta de
 * novo a cada troca de tela, quando a lista de orçamentos avisa e logo depois
 * de qualquer gravação no banco (pagar, receber, concluir, faturar), pra o
 * número não ficar velho na própria tela. Falhar aqui só tira o número: o menu
 * nunca quebra por causa disso.
 */
export function useNumerosDoMenu(lojaId: string | undefined, modulos: ModulosDoMenu): NumerosDoMenu {
  // Guarda de qual loja os números vieram: trocou de loja, os da anterior
  // somem na hora, sem esperar a resposta da nova.
  const [guardado, setGuardado] = useState<{ lojaId: string; numeros: NumerosDoMenu } | null>(null);
  const { pathname } = useLocation();
  const [versao, setVersao] = useState(0);

  const { ordens_servico, contas_pagar, contas_receber } = modulos;
  const algum = ordens_servico || contas_pagar || contas_receber;

  useEffect(() => {
    const aoMudar = () => setVersao((v) => v + 1);
    window.addEventListener(EVENTO, aoMudar);
    return () => window.removeEventListener(EVENTO, aoMudar);
  }, []);

  useEffect(() => {
    if (!algum) return;
    let relogio: ReturnType<typeof setTimeout> | undefined;
    const cancelar = aoGravarNoBanco(() => {
      clearTimeout(relogio);
      relogio = setTimeout(() => setVersao((v) => v + 1), ESPERA_DEPOIS_DE_GRAVAR_MS);
    });
    return () => {
      clearTimeout(relogio);
      cancelar();
    };
  }, [algum]);

  useEffect(() => {
    if (!lojaId || !algum) {
      setGuardado(null);
      return;
    }
    let cancelado = false;
    buscarNumerosDoMenu(lojaId, { ordens_servico, contas_pagar, contas_receber })
      .then((numeros) => {
        if (!cancelado) setGuardado({ lojaId, numeros });
      })
      .catch((err) => console.error("Erro ao buscar os números do menu:", err));
    return () => {
      cancelado = true;
    };
  }, [lojaId, algum, ordens_servico, contas_pagar, contas_receber, pathname, versao]);

  return lojaId && algum && guardado?.lojaId === lojaId ? guardado.numeros : SEM_NUMEROS;
}
