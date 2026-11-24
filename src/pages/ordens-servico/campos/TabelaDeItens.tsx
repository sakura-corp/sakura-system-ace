import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { AcoesDaLinha, type AcaoDaLinha } from "@/components/AcoesDaLinha";
import { Botao } from "@/components/Botao";
import { Dica } from "@/components/Dica";
import { formatarMoeda } from "@/schemas/dinheiro";

/**
 * A tabela de itens da OS, do orçamento e da venda de balcão (#1087): um tipo
 * de linha só pra peça e serviço, com as mesmas colunas nas três telas.
 *
 * Quantidade, preço, desconto e técnico se editam na própria linha (a ordem do
 * Tab é essa mesma: é a ordem das células no HTML). O resto dos campos mora no
 * "Abrir o item", embaixo da linha. O total da linha fica à direita, em
 * algarismos de coluna, pra bater com o total do rodapé.
 *
 * É uma grade de CSS, e não um <table>, por um motivo só: em janela estreita
 * (1024, com o menu aberto) o Técnico desce pra uma segunda linha embaixo da
 * descrição, em vez de a tabela rolar de lado ou cortar. `min-w-0` na coluna
 * do item (lição 81: item flex/grade precisa disso) e colunas de largura fixa
 * nas outras. Os papéis (`table`, `row`, `cell`) mantêm o que um leitor de
 * tela espera de uma tabela.
 */

// Larguras: item (o que sobra), Qtd., Preço, Desconto, [Técnico], Total, ações.
const COLUNAS = "grid-cols-[minmax(0,1fr)_4rem_6rem_5rem_6rem_6rem]";
const COLUNAS_XL_COM_TECNICO = "xl:grid-cols-[minmax(0,1fr)_4rem_6rem_5rem_11rem_6rem_6rem]";

const CELULA_DO_NUMERO = "flex min-h-11 items-center";

/** A classe dos campos de número da linha: o campo do visual novo (44), mais estreito. */
export const CLASSE_CAMPO_DA_LINHA = "sakura-campo !px-2 text-right tabular-nums";

export function TabelaDeItens({
  comTecnico,
  vazio,
  textoVazio = "Nenhum item ainda: busque uma peça ou serviço acima.",
  children,
}: {
  comTecnico: boolean;
  vazio: boolean;
  textoVazio?: string;
  children: ReactNode;
}) {
  if (vazio) {
    return (
      <p className="rounded-xl border border-dashed border-linha-forte px-4 py-6 text-center text-corpo text-texto-2">
        {textoVazio}
      </p>
    );
  }
  const colunas = `${COLUNAS} ${comTecnico ? COLUNAS_XL_COM_TECNICO : ""}`;
  return (
    <div role="table" aria-label="Peças e serviços" className="min-w-0 rounded-xl border border-linha">
      <div
        role="row"
        className={`grid ${colunas} gap-x-2 border-b border-linha rounded-t-xl bg-cartao px-3 py-2 text-meta font-semibold text-texto-2`}
      >
        <span role="columnheader">Item</span>
        <span role="columnheader" className="text-right">
          Qtd.
        </span>
        <span role="columnheader" className="text-right">
          Preço un.
        </span>
        <span role="columnheader" className="text-right">
          Desconto
        </span>
        {comTecnico && (
          <span role="columnheader" className="hidden xl:col-start-5 xl:block">
            Técnico
          </span>
        )}
        <span
          role="columnheader"
          className={`text-right ${comTecnico ? "col-start-5 xl:col-start-6" : "col-start-5"}`}
        >
          Total
        </span>
        <span role="columnheader" className="sr-only">
          Ações
        </span>
      </div>
      <div className="divide-y divide-linha">{children}</div>
    </div>
  );
}

