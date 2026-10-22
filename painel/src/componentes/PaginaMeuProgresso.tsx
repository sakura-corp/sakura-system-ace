// O "Meu progresso" (#734): a página pessoal de cada um, com o que entregou ao longo do tempo em todos os projetos.
// Sempre UMA pessoa na tela (nunca lado a lado, sem ranking). Quem é a pessoa vem da sessão, no worker: a página só
// manda ?pessoa=, e o worker recusa pra quem não é a Sofia.
import { Award, RotateCw } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { linkSeguro } from "../logica/link";
import { MAXIMO_DO_ESTIMADO_REAL, montarProgresso, nomeDoProjeto, SEMANAS_NO_GRAFICO, SSACE, textoDoTempo, type Progresso, type SemanaDoProgresso } from "../logica/meuProgresso";
import type { RespostaDoMeuProgresso } from "../tipos";
import { CabecalhoDaPagina } from "./CabecalhoDaPagina";

export type EstadoDoMeuProgresso =
  | { tipo: "carregando" }
  /** A sessão acabou (401). */
  | { tipo: "fora" }
  /** O worker recusou: o progresso de outra pessoa (403). */
  | { tipo: "recusado" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; resposta: RespostaDoMeuProgresso };

type Buscar = (endereco: string, init?: RequestInit) => Promise<Response>;

const ERRO_DO_GITHUB = "Não deu pra buscar o seu progresso no GitHub agora.";
const ERRO_DE_CONEXAO = "Sem conexão com o painel. Confira a internet.";

const texto = (v: unknown): v is string => typeof v === "string";
const numero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Confere o formato do que veio do worker; o que não serve é descartado (nunca quebra a página). */
export function respostaValida(corpo: unknown): RespostaDoMeuProgresso | null {
  if (typeof corpo !== "object" || corpo === null) return null;
  const c = corpo as Record<string, unknown>;
  if (!texto(c.login) || !Array.isArray(c.tarefas) || !Array.isArray(c.prs)) return null;
  const tarefas = c.tarefas.flatMap((t: Record<string, unknown> | null) => {
    if (!t || !texto(t.repositorio) || !numero(t.numero) || !texto(t.titulo) || !texto(t.feitaEm)) return [];
    const url = linkSeguro(t.url as string | undefined) ?? `https://github.com/sakura-corp/${t.repositorio}/issues/${t.numero}`;
    return [
      {
        repositorio: t.repositorio,
        numero: t.numero,
        titulo: t.titulo,
        url,
        feitaEm: t.feitaEm,
        ...(numero(t.estimativaHoras) ? { estimativaHoras: t.estimativaHoras } : {}),
        ...(texto(t.chefe) ? { chefe: t.chefe } : {}),
        ...(texto(t.pegouEm) ? { pegouEm: t.pegouEm } : {}),
        ...(texto(t.prAbertoEm) ? { prAbertoEm: t.prAbertoEm } : {}),
      },
    ];
  });
  const prs = c.prs.flatMap((p: Record<string, unknown> | null) =>
    p && texto(p.repositorio) && numero(p.numero) && texto(p.mescladoEm) ? [{ repositorio: p.repositorio, numero: p.numero, mescladoEm: p.mescladoEm }] : [],
  );
  const resposta: RespostaDoMeuProgresso = { login: c.login, tarefas, prs };
  if (Array.isArray(c.pessoas)) resposta.pessoas = c.pessoas.filter(texto);
  if (c.cortada === true) resposta.cortada = true;
  return resposta;
}

/** O ?pessoa= do endereço (só a Sofia pode usar; o worker confere). */
export function pessoaDaBusca(busca: string): string | null {
  const p = new URLSearchParams(busca).get("pessoa");
  return p && p.trim() ? p.trim() : null;
}

