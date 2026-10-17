import { useCallback, useEffect, useRef, useState } from "react";
import { avisoDaSala, criarTempoReal, type ConexaoLike, type SituacaoDoTempoReal, type TempoReal } from "./logica/tempoReal";

const enderecoDaSala = () => `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/tempo-real`;

/**
 * O tempo real do painel (#355): conecta na sala do worker e, a cada aviso de tarefa, chama `buscar`
 * de novo. Devolve o `estado` (ao vivo, reconectando, desatualizado) e a hora da última busca que deu
 * certo (`ultimaAtualizacao`, em ms), que a Sala (#468) mostra na linha do topo. As regras estão em
 * `logica/tempoReal.ts`; aqui só a ligação com o React e com o navegador.
 *
 * - `buscar`: busca de novo, sem piscar a tela; `true` = deu certo.
 * - `carregou`: a primeira busca (a da página) já deu certo; conta como "atualizado".
 */
export function useTempoReal({
  ativo,
  buscar,
  carregou,
  sala = false,
}: {
  ativo: boolean;
  buscar: () => Promise<boolean>;
  carregou: boolean;
  /** A Sala (#468) também escuta os avisos de robô e de branch. */
  sala?: boolean;
}): SituacaoDoTempoReal & { atualizar: () => Promise<void> } {
  const [situacao, setSituacao] = useState<SituacaoDoTempoReal>({ estado: "reconectando", ultimaAtualizacao: null });
  const buscarRef = useRef(buscar);
  const controle = useRef<TempoReal | null>(null);
  useEffect(() => {
    buscarRef.current = buscar;
  });

  useEffect(() => {
    if (!ativo) return;
    const tempoReal = criarTempoReal({
      abrir: () => new WebSocket(enderecoDaSala()) as unknown as ConexaoLike,
      buscar: () => buscarRef.current(),
      ...(sala ? { aviso: avisoDaSala } : {}),
      aoMudar: setSituacao,
    });
    controle.current = tempoReal;
    tempoReal.iniciar();
    const aoVoltar = () => {
      if (document.visibilityState === "visible") tempoReal.voltouAoFoco();
    };
    window.addEventListener("focus", aoVoltar);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.removeEventListener("focus", aoVoltar);
      document.removeEventListener("visibilitychange", aoVoltar);
      tempoReal.parar();
      controle.current = null;
    };
  }, [ativo, sala]);

  useEffect(() => {
    if (carregou) controle.current?.buscaFeita();
  }, [carregou, ativo]);

  const atualizar = useCallback(async () => {
    await controle.current?.atualizar();
  }, []);

  return { ...situacao, atualizar };
}
