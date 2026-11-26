import { useId, type ReactNode } from "react";
import { corVeiculoParaHex } from "@/lib/corVeiculo";
import type { TipoVeiculo } from "@/types/cliente";

// Os 5 desenhos de veículo (#1096). Regras que valem pros cinco:
//   - vista de lado, frente pra direita, mesmo quadro (160x80), chão em y=70;
//   - carroceria pintada com a cor do carro; vidro, pneu e detalhes ficam
//     neutros (são as únicas cores escritas aqui, por serem parte do desenho);
//   - mesma espessura de contorno e rodas do mesmo tamanho nos carros (a do
//     SUV é um pouco maior e o vão do chão também);
//   - legível nos dois temas com qualquer cor: o contorno é a própria cor
//     bem mais escura, e por fora vai um fio suave na cor do texto do tema
//     (claro no escuro, escuro no claro), que salva o carro preto no tema
//     escuro e o branco no claro.

interface VeiculoIconeProps {
  tipo: TipoVeiculo | null;
  cor?: string | null;
  className?: string;
  /** Com nome, o desenho vira imagem com texto alternativo; sem, é enfeite. */
  rotulo?: string;
}

const LARGURA_CONTORNO = 1.5;
const COR_PNEU = "#1c1c21";
const COR_ARO = "#9b9ba4";
const COR_VIDRO = "#24303d";
const COR_PECA = "#3a3a42"; // motor, banco, escapamento
const FIO_DE_FORA = { stroke: "var(--color-texto)", strokeOpacity: 0.38 } as const;

function misturar(hex: string, alvo: number, parte: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(v + (alvo - v) * parte),
  );
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

interface Tinta {
  cor: string;
  contorno: string;
  /** id do degradê de brilho e sombra, único por desenho */
  brilho: string;
}

/** Uma peça pintada com a cor do carro: fio de fora, cor, brilho e contorno. */
function Pintada({ d, tinta }: { d: string; tinta: Tinta }) {
  return (
    <>
      <path d={d} fill="none" strokeWidth={LARGURA_CONTORNO + 2.4} strokeLinejoin="round" style={FIO_DE_FORA} />
      <path d={d} fill={tinta.cor} />
      <path d={d} fill={`url(#${tinta.brilho})`} />
      <path d={d} fill="none" stroke={tinta.contorno} strokeWidth={LARGURA_CONTORNO} strokeLinejoin="round" />
    </>
  );
}

function Vidro({ d, contorno }: { d: string; contorno: string }) {
  return (
    <>
      <path d={d} fill={COR_VIDRO} stroke={contorno} strokeWidth={0.75} strokeLinejoin="round" />
      <path d={d} fill="#ffffff" fillOpacity={0.1} />
    </>
  );
}

function Poste({ x, y1, y2, tinta }: { x: number; y1: number; y2: number; tinta: Tinta }) {
  return <rect x={x} y={y1} width={3.2} height={y2 - y1} fill={tinta.cor} stroke={tinta.contorno} strokeWidth={0.6} />;
}

function Roda({ cx, cy, r, cava = true, tinta }: { cx: number; cy: number; r: number; cava?: boolean; tinta: Tinta }) {
  return (
    <>
      {cava && <circle cx={cx} cy={cy} r={r + 2.5} fill={COR_PNEU} stroke={tinta.contorno} strokeWidth={0.75} />}
      <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={LARGURA_CONTORNO + 2.4} style={FIO_DE_FORA} />
      <circle cx={cx} cy={cy} r={r} fill={COR_PNEU} />
      <circle cx={cx} cy={cy} r={r * 0.55} fill={COR_ARO} />
      <circle cx={cx} cy={cy} r={r * 0.2} fill={COR_PNEU} />
    </>
  );
}

function Hatch({ tinta }: { tinta: Tinta }) {
  return (
    <>
      <Pintada
        tinta={tinta}
        d="M24,61 L24,46 C24,42 26,40 29,39 L40,27 C42,25 44,24 47,24 L76,24 C83,24 88,26 92,30 L104,38 L126,41 C132,42 136,45 136,51 L136,61 Z"
      />
      <Vidro contorno={tinta.contorno} d="M35,37 L43,28 C44,27 45,27 47,27 L75,27 C81,27 85,28 88,31 L96,37 Z" />
      <Poste x={62} y1={27} y2={37} tinta={tinta} />
      <Roda cx={46} cy={59} r={11} tinta={tinta} />
      <Roda cx={114} cy={59} r={11} tinta={tinta} />
    </>
  );
}

function Sedan({ tinta }: { tinta: Tinta }) {
  return (
    <>
      <Pintada
        tinta={tinta}
        d="M12,61 L12,46 C12,42 14,40 18,39 L44,37 C48,31 54,25 62,24 L88,24 C96,24 102,27 108,33 L114,37 L136,40 C143,41 149,45 150,52 L150,61 Z"
      />
      <Vidro contorno={tinta.contorno} d="M47,36 C51,30 56,27 63,27 L87,27 C93,27 98,30 104,36 Z" />
      <Poste x={74} y1={27} y2={36} tinta={tinta} />
      <Roda cx={38} cy={59} r={11} tinta={tinta} />
      <Roda cx={122} cy={59} r={11} tinta={tinta} />
    </>
  );
}

