import { Check, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A caixa de aviso que fica na tela (visual novo, #990): o erro de uma ação,
 * o "falta configurar", o "deu certo" que não some. Ícone e frase junto da cor
 * (regra 4), fundo da própria cor bem fraco, nos dois temas.
 *
 * Nasceu das seis cópias que cada tela fez enquanto não podia mexer em
 * `src/components/` (o `Aviso` do Caixa, o `AvisoDeErro` de Clientes, os do
 * Estoque, o `AvisoDaTela` de Funcionários, o `AvisoNaTela` de Notas Fiscais e
 * a `MensagemDeErro` de Configurações). Erro NÃO some sozinho: fica até a
 * pessoa agir. O que some sozinho é o `avisar()` (AvisoQueSome).
 *
 * É um `div`, e não um `p`, porque alguns avisos levam lista e mais de um
 * parágrafo.
 */

export type TipoDeAviso = "perigo" | "atencao" | "ok" | "info";

const APARENCIA: Record<TipoDeAviso, { classes: string; icone: LucideIcon }> = {
  perigo: { classes: "bg-perigo/[0.13] text-perigo", icone: TriangleAlert },
  atencao: { classes: "bg-atencao/[0.12] text-atencao", icone: TriangleAlert },
  ok: { classes: "bg-ok/[0.12] text-ok", icone: Check },
  info: { classes: "bg-info/[0.13] text-info", icone: Info },
};

type PropsDoAviso = {
  children: ReactNode;
  /** Só pra posição (margem, largura); a cor e o formato são do aviso. */
  className?: string;
  /** Outro ícone da `lucide-react`, quando o do tipo não conta a história. */
  icone?: LucideIcon;
  /**
   * Pro leitor de tela: `alert` anuncia na hora (o erro que acabou de
   * aparecer), `status` anuncia sem interromper. Sem papel, é texto comum.
   */
  role?: "alert" | "status";
};

export function Aviso({
  tipo,
  children,
  className = "",
  icone,
  role,
}: PropsDoAviso & { tipo: TipoDeAviso }) {
  const aparencia = APARENCIA[tipo];
  const Icone = icone ?? aparencia.icone;
  // A letra é a do corpo; a tela pode pedir a menor (`text-rotulo`).
  const letra = /\btext-(?:rotulo|meta|corpo)\b/.test(className) ? "" : "text-corpo";
  return (
    <div
      role={role}
      className={`flex items-start gap-2 rounded-xl px-4 py-3 ${letra} ${aparencia.classes} ${className}`.trim()}
    >
      <Icone aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.25} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** O erro de uma ação (vermelho). Anuncia na hora pro leitor de tela. */
export function AvisoDeErro({ role = "alert", ...resto }: PropsDoAviso) {
  return <Aviso tipo="perigo" role={role} {...resto} />;
}

/** Pede uma ação, mas não é erro (amarelo). */
export function AvisoDeAtencao(props: PropsDoAviso) {
  return <Aviso tipo="atencao" {...props} />;
}

/** O "deu certo" que fica na tela (verde, com o visto). */
export function AvisoDeCerto({ role = "status", ...resto }: PropsDoAviso) {
  return <Aviso tipo="ok" role={role} {...resto} />;
}
