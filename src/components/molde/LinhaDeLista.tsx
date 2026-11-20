import type { ReactNode } from "react";
import { AcoesDaLinha } from "../AcoesDaLinha";
import { Botao } from "../Botao";

/**
 * Uma linha do molde de lista (visual da leva 8, #1085, parte 4/5 #1135).
 *
 * O desenho é sempre o mesmo, em qualquer lista do programa:
 *
 *     [início]  Nome do item                 [lado]  [Ação]  [⋯]
 *               detalhe, mais fraco
 *
 * - **Nome em cima, detalhe embaixo** (ordem de leitura F/Z): o nome é o que
 *   a pessoa procura; o detalhe (telefone, cidade, vencimento) confirma.
 * - **Uma ação na linha** (Hick): o próximo passo daquele item ("Receber",
 *   "Faturar"), com verbo. Botão secundário, NUNCA laranja cheio: o laranja é
 *   um por tela, e uma lista de 30 linhas teria 30.
 * - **O resto no "⋯"** (`AcoesDaLinha`): o raro e o que não tem volta
 *   ("Apagar" vai pro fim do menu, longe do dedo).
 * - **`aoAbrir`**: o NOME vira o botão que abre o item. Só o nome, e não a
 *   linha inteira: um botão não pode ter outro botão (a ação, o "⋯") dentro.
 *
 * Alvos de 40 px (o mínimo da leva 8): a ação usa o `Botao` médio; o "⋯" da
 * `AcoesDaLinha` nasce com 32 px (tamanho da tabela antiga), e aqui é
 * esticado pra 40 pelo seletor da linha, sem mexer na peça (que é de outra
 * parte da leva).
 */
export type AcaoDaLinhaDoMolde = {
  /** Verbo do próximo passo ("Receber", "Faturar", "Abrir a OS"). */
  rotulo: string;
  aoClicar: () => void;
  desabilitada?: boolean;
};

export type ItemDoMais = {
  rotulo: string;
  aoClicar: () => void;
  /** Não tem volta (apagar, cancelar): vermelho e no fim do menu. */
  perigosa?: boolean;
  desabilitada?: boolean;
  icone?: ReactNode;
};

/**
 * Nome que não é texto (um desenho, `<strong>OS 148</strong>`) exige a
 * `descricao`: sem ela, os botões da linha virariam "Receber — item", e quem
 * usa leitor de tela não saberia de qual linha é cada botão.
 */
type NomeDaLinha =
  | {
      /** O que a pessoa procura: o nome do cliente, do produto, a OS. */
      nome: string;
      /** Como o item é chamado pro leitor de tela; sem ela, é o nome. */
      descricao?: string;
    }
  | {
      nome: ReactNode;
      /** Como o item é chamado pro leitor de tela ("a OS 148"). */
      descricao: string;
    };

export type PropsDaLinhaDeLista = NomeDaLinha & {
  /** A linha de baixo, mais fraca: telefone, cidade, vencimento. */
  detalhe?: ReactNode;
  /** Antes do nome: um ícone ou a placa. Enfeite fica `aria-hidden` em quem chama. */
  inicio?: ReactNode;
  /** À direita, antes da ação: o valor (`Valor`), um `Selo`. */
  lado?: ReactNode;
  /** Clicar no nome abre o item (a ficha, a OS). */
  aoAbrir?: () => void;
  /** A UMA ação da linha. */
  acao?: AcaoDaLinhaDoMolde;
  /** O que vai pro "⋯". Vazio: o botão de três pontos nem aparece. */
  mais?: ItemDoMais[];
};

export function LinhaDeLista({
  nome,
  detalhe,
  inicio,
  lado,
  descricao,
  aoAbrir,
  acao,
  mais = [],
}: PropsDaLinhaDeLista) {
  // O tipo garante: nome que não é texto vem com a descrição.
  const comoChama = descricao ?? String(nome);

  const textos = (
    <>
      <span className="block truncate text-corpo font-medium text-texto">{nome}</span>
      {detalhe !== undefined && detalhe !== null && detalhe !== "" && (
        <span className="mt-0.5 block truncate text-rotulo text-texto-2">{detalhe}</span>
      )}
    </>
  );

  return (
    <li className="flex min-h-16 min-w-0 items-center gap-4 border-b border-linha px-4 py-2 last:border-b-0">
      {inicio && <div className="flex shrink-0 items-center">{inicio}</div>}

      {aoAbrir ? (
        <button
          type="button"
          onClick={aoAbrir}
          className="-mx-2 min-h-10 min-w-0 flex-1 rounded-lg px-2 py-1 text-left transition-colors duration-150 hover:bg-passar motion-reduce:transition-none"
        >
          {textos}
        </button>
      ) : (
        <div className="min-w-0 flex-1">{textos}</div>
      )}

      {lado && <div className="flex shrink-0 items-center tabular-nums">{lado}</div>}

      {(acao || mais.length > 0) && (
        <div className="flex shrink-0 items-center gap-2 [&_[aria-haspopup=menu]]:size-10">
          {acao && (
            <Botao
              variante="secundario"
              tamanho="medio"
              onClick={acao.aoClicar}
              disabled={acao.desabilitada}
              aria-label={`${acao.rotulo} — ${comoChama}`}
            >
              {acao.rotulo}
            </Botao>
          )}
          {mais.length > 0 && (
            <AcoesDaLinha
              descricao={comoChama}
              acoes={mais.map((item) => ({ tipo: "menu" as const, ...item }))}
            />
          )}
        </div>
      )}
    </li>
  );
}
