import "@fontsource-variable/plus-jakarta-sans";
import "./sala.css";
import { useState } from "react";
import { QUEM_ESTA_OLHANDO_NA_SALA, salaDeExemplo } from "../../dados/exemplo-sala";
import {
  agruparPorEstado, BALAO, haQuantoTempo, iniciais, linkSeguro, montarSala, quantosPrecisam, ROTULO, textoPrecisam,
  TITULO_DO_GRUPO,
} from "../../logica/sala";
import type { Bonequinho, TipoBonequinho } from "../../tipos";

// "precisa" é o alvo do aviso "N coisas precisam de você" do topo.
const idDoGrupo = (estado: string) => (estado === "precisa" ? "precisa" : `sala-grupo-${estado}`);

const FILEIRAS: { tipo: TipoBonequinho; titulo: string }[] = [
  { tipo: "pessoa", titulo: "Pessoas" },
  { tipo: "claude", titulo: "Robôs do Claude" },
  { tipo: "casa", titulo: "Robôs da casa" },
];

/** Halo, anel e núcleo, com o símbolo do tipo: iniciais (pessoa), olhinhos (Claude) ou três traços (casa). */
function PontoDeLuz({ b }: { b: Bonequinho }) {
  return (
    <svg className="sala-luz" viewBox="0 0 58 58" aria-hidden="true">
      <circle className="halo" cx="29" cy="29" r="24" />
      <circle className="anel" cx="29" cy="29" r="27" />
      <circle className="nucleo" cx="29" cy="29" r="18" />
      {b.tipo === "pessoa" && <text className="iniciais" x="29" y="34.5" textAnchor="middle">{iniciais(b.nome)}</text>}
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

/** O link pro GitHub, só se for da sakura-corp; senão o endereço aparece como texto, sem link. */
export function LinkOuTexto({ url }: { url?: string }) {
  if (!url) return null;
  const seguro = linkSeguro(url);
  return seguro ? (
    <a className="sala-link" href={seguro} target="_blank" rel="noopener noreferrer">
      Abrir no GitHub<span className="sr-only"> (em aba nova)</span>
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
          <LinkOuTexto url={b.url} />
        </>
      ) : (
        <p className="linha">Clique num ponto de luz (ou Enter, pelo teclado) pra ver o cartão.</p>
      )}
    </div>
  );
}

/** A Sala da Sakura (#467), com DADOS DE EXEMPLO. A tarefa 8 (#468) liga no GitHub. */
export function Sala({ agora = new Date(), tv = false }: { agora?: Date; tv?: boolean }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const sala = montarSala(salaDeExemplo(agora), agora, QUEM_ESTA_OLHANDO_NA_SALA);
  const precisam = quantosPrecisam(sala);
  const escolhido = sala.find((b) => b.id === aberto);

  return (
    <section className={`sala-j ${tv ? "sala-tv" : ""}`} aria-labelledby="sala-titulo">
      <header className="sala-topo">
        <div>
          <h1 id="sala-titulo">Sala</h1>
          <p className="sala-sub">Leva 0 · dados de exemplo</p>
        </div>
        <div className="sala-topo-direita">
          {precisam > 0 && (
            <a className="sala-pilula" href="#precisa">
              <i aria-hidden="true" />
              {textoPrecisam(precisam)}
            </a>
          )}
          {/* texto fixo nesta tarefa; a #468 liga ao estado de verdade da conexão */}
          <span className="sala-conexao"><i aria-hidden="true" />ao vivo · atualizado agora há pouco</span>
        </div>
      </header>

      <div className="sala-desenho">
        <div className="sala-vidro sala-quadro" role="group" aria-label="A sala desenhada (a mesma informação está na lista)">
          {FILEIRAS.map((f) => (
            <div key={f.tipo}>
              <p className="sala-fileira-titulo">{f.titulo}</p>
              <div className="sala-fileira">
                {sala.filter((b) => b.tipo === f.tipo).map((b) => (
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
            </div>
          ))}
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
                        {b.url && <> · <LinkOuTexto url={b.url} /></>}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="sala-tv-dica">Modo TV, pro segundo monitor: <a href="/sala?tv">/sala?tv</a></p>
        </>
      )}
    </section>
  );
}
