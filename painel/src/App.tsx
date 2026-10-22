import { useCallback, useEffect, useRef, useState } from "react";
import { CabecalhoDaPagina } from "./componentes/CabecalhoDaPagina";
import { BarraLateral, type ItemDeLeva } from "./componentes/BarraLateral";
import { NavegacaoDoCelular } from "./componentes/NavegacaoDoCelular";
import { Escritorio } from "./componentes/escritorio/Escritorio";
import { PaginaEmBreve } from "./componentes/PaginaEmBreve";
import { PaginaFinanceiro } from "./componentes/PaginaFinanceiro";
import { PaginaDasLevas } from "./componentes/PaginaDasLevas";
import { PaginaDecisoes } from "./componentes/PaginaDecisoes";
import { PaginaInicio } from "./componentes/PaginaInicio";
import { PaginaMeuProgresso, progressoDeExemplo, useMeuProgresso, type EstadoDoMeuProgresso } from "./componentes/PaginaMeuProgresso";
import { PaginaPessoas } from "./componentes/PaginaPessoas";
import { PaginaSecundarios } from "./componentes/PaginaSecundarios";
import { PaginaVersoes } from "./componentes/PaginaVersoes";
import { chaveDoRelatorio, levaDoRelatorio, PaginaRelatorio } from "./componentes/PaginaRelatorio";
import { Sala } from "./componentes/sala/Sala";
import { QUEM_ESTA_OLHANDO_NA_SALA, salaDeExemplo } from "./dados/exemplo-sala";
import { TelaDeEntrada } from "./componentes/TelaDeEntrada";
import { ErroDaLeva, EsqueletoDaLeva, TelaDaLeva } from "./componentes/TelaDaLeva";
import { nomeDaLevaDeExemplo, tarefasDeExemplo } from "./dados/exemplo";
import { carregarLeva, carregarResumoDasLevas, ENDERECO_DA_LEVA_ATUAL, enderecoDaLeva, levaPedida, type EstadoDaLeva, type EstadoDoResumo } from "./logica/dados";
import { idDoEmBreve, textoEmBreve } from "./logica/emBreve";
import { mesDaBusca, type EstadoDoFinanceiro } from "./logica/financeiroDados";
import { relatorioPedido } from "./logica/navegacao";
import { paginaPraVoltar } from "./logica/login";
import { levaAceitaPegar } from "./logica/estado";
import { carregarNovidades, type EstadoDasNovidades, type Novidade } from "./logica/novidades";
import { ehModoTv } from "./logica/sala";
import { useFinanceiro } from "./useFinanceiro";
import { useSala } from "./useSala";
import { useTempoReal } from "./useTempoReal";
import type { EstadoDaSala } from "./logica/salaDados";
import type { Pagina, ResumoDeLeva, Usuario } from "./tipos";