/** Busca /api/meu-progresso (com ?pessoa=, se veio) e confere o formato. */
export async function carregarMeuProgresso(pessoa: string | null, buscar: Buscar = fetch): Promise<EstadoDoMeuProgresso> {
  const endereco = pessoa ? `/api/meu-progresso?pessoa=${encodeURIComponent(pessoa)}` : "/api/meu-progresso";
  let resposta: Response;
  try {
    resposta = await buscar(endereco, { headers: { accept: "application/json" } });
  } catch {
    return { tipo: "erro", mensagem: ERRO_DE_CONEXAO };
  }
  if (resposta.status === 401) return { tipo: "fora" };
  if (resposta.status === 403) return { tipo: "recusado" };
  if (resposta.status === 400) return { tipo: "erro", mensagem: "Essa pessoa não existe no GitHub." };
  if (!resposta.ok) return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  try {
    const valida = respostaValida(await resposta.json());
    return valida ? { tipo: "pronto", resposta: valida } : { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  } catch {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
}

/** A busca, com o "tentar de novo". `ativo` = false não busca nada. */
export function useMeuProgresso(ativo: boolean, pessoa: string | null, buscar: Buscar = fetch): [EstadoDoMeuProgresso, () => void] {
  const [estado, setEstado] = useState<EstadoDoMeuProgresso>({ tipo: "carregando" });
  const [vez, setVez] = useState(0);
  useEffect(() => {
    if (!ativo) return;
    let vale = true;
    setEstado({ tipo: "carregando" });
    void carregarMeuProgresso(pessoa, buscar).then((novo) => {
      if (vale) setEstado(novo);
    });
    return () => {
      vale = false;
    };
  }, [ativo, pessoa, buscar, vez]);
  return [estado, useCallback(() => setVez((v) => v + 1), [])];
}

// ---- Aparência ----

const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque";
const CARTAO = "rounded-xl border border-borda bg-cartao";
const BOTAO_CONTORNO = `inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-borda px-3.5 text-sm font-medium text-texto hover:bg-livre-fundo ${FOCO}`;

/**
 * Uma cor por projeto, na ordem de `Progresso.projetos` (o SSACE sempre na primeira): a paleta de referência da skill
 * dataviz, com o validador rodado no cartão claro (#ffffff) e no escuro (#2a2927). Do 6º projeto em diante, "Outros".
 */
const CORES_DAS_SERIES = [
  "bg-[#2a78d6] dark:bg-[#3987e5]",
  "bg-[#eb6834] dark:bg-[#d95926]",
  "bg-[#1baf7a] dark:bg-[#199e70]",
  "bg-[#eda100] dark:bg-[#c98500]",
  "bg-[#e87ba4] dark:bg-[#d55181]",
];
const COR_DE_OUTROS = "bg-livre";
const OUTROS = "Outros";

const virgula = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
const horas = (n: number) => `${virgula(n)} h`;
const diaMes = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
const dataCompleta = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** As séries do gráfico: os 5 primeiros projetos com cor própria; o resto junto em "Outros". */
export function seriesDoGrafico(projetos: string[]): { chave: string; nome: string; cor: string; projetos: string[] }[] {
  const series = projetos.slice(0, CORES_DAS_SERIES.length).map((p, i) => ({ chave: p, nome: nomeDoProjeto(p), cor: CORES_DAS_SERIES[i], projetos: [p] }));
  const resto = projetos.slice(CORES_DAS_SERIES.length);
  if (resto.length > 0) series.push({ chave: OUTROS, nome: OUTROS, cor: COR_DE_OUTROS, projetos: resto });
  return series;
}

/** O topo do eixo: 1, 2 ou 5 vezes uma potência de 10, no mínimo 1 h. */
export function topoDoEixo(maximo: number): number {
  if (!(maximo > 1)) return 1;
  const base = 10 ** Math.floor(Math.log10(maximo));
  return ([1, 2, 5, 10].map((m) => m * base).find((v) => v >= maximo) ?? 10 * base);
}

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: ReactNode }) {
  return (
    <div className={`${CARTAO} min-w-0 px-4 py-3`}>
      <p className="text-sm text-texto-2">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold text-texto">{valor}</p>
      {detalhe ? <p className="mt-0.5 text-xs text-texto-2">{detalhe}</p> : null}
    </div>
  );
}

