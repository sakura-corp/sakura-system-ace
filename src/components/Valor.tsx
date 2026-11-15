import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { formatarMoeda } from "@/schemas/dinheiro";

/**
 * Um valor em dinheiro, com número negativo parecendo negativo.
 *
 * Existe porque no Início um "Lucro mês −R$ 8.368,00" saía com exatamente o
 * mesmo tratamento visual de um número positivo: mesma cor, mesmo peso, e o
 * sinal de menos sumindo no meio do "R$". Essa é a tela que o dono olha todo
 * dia de relance — um prejuízo não pode passar despercebido nela.
 *
 * O negativo ganha três marcas ao mesmo tempo, de propósito: cor de alerta,
 * seta pra baixo e o sinal escrito. Cor sozinha não serve pra quem não
 * distingue vermelho de verde (WCAG 1.4.1: a informação não pode depender só
 * da cor).
 */
export function Valor({
  valor,
  className = "",
  classeDeCor = "text-texto",
  tituloDeAcessibilidade,
}: {
  valor: number;
  /**
   * Tamanho e peso ficam com quem chama — o cartão e a tabela são diferentes.
   * **Sem cor aqui**: ver `classeDeCor`.
   */
  className?: string;
  /**
   * A cor do número quando ele é positivo.
   *
   * É um parâmetro à parte, e não mais uma classe no `className`, por um
   * motivo que só apareceu ao renderizar a tela de verdade: com a cor do
   * prejuízo e a cor normal do texto no mesmo elemento, quem vence
   * é a que o Tailwind escreveu por último **no CSS gerado**, não a última do
   * atributo `class`. O prejuízo saía com a cor de sempre, sem nada de
   * vermelho — o bug exato que este componente veio consertar. É primo dos
   * itens 14 e 51 da seção 6 do PROJETO_STATUS.
   */
  classeDeCor?: string;
  /** Texto alternativo, quando o número sozinho não se explica. */
  tituloDeAcessibilidade?: string;
}) {
  const negativo = valor < 0;
  return (
    <span
      className={`${negativo ? "text-perigo" : classeDeCor} ${className}`.trim()}
      title={tituloDeAcessibilidade}
    >
      {negativo && (
        <span aria-hidden="true" className="mr-1">
          ▼
        </span>
      )}
      {negativo && "−"}
      {formatarMoeda(Math.abs(valor))}
    </span>
  );
}

/**
 * A variação contra o período anterior — "+12%" ou "−8%".
 *
 * Some quando não há com o que comparar (`null`), em vez de mostrar uma seta
 * neutra: até aqui os cartões do Início traziam um "›" fixo que prometia
 * tendência e nunca entregou nenhuma. Indicador que não indica é ruído.
 *
 * Verde e vermelho dependem do que o cartão conta: vender mais é bom, gastar
 * mais não. Por isso `subirEBom` é obrigatório — sem ele, "custos +30%"
 * sairia em verde.
 *
 * No visual novo (#990) a cor nunca avisa sozinha (regra 4): a seta é um
 * ícone, o sinal vai escrito no número, e com `contra` o cartão diz com o que
 * está comparando ("contra outubro"), em vez de deixar isso só no balão do
 * mouse.
 */
export function Variacao({
  percentual,
  subirEBom,
  comparadoCom,
  contra,
}: {
  percentual: number | null;
  subirEBom: boolean;
  /** O que está do outro lado da comparação, pro balãozinho do mouse. */
  comparadoCom: string;
  /**
   * O nome curto do outro lado, pra escrever ao lado do número: com
   * `contra="outubro"` sai "+16% contra outubro". Sem isto, só o número.
   */
  contra?: string;
}) {
  if (percentual === null) return null;

  const subiu = percentual > 0;
  const parado = Math.round(percentual) === 0;
  const bom = subiu === subirEBom;
  const cor = parado ? "text-texto-2" : bom ? "text-ok" : "text-perigo";
  const Seta = parado ? ArrowRight : subiu ? ArrowUp : ArrowDown;
  const sinal = subiu ? "+" : percentual < 0 ? "−" : "";

  // Um mês que rendeu R$ 20 e outro que rendeu R$ 20.000 dão "+99.900%", que
  // não informa nada além de "muito mais". Acima do teto, o número mostrado
  // para de crescer e o valor exato fica no balãozinho do mouse.
  const exato = Math.abs(Math.round(percentual));
  const estourou = exato > TETO_DA_VARIACAO;

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap text-rotulo font-semibold ${cor}`}
      title={
        estourou
          ? `${sinal}${exato}% comparado com ${comparadoCom}`
          : `Comparado com ${comparadoCom}`
      }
    >
      <Seta aria-hidden="true" className="size-[13px] shrink-0" strokeWidth={2.5} />
      <span>
        {estourou ? "mais de " : ""}
        {sinal}
        {estourou ? TETO_DA_VARIACAO : exato}%
      </span>
      {contra && <span className="font-medium text-texto-3">contra {contra}</span>}
    </span>
  );
}

const TETO_DA_VARIACAO = 999;