/** Qual página mostrar, pelo endereço. Sem biblioteca de rotas: são poucas. */
export function paginaDoCaminho(caminho: string): Pagina {
  const limpo = caminho.replace(/\/+$/, "");
  // A "/" é o Início (#546); a leva atual mora em /leva, e as outras em /leva/<n>.
  if (limpo === "") return "inicio";
  if (limpo === "/escritorio") return "escritorio";
  if (limpo === "/sala") return "sala";
  if (limpo === "/levas") return "levas";
  // Os Projetos secundários (#731).
  if (limpo === "/secundarios") return "secundarios";
  if (limpo === "/financeiro") return "financeiro";
  // O Meu progresso (#734): pelo clique na própria foto, e pelo cartão do Início.
  if (limpo === "/meu-progresso") return "meu-progresso";
  // O Relatório da leva (#647): /relatorio, o de uma leva, e o endereço antigo do "em breve" (nenhum endereço some).
  if (limpo === "/relatorio" || limpo === "/em-breve/relatorio" || relatorioPedido(limpo) !== null) return "relatorio";
  // As Decisões da Sofia (#648): /decisoes e o endereço antigo do "em breve" (nenhum endereço some).
  if (limpo === "/decisoes" || limpo === "/em-breve/decisoes") return "decisoes";
  // As Versões (#649): /versoes e o endereço antigo do "em breve" (nenhum endereço some).
  if (limpo === "/versoes" || limpo === "/em-breve/versoes") return "versoes";
  // As Pessoas (#650): /pessoas e o endereço antigo do "em breve" (nenhum endereço some).
  if (limpo === "/pessoas" || limpo === "/em-breve/pessoas") return "pessoas";
  // As páginas "em breve" (#544): a barra marca o item da página aberta.
  const idEmBreve = idDoEmBreve(limpo);
  const emBreve = textoEmBreve(idEmBreve ?? "");
  if (emBreve) return emBreve.id;
  // /em-breve/<id que não existe> (#560): a página "não encontrada", sem item marcado na barra.
  if (idEmBreve !== null) return "nao-encontrada";
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

/**
 * O resumo das levas (#548), só na página /levas. Lá ele é o único pedido de dados: a barra lateral usa
 * as mesmas levas (ver `levaDoResumo`), e o `useLeva` fica parado. Mesmo jeito do `useLeva`: a busca do
 * tempo real só troca a tela se deu certo, e não roda junto da primeira carga.
 */
function useResumoDasLevas(ativo: boolean): [EstadoDoResumo, () => void, () => Promise<boolean>] {
  const [estado, setEstado] = useState<EstadoDoResumo>({ tipo: "carregando" });
  const [tentativa, setTentativa] = useState(0);
  const carregando = useRef(true);
  carregando.current = estado.tipo === "carregando";
  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    setEstado({ tipo: "carregando" });
    void carregarResumoDasLevas(fetch).then((novo) => {
      if (vivo) setEstado(novo);
    });
    return () => {
      vivo = false;
    };
  }, [ativo, tentativa]);
  const recarregar = useCallback(async () => {
    if (carregando.current) return false;
    const novo = await carregarResumoDasLevas(fetch);
    if (novo.tipo === "pronto") {
      setEstado(novo);
      return true;
    }
    if (novo.tipo === "fora") setEstado(novo);
    return false;
  }, []);
  return [estado, () => setTentativa((n) => n + 1), recarregar];
}

/** O resumo no formato da leva, pra barra lateral (as levas do resumo têm número, nome e abertas). */
function levaDoResumo(resumo: EstadoDoResumo): EstadoDaLeva {
  if (resumo.tipo !== "pronto") return resumo;
  return { tipo: "pronto", levas: resumo.levas, atual: resumo.atual, leva: { numero: resumo.atual, tarefas: [], cortada: false } };
}

const LINK_DA_ETIQUETA = (numero: number) =>
  `https://github.com/sakura-corp/sakura-system-ace/issues?q=${encodeURIComponent(`label:leva-${numero}`)}`;

// A página /levas sem login (só no `npm run dev`): o resumo da leva de exemplo.
const RESUMO_DE_EXEMPLO: ResumoDeLeva[] = [
  {
    numero: 0,
    nome: nomeDaLevaDeExemplo,
    abertas: tarefasDeExemplo.filter((t) => t.estado !== "feita").length,
    total: tarefasDeExemplo.length,
    feitas: tarefasDeExemplo.filter((t) => t.estado === "feita").length,
    horas: tarefasDeExemplo.reduce((h, t) => h + (t.estimativaHoras ?? 0), 0),
    terminouEm: null,
  },
];

/** "O que mudou hoje" no Início (#549), buscado no worker. `ativo` = false não busca nada. */
function useNovidades(ativo: boolean): [EstadoDasNovidades, () => void, () => Promise<void>] {
  const [estado, setEstado] = useState<EstadoDasNovidades>({ tipo: "carregando" });
  const [tentativa, setTentativa] = useState(0);
  const carregando = useRef(true);
  carregando.current = estado.tipo === "carregando";
  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    setEstado({ tipo: "carregando" });
    void carregarNovidades().then((novo) => {
      if (vivo) setEstado(novo);
    });
    return () => {
      vivo = false;
    };
  }, [ativo, tentativa]);
  // O tempo real: só troca se deu certo; erro não apaga o que já está na tela. Nunca junto da primeira carga
  // (duas renovações do token ao mesmo tempo, ver useSala).
  const recarregar = useCallback(async () => {
    if (carregando.current) return;
    const novo = await carregarNovidades();
    if (novo.tipo === "pronto" || novo.tipo === "fora") setEstado(novo);
  }, []);
  return [estado, () => setTentativa((n) => n + 1), recarregar];
}

