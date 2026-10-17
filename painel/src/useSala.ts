import { useCallback, useEffect, useRef, useState } from "react";
import { carregarSala, type EstadoDaSala } from "./logica/salaDados";

/**
 * A sala de verdade (#468), buscada no worker. `ativo` = false não busca nada.
 * Devolve o estado, o "tentar de novo" da primeira carga (mostra o esqueleto) e a busca sem piscar
 * do tempo real: só troca a tela se deu certo (ou se a sessão acabou); erro não apaga o que já está
 * na tela, e quem avisa que ficou velho é o `estado` do tempo real.
 */
export function useSala(ativo: boolean): [EstadoDaSala, () => void, () => Promise<boolean>] {
  const [estado, setEstado] = useState<EstadoDaSala>({ tipo: "carregando" });
  const [tentativa, setTentativa] = useState(0);
  const carregando = useRef(true);
  carregando.current = estado.tipo === "carregando";

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    setEstado({ tipo: "carregando" });
    void carregarSala().then((novo) => {
      if (vivo) setEstado(novo);
    });
    return () => {
      vivo = false;
    };
  }, [ativo, tentativa]);

  const recarregar = useCallback(async () => {
    // A primeira carga ainda está rodando: duas buscas juntas com o token vencido renovariam duas vezes,
    // e cada `refresh` do GitHub vale uma vez só (docs/painel.md, #353).
    if (carregando.current) return false;
    const novo = await carregarSala();
    if (novo.tipo === "pronto") {
      setEstado(novo);
      return true;
    }
    if (novo.tipo === "fora") setEstado(novo);
    return false;
  }, []);
  return [estado, () => setTentativa((n) => n + 1), recarregar];
}
