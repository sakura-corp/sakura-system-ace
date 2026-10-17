import { useCallback, useEffect, useRef, useState } from "react";
import { CabecalhoDaPagina } from "./componentes/CabecalhoDaPagina";
import { BarraLateral, type ItemDeLeva } from "./componentes/BarraLateral";
import { NavegacaoDoCelular } from "./componentes/NavegacaoDoCelular";
import { Escritorio } from "./componentes/escritorio/Escritorio";
import { PaginaEmBreve } from "./componentes/PaginaEmBreve";
import { Sala } from "./componentes/sala/Sala";
import { QUEM_ESTA_OLHANDO_NA_SALA, salaDeExemplo } from "./dados/exemplo-sala";
import { TelaDeEntrada } from "./componentes/TelaDeEntrada";
import { ErroDaLeva, EsqueletoDaLeva, TelaDaLeva } from "./componentes/TelaDaLeva";
import { nomeDaLevaDeExemplo, tarefasDeExemplo } from "./dados/exemplo";
import { carregarLeva, enderecoDaLeva, levaPedida, type EstadoDaLeva } from "./logica/dados";
import { idDoEmBreve, textoEmBreve } from "./logica/emBreve";
import { paginaPraVoltar } from "./logica/login";
import { ehModoTv } from "./logica/sala";
import { useSala } from "./useSala";
import { useTempoReal } from "./useTempoReal";
import type { EstadoDaSala } from "./logica/salaDados";
import type { Pagina, Usuario } from "./tipos";

/** Qual página mostrar, pelo endereço. Sem biblioteca de rotas: são poucas. */
export function paginaDoCaminho(caminho: string): Pagina {
  const limpo = caminho.replace(/\/+$/, "");
  if (limpo === "/escritorio") return "escritorio";
  if (limpo === "/sala") return "sala";
  // As páginas "em breve" (#544): a barra marca o item da página aberta.
  const emBreve = textoEmBreve(idDoEmBreve(limpo) ?? "");
  if (emBreve) return emBreve.id;
  return "leva";
}

const caminhoAtual = () => (typeof window === "undefined" ? "/" : window.location.pathname);
const buscaAtual = () => (typeof window === "undefined" ? "" : window.location.search);

/**
 * As levas e as tarefas de verdade (#354), buscadas no worker. `ativo` = false não busca nada;
 * `soAsLevas`: só a lista da barra lateral (na Sala e no Escritório).
 */
function useLeva(pedida: number | null, ativo: boolean, soAsLevas: boolean): [EstadoDaLeva, () => void, () => Promise<boolean>] {
  const [estado, setEstado] = useState<EstadoDaLeva>({ tipo: "carregando" });
  const [tentativa, setTentativa] = useState(0);
  const chave = useRef("");
  chave.current = `${pedida}|${soAsLevas}`;
  const carregando = useRef(true);
  carregando.current = estado.tipo === "carregando";
  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    setEstado({ tipo: "carregando" });
    void carregarLeva(pedida, fetch, soAsLevas).then((novo) => {
      if (vivo) setEstado(novo);
    });
    return () => {
      vivo = false;
    };
  }, [pedida, ativo, soAsLevas, tentativa]);

  // Busca de novo sem piscar (tempo real, #355): só troca a tela se deu certo (ou se a sessão acabou).
  // Erro não apaga o que já está na tela; quem avisa que ficou velho é o `estado` do tempo real.
  const recarregar = useCallback(async () => {
    // A primeira carga ainda está rodando: duas buscas juntas com o token vencido renovariam duas vezes,
    // e cada `refresh` do GitHub vale uma vez só (docs/painel.md, #353).
    if (carregando.current) return false;
    const minha = `${pedida}|${soAsLevas}`;
    const novo = await carregarLeva(pedida, fetch, soAsLevas);
    if (minha !== chave.current) return false;
    if (novo.tipo === "pronto") {
      setEstado(novo);
      return true;
    }
    if (novo.tipo === "fora") setEstado(novo);
    return false;
  }, [pedida, soAsLevas]);
  return [estado, () => setTentativa((n) => n + 1), recarregar];
}

const LINK_DA_ETIQUETA = (numero: number) =>
  `https://github.com/sakura-corp/sakura-system-ace/issues?q=${encodeURIComponent(`label:leva-${numero}`)}`;

