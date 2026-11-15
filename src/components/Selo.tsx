import { Check, Circle, Clock, RefreshCw, TriangleAlert, type LucideIcon } from "lucide-react";

/**
 * O selo de aviso do visual novo (#990): status de OS, de conta, de nota.
 * Regras em docs/referencia/visual-novo/README.md, seções 2 e 3.
 *
 * **Todo aviso tem ícone e palavra junto da cor** (regra 4). Por isso a
 * `palavra` é obrigatória: sem ela, a tela não compila. O ícone tem um padrão
 * por tipo, então também nunca falta.
 *
 * | tipo      | cor      | ícone padrão  | pra quê                              |
 * |-----------|----------|---------------|--------------------------------------|
 * | `info`    | azul     | seta girando  | em andamento                         |
 * | `atencao` | amarelo  | relógio       | concluída (falta faturar), a vencer  |
 * | `ok`      | verde    | visto         | finalizada, paga, autorizada         |
 * | `perigo`  | vermelho | triângulo     | vencida, com erro, cancelada         |
 * | `neutro`  | cinza    | círculo       | rascunho, sem status                 |
 *
 * "Em andamento" é azul e "atenção" é amarelo de propósito: longe do laranja,
 * que é só de botão (regra 2). O fundo é a própria cor bem fraca, nunca cheia.
 */

export type TipoDeSelo = "info" | "atencao" | "ok" | "perigo" | "neutro";

const APARENCIA: Record<TipoDeSelo, { classes: string; icone: LucideIcon; palavraDeSocorro: string }> = {
  info: { classes: "text-info bg-info/[0.13]", icone: RefreshCw, palavraDeSocorro: "Em andamento" },
  atencao: { classes: "text-atencao bg-atencao/[0.12]", icone: Clock, palavraDeSocorro: "Atenção" },
  ok: { classes: "text-ok bg-ok/[0.12]", icone: Check, palavraDeSocorro: "Certo" },
  perigo: { classes: "text-perigo bg-perigo/[0.13]", icone: TriangleAlert, palavraDeSocorro: "Problema" },
  neutro: { classes: "text-texto-2 bg-white/[0.08]", icone: Circle, palavraDeSocorro: "Sem status" },
};

/**
 * Texto que não é vazio. Uma palavra escrita no código (`palavra=""`) é
 * recusada pelo compilador; uma que vem de variável passa, e aí quem confere
 * é o próprio Selo, na hora de desenhar.
 */
type PalavraNaoVazia<P extends string> = P extends "" ? never : P;

export function Selo<P extends string>({
  tipo,
  palavra,
  icone,
  className = "",
}: {
  tipo: TipoDeSelo;
  /** O que o selo diz: "Em andamento", "Vencida". Obrigatória (regra 4). */
  palavra: PalavraNaoVazia<P>;
  /** Outro ícone da `lucide-react`, quando o do tipo não conta a história. */
  icone?: LucideIcon;
  /** Só pra posição (margem); a cor e o formato são do selo. */
  className?: string;
}) {
  const aparencia = APARENCIA[tipo];
  const Icone = icone ?? aparencia.icone;

  let texto: string = palavra;
  if (texto.trim() === "") {
    console.error(
      `Selo do tipo "${tipo}" recebeu a palavra em branco. Todo aviso tem ícone e palavra ` +
        "(regra 4 do visual novo); mostrando o nome do tipo no lugar.",
    );
    texto = aparencia.palavraDeSocorro;
  }

  return (
    <span
      data-selo={tipo}
      className={`inline-flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 text-rotulo font-semibold ${aparencia.classes} ${className}`.trim()}
    >
      <Icone aria-hidden="true" className="size-[13px] shrink-0" strokeWidth={2.25} />
      {texto}
    </span>
  );
}