interface LinhaDeItemProps {
  comTecnico: boolean;
  /** "Peça" ou "Serviço": a palavra, nunca só uma cor. */
  tipo: "peca" | "servico";
  descricao: ReactNode;
  /** Avisos de estoque e de custo, embaixo da descrição. */
  avisos?: ReactNode;
  quantidade: ReactNode;
  preco: ReactNode;
  desconto: ReactNode;
  /** O técnico: um campo (item novo) ou o nome (item já gravado). */
  tecnico?: ReactNode;
  total: number | null;
  /** A UMA ação visível da linha. */
  acao: ReactNode;
  /** O resto das ações, no "⋯". */
  noMenu?: AcaoDaLinha[];
  descricaoParaLeitor: string;
  /** O que aparece embaixo da linha (o item aberto), em toda a largura. */
  embaixo?: ReactNode;
}

export function LinhaDeItem({
  comTecnico,
  tipo,
  descricao,
  avisos,
  quantidade,
  preco,
  desconto,
  tecnico,
  total,
  acao,
  noMenu = [],
  descricaoParaLeitor,
  embaixo,
}: LinhaDeItemProps) {
  const colunas = `${COLUNAS} ${comTecnico ? COLUNAS_XL_COM_TECNICO : ""}`;
  return (
    <div
      role="row"
      className={`grid ${colunas} items-start gap-x-2 gap-y-1 px-3 py-2 transition-colors hover:bg-passar/50`}
    >
      <div role="cell" className="col-start-1 min-w-0 py-1">
        <p className="text-meta font-semibold text-texto-2">{tipo === "peca" ? "Peça" : "Serviço"}</p>
        <div className="min-w-0 break-words text-corpo text-texto">{descricao}</div>
        {avisos}
      </div>
      <div role="cell" className={`col-start-2 ${CELULA_DO_NUMERO}`}>
        {quantidade}
      </div>
      <div role="cell" className={`col-start-3 ${CELULA_DO_NUMERO}`}>
        {preco}
      </div>
      <div role="cell" className={`col-start-4 ${CELULA_DO_NUMERO}`}>
        {desconto}
      </div>
      {comTecnico && (
        <div
          role="cell"
          className="col-span-full row-start-2 min-w-0 xl:col-span-1 xl:col-start-5 xl:row-start-1"
        >
          {tecnico}
        </div>
      )}
      <div
        role="cell"
        className={`${CELULA_DO_NUMERO} justify-end text-corpo font-semibold tabular-nums text-texto ${
          comTecnico ? "col-start-5 row-start-1 xl:col-start-6" : "col-start-5"
        }`}
      >
        {total === null ? "—" : formatarMoeda(total)}
      </div>
      <div
        role="cell"
        className={`flex min-h-11 items-center justify-end gap-1 ${
          comTecnico ? "col-start-6 row-start-1 xl:col-start-7" : "col-start-6"
        }`}
      >
        {acao}
        {noMenu.length > 0 && <AcoesDaLinha descricao={descricaoParaLeitor} acoes={noMenu} />}
      </div>
      {embaixo && (
        <div role="cell" className="col-span-full mt-1 min-w-0">
          {embaixo}
        </div>
      )}
    </div>
  );
}

/** O botão de abrir e fechar o item: a ação que fica à vista na linha. */
export function BotaoAbrirItem({
  aberto,
  nome,
  aoClicar,
}: {
  aberto: boolean;
  nome: string;
  aoClicar: () => void;
}) {
  const rotulo = aberto ? `Fechar o item ${nome}` : `Abrir o item ${nome}`;
  return (
    <Dica texto={aberto ? "Fechar o item" : "Abrir o item"}>
      <Botao
        soIcone
        variante="fantasma"
        aria-label={rotulo}
        aria-expanded={aberto}
        icone={aberto ? <ChevronUp /> : <ChevronDown />}
        onClick={aoClicar}
      />
    </Dica>
  );
}

/** Aviso de linha (estoque, custo): amarelo, com a palavra no texto. */
export function AvisoDaLinha({ children }: { children: ReactNode }) {
  return <p className="text-rotulo text-atencao">{children}</p>;
}
