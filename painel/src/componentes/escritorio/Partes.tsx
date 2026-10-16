import { useId, type CSSProperties } from "react";
import {
  agentesDaEquipe, contarAgentes, haQuantoTempo, limitarProgresso, linkSeguro, NOME_DO_MODELO, pontosDoMiniGrafico,
  quadroDoDia, ROTULO_DO_ESTADO, textoDaContagem, type AgenteComEstado,
} from "../../logica/escritorio";
import type { Equipe, TarefaDoEscritorio } from "../../tipos";

export const DEPENDE = "em breve, depende de ligar os agentes de verdade";

const cor = (c: string) => ({ "--cor": c }) as CSSProperties;

export function EtiquetaDaEquipe({ equipe }: { equipe?: Equipe }) {
  if (!equipe) return null;
  return (
    <span className="esc-equipe" style={cor(equipe.cor)}>
      <i aria-hidden="true" />
      {equipe.nome}
    </span>
  );
}

function AnelDeProgresso({ progresso }: { progresso: number }) {
  const r = 14;
  const volta = 2 * Math.PI * r;
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
      <circle className="esc-anel-fundo" cx="19" cy="19" r={r} />
      <circle
        className="esc-anel-cheio" cx="19" cy="19" r={r} transform="rotate(-90 19 19)"
        strokeDasharray={`${(volta * progresso) / 100} ${volta}`}
      />
      <text className="esc-anel-texto" x="19" y="22.5" textAnchor="middle">{progresso}</text>
    </svg>
  );
}

function Titulo({ tarefa }: { tarefa: TarefaDoEscritorio }) {
  const url = linkSeguro(tarefa.url);
  return url ? (
    <a className="esc-item-titulo esc-link" href={url} target="_blank" rel="noopener noreferrer">
      {tarefa.titulo}
      <span className="sr-only"> (abre no GitHub, em aba nova)</span>
    </a>
  ) : (
    <span className="esc-item-titulo">{tarefa.titulo}</span>
  );
}

