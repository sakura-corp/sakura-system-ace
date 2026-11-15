// Recibo de comissão pra imprimir (item TL-46, sub-item 2): o documento que
// acompanha o pagamento, com as OS que formaram o valor e o espaço pra
// assinatura. Montado a partir do RETRATO gravado no pagamento (migration
// 0059), e não do recálculo de hoje — recibo diz o que foi pago naquele dia.
//
// Mesma técnica da garantia e do recibo de nota: HTML num iframe, com o
// botão Imprimir do próprio app.
import { diaBrasileiro as dataBr } from "@/lib/datas";
import { escaparHtml } from "@/lib/html";
import { formatarMoeda } from "@/schemas/dinheiro";
import type { ComissaoFechamento } from "@/types/comissaoFechamento";
import { nomeOrdem } from "@/types/os";

// Todo texto que veio do banco passa por `escaparHtml` antes de virar HTML.
// A função mora em `@/lib/html` (#978); o reexport fica pra quem já importa daqui.
export { escaparHtml };


const PAPEL = { vendedor: "Vendedor (atendeu a OS)", tecnico: "Técnico (executou o item)" } as const;

export function montarHtmlReciboComissao({
  nomeLoja,
  pagamento,
}: {
  nomeLoja: string;
  pagamento: ComissaoFechamento;
}): string {
  const linhas = [...pagamento.snapshot]
    .sort((a, b) => a.numero - b.numero || a.papel.localeCompare(b.papel))
    .map(
      (i) =>
        `<tr><td>${nomeOrdem(i.numero, i.tipo)}</td><td>${PAPEL[i.papel]}</td><td class="n">${formatarMoeda(i.comissao)}</td></tr>`,
    )
    .join("");

  const diferente = pagamento.valor_pago !== pagamento.valor_calculado;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo de comissão</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 32px; font-size: 13px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { color: #444; margin: 0 0 20px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border-bottom: 1px solid #ccc; padding: 6px 4px; text-align: left; }
  td.n, th.n { text-align: right; }
  .total td { font-weight: bold; border-bottom: none; }
  .assinatura { margin-top: 64px; display: flex; gap: 48px; }
  .assinatura div { flex: 1; border-top: 1px solid #111; padding-top: 6px; text-align: center; }
  .obs { margin-top: 12px; }
</style></head>
<body>
  <h1>Recibo de comissão</h1>
  <p class="sub">${escaparHtml(nomeLoja)}</p>
  <p>Recebi de <strong>${escaparHtml(nomeLoja)}</strong> a quantia de
     <strong>${formatarMoeda(pagamento.valor_pago)}</strong>, referente à comissão de
     <strong>${escaparHtml(pagamento.funcionario_nome)}</strong> no período de
     ${dataBr(pagamento.periodo_inicio)} a ${dataBr(pagamento.periodo_fim)}${
       pagamento.percentual !== null ? ` (${String(pagamento.percentual).replace(".", ",")}% sobre o lucro)` : ""
     }.</p>
  <table>
    <thead><tr><th>OS</th><th>Papel</th><th class="n">Comissão</th></tr></thead>
    <tbody>${linhas || '<tr><td colspan="3">Nenhuma OS no período.</td></tr>'}</tbody>
    <tfoot>
      <tr class="total"><td colspan="2">Calculado</td><td class="n">${formatarMoeda(pagamento.valor_calculado)}</td></tr>
      ${diferente ? `<tr class="total"><td colspan="2">Pago</td><td class="n">${formatarMoeda(pagamento.valor_pago)}</td></tr>` : ""}
    </tfoot>
  </table>
  ${pagamento.observacao ? `<p class="obs">Observação: ${escaparHtml(pagamento.observacao)}</p>` : ""}
  <p>Data do pagamento: ${dataBr(pagamento.data_pagamento)}</p>
  <div class="assinatura">
    <div>${escaparHtml(pagamento.funcionario_nome)}</div>
    <div>${escaparHtml(nomeLoja)}</div>
  </div>
</body></html>`;
}
