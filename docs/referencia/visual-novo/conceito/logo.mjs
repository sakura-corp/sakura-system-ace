// Gera as variações da logo do SSACE (flor de cerejeira + engrenagem) como SVG.
// Tudo é desenhado por conta, num quadro de 512 com o centro em (0,0).
// As formas já saem giradas nas coordenadas (sem transform), pra o degradê
// atravessar a marca inteira de uma vez, e não pétala por pétala.
const f = (n) => Number(n.toFixed(2));
const girar = ([x, y], graus) => {
  const a = (graus * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
};
/** Um caminho é uma lista de [comando, ...pontos]; o arco leva o raio junto. */
const escrever = (cmds, graus = 0) =>
  cmds
    .map(([c, ...resto]) => {
      if (c === "Z") return "Z";
      if (c === "A") {
        const [r, varre, p] = resto;
        const [x, y] = girar(p, graus);
        return `A${r},${r} 0 0 ${varre} ${f(x)},${f(y)}`;
      }
      return c + resto.map((p) => girar(p, graus).map(f).join(",")).join(" ");
    })
    .join(" ");

/** Pétala apontando pra cima: folha larga no meio, ponta com dois bicos e um "V". */
function petala({ rIn, R, W, corte = 32, base = 16, bico = 0.36, meio = 0.5 }) {
  const y0 = -rIn;
  const L = R - rIn;
  const lado = (s) => [
    [s * W * 0.9, y0 - L * 0.08],
    [s * W * 1.3, y0 - L * meio],
    [s * W * 0.8, y0 - L * 0.8],
  ];
  const e = lado(-1);
  const d = lado(1);
  return [
    ["M", [-base, y0]],
    ["C", e[0], e[1], e[2]],
    ["Q", [-W * 0.6, -R + L * 0.07], [-W * bico, -R]],
    ["L", [0, -R + corte]],
    ["L", [W * bico, -R]],
    ["Q", [W * 0.6, -R + L * 0.07], d[2]],
    ["C", d[1], d[0], [base, y0]],
    ["Z"],
  ];
}

function engrenagem({ n, rPe, rPonta, larguraPe = 0.56, larguraPonta = 0.36, giro = 0 }) {
  const passo = 360 / n;
  const em = (r, g) => girar([0, -r], g);
  const cmds = [];
  for (let i = 0; i < n; i++) {
    const c = giro + i * passo;
    const a = em(rPe, c - (passo * larguraPe) / 2);
    cmds.push(i === 0 ? ["M", a] : ["A", rPe, 1, a]);
    cmds.push(["L", em(rPonta, c - (passo * larguraPonta) / 2)]);
    cmds.push(["L", em(rPonta, c + (passo * larguraPonta) / 2)]);
    cmds.push(["L", em(rPe, c + (passo * larguraPe) / 2)]);
  }
  cmds.push(["A", rPe, 1, em(rPe, giro - (passo * larguraPe) / 2)], ["Z"]);
  return cmds;
}

/** Círculo; sentido 0 fura a forma de fora (regra evenodd cuida do resto). */
const circulo = (r) => [["M", [-r, 0]], ["A", r, 1, [r, 0]], ["A", r, 1, [-r, 0]], ["Z"]];

/** Dente solto apontando pra cima, com a ponta levemente arredondada. */
function dente({ r0, r1, w0, w1, raio = 6 }) {
  return [
    ["M", [-w0, -r0]],
    ["L", [-w1, -r1 + raio]],
    ["Q", [-w1, -r1], [-w1 + raio, -r1]],
    ["L", [w1 - raio, -r1]],
    ["Q", [w1, -r1], [w1, -r1 + raio]],
    ["L", [w0, -r0]],
    ["Z"],
  ];
}

const CINCO = [0, 72, 144, 216, 288];
const cinco = (cmds, desvio = 0) => CINCO.map((g) => escrever(cmds, g + desvio)).join(" ");

// Degradê da marca: claro em cima à direita, laranja no meio, carmesim embaixo à esquerda.
export const DEGRADE = [
  ["0", "#FFE4D6"],
  ["0.24", "#FFA070"],
  ["0.52", "#FF5722"],
  ["1", "#E11D48"],
];
// O mesmo, mais fundo: é a engrenagem que fica atrás da flor.
export const DEGRADE_FUNDO = [
  ["0", "#FF8A5B"],
  ["0.5", "#E8402E"],
  ["1", "#B01238"],
];
const grad = (id, paradas) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="175" y1="-190" x2="-175" y2="190">${paradas
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join("")}</linearGradient>`;

/**
 * Miolo do SVG (sem a tag <svg>), centrado em (0,0), pra um quadro de -256..256.
 * variante: "a" (fiel ao print), "b" (limpa), "c" (flor e engrenagem numa peça), "mini".
 * mono: uma cor só (ex.: "#fff"), sem degradê.
 */
export function marca(variante, { id = "g", mono = null } = {}) {
  const frente = mono ?? `url(#${id})`;
  const fundo = mono ?? `url(#${id}f)`;
  const defs = mono ? "" : `<defs>${grad(id, DEGRADE)}${grad(id + "f", DEGRADE_FUNDO)}</defs>`;
  const p = (d, tinta = frente, extra = "") => `<path fill="${tinta}" fill-rule="evenodd" ${extra}d="${d}"/>`;
  let corpo = "";

  if (variante === "a") {
    // Fiel ao print: a engrenagem atrás (os dentes aparecem entre as pétalas),
    // a flor na frente e uma engrenagem pequena no miolo.
    const opac = mono ? 'opacity="0.55" ' : "";
    corpo += p(cinco(dente({ r0: 118, r1: 190, w0: 19, w1: 14 }), 36), fundo, opac);
    corpo += p(cinco(petala({ rIn: 92, R: 226, W: 80, base: 30 })));
    corpo += p(escrever(engrenagem({ n: 10, rPe: 52, rPonta: 68, giro: 18 })) + " " + escrever(circulo(25)));
  } else if (variante === "b") {
    // Limpa: só a flor, mais cheia, e a engrenagem sozinha no miolo.
    corpo += p(cinco(petala({ rIn: 98, R: 228, W: 84, base: 34 })));
    corpo += p(escrever(engrenagem({ n: 8, rPe: 54, rPonta: 73 })) + " " + escrever(circulo(28)));
  } else if (variante === "c") {
    // Numa peça só: as pétalas saem de um aro, como dentes grandes; um dente pequeno
    // entre cada duas; e o furo do eixo no meio. Lembra flor e também cubo de roda.
    corpo += p(cinco(dente({ r0: 84, r1: 170, w0: 21, w1: 15 }), 36), fundo, mono ? 'opacity="0.55" ' : "");
    corpo += p(cinco(petala({ rIn: 84, R: 228, W: 78, base: 44 })));
    corpo += p(escrever(circulo(100)) + " " + escrever(circulo(54)));
    corpo += p(escrever(circulo(24)));
  } else if (variante === "mini") {
    // Pra 16 e 32 px: pétalas gordas e um furo redondo, sem dentes.
    corpo += p(cinco(petala({ rIn: 70, R: 232, W: 84, base: 34, corte: 40, bico: 0.38 })));
    corpo += p(escrever(circulo(50)) + " " + escrever(circulo(22)));
  }
  return defs + corpo;
}

export function svgMarca(variante, opcoes = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-256 -256 512 512">${marca(variante, opcoes)}</svg>`;
}
