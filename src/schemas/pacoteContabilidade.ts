// O pacote do mês pro contador (#383): o plano do .zip, sem buscar nada.
// Quem busca o XML (Storage) e o PDF (Focus NFe, pelo porteiro) e monta o
// .zip é `gerarPacoteContabilidade`, em lib/notasFiscais.ts.
//
// O PDF leva o nome do XML com ".pdf" (e não o `nomeArquivoDanfe`, que dá
// "NFC-e-123.pdf"): assim "nfe-123.xml" e "nfe-123.pdf" ficam lado a lado na
// pasta, até em nota enviada à mão com nome qualquer, e o número que separa
// dois nomes iguais ("nota (2).xml") vale pros dois arquivos da mesma nota.
import type { NotaFiscalArquivo, TipoNotaFiscal } from "@/types/notaFiscal";
import { motivoDanfeIndisponivel } from "./danfe";
import { NOTA_LABEL } from "./situacaoFiscal";

export type ResultadoPdf = { ok: true } | { ok: false; motivo: string };

export interface EntradaDoPacote {
  caminho: string;
  nota: NotaFiscalArquivo;
  arquivo: "xml" | "pdf";
}

export interface PlanoDoPacote {
  entradas: EntradaDoPacote[];
  leiaMe: string;
}

// A NFC-e se chama "nfe" no código e no banco (a aba é "NFC-e"); no pacote a
// pasta tem o nome que o contador reconhece.
export const PASTA_DO_TIPO: Record<TipoNotaFiscal, string> = {
  nfe: "nfce",
  nfse: "nfse",
};

// Cancelada é o mesmo critério do resto do sistema (schemas/situacaoFiscal.ts):
// `status` "cancelado". Ela entra no pacote (o contador precisa saber dela),
// mas marcada no nome, pra ninguém lançar como venda.
export function notaCancelada(nota: NotaFiscalArquivo): boolean {
  return nota.status === "cancelado";
}

// Por que a nota vai sem PDF, já antes de pedir à Focus NFe. Quem decide se
// tem PDF é `motivoDanfeIndisponivel` (a mesma regra do "Ver DANFE"); aqui só
// troca o texto da tela por uma linha curta pro LEIA-ME.
export function motivoSemPdf(nota: NotaFiscalArquivo): string | null {
  if (motivoDanfeIndisponivel(nota) === null) return null;
  if (nota.origem !== "automatica") {
    return "enviada à mão (upload do XML), o PDF nunca passou pelo sistema";
  }
  return (
    "emitida antes de o sistema guardar a referência da nota, não dá pra pedir o PDF de " +
    "novo (ela continua no painel da Focus NFe)"
  );
}

function semExtensaoXml(nome: string): string {
  return nome.replace(/\.xml$/i, "");
}

// O primeiro nome livre: "nota", depois "nota (2)", "nota (3)"... O número
// vai antes da extensão, e o XML e o PDF da mesma nota ganham o mesmo, pra
// ficarem reconhecíveis lado a lado. Livre quer dizer livre pros dois.
function baseLivre(base: string, usados: Set<string>): string {
  let candidata = base;
  for (let n = 2; ocupada(candidata, usados); n += 1) candidata = `${base} (${n})`;
  usados.add(`${candidata}.xml`.toLowerCase());
  usados.add(`${candidata}.pdf`.toLowerCase());
  return candidata;
}

function ocupada(base: string, usados: Set<string>): boolean {
  return usados.has(`${base}.xml`.toLowerCase()) || usados.has(`${base}.pdf`.toLowerCase());
}

export function planejarPacoteContabilidade({
  mes,
  notas,
  pdfs,
  tipo,
}: {
  mes: string;
  /** Pacote de uma aba só (NFC-e ou NFS-e); sem isto, é o dos dois tipos. */
  tipo?: TipoNotaFiscal;
  notas: NotaFiscalArquivo[];
  pdfs: ReadonlyMap<string, ResultadoPdf>;
}): PlanoDoPacote {
  const entradas: EntradaDoPacote[] = [];
  const semPdf: string[] = [];
  // Os nomes já usados, por pasta, em minúscula: o Windows não separa
  // "Nota.xml" de "nota.xml", e um sobrescreveria o outro ao descompactar.
  const usados = new Map<string, Set<string>>();
  for (const nota of notas) {
    const pasta = PASTA_DO_TIPO[nota.tipo];
    const daPasta = usados.get(pasta) ?? new Set<string>();
    usados.set(pasta, daPasta);
    const marca = notaCancelada(nota) ? "CANCELADA-" : "";
    const base = baseLivre(`${marca}${semExtensaoXml(nota.nome_arquivo)}`, daPasta);
    const caminhoXml = `${pasta}/${base}.xml`;
    entradas.push({ caminho: caminhoXml, nota, arquivo: "xml" });
    const pdf = pdfs.get(nota.id);
    if (pdf?.ok) {
      entradas.push({ caminho: `${pasta}/${base}.pdf`, nota, arquivo: "pdf" });
    } else {
      // Sem resultado nenhum também é "sem PDF": a nota nunca some calada.
      const motivo = pdf ? pdf.motivo : "o PDF não foi buscado";
      const numero = nota.numero ? ` nº ${nota.numero}` : "";
      semPdf.push(`- ${NOTA_LABEL[nota.tipo]}${numero} (${caminhoXml}): ${motivo}`);
    }
  }
  return { entradas, leiaMe: textoLeiaMe(mes, notas, semPdf, tipo) };
}

