import { describe, expect, it } from "vitest";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";
import type { ItemOS, OrdemServico, TipoItemOS } from "@/types/os";
import { formatarMoeda } from "@/schemas/dinheiro";
import { somarValoresLiquidos, valorLiquidoDoItem } from "@/schemas/valorItem";
import { montarHtmlOrcamento } from "./orcamentoDocumento";

/**
 * O documento do orçamento (#1019): o papel que o cliente leva pra casa.
 * O documento não faz conta: os valores têm que ser os de `src/schemas/`.
 */

/** O espaço que não quebra, que o formatarMoeda põe depois do "R$". */
const ESPACO_FIXO = String.fromCharCode(160);

let proximoId = 0;

function item(
  tipo: TipoItemOS,
  descricao: string,
  quantidade: number,
  preco_unitario: number,
  desconto = 0,
): ItemOS {
  proximoId += 1;
  return {
    id: `item-${proximoId}`,
    ordem_servico_id: "orc-1",
    tipo,
    peca_id: null,
    servico_id: null,
    tecnico_id: null,
    descricao,
    quantidade,
    preco_unitario,
    desconto,
    tecnico: null,
  };
}

function orcamento(itens: ItemOS[], extra: Partial<OrdemServico> = {}): OrdemServico {
  return {
    id: "orc-1",
    numero: null,
    numero_orcamento: 42,
    loja_id: "loja-1",
    cliente_id: "cliente-1",
    veiculo_id: "veiculo-1",
    status: "orcamento",
    km_entrada: null,
    descricao_problema: null,
    forma_pagamento: null,
    parcelas: 1,
    // Meio-dia UTC: o mesmo dia em São Paulo e em UTC (`npm run test:fusos`).
    data_abertura: "2026-11-10T12:00:00Z",
    data_fechamento: null,
    validade: "2026-11-17",
    vendedor_id: null,
    criado_por_id: null,
    atualizado_por_id: null,
    cliente: { nome: "Maria Souza" },
    veiculo: { placa: "ABC1D23", marca: "Fiat", modelo: "Uno", cor: null, tipo: null },
    itens,
    ...extra,
  } as OrdemServico;
}

const LOJA = {
  nome_fantasia: "Loja de Exemplo",
  razao_social: null,
  rua: "Rua das Flores",
  numero: "10",
  bairro: "Centro",
  cidade: "Cidade",
  uf: "SP",
  telefone: "(16) 0000-0000",
  email: null,
} as unknown as ConfiguracaoFiscalLoja;

/** Tira as tags e junta os espaços (o real vem com espaço que não quebra). */
function texto(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .replaceAll(ESPACO_FIXO, " ")
    .trim();
}

function linhas(html: string): string[] {
  const corpo = html.split("<tbody>")[1]?.split("</tbody>")[0] ?? "";
  return [...corpo.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => texto(m[1]));
}

