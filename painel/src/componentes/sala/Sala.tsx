import "@fontsource-variable/plus-jakarta-sans";
import "./sala.css";
import { useEffect, useId, useState } from "react";
import {
  agruparPorEstado, BALAO, fotoSegura, haQuantoTempo, iniciais, linkSeguro, montarSala, quantosPrecisam, ROTULO, textoPrecisam,
  TITULO_DO_GRUPO, type LevaDaSala,
} from "../../logica/sala";
import type { EstadoDaSala } from "../../logica/salaDados";
import { textoDaConexao, type SituacaoDoTempoReal } from "../../logica/tempoReal";
import type { Bonequinho, TipoBonequinho } from "../../tipos";

// "precisa" é o alvo do aviso "N coisas precisam de você" do topo.
const idDoGrupo = (estado: string) => (estado === "precisa" ? "precisa" : `sala-grupo-${estado}`);

const FILEIRAS: { tipo: TipoBonequinho; titulo: string; vazio: string }[] = [
  { tipo: "pessoa", titulo: "Pessoas", vazio: "Ninguém com tarefa nesta leva." },
  { tipo: "claude", titulo: "Robôs do Claude", vazio: "Nenhum robô do Claude agora." },
  { tipo: "casa", titulo: "Robôs da casa", vazio: "Nenhum robô da casa encontrado." },
];

/** Relógio que reage a si mesmo: `agoraFixo` (nos testes) para o relógio. */
function useRelogio(passoMs: number, agoraFixo?: Date, recalcularQuando?: unknown): Date {
  const [agora, setAgora] = useState(() => agoraFixo ?? new Date());
  useEffect(() => {
    if (agoraFixo) return;
    const t = setInterval(() => setAgora(new Date()), passoMs);
    return () => clearInterval(t);
  }, [passoMs, agoraFixo]);
  // Chegou dado novo: "há quanto tempo" e o "dormindo" partem de agora, não do último tique.
  useEffect(() => {
    if (!agoraFixo) setAgora(new Date());
  }, [recalcularQuando, agoraFixo]);
  return agoraFixo ?? agora;
}

/** Halo, anel e núcleo, com o símbolo do tipo: foto ou iniciais (pessoa), olhinhos (Claude) ou três traços (casa). */
function PontoDeLuz({ b }: { b: Bonequinho }) {
  const recorte = useId();
  const [fotoFalhou, setFotoFalhou] = useState(false);
  const foto = b.tipo === "pessoa" && !fotoFalhou ? fotoSegura(b.avatar) : undefined;
  return (
    <svg className="sala-luz" viewBox="0 0 58 58" aria-hidden="true">
      <circle className="halo" cx="29" cy="29" r="24" />
      <circle className="anel" cx="29" cy="29" r="27" />
      <circle className="nucleo" cx="29" cy="29" r="18" />
      {b.tipo === "pessoa" && foto && (
        <>
          <clipPath id={recorte}><circle cx="29" cy="29" r="18" /></clipPath>
          <image className="foto" href={foto} x="11" y="11" width="36" height="36" clipPath={`url(#${recorte})`} preserveAspectRatio="xMidYMid slice" onError={() => setFotoFalhou(true)} />
        </>
      )}
      {b.tipo === "pessoa" && !foto && <text className="iniciais" x="29" y="34.5" textAnchor="middle">{iniciais(b.nome)}</text>}
      {b.tipo === "claude" && (
        <>
          <circle className="marca" cx="23" cy="27" r="2.6" />
          <circle className="marca" cx="35" cy="27" r="2.6" />
          <path className="marca-traco" d="M23 35 Q29 39 35 35" />
        </>
      )}
      {b.tipo === "casa" && <path className="marca-traco" d="M22 23 H36 M22 29 H36 M22 35 H36" />}
    </svg>
  );
}

/** O que o link diz: quem precisa de você vê a ação (aprovar a rodada, revisar o PR), não só "abrir". */
function rotuloDoLink(b: Pick<Bonequinho, "tipo" | "estado">): string {
  if (b.estado === "precisa") return b.tipo === "casa" ? "Aprovar no GitHub" : "Revisar no GitHub";
  return "Abrir no GitHub";
}

/** O link pro GitHub, só se for da sakura-corp; senão o endereço aparece como texto, sem link. */
export function LinkOuTexto({ url, rotulo = "Abrir no GitHub" }: { url?: string; rotulo?: string }) {
  if (!url) return null;
  const seguro = linkSeguro(url);
  return seguro ? (
    <a className="sala-link" href={seguro} target="_blank" rel="noopener noreferrer">
      {rotulo}<span className="sr-only"> (em aba nova)</span>
    </a>
  ) : (
    <span className="sala-endereco">{url} (fora do GitHub da Sakura: sem link)</span>
  );
}