/** Quadro de tarefas do dia: Rodando, Esperando você, Feitas hoje. */
export function QuadroDoDia({
  tarefas, equipes, agora, titulo = "Tarefas de hoje",
}: { tarefas: TarefaDoEscritorio[]; equipes: Equipe[]; agora: Date; titulo?: string }) {
  const q = quadroDoDia(tarefas, agora);
  const base = useId(); // o mesmo quadro pode aparecer duas vezes na página (ids não podem se repetir)
  const eq = (id: string) => equipes.find((e) => e.id === id);
  return (
    <section className="esc-vidro esc-quadro" aria-label={titulo}>
      <h2>{titulo} <span className="esc-sub">(exemplo)</span></h2>

      {q.rodando.length > 0 && <div className="esc-grupo">
        <h3>Rodando · {q.rodando.length}</h3>
        <ul className="esc-grupo">
          {q.rodando.map((t) => {
            const p = limitarProgresso(t.progresso);
            return (
              <li key={t.id} className="esc-item">
                <AnelDeProgresso progresso={p} />
                <Titulo tarefa={t} />
                <span className="esc-item-linha">
                  <EtiquetaDaEquipe equipe={eq(t.equipe)} />
                  <span>{p}% feito</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>}

      {q.esperando.length > 0 && <div className="esc-grupo">
        <h3>Esperando você · {q.esperando.length}</h3>
        <ul className="esc-grupo">
          {q.esperando.map((t) => (
            <li key={t.id} className="esc-item">
              <span className="esc-estado e-precisa" aria-hidden="true">!</span>
              <Titulo tarefa={t} />
              <span className="esc-item-linha">
                <EtiquetaDaEquipe equipe={eq(t.equipe)} />
                <span>precisa da sua aprovação</span>
              </span>
              <span className="esc-botoes">
                <button type="button" className="esc-botao esc-botao-forte" disabled aria-describedby={`${base}-breve-${t.id}`}>Aprovar</button>
                <button type="button" className="esc-botao" disabled aria-describedby={`${base}-breve-${t.id}`}>Revisar</button>
                <span id={`${base}-breve-${t.id}`} className="esc-breve">{DEPENDE}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>}

      {q.feitasHoje.length > 0 && <div className="esc-grupo">
        <h3>Feitas hoje · {q.feitasHoje.length}</h3>
        <ul className="esc-grupo">
          {q.feitasHoje.map((t) => (
            <li key={t.id} className="esc-item">
              <span className="esc-visto" aria-hidden="true">✓</span>
              <Titulo tarefa={t} />
              <span className="esc-item-linha">
                <EtiquetaDaEquipe equipe={eq(t.equipe)} />
                <span>feita {haQuantoTempo(t.feitaEm!, agora)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>}

      {q.total === 0 && <p className="esc-sub">Nenhuma tarefa hoje.</p>}
    </section>
  );
}

function Numero({ rotulo, serie, unidade = "" }: { rotulo: string; serie: number[]; unidade?: string }) {
  const atual = serie.at(-1) ?? 0;
  return (
    <div className="esc-numero">
      <strong>{atual}{unidade}</strong>
      <span>{rotulo}</span>
      <svg width="100%" height="22" viewBox="0 0 80 22" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={pontosDoMiniGrafico(serie, 80, 18)} transform="translate(0 2)" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="sr-only">nos últimos {serie.length} dias: {serie.join(", ")}</span>
    </div>
  );
}

type AbaDoPainel = "visao" | "tarefas";

/** O painel lateral de uma sala: Visão geral e Tarefas (Agenda e Ajustes em breve). */
export function PainelDaSala({
  equipe, agentes, tarefas, equipes, agora, aba, aoTrocarAba, aoFechar,
}: {
  equipe: Equipe | undefined; agentes: AgenteComEstado[]; tarefas: TarefaDoEscritorio[]; equipes: Equipe[]; agora: Date;
  aba: AbaDoPainel; aoTrocarAba: (a: AbaDoPainel) => void; aoFechar: () => void;
}) {
  if (!equipe) {
    return (
      <aside className="esc-vidro esc-quadro" aria-label="Detalhes da sala">
        <h2>Detalhes da sala</h2>
        <p className="esc-sub">Clique numa sala do mapa (ou na lista) pra ver os agentes, os números e as skills dela.</p>
      </aside>
    );
  }
  const daSala = agentesDaEquipe(agentes, equipe.id);
  const conta = contarAgentes(daSala);
  const tarefasDaSala = tarefas.filter((t) => t.equipe === equipe.id);
  const idPainel = `painel-sala-${aba}`;

  return (
    <aside className="esc-vidro esc-quadro" aria-label={`Detalhes da sala ${equipe.nome}`} style={cor(equipe.cor)}>
      <div className="esc-cabeca-sala">
        <div>
          <h2><i aria-hidden="true" />{equipe.nome}</h2>
          <p className="esc-sub">{textoDaContagem(conta)} · líder: {equipe.lider}</p>
        </div>
        <button type="button" className="esc-fechar" onClick={aoFechar}>Fechar</button>
      </div>

      <div className="esc-abas" role="tablist" aria-label="Partes da sala">
        {(["visao", "tarefas"] as AbaDoPainel[]).map((a) => (
          <button
            key={a} type="button" role="tab" className="esc-aba" aria-selected={aba === a} aria-controls={idPainel}
            onClick={() => aoTrocarAba(a)}
          >
            {a === "visao" ? "Visão geral" : `Tarefas (${tarefasDaSala.length})`}
          </button>
        ))}
        <span className="esc-aba-breve" aria-disabled="true">Agenda <small>· em breve</small></span>
        <span className="esc-aba-breve" aria-disabled="true">Ajustes <small>· em breve</small></span>
      </div>

      <div id={idPainel} role="tabpanel" className="esc-grupo" style={{ gap: 14 }}>
        {aba === "visao" ? (
          <>
            <div className="esc-numeros">
              <Numero rotulo="Tarefas hoje" serie={equipe.numeros.tarefasHoje} />
              <Numero rotulo="Rodando" serie={equipe.numeros.rodando} />
              <Numero rotulo="Tempo médio" serie={equipe.numeros.tempoMedioMin} unidade=" min" />
            </div>

            <div className="esc-grupo">
              <h3>Agentes · {daSala.length}</h3>
              <ul className="esc-grupo">
                {daSala.map((a) => <LinhaDoAgente key={a.id} agente={a} agora={agora} />)}
              </ul>
            </div>

            <div className="esc-grupo">
              <h3>Ferramentas conectadas · {equipe.ferramentas.length} (exemplo)</h3>
              <ul className="esc-ferramentas">
                {equipe.ferramentas.map((f) => (
                  <li key={f} className="esc-ferramenta">{f}<span>de exemplo, não conectada</span></li>
                ))}
              </ul>
            </div>

            <div className="esc-grupo">
              <h3>Skills rodando em paralelo · {equipe.skills.length} (exemplo)</h3>
              {equipe.skills.length === 0 ? (
                <p className="esc-sub">Nenhuma skill rodando agora.</p>
              ) : (
                <ul className="esc-grupo">
                  {equipe.skills.map((s) => {
                    const p = limitarProgresso(s.progresso);
                    return (
                      <li key={s.nome} className="esc-skill">
                        <span className="esc-skill-linha"><span>{s.nome}</span><span className="esc-sub">{p}%</span></span>
                        <div className="esc-barra" role="progressbar" aria-label={s.nome} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p}>
                          <div style={{ width: `${p}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        ) : tarefasDaSala.length === 0 ? (
          <p className="esc-sub">Nenhuma tarefa desta sala hoje.</p>
        ) : (
          <QuadroDoDia tarefas={tarefasDaSala} equipes={equipes} agora={agora} titulo={`Tarefas de ${equipe.nome}`} />
        )}
      </div>
    </aside>
  );
}

export function LinhaDoAgente({ agente, agora }: { agente: AgenteComEstado; agora: Date }) {
  const url = linkSeguro(agente.url);
  return (
    <li className={`esc-agente e-${agente.estado}`}>
      <i aria-hidden="true" />
      <span>
        <strong>{agente.nome}</strong> · <span className="esc-estado">{ROTULO_DO_ESTADO[agente.estado]}</span>
      </span>
      <span className="linha">
        {agente.fazendo} · {haQuantoTempo(agente.ultimaAtividade, agora)} · {NOME_DO_MODELO[agente.modelo]}
        {url && (
          <>
            {" · "}
            <a className="esc-link" href={url} target="_blank" rel="noopener noreferrer">
              abrir no GitHub<span className="sr-only"> (em aba nova)</span>
            </a>
          </>
        )}
      </span>
    </li>
  );
}

/** O escritório inteiro em texto: é a versão do celular e do leitor de tela. */
export function ListaDoEscritorio({
  equipes, agentes, agora, salaAberta, aoAbrirSala,
}: { equipes: Equipe[]; agentes: AgenteComEstado[]; agora: Date; salaAberta: string | null; aoAbrirSala: (id: string) => void }) {
  return (
    <section className="esc-vidro esc-lista" aria-labelledby="esc-lista-titulo">
      <h2 id="esc-lista-titulo" className="esc-rotulo">O escritório em lista</h2>
      {equipes.map((eq) => {
        const daSala = agentesDaEquipe(agentes, eq.id);
        return (
          <div key={eq.id} className="esc-lista-sala">
            <h3 style={{ margin: 0 }}>
              <button
                type="button" className="esc-lista-botao" style={cor(eq.cor)} aria-pressed={salaAberta === eq.id}
                onClick={() => aoAbrirSala(eq.id)}
              >
                <i aria-hidden="true" />
                <strong>{eq.nome}</strong>
                <span className="esc-sub">{textoDaContagem(contarAgentes(daSala))}</span>
              </button>
            </h3>
            <ul className="esc-grupo">
              {daSala.map((a) => <LinhaDoAgente key={a.id} agente={a} agora={agora} />)}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

export function Avisos({ avisos, equipes }: { avisos: { equipe: string; texto: string }[]; equipes: Equipe[] }) {
  return (
    <section className="esc-avisos" aria-label="Avisos ao vivo (exemplo)">
      <h2 className="esc-rotulo">Ao vivo (exemplo)</h2>
      <ul className="esc-grupo">
        {avisos.map((a, i) => {
          const eq = equipes.find((e) => e.id === a.equipe);
          return (
            <li key={i} className="esc-vidro esc-aviso" style={cor(eq?.cor ?? "#B7A3AE")}>
              <i aria-hidden="true" />
              <span><strong>{eq?.nome}</strong>: {a.texto}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
