import type { TipoVeiculo } from "@/types/cliente";

// Lista de sugestão pro campo "Marca" do veículo (Combobox com texto livre —
// ver VeiculosFields.tsx). Não é uma lista fechada: o operador pode digitar
// qualquer coisa que não esteja aqui, isso é só a sugestão pra agilizar o
// caso comum. Cobre as montadoras mais vendidas no Brasil + as grandes
// marcas internacionais (inclusive de luxo/esportivas e chinesas recentes),
// ordenada alfabeticamente.
//
// CATÁLOGO (marca -> modelos -> anos -> tipo), lá embaixo: também é só
// sugestão. O campo sempre aceita texto livre. Só as 15 marcas mais vendidas
// têm modelos aqui; as outras marcas continuam só com texto livre.
//
// Como o tipo é escolhido:
// - hatch: carro compacto de 2 volumes;
// - sedan: carro de 3 volumes (perua/station wagon também entra aqui);
// - suv: SUV, crossover, minivan e furgão de passageiros alto (Spin, Doblò, Livina);
// - picape: picape e utilitário de carga (Fiorino, Saveiro, Strada, Toro, Hilux...);
// - moto: motos.
// Tipo novo (van, caminhão) precisaria de migration no banco antes.
export const MARCAS_VEICULO: string[] = [
  "Acura",
  "Alfa Romeo",
  "Aston Martin",
  "Audi",
  "Baic",
  "Bentley",
  "BMW",
  "Buick",
  "BYD",
  "Cadillac",
  "CAOA Chery",
  "Changan",
  "Chery",
  "Chevrolet",
  "Chrysler",
  "Citroën",
  "Dacia",
  "Daewoo",
  "Daf",
  "Daihatsu",
  "Datsun",
  "Dodge",
  "Effa",
  "Ferrari",
  "Fiat",
  "Ford",
  "Foton",
  "GAC",
  "Geely",
  "Genesis",
  "GMC",
  "Great Wall",
  "GWM",
  "Haval",
  "Hino",
  "Honda",
  "Hyundai",
  "Infiniti",
  "International",
  "Iveco",
  "JAC",
  "Jaguar",
  "Jeep",
  "Jinbei",
  "Kia",
  "Lamborghini",
  "Lancia",
  "Land Rover",
  "Lexus",
  "Lifan",
  "Lincoln",
  "Lotus",
  "Man",
  "Maserati",
  "Mazda",
  "McLaren",
  "Mercedes-Benz",
  "MG",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Opel",
  "Peugeot",
  "Porsche",
  "RAM",
  "Renault",
  "Rolls-Royce",
  "Saab",
  "Scania",
  "Seat",
  "Škoda",
  "Smart",
  "SsangYong",
  "Subaru",
  "Suzuki",
  "Tesla",
  "Toyota",
  "Troller",
  "Volkswagen",
  "Volvo",
];

export interface ModeloDoCatalogo {
  nome: string;
  tipo: TipoVeiculo;
  /** Primeiro e último ano-modelo no Brasil. `ate: null` = ainda vendido. */
  anos: { de: number; ate: number | null };
}

export interface MarcaDoCatalogo {
  marca: string;
  modelos: ModeloDoCatalogo[];
}

const H: TipoVeiculo = "hatch";
const S: TipoVeiculo = "sedan";
const U: TipoVeiculo = "suv";
const P: TipoVeiculo = "picape";
const M: TipoVeiculo = "moto";

function m(nome: string, tipo: TipoVeiculo, de: number, ate: number | null): ModeloDoCatalogo {
  return { nome, tipo, anos: { de, ate } };
}

