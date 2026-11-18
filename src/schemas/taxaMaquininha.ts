/**
 * A taxa que a maquininha cobra da LOJA, e quando o dinheiro do cartão cai na
 * conta (#387). Não confundir com os juros que o CLIENTE paga no parcelado
 * (`faturamento.ts`): aqui nada muda no que o cliente paga nem no lançamento
 * do Caixa. É informação nova, guardada junto do recebimento na hora de
 * faturar, com a taxa que valia naquele dia.
 *
 * Tudo começa em branco. **Em branco = não calcula**: sem a linha na tabela
 * da loja, a resposta é "não informada", nunca uma taxa zero inventada (o DRE
 * da #388 mostra "taxas da maquininha não informadas").
 */
import { z } from "zod";
import { arredondarCentavo, repartirEmCentavos, somar } from "./dinheiro";
import { somarDias } from "./retornos";

export type FormaCartao = "cartao_debito" | "cartao_credito";

/** Uma linha da tabela da loja (`configuracoes_taxas_maquininha`). */
export interface TaxaMaquininha {
  forma: FormaCartao;
  /** 1 no débito e no crédito à vista; 2 a 12 no crédito parcelado. */
  parcelas: number;
  taxa_percentual: number;
  prazo_dias: number;
  recebe_tudo_de_uma_vez: boolean;
}

export interface RecebimentoPrevisto {
  /** 1, 2, 3… (a parcela da maquininha). */
  numero: number;
  /** "AAAA-MM-DD". */
  dataPrevista: string;
  valor: number;
}

export type CalculoTaxa =
  | { informada: false; motivo: "nao_e_cartao" | "nao_informada" }
  | {
      informada: true;
      forma: FormaCartao;
      parcelas: number;
      taxaPercentual: number;
      prazoDias: number;
      recebeTudoDeUmaVez: boolean;
      valorBruto: number;
      valorTaxa: number;
      valorLiquido: number;
      recebimentos: RecebimentoPrevisto[];
    };

export function formaECartao(forma: string): forma is FormaCartao {
  return forma === "cartao_debito" || forma === "cartao_credito";
}

/**
 * A taxa de UM recebimento em cartão (uma linha do pagamento).
 *
 * - taxa = valor × taxa%, arredondada no centavo como o resto do sistema;
 *   líquido = valor − taxa (fecha exato, sem cauda);
 * - débito usa sempre a linha de 1 parcela, seja qual for `parcelas`;
 * - a parcela N cai `prazo × N` dias depois de `dia` (o padrão das
 *   maquininhas); "recebe tudo de uma vez" = uma data só, no prazo, com o
 *   líquido inteiro;
 * - o líquido é repartido com `repartirEmCentavos` (o centavo que sobra vai
 *   pra última). Uma parcela que dá R$ 0,00 (valor pequeno demais pra tantas
 *   parcelas) continua na lista: o banco (0088) quer as parcelas numeradas
 *   de 1 a N, sem buraco, e aceita valor zero.
 *
 * @param dia O dia do faturamento, "AAAA-MM-DD" (de `hojeLocal()`). A conta
 *   das datas é só de calendário, sem fuso (`somarDias`).
 */
export function calcularTaxaDaMaquininha(
  valor: number,
  forma: string,
  parcelas: number,
  tabela: readonly TaxaMaquininha[],
  dia: string,
): CalculoTaxa {
  if (!formaECartao(forma)) return { informada: false, motivo: "nao_e_cartao" };

  const parcelasDaLinha = forma === "cartao_debito" ? 1 : parcelas;
  const linha = tabela.find(
    (t) => t.forma === forma && t.parcelas === parcelasDaLinha,
  );
  if (!linha) return { informada: false, motivo: "nao_informada" };

  const valorBruto = arredondarCentavo(valor);
  const valorTaxa = arredondarCentavo(
    (valorBruto * linha.taxa_percentual) / 100,
  );
  const valorLiquido = arredondarCentavo(valorBruto - valorTaxa);

  const quantasDatas = linha.recebe_tudo_de_uma_vez ? 1 : parcelasDaLinha;
  const recebimentos = repartirEmCentavos(
    valorLiquido,
    Array.from({ length: quantasDatas }, () => 1),
  ).map((valorDaParcela, i) => ({
    numero: i + 1,
    dataPrevista: somarDias(dia, linha.prazo_dias * (i + 1)),
    valor: valorDaParcela,
  }));

  return {
    informada: true,
    forma: linha.forma,
    parcelas: parcelasDaLinha,
    taxaPercentual: linha.taxa_percentual,
    prazoDias: linha.prazo_dias,
    recebeTudoDeUmaVez: linha.recebe_tudo_de_uma_vez,
    valorBruto,
    valorTaxa,
    valorLiquido,
    recebimentos,
  };
}

export interface DiaDoCartaoAReceber<T> {
  /** "AAAA-MM-DD". */
  data: string;
  /** A soma do dia, fechada no centavo. */
  total: number;
  itens: T[];
}

/**
 * A lista do "Cartão a receber" (Caixa) junta por dia, do mais cedo pro mais
 * tarde, com o total de cada dia. A soma fica aqui, e não na tela (item 49 de
 * `docs/licoes.md`). Dentro do dia, os itens ficam na ordem em que vieram.
 */
export function agruparCartaoAReceberPorDia<
  T extends { data_prevista: string; valor: number },
