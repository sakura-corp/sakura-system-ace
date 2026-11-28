import { useEffect, useRef } from "react";
import { useConexao } from "./useConexao";

/**
 * #1017: a lista que deu erro busca de novo sozinha quando a internet volta.
 * Na loja a internet cai e volta várias vezes por dia, e antes a pessoa
 * tinha que sair e entrar de novo na tela.
 *
 * "A internet voltou" = o `semConexao` do `useConexao()` passar de verdadeiro
 * pra falso (é o mesmo sinal que apaga a faixa do topo, #374). Nessa hora:
 * - se a lista está no erro, chama `recarregar` UMA vez;
 * - se a lista está funcionando, não faz nada (recarregar faria a lista
 *   piscar e podia perder o que a pessoa está fazendo).
 *
 * Não entra em laço: só a MUDANÇA da rede chama. Se a recarga falhar de novo,
 * a lista fica no erro até a próxima volta da internet (ou o "Tentar de
 * novo").
 *
 * É aviso, nunca tranca: sem internet a tela continua como estava.
 */
export function useRecarregarQuandoVoltar(noErro: boolean, recarregar: () => void): void {
  const { semConexao } = useConexao();

  // Lidos na hora em que a rede muda: a tela recria a função a cada desenho,
  // e "estou no erro?" muda sem a rede mudar.
  const noErroRef = useRef(noErro);
  const recarregarRef = useRef(recarregar);
  useEffect(() => {
    noErroRef.current = noErro;
    recarregarRef.current = recarregar;
  });

  const estavaSemConexao = useRef(semConexao);
  useEffect(() => {
    const voltou = estavaSemConexao.current && !semConexao;
    estavaSemConexao.current = semConexao;
    if (voltou && noErroRef.current) recarregarRef.current();
  }, [semConexao]);
}
