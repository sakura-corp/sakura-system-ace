import type { KeyboardEvent } from "react";
import { agentesDaEquipe, BALAO_DO_ESTADO, contarAgentes, posicoesEmRoda, textoDaContagem, type AgenteComEstado } from "../../logica/escritorio";
import type { EstadoBonequinho, Equipe } from "../../tipos";

// Vista de cima: as salas em roda em volta do Cérebro, ligadas a ele por caminhos.
// Tudo é SVG desenhado aqui (nada de imagem de terceiros). A mesma informação está em ListaDoEscritorio.
const LARGURA = 1000;
const ALTURA = 720;
const CENTRO = { x: 500, y: 360 };
const SALA = { l: 250, a: 156 };

type Props = {
  equipes: Equipe[];
  agentes: AgenteComEstado[];
  notasDoCerebro: number;
  salaAberta: string | null;
  aoAbrirSala: (id: string) => void;
  aoAbrirCerebro: () => void;
};

const comTeclado = (acao: () => void) => (e: KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    acao();
  }
};

export function Mapa({ equipes, agentes, notasDoCerebro, salaAberta, aoAbrirSala, aoAbrirCerebro }: Props) {
  const posicoes = posicoesEmRoda(equipes.length, CENTRO.x, CENTRO.y, 345, 255);

  return (
    <svg className="esc-mapa" viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="group" aria-label="Mapa do escritório (exemplo). A mesma informação está na lista logo abaixo.">
      <defs>
        <radialGradient id="esc-brilho-cerebro">
          <stop offset="0%" stopColor="#E2B0C9" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#C98FAE" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#C98FAE" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* caminhos até o Cérebro; a sala com agente rodando ganha uma luz andando no caminho */}
      {equipes.map((eq, i) => {
        const p = posicoes[i];
        const rodando = contarAgentes(agentesDaEquipe(agentes, eq.id)).rodando > 0;
        const d = `M${CENTRO.x} ${CENTRO.y} L${p.x} ${p.y}`;
        return (
          <g key={`c-${eq.id}`} aria-hidden="true">
            <path className="esc-caminho" d={d} />
            {rodando && <path className="esc-fluxo" d={d} />}
          </g>
        );
      })}

      {/* o Cérebro */}
      <g
        className="esc-cerebro"
        role="button"
        tabIndex={0}
        aria-label={`O Cérebro: ${notasDoCerebro} notas, memória compartilhada (exemplo). Abre a aba Cérebro.`}
        onClick={aoAbrirCerebro}
        onKeyDown={comTeclado(aoAbrirCerebro)}
      >
        <circle cx={CENTRO.x} cy={CENTRO.y} r={140} fill="url(#esc-brilho-cerebro)" />
        <circle className="esc-cerebro-base" cx={CENTRO.x} cy={CENTRO.y} r={88} />
        <circle className="esc-cerebro-disco" cx={CENTRO.x} cy={CENTRO.y} r={88} />
        <circle className="esc-sala-foco" cx={CENTRO.x} cy={CENTRO.y} r={96} />
        <text className="esc-cerebro-nome" x={CENTRO.x} y={CENTRO.y - 6} textAnchor="middle">O Cérebro</text>
        <text className="esc-cerebro-sub" x={CENTRO.x} y={CENTRO.y + 16} textAnchor="middle">{notasDoCerebro} notas</text>
        <text className="esc-cerebro-sub" x={CENTRO.x} y={CENTRO.y + 33} textAnchor="middle">memória compartilhada</text>
      </g>

      {equipes.map((eq, i) => {
        const p = posicoes[i];
        const daSala = agentesDaEquipe(agentes, eq.id);
        const conta = contarAgentes(daSala);
        const x0 = p.x - SALA.l / 2;
        const y0 = p.y - SALA.a / 2;
        const aberta = salaAberta === eq.id;
        const abrir = () => aoAbrirSala(eq.id);
        const espaco = SALA.l / Math.max(daSala.length, 1);
        return (
          <g
            key={eq.id}
            className="esc-sala"
            role="button"
            tabIndex={0}
            aria-pressed={aberta}
            aria-label={`Sala ${eq.nome}: ${textoDaContagem(conta)}${conta.precisam ? `, ${conta.precisam} precisa de você` : ""}. Abre os detalhes.`}
            onClick={abrir}
            onKeyDown={comTeclado(abrir)}
          >
            <rect className="esc-sala-foco" x={x0 - 6} y={y0 - 6} width={SALA.l + 12} height={SALA.a + 12} rx={24} />
            <rect className="esc-sala-base" x={x0} y={y0} width={SALA.l} height={SALA.a} rx={20} />
            <rect className="esc-sala-fundo" x={x0} y={y0} width={SALA.l} height={SALA.a} rx={20} fill={eq.cor} stroke={eq.cor} />
            <text className="esc-sala-nome" x={x0 + 16} y={y0 + 28}>{eq.nome}</text>
            <text className="esc-sala-conta" x={x0 + 16} y={y0 + 49}>{textoDaContagem(conta)}</text>
            {/* mini-pontos dos agentes, ao lado da contagem */}
            {daSala.map((a, j) => (
              <circle key={`m-${a.id}`} className={`esc-minipt e-${a.estado}`} cx={x0 + SALA.l - 18 - j * 12} cy={y0 + 44} r={4} aria-hidden="true">
                <title>{a.nome}</title>
              </circle>
            ))}
            {daSala.map((a, j) => {
              const cx = x0 + espaco * j + espaco / 2;
              return (
                <g key={a.id} aria-hidden="true">
                  <rect className="esc-mesa" x={cx - 28} y={y0 + 108} width={56} height={14} rx={5} />
                  <PontoDeLuz estado={a.estado} cx={cx} cy={y0 + 90} titulo={`${a.nome}: ${a.fazendo}`} />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** Um agente: halo, anel e núcleo, com olhinhos (é um robô do Claude) e o balão do estado. */
export function PontoDeLuz({ estado, cx, cy, titulo }: { estado: EstadoBonequinho; cx: number; cy: number; titulo: string }) {
  const balao = BALAO_DO_ESTADO[estado] === "digitando…" ? "…" : BALAO_DO_ESTADO[estado];
  return (
    <g className={`esc-luz e-${estado}`}>
      <title>{titulo}</title>
      <circle className="halo" cx={cx} cy={cy} r={17} />
      <circle className="anel" cx={cx} cy={cy} r={19} />
      <circle className="nucleo" cx={cx} cy={cy} r={12} />
      <circle className="marca" cx={cx - 4.5} cy={cy - 2} r={1.9} />
      <circle className="marca" cx={cx + 4.5} cy={cy - 2} r={1.9} />
      <path className="marca-traco" d={`M${cx - 4.5} ${cy + 4} Q${cx} ${cy + 7} ${cx + 4.5} ${cy + 4}`} />
      {balao && (
        <g>
          <rect className="balao-fundo" x={cx + 9} y={cy - 30} width={balao.length > 1 ? 24 : 18} height={16} rx={8} />
          <text className="balao-texto" x={cx + 9 + (balao.length > 1 ? 12 : 9)} y={cy - 18.5} textAnchor="middle">{balao}</text>
        </g>
      )}
    </g>
  );
}