// O Financeiro sem login (só no `npm run dev`): não há worker nem banco, então não mostra número nenhum.
const FINANCEIRO_SEM_LOGIN: EstadoDoFinanceiro = { tipo: "erro", mensagem: "Sem login, o Financeiro não abre. Entre pelo painel de verdade." };

const minutosAtras = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const novidadesDeExemplo = (): Novidade[] => [
  { id: "x1", quando: minutosAtras(35), tipo: "rodada", passou: true, nome: "CI", numero: 545 },
  { id: "x2", quando: minutosAtras(120), tipo: "tarefa", acao: "pegou", quem: "carla-exemplo", numero: 510, alvo: "carla-exemplo" },
  { id: "x3", quando: minutosAtras(180), tipo: "pr", acao: "abriu", quem: "bruno-exemplo", numero: 455 },
];

// A leva vem do GitHub (#354). Sem login (só no `npm run dev`, sem o worker), mostra a de exemplo.
// A Sala vem do GitHub (#468), com o mesmo login; o Escritório continua de exemplo (docs/painel.md).
export default function App({
  caminho = caminhoAtual(),
  busca = buscaAtual(),
  usuario,
  leva: levaFixa,
  sala: salaFixa,
  resumo: resumoFixo,
  financeiro: financeiroFixo,
}: {
  caminho?: string;
  busca?: string;
  /** Quem entrou (#353). Sem ele (só no `npm run dev`), a barra lateral não mostra o "Sair" e a leva é de exemplo. */
  usuario?: Usuario;
  /** Só nos testes: o estado da leva, em vez de buscar no worker. */
  leva?: EstadoDaLeva;
  /** Só nos testes: o estado da Sala, em vez de buscar no worker. */
  sala?: EstadoDaSala;
  /** Só nos testes: o resumo das levas (#548, página /levas), em vez de buscar no worker. */
  resumo?: EstadoDoResumo;
  /** Só nos testes: o estado do Financeiro (#654), em vez de buscar no worker. */
  financeiro?: EstadoDoFinanceiro;
}) {
  const pagina = paginaDoCaminho(caminho);
  // /em-breve/<id> (#544): id que não existe também cai aqui e mostra "Página não encontrada".
  const emBreve = pagina === "relatorio" || pagina === "decisoes" || pagina === "versoes" || pagina === "pessoas" || pagina === "secundarios" ? null : idDoEmBreve(caminho.replace(/\/+$/, ""));
  const tv = pagina === "sala" && ehModoTv(busca);
  const exemplo = !usuario && levaFixa === undefined && resumoFixo === undefined;
  const pedida = levaPedida(caminho);
  const buscando = !exemplo && !tv && levaFixa === undefined && resumoFixo === undefined;
  // Só a Leva e o Início precisam das tarefas; nas outras páginas, só a lista da barra lateral.
  const soAsLevas = (pagina !== "leva" && pagina !== "inicio") || emBreve !== null; // inclui os Projetos secundários (#731)
  // Na página /levas (#548), um pedido só: o resumo, que serve também pra barra lateral.
  const naPaginaDasLevas = pagina === "levas";
  const [buscada, tentarDeNovo, recarregar] = useLeva(pedida, buscando && !naPaginaDasLevas, soAsLevas);
  const [resumoBuscado, tentarResumoDeNovo, recarregarResumo] = useResumoDasLevas(buscando && naPaginaDasLevas);
  const resumo = resumoFixo ?? resumoBuscado;
  const estado = levaFixa ?? (naPaginaDasLevas ? levaDoResumo(resumo) : buscada);

  // A Sala de verdade (#468), com o mesmo login. No modo TV não busca a leva, só a sala.
  // O Início (#546) usa a mesma sala (o "precisa de você") e a leva atual inteira.
  const dadosReais = !exemplo && levaFixa === undefined && resumoFixo === undefined;
  const naSala = pagina === "sala" || pagina === "inicio" || pagina === "pessoas";
  const [salaBuscada, tentarSalaDeNovo, recarregarSala] = useSala(dadosReais && naSala && salaFixa === undefined);
  const salaDeVerdade = salaFixa ?? salaBuscada;
  const [salaDeExemploAgora] = useState<EstadoDaSala>(() => ({ tipo: "pronto", entradas: salaDeExemplo(new Date()), falhas: [], leva: null }));
  const levaDeExemplo: EstadoDaLeva = {
    tipo: "pronto",
    levas: [{ numero: 0, nome: nomeDaLevaDeExemplo, abertas: 0 }],
    atual: 0,
    leva: { numero: 0, tarefas: tarefasDeExemplo, cortada: false },
  };
  const [novidadesBuscadas, tentarNovidadesDeNovo, recarregarNovidades] = useNovidades(dadosReais && pagina === "inicio");
  const [novidadesDeExemploAgora] = useState<EstadoDasNovidades>(() => ({ tipo: "pronto", novidades: novidadesDeExemplo(), falhas: [] }));
  // O Financeiro (#654): o mês vem de ?mes=; sem login (só no `npm run dev`) não busca nada.
  const mesDoFinanceiro = mesDaBusca(busca, new Date());
  const [financeiroBuscado, tentarFinanceiroDeNovo, recarregarFinanceiro] = useFinanceiro(dadosReais && pagina === "financeiro" && financeiroFixo === undefined, mesDoFinanceiro);
  const financeiro: EstadoDoFinanceiro = financeiroFixo ?? (exemplo ? FINANCEIRO_SEM_LOGIN : financeiroBuscado);
  // O cartão do Meu progresso no Início (#734): sempre o de quem está logado (sem ?pessoa=).
  const [progressoBuscado] = useMeuProgresso(dadosReais && pagina === "inicio", null);
  const [progressoDeExemploAgora] = useState<EstadoDoMeuProgresso>(() => ({ tipo: "pronto", resposta: progressoDeExemplo(new Date()) }));
  const buscarDaSala = useCallback(async () => {
    if (!tv) await recarregar();
    if (pagina === "inicio") await recarregarNovidades();
    return recarregarSala();
  }, [tv, pagina, recarregar, recarregarSala, recarregarNovidades]);

  // Tempo real (#355): só com login e com os dados vindo do GitHub; para quando a sessão acaba.
  // Na Sala (#468) escuta também os avisos de robô e de branch, e a busca é a da sala.
  const tempoReal = useTempoReal({
    ativo: dadosReais && estado.tipo !== "fora" && salaDeVerdade.tipo !== "fora",
    buscar: naSala ? buscarDaSala : naPaginaDasLevas ? recarregarResumo : recarregar,
    carregou: naSala ? salaDeVerdade.tipo === "pronto" : estado.tipo === "pronto",
    sala: naSala,
  });

  if (!exemplo && naSala && (salaDeVerdade.tipo === "fora" || (pagina === "inicio" && novidadesBuscadas.tipo === "fora"))) {
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
  if (!exemplo && pagina === "financeiro" && financeiro.tipo === "fora") {
    return <TelaDeEntrada volta={paginaPraVoltar(caminho, busca)} erro="Sua sessão acabou. Entre de novo." />;
  }
  if (!exemplo && estado.tipo === "fora") {
    return <TelaDeEntrada volta={paginaPraVoltar(caminho, busca)} erro="Sua sessão acabou. Entre de novo." />;
  }

  // O relatório de /leva/<n>/relatorio, ou o que /relatorio escolhe entre as levas (ver levaDoRelatorio).
  const numeroDoRelatorio = relatorioPedido(caminho.replace(/\/+$/, "")) ?? (estado.tipo === "pronto" ? levaDoRelatorio(estado.levas, estado.atual) : null);

  let levas: ItemDeLeva[];
  let mostrada: number | null = null;
  if (exemplo) {
    levas = [{ nome: nomeDaLevaDeExemplo, href: ENDERECO_DA_LEVA_ATUAL, atual: true }];
  } else if (estado.tipo === "pronto") {
    mostrada = estado.leva.numero;
    levas = estado.levas.map((l) => ({ nome: l.nome, href: enderecoDaLeva(l.numero, estado.atual), atual: l.numero === mostrada }));
  } else {
    // Enquanto busca (ou se deu erro), um caminho de volta pra leva da tela (ou pra atual).
    levas = [
      pedida === null ? { nome: "Leva atual", href: ENDERECO_DA_LEVA_ATUAL, atual: true } : { nome: `Leva ${pedida}`, href: `/leva/${pedida}`, atual: true },
    ];
  }

  return (
    <div className="min-h-screen md:flex">
      <BarraLateral levas={levas} pagina={pagina} usuario={usuario} tempoReal={buscando ? tempoReal.estado : undefined} />
      <NavegacaoDoCelular levas={levas} pagina={pagina} usuario={usuario} tempoReal={buscando ? tempoReal.estado : undefined} />
      {pagina === "inicio" ? (
        <main className="mx-auto w-full min-w-0 max-w-[1100px] flex-1 px-4 pb-28 pt-6 md:px-6 md:pb-6">
          <PaginaInicio
            login={usuario?.login ?? QUEM_ESTA_OLHANDO_NA_SALA}
            sala={exemplo ? salaDeExemploAgora : salaDeVerdade}
            leva={exemplo ? levaDeExemplo : estado}
            agora={new Date()}
            aoMudar={usuario ? recarregar : undefined}
            tentarSalaDeNovo={tentarSalaDeNovo}
            tentarLevaDeNovo={tentarDeNovo}
            novidades={exemplo ? novidadesDeExemploAgora : novidadesBuscadas}
            tentarNovidadesDeNovo={tentarNovidadesDeNovo}
            meuProgresso={exemplo ? progressoDeExemploAgora : progressoBuscado}
            exemplo={exemplo}
          />
        </main>
      ) : pagina === "sala" ? (
        <main className="mx-auto w-full min-w-0 max-w-[1100px] flex-1 px-4 pb-28 pt-6 md:px-6 md:pb-6">
          <CabecalhoDaPagina
            trilha="1º · Produção"
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
              levaAtual={!exemplo && estado.tipo === "pronto" ? { numero: estado.atual, fase: estado.levas.find((l) => l.numero === estado.atual)?.fase } : undefined}
              quemEstaOlhando={usuario?.login ?? QUEM_ESTA_OLHANDO_NA_SALA}
              conexao={exemplo ? undefined : tempoReal}
              tentarDeNovo={tempoReal.atualizar}
              recarregarTudo={tentarSalaDeNovo}
            />
          </div>
        </main>
      ) : pagina === "levas" ? (
        <main className="mx-auto w-full min-w-0 max-w-[960px] flex-1 px-4 pb-28 pt-8 md:px-8 md:pb-8">
          {exemplo ? (
            <PaginaDasLevas levas={RESUMO_DE_EXEMPLO} atual={0} />
          ) : resumo.tipo === "pronto" ? (
            <PaginaDasLevas levas={resumo.levas} atual={resumo.atual} />
          ) : resumo.tipo === "erro" ? (
            <>
              <CabecalhoDaPagina trilha="1º · Produção" titulo="Levas anteriores" />
              <div className="mt-6">
                <ErroDaLeva mensagem={resumo.mensagem} tentarDeNovo={tentarResumoDeNovo} />
              </div>
            </>
          ) : resumo.tipo === "sem-levas" ? (
            <PaginaDasLevas levas={[]} atual={null} />
          ) : (
            <EsqueletoDaLeva />
          )}
        </main>
      ) : pagina === "financeiro" ? (
        <main className="mx-auto w-full min-w-0 max-w-[960px] flex-1 px-4 pb-28 pt-8 md:px-8 md:pb-8">
          <PaginaFinanceiro estado={financeiro} mes={mesDoFinanceiro} agora={new Date()} tentarDeNovo={tentarFinanceiroDeNovo} aoMudar={recarregarFinanceiro} />
        </main>
      ) : pagina === "relatorio" ? (
        <main className="mx-auto w-full min-w-0 max-w-[960px] flex-1 px-4 pb-28 pt-8 md:px-8 md:pb-8">
          {numeroDoRelatorio !== null || exemplo ? (
            <PaginaRelatorio
              key={estado.tipo === "pronto" && numeroDoRelatorio !== null ? chaveDoRelatorio(numeroDoRelatorio, estado.levas) : String(numeroDoRelatorio)}
              numero={numeroDoRelatorio}
              semLogin={exemplo}
            />
          ) : (
            <>
              <CabecalhoDaPagina trilha="1º · Produção" titulo="Relatório da leva" />
              <div className="mt-6">
                {estado.tipo === "erro" ? (
                  <ErroDaLeva mensagem={estado.mensagem} tentarDeNovo={tentarDeNovo} />
                ) : estado.tipo === "sem-levas" ? (
                  <p className="text-sm text-texto-2">Nenhuma leva ainda, então ainda não há relatório.</p>
                ) : (
                  <EsqueletoDaLeva />
                )}
              </div>
            </>
          )}
        </main>
      ) : pagina === "decisoes" ? (
        <main className="mx-auto w-full min-w-0 max-w-[960px] flex-1 px-4 pb-28 pt-8 md:px-8 md:pb-8">
          <PaginaDecisoes semLogin={exemplo} />
        </main>
      ) : pagina === "versoes" ? (
        <main className="mx-auto w-full min-w-0 max-w-[960px] flex-1 px-4 pb-28 pt-8 md:px-8 md:pb-8">
          <PaginaVersoes semLogin={exemplo} />
        </main>
      ) : pagina === "secundarios" ? (
        <main className="mx-auto w-full min-w-0 max-w-[960px] flex-1 px-4 pb-28 pt-8 md:px-8 md:pb-8">
          <PaginaSecundarios semLogin={exemplo} login={usuario?.login} busca={busca} />
        </main>
      ) : pagina === "meu-progresso" ? (
        <main className="mx-auto w-full min-w-0 max-w-[960px] flex-1 px-4 pb-28 pt-8 md:px-8 md:pb-8">
          <PaginaMeuProgresso semLogin={exemplo} login={usuario?.login} busca={busca} />
        </main>
      ) : pagina === "pessoas" ? (
        <main className="mx-auto w-full min-w-0 max-w-[960px] flex-1 px-4 pb-28 pt-8 md:px-8 md:pb-8">
          <CabecalhoDaPagina trilha="1º · Produção" titulo="Pessoas" explicacao="Quem tem tarefa nesta leva e o que está fazendo agora." />
          <PaginaPessoas dados={exemplo ? salaDeExemploAgora : salaDeVerdade} tentarDeNovo={tentarSalaDeNovo} />
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
        <main className="mx-auto w-full min-w-0 max-w-[960px] flex-1 px-4 pb-28 pt-8 md:px-8 md:pb-8">
          {exemplo ? (
            <TelaDaLeva nome={nomeDaLevaDeExemplo} tarefas={tarefasDeExemplo} subtitulo="Dados de exemplo: ainda sem ligação com o GitHub." />
          ) : estado.tipo === "pronto" ? (
            <TelaDaLeva
              nome={`Leva ${estado.leva.numero}`}
              tarefas={estado.leva.tarefas}
              cortada={estado.leva.cortada}
              login={usuario?.login}
              aoMudar={usuario ? recarregar : undefined}
              levaAberta={levaAceitaPegar(estado.leva.numero, estado.levas, estado.atual)}
              numero={estado.leva.numero}
              fase={estado.leva.fase ?? estado.levas.find((l) => l.numero === estado.leva.numero)?.fase}
              antesDasFases={estado.levas.find((l) => l.numero === estado.leva.numero)?.antesDasFases}
              atual={estado.atual}
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