function Cartao({ b, agora }: { b: Bonequinho | undefined; agora: Date }) {
  return (
    <div className={`sala-vidro sala-cartao ${b ? `s-${b.estado}` : ""}`} aria-live="polite">
      {b ? (
        <>
          <strong>{b.nome}</strong>
          <p className="linha">
            <span className="sala-estado">{ROTULO[b.estado]}</span>
            {b.ultimaAtividade && ` · ${haQuantoTempo(b.ultimaAtividade, agora)}`}
          </p>
          {b.fazendo && <p>{b.fazendo}</p>}
          <LinkOuTexto url={b.url} rotulo={rotuloDoLink(b)} />
        </>
      ) : (
        <p className="linha">Clique num ponto de luz (ou Enter, pelo teclado) pra ver o cartão.</p>
      )}
    </div>
  );
}

/** A linha de conexão do topo (#468): ao vivo, reconectando… ou desatualizado. Tem o próprio relógio de 1 s. */
function LinhaDeConexao({ conexao, exemplo, agoraFixo }: { conexao?: SituacaoDoTempoReal; exemplo: boolean; agoraFixo?: Date }) {
  const agora = useRelogio(1000, agoraFixo);
  if (exemplo || !conexao) {
    return <span className="sala-conexao c-exemplo"><i aria-hidden="true" />dados de exemplo · sem ligação com o GitHub</span>;
  }
  return (
    <span className={`sala-conexao c-${conexao.estado}`} role="status">
      <i aria-hidden="true" />
      {textoDaConexao(conexao.estado, conexao.ultimaAtualizacao, agora.getTime())}
    </span>
  );
}

/** O aviso de um grupo cuja busca falhou: nunca vira "livre" (só dado de verdade). */
function AvisoDoGrupo({ titulo, tentarDeNovo, tentando }: { titulo: string; tentarDeNovo: () => void; tentando: boolean }) {
  return (
    <div className="sala-aviso" role="alert">
      <p>
        <strong>{titulo}:</strong> não consegui ler isto do GitHub.
      </p>
      <button type="button" className="sala-botao" onClick={tentarDeNovo} disabled={tentando}>
        {tentando ? "Tentando…" : "Tentar de novo"}
      </button>
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="sala-esqueleto" role="status" aria-label="Carregando a sala">
      {[0, 1, 2].map((i) => (
        <div key={i} className="sala-vidro sala-esqueleto-bloco" aria-hidden="true" />
      ))}
    </div>
  );
}

type Props = {
  /** O que /api/sala devolveu (ou o exemplo, só no `npm run dev`). */
  dados: EstadoDaSala;
  /** Quem está olhando: o "precisa de você" depende disso. */
  quemEstaOlhando: string;
  /** A leva atual e a fase dela (#645): em Relatório, o ponto da Sofia chama por ela. */
  levaAtual?: LevaDaSala;
  /** O estado da conexão (tempo real). Sem ele, é a sala de exemplo. */
  conexao?: SituacaoDoTempoReal;
  /** Busca de novo (grupo que falhou). */
  tentarDeNovo?: () => Promise<void> | void;
  /** Tentar de novo depois de um erro na primeira carga (mostra o esqueleto de novo). */
  recarregarTudo?: () => void;
  tv?: boolean;
  /** Só nos testes: trava o relógio. */
  agora?: Date;
};

/**
 * A Sala da Sakura (#467 e #468). Os dados vêm de fora (`dados`); os estados saem de `montarSala()`,
 * recalculados a cada minuto sem buscar (o "dormindo" muda sozinho).
 */
