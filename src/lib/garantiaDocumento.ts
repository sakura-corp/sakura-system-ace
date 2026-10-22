import type { Cliente, Veiculo } from "@/types/cliente";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";
import { FORMA_PAGAMENTO_LABEL, nomeDocumento } from "@/types/os";
import type { ItemOS, OrdemServico } from "@/types/os";

// Sakura System — AutoCenter Edition
// Monta o documento de garantia da OS num layout estruturado (cabeçalho da
// loja, dados do cliente/veículo, tabela de itens, totalização, forma de
// pagamento, texto de garantia configurável e linhas de assinatura) —
// inspirado no modelo que a usuária já usa hoje na Pneus Amigão. Reaproveita
// a mesma técnica da versão visual da nota fiscal (HTML pra imprimir/baixar).

export interface DadosGarantiaDocumento {
  ordem: OrdemServico;
  cliente: Cliente | null;
  veiculo: Veiculo | null;
  loja: ConfiguracaoFiscalLoja | null;
  valorCobrado: number | null;
  textoGarantia: string;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function addMeses(data: Date, meses: number): Date {
  const nova = new Date(data);
  nova.setMonth(nova.getMonth() + meses);
  return nova;
}

function enderecoLoja(loja: ConfiguracaoFiscalLoja | null): string | null {
  if (!loja) return null;
  const partes = [
    [loja.rua, loja.numero].filter(Boolean).join(", "),
    loja.bairro,
    [loja.cidade, loja.uf].filter(Boolean).join("/"),
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(" — ") : null;
}

function enderecoCliente(cliente: Cliente | null): string | null {
  if (!cliente) return null;
  const partes = [
    [cliente.rua, cliente.numero].filter(Boolean).join(", "),
    cliente.bairro,
    [cliente.cidade, cliente.uf].filter(Boolean).join("/"),
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(" — ") : null;
}

function linhaItens(itens: ItemOS[]): string {
  return itens
    .map(
      (item) => `
        <tr>
          <td>${item.descricao}</td>
          <td>${item.tecnico?.nome ?? "—"}</td>
          <td class="numero">${item.quantidade}</td>
          <td class="numero">${formatarMoeda(item.preco_unitario)}</td>
          <td class="numero">${formatarMoeda(item.quantidade * item.preco_unitario - item.desconto)}</td>
        </tr>
      `,
    )
    .join("");
}

export function montarHtmlGarantiaOS(dados: DadosGarantiaDocumento): string {
  const { ordem, cliente, veiculo, loja, valorCobrado, textoGarantia } = dados;
  const itens = ordem.itens ?? [];

  const totalProdutos = itens
    .filter((i) => i.tipo === "peca")
    .reduce((soma, i) => soma + i.quantidade * i.preco_unitario, 0);
  const totalServicos = itens
    .filter((i) => i.tipo === "servico")
    .reduce((soma, i) => soma + i.quantidade * i.preco_unitario, 0);
  const totalDescontos = itens.reduce((soma, i) => soma + i.desconto, 0);
  const subtotal = totalProdutos + totalServicos;
  const totalGeral = subtotal - totalDescontos;

  const valorFinal = valorCobrado ?? totalGeral;
  const parcelas = ordem.parcelas ?? 1;
  const formaPagamentoLabel = ordem.forma_pagamento
    ? (FORMA_PAGAMENTO_LABEL[ordem.forma_pagamento] ?? ordem.forma_pagamento)
    : "—";

  const dataBase = ordem.data_fechamento ? new Date(ordem.data_fechamento) : new Date();
  const listaParcelas =
    parcelas > 1
      ? Array.from({ length: parcelas }, (_, i) => ({
          numero: i + 1,
          vencimento: addMeses(dataBase, i + 1),
          valor: valorFinal / parcelas,
        }))
      : [];

  const nomeLoja = loja?.nome_fantasia || loja?.razao_social || "—";
  const contatoLoja = [loja?.telefone, loja?.email].filter(Boolean).join(" · ");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Garantia — ${nomeDocumento(ordem)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Arial, sans-serif;
    color: #3a2a3f;
    max-width: 720px;
    margin: 24px auto;
    padding: 0 16px;
  }
  h1 { font-size: 20px; margin: 0 0 4px; text-align: center; }
  .subtitulo { text-align: center; font-size: 12px; color: #6a5a6a; margin: 0; }
  .cabecalho { border-bottom: 2px solid #b38dac; padding-bottom: 12px; margin-bottom: 16px; }
  .titulo-secao {
    background: #fff0fb;
    color: #6e4d68;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 6px 10px;
    border-radius: 6px;
    margin: 18px 0 8px;
  }
  .grid { display: flex; flex-wrap: wrap; gap: 16px; }
  .bloco { flex: 1 1 200px; }
  .rotulo { font-size: 10px; color: #8a7a8a; margin: 0 0 2px; text-transform: uppercase; }
  .valor { font-size: 13px; margin: 0 0 6px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 12px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5dde5; }
  th { color: #8a7a8a; font-weight: 600; font-size: 10px; text-transform: uppercase; }
  td.numero, th.numero { text-align: right; }
  .totais { display: flex; justify-content: flex-end; gap: 24px; margin-top: 8px; font-size: 12px; }
  .totais strong { display: block; font-size: 13px; }
  .total-geral { text-align: right; font-size: 16px; font-weight: 700; margin-top: 10px; }
  .texto-garantia { white-space: pre-wrap; font-size: 12px; line-height: 1.5; }
  .assinaturas { display: flex; gap: 16px; margin-top: 48px; }
  .assinatura { flex: 1; text-align: center; font-size: 11px; color: #6a5a6a; }
  .linha-assinatura { border-top: 1px solid #3a2a3f; margin-bottom: 4px; padding-top: 4px; }
  @media print {
    body { margin: 0; }
  }
</style>
</head>
<body>
  <div class="cabecalho">
    <h1>${nomeLoja}</h1>
    ${enderecoLoja(loja) ? `<p class="subtitulo">${enderecoLoja(loja)}</p>` : ""}
    ${contatoLoja ? `<p class="subtitulo">${contatoLoja}</p>` : ""}
    <p class="subtitulo" style="margin-top:8px;font-weight:600;">
      Garantia — ${nomeDocumento(ordem)} · ${formatarData(ordem.data_fechamento)}
    </p>
  </div>

  <div class="titulo-secao">Dados do cliente</div>
  <div class="grid">
    <div class="bloco">
      <p class="rotulo">Nome</p>
      <p class="valor">${cliente?.nome ?? ordem.cliente?.nome ?? "—"}</p>
    </div>
    <div class="bloco">
      <p class="rotulo">${cliente?.tipo_pessoa === "juridica" ? "CNPJ" : "CPF"}</p>
      <p class="valor">${cliente?.cpf_cnpj ?? "—"}</p>
    </div>
    <div class="bloco">
      <p class="rotulo">Telefone</p>
      <p class="valor">${cliente?.telefone ?? "—"}</p>
    </div>
    <div class="bloco" style="flex-basis:100%;">
      <p class="rotulo">Endereço</p>
      <p class="valor">${enderecoCliente(cliente) ?? "—"}</p>
    </div>
  </div>

  <div class="titulo-secao">Dados do veículo</div>
  <div class="grid">
    <div class="bloco">
      <p class="rotulo">Marca / Modelo</p>
      <p class="valor">${[veiculo?.marca, veiculo?.modelo].filter(Boolean).join(" / ") || "—"}</p>
    </div>
    <div class="bloco">
      <p class="rotulo">Cor</p>
      <p class="valor">${veiculo?.cor ?? "—"}</p>
    </div>
    <div class="bloco">
      <p class="rotulo">Placa</p>
      <p class="valor">${veiculo?.placa ?? ordem.veiculo?.placa ?? "—"}</p>
    </div>
    <div class="bloco">
      <p class="rotulo">Ano</p>
      <p class="valor">${veiculo?.ano ?? "—"}</p>
    </div>
  </div>

  <div class="titulo-secao">Peças / Serviços</div>
  <table>
    <thead>
      <tr>
        <th>Produto / Serviço</th>
        <th>Técnico</th>
        <th class="numero">Qtde.</th>
        <th class="numero">Valor unit.</th>
        <th class="numero">Valor total</th>
      </tr>
    </thead>
    <tbody>
      ${linhaItens(itens)}
    </tbody>
  </table>

  <div class="titulo-secao">Totalização</div>
  <div class="totais">
    <span>Produtos<strong>${formatarMoeda(totalProdutos)}</strong></span>
    <span>Serviços<strong>${formatarMoeda(totalServicos)}</strong></span>
    <span>Subtotal<strong>${formatarMoeda(subtotal)}</strong></span>
    <span>Descontos<strong>${formatarMoeda(totalDescontos)}</strong></span>
  </div>
  <p class="total-geral">Total geral: ${formatarMoeda(totalGeral)}</p>

  <div class="titulo-secao">Forma de pagamento</div>
  ${
    parcelas > 1
      ? `<table>
          <thead>
            <tr><th>Parcela</th><th>Vencimento</th><th>Tipo</th><th class="numero">Valor</th></tr>
          </thead>
          <tbody>
            ${listaParcelas
              .map(
                (p) => `
                  <tr>
                    <td>${p.numero}x</td>
                    <td>${p.vencimento.toLocaleDateString("pt-BR")}</td>
                    <td>${formaPagamentoLabel}</td>
                    <td class="numero">${formatarMoeda(p.valor)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
        <p class="total-geral">Total geral: ${formatarMoeda(valorFinal)}</p>`
      : `<p class="valor">${formaPagamentoLabel} — ${formatarMoeda(valorFinal)}</p>`
  }

  ${
    textoGarantia
      ? `<div class="titulo-secao">Garantia</div><p class="texto-garantia">${textoGarantia
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</p>`
      : ""
  }

  <div class="assinaturas">
    <div class="assinatura"><div class="linha-assinatura">&nbsp;</div>Assinatura do cliente</div>
    <div class="assinatura"><div class="linha-assinatura">&nbsp;</div>Assinatura do técnico</div>
    <div class="assinatura"><div class="linha-assinatura">&nbsp;</div>Assinatura do gerente</div>
  </div>
</body>
</html>`;
}