// Na ordem de mais vendida (Fenabrave, últimos anos).
export const CATALOGO_VEICULOS: MarcaDoCatalogo[] = [
  {
    marca: "Fiat",
    modelos: [
      m("Uno", H, 1984, 2021),
      m("Palio", H, 1996, 2017),
      m("Siena", S, 1997, 2016),
      m("Strada", P, 1998, null),
      m("Mobi", H, 2016, null),
      m("Argo", H, 2017, null),
      m("Cronos", S, 2018, null),
      m("Toro", P, 2016, null),
      m("Pulse", U, 2022, null),
      m("Fastback", U, 2023, null),
      m("Fiorino", P, 1988, null),
      m("Doblò", U, 2001, 2022),
      m("Punto", H, 2008, 2017),
      m("Idea", U, 2005, 2016),
      m("Grand Siena", S, 2012, 2021),
    ],
  },
  {
    marca: "Volkswagen",
    modelos: [
      m("Gol", H, 1980, 2023),
      m("Fox", H, 2003, 2021),
      m("Saveiro", P, 1982, null),
      m("Voyage", S, 2008, 2023),
      m("Polo", H, 2018, null),
      m("Virtus", S, 2018, null),
      m("T-Cross", U, 2019, null),
      m("Nivus", U, 2021, null),
      m("Tiguan", U, 2009, null),
      m("Amarok", P, 2010, null),
      m("Jetta", S, 2006, 2018),
      m("Up!", H, 2014, 2021),
      m("Parati", H, 1982, 2012),
      m("Santana", S, 1984, 2006),
      m("Kombi", U, 1957, 2014),
    ],
  },
  {
    marca: "Chevrolet",
    modelos: [
      m("Onix", H, 2013, null),
      m("Onix Plus", S, 2020, null),
      m("Prisma", S, 2007, 2019),
      m("Celta", H, 2000, 2015),
      m("Corsa", H, 1994, 2012),
      m("Classic", S, 2010, 2016),
      m("Agile", H, 2009, 2014),
      m("Cobalt", S, 2012, 2020),
      m("Spin", U, 2012, 2025),
      m("Tracker", U, 2013, null),
      m("Montana", P, 2003, null),
      m("S10", P, 1995, null),
      m("Cruze", S, 2011, 2024),
      m("Equinox", U, 2018, null),
      m("Meriva", U, 2002, 2012),
      m("Vectra", S, 1993, 2011),
      m("Astra", H, 1995, 2011),
    ],
  },
  {
    marca: "Toyota",
    modelos: [
      m("Corolla", S, 1992, null),
      m("Corolla Cross", U, 2021, null),
      m("Etios", H, 2012, 2021),
      m("Etios Sedan", S, 2013, 2021),
      m("Yaris", H, 2018, null),
      m("Yaris Sedan", S, 2018, null),
      m("Hilux", P, 1992, null),
      m("SW4", U, 2005, null),
      m("RAV4", U, 1997, null),
      m("Camry", S, 2007, null),
      m("Prius", H, 2011, null),
      m("Bandeirante", U, 1962, 2001),
    ],
  },
  {
    marca: "Hyundai",
    modelos: [
      m("HB20", H, 2012, null),
      m("HB20S", S, 2013, null),
      m("HB20X", H, 2013, null),
      m("Creta", U, 2017, null),
      m("Tucson", U, 2005, null),
      m("ix35", U, 2010, 2021),
      m("Santa Fe", U, 2007, null),
      m("i30", H, 2009, 2020),
      m("Azera", S, 2008, 2017),
      m("Elantra", S, 2011, 2020),
      m("HR", P, 2007, null),
      m("Veloster", H, 2012, 2018),
    ],
  },
  {
    marca: "Jeep",
    modelos: [
      m("Renegade", U, 2015, null),
      m("Compass", U, 2016, null),
      m("Commander", U, 2021, null),
      m("Wrangler", U, 2008, null),
      m("Grand Cherokee", U, 2000, null),
      m("Cherokee", U, 2008, 2018),
      m("Gladiator", P, 2020, null),
    ],
  },
  {
    marca: "Renault",
    modelos: [
      m("Kwid", H, 2018, null),
      m("Sandero", H, 2008, 2025),
      m("Logan", S, 2008, 2025),
      m("Duster", U, 2012, null),
      m("Duster Oroch", P, 2016, null),
      m("Captur", U, 2018, null),
      m("Stepway", H, 2010, 2025),
      m("Clio", H, 1999, 2016),
      m("Symbol", S, 2000, 2013),
      m("Megane", S, 1999, 2012),
      m("Fluence", S, 2011, 2019),
      m("Master", U, 2006, null),
      m("Kangoo", U, 1999, 2021),
    ],
  },
  {
    marca: "Honda",
    modelos: [
      m("Civic", S, 1992, 2022),
      m("Fit", H, 2003, 2021),
      m("City", S, 2009, null),
      m("City Hatchback", H, 2021, null),
      m("HR-V", U, 2015, null),
      m("WR-V", U, 2017, null),
      m("CR-V", U, 1997, null),
      m("Accord", S, 1993, 2019),
      m("CG 160", M, 2016, null),
      m("CG 150", M, 2004, 2015),
      m("CG 125", M, 1980, 2008),
      m("Biz", M, 1998, null),
      m("Pop", M, 2007, null),
      m("Bros", M, 2003, 2015),
      m("CB 300", M, 2009, null),
      m("Twister", M, 2001, 2015),
      m("XRE 300", M, 2009, null),
      m("PCX", M, 2014, null),
    ],
  },
  {
    marca: "BYD",
    modelos: [
      m("Dolphin", H, 2023, null),
      m("Dolphin Mini", H, 2024, null),
      m("Seal", S, 2024, null),
      m("Song Plus", U, 2023, null),
      m("Song Pro", U, 2024, null),
      m("Yuan Plus", U, 2023, null),
      m("King", S, 2024, null),
      m("Han", S, 2022, null),
      m("Tan", U, 2022, null),
      m("Shark", P, 2025, null),
    ],
  },
  {
    marca: "Nissan",
    modelos: [
      m("Kicks", U, 2017, null),
      m("March", H, 2011, 2021),
      m("Versa", S, 2011, null),
      m("Sentra", S, 2007, null),
      m("Frontier", P, 2002, null),
      m("Livina", U, 2010, 2016),
      m("Tiida", H, 2008, 2013),
      m("Leaf", H, 2020, null),
      m("Altima", S, 2007, 2013),
    ],
  },
  {
    marca: "CAOA Chery",
    modelos: [
      m("Tiggo 5X", U, 2019, null),
      m("Tiggo 7", U, 2020, null),
      m("Tiggo 8", U, 2019, null),
      m("Tiggo 3X", U, 2021, null),
      m("Arrizo 6", S, 2020, null),
      m("Arrizo 5", S, 2017, 2019),
      m("iCar", H, 2024, null),
      m("QQ", H, 2010, 2016),
      m("Celer", S, 2014, 2017),
      m("Face", H, 2010, 2013),
      m("Cielo", S, 2011, 2014),
    ],
  },
  {
    marca: "Ford",
    modelos: [
      m("Ka", H, 1997, 2021),
      m("Ka Sedan", S, 2015, 2021),
      m("Fiesta", H, 1996, 2019),
      m("Fiesta Sedan", S, 2003, 2019),
      m("Focus", H, 2000, 2019),
      m("EcoSport", U, 2003, 2022),
      m("Fusion", S, 2006, 2020),
      m("Ranger", P, 1995, null),
      m("Territory", U, 2020, 2025),
      m("Maverick", P, 2022, null),
      m("Courier", P, 1998, 2013),
      m("Escort", H, 1983, 2003),
      m("F-1000", P, 1980, 1998),
      m("Edge", U, 2009, 2023),
    ],
  },
  {
    marca: "Peugeot",
    modelos: [
      m("206", H, 1999, 2010),
      m("207", H, 2008, 2015),
      m("208", H, 2013, null),
      m("307", H, 2002, 2012),
      m("308", H, 2012, 2020),
      m("408", S, 2011, 2020),
      m("2008", U, 2015, null),
      m("3008", U, 2011, 2021),
      m("Partner", U, 1999, 2023),
      m("Hoggar", P, 2010, 2014),
      m("Expert", U, 2018, null),
      m("Boxer", U, 2004, null),
    ],
  },
  {
    marca: "Citroën",
    modelos: [
      m("C3", H, 2003, null),
      m("Aircross", U, 2010, 2025),
      m("C4 Cactus", U, 2018, 2024),
      m("C4 Lounge", S, 2014, 2019),
      m("C4 Pallas", S, 2007, 2013),
      m("C4 Hatch", H, 2005, 2013),
      m("Basalt", U, 2024, null),
      m("Xsara Picasso", U, 2001, 2013),
      m("Berlingo", U, 2001, 2013),
      m("Jumpy", U, 2018, null),
      m("Jumper", U, 2004, null),
    ],
  },
  {
    marca: "Mitsubishi",
    modelos: [
      m("L200 Triton", P, 2007, null),
      m("L200", P, 1995, 2006),
      m("Pajero Sport", U, 2000, null),
      m("Pajero TR4", U, 2003, 2015),
      m("Pajero Full", U, 1992, 2021),
      m("Pajero Dakar", U, 2009, 2021),
      m("Outlander", U, 2012, 2025),
      m("ASX", U, 2011, 2020),
      m("Eclipse Cross", U, 2018, 2023),
      m("Lancer", S, 2008, 2018),
      m("Mirage", H, 1993, 2000),
    ],
  },
];

