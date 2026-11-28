import { escaparHtml } from "@/lib/html";
import { ESTILO_DOCUMENTO, cabecalhoDaLojaHtml } from "@/lib/garantiaDocumento";
import { formatarMoeda, formatarPercentual } from "@/schemas/dinheiro";
import {
  FRASE_DO_MES_DO_DRE,
  rotuloDoMes,
  type Dre,
  type LinhaDre,
  type ValorDoMesDre,
} from "@/schemas/dre";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";

// Sakura System — AutoCenter Edition
// O DRE (#388) pronto pra imprimir ou salvar em PDF: o mesmo papel dos outros
// documentos (garantia, orçamento), em A4 deitado, com TODAS as linhas abertas.
// Nenhuma conta aqui: só mostra o que `montarDre` devolveu. Todo texto que
// vem do cadastro (nome da loja, categoria) passa por `escaparHtml` (#978).

/**
 * As linhas do DRE cujo detalhe mostra também o "% do resultado bruto" (as
 * despesas, que se medem contra o que sobrou das vendas). A tela e o documento
 * usam a mesma lista.
 */
export const GRUPOS_COM_PERCENTUAL_DO_RESULTADO_BRUTO: readonly string[] = [
  "despesas_operacionais",
  "outras_despesas",
  "despesas_financeiras",
];

const MARCA_DO_SINAL = { "+": "(+)", "-": "(−)", "=": "(=)" } as const;

export interface DadosDreDocumento {
  dre: Dre;
  nomeDaLoja: string;
  /** Os dados da loja (endereço, telefone) pro cabeçalho; sem eles, só o nome. */
  cabecalho?: ConfiguracaoFiscalLoja | null;
  /** Quando foi gerado, já escrito ("27/11/2026"). */
  geradoEm: string;
}

const ESTILO_DO_DRE = `  @page { size: A4 landscape; margin: 12mm; }
  body { max-width: none; margin: 16px auto; }
  table.dre { font-size: 11px; }
  table.dre th, table.dre td { white-space: nowrap; }
  table.dre th:first-child, table.dre td:first-child { white-space: normal; }
  table.dre tr.resultado td { font-weight: 700; background: #fff0fb; }
  table.dre td.filha-1 { padding-left: 24px; }
  table.dre td.filha-2 { padding-left: 44px; }
  .pequeno { display: block; font-size: 9px; color: #6a5a6a; font-weight: 400; }
  .faixa { border: 1px solid #b38dac; border-radius: 6px; padding: 6px 10px; font-size: 12px; margin: 8px 0; }
  .rodape { font-size: 11px; color: #6a5a6a; margin-top: 12px; line-height: 1.5; }
  tr { break-inside: avoid; }
`;

function celula(
  v: ValorDoMesDre,
  comResultadoBruto: boolean,
  ehTotal: boolean,
): string {
  const classe = ehTotal ? ' class="numero total"' : ' class="numero"';
  if (v.naoInformado) return `<td${classe}>não informadas</td>`;
  const partes = [
    `${formatarMoeda(v.valor)}${v.parcial ? ' <span class="pequeno">(parte não informada)</span>' : ""}`,
  ];
  partes.push(
    `<span class="pequeno">${v.sobreReceita === null ? "—" : `${formatarPercentual(v.sobreReceita)} da receita`}</span>`,
  );
  if (comResultadoBruto) {
    partes.push(
      `<span class="pequeno">${v.sobreResultadoBruto === null ? "—" : `${formatarPercentual(v.sobreResultadoBruto)} do resultado bruto`}</span>`,
    );
  }
  return `<td${classe}>${partes.join("")}</td>`;
}

function linhaHtml(
  linha: LinhaDre,
  nivel: number,
  comResultadoBruto: boolean,
): string {
  const rotulo = `${MARCA_DO_SINAL[linha.sinal]} ${escaparHtml(linha.rotulo)}`;
  const classeDaCelula =
    nivel > 0 ? ` class="filha-${Math.min(nivel, 2)}"` : "";
  const celulas = linha.colunas
    .map((v, i) => celula(v, comResultadoBruto, i === linha.colunas.length - 1))
    .join("");
  const aqui = `<tr${linha.sinal === "=" ? ' class="resultado"' : ""}><td${classeDaCelula}>${rotulo}</td>${celulas}</tr>`;
  // Dentro de um grupo de despesa, as filhas (e as netas) mostram o % do resultado bruto.
  const filhasComResultadoBruto =
    comResultadoBruto ||
    GRUPOS_COM_PERCENTUAL_DO_RESULTADO_BRUTO.includes(linha.chave);
  return (
    aqui +
    linha.filhas
      .map((f) => linhaHtml(f, nivel + 1, filhasComResultadoBruto))
      .join("")
  );
}

export function montarHtmlDre({
  dre,
  nomeDaLoja,
  cabecalho,
  geradoEm,
}: DadosDreDocumento): string {
  const loja = {
    ...(cabecalho ?? {}),
    nome_fantasia: cabecalho?.nome_fantasia || nomeDaLoja,
  } as ConfiguracaoFiscalLoja;
  const primeiro = dre.meses[0];
  const ultimo = dre.meses[dre.meses.length - 1];
  const periodo =
    primeiro && ultimo
      ? `${rotuloDoMes(primeiro)} a ${rotuloDoMes(ultimo)}`
      : "";
  const titulo = escaparHtml(`DRE — ${nomeDaLoja}`);

  const cabecalhoDaTabela = [
    `<th>Linha</th>`,
    ...dre.meses.map(
      (m) => `<th class="numero">${escaparHtml(rotuloDoMes(m))}</th>`,
    ),
    `<th class="numero">Total</th>`,
  ].join("");

  const avisos: string[] = [];
  if (dre.semGrupo.quantidade > 0) {
    avisos.push(
      `${formatarMoeda(dre.semGrupo.total)} em ${dre.semGrupo.quantidade} lançamento${dre.semGrupo.quantidade === 1 ? "" : "s"} ainda sem grupo: não entram no DRE.`,
    );
  }
  if (dre.algumCustoNaoInformado) {
    avisos.push(
      "Há peça avulsa sem custo informado: o custo dela fica de fora e o resultado aparece maior do que é.",
    );
  }

  const fora =
    dre.foraDoResultado.quantidade > 0
      ? ` ${dre.foraDoResultado.quantidade} lançamento${dre.foraDoResultado.quantidade === 1 ? "" : "s"} em “Fora do resultado”, somando ${formatarMoeda(dre.foraDoResultado.total)}.`
      : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${titulo}</title>
<style>
${ESTILO_DOCUMENTO}
${ESTILO_DO_DRE}</style>
</head>
<body>
  ${cabecalhoDaLojaHtml(loja, `DRE — o resumo do dinheiro da loja, mês a mês${periodo ? ` (${escaparHtml(periodo)})` : ""}`)}
  ${avisos.map((a) => `<p class="faixa">${escaparHtml(a)}</p>`).join("\n  ")}
  <table class="dre">
    <thead><tr>${cabecalhoDaTabela}</tr></thead>
    <tbody>
      ${dre.linhas.map((l) => linhaHtml(l, 0, false)).join("\n      ")}
    </tbody>
  </table>
  <p class="rodape">${escaparHtml(FRASE_DO_MES_DO_DRE)} Categorias em “Fora do resultado” não entram.${escaparHtml(fora)}</p>
  <p class="rodape">Gerado em ${escaparHtml(geradoEm)}.</p>
</body>
</html>`;
}