export function Sala({ dados, quemEstaOlhando, levaAtual, conexao, tentarDeNovo, recarregarTudo, tv = false, agora: agoraFixo }: Props) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [tentando, setTentando] = useState(false);
  const agora = useRelogio(60_000, agoraFixo, dados);
  const exemplo = conexao === undefined;

  const pronto = dados.tipo === "pronto" ? dados : null;
  const sala = pronto ? montarSala(pronto.entradas, agora, quemEstaOlhando, levaAtual) : [];
  const falhas = pronto?.falhas ?? [];
  const precisam = quantosPrecisam(sala);
  const escolhido = sala.find((b) => b.id === aberto);

  const tentar = async () => {
    setTentando(true);
    try {
      await tentarDeNovo?.();
    } finally {
      setTentando(false);
    }
  };

  const subtitulo = exemplo ? "Dados de exemplo" : pronto?.leva != null ? `Leva ${pronto.leva}` : "Painel da Sakura";

  return (
    <section className={`sala-j ${tv ? "sala-tv" : ""}`} aria-labelledby="sala-titulo" aria-busy={dados.tipo === "carregando"}>
      <header className="sala-topo">
        <div>
          {tv ? (
            <h1 id="sala-titulo">Sala</h1>
          ) : (
            // Fora do modo TV o h1 é o do cabeçalho da página (#545); o sala.css só estiliza o h1, daí as classes.
            <h2 id="sala-titulo" className="text-[1.35rem] font-bold tracking-[-0.01em]">Agora</h2>
          )}
          <p className="sala-sub">{subtitulo}</p>
        </div>
        <div className="sala-topo-direita">
          {precisam > 0 && (
            <a className="sala-pilula" href="#precisa">
              <i aria-hidden="true" />
              {textoPrecisam(precisam)}
            </a>
          )}
          <LinhaDeConexao conexao={conexao} exemplo={exemplo} agoraFixo={agoraFixo} />
        </div>
      </header>

      {dados.tipo === "carregando" && <Esqueleto />}

      {dados.tipo === "erro" && (
        <div className="sala-aviso" role="alert">
          <p>{dados.mensagem}</p>
          <button type="button" className="sala-botao" onClick={recarregarTudo}>Tentar de novo</button>
        </div>
      )}

      {pronto && (
        <>
          <div className="sala-desenho">
            <div className="sala-vidro sala-quadro" role="group" aria-label="A sala desenhada (a mesma informação está na lista)">
              {FILEIRAS.map((f) => {
                const doTipo = sala.filter((b) => b.tipo === f.tipo);
                return (
                  <div key={f.tipo}>
                    <p className="sala-fileira-titulo">{f.titulo}</p>
                    {falhas.includes(f.tipo) ? (
                      <AvisoDoGrupo titulo={f.titulo} tentarDeNovo={tentar} tentando={tentando} />
                    ) : doTipo.length === 0 ? (
                      <p className="sala-vazio">{f.vazio}</p>
                    ) : (
                      <div className="sala-fileira">
                        {doTipo.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            className={`sala-mesa s-${b.estado}`}
                            aria-pressed={aberto === b.id}
                            aria-label={`${b.nome}, ${ROTULO[b.estado]}${b.fazendo ? `, ${b.fazendo}` : ""}`}
                            onClick={() => setAberto(b.id)}
                          >
                            <PontoDeLuz b={b} />
                            <span className="nome">{b.nome}</span>
                            <span className="faz">{b.fazendo}</span>
                            {BALAO[b.estado] && <span className="sala-balao">{BALAO[b.estado]}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {!tv && <Cartao b={escolhido} agora={agora} />}
          </div>

          {!tv && (
            <>
              <div className="sala-lista">
                {agruparPorEstado(sala).map((g) => (
                  <section key={g.estado} aria-labelledby={idDoGrupo(g.estado)}>
                    <h2 id={idDoGrupo(g.estado)}>
                      {TITULO_DO_GRUPO[g.estado]} ({g.itens.length})
                    </h2>
                    <ul>
                      {g.itens.map((b) => (
                        <li key={b.id} className={`s-${b.estado}`}>
                          <i aria-hidden="true" />
                          <span>
                            <strong>{b.nome}</strong> · <span className="sala-estado">{ROTULO[b.estado]}</span>
                          </span>
                          <span className="linha">
                            {b.fazendo}
                            {b.ultimaAtividade && ` · ${haQuantoTempo(b.ultimaAtividade, agora)}`}
                            {b.url && <> · <LinkOuTexto url={b.url} rotulo={rotuloDoLink(b)} /></>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
                {FILEIRAS.filter((f) => falhas.includes(f.tipo)).map((f) => (
                  <section key={f.tipo} aria-label={`${f.titulo}: não consegui ler`}>
                    <AvisoDoGrupo titulo={f.titulo} tentarDeNovo={tentar} tentando={tentando} />
                  </section>
                ))}
              </div>
              <p className="sala-tv-dica">Modo TV, pro segundo monitor: <a href="/sala?tv">/sala?tv</a></p>
            </>
          )}
        </>
      )}
    </section>
  );
}
