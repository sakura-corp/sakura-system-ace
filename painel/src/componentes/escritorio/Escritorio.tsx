import "@fontsource-variable/plus-jakarta-sans";
import "./escritorio.css";
import { useEffect, useRef, useState } from "react";
import {
  avisosDeExemplo, agentesDeExemplo, equipesDeExemplo, NOTAS_DO_CEREBRO_NO_EXEMPLO, QUEM_ESTA_OLHANDO_NO_EXEMPLO,
  tarefasDoEscritorioDeExemplo,
} from "../../dados/exemplo-escritorio";
import { comEstado, contarAgentes, contarPorModelo, linkSeguro, NOME_DO_MODELO, quadroDoDia, textoDaContagem } from "../../logica/escritorio";
import { CabecalhoDaPagina } from "../CabecalhoDaPagina";
import { Mapa } from "./Mapa";
import { Avisos, DEPENDE, ListaDoEscritorio, PainelDaSala, QuadroDoDia } from "./Partes";

type Aba = "escritorio" | "tarefas" | "cerebro";
const ABAS: Aba[] = ["escritorio", "tarefas", "cerebro"];
const DOCS = "https://github.com/sakura-corp/sakura-system-ace/tree/main/docs";

/** O Escritório de agentes, com DADOS DE EXEMPLO (docs/painel.md, "Escritório de agentes"). */
export function Escritorio({ agora = new Date() }: { agora?: Date }) {
  const [aba, setAba] = useState<Aba>("escritorio");
  const [salaAberta, setSalaAberta] = useState<string | null>(null);
  const [abaDoPainel, setAbaDoPainel] = useState<"visao" | "tarefas">("visao");

  // Em tela estreita o painel da sala fica embaixo da lista: ao abrir uma sala, a página rola até ele.
  const painelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (salaAberta === null || typeof window === "undefined" || !window.matchMedia?.("(max-width: 1199px)").matches) return;
    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    painelRef.current?.scrollIntoView({ block: "start", behavior: semMovimento ? "auto" : "smooth" });
  }, [salaAberta]);

  const equipes = equipesDeExemplo;
  const agentes = comEstado(agentesDeExemplo(agora), agora, QUEM_ESTA_OLHANDO_NO_EXEMPLO);
  const tarefas = tarefasDoEscritorioDeExemplo(agora);
  const conta = contarAgentes(agentes);
  const totalDoQuadro = quadroDoDia(tarefas, agora).total;

  const abrirSala = (id: string) => {
    setSalaAberta(id);
    setAbaDoPainel("visao");
  };
  const nomeDaAba = (a: Aba) => (a === "escritorio" ? "Escritório" : a === "tarefas" ? `Tarefas (${totalDoQuadro})` : "Cérebro");

  return (
    <>
      {/* O cabeçalho fica fora da janela escura (.esc): lá dentro as cores do painel não valem. */}
      <CabecalhoDaPagina
        trilha="1º · Produção"
        titulo="Escritório de agentes"
        explicacao="Os agentes do Claude trabalhando, por equipe."
        idDoTitulo="esc-titulo"
        acoes={<span className="rounded-full bg-revisao-fundo px-2 py-0.5 text-[11px] font-bold tracking-wider text-revisao uppercase">exemplo</span>}
      />
      <section className="esc mt-6" aria-labelledby="esc-titulo">
        <header className="esc-topo">
          <div className="esc-abas" role="tablist" aria-label="Vistas do escritório">
            {ABAS.map((a) => (
              <button
                key={a} type="button" role="tab" id={`aba-${a}`} className="esc-aba" aria-selected={aba === a} aria-controls="esc-vista"
                onClick={() => setAba(a)}
              >
                {nomeDaAba(a)}
              </button>
            ))}
            <span className="esc-aba-breve" aria-disabled="true">Agenda <small>· {DEPENDE}</small></span>
          </div>
          <div className="esc-direita">
            <input className="esc-busca" type="search" disabled placeholder="Perguntar a um agente… (em breve)" aria-label="Perguntar a um agente (em breve)" />
            <span className="esc-pilula"><i aria-hidden="true" />{textoDaContagem(conta)}</span>
          </div>
        </header>

        <p className="esc-aviso-exemplo">
          Tudo nesta página é <strong>de exemplo</strong>: nenhum agente de verdade está rodando, nenhuma sessão é aberta e nenhum
          token é gasto. {conta.precisam > 0 && <>No exemplo, <strong>{conta.precisam} agentes precisam de você</strong>.</>}
        </p>

        <div id="esc-vista" role="tabpanel" aria-labelledby={`aba-${aba}`}>
          {aba === "escritorio" && (
            <div className="esc-corpo">
              <div className="esc-area-mapa">
                <Avisos avisos={avisosDeExemplo} equipes={equipes} />
                <div className="esc-vidro esc-mapa-caixa">
                  <Mapa
                    equipes={equipes} agentes={agentes} notasDoCerebro={NOTAS_DO_CEREBRO_NO_EXEMPLO} salaAberta={salaAberta}
                    aoAbrirSala={abrirSala} aoAbrirCerebro={() => setAba("cerebro")}
                  />
                  <p className="esc-legenda">
                    Roda em:{" "}
                    {contarPorModelo(agentes).map((m, i) => (
                      <span key={m.modelo}>{i > 0 && " · "}<strong>{NOME_DO_MODELO[m.modelo]}</strong> {m.quantos}</span>
                    ))}
                    {" "}(exemplo)
                  </p>
                </div>
              </div>
              <div className="esc-area-lista">
                <ListaDoEscritorio equipes={equipes} agentes={agentes} agora={agora} salaAberta={salaAberta} aoAbrirSala={abrirSala} />
              </div>
              <div className="esc-area-painel" ref={painelRef}>
                <PainelDaSala
                  equipe={equipes.find((e) => e.id === salaAberta)} agentes={agentes} tarefas={tarefas} equipes={equipes} agora={agora}
                  aba={abaDoPainel} aoTrocarAba={setAbaDoPainel} aoFechar={() => setSalaAberta(null)}
                />
              </div>
              <div className="esc-area-quadro">
                <QuadroDoDia tarefas={tarefas} equipes={equipes} agora={agora} />
              </div>
            </div>
          )}

          {aba === "tarefas" && <QuadroDoDia tarefas={tarefas} equipes={equipes} agora={agora} />}

          {aba === "cerebro" && (
            <div className="esc-vidro esc-cerebro-texto">
              <h2 className="esc-rotulo">O Cérebro (exemplo)</h2>
              <p>
                É a memória que todos os agentes leem antes de trabalhar. Hoje ela já existe: é o <strong>PROJETO_STATUS.md</strong> e a
                pasta <strong>docs/</strong> deste repositório. No exemplo, {NOTAS_DO_CEREBRO_NO_EXEMPLO} notas.
              </p>
              <ul>
                <li><strong>Decisões</strong>: docs/decisoes.md</li>
                <li><strong>Lições (padrões de bug)</strong>: docs/licoes.md</li>
                <li><strong>O painel</strong>: docs/painel.md</li>
                <li><strong>Pra onde o SSACE vai</strong>: docs/visao.md</li>
              </ul>
              <p>
                <a className="esc-link" href={linkSeguro(DOCS)} target="_blank" rel="noopener noreferrer">
                  Ver a pasta docs/ no GitHub<span className="sr-only"> (em aba nova)</span>
                </a>
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