const NOMES_DOS_MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "2026-10" → "outubro de 2026". Sem `Date`, pra não depender de fuso. */
export function mesPorExtenso(mes: string): string {
  const [ano, numero] = mes.split("-");
  const nome = NOMES_DOS_MESES[Number(numero) - 1];
  return nome ? `${nome} de ${ano}` : mes;
}

function plural(quantidade: number, singular: string, varias: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : varias}`;
}

// Linhas com \r\n: o contador abre no Bloco de Notas do Windows.
function textoLeiaMe(
  mes: string,
  notas: NotaFiscalArquivo[],
  semPdf: string[],
  tipo?: TipoNotaFiscal,
): string {
  const linhas = [`Pacote de notas fiscais de ${mesPorExtenso(mes)}`, ""];
  if (tipo) {
    const outro = tipo === "nfe" ? "nfse" : "nfe";
    linhas.push(
      `ATENÇÃO: este pacote tem SÓ das ${NOTA_LABEL[tipo]} do mês. As ${NOTA_LABEL[outro]} não`,
      `estão aqui: estão no pacote das ${NOTA_LABEL[outro]} (aba ${NOTA_LABEL[outro]} em Notas fiscais)`,
      'ou no botão "Gerar o pacote" da Central do dia, que leva as duas juntas.',
      "",
      `Aqui está o XML de cada ${NOTA_LABEL[tipo]} do mês e, quando o sistema conseguiu buscar, o PDF`,
    );
  } else {
    linhas.push(
      "Este pacote tem o XML de cada nota do mês e, quando o sistema conseguiu buscar, o PDF",
    );
  }
  linhas.push(
    "ao lado, com o mesmo nome. As canceladas estão aqui também, com CANCELADA- no começo",
    "do nome do arquivo: elas não valem como venda.",
    "",
  );

  for (const tipo of Object.keys(PASTA_DO_TIPO) as TipoNotaFiscal[]) {
    const doTipo = notas.filter((nota) => nota.tipo === tipo);
    if (doTipo.length === 0) continue;
    const canceladas = doTipo.filter(notaCancelada).length;
    const contagem = plural(doTipo.length, "nota", "notas");
    const marca = canceladas > 0 ? `, ${plural(canceladas, "cancelada", "canceladas")}` : "";
    linhas.push(`${NOTA_LABEL[tipo]} (pasta ${PASTA_DO_TIPO[tipo]}): ${contagem}${marca}`);
  }

  linhas.push("");
  if (semPdf.length === 0) {
    linhas.push("Todas as notas estão com o XML e o PDF.");
  } else {
    linhas.push(`Ficaram sem PDF (só o XML) ${plural(semPdf.length, "nota", "notas")}:`);
    linhas.push(...semPdf);
    linhas.push("");
    linhas.push("O XML é o documento que vale. O PDF é só a versão pra ler.");
  }

  return `${linhas.join("\r\n")}\r\n`;
}

const FORMATO_DO_MES = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** O mês "AAAA-MM", ou um erro em português que a tela pode mostrar. */
function conferirMes(mes: string): { ano: number; mes: number } {
  const partes = FORMATO_DO_MES.exec(mes);
  if (!partes) {
    throw new Error(`O mês do pacote precisa ser no formato AAAA-MM (veio "${mes}").`);
  }
  return { ano: Number(partes[1]), mes: Number(partes[2]) };
}

export function nomeDoPacote(mes: string, tipo?: TipoNotaFiscal): string {
  conferirMes(mes);
  return `pacote-contabilidade-${mes}${tipo ? `-${PASTA_DO_TIPO[tipo]}` : ""}.zip`;
}

// `competencia` é uma data "AAAA-MM-DD": o dia 1º do mês, ou (em nota emitida
// por versão antiga) o dia da emissão. Os 7 primeiros caracteres são o mês.
export function notasDoMes(notas: NotaFiscalArquivo[], mes: string): NotaFiscalArquivo[] {
  conferirMes(mes);
  return notas.filter((nota) => nota.competencia.slice(0, 7) === mes);
}

/** O mês pro filtro no banco: `competencia >= de` e `competencia < ateAntesDe`. */
export function intervaloDoMes(mes: string): { de: string; ateAntesDe: string } {
  const { ano, mes: numero } = conferirMes(mes);
  const seguinte = numero === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: numero + 1 };
  return {
    de: `${mes}-01`,
    ateAntesDe: `${seguinte.ano}-${String(seguinte.mes).padStart(2, "0")}-01`,
  };
}