// A leva vem do GitHub (#354). Sem login (só no `npm run dev`, sem o worker), mostra a de exemplo.
// A Sala vem do GitHub (#468), com o mesmo login; o Escritório continua de exemplo (docs/painel.md).
export default function App({
  caminho = caminhoAtual(),
  busca = buscaAtual(),
  usuario,
  leva: levaFixa,
  sala: salaFixa,
}: {
  caminho?: string;
  busca?: string;
  /** Quem entrou (#353). Sem ele (só no `npm run dev`), a barra lateral não mostra o "Sair" e a leva é de exemplo. */
  usuario?: Usuario;
  /** Só nos testes: o estado da leva, em vez de buscar no worker. */
  leva?: EstadoDaLeva;
  /** Só nos testes: o estado da Sala, em vez de buscar no worker. */
  sala?: EstadoDaSala;
}) {
  const pagina = paginaDoCaminho(caminho);
  // /em-breve/<id> (#544): id que não existe também cai aqui e mostra "Página não encontrada".
  const emBreve = idDoEmBreve(caminho.replace(/\/+$/, ""));
  const tv = pagina === "sala" && ehModoTv(busca);
  const exemplo = !usuario && levaFixa === undefined;
  const pedida = levaPedida(caminho);
  const buscando = !exemplo && !tv && levaFixa === undefined;
  const [buscada, tentarDeNovo, recarregar] = useLeva(pedida, buscando, pagina !== "leva" || emBreve !== null);
  const estado = levaFixa ?? buscada;

  // A Sala de verdade (#468), com o mesmo login. No modo TV não busca a leva, só a sala.
  const dadosReais = !exemplo && levaFixa === undefined;
  const naSala = pagina === "sala";
  const [salaBuscada, tentarSalaDeNovo, recarregarSala] = useSala(dadosReais && naSala && salaFixa === undefined);
  const salaDeVerdade = salaFixa ?? salaBuscada;
  const [salaDeExemploAgora] = useState<EstadoDaSala>(() => ({ tipo: "pronto", entradas: salaDeExemplo(new Date()), falhas: [], leva: null }));
  const buscarDaSala = useCallback(async () => {
    if (!tv) await recarregar();
    return recarregarSala();
  }, [tv, recarregar, recarregarSala]);

  // Tempo real (#355): só com login e com os dados vindo do GitHub; para quando a sessão acaba.
  // Na Sala (#468) escuta também os avisos de robô e de branch, e a busca é a da sala.
  const tempoReal = useTempoReal({
    ativo: dadosReais && estado.tipo !== "fora" && salaDeVerdade.tipo !== "fora",
    buscar: naSala ? buscarDaSala : recarregar,
    carregou: naSala ? salaDeVerdade.tipo === "pronto" : estado.tipo === "pronto",
    sala: naSala,
  });

  if (!exemplo && naSala && salaDeVerdade.tipo === "fora") {
    return <TelaDeEntrada volta={paginaPraVoltar(caminho, busca)} erro="Sua sessão acabou. Entre de novo." />;
  }
  // Modo TV (/sala?tv): só a sala, grande, sem barra lateral nem lista.
  if (tv) {
    return (
      <Sala
        tv
        dados={exemplo ? salaDeExemploAgora : salaDeVerdade}
        quemEstaOlhando={usuario?.login ?? QUEM_ESTA_OLHANDO_NA_SALA}
        conexao={exemplo ? undefined : tempoReal}
        tentarDeNovo={tempoReal.atualizar}
        recarregarTudo={tentarSalaDeNovo}
      />
    );
  }
  if (!exemplo && estado.tipo === "fora") {
    return <TelaDeEntrada volta={paginaPraVoltar(caminho, busca)} erro="Sua sessão acabou. Entre de novo." />;
  }

  let levas: ItemDeLeva[];
  let mostrada: number | null = null;
  if (exemplo) {
    levas = [{ nome: nomeDaLevaDeExemplo, href: "/", atual: true }];
  } else if (estado.tipo === "pronto") {
    mostrada = estado.leva.numero;
    levas = estado.levas.map((l) => ({ nome: l.nome, href: enderecoDaLeva(l.numero, estado.atual), atual: l.numero === mostrada }));
  } else {
    // Enquanto busca (ou se deu erro), um caminho de volta pra leva da tela (ou pra atual).
    levas = [pedida === null ? { nome: "Leva atual", href: "/", atual: true } : { nome: `Leva ${pedida}`, href: `/leva/${pedida}`, atual: true }];
  }

  return (
    <div className="min-h-screen md:flex">
      <BarraLateral levas={levas} pagina={pagina} usuario={usuario} tempoReal={buscando ? tempoReal.estado : undefined} />
      <NavegacaoDoCelular levas={levas} pagina={pagina} usuario={usuario} tempoReal={buscando ? tempoReal.estado : undefined} />
      {pagina === "sala" ? (
        <main className="mx-auto w-full min-w-0 max-w-[1100px] flex-1 px-4 pb-28 pt-6 md:px-6 md:pb-6">
          <CabecalhoDaPagina
            trilha="Equipe"
            titulo="Sala"
            explicacao="As pessoas e os robôs, ao vivo."
            acoes={
              <a
                href="/sala?tv"
                className="inline-flex min-h-9 items-center rounded-lg border border-borda px-3.5 text-sm font-medium text-texto hover:bg-livre-fundo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque"
              >
                Modo TV
              </a>
            }
          />
          <div className="mt-6">
            <Sala
              dados={exemplo ? salaDeExemploAgora : salaDeVerdade}
              quemEstaOlhando={usuario?.login ?? QUEM_ESTA_OLHANDO_NA_SALA}
              conexao={exemplo ? undefined : tempoReal}
              tentarDeNovo={tempoReal.atualizar}
              recarregarTudo={tentarSalaDeNovo}
            />
          </div>
        </main>
      ) : emBreve !== null ? (
        <main className="mx-auto w-full min-w-0 max-w-[960px] flex-1 px-4 pb-28 pt-8 md:px-8 md:pb-8">
          <PaginaEmBreve id={emBreve} />
        </main>
      ) : pagina === "escritorio" ? (
        <main className="mx-auto w-full min-w-0 max-w-[1440px] flex-1 px-4 pb-28 pt-6 md:px-6 md:pb-6">
          <Escritorio />
        </main>
      ) : (
        <main className="mx-auto w-full max-w-[960px] flex-1 px-4 pb-28 pt-8 md:px-8 md:pb-8">
          {exemplo ? (
            <TelaDaLeva nome={nomeDaLevaDeExemplo} tarefas={tarefasDeExemplo} subtitulo="Dados de exemplo: ainda sem ligação com o GitHub." />
          ) : estado.tipo === "pronto" ? (
            <TelaDaLeva
              nome={`Leva ${estado.leva.numero}`}
              tarefas={estado.leva.tarefas}
              cortada={estado.leva.cortada}
              login={usuario?.login}
              aoMudar={usuario ? recarregar : undefined}
              ehALevaAtual={estado.leva.numero === estado.atual}
              subtitulo={
                <>
                  As tarefas com a etiqueta <code>leva-{estado.leva.numero}</code>.{" "}
                  <a
                    href={LINK_DA_ETIQUETA(estado.leva.numero)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-texto"
                  >
                    Ver no GitHub<span className="sr-only"> (abre em aba nova)</span>
                  </a>
                </>
              }
            />
          ) : estado.tipo === "erro" ? (
            <>
              <p className="text-sm font-medium text-texto-2">Painel da Sakura</p>
              <h1 className="mb-6 font-serif text-3xl font-semibold">{pedida === null ? "Leva atual" : `Leva ${pedida}`}</h1>
              <ErroDaLeva mensagem={estado.mensagem} tentarDeNovo={tentarDeNovo} />
            </>
          ) : estado.tipo === "sem-levas" ? (
            <>
              <p className="text-sm font-medium text-texto-2">Painel da Sakura</p>
              <h1 className="font-serif text-3xl font-semibold">Nenhuma leva ainda</h1>
              <p className="mt-2 text-sm text-texto-2">
                Uma leva é uma etiqueta <code>leva-0</code>, <code>leva-1</code>… nas issues do GitHub. Quando a primeira existir, ela aparece aqui.
              </p>
            </>
          ) : (
            <EsqueletoDaLeva />
          )}
        </main>
      )}
    </div>
  );
}
