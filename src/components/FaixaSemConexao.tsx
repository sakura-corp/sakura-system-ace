import { useConexao } from "@/hooks/useConexao";

// #374: a faixa do topo quando o programa não alcança o banco. Existe porque o
// operador digitava a venda inteira e só descobria a queda ao salvar.
//
// Só texto, nenhum botão nem campo (`globals.css` força letra branca em todo
// input, e aqui o fundo é claro: item 47 da seção 6), e nunca bloqueia nada
// (item 33): é aviso. `role="status"` pra leitor de tela anunciar sem
// interromper.
export function FaixaSemConexao() {
  const { semConexao } = useConexao();
  if (!semConexao) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 min-w-0 rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800"
    >
      <p className="font-semibold">
        Sem conexão com o banco: o que você digitar agora não vai ser salvo.
      </p>
      <p className="mt-1 text-rotulo">
        O programa confere sozinho a cada 30 segundos, e este aviso some quando a internet
        voltar.
      </p>
    </div>
  );
}
