import { sairDaDemonstracao } from "@/lib/conexao";
import { emDemonstracao } from "@/lib/supabase";

// Altura da faixa. Está aqui e no <style> abaixo: os dois precisam concordar.
const ALTURA = "2rem";

// Faixa fixa no topo de TODAS as telas enquanto o programa está no modo
// demonstração (FN-14), pra ninguém achar que os dados são de verdade. Fora da
// demonstração não renderiza nada.
//
// As telas usam `h-screen` (100vh), então uma faixa por cima cobriria o topo
// delas. Em vez de mexer em cada tela (ou no CSS global), a própria faixa
// empurra o corpo da página pra baixo e encolhe o `h-screen` na mesma medida:
// o total continua 100vh e nada sai da janela.
export function FaixaDemonstracao() {
  if (!emDemonstracao) return null;

  return (
    <>
      <style>{`
        body { padding-top: ${ALTURA}; }
        .h-screen { height: calc(100vh - ${ALTURA}); }
      `}</style>
      <div
        role="status"
        className="fixed inset-x-0 top-0 z-[1000] flex items-center justify-center gap-4 bg-sakura-pink px-4 text-rotulo font-semibold text-black"
        style={{ height: ALTURA }}
      >
        <span>MODO DEMONSTRAÇÃO · nada aqui é de verdade</span>
        <button
          type="button"
          onClick={sairDaDemonstracao}
          className="rounded-md bg-black px-3 py-0.5 text-rotulo font-semibold text-white hover:bg-black/80"
        >
          Sair da demonstração
        </button>
      </div>
    </>
  );
}