function textoDaSemana(s: SemanaDoProgresso, series: ReturnType<typeof seriesDoGrafico>): string {
  const partes = series
    .map((serie) => ({ nome: serie.nome, h: serie.projetos.reduce((t, p) => t + (s.horasPorProjeto[p] ?? 0), 0) }))
    .filter((p) => p.h > 0)
    .map((p) => `${p.nome} ${horas(p.h)}`);
  const porProjeto = partes.length > 1 ? ` (${partes.join(", ")})` : "";
  return `Semana de ${diaMes(s.inicio)}: ${horas(s.horas)}${porProjeto} · ${plural(s.tarefas, "tarefa", "tarefas")} · ${plural(s.prs, "PR", "PRs")}`;
}

/** As horas entregues por semana: colunas empilhadas, uma cor por projeto, com a leitura da semana apontada. */
function GraficoDasHoras({ progresso }: { progresso: Progresso }) {
  const { semanas } = progresso;
  const series = seriesDoGrafico(progresso.projetos);
  const [apontada, setApontada] = useState<number | null>(null);
  const topo = topoDoEixo(Math.max(...semanas.map((s) => s.horas)));
  const marcas = [topo, topo / 2, 0];
  const leitura = semanas[apontada ?? semanas.length - 1];
  return (
    <section aria-labelledby="progresso-grafico" className="min-w-0">
      <h2 id="progresso-grafico" className="mb-2 text-sm font-medium text-texto-2">
        Horas entregues por semana (as últimas {SEMANAS_NO_GRAFICO})
      </h2>
      <div className={`${CARTAO} min-w-0 p-4`}>
        {series.length > 1 && (
          <ul aria-label="Legenda" className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-texto-2">
            {series.map((s) => (
              <li key={s.chave} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className={`size-2.5 rounded-sm ${s.cor}`} />
                {s.nome}
              </li>
            ))}
          </ul>
        )}
        <p aria-live="polite" className="mb-3 min-h-10 text-sm text-texto">{textoDaSemana(leitura, series)}</p>
        <div aria-hidden="true" className="flex min-w-0 gap-2">
          <div className="flex h-40 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-texto-2">
            {marcas.map((m) => (
              <span key={m} className="-my-1.5 leading-3">{virgula(m)}</span>
            ))}
          </div>
          <div className="relative h-40 min-w-0 flex-1">
            {marcas.map((m) => (
              <div key={m} className="absolute inset-x-0 border-t border-borda" style={{ bottom: `${(m / topo) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end" onMouseLeave={() => setApontada(null)}>
              {semanas.map((s, i) => (
                <div
                  key={s.inicio}
                  data-semana={s.inicio}
                  onMouseEnter={() => setApontada(i)}
                  className={`flex h-full min-w-0 flex-1 items-end justify-center ${apontada === i ? "bg-livre-fundo" : ""}`}
                >
                  <div className="flex w-full max-w-6 flex-col-reverse gap-[2px]" style={{ height: `${(s.horas / topo) * 100}%` }}>
                    {series.map((serie) => {
                      const h = serie.projetos.reduce((t, p) => t + (s.horasPorProjeto[p] ?? 0), 0);
                      return h > 0 ? <div key={serie.chave} className={`min-h-[2px] ${serie.cor} last:rounded-t-[4px]`} style={{ flexGrow: h, flexBasis: 0 }} /> : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="mt-1 flex min-w-0 gap-2">
          <span className="w-6 shrink-0" />
          <div className="flex min-w-0 flex-1">
            {semanas.map((s, i) => (
              <span key={s.inicio} className="min-w-0 flex-1 text-center text-[11px] tabular-nums text-texto-2">
                {(semanas.length - 1 - i) % 3 === 0 ? diaMes(s.inicio) : ""}
              </span>
            ))}
          </div>
        </div>
        <details className="mt-3 min-w-0">
          <summary className={`inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-texto underline underline-offset-2 ${FOCO}`}>Ver em tabela</summary>
          <TabelaDasSemanas semanas={semanas} />
        </details>
      </div>
    </section>
  );
}

function TabelaDasSemanas({ semanas }: { semanas: SemanaDoProgresso[] }) {
  return (
    <table className="mt-2 w-full text-sm">
      <caption className="sr-only">Horas, tarefas feitas e PRs mesclados por semana</caption>
      <thead>
        <tr className="text-left text-xs text-texto-2">
          <th scope="col" className="py-1 font-medium">Semana de</th>
          <th scope="col" className="py-1 text-right font-medium">Horas</th>
          <th scope="col" className="py-1 text-right font-medium">Tarefas</th>
          <th scope="col" className="py-1 text-right font-medium">PRs</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-borda tabular-nums">
        {[...semanas].reverse().map((s) => (
          <tr key={s.inicio}>
            <th scope="row" className="py-1.5 text-left font-normal">{dataCompleta(s.inicio)}</th>
            <td className="py-1.5 text-right">{horas(s.horas)}</td>
            <td className="py-1.5 text-right">{s.tarefas}</td>
            <td className="py-1.5 text-right">{s.prs}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EstimadoReal({ progresso }: { progresso: Progresso }) {
  return (
    <section aria-labelledby="progresso-estimado" className="min-w-0">
      <h2 id="progresso-estimado" className="mb-2 text-sm font-medium text-texto-2">Estimado × real</h2>
      <div className={`${CARTAO} min-w-0`}>
        <p className="px-4 pt-3 text-xs text-texto-2">
          O real é o tempo corrido de pegar a tarefa até abrir o PR (as {MAXIMO_DO_ESTIMADO_REAL} mais recentes).
        </p>
        {progresso.estimadoReal.length === 0 ? (
          <p className="px-4 py-3 text-sm text-texto-2">Ainda nenhuma tarefa com as duas datas (pegou e abriu o PR).</p>
        ) : (
          <ul className="divide-y divide-borda">
            {progresso.estimadoReal.map((e) => (
              <li key={`${e.repositorio}#${e.numero}`} className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5">
                <a href={e.url} target="_blank" rel="noopener noreferrer" className={`min-w-0 break-words text-sm text-texto underline underline-offset-2 ${FOCO}`}>
                  {e.repositorio === SSACE ? "" : `${nomeDoProjeto(e.repositorio)} `}#{e.numero} {e.titulo}
                  <span className="sr-only"> (abre no GitHub, em aba nova)</span>
                </a>
                <span className="shrink-0 text-sm tabular-nums text-texto-2">
                  Estimativa {e.estimativaHoras === undefined ? "—" : horas(e.estimativaHoras)} · Real {textoDoTempo(e.realMs)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Conquistas({ progresso }: { progresso: Progresso }) {
  return (
    <section aria-labelledby="progresso-conquistas" className="min-w-0">
      <h2 id="progresso-conquistas" className="mb-2 text-sm font-medium text-texto-2">Conquistas</h2>
      {progresso.conquistas.length === 0 ? (
        <p className={`${CARTAO} px-4 py-3 text-sm text-texto-2`}>A primeira chega com a primeira tarefa feita.</p>
      ) : (
        <ul className={`${CARTAO} min-w-0 divide-y divide-borda`}>
          {[...progresso.conquistas].reverse().map((c) => (
            <li key={c.id} className="flex min-w-0 items-center gap-3 px-4 py-2.5">
              <Award aria-hidden="true" className="size-5 shrink-0 text-destaque" />
              <span className="min-w-0 flex-1 break-words text-sm text-texto">{c.titulo}</span>
              <span className="shrink-0 text-xs tabular-nums text-texto-2">{dataCompleta(c.dia)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Proporcoes({ titulo, itens, nome }: { titulo: string; itens: Progresso["areas"]; nome: (n: string) => string }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-1.5 text-xs font-medium text-texto-2">{titulo}</h3>
      <ul className="space-y-2">
        {itens.map((i) => (
          <li key={i.nome} className="min-w-0">
            <div className="flex min-w-0 justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-texto">{nome(i.nome)}</span>
              <span className="shrink-0 tabular-nums text-texto-2">
                {plural(i.tarefas, "tarefa", "tarefas")} ({Math.round(i.proporcao * 100)}%)
              </span>
            </div>
            <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-full bg-livre-fundo">
              <div className="h-full rounded-full bg-destaque" style={{ width: `${Math.round(i.proporcao * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OndeTrabalhou({ progresso }: { progresso: Progresso }) {
  return (
    <section aria-labelledby="progresso-onde" className="min-w-0">
      <h2 id="progresso-onde" className="mb-2 text-sm font-medium text-texto-2">Onde já trabalhou</h2>
      <div className={`${CARTAO} grid min-w-0 gap-4 p-4 sm:grid-cols-2`}>
        {progresso.totalTarefas === 0 ? (
          <p className="text-sm text-texto-2">Aparece depois da primeira tarefa feita.</p>
        ) : (
          <>
            <Proporcoes titulo="Áreas" itens={progresso.areas} nome={(n) => n} />
            <Proporcoes titulo="Projetos" itens={progresso.ondeTrabalhou} nome={nomeDoProjeto} />
          </>
        )}
      </div>
    </section>
  );
}

/** O conteúdo, a partir do estado da busca (separado da busca pra dar pra testar sem rede). */
export function ConteudoDoMeuProgresso({ estado, agora, tentarDeNovo }: { estado: EstadoDoMeuProgresso; agora: Date; tentarDeNovo?: () => void }) {
  if (estado.tipo === "carregando") {
    return (
      <p role="status" aria-busy="true" className={`${CARTAO} mt-6 px-4 py-4 text-sm text-texto-2`}>
        Buscando o progresso no GitHub…
      </p>
    );
  }
  if (estado.tipo === "fora") {
    return (
      <p role="alert" className={`${CARTAO} mt-6 px-4 py-4 text-sm`}>
        A sessão acabou. Recarregue a página e entre de novo.
      </p>
    );
  }
  if (estado.tipo === "recusado") {
    return (
      <p role="alert" className={`${CARTAO} mt-6 px-4 py-4 text-sm`}>
        Cada pessoa vê só o próprio progresso. <a href="/meu-progresso" className={`font-medium underline underline-offset-2 ${FOCO}`}>Ver o seu</a>.
      </p>
    );
  }
  if (estado.tipo === "erro") {
    return (
      <div role="alert" className={`${CARTAO} mt-6 flex min-w-0 flex-col items-start gap-3 px-4 py-4`}>
        <p className="min-w-0 break-words text-sm text-texto">{estado.mensagem}</p>
        {tentarDeNovo && (
          <button type="button" onClick={tentarDeNovo} className={BOTAO_CONTORNO}>
            <RotateCw aria-hidden="true" className="size-4" />
            Tentar de novo
          </button>
        )}
      </div>
    );
  }
  const p = montarProgresso(estado.resposta, agora);
  return (
    <div className="mt-6 min-w-0 space-y-6">
      {estado.resposta.cortada && (
        <p role="status" className="min-w-0 break-words rounded-xl border border-borda bg-revisao-fundo px-4 py-2 text-sm text-revisao">
          Muitas entregas pra olhar de uma vez: os números podem estar incompletos.
        </p>
      )}
      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Horas entregues" valor={horas(p.totalHoras)} detalhe={`${horas(p.horasDaSemana)} esta semana${p.semEstimativa > 0 ? ` · ${p.semEstimativa} sem estimativa` : ""}`} />
        <Numero rotulo="Tarefas feitas" valor={String(p.totalTarefas)} detalhe={`${p.semanas[p.semanas.length - 1].tarefas} nesta semana`} />
        <Numero rotulo="PRs mesclados" valor={String(p.totalPrs)} detalhe={`${p.semanas[p.semanas.length - 1].prs} nesta semana`} />
        <Numero rotulo="Sequência" valor={plural(p.sequencia, "semana", "semanas")} detalhe="seguidas com alguma entrega" />
      </div>
      <GraficoDasHoras progresso={p} />
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <EstimadoReal progresso={p} />
        <Conquistas progresso={p} />
      </div>
      <OndeTrabalhou progresso={p} />
    </div>
  );
}

/** Só pra Sofia (o worker manda `pessoas` só pra ela): de quem ver. Um formulário comum: muda o ?pessoa= do endereço. */
function EscolherPessoa({ pessoas, atual }: { pessoas: string[]; atual: string }) {
  // O GitHub não liga pra maiúscula no login: "Tiago" no endereço é o "tiago" da lista.
  const achada = pessoas.find((p) => p.toLowerCase() === atual.toLowerCase());
  const escolhida = achada ?? atual;
  return (
    <form method="get" action="/meu-progresso" className="flex min-w-0 flex-wrap items-end gap-2">
      <label className="flex min-w-0 flex-col gap-1 text-sm text-texto-2">
        Ver o progresso de
        {pessoas.length > 0 ? (
          <select name="pessoa" defaultValue={escolhida} className={`min-h-11 min-w-0 rounded-lg border border-borda bg-cartao px-3 text-sm text-texto ${FOCO}`}>
            {(achada ? pessoas : [atual, ...pessoas]).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ) : (
          <input name="pessoa" defaultValue={atual} autoComplete="off" className={`min-h-11 min-w-0 rounded-lg border border-borda bg-cartao px-3 text-sm text-texto ${FOCO}`} />
        )}
      </label>
      <button type="submit" className={BOTAO_CONTORNO}>
        Ver
      </button>
    </form>
  );
}

/** Dados de exemplo (só no `npm run dev`, sem login): uma pessoa inventada. */
export function progressoDeExemplo(agora: Date): RespostaDoMeuProgresso {
  const dias = (n: number, h = 15) => new Date(agora.getTime() - n * 86_400_000 + (h - 15) * 3_600_000).toISOString();
  const t = (n: number, numero: number, extra: Partial<RespostaDoMeuProgresso["tarefas"][number]> = {}) => ({
    repositorio: SSACE,
    numero,
    titulo: `Tarefa de exemplo ${numero}`,
    url: `https://github.com/sakura-corp/sakura-system-ace/issues/${numero}`,
    feitaEm: dias(n),
    estimativaHoras: 4,
    chefe: "frontend",
    pegouEm: dias(n + 2),
    prAbertoEm: dias(n + 1),
    ...extra,
  });
  return {
    login: "carla-exemplo",
    tarefas: [
      t(80, 501, { chefe: "tester", estimativaHoras: 2 }),
      t(60, 512),
      t(45, 530, { chefe: "backend", estimativaHoras: 6 }),
      t(30, 548, { estimativaHoras: undefined }),
      t(22, 3, { repositorio: "ar-condicionado", url: "https://github.com/sakura-corp/ar-condicionado/issues/3", estimativaHoras: 5 }),
      t(15, 601, { estimativaHoras: 8 }),
      t(8, 650, { chefe: "backend", estimativaHoras: 3 }),
      t(7, 4, { repositorio: "ar-condicionado", url: "https://github.com/sakura-corp/ar-condicionado/issues/4", estimativaHoras: 2 }),
      t(1, 699, { estimativaHoras: 6 }),
    ],
    prs: [1, 7, 8, 15, 22, 45, 60].map((n, i) => ({ repositorio: SSACE, numero: 700 + i, mescladoEm: dias(n) })),
  };
}

type Props = {
  /** Sem login (só no `npm run dev`): mostra dados de exemplo. */
  semLogin?: boolean;
  /** Quem está logado (a página só usa pra saber se está olhando o próprio). */
  login?: string;
  /** O ?pessoa= do endereço. */
  busca?: string;
  agora?: Date;
  /** Só nos testes: em vez de buscar no worker. */
  estado?: EstadoDoMeuProgresso;
  buscar?: Buscar;
};

/** A página inteira: cabeçalho, a escolha da pessoa (só pra Sofia) e os números. */
export function PaginaMeuProgresso({ semLogin = false, login, busca = "", agora = new Date(), estado: estadoFixo, buscar = fetch }: Props) {
  const pessoa = pessoaDaBusca(busca);
  const [buscado, tentarDeNovo] = useMeuProgresso(!semLogin && estadoFixo === undefined, pessoa, buscar);
  const [exemplo] = useState<EstadoDoMeuProgresso>(() => ({ tipo: "pronto", resposta: progressoDeExemplo(agora) }));
  const estado = estadoFixo ?? (semLogin ? exemplo : buscado);
  // De quem são os números: só o que o worker devolveu (carregando ou recusado, nunca o nome pedido no endereço).
  const deQuem = estado.tipo === "pronto" ? estado.resposta.login : (login ?? "");
  const outraPessoa = deQuem !== "" && login !== undefined && deQuem.toLowerCase() !== login.toLowerCase();
  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl">
      <CabecalhoDaPagina
        titulo={outraPessoa ? `Progresso de ${deQuem}` : "Meu progresso"}
        explicacao={
          outraPessoa
            ? "O que essa pessoa entregou ao longo do tempo, em todos os projetos. Só você vê o de outra pessoa."
            : "O que você entregou ao longo do tempo, em todos os projetos. Só você (e a Sofia) vê estes números."
        }
        acoes={estado.tipo === "pronto" && estado.resposta.pessoas ? <EscolherPessoa pessoas={estado.resposta.pessoas} atual={deQuem} /> : undefined}
      />
      {semLogin && <p className="mt-3 text-xs text-texto-2">Dados de exemplo: ainda sem ligação com o GitHub.</p>}
      <ConteudoDoMeuProgresso estado={estado} agora={agora} tentarDeNovo={tentarDeNovo} />
    </div>
  );
}

/** O cartão pequeno do Início: horas da semana, sequência e a última conquista, levando à página. */
export function CartaoDoMeuProgresso({ estado, agora }: { estado: EstadoDoMeuProgresso; agora: Date }) {
  let corpo: ReactNode;
  if (estado.tipo === "pronto") {
    const p = montarProgresso(estado.resposta, agora);
    const ultima = p.conquistas[p.conquistas.length - 1];
    corpo = (
      <>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-texto-2">Esta semana</dt>
            <dd className="text-xl font-semibold text-texto">{horas(p.horasDaSemana)}</dd>
          </div>
          <div>
            <dt className="text-xs text-texto-2">Sequência</dt>
            <dd className="text-xl font-semibold text-texto">{plural(p.sequencia, "semana", "semanas")}</dd>
          </div>
        </dl>
        {ultima && (
          <p className="mt-3 flex min-w-0 items-center gap-2 text-sm text-texto">
            <Award aria-hidden="true" className="size-4 shrink-0 text-destaque" />
            <span className="min-w-0 break-words">Última conquista: {ultima.titulo}</span>
          </p>
        )}
      </>
    );
  } else if (estado.tipo !== "carregando") {
    corpo = <p className="text-sm text-texto-2">Não deu pra buscar agora.</p>;
  } else {
    corpo = (
      <p role="status" className="text-sm text-texto-2">
        Carregando…
      </p>
    );
  }
  return (
    <section aria-labelledby="inicio-progresso" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4">
        <h2 id="inicio-progresso" className="text-sm font-medium text-texto-2">Meu progresso</h2>
        <a href="/meu-progresso" className={`inline-flex min-h-11 items-center text-sm font-medium text-texto underline underline-offset-2 ${FOCO}`}>
          Ver tudo
        </a>
      </div>
      <div className={`${CARTAO} min-w-0 p-4`}>{corpo}</div>
    </section>
  );
}