function Suv({ tinta }: { tinta: Tinta }) {
  return (
    <>
      <Pintada
        tinta={tinta}
        d="M16,54 L16,32 C16,28 18,26 21,25 L25,19 C26,17 28,16 31,16 L97,16 C101,16 104,17 106,20 L118,33 L136,37 C141,38 144,41 144,47 L144,54 Z"
      />
      <Vidro contorno={tinta.contorno} d="M28,33 L28,22 C28,20 29,19 31,19 L96,19 C99,19 101,20 103,23 L111,33 Z" />
      <Poste x={62} y1={19} y2={33} tinta={tinta} />
      <Roda cx={40} cy={57} r={13} tinta={tinta} />
      <Roda cx={118} cy={57} r={13} tinta={tinta} />
    </>
  );
}

function Picape({ tinta }: { tinta: Tinta }) {
  return (
    <>
      <Pintada
        tinta={tinta}
        d="M10,61 L10,35 L78,35 L80,28 C81,25 83,24 86,24 L112,24 C116,24 119,26 122,30 L128,37 L142,39 C146,40 149,44 149,50 L149,61 Z"
      />
      {/* o vão da caçamba, aberta: um fundo escuro entre a lateral e a cabine */}
      <path d="M13,35 L75,35 L75,39 L13,39 Z" fill={COR_PNEU} fillOpacity={0.55} />
      <Vidro contorno={tinta.contorno} d="M84,35 L84,28 C84,27 85,27 87,27 L111,27 C114,27 116,28 118,31 L122,35 Z" />
      <Poste x={99} y1={27} y2={35} tinta={tinta} />
      <Roda cx={36} cy={59} r={11} tinta={tinta} />
      <Roda cx={122} cy={59} r={11} tinta={tinta} />
    </>
  );
}

function Moto({ tinta }: { tinta: Tinta }) {
  const traco = { stroke: COR_PECA, strokeLinecap: "round", fill: "none" } as const;
  return (
    <>
      <Roda cx={36} cy={57} r={13} cava={false} tinta={tinta} />
      <Roda cx={124} cy={57} r={13} cava={false} tinta={tinta} />
      {/* balança, garfo e guidão */}
      <path d="M36,57 L66,50" strokeWidth={4} {...traco} />
      <path d="M124,57 L108,27 L98,24" strokeWidth={4} {...traco} />
      {/* motor e escapamento */}
      <rect x={62} y={43} width={26} height={17} rx={4} fill={COR_PECA} stroke={tinta.contorno} strokeWidth={0.75} />
      <path d="M64,60 C60,64 48,64 38,62" stroke={COR_ARO} strokeWidth={3} strokeLinecap="round" fill="none" />
      {/* banco */}
      <path d="M38,40 C48,36 62,37 70,39 L70,44 L40,45 Z" fill={COR_PECA} stroke={tinta.contorno} strokeWidth={0.75} />
      {/* rabeta, tanque, carenagem e paralama: a parte pintada */}
      <Pintada tinta={tinta} d="M30,41 C33,35 43,33 56,34 L58,39 L36,44 Z" />
      <Pintada tinta={tinta} d="M60,37 C64,29 76,27 87,29 C93,30 97,34 99,38 L96,42 L64,42 Z" />
      <Pintada tinta={tinta} d="M99,40 C100,32 104,25 108,21 L113,25 C111,31 110,37 110,42 Z" />
      <Pintada tinta={tinta} d="M109,49 C113,40 129,38 139,49 L135,51 C129,45 117,45 113,51 Z" />
      <circle cx={110} cy={31} r={2.6} fill="#fff6c8" stroke={tinta.contorno} strokeWidth={0.6} />
    </>
  );
}

const DESENHOS: Record<TipoVeiculo, (p: { tinta: Tinta }) => ReactNode> = {
  hatch: Hatch,
  sedan: Sedan,
  suv: Suv,
  picape: Picape,
  moto: Moto,
};

export function VeiculoIcone({ tipo, cor, className, rotulo }: VeiculoIconeProps) {
  const idBase = useId().replace(/:/g, "");
  const corHex = corVeiculoParaHex(cor);
  const tipoDesenhado: TipoVeiculo = tipo && tipo in DESENHOS ? tipo : "hatch";
  const Desenho = DESENHOS[tipoDesenhado];
  const tinta: Tinta = {
    cor: corHex,
    contorno: misturar(corHex, 0, 0.55),
    brilho: `veiculo-brilho-${idBase}`,
  };
  const acessibilidade = rotulo
    ? ({ role: "img", "aria-label": rotulo } as const)
    : ({ "aria-hidden": "true" } as const);

  return (
    <div className={className}>
      <svg
        viewBox="0 0 160 80"
        className="h-full w-full"
        data-tipo={tipoDesenhado}
        {...acessibilidade}
      >
        <defs>
          <linearGradient id={tinta.brilho} gradientUnits="userSpaceOnUse" x1="0" y1="14" x2="0" y2="62">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0.3} />
            <stop offset="0.4" stopColor="#ffffff" stopOpacity={0} />
            <stop offset="1" stopColor="#000000" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <ellipse cx={80} cy={71} rx={64} ry={2.4} style={{ fill: "var(--sombra-forte)" }} />
        <Desenho tinta={tinta} />
      </svg>
    </div>
  );
}
