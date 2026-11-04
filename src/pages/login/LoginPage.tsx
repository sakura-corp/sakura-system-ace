import { useState } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { mensagemDeErro } from "@/lib/errors";

interface LoginPageProps {
  onConfigurarConexao: () => void;
}

export function LoginPage({ onConfigurarConexao }: LoginPageProps) {
  const { login } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    try {
      await login(usuario, senha);
    } catch (err) {
      console.error("Erro ao entrar:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div
      className="flex h-screen items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}sakura-login-bg-premium.png)` }}
    >
      <div className="sakura-card w-full max-w-sm p-8">
        <div className="mb-6 flex justify-center">
          <Logo className="drop-shadow-sm" />
        </div>

        <h1 className="text-center text-destaque font-semibold text-sakura-purple-dark">
          Bem-vindo de volta
        </h1>
        <p className="mb-6 text-center text-corpo text-sakura-purple-dark/90">
          Entre com seu usuário para continuar
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <p className="rounded-lg bg-red-50/90 px-4 py-2 text-corpo text-red-700">
              {erro}
            </p>
          )}

          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Usuário</span>
            <input
              type="text"
              autoFocus
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="rounded-xl border border-sakura-borda-campo bg-black/40 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-sakura-pink focus:ring-1 focus:ring-sakura-pink transition-all"
            />
          </label>

          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="rounded-xl border border-sakura-borda-campo bg-black/40 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-sakura-pink focus:ring-1 focus:ring-sakura-pink transition-all"
            />
          </label>

          <button
            type="submit"
            disabled={entrando}
            className="w-full rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white shadow-[0_0_15px_rgba(182,36,255,0.4)] hover:shadow-[0_0_25px_rgba(182,36,255,0.7)] hover:bg-sakura-purple/90 transition-all disabled:opacity-50"
          >
            {entrando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* Fica aqui, e não em Configurações, de propósito: se a conexão
            estiver errada ninguém consegue entrar — então o conserto precisa
            estar acessível de fora do login. */}
        <button
          type="button"
          onClick={onConfigurarConexao}
          className="mx-auto mt-6 block text-rotulo text-sakura-muted hover:text-sakura-pink hover:underline"
        >
          Configurar a conexão
        </button>
      </div>
    </div>
  );
}
