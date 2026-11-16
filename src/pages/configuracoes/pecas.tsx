import { Check, ChevronDown, TriangleAlert, type LucideIcon } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Botao } from "@/components/Botao";
import { Dica } from "@/components/Dica";

// Peças que só as Configurações usam (tarefa 15 do visual novo, #990). Moram
// aqui, e não em `src/components/`, de propósito: a tarefa não mexe nas peças
// compartilhadas. Se outra tela precisar de uma delas, sobe pra lá numa tarefa
// própria (anotado como sugestão no PR).

/**
 * O erro de uma ação: continua do lado do botão que falhou (não some sozinho:
 * quem está no balcão perde a mensagem), agora com ícone e palavra junto da cor
 * (regra 4 do visual novo), no mesmo jeito do erro do Início.
 */
export function MensagemDeErro({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={`flex items-start gap-2 rounded-xl bg-perigo/[0.13] px-4 py-3 text-corpo text-perigo ${className}`.trim()}
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.25} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * "Salvo." ao lado do botão de salvar. Fica junto do botão (e não vira o aviso
 * que some embaixo da tela) porque as seções são compridas: quem salvou no pé
 * da seção vê a confirmação no mesmo lugar do olho, e ela só sai quando a
 * pessoa mexe de novo.
 */
export function AvisoDeSalvo({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="inline-flex items-center gap-1.5 rounded-xl bg-ok/[0.12] px-3 py-2 text-corpo font-medium text-ok"
    >
      <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.5} />
      {children}
    </p>
  );
}

/** Um aviso de atenção dentro de uma seção (amarelo, com ícone). */
export function AvisoDeAtencao({
  children,
  className = "",
  ...resto
}: {
  children: ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <p
      {...resto}
      className={`flex items-start gap-2 rounded-xl bg-atencao/[0.12] px-3 py-2 text-corpo text-atencao ${className}`.trim()}
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.25} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * O botão só com ícone de uma lista (editar, inativar, excluir), com a dica
 * dizendo o que ele faz. Entra no lugar do `title` + glifo (✎ × ↺ 🗑): o glifo
 * muda de tamanho de computador pra computador, o ícone não.
 */
export function BotaoDeLista({
  rotulo,
  icone: Icone,
  aoClicar,
  perigoso = false,
  desabilitado = false,
}: {
  /** O que o botão faz, por extenso ("Editar a loja Centro"): nome e dica. */
  rotulo: string;
  icone: LucideIcon;
  aoClicar: () => void;
  perigoso?: boolean;
  desabilitado?: boolean;
}) {
  return (
    <Dica texto={rotulo}>
      <Botao
        soIcone
        variante="fantasma"
        tamanho="pequeno"
        aria-label={rotulo}
        icone={<Icone aria-hidden="true" />}
        onClick={aoClicar}
        disabled={desabilitado}
        className={perigoso ? "hover:bg-perigo/[0.13]! hover:text-perigo!" : ""}
      />
    </Dica>
  );
}

/**
 * Uma seção de Configurações: cartão com título, explicação e o conteúdo
 * (que só é montado quando a seção está aberta, como era: o que carrega os
 * próprios dados só busca quando alguém abre).
 *
 * Faz o que a `SecaoRecolhivel` fazia, no visual novo: ícone do assunto, o
 * título em destaque, a explicação em cinza, a setinha que gira e o foco do
 * teclado visível. Diz também `aria-expanded` pro leitor de tela.
 */
export function SecaoDeConfiguracao({
  titulo,
  descricao,
  icone: Icone,
  abertaInicialmente = false,
  children,
}: {
  titulo: string;
  descricao?: ReactNode;
  icone: LucideIcon;
  abertaInicialmente?: boolean;
  children: ReactNode;
}) {
  const [aberta, setAberta] = useState(abertaInicialmente);
  const idDoConteudo = useId();

  return (
    <div className="sakura-card p-6">
      <button
        type="button"
        onClick={() => setAberta((atual) => !atual)}
        aria-expanded={aberta}
        aria-controls={aberta ? idDoConteudo : undefined}
        className="group -m-2 flex w-[calc(100%+1rem)] items-start gap-4 rounded-xl p-2 text-left transition-colors hover:bg-passar"
      >
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-texto/[0.08] text-acao-clara"
        >
          <Icone className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <h3 className="text-corpo font-semibold text-texto">{titulo}</h3>
          {descricao && <p className="mt-1 text-rotulo text-texto-2">{descricao}</p>}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`mt-2 size-4 shrink-0 text-texto-2 transition-transform duration-(--duration-botao) ease-suave motion-reduce:transition-none ${
            aberta ? "rotate-180" : ""
          }`}
        />
      </button>

      {aberta && (
        <div id={idDoConteudo} className="mt-5">
          {children}
        </div>
      )}
    </div>
  );
}

/** O título de um grupo de seções ("Dinheiro e nota fiscal"), só pra organizar. */
export function TituloDeGrupo({ children }: { children: ReactNode }) {
  return (
    <h2 className="pt-2 text-meta font-semibold uppercase tracking-[0.12em] text-texto-2">
      {children}
    </h2>
  );
}
