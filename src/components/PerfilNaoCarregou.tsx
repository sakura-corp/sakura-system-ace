import { useAuth } from "@/contexts/AuthContext";
import { sairSoNesteComputador } from "@/lib/auth";

/**
 * O login foi feito, mas o perfil do operador não veio (#752). Antes, a tela
 * abria com "Nenhum módulo liberado" e a barra lateral sem o "Sair": se não
 * passasse sozinho, não havia como sair nem chegar no "Configurar conexão",
 * que só existe na tela de login. Aqui sempre há o "Sair".
 */
export function PerfilNaoCarregou() {
  const { perfilFalhou, logout, tentarCarregarPerfil } = useAuth();

  async function sairDaqui() {
    try {
      await logout();
    } catch (err) {
      // Sem internet o servidor não responde: sai só neste computador.
      console.error("Sair pelo servidor falhou; saindo só neste computador:", err);
      await sairSoNesteComputador();
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
            Este usuário não tem cadastro de operador nesta empresa. Fale com o administrador.
          </p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          {perfilFalhou && (
            <button onClick={tentarCarregarPerfil} className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white shadow-[0_0_15px_rgba(182,36,255,0.4)] transition-all hover:bg-sakura-purple/90 hover:shadow-[0_0_25px_rgba(182,36,255,0.7)]">
              Tentar de novo
            </button>
          )}
          <button
            onClick={() => void sairDaqui()}
            className="rounded-xl px-5 py-2.5 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
