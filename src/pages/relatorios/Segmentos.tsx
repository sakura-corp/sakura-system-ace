/**
 * O seletor de uma escolha entre poucas ("Diário, Semanal, Mensal, Anual",
 * "Por venda, Por lucro", "7, 30, 60, 90 dias") da tela de Relações (#990,
 * tarefa 13). Era escrito à mão em três lugares, com três jeitos diferentes.
 *
 * Cada opção é um botão com `aria-pressed`: o leitor de tela diz qual está
 * ligada, e a cor não avisa sozinha: a opção ligada também fica em negrito.
 * O laranja aqui é ação (escolher o período), e a tela não tem botão
 * principal que dispute com ele.
 */
export function Segmentos<T extends string | number>({
  rotulo,
  opcoes,
  valor,
  aoEscolher,
}: {
  /** O nome do grupo, pro leitor de tela ("Classificar por"). */
  rotulo: string;
  opcoes: readonly { chave: T; texto: string }[];
  valor: T;
  aoEscolher: (chave: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      className="inline-flex gap-1 rounded-xl border border-linha bg-texto/[0.05] p-1"
    >
      {opcoes.map((opcao) => {
        const ligada = opcao.chave === valor;
        return (
          <button
            key={opcao.chave}
            type="button"
            aria-pressed={ligada}
            onClick={() => aoEscolher(opcao.chave)}
            className={`h-8 rounded-lg px-3 text-rotulo transition-colors duration-150 motion-reduce:transition-none ${
              ligada
                ? "bg-acao font-semibold text-sobre-acao"
                : "font-medium text-texto-2 hover:bg-passar hover:text-texto"
            }`}
          >
            {opcao.texto}
          </button>
        );
      })}
    </div>
  );
}
