import { useCallback, useEffect, useRef, useState } from "react";
import { mensagemDeErro } from "@/lib/errors";

/**
 * O jeito único de mostrar uma lista que cresce (TR-03.5, #373): a página, a
 * ordem e a busca vão pro BANCO, e a tela só desenha as linhas daquela página.
 * Começou em Clientes; as outras listas entram uma tela por vez, com este
 * mesmo gancho.
 *
 * Quem usa passa `buscarPagina`, que pede ao banco UMA página (`.range(de,
 * ate)`), com a ordem (que precisa terminar numa coluna única, como `id`: a
 * regra de `lib/paginacao.ts`) e a busca, e devolve as linhas e o total.
 *
 * Os cuidados que moram aqui, pra nenhuma tela precisar repetir:
 * - a ordem escolhida fica guardada por tela (`chave`) no computador; se o
 *   `localStorage` falhar ou guardar algo estranho, volta pra ordem padrão;
 * - a busca espera a pessoa parar de digitar (`esperaDaBusca`) e volta pra
 *   página 1; trocar a ordem também volta pra página 1;
 * - só a resposta MAIS NOVA grava (o mesmo cuidado do #903): digitar rápido
 *   dispara várias consultas, e uma velha pode chegar depois da nova;
 * - se a página ficou vazia (excluiu o último da última página), volta uma.
 */
export interface OrdemDaLista<C extends string> {
  coluna: C;
  crescente: boolean;
}

export interface PedidoDePagina<C extends string> {
  de: number;
  ate: number;
  ordem: OrdemDaLista<C>;
  busca: string;
}

export interface PaginaDaLista<T> {
  linhas: T[];
  total: number;
}

export interface OpcoesDaListaPaginada<T, C extends string> {
  /** Nome da tela, pra guardar a ordem dela (ex.: "clientes"). */
  chave: string;
  buscarPagina: (pedido: PedidoDePagina<C>) => Promise<PaginaDaLista<T>>;
  ordemPadrao: OrdemDaLista<C>;
  /** As colunas que podem ser ordenadas (o que vier do disco fora disso é ignorado). */
  colunas: readonly C[];
  porPagina?: number;
  /** Quanto esperar (ms) depois da última tecla pra buscar. */
  esperaDaBusca?: number;
}

export const LINHAS_POR_PAGINA = 50;
const ESPERA_DA_BUSCA = 300;

function chaveDaOrdem(chave: string): string {
  return `sakura:ordem-da-lista:${chave}`;
}

function lerOrdemGuardada<C extends string>(
  chave: string,
  colunas: readonly C[],
  padrao: OrdemDaLista<C>,
): OrdemDaLista<C> {
  try {
    const texto = localStorage.getItem(chaveDaOrdem(chave));
    if (!texto) return padrao;
    const lida = JSON.parse(texto) as Partial<OrdemDaLista<C>>;
    if (
      typeof lida?.coluna === "string" &&
      colunas.includes(lida.coluna) &&
      typeof lida.crescente === "boolean"
    ) {
      return { coluna: lida.coluna, crescente: lida.crescente };
    }
  } catch {
    // Sem localStorage (ou com lixo nele): fica a ordem padrão.
  }
  return padrao;
}

function guardarOrdem<C extends string>(chave: string, ordem: OrdemDaLista<C>) {
  try {
    localStorage.setItem(chaveDaOrdem(chave), JSON.stringify(ordem));
  } catch {
    // Não guardou: a ordem vale só até fechar a tela, sem atrapalhar.
  }
}