export const MARCAS_DO_CATALOGO: string[] = CATALOGO_VEICULOS.map((c) => c.marca);

function norma(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** As 15 marcas do catálogo primeiro (ordem de venda), depois as outras em ordem alfabética. */
export function opcoesDeMarca(): string[] {
  const vistas = new Set(MARCAS_DO_CATALOGO.map(norma));
  const outras: string[] = [];
  for (const marca of MARCAS_VEICULO) {
    const chave = norma(marca);
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    outras.push(marca);
  }
  outras.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  return [...MARCAS_DO_CATALOGO, ...outras];
}

/** Modelos sugeridos da marca. Marca fora das 15 ou vazia: lista vazia (texto livre). */
export function modelosDaMarca(marca: string): ModeloDoCatalogo[] {
  const chave = norma(marca);
  if (!chave) return [];
  return CATALOGO_VEICULOS.find((c) => norma(c.marca) === chave)?.modelos ?? [];
}

export function acharModelo(marca: string, modelo: string): ModeloDoCatalogo | null {
  const chave = norma(modelo);
  if (!chave) return null;
  return modelosDaMarca(marca).find((x) => norma(x.nome) === chave) ?? null;
}

/** Anos do mais novo pro mais velho. Ainda vendido: até `anoAtual`. Modelo desconhecido: vazio. */
export function anosDoModelo(marca: string, modelo: string, anoAtual: number): number[] {
  const achado = acharModelo(marca, modelo);
  if (!achado) return [];
  const fim = achado.anos.ate ?? anoAtual;
  const anos: number[] = [];
  for (let a = fim; a >= achado.anos.de; a--) anos.push(a);
  return anos;
}

export function tipoDoModelo(marca: string, modelo: string): TipoVeiculo | null {
  return acharModelo(marca, modelo)?.tipo ?? null;
}
