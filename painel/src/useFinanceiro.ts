import { useCallback, useEffect, useRef, useState } from "react";
import { carregarFinanceiro, type EstadoDoFinanceiro } from "./logica/financeiroDados";

/**
 * O Financeiro de verdade (#654), buscado no worker. `ativo` = false não busca nada. Muda o `mes`, busca de novo.
 * Devolve o estado, o "tentar de novo" (mostra o esqueleto) e a busca sem piscar, pra depois de lançar, editar ou apagar:
 * só troca a tela se deu certo (ou se a sessão acabou); erro não apaga o que já está na tela.
 */
export function useFinanceiro(ativo: boolean, mes: string): [EstadoDoFinanceiro, () => void, () => Promise<boolean>] {
  const [estado, setEstado] = useState<EstadoDoFinanceiro>({ tipo: "carregando" });
  const [tentativa, setTentativa] = useState(0);
  const chave = useRef("");
  chave.current = mes;
  const carregando = useRef(true);
  carregando.current = estado.tipo === "carregando";

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    setEstado({ tipo: "carregando" });
    void carregarFinanceiro(mes).then((novo) => {
      if (vivo) setEstado(novo);
    });
    return () => {
      vivo = false;
    };
  }, [ativo, mes, tentativa]);

  const recarregar = useCallback(async () => {
    // A primeira carga ainda está rodando: duas buscas juntas com o token vencido renovariam duas vezes (ver useSala).
    if (carregando.current) return false;
    const pedido = mes;
    const novo = await carregarFinanceiro(mes);
    if (pedido !== chave.current) return false;
    if (novo.tipo === "pronto") {
      setEstado(novo);
      return true;
    }
    if (novo.tipo === "fora") setEstado(novo);
    return false;
  }, [mes]);
  return [estado, () => setTentativa((n) => n + 1), recarregar];
}
