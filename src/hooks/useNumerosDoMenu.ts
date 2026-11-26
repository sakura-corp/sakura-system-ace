import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { buscarNumerosDoMenu, type ModulosDoMenu, type NumerosDoMenu } from "@/lib/numerosDoMenu";

const EVENTO = "sakura:orcamentos-mudaram";

/** A lista de orçamentos avisa o menu que os números podem ter mudado. */
export function avisarOrcamentosMudaram(): void {
  window.dispatchEvent(new Event(EVENTO));
}

const SEM_NUMEROS: NumerosDoMenu = {};

/**
 * Os números ao lado de Orçamentos, Ordens de Serviço, Contas a Pagar e
 * Contas a Receber no menu (#1092; o de Orçamentos nasceu na #379). Pergunta de
 * novo a cada troca de tela e quando a lista de orçamentos avisa. Falhar aqui só
 * tira o número: o menu nunca quebra por causa disso.
 */
export function useNumerosDoMenu(lojaId: string | undefined, modulos: ModulosDoMenu): NumerosDoMenu {
  const [numeros, setNumeros] = useState<NumerosDoMenu>(SEM_NUMEROS);
  const { pathname } = useLocation();
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const aoMudar = () => setVersao((v) => v + 1);
    window.addEventListener(EVENTO, aoMudar);
    return () => window.removeEventListener(EVENTO, aoMudar);
  }, []);

  const { ordens_servico, contas_pagar, contas_receber } = modulos;
  useEffect(() => {
    if (!lojaId || (!ordens_servico && !contas_pagar && !contas_receber)) {
      setNumeros(SEM_NUMEROS);
      return;
    }
    let cancelado = false;
    buscarNumerosDoMenu(lojaId, { ordens_servico, contas_pagar, contas_receber })
      .then((n) => {
        if (!cancelado) setNumeros(n);
      })
      .catch((err) => console.error("Erro ao buscar os números do menu:", err));
    return () => {
      cancelado = true;
    };
  }, [lojaId, ordens_servico, contas_pagar, contas_receber, pathname, versao]);

  return numeros;
}
