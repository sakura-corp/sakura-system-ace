import { useId, useState, type ReactNode } from "react";
import { Botao } from "../Botao";
import { Modal } from "../Modal";

/**
 * O molde de todo cartão de gráfico de Relações (#1086, "Cada gráfico num
 * cartão do mesmo molde"):
 *
 *     nome curto (pequeno, cinza)
 *     título que é a resposta ("Novembro está R$ 2 mil acima de outubro…")
 *     o gráfico
 *                                   rodapé: Ver como tabela · Ver todos
 *
 * - O `titulo` é também o nome do gráfico pro leitor de tela (a figura é
 *   rotulada por ele): quem não vê ouve a mesma resposta.
 * - O cartão estica até a altura da linha (`h-full`) e o rodapé vai pro fim
 *   (`mt-auto`): cartões lado a lado ficam da mesma altura, com os rodapés na
 *   mesma linha.
 * - "Ver como tabela" troca o gráfico pela tabela ali mesmo (e volta);
 *   "Ver todos" abre a lista completa numa janela.
 * - O `id` é a âncora dos botões "Ir para" do topo da página.
 */
export function CartaoDeGrafico({
  id,
  nome,
  titulo,
  acoes,
  children,
  tabela,
  verTodos,
  className = "",
}: {
  id?: string;
  /** O nome curto do bloco, em cima ("O mês até hoje"). */
  nome: string;
  /** A frase-resposta, montada com os números. É o `aria-label` do gráfico. */
  titulo: string;
  /** No canto de cima à direita (os chips de Peças/Serviços/Clientes, por exemplo). */
  acoes?: ReactNode;
  /** O gráfico. */
  children: ReactNode;
  /** A mesma informação em tabela (uma `TabelaDoGrafico`). */
  tabela?: ReactNode;
  /** A lista completa, numa janela. `rotulo` é o texto do botão ("Ver os 23 itens"). */
  verTodos?: { rotulo: string; conteudo: ReactNode };
  className?: string;
}) {
  const idDoTitulo = useId();
  const idDaTabela = useId();
  const [comoTabela, setComoTabela] = useState(false);
  const [todosAberto, setTodosAberto] = useState(false);
  const temRodape = Boolean(tabela || verTodos);

  return (
    <section
      id={id}
      aria-labelledby={idDoTitulo}
      className={`sakura-card flex h-full min-w-0 scroll-mt-6 flex-col p-6 ${className}`.trim()}
    >
      <header className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-rotulo font-medium text-texto-2">{nome}</p>
          <h3 id={idDoTitulo} className="mt-1 font-titulo text-subtitulo font-semibold text-texto">
            {titulo}
          </h3>
        </div>
        {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
      </header>

      <div className="mt-6 min-w-0">
        {comoTabela && tabela ? (
          <div id={idDaTabela}>{tabela}</div>
        ) : (
          <figure aria-labelledby={idDoTitulo} className="m-0 min-w-0">
            {children}
          </figure>
        )}
      </div>

      {temRodape && (
        <footer className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-6">
          {tabela && (
            <Botao
              variante="fantasma"
              aria-expanded={comoTabela}
              aria-controls={comoTabela ? idDaTabela : undefined}
              onClick={() => setComoTabela((atual) => !atual)}
            >
              {comoTabela ? "Ver como gráfico" : "Ver como tabela"}
            </Botao>
          )}
          {verTodos && (
            <Botao variante="secundario" onClick={() => setTodosAberto(true)}>
              {verTodos.rotulo}
            </Botao>
          )}
        </footer>
      )}

      {verTodos && todosAberto && (
        <Modal titulo={nome} largura="4xl" onFechar={() => setTodosAberto(false)}>
          {verTodos.conteudo}
        </Modal>
      )}
    </section>
  );
}