describe("montarHtmlOrcamento", () => {
  it("cada linha mostra o valor de valorLiquidoDoItem (com o desconto) e o total é o de somarValoresLiquidos", () => {
    const itens = [
      item("peca", "Pneu 175/70 R14", 4, 289.9, 20),
      item("servico", "Alinhamento", 1, 80, 0),
      item("servico", "Balanceamento", 4, 15, 5.5),
    ];
    const html = montarHtmlOrcamento({ ordem: orcamento(itens), loja: LOJA });

    const doDocumento = linhas(html);
    expect(doDocumento).toHaveLength(3);
    itens.forEach((it, i) => {
      const linha = doDocumento[i].replaceAll(ESPACO_FIXO, " ");
      expect(linha).toContain(it.descricao);
      expect(linha).toContain(formatarMoeda(it.preco_unitario).replaceAll(ESPACO_FIXO, " "));
      expect(linha).toContain(formatarMoeda(it.desconto).replaceAll(ESPACO_FIXO, " "));
      expect(linha.endsWith(formatarMoeda(valorLiquidoDoItem(it)).replaceAll(ESPACO_FIXO, " "))).toBe(
        true,
      );
    });

    const total = formatarMoeda(somarValoresLiquidos(itens)).replaceAll(ESPACO_FIXO, " ");
    // 4 × 289,90 − 20 + 80 + 4 × 15 − 5,50 = 1.274,10
    expect(total).toBe("R$ 1.274,10");
    expect(texto(html)).toContain(`Total ${total}`);
  });

  it("diz que é orçamento, o número, a data, a validade e que não é documento fiscal", () => {
    const html = montarHtmlOrcamento({
      ordem: orcamento([item("peca", "Pneu", 1, 100)]),
      loja: LOJA,
      // No prazo: feito dia 10, vale até 17 (o vencido tem caso próprio).
      hoje: "2026-11-10",
    });
    const t = texto(html);
    expect(t).toContain("Orçamento 42");
    expect(t).toContain("10/11/2026");
    expect(t).toContain("Válido até 17/11/2026");
    expect(t).toContain("Este orçamento não é documento fiscal");
    expect(t).toContain("Loja de Exemplo");
    expect(t).toContain("Rua das Flores, 10");
  });

  it("um nome com <b> não vira negrito: o texto do cadastro aparece como texto", () => {
    const html = montarHtmlOrcamento({
      ordem: orcamento([item("peca", "Pneu <b>aro 15</b> & cia", 1, 100)], {
        cliente: { nome: "<b>Zé</b>" },
        descricao_problema: "Barulho <script>x</script>",
      }),
      loja: { ...LOJA, nome_fantasia: "Loja <i>" } as ConfiguracaoFiscalLoja,
    });
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<i>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;b&gt;Zé&lt;/b&gt;");
    expect(html).toContain("Pneu &lt;b&gt;aro 15&lt;/b&gt; &amp; cia");
  });

  it("sem cliente, o bloco do cliente some; sem veículo, o do veículo também", () => {
    const html = montarHtmlOrcamento({
      ordem: orcamento([item("peca", "Pneu", 1, 100)], {
        cliente: undefined,
        cliente_id: null as unknown as string,
        veiculo: null,
        veiculo_id: null,
      }),
      loja: LOJA,
    });
    const t = texto(html);
    expect(t).not.toContain("Cliente");
    expect(t).not.toContain("Veículo");
    expect(t).toContain("Pneu");
  });

  it("com cliente e veículo, os dois blocos aparecem", () => {
    const t = texto(
      montarHtmlOrcamento({
        ordem: orcamento([item("peca", "Pneu", 1, 100)]),
        loja: LOJA,
        telefoneCliente: "(16) 99999-0000",
      }),
    );
    expect(t).toContain("Cliente");
    expect(t).toContain("Maria Souza");
    expect(t).toContain("(16) 99999-0000");
    expect(t).toContain("Veículo");
    expect(t).toContain("ABC1D23");
    expect(t).toContain("Fiat Uno");
  });

  it("orçamento vencido não diz 'Válido até': diz quando venceu", () => {
    const t = texto(
      montarHtmlOrcamento({
        ordem: orcamento([item("peca", "Pneu", 1, 100)], { validade: "2026-11-17" }),
        loja: LOJA,
        hoje: "2026-11-18",
      }),
    );
    expect(t).not.toContain("Válido até");
    expect(t).toContain("Venceu em 17/11/2026");
  });

  it("quantidade quebrada sai com vírgula (1,5), como se escreve aqui", () => {
    const html = montarHtmlOrcamento({
      ordem: orcamento([item("peca", "Óleo", 1.5, 40)]),
      loja: LOJA,
    });
    expect(linhas(html)[0]).toContain(" 1,5 ");
  });

  it("a observação aparece quando tem, e some quando não tem", () => {
    const com = texto(
      montarHtmlOrcamento({
        ordem: orcamento([item("peca", "Pneu", 1, 100)], { descricao_problema: "Trocar até sexta" }),
        loja: LOJA,
      }),
    );
    expect(com).toContain("Observação");
    expect(com).toContain("Trocar até sexta");
    const sem = texto(
      montarHtmlOrcamento({ ordem: orcamento([item("peca", "Pneu", 1, 100)]), loja: LOJA }),
    );
    expect(sem).not.toContain("Observação");
  });
});
