import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { recarregarJanela } from "@/lib/janela";

/**
 * O login foi feito, mas o perfil do operador não veio (#752). Antes, a tela
 * abria com "Nenhum módulo liberado" e a barra lateral sem o "Sair": se não
 * passasse sozinho, não havia como sair nem chegar no "Configurar conexão",
 * que só existe na tela de login. Aqui sempre há o "Sair".
 */
export function PerfilNaoCarregou() {
  const { perfilFalhou, logout, tentarCarregarPerfil } = useAuth();
  const [saindo, setSaindo] = useState(false);

  async function sairDaqui() {
    setSaindo(true);
    try {
      await logout();
    } catch (err) {
      // Com o login vencido e sem internet, o Supabase não consegue renovar
      // nem apagar a sessão. Recarregar a janela apaga (ela só existe na
      // memória) e volta pra tela de login.
      console.error("Sair pelo servidor falhou; recarregando a janela:", err);
      recarregarJanela();
    }
  }

  return (
    <div className="sakura-shell-bg flex h-screen items-center justify-center p-4">
      <div className="sakura-card max-w-md p-8 text-center">
        {perfilFalhou ? (
          <>
            <p className="text-corpo font-medium text-sakura-purple-dark">
              Não consegui carregar o seu perfil.
            </p>
            <p className="mt-2 text-rotulo text-sakura-purple-dark/85">
              Pode ser a internet ou o banco de dados fora do ar por um instante. Tente de novo; se
              continuar, saia e entre de novo.
            </p>
          </>
        ) : (
          <p className="text-corpo text-sakura-purple-dark/90">
            Não achei o perfil de operador deste usuário (sem cadastro nesta empresa, ou desativado).
            Fale com o administrador.
          </p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          {perfilFalhou && (
            <button
              onClick={tentarCarregarPerfil}
              disabled={saindo}
              className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white shadow-[0_0_15px_rgba(182,36,255,0.4)] transition-all hover:bg-sakura-purple/90 hover:shadow-[0_0_25px_rgba(182,36,255,0.7)] disabled:opacity-50"
            >
              Tentar de novo
            </button>
          )}
          <button
            onClick={() => void sairDaqui()}
            disabled={saindo}
            className="rounded-xl px-5 py-2.5 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10 disabled:opacity-50"
          >
            {saindo ? "Saindo…" : "Sair"}
          </button>
        </div>
      </div>
    </div>
  );
}