>(itens: readonly T[]): DiaDoCartaoAReceber<T>[] {
  const porDia = new Map<string, T[]>();
  for (const item of itens) {
    const doDia = porDia.get(item.data_prevista);
    if (doDia) doDia.push(item);
    else porDia.set(item.data_prevista, [item]);
  }
  return [...porDia.keys()].sort().map((data) => {
    const doDia = porDia.get(data) ?? [];
    return { data, total: somar(doDia.map((i) => i.valor)), itens: doDia };
  });
}

// ─── O formulário de Configurações → "Taxas da maquininha" ─────────────────

/** As linhas da tabela, na ordem da tela: débito, crédito à vista, 2x a 12x. */
export const LINHAS_TAXA_MAQUININHA: readonly {
  forma: FormaCartao;
  parcelas: number;
}[] = [
  { forma: "cartao_debito", parcelas: 1 },
  ...Array.from({ length: 12 }, (_, i) => ({
    forma: "cartao_credito" as const,
    parcelas: i + 1,
  })),
];

export function rotuloLinhaTaxa(forma: FormaCartao, parcelas: number): string {
  if (forma === "cartao_debito") return "Débito";
  return parcelas === 1 ? "Crédito à vista" : `Crédito ${parcelas}x`;
}

/** "3,49" ou "3.49" → 3.49; o texto já passou pela validação. */
const numeroDoTexto = (texto: string) => Number(texto.trim().replace(",", "."));

// Os mesmos limites da tabela no banco: taxa numeric(5,2) entre 0 e 99,99;
// prazo inteiro de 0 a 365 dias.
const taxaValida = (texto: string) =>
  /^\d{1,2}([.,]\d{1,2})?$/.test(texto.trim()) && numeroDoTexto(texto) <= 99.99;
const prazoValido = (texto: string) =>
  /^\d{1,3}$/.test(texto.trim()) && numeroDoTexto(texto) <= 365;

const linhaTaxaFormSchema = z
  .object({
    forma: z.enum(["cartao_debito", "cartao_credito"]),
    parcelas: z.number().int().min(1).max(12),
    taxa: z.string(),
    prazo: z.string(),
    recebe_tudo_de_uma_vez: z.boolean(),
  })
  .superRefine((linha, ctx) => {
    const temTaxa = linha.taxa.trim() !== "";
    const temPrazo = linha.prazo.trim() !== "";
    // Os dois em branco: a linha não existe, e não há o que conferir.
    if (!temTaxa && !temPrazo) return;
    const rotulo = rotuloLinhaTaxa(linha.forma, linha.parcelas);
    if (!temTaxa) {
      ctx.addIssue({
        code: "custom",
        path: ["taxa"],
        message: `Preencha a taxa do ${rotulo}, ou apague o prazo.`,
      });
    } else if (!taxaValida(linha.taxa)) {
      ctx.addIssue({
        code: "custom",
        path: ["taxa"],
        message: "A taxa vai de 0 a 99,99%, com até 2 casas depois da vírgula.",
      });
    }
    if (!temPrazo) {
      ctx.addIssue({
        code: "custom",
        path: ["prazo"],
        message: `Preencha o prazo do ${rotulo}, ou apague a taxa.`,
      });
    } else if (!prazoValido(linha.prazo)) {
      ctx.addIssue({
        code: "custom",
        path: ["prazo"],
        message: "O prazo vai de 0 a 365 dias, sem casas depois da vírgula.",
      });
    }
  });

/**
 * O esquema do formulário (react-hook-form + zod): as 13 linhas fixas, cada
 * uma com taxa e prazo em texto. Em branco nos dois = a loja não informou
 * (válido, e a linha não é salva); só um dos dois = erro no que falta.
 */
export const taxasMaquininhaFormSchema = z.object({
  linhas: z.array(linhaTaxaFormSchema),
});

export type TaxasMaquininhaFormValues = z.infer<
  typeof taxasMaquininhaFormSchema
>;
/** Uma linha do formulário. Taxa e prazo são texto: em branco = a loja não informou. */
export type LinhaTaxaForm = TaxasMaquininhaFormValues["linhas"][number];

/** Banco → formulário: as 13 linhas sempre, preenchendo as que a loja já informou. */
export function paraValoresFormularioTaxas(
  tabela: readonly TaxaMaquininha[],
): TaxasMaquininhaFormValues {
  return {
    linhas: LINHAS_TAXA_MAQUININHA.map(({ forma, parcelas }) => {
      const linha = tabela.find(
        (t) => t.forma === forma && t.parcelas === parcelas,
      );
      return {
        forma,
        parcelas,
        taxa: linha ? String(linha.taxa_percentual).replace(".", ",") : "",
        prazo: linha ? String(linha.prazo_dias) : "",
        recebe_tudo_de_uma_vez: linha?.recebe_tudo_de_uma_vez ?? false,
      };
    }),
  };
}

/**
 * Formulário → banco. Linha com taxa e prazo em branco **não existe** (não
 * vira taxa zero). "Recebo tudo de uma vez" só faz sentido no parcelado: no
 * débito e no crédito à vista já é uma data só, então vai sempre falso.
 */
export function paraTaxasMaquininha(
  valores: TaxasMaquininhaFormValues,
): TaxaMaquininha[] {
  return valores.linhas
    .filter((l) => l.taxa.trim() !== "" || l.prazo.trim() !== "")
    .map((l) => ({
      forma: l.forma,
      parcelas: l.parcelas,
      taxa_percentual: numeroDoTexto(l.taxa),
      prazo_dias: numeroDoTexto(l.prazo),
      recebe_tudo_de_uma_vez: l.parcelas > 1 && l.recebe_tudo_de_uma_vez,
    }));
}
