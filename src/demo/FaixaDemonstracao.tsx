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
// empurra o programa pra baixo na mesma medida, e nada sai da janela:
// - sem a barra própria da janela: o corpo da página desce e o `h-screen`
//   encolhe;
// - com a barra própria (`data-barra="propria"`, visual novo #990): a faixa
//   fica logo ABAIXO da barra (nunca em cima dos três botões da janela), e o
//   programa (`#root`) e o fundo das janelas (modais) começam abaixo da faixa.
export function FaixaDemonstracao() {
  if (!emDemonstracao) return null;

  return (
    <>
      <style>{`
        :root:not([data-barra="propria"]) body { padding-top: ${ALTURA}; }
        :root:not([data-barra="propria"]) .h-screen { height: calc(100vh - ${ALTURA}); }
        .faixa-demonstracao { top: 0; }
        :root[data-barra="propria"] .faixa-demonstracao { top: var(--barra-janela); }
        :root[data-barra="propria"] #root,
        :root[data-barra="propria"] .sakura-modal-fundo {
          top: calc(var(--barra-janela) + ${ALTURA});
        }
      `}</style>
      <div
        role="status"
        className="faixa-demonstracao fixed inset-x-0 z-[1000] flex items-center justify-center gap-4 bg-sakura-pink px-4 text-rotulo font-semibold text-black"
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
