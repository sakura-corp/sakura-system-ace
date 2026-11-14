import { useState } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { trocarSenhaPropria } from "@/lib/auth";
import { mensagemDeErro } from "@/lib/errors";
import { confirmarTrocaSenha } from "@/lib/operadores";

const TAMANHO_MINIMO_SENHA = 6;

// Tela cheia, bloqueante — aparece no lugar do app normal quando
// `operador.deve_trocar_senha` está true (depois de um admin redefinir a
// senha de alguém em Configurações → Operadores, ver PROJETO_STATUS.md).
// Sem isso, a senha temporária gerada pelo admin viraria a senha definitiva.
export function TrocarSenhaPage() {
  const { recarregarOperador, logout } = useAuth();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (novaSenha.length < TAMANHO_MINIMO_SENHA) {
      setErro(`A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
      return;
    }
    if (novaSenha !== confirmacao) {
      setErro("As duas senhas digitadas são diferentes.");
      return;
    }

    setSalvando(true);
    try {
      await trocarSenhaPropria(novaSenha);
      await confirmarTrocaSenha();
      await recarregarOperador();
    } catch (err) {
      console.error("Erro ao trocar senha:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="sakura-fundo-marca sakura-grao flex h-screen items-center justify-center">
      <div className="sakura-card relative z-[2] w-full max-w-sm p-8">
        <div className="mb-6 flex justify-center">
          <Logo className="drop-shadow-sm" />
        </div>

        <h1 className="text-center text-destaque font-semibold text-sakura-purple-dark">
          Crie uma senha nova
        </h1>
        <p className="mb-6 text-center text-corpo text-sakura-purple-dark/90">
          Sua senha foi redefinida por um administrador. Escolha uma senha nova pra continuar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <p className="rounded-lg bg-red-50/90 px-4 py-2 text-corpo text-red-700">{erro}</p>
          )}

          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Nova senha</span>
            <input
              type="password"
              autoFocus
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="rounded-xl border border-sakura-borda-campo bg-black/40 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-sakura-pink focus:ring-1 focus:ring-sakura-pink transition-all"
            />
          </label>

          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Confirmar nova senha</span>
            <input
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              className="rounded-xl border border-sakura-borda-campo bg-black/40 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-sakura-pink focus:ring-1 focus:ring-sakura-pink transition-all"
            />
          </label>

          <button
            type="submit"
            disabled={salvando}
            className="w-full rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-sobre-acao shadow-[0_0_15px_rgba(255,87,34,0.4)] hover:shadow-[0_0_25px_rgba(255,87,34,0.7)] hover:bg-sakura-purple/90 transition-all disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar nova senha e entrar"}
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full text-center text-rotulo font-medium text-sakura-purple-dark/70 hover:text-sakura-purple-dark"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
