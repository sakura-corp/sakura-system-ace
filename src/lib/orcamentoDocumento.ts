import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";
import { escaparHtml } from "@/lib/html";
import { diaBrasileiro, diaLocal, hojeLocal } from "@/lib/datas";
import { orcamentoVencido } from "@/schemas/orcamento";
import { cabecalhoDaLojaHtml, ESTILO_DOCUMENTO } from "@/lib/garantiaDocumento";
import { formatarMoeda } from "@/schemas/dinheiro";
import { somarValoresLiquidos, valorLiquidoDoItem } from "@/schemas/valorItem";
import { nomeDocumento } from "@/types/os";
import type { ItemOS, OrdemServico } from "@/types/os";

// Sakura System — AutoCenter Edition
// O documento do orçamento (#1019): uma folha pra entregar na mão do cliente,
// com o cabeçalho da loja (o mesmo da garantia), os itens, o total e a
// validade. O mesmo documento serve pro orçamento do balcão (#888), que pode
// vir sem cliente e sem veículo: aí os blocos somem.
//
// Não faz conta: o valor de cada linha e o total vêm de `src/schemas/`.
// Todo texto do cadastro passa por `escaparHtml` (#978).

export interface DadosOrcamentoDocumento {
  ordem: Pick<
    OrdemServico,
    | "numero"
    | "numero_orcamento"
    | "status"
    | "tipo"
    | "data_abertura"
    | "validade"
    | "descricao_problema"
    | "cliente"
    | "veiculo"
  > & { itens?: readonly ItemOS[] };
  loja: ConfiguracaoFiscalLoja | null;
  /** O telefone do cliente, se a tela tiver (sem o módulo Clientes não chega). */
  telefoneCliente?: string | null;
  /** O dia de hoje ("AAAA-MM-DD"); só os testes passam. */
  hoje?: string;
}

// Vencido (ainda aberto, dá pra aprovar) não pode sair "Válido até" uma data
// que já passou: o cliente levaria um papel enganoso. A regra é a da tela
// (`orcamentoVencido`, em src/schemas/orcamento.ts).
function linhaDaValidade(validade: string | null | undefined, hoje: string): string {
  if (!validade) return "";
  const dia = diaBrasileiro(validade);
  return orcamentoVencido(validade, hoje)
    ? `<p class="validade">Venceu em ${dia}</p>`
    : `<p class="validade">Válido até ${dia}</p>`;
}

function linhasDosItens(itens: readonly ItemOS[]): string {
  return itens
    .map(
      (item) => `
        <tr>
          <td>${escaparHtml(item.descricao)}</td>
          <td class="numero">${item.quantidade.toLocaleString("pt-BR")}</td>
          <td class="numero">${formatarMoeda(item.preco_unitario)}</td>
          <td class="numero">${formatarMoeda(item.desconto)}</td>
          <td class="numero">${formatarMoeda(valorLiquidoDoItem(item))}</td>
        </tr>
      `,
    )
    .join("");
}

function blocoDoCliente(nome: string | undefined, telefone: string | null | undefined): string {
  if (!nome) return "";
  return `
  <div class="titulo-secao">Cliente</div>
  <div class="grid">
    <div class="bloco">
      <p class="rotulo">Nome</p>
      <p class="valor">${escaparHtml(nome)}</p>
    </div>
    ${
      telefone
        ? `<div class="bloco">
      <p class="rotulo">Telefone</p>
      <p class="valor">${escaparHtml(telefone)}</p>
    </div>`
        : ""
    }
  </div>`;
}

function blocoDoVeiculo(veiculo: DadosOrcamentoDocumento["ordem"]["veiculo"]): string {
  if (!veiculo) return "";
  const marcaModelo = [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ");
  return `
  <div class="titulo-secao">Veículo</div>
  <div class="grid">
    <div class="bloco">
      <p class="rotulo">Placa</p>
      <p class="valor">${escaparHtml(veiculo.placa || "—")}</p>
    </div>
    ${
      marcaModelo
        ? `<div class="bloco">
      <p class="rotulo">Marca / Modelo</p>
      <p class="valor">${escaparHtml(marcaModelo)}</p>
    </div>`
        : ""
    }
    ${
      veiculo.cor
        ? `<div class="bloco">
      <p class="rotulo">Cor</p>
      <p class="valor">${escaparHtml(veiculo.cor)}</p>
    </div>`
        : ""
    }
  </div>`;
}

export function montarHtmlOrcamento(dados: DadosOrcamentoDocumento): string {
  const { ordem, loja, telefoneCliente, hoje = hojeLocal() } = dados;
  const itens = ordem.itens ?? [];
  const nomeDoc = escaparHtml(nomeDocumento(ordem));
  const total = somarValoresLiquidos(itens);
  const linhaDoDocumento = `${nomeDoc} · ${diaBrasileiro(diaLocal(ordem.data_abertura))}`;
  const observacao = ordem.descricao_problema?.trim();

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${nomeDoc}</title>
<style>
${ESTILO_DOCUMENTO}
  .validade { text-align: center; font-size: 13px; font-weight: 600; margin: 6px 0 0; }
  .aviso-fiscal { text-align: center; font-size: 11px; color: #6a5a6a; margin-top: 24px; }
  .observacao { white-space: pre-wrap; font-size: 12px; line-height: 1.5; margin: 0; }
</style>
</head>
<body>
  ${cabecalhoDaLojaHtml(loja, linhaDoDocumento)}
  ${linhaDaValidade(ordem.validade, hoje)}
  ${blocoDoCliente(ordem.cliente?.nome, telefoneCliente)}
  ${blocoDoVeiculo(ordem.veiculo)}

  <div class="titulo-secao">Peças / Serviços</div>
  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th class="numero">Qtde.</th>
        <th class="numero">Valor unit.</th>
        <th class="numero">Desconto</th>
        <th class="numero">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${linhasDosItens(itens)}
    </tbody>
  </table>
  <p class="total-geral">Total ${formatarMoeda(total)}</p>
  ${
    observacao
      ? `<div class="titulo-secao">Observação</div><p class="observacao">${escaparHtml(observacao)}</p>`
      : ""
  }

  <p class="aviso-fiscal">Este orçamento não é documento fiscal.</p>
</body>
</html>`;
}