export function useListaPaginada<T, C extends string>(opcoes: OpcoesDaListaPaginada<T, C>) {
  const {
    chave,
    buscarPagina,
    ordemPadrao,
    colunas,
    porPagina = LINHAS_POR_PAGINA,
    esperaDaBusca = ESPERA_DA_BUSCA,
  } = opcoes;

  const [ordem, setOrdem] = useState<OrdemDaLista<C>>(() =>
    lerOrdemGuardada(chave, colunas, ordemPadrao),
  );
  const [pagina, setPagina] = useState(0);
  /** O que está escrito no campo. */
  const [busca, setBusca] = useState("");
  /** O que já foi pro banco (depois da espera). */
  const [buscaAplicada, setBuscaAplicada] = useState("");
  // O que está na tela, junto da página e da busca de onde veio: enquanto a
  // próxima página carrega, o "Mostrando 51 a 100" continua falando das
  // linhas que a pessoa está vendo, não da página que ainda vai chegar.
  const [carregada, setCarregada] = useState<{
    linhas: T[];
    total: number;
    pagina: number;
    busca: string;
  }>({ linhas: [], total: 0, pagina: 0, busca: "" });
  const { linhas, total } = carregada;
  // Sobe a cada "recarregar": a consulta é refeita com a página, a ordem e a
  // busca de AGORA, e não as de quando a pessoa clicou em salvar ou excluir.
  const [versao, setVersao] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // A função de buscar pode ser recriada a cada desenho da tela; a consulta
  // só deve repetir quando a página, a ordem ou a busca mudam.
  const buscarRef = useRef(buscarPagina);
  useEffect(() => {
    buscarRef.current = buscarPagina;
  }, [buscarPagina]);

  // Só a consulta mais nova grava (#903).
  const consultaAtual = useRef(0);

  const carregar = useCallback(async () => {
    const minha = ++consultaAtual.current;
    const aindaEhAtual = () => minha === consultaAtual.current;
    setCarregando(true);
    setErro(null);
    try {
      const de = pagina * porPagina;
      const resposta = await buscarRef.current({
        de,
        ate: de + porPagina - 1,
        ordem,
        busca: buscaAplicada,
      });
      if (!aindaEhAtual()) return;
      // A página sumiu (excluiu o último da última página, ou outra pessoa
      // apagou clientes): volta pra última que existe, e esta consulta
      // é refeita lá.
      const ultimaQueExiste = Math.max(0, Math.ceil(resposta.total / porPagina) - 1);
      if (resposta.linhas.length === 0 && pagina > ultimaQueExiste) {
        setPagina(ultimaQueExiste);
        return;
      }
      setCarregada({
        linhas: resposta.linhas,
        total: resposta.total,
        pagina,
        busca: buscaAplicada,
      });
    } catch (err) {
      if (!aindaEhAtual()) return;
      console.error(`Erro ao carregar a lista (${chave}):`, err);
      setErro(mensagemDeErro(err));
    } finally {
      if (aindaEhAtual()) setCarregando(false);
    }
    // `versao` não é lida aqui dentro: está na lista só pra o "recarregar"
    // refazer a consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, porPagina, ordem, buscaAplicada, chave, versao]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // A busca espera a pessoa parar de digitar e volta pra página 1.
  useEffect(() => {
    if (busca === buscaAplicada) return;
    const espera = setTimeout(() => {
      setBuscaAplicada(busca);
      setPagina(0);
    }, esperaDaBusca);
    return () => clearTimeout(espera);
  }, [busca, buscaAplicada, esperaDaBusca]);

  /** Clicar no cabeçalho: a mesma coluna inverte; outra coluna começa crescente. */
  const trocarOrdem = useCallback(
    (coluna: C) => {
      setOrdem((atual) => {
        const nova = {
          coluna,
          crescente: atual.coluna === coluna ? !atual.crescente : true,
        };
        guardarOrdem(chave, nova);
        return nova;
      });
      setPagina(0);
    },
    [chave],
  );

  const totalDePaginas = Math.max(1, Math.ceil(total / porPagina));
  const temAnterior = pagina > 0;
  const temProxima = (pagina + 1) * porPagina < total;

  return {
    linhas,
    total,
    carregando,
    erro,
    /** Página atual, contando do 0. */
    pagina,
    totalDePaginas,
    /**
     * Pra "Mostrando 51 a 100 de 2.340" (contando do 1; 0 quando não há
     * linha), sempre das linhas que estão na tela.
     */
    primeira: linhas.length > 0 ? carregada.pagina * porPagina + 1 : 0,
    ultima: carregada.pagina * porPagina + linhas.length,
    temAnterior,
    temProxima,
    anterior: () => {
      if (temAnterior) setPagina((p) => p - 1);
    },
    proxima: () => {
      if (temProxima) setPagina((p) => p + 1);
    },
    ordem,
    trocarOrdem,
    busca,
    setBusca,
    /** A busca que já foi pro banco. */
    buscaAplicada,
    /** A busca de onde vieram as linhas que estão na tela. */
    buscaDaTela: carregada.busca,
    /** Recarrega a página atual (depois de salvar ou excluir). */
    recarregar: () => setVersao((v) => v + 1),
  };
}
