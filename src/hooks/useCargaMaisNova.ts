import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Uma carga de dados de uma loja, começada por `comecar()`.
 *
 * - `aindaEhAtual()`: se ela ainda é a carga mais nova da tela. Só a mais nova
 *   mexe na tela (dados, erro e "Carregando...") — confira antes de cada
 *   `set...` e no `finally`.
 * - `gravou()`: chame junto com os `set...` dos dados, quando eles foram pra
 *   tela. Marca que os dados na tela são desta loja (`lojaDosDados`). Numa
 *   carga que já perdeu a vez, não faz nada.
 */
export interface CargaDaLoja {
  lojaId: string;
  aindaEhAtual(): boolean;
  gravou(): void;
}

/**
 * Só a carga mais nova mexe na tela (#927; o mesmo jeito das OS, #903, e de
 * Configurações, #967).
 *
 * O defeito: trocar de loja com a carga anterior ainda buscando dispara
 * outra, e a da loja antiga pode terminar DEPOIS — a pessoa vê a loja B no
 * seletor e a lista da loja A. E um `carregar` guardado de antes da troca (um
 * salvar lento que recarrega no fim) viraria a carga mais nova e gravaria a
 * loja antiga.
 *
 * Como usar (`lojaId` é o `lojaAtual?.id` da tela):
 *
 *     const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaAtual?.id);
 *     async function carregar() {
 *       const carga = comecar(lojaAtual?.id);
 *       if (!carga) { if (!lojaAtual) setCarregando(false); return; }
 *       setCarregando(true); setErro(null);
 *       try {
 *         const dados = await buscar(carga.lojaId);
 *         if (!carga.aindaEhAtual()) return;
 *         setDados(dados); carga.gravou();
 *       } catch (err) {
 *         if (!carga.aindaEhAtual()) return;
 *         setErro(mensagemDeErro(err));
 *       } finally {
 *         if (carga.aindaEhAtual()) setCarregando(false);
 *       }
 *     }
 *
 * `comecar(lojaId)` recebe a loja que o `carregar` enxerga (a do fechamento
 * dele) e devolve `null` quando:
 * - essa loja já não é a da tela (o `carregar` é de antes da troca): nem
 *   começa, e a carga da loja nova continua valendo;
 * - não há loja: aí a carga que ainda busca também deixa de valer.
 *
 * `dadosSaoDaLoja` (a regra nova da #927): se os dados na tela são da loja do
 * seletor. Quando a carga da loja nova dá erro, a tela continua com os dados
 * da anterior guardados no estado — mostre-os só se `dadosSaoDaLoja`. Um
 * recarregar da MESMA loja que dá erro mantém `dadosSaoDaLoja` (os dados são
 * dela).
 *
 * Funciona com efeito em `[lojaAtual?.id]` e com `useCallback` que depende de
 * `lojaAtual` inteira (Painel, Diagnóstico). A loja da tela é atualizada num
 * `useLayoutEffect`, que o React roda antes de TODOS os `useEffect`: a carga
 * da loja nova começa mesmo que o efeito que chama `carregar()` venha antes
 * do gancho (nas OS e em Configurações, com `useEffect`, a ordem importava).
 */
export function useCargaMaisNova(lojaId: string | null | undefined) {
  const cargaAtual = useRef(0);
  const lojaNaTela = useRef(lojaId ?? null);
  const [lojaDosDados, setLojaDosDados] = useState<string | null>(null);

  useLayoutEffect(() => {
    lojaNaTela.current = lojaId ?? null;
  }, [lojaId]);

  const comecar = useCallback((lojaDaCarga: string | null | undefined): CargaDaLoja | null => {
    const loja = lojaDaCarga ?? null;
    if (loja !== lojaNaTela.current) return null;
    const minhaCarga = ++cargaAtual.current;
    if (!loja) return null; // sem loja: só invalida a carga que ainda busca
    const aindaEhAtual = () => minhaCarga === cargaAtual.current;
    return {
      lojaId: loja,
      aindaEhAtual,
      gravou: () => {
        if (aindaEhAtual()) setLojaDosDados(loja);
      },
    };
  }, []);

  return {
    comecar,
    /** De qual loja são os dados que a carga mais nova pôs na tela (`null`: nenhuma ainda). */
    lojaDosDados,
    /** Os dados na tela são da loja do seletor. */
    dadosSaoDaLoja: lojaDosDados !== null && lojaDosDados === (lojaId ?? null),
  };
}
